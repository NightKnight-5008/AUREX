import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserModel } from '@/components/data/orm/orm_user';
import {
  hashPassword,
  verifyPassword,
  generateAuthToken,
  generateAndroidPassword,
  getTokenExpiration,
  isTokenExpired,
  generateVerificationCode,
  getVerificationCodeExpiration,
  sendVerificationEmail,
  isVerificationCodeExpired
} from '@/lib/auth-utils';
import {
  getUserByEmail,
  getUserByAuthToken,
  insertUser,
  updateUserByEmail,
} from '@/lib/local-user-storage';
import { SecureStorage } from '@/lib/security/SecureStorage';
import type { AuthTokenMetadata } from '@/lib/security/types';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: UserModel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Initialize secure storage
        await SecureStorage.initialize();

        // Get stored auth token metadata
        const tokenMetadata = await SecureStorage.getAuthToken();

        if (!tokenMetadata) {
          setIsLoading(false);
          return;
        }

        // Try to fetch user by token
        const foundUser = getUserByAuthToken(tokenMetadata.token);

        if (foundUser) {
          // Check if token is expired
          if (isTokenExpired(foundUser.token_expires_at)) {
            await SecureStorage.clearAuthToken();
            apiClient.setToken(null);
            setUser(null);
          } else {
            setUser(foundUser);
            // Sync token to API client for authenticated requests
            apiClient.setToken(tokenMetadata.token);
          }
        } else {
          await SecureStorage.clearAuthToken();
          apiClient.setToken(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        await SecureStorage.clearAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    try {
      // Check if user already exists
      const existingUser = getUserByEmail(email);

      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiresAt = getVerificationCodeExpiration();

      // Hash password and generate Android password
      const passwordHash = await hashPassword(password);
      const androidPassword = generateAndroidPassword();

      // Create new user (not authenticated yet, no auth token)
      const newUser = insertUser({
        email,
        password_hash: passwordHash,
        android_app_password: androidPassword,
        auth_token: null,
        token_expires_at: null,
        language: 'en',
        email_verified: false,
        verification_code: verificationCode,
        verification_code_expires_at: verificationCodeExpiresAt,
      });

      if (newUser) {
        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);

        if (!emailSent) {
          return { success: false, error: 'Failed to send verification email' };
        }

        return { success: true, needsVerification: true };
      }

      return { success: false, error: 'Failed to create user' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An error occurred during sign up' };
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find user by email
      const foundUser = getUserByEmail(email);

      if (!foundUser) {
        return { success: false, error: 'User not found' };
      }

      // Check if already verified
      if (foundUser.email_verified) {
        return { success: false, error: 'Email already verified' };
      }

      // Check if verification code matches
      if (foundUser.verification_code !== code) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Check if verification code is expired
      if (isVerificationCodeExpired(foundUser.verification_code_expires_at)) {
        return { success: false, error: 'Verification code has expired' };
      }

      // Generate auth token
      const authToken = generateAuthToken(foundUser.id);
      const tokenExpiresAt = getTokenExpiration();

      // Update user: mark as verified and set auth token
      const updatedUser = updateUserByEmail(email, {
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        auth_token: authToken,
        token_expires_at: tokenExpiresAt,
      });

      if (updatedUser) {
        setUser(updatedUser);
        // Store auth token in secure storage
        const tokenMetadata: AuthTokenMetadata = {
          token: authToken,
          expiresAt: new Date(tokenExpiresAt).getTime(),
          issuedAt: Date.now(),
          userId: updatedUser.id,
          sessionId: authToken, // Using token as session ID for now
        };
        await SecureStorage.setAuthToken(tokenMetadata);
        return { success: true };
      }

      return { success: false, error: 'Failed to verify email' };
    } catch (error) {
      console.error('Verify email error:', error);
      return { success: false, error: 'An error occurred during verification' };
    }
  };

  const resendVerificationCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find user by email
      const foundUser = getUserByEmail(email);

      if (!foundUser) {
        return { success: false, error: 'User not found' };
      }

      // Check if already verified
      if (foundUser.email_verified) {
        return { success: false, error: 'Email already verified' };
      }

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiresAt = getVerificationCodeExpiration();

      // Update user with new verification code
      const updatedUser = updateUserByEmail(email, {
        verification_code: verificationCode,
        verification_code_expires_at: verificationCodeExpiresAt,
      });

      if (updatedUser) {
        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);

        if (!emailSent) {
          return { success: false, error: 'Failed to send verification email' };
        }

        return { success: true };
      }

      return { success: false, error: 'Failed to resend verification code' };
    } catch (error) {
      console.error('Resend verification code error:', error);
      return { success: false, error: 'An error occurred while resending code' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Try backend API first (unified POST /api/auth/login)
    try {
      const response = await apiClient.login(email, password);

      if (response && response.authToken) {
        // API login succeeded — sync token to SecureStorage
        const tokenMetadata: AuthTokenMetadata = {
          token: response.authToken,
          expiresAt: new Date(response.expiresAt).getTime(),
          issuedAt: Date.now(),
          userId: response.userId,
          sessionId: response.authToken,
        };
        await SecureStorage.setAuthToken(tokenMetadata);

        // Create/update local user record for offline compatibility
        const existingUser = getUserByEmail(email);
        if (existingUser) {
          const updatedUser = updateUserByEmail(email, {
            auth_token: response.authToken,
            token_expires_at: response.expiresAt,
            email_verified: true,
          });
          if (updatedUser) setUser(updatedUser);
        } else {
          // Create a local user record from API response
          const localUser = insertUser({
            email,
            password_hash: '', // Not stored locally when API auth is used
            android_app_password: '',
            auth_token: response.authToken,
            token_expires_at: response.expiresAt,
            language: 'en',
            email_verified: true,
            verification_code: null,
            verification_code_expires_at: null,
          });
          if (localUser) setUser(localUser);
        }

        return { success: true };
      }
    } catch {
      // API unavailable — fall through to local auth
      console.warn('Backend API unavailable, falling back to local auth');
    }

    // Fallback: Local authentication
    try {
      const foundUser = getUserByEmail(email);

      if (!foundUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      const isValid = await verifyPassword(password, foundUser.password_hash);

      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (!foundUser.email_verified) {
        return { success: false, error: 'Please verify your email before signing in' };
      }

      const authToken = generateAuthToken(foundUser.id);
      const tokenExpiresAt = getTokenExpiration();

      const updatedUser = updateUserByEmail(email, {
        auth_token: authToken,
        token_expires_at: tokenExpiresAt,
      });

      if (updatedUser) {
        setUser(updatedUser);
        apiClient.setToken(authToken);
        const tokenMetadata: AuthTokenMetadata = {
          token: authToken,
          expiresAt: new Date(tokenExpiresAt).getTime(),
          issuedAt: Date.now(),
          userId: updatedUser.id,
          sessionId: authToken,
        };
        await SecureStorage.setAuthToken(tokenMetadata);
        return { success: true };
      }

      return { success: false, error: 'Failed to update session' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An error occurred during sign in' };
    }
  };

  const signOut = async () => {
    setUser(null);
    apiClient.setToken(null);
    await SecureStorage.clearSensitiveData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signUp,
        verifyEmail,
        resendVerificationCode,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
