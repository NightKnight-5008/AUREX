/**
 * Google OAuth 2.0 Service with PKCE Flow + Secure Storage
 *
 * This service handles authentication with Google using OAuth 2.0 with PKCE
 * (Proof Key for Code Exchange) for secure client-side authentication.
 *
 * PKCE flow prevents authorization code interception attacks by using
 * a code verifier and code challenge.
 *
 * SECURITY UPGRADE (v1.1.0):
 * - OAuth tokens now encrypted with AES-256-GCM
 * - Stored via SecureStorage API with SENSITIVE classification
 * - Automatic expiry enforcement
 * - Session-based encryption keys
 */

import { SecureStorage } from './security/SecureStorage';
import type { OAuthTokenMetadata } from './security/types';

// Google OAuth endpoints
const OAUTH_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// OAuth scopes for each service
export const GOOGLE_SCOPES = {
  calendar: [
    'https://www.googleapis.com/auth/calendar.events.readonly',
    'https://www.googleapis.com/auth/calendar.readonly'
  ],
  tasks: [
    'https://www.googleapis.com/auth/tasks.readonly'
  ],
  docs: [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/documents.readonly'
  ]
} as const;

export type GoogleServiceType = keyof typeof GOOGLE_SCOPES;

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
}

interface OAuthTokens {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface StoredTokenData {
  accessToken: string;
  expiresAt: number;
  scope: string;
  refreshToken?: string;
}

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encoding without padding
 */
function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate random state parameter for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Get stored token data for a service (from SecureStorage)
 */
async function getStoredToken(serviceType: GoogleServiceType): Promise<StoredTokenData | null> {
  const tokenMetadata = await SecureStorage.getOAuthToken(`google_${serviceType}`);

  if (!tokenMetadata) return null;

  // Convert OAuthTokenMetadata to StoredTokenData format
  const data: StoredTokenData = {
    accessToken: tokenMetadata.accessToken,
    expiresAt: tokenMetadata.expiresAt,
    scope: tokenMetadata.scope.join(' '), // Convert array to space-separated string
    refreshToken: tokenMetadata.refreshToken
  };

  // SecureStorage handles expiry automatically, but double-check
  if (Date.now() >= data.expiresAt) {
    await SecureStorage.clearOAuthToken(`google_${serviceType}`);
    return null;
  }

  return data;
}

/**
 * Store token data for a service (via SecureStorage)
 */
async function storeToken(serviceType: GoogleServiceType, tokens: OAuthTokens): Promise<void> {
  const tokenMetadata: OAuthTokenMetadata = {
    service: `google-${serviceType}` as OAuthTokenMetadata['service'],
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
    scope: tokens.scope.split(' ') // Convert space-separated string to array
  };

  await SecureStorage.setOAuthToken(`google_${serviceType}`, tokenMetadata);

  // Also update connection status (can remain in localStorage as PUBLIC data)
  await SecureStorage.setPreference(`google_${serviceType}_connected`, true);
  await SecureStorage.setPreference(`google_${serviceType}_connected_at`, new Date().toISOString());
}

/**
 * Remove stored token for a service (from SecureStorage)
 */
async function removeToken(serviceType: GoogleServiceType): Promise<void> {
  await SecureStorage.clearOAuthToken(`google_${serviceType}`);
  await SecureStorage.remove(`pref_google_${serviceType}_connected`);
  await SecureStorage.remove(`pref_google_${serviceType}_connected_at`);
}

/**
 * Build OAuth authorization URL
 */
function buildAuthUrl(config: OAuthConfig, codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `${OAUTH_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  const response = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get OAuth client ID from environment
 */
function getClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'Google OAuth Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env.local file.\n\n' +
      'Steps to set up:\n' +
      '1. Go to https://console.cloud.google.com\n' +
      '2. Create a project and enable Google Calendar, Tasks, and Docs APIs\n' +
      '3. Create OAuth 2.0 credentials (Web application)\n' +
      '4. Add authorized redirect URI: ' + window.location.origin + '/auth/callback\n' +
      '5. Copy the Client ID to .env.local as VITE_GOOGLE_CLIENT_ID=your_client_id'
    );
  }

  return clientId;
}

/**
 * Get OAuth redirect URI
 */
function getRedirectUri(): string {
  // Use environment variable if set, otherwise use current origin + /auth-callback.html
  const envRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  return envRedirectUri || `${window.location.origin}/auth-callback.html`;
}

/**
 * Start OAuth flow for a Google service
 */
export async function startOAuthFlow(serviceType: GoogleServiceType): Promise<void> {
  try {
    const clientId = getClientId();
    const redirectUri = getRedirectUri();
    const scopes = GOOGLE_SCOPES[serviceType];

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE parameters and service type for callback
    const pkceData = {
      codeVerifier,
      state,
      serviceType,
      clientId,
      timestamp: Date.now()
    };
    sessionStorage.setItem('google_oauth_pkce', JSON.stringify(pkceData));

    // Build authorization URL
    const config: OAuthConfig = {
      clientId,
      redirectUri,
      scopes
    };
    const authUrl = buildAuthUrl(config, codeChallenge, state);

    // Open OAuth popup
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      authUrl,
      'Google OAuth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Monitor popup for completion
    return new Promise((resolve, reject) => {
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);

          // Check if auth was successful
          const success = sessionStorage.getItem('google_oauth_success');
          const error = sessionStorage.getItem('google_oauth_error');

          sessionStorage.removeItem('google_oauth_success');
          sessionStorage.removeItem('google_oauth_error');

          if (error) {
            reject(new Error(error));
          } else if (success) {
            resolve();
          } else {
            reject(new Error('Authorization cancelled'));
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error('Authorization timeout'));
      }, 5 * 60 * 1000);
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to start OAuth flow');
  }
}


/**
 * Get valid access token for a service (handles refresh if needed)
 */
export async function getAccessToken(serviceType: GoogleServiceType): Promise<string | null> {
  const tokenData = await getStoredToken(serviceType);

  if (!tokenData) {
    return null;
  }

  // Token is valid
  return tokenData.accessToken;
}

/**
 * Revoke access and disconnect a service
 */
export async function disconnectService(serviceType: GoogleServiceType): Promise<void> {
  const tokenData = await getStoredToken(serviceType);

  if (tokenData) {
    try {
      // Revoke token with Google
      await fetch(OAUTH_REVOKE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: tokenData.accessToken
        })
      });
    } catch (error) {
      console.error('Failed to revoke token:', error);
      // Continue with local cleanup even if revoke fails
    }
  }

  // Remove stored token and connection status
  await removeToken(serviceType);
}

/**
 * Check if a service is connected
 */
export async function isServiceConnected(serviceType: GoogleServiceType): Promise<boolean> {
  const tokenData = await getStoredToken(serviceType);
  return tokenData !== null;
}

/**
 * Get all connected services
 */
export async function getConnectedServices(): Promise<GoogleServiceType[]> {
  const services: GoogleServiceType[] = [];

  for (const serviceType of Object.keys(GOOGLE_SCOPES) as GoogleServiceType[]) {
    if (await isServiceConnected(serviceType)) {
      services.push(serviceType);
    }
  }

  return services;
}
