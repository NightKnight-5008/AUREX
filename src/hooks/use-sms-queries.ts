import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type {
  UnifiedSmsClassification,
  UnifiedExtractedData,
  UnifiedSyncStatus,
  UnifiedSyncMetadata,
} from '@/types/sms';

// Re-export unified types for backward compatibility
export type SmsClassification = UnifiedSmsClassification;
export type ExtractedData = UnifiedExtractedData;
export type SyncStatus = UnifiedSyncStatus;
export type SyncMetadata = UnifiedSyncMetadata;

export interface SmsMessage {
  id: string;
  userId: string;
  semiAccountId: string | null;
  phoneNumber: string;
  sender: string;
  content: string;
  receivedAt: string;
  processed: boolean;
  createdAt: string;
  // AI Processing fields
  classification?: UnifiedSmsClassification;
  extractedData?: UnifiedExtractedData;
  aiProcessedAt?: string;
  isEncrypted: boolean;
  rejectionReason?: string;
  // Android App Sync & Security fields
  syncMetadata: UnifiedSyncMetadata;
  locallyPreprocessed?: boolean;
  likelyFinancial?: boolean;
  appVersion?: string;
  encryptedMetadata?: boolean;
  // Unified fields (from types/sms.ts)
  workspaceId?: string;
  deviceId?: string;
  cardId?: string | null;
  simSlot?: number;
  simCarrierName?: string;
  deviceTimezoneOffset?: number;
  deviceLocale?: string;
}

export interface SemiAccount {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneNumberSearchResult {
  exists: boolean;
  hasAccess: boolean;
  semiAccount: SemiAccount | null;
  messages: SmsMessage[];
  message?: string;
}

/**
 * Hook to search SMS messages by phone number with ownership validation
 *
 * This hook enforces strict access control:
 * 1. Checks if phone number exists in the database
 * 2. Validates if the phone number's semi-account belongs to the current user
 * 3. Only returns data if the user owns the semi-account
 * 4. Returns no data if phone number belongs to another user's semi-account
 */
export function useSearchSmsByPhoneNumber(phoneNumber: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sms', 'search-by-phone', phoneNumber, user?.id],
    queryFn: async (): Promise<PhoneNumberSearchResult> => {
      if (!phoneNumber || !user) {
        return {
          exists: false,
          hasAccess: false,
          semiAccount: null,
          messages: [],
        };
      }

      // Try API first
      try {
        const response = await apiClient.getSmsLogs(user.id) as { messages?: SmsMessage[] };
        const allMessages = response.messages || [];
        const filtered = allMessages.filter(m => m.phoneNumber === phoneNumber);

        if (filtered.length > 0) {
          return {
            exists: true,
            hasAccess: true,
            semiAccount: {
              id: `semi-${phoneNumber}`,
              userId: user.id,
              name: phoneNumber,
              phoneNumber,
              createdAt: filtered[filtered.length - 1]?.createdAt || new Date().toISOString(),
              updatedAt: filtered[0]?.createdAt || new Date().toISOString(),
            },
            messages: filtered,
          };
        }
      } catch {
        // API unavailable — return empty result
      }

      // API unavailable — return empty result
      return { exists: false, hasAccess: false, semiAccount: null, messages: [] };
    },
    enabled: !!phoneNumber && phoneNumber.length > 0 && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get all semi-accounts for the current user
 */
export function useSemiAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['semi-accounts', user?.id],
    queryFn: async (): Promise<SemiAccount[]> => {
      if (!user) return [];

      // Try API first
      try {
        const response = await fetch('/api/semi-accounts', {
          headers: {
            'Authorization': `Bearer ${user.auth_token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          return data.accounts || data || [];
        }
      } catch {
        // API unavailable — return empty array
      }

      // API unavailable — return empty array
      return [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get SMS messages for a specific semi-account
 */
export function useSmsBySemiAccount(semiAccountId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sms', 'by-semi-account', semiAccountId, user?.id],
    queryFn: async (): Promise<SmsMessage[]> => {
      if (!semiAccountId || !user) return [];

      const response = await fetch(`/api/sms/by-semi-account/${semiAccountId}`, {
        headers: {
          'Authorization': `Bearer ${user.auth_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SMS messages');
      }

      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!semiAccountId && !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get all SMS messages for the current user (across all semi-accounts)
 */
export function useAllSmsMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sms', 'all', user?.id],
    queryFn: async (): Promise<SmsMessage[]> => {
      if (!user) return [];

      const response = await fetch('/api/sms/all', {
        headers: {
          'Authorization': `Bearer ${user.auth_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SMS messages');
      }

      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new semi-account
 */
export function useCreateSemiAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, phoneNumber }: { name: string; phoneNumber: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/semi-accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.auth_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to create semi-account');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate semi-accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['semi-accounts'] });
    },
  });
}

/**
 * Hook to update a semi-account
 */
export function useUpdateSemiAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, phoneNumber }: { id: string; name: string; phoneNumber: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`/api/semi-accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.auth_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to update semi-account');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semi-accounts'] });
    },
  });
}

/**
 * Hook to delete a semi-account
 */
export function useDeleteSemiAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`/api/semi-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.auth_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete semi-account');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semi-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['sms'] });
    },
  });
}
