package com.aurex.android.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id")
    val id: String,

    @SerializedName("email")
    val email: String,

    @SerializedName("auth_token")
    val authToken: String?,

    @SerializedName("created_at")
    val createdAt: String?
)

data class LoginRequest(
    @SerializedName("email")
    val email: String,

    @SerializedName("password")
    val password: String,

    @SerializedName("security_key")
    val securityKey: String
)

data class LoginResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String?,

    @SerializedName("user")
    val user: User?,

    @SerializedName("auth_token")
    val authToken: String?
)
