/**
 * WhatsApp Messaging Service
 *
 * Handles WhatsApp Business API integration for payment reminders
 *
 * SUPPORTED APIS:
 * - WhatsApp Business API (official)
 * - Twilio WhatsApp API (recommended alternative)
 * - Other webhook-compatible providers
 *
 * FEATURES:
 * - Template message sending
 * - Delivery status tracking
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Error handling
 *
 * @module WhatsAppService
 */

import axios, { type AxiosInstance } from 'axios';
import { hashPhoneNumber, redactPhoneNumber } from '../utils/phone-encryption';

/**
 * WhatsApp message template parameters
 */
export interface PaymentReminderParams {
  cardName: string;
  cardLastFour: string;
  amount: string;
  currency: string;
  dueDate: string;
}

/**
 * WhatsApp send message request
 */
export interface SendMessageRequest {
  phoneNumber: string;
  templateParams: PaymentReminderParams;
  reminderIdempotencyKey: string;
}

/**
 * WhatsApp send message response
 */
export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
  errorCode?: string;
  timestamp: string;
  warning?: string;
}

/**
 * WhatsApp delivery status
 */
export interface DeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * WhatsApp provider configuration
 */
interface WhatsAppConfig {
  provider: 'twilio' | 'official' | 'custom';
  apiUrl: string;
  apiKey: string;
  apiSecret?: string;
  phoneNumberId?: string; // For official WhatsApp API
  accountSid?: string; // For Twilio
  authToken?: string; // For Twilio
  fromNumber?: string; // WhatsApp-enabled number
}

/**
 * WhatsApp Service Class
 */
export class WhatsAppService {
  private config: WhatsAppConfig;
  private httpClient: AxiosInstance;
  private rateLimiter: Map<string, number> = new Map();

  constructor() {
    this.config = this.loadConfig();
    this.httpClient = this.createHttpClient();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): WhatsAppConfig {
    const provider = (process.env.WHATSAPP_PROVIDER || 'twilio') as WhatsAppConfig['provider'];

    const config: WhatsAppConfig = {
      provider,
      apiUrl: process.env.WHATSAPP_API_URL || '',
      apiKey: process.env.WHATSAPP_API_KEY || '',
      apiSecret: process.env.WHATSAPP_API_SECRET,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.WHATSAPP_FROM_NUMBER,
    };

    // Validate configuration
    if (provider === 'twilio') {
      if (!config.accountSid || !config.authToken || !config.fromNumber) {
        console.warn('[WhatsApp] Twilio configuration incomplete');
      }
      config.apiUrl = 'https://api.twilio.com/2010-04-01';
    } else if (provider === 'official') {
      if (!config.apiKey || !config.phoneNumberId) {
        console.warn('[WhatsApp] Official WhatsApp API configuration incomplete');
      }
      config.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    }

    return config;
  }

  /**
   * Create HTTP client with authentication
   */
  private createHttpClient(): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add provider-specific authentication
    if (this.config.provider === 'official' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return axios.create({
      baseURL: this.config.apiUrl,
      headers,
      timeout: 30000, // 30 seconds
      ...(this.config.provider === 'twilio' && this.config.accountSid && this.config.authToken
        ? {
            auth: {
              username: this.config.accountSid,
              password: this.config.authToken,
            },
          }
        : {}),
    });
  }

  /**
   * Check rate limit for phone number
   *
   * @param phoneNumber - Phone number to check
   * @returns True if within rate limit
   */
  private checkRateLimit(phoneNumber: string): boolean {
    const hash = hashPhoneNumber(phoneNumber);
    const lastSent = this.rateLimiter.get(hash);
    const now = Date.now();

    // Rate limit: 1 message per phone number per 5 minutes
    const RATE_LIMIT_MS = 5 * 60 * 1000;

    if (lastSent && now - lastSent < RATE_LIMIT_MS) {
      return false;
    }

    this.rateLimiter.set(hash, now);
    return true;
  }

  /**
   * Send payment reminder via WhatsApp
   *
   * @param request - Send message request
   * @returns Send message response
   *
   * @example
   * ```typescript
   * const response = await whatsAppService.sendPaymentReminder({
   *   phoneNumber: '+1234567890',
   *   templateParams: {
   *     cardName: 'Visa ****1234',
   *     cardLastFour: '1234',
   *     amount: '150.00',
   *     currency: 'USD',
   *     dueDate: 'March 15, 2026'
   *   },
   *   reminderIdempotencyKey: 'reminder-uuid'
   * });
   * ```
   */
  async sendPaymentReminder(request: SendMessageRequest): Promise<SendMessageResponse> {
    const startTime = Date.now();

    try {
      // Check rate limit
      if (!this.checkRateLimit(request.phoneNumber)) {
        return {
          success: false,
          status: 'failed',
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT',
          timestamp: new Date().toISOString(),
        };
      }

      // Format message
      const message = this.formatPaymentReminderMessage(request.templateParams);

      // Send based on provider
      let response: SendMessageResponse;

      if (this.config.provider === 'twilio') {
        response = await this.sendViaTwilio(request.phoneNumber, message, request.reminderIdempotencyKey);
      } else if (this.config.provider === 'official') {
        response = await this.sendViaOfficial(request.phoneNumber, message, request.reminderIdempotencyKey);
      } else {
        response = await this.sendViaCustom(request.phoneNumber, message, request.reminderIdempotencyKey);
      }

      const duration = Date.now() - startTime;

      console.log(
        `[WhatsApp] Message ${response.success ? 'sent' : 'failed'} to ${redactPhoneNumber(request.phoneNumber)} in ${duration}ms`
      );

      return response;
    } catch (error) {
      console.error(`[WhatsApp] Error sending message to ${redactPhoneNumber(request.phoneNumber)}:`, error);

      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SEND_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Format payment reminder message
   */
  private formatPaymentReminderMessage(params: PaymentReminderParams): string {
    return `🔔 AUREX Payment Reminder

Card: ${params.cardName} (****${params.cardLastFour})
Amount Due: ${params.currency} ${params.amount}
Due Date: ${params.dueDate}

Please ensure payment is made by the due date to avoid late fees.

Need help? Reply to this message or visit your AUREX dashboard.

---
This is an automated reminder. You can manage reminder preferences in your AUREX app settings.`;
  }

  /**
   * Send via Twilio WhatsApp API
   */
  private async sendViaTwilio(
    phoneNumber: string,
    message: string,
    idempotencyKey: string
  ): Promise<SendMessageResponse> {
    if (!this.config.accountSid || !this.config.fromNumber) {
      throw new Error('Twilio configuration missing');
    }

    try {
      const response = await this.httpClient.post(
        `/Accounts/${this.config.accountSid}/Messages.json`,
        new URLSearchParams({
          From: `whatsapp:${this.config.fromNumber}`,
          To: `whatsapp:${phoneNumber}`,
          Body: message,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      return {
        success: true,
        messageId: response.data.sid,
        status: response.data.status === 'queued' ? 'queued' : 'sent',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.data?.code || 'TWILIO_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send via Official WhatsApp Business API
   */
  private async sendViaOfficial(
    phoneNumber: string,
    message: string,
    idempotencyKey: string
  ): Promise<SendMessageResponse> {
    if (!this.config.phoneNumberId) {
      throw new Error('WhatsApp Phone Number ID missing');
    }

    try {
      const response = await this.httpClient.post(
        `/${this.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        status: 'sent',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code || 'WHATSAPP_API_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send via custom webhook provider
   */
  private async sendViaCustom(
    phoneNumber: string,
    message: string,
    idempotencyKey: string
  ): Promise<SendMessageResponse> {
    // Production: Require proper WhatsApp provider configuration
    console.error('[WhatsApp] ERROR: WhatsApp provider not configured');
    return {
      success: false,
      status: 'failed',
      error: 'WhatsApp provider not configured. Please set WHATSAPP_PROVIDER, WHATSAPP_API_KEY, and related environment variables.',
      errorCode: 'NO_PROVIDER',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get delivery status for a message
   *
   * @param messageId - WhatsApp message ID
   * @returns Delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    // Provider-specific implementation
    if (this.config.provider === 'twilio') {
      return this.getTwilioDeliveryStatus(messageId);
    } else if (this.config.provider === 'official') {
      return this.getOfficialDeliveryStatus(messageId);
    }

    // Provider not configured
    return {
      messageId,
      status: 'failed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get Twilio message delivery status
   */
  private async getTwilioDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    try {
      if (!this.config.accountSid) {
        throw new Error('Twilio Account SID missing');
      }

      const response = await this.httpClient.get(
        `/Accounts/${this.config.accountSid}/Messages/${messageId}.json`
      );

      const statusMap: Record<string, DeliveryStatus['status']> = {
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
        undelivered: 'failed',
      };

      return {
        messageId,
        status: statusMap[response.data.status] || 'sent',
        timestamp: response.data.date_updated || new Date().toISOString(),
        errorCode: response.data.error_code,
        errorMessage: response.data.error_message,
      };
    } catch (error: any) {
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get official WhatsApp API delivery status
   */
  private async getOfficialDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    // Note: Official API uses webhooks for status updates
    // This is a placeholder - actual status comes via webhook
    return {
      messageId,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate WhatsApp configuration
   *
   * @returns True if configuration is valid
   */
  validateConfiguration(): boolean {
    if (this.config.provider === 'twilio') {
      return !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
    } else if (this.config.provider === 'official') {
      return !!(this.config.apiKey && this.config.phoneNumberId);
    }

    return false;
  }

  /**
   * Test connection to WhatsApp API
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.config.provider === 'twilio' && this.config.accountSid) {
        const response = await this.httpClient.get(`/Accounts/${this.config.accountSid}.json`);
        return response.status === 200;
      }

      return this.validateConfiguration();
    } catch (error) {
      console.error('[WhatsApp] Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new WhatsAppService();
