package com.aurex.android.models

import com.google.gson.annotations.SerializedName

data class SmsMessage(
    @SerializedName("id")
    val id: String?,

    @SerializedName("user_id")
    val userId: String,

    @SerializedName("semi_account_id")
    val semiAccountId: String?,

    @SerializedName("phone_number")
    val phoneNumber: String,

    @SerializedName("sender")
    val sender: String,

    @SerializedName("content")
    val content: String,

    @SerializedName("received_at")
    val receivedAt: String,

    @SerializedName("processed")
    val processed: Boolean = false
)


