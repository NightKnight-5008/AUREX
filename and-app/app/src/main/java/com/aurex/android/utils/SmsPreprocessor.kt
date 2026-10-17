package com.aurex.android.utils

import android.util.Log

/**
 * Local SMS preprocessing to tag likely financial messages
 * Speeds up backend AI filtering by pre-classifying messages
 */
object SmsPreprocessor {

    private const val TAG = "SmsPreprocessor"

    // Financial keywords for local classification
    private val FINANCIAL_KEYWORDS = setOf(
        // Transaction types
        "purchase", "payment", "charged", "debited", "credited", "withdrawn", "deposit",
        "transaction", "transfer", "refund", "reversal",

        // Financial terms
        "balance", "account", "card", "debit", "credit", "amount", "fee", "interest",
        "statement", "due", "minimum", "limit", "available",

        // Currency symbols and amounts
        "$", "₹", "€", "£", "¥", "USD", "INR", "EUR", "GBP",

        // Banking terms
        "bank", "atm", "pos", "merchant", "cashback", "rewards",

        // Account types
        "checking", "savings", "current", "loan", "mortgage",

        // Actions
        "spent", "received", "paid", "owed", "pending"
    )

    // Sender patterns for known financial institutions
    private val FINANCIAL_SENDER_PATTERNS = listOf(
        Regex(".*BANK.*", RegexOption.IGNORE_CASE),
        Regex(".*ALERT.*", RegexOption.IGNORE_CASE),
        Regex(".*VISA.*", RegexOption.IGNORE_CASE),
        Regex(".*MASTER.*", RegexOption.IGNORE_CASE),
        Regex(".*AMEX.*", RegexOption.IGNORE_CASE),
        Regex(".*DISCOVER.*", RegexOption.IGNORE_CASE),
        Regex(".*CREDIT.*", RegexOption.IGNORE_CASE),
        Regex(".*DEBIT.*", RegexOption.IGNORE_CASE),
        Regex("^[A-Z]{2,6}-[A-Z]{2,10}$"), // Pattern like "XX-BANK", "HDFC-BANK"
        Regex("^[A-Z]{6}$") // 6-letter bank codes
    )

    // OTP/Verification patterns (should be rejected)
    private val OTP_PATTERNS = listOf(
        Regex(".*OTP.*", RegexOption.IGNORE_CASE),
        Regex(".*verification code.*", RegexOption.IGNORE_CASE),
        Regex(".*one.time.password.*", RegexOption.IGNORE_CASE),
        Regex(".*\\b\\d{4,6}\\b.*is your.*", RegexOption.IGNORE_CASE),
        Regex(".*do not share.*", RegexOption.IGNORE_CASE),
        Regex(".*security code.*", RegexOption.IGNORE_CASE)
    )

    // Marketing/promotional patterns (should be rejected)
    private val MARKETING_PATTERNS = listOf(
        Regex(".*offer.*valid.*", RegexOption.IGNORE_CASE),
        Regex(".*discount.*off.*", RegexOption.IGNORE_CASE),
        Regex(".*subscribe.*", RegexOption.IGNORE_CASE),
        Regex(".*unsubscribe.*", RegexOption.IGNORE_CASE),
        Regex(".*click here.*", RegexOption.IGNORE_CASE),
        Regex(".*congratulations.*won.*", RegexOption.IGNORE_CASE),
        Regex(".*limited time.*", RegexOption.IGNORE_CASE)
    )

    /**
     * Classifies SMS as likely financial or non-financial
     * Returns: true (financial), false (non-financial), null (rejected - OTP/marketing)
     */
    fun classifyFinancial(sender: String, content: String): Boolean? {
        val contentLower = content.lowercase()

        // First, check if it should be rejected
        if (shouldReject(sender, content)) {
            Log.d(TAG, "SMS rejected (OTP/Marketing): $sender")
            return null // Will be filtered out
        }

        // Check sender patterns
        val hasFinancialSender = FINANCIAL_SENDER_PATTERNS.any { it.matches(sender) }

        // Check content for financial keywords
        val financialKeywordCount = FINANCIAL_KEYWORDS.count { keyword ->
            contentLower.contains(keyword.lowercase())
        }

        // Check for amount patterns (e.g., $123.45, ₹1,234.56)
        val hasAmountPattern = Regex("[$₹€£¥]\\s*[\\d,]+\\.?\\d*").containsMatchIn(content)

        // Classification logic
        val isFinancial = when {
            hasFinancialSender && financialKeywordCount >= 2 -> true
            hasAmountPattern && financialKeywordCount >= 1 -> true
            financialKeywordCount >= 3 -> true
            else -> false
        }

        Log.d(TAG, "SMS classified as ${if (isFinancial) "financial" else "non-financial"}: $sender (keywords: $financialKeywordCount)")
        return isFinancial
    }

    /**
     * Checks if SMS should be rejected (OTP, marketing, etc.)
     */
    private fun shouldReject(sender: String, content: String): Boolean {
        // Check OTP patterns
        if (OTP_PATTERNS.any { it.containsMatchIn(content) }) {
            return true
        }

        // Check marketing patterns
        if (MARKETING_PATTERNS.any { it.containsMatchIn(content) }) {
            return true
        }

        return false
    }

    /**
     * Extracts potential financial indicators for AI preprocessing hints
     */
    fun extractFinancialHints(content: String): Map<String, Any> {
        val hints = mutableMapOf<String, Any>()

        // Extract amount
        val amountRegex = Regex("[$₹€£¥]\\s*([\\d,]+\\.?\\d*)")
        val amountMatch = amountRegex.find(content)
        if (amountMatch != null) {
            hints["has_amount"] = true
            hints["amount_str"] = amountMatch.groupValues[1]
        }

        // Detect transaction type keywords
        val transactionTypes = mapOf(
            "purchase" to listOf("purchase", "bought", "spent", "charged"),
            "payment" to listOf("payment", "paid", "received"),
            "withdrawal" to listOf("withdraw", "atm", "cash"),
            "refund" to listOf("refund", "reversed", "credited back"),
            "fee" to listOf("fee", "charge", "interest")
        )

        val contentLower = content.lowercase()
        transactionTypes.forEach { (type, keywords) ->
            if (keywords.any { contentLower.contains(it) }) {
                hints["suggested_type"] = type
            }
        }

        // Detect card last 4 digits
        val cardRegex = Regex("\\b\\d{4}\\b")
        val cardMatches = cardRegex.findAll(content).toList()
        if (cardMatches.isNotEmpty()) {
            hints["has_card_number"] = true
            hints["card_last_four"] = cardMatches.last().value
        }

        return hints
    }
}
