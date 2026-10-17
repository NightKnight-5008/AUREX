/**
 * WhatsApp Payment Reminders Hooks
 *
 * React hooks for managing WhatsApp payment reminders
 *
 * @module use-whatsapp-reminders
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/sdk/core/request';
import { getAuthToken } from '@/sdk/core/auth';

/**
 * User reminder preferences
 */
export interface ReminderPreferences {
  phoneNumber?: string; // Last 4 digits only (for display)
  phoneCountryCode: string;
  remindersEnabled: boolean;
  reminderTimeHour: number;
  timezone: string;
  whatsappConsentGiven: boolean;
  whatsappConsentDate?: string;
  privacyNoticeAccepted: boolean;
}

/**
 * Update preferences request
 */
export interface UpdatePreferencesRequest {
  phoneNumber: string; // Full E.164 format
  phoneCountryCode?: string;
  remindersEnabled?: boolean;
  reminderTimeHour?: number;
  timezone?: string;
  whatsappConsentGiven: boolean;
  privacyNoticeAccepted: boolean;
}

/**
 * Payment reminder details
 */
export interface PaymentReminder {
  reminderId: string;
  userId: string;
  paymentAmount: number;
  paymentDueDate: string;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  reminderSent: boolean;
  reminderSentAt?: string;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  attemptCount: number;
  lastAttemptAt?: string;
  deliveryError?: string;
}

/**
 * Hook to get user reminder preferences
 *
 * @example
 * const { data: preferences, isLoading } = useReminderPreferences();
 */
export function useReminderPreferences() {
  return useQuery({
    queryKey: ['reminderPreferences'],
    queryFn: async (): Promise<ReminderPreferences> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get('/reminders/preferences', { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to load preferences' }));
        throw new Error(error.message || 'Failed to load preferences');
      }

      const data = await response.json();
      return data.preferences;
    },
    enabled: !!getAuthToken(),
  });
}

/**
 * Hook to update reminder preferences
 *
 * @example
 * const { mutateAsync: updatePreferences } = useUpdateReminderPreferences();
 * await updatePreferences({
 *   phoneNumber: '+12025551234',
 *   phoneCountryCode: '+1',
 *   remindersEnabled: true,
 *   reminderTimeHour: 9,
 *   timezone: 'America/New_York',
 *   whatsappConsentGiven: true,
 *   privacyNoticeAccepted: true
 * });
 */
export function useUpdateReminderPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePreferencesRequest): Promise<void> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post('/reminders/preferences', request, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update preferences' }));
        throw new Error(error.message || 'Failed to update preferences');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate preferences query to refresh data
      queryClient.invalidateQueries({ queryKey: ['reminderPreferences'] });
    },
  });
}

/**
 * Hook to get upcoming payment reminders
 *
 * @example
 * const { data: reminders, isLoading } = useUpcomingReminders({ limit: 5 });
 */
export function useUpcomingReminders(options?: { limit?: number }) {
  const limit = options?.limit || 10;

  return useQuery({
    queryKey: ['upcomingReminders', limit],
    queryFn: async (): Promise<PaymentReminder[]> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get(`/reminders/upcoming?limit=${limit}`, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to load reminders' }));
        throw new Error(error.message || 'Failed to load reminders');
      }

      const data = await response.json();
      return data.reminders;
    },
    enabled: !!getAuthToken(),
  });
}

/**
 * Hook to get reminder status by ID
 *
 * @example
 * const { data: status } = useReminderStatus('reminder-uuid');
 */
export function useReminderStatus(reminderId: string) {
  return useQuery({
    queryKey: ['reminderStatus', reminderId],
    queryFn: async (): Promise<PaymentReminder> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get(`/reminders/${reminderId}/status`, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to load reminder status' }));
        throw new Error(error.message || 'Failed to load reminder status');
      }

      const data = await response.json();
      return data.status;
    },
    enabled: !!getAuthToken() && !!reminderId,
  });
}

/**
 * Hook to mark payment as paid
 *
 * @example
 * const { mutateAsync: markPaid } = useMarkPaymentPaid();
 * await markPaid('reminder-uuid');
 */
export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string): Promise<void> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post(`/reminders/${reminderId}/mark-paid`, {}, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to mark payment as paid' }));
        throw new Error(error.message || 'Failed to mark payment as paid');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh upcoming reminders
      queryClient.invalidateQueries({ queryKey: ['upcomingReminders'] });
    },
  });
}

/**
 * Validate phone number format (E.164)
 *
 * @param phoneNumber - Phone number to validate
 * @returns True if valid E.164 format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +14155552671
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number for display (show last 4 digits only)
 *
 * @param phoneNumber - Full phone number
 * @returns Formatted phone number (e.g., "****1234")
 */
export function formatPhoneNumberDisplay(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length < 4) {
    return '****';
  }
  return `****${phoneNumber.slice(-4)}`;
}

/**
 * Get user's timezone
 *
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}
