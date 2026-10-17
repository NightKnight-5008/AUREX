package com.aurex.android.models

import com.google.gson.annotations.SerializedName

data class SemiAccount(
    @SerializedName("id")
    val id: String?,

    @SerializedName("user_id")
    val userId: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("phone_number")
    val phoneNumber: String?,

    @SerializedName("created_at")
    val createdAt: String?,

    @SerializedName("updated_at")
    val updatedAt: String?
)

data class SemiAccountRequest(
    @SerializedName("name")
    val name: String,

    @SerializedName("phone_number")
    val phoneNumber: String?
)

data class SemiAccountResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String?,

    @SerializedName("semi_account")
    val semiAccount: SemiAccount?
)

data class SemiAccountListResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String?,

    @SerializedName("semi_accounts")
    val semiAccounts: List<SemiAccount>?
)
