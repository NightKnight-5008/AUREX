// API Client for Financial Dashboard Backend
// Replaces Creao Platform ORM calls with PostgreSQL backend
//
// SECURITY: Token is held in-memory only.
// SecureStorage (auth-context) is the persistent store.
// localStorage fallback removed — tokens must flow through setToken().

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  /**
   * Set auth token (in-memory only).
   * Called by auth-context after successful login/logout.
   */
  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
    } = config;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || error.error || 'API request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, androidPassword: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: { email, password, androidPassword },
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (response && 'authToken' in response && response.authToken) {
      this.setToken(response.authToken);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request('/api/auth/me', {
      method: 'GET',
    });
  }

  async logout() {
    this.setToken(null);
  }

  // User endpoints
  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`, {
      method: 'GET',
    });
  }

  async updateUser(userId: string, data: any) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: data,
    });
  }

  // Credit Card endpoints
  async createCreditCard(userId: string, cardData: any) {
    return this.request('/api/credit-cards', {
      method: 'POST',
      body: cardData,
    });
  }

  async getCreditCards(userId: string) {
    return this.request('/api/credit-cards', {
      method: 'GET',
    });
  }

  async getCreditCard(cardId: string) {
    return this.request(`/api/credit-cards/${cardId}`, {
      method: 'GET',
    });
  }

  async updateCreditCard(cardId: string, userId: string, cardData: any) {
    return this.request(`/api/credit-cards/${cardId}`, {
      method: 'PUT',
      body: cardData,
    });
  }

  async deleteCreditCard(cardId: string, userId: string) {
    return this.request(`/api/credit-cards/${cardId}`, {
      method: 'DELETE',
    });
  }

  // Transaction endpoints
  async createTransaction(userId: string, transactionData: any) {
    return this.request('/api/transactions', {
      method: 'POST',
      body: transactionData,
    });
  }

  async getTransactions(userId: string, limit = 100, offset = 0) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request(`/api/transactions?${params}`, {
      method: 'GET',
    });
  }

  async getTransactionsByCard(cardId: string, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      card_id: cardId,
    });
    return this.request(`/api/transactions?${params}`, {
      method: 'GET',
    });
  }

  async updateTransaction(transactionId: string, transactionData: any) {
    return this.request(`/api/transactions/${transactionId}`, {
      method: 'PUT',
      body: transactionData,
    });
  }

  async deleteTransaction(transactionId: string) {
    return this.request(`/api/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  // SMS Log endpoints
  async syncSmsLogs(userId: string, smsLogs: any[]) {
    return this.request('/api/sms/sync', {
      method: 'POST',
      body: { smsLogs },
    });
  }

  async getSmsLogs(userId: string, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request(`/api/sms/logs?${params}`, {
      method: 'GET',
    });
  }

  async searchSmsByPhone(phoneNumber: string) {
    return this.request(`/api/sms/search?phone=${encodeURIComponent(phoneNumber)}`, {
      method: 'GET',
    });
  }

  // Settings endpoints
  async getUserSettings(userId: string) {
    return this.request(`/api/settings/${userId}`, {
      method: 'GET',
    });
  }

  async updateUserSettings(userId: string, settings: any) {
    return this.request(`/api/settings/${userId}`, {
      method: 'PUT',
      body: settings,
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health', {
      method: 'GET',
    });
  }

  // Workspace endpoints
  async getWorkspace(workspaceId: string) {
    return this.request(`/api/workspaces/${workspaceId}`, {
      method: 'GET',
    });
  }

  async getMyWorkspace() {
    return this.request('/api/workspaces/me', {
      method: 'GET',
    });
  }

  async createWorkspace(data: { companyName: string; companyUsername: string }) {
    return this.request('/api/workspaces', {
      method: 'POST',
      body: data,
    });
  }

  async requestWorkspaceAccess(data: {
    companyUsername: string;
    fullName: string;
    requestedRoleKey: string;
    description: string;
  }) {
    return this.request('/api/workspaces/access-requests', {
      method: 'POST',
      body: data,
    });
  }

  async getAccessRequests(workspaceId: string) {
    return this.request(`/api/workspaces/${workspaceId}/access-requests`, {
      method: 'GET',
    });
  }

  async reviewAccessRequest(data: {
    accessRequestId: string;
    approved: boolean;
    denialReason?: string;
    permissionTemplateId?: string;
  }) {
    return this.request(`/api/workspaces/access-requests/${data.accessRequestId}/review`, {
      method: 'POST',
      body: data,
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.request(`/api/workspaces/${workspaceId}/members`, {
      method: 'GET',
    });
  }

  async updateMemberRole(workspaceId: string, memberId: string, data: { roleId: string; permissionTemplateId?: string }) {
    return this.request(`/api/workspaces/${workspaceId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: data,
    });
  }

  async revokeMemberAccess(workspaceId: string, memberId: string) {
    return this.request(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(workspaceId: string, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request(`/api/workspaces/${workspaceId}/audit-logs?${params}`, {
      method: 'GET',
    });
  }

  // SMS Device endpoints
  async getSmsDevices(workspaceId: string) {
    return this.request(`/api/workspaces/${workspaceId}/sms-devices`, {
      method: 'GET',
    });
  }

  async getSmsDeviceDetail(workspaceId: string, deviceId: string) {
    return this.request(`/api/workspaces/${workspaceId}/sms-devices/${deviceId}`, {
      method: 'GET',
    });
  }

  async renameDevice(deviceId: string, newName: string) {
    return this.request(`/api/sms-devices/${deviceId}/rename`, {
      method: 'PATCH',
      body: { name: newName },
    });
  }

  async changeDevicePriority(deviceId: string, newPriority: string) {
    return this.request(`/api/sms-devices/${deviceId}/priority`, {
      method: 'PATCH',
      body: { priority: newPriority },
    });
  }

  async disableDevice(deviceId: string, reason?: string) {
    return this.request(`/api/sms-devices/${deviceId}/disable`, {
      method: 'POST',
      body: { reason },
    });
  }

  async revokeDevice(deviceId: string) {
    return this.request(`/api/sms-devices/${deviceId}/revoke`, {
      method: 'DELETE',
    });
  }

  // Device registration (called by Android on first login)
  async registerDevice(workspaceId: string, data: {
    deviceId: string;
    deviceName: string;
    phoneNumber: string;
    deviceModel?: string;
  }) {
    return this.request(`/api/workspaces/${workspaceId}/sms-devices/register`, {
      method: 'POST',
      body: data,
    });
  }

  // Device label/name update (persisted to backend)
  async updateDeviceLabel(deviceId: string, label: string) {
    return this.request(`/api/sms-devices/${deviceId}/label`, {
      method: 'PATCH',
      body: { label },
    });
  }
}

export const apiClient = new ApiClient();

// Type definitions for API responses
export interface User {
  id: string;
  email: string;
  phone_number?: string;
  language: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  alias_name: string;
  last_four_digits: string;
  card_network: string;
  limit_amount: number;
  current_balance: number;
  billing_cycle_day?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  card_id?: string;
  transaction_type: string;
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
}

export interface SmsLog {
  id: string;
  user_id: string;
  sender: string;
  content: string;
  received_at: string;
  processed: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  country?: string;
  currency?: string;
  language: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  userId: string;
  authToken: string;
  expiresAt: string;
  message?: string;
}

export default apiClient;
