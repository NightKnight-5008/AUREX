package com.aurex.android.utils

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * End-to-End Encryption utility for SMS messages
 * Uses Android Keystore with AES-256-GCM encryption
 */
object EncryptionUtils {

    private const val TAG = "EncryptionUtils"
    private const val KEYSTORE_ALIAS = "AurexSmsEncryptionKey"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128

    /**
     * Encrypts SMS content using AES-256-GCM
     * @return Base64 encoded encrypted content with IV prepended
     */
    fun encryptSmsContent(plaintext: String): String {
        return try {
            val secretKey = getOrCreateSecretKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val iv = cipher.iv
            val encryptedBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            // Prepend IV to encrypted data
            val combined = iv + encryptedBytes
            Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed", e)
            throw SecurityException("Failed to encrypt SMS content", e)
        }
    }

    /**
     * Decrypts SMS content
     * @param encryptedData Base64 encoded encrypted content with IV
     */
    fun decryptSmsContent(encryptedData: String): String {
        return try {
            val secretKey = getOrCreateSecretKey()
            val combined = Base64.decode(encryptedData, Base64.NO_WRAP)

            // Extract IV (first 12 bytes for GCM)
            val iv = combined.copyOfRange(0, 12)
            val encryptedBytes = combined.copyOfRange(12, combined.size)

            val cipher = Cipher.getInstance(TRANSFORMATION)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val decryptedBytes = cipher.doFinal(encryptedBytes)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "Decryption failed", e)
            throw SecurityException("Failed to decrypt SMS content", e)
        }
    }

    /**
     * Encrypts metadata (sender, timestamp, etc.)
     */
    fun encryptMetadata(metadata: String): String {
        return encryptSmsContent(metadata)
    }

    /**
     * Decrypts metadata
     */
    fun decryptMetadata(encryptedMetadata: String): String {
        return decryptSmsContent(encryptedMetadata)
    }

    /**
     * Generates SHA-256 hash for tamper detection
     */
    fun generateContentHash(content: String): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(content.toByteArray(Charsets.UTF_8))
            hashBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Hash generation failed", e)
            throw SecurityException("Failed to generate content hash", e)
        }
    }

    /**
     * Verifies content integrity by comparing hashes
     */
    fun verifyContentIntegrity(content: String, expectedHash: String): Boolean {
        val actualHash = generateContentHash(content)
        return actualHash == expectedHash
    }

    /**
     * Generates unique message fingerprint for duplicate detection
     * Combines sender, timestamp, and content hash
     */
    fun generateMessageFingerprint(sender: String, receivedAt: Long, content: String): String {
        val combined = "$sender:$receivedAt:$content"
        return generateContentHash(combined).substring(0, 32) // First 32 chars
    }

    /**
     * Gets or creates the encryption key from Android Keystore
     */
    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        // Check if key exists
        if (keyStore.containsAlias(KEYSTORE_ALIAS)) {
            return keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        }

        // Create new key
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val keyGenParameterSpec = KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false) // Allow background encryption
            .build()

        keyGenerator.init(keyGenParameterSpec)
        return keyGenerator.generateKey()
    }

    /**
     * Wipes encryption key (for account logout/deletion)
     */
    fun wipeEncryptionKey() {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            keyStore.deleteEntry(KEYSTORE_ALIAS)
            Log.d(TAG, "Encryption key wiped successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to wipe encryption key", e)
        }
    }
}
