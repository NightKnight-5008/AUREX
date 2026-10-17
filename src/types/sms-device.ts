/**
 * SMS Device Monitoring & Redundancy Management Types
 * Enterprise infrastructure monitoring system
 *
 * UNIFIED DEVICE SCHEMA
 * - Priority is INTEGER (1-10), not string enum
 * - NetworkStatus includes 'ethernet'
 * - Classification uses UnifiedSmsClassification
 */

import type { UnifiedSmsClassification } from './sms';

// ============================================================================
// DEVICE STATUS TYPES
// ============================================================================

export type DeviceStatus = 'active' | 'degraded' | 'offline';

/**
 * Device priority as integer (1-10).
 * 1 = highest priority (primary), 10 = lowest priority.
 * Android sends integer. Backend stores integer. Desktop displays mapped label.
 */
export type DevicePriority = number;

/**
 * Priority display labels for the UI.
 * Maps integer priority ranges to human-readable labels.
 */
export function getDevicePriorityLabel(priority: number): string {
  if (priority <= 1) return 'Primary';
  if (priority <= 3) return 'Secondary';
  if (priority <= 5) return 'Tertiary';
  return 'Backup';
}

/**
 * Priority badge variant for UI display.
 */
export function getDevicePriorityVariant(priority: number): 'default' | 'secondary' | 'outline' {
  if (priority <= 1) return 'default';
  if (priority <= 3) return 'secondary';
  return 'outline';
}

export type NetworkStatus = 'online' | 'offline' | 'wifi' | 'cellular' | 'ethernet';

// ============================================================================
// SMS DEVICE TYPES
// ============================================================================

export interface SmsDevice {
  id: string;
  workspaceId: string;
  deviceId: string; // Immutable backend identifier
  deviceName: string; // Human-readable label
  phoneNumber: string; // E.164 format
  phoneNumberMasked: string; // Masked display (e.g. +20***1234)
  status: DeviceStatus;
  priority: DevicePriority;

  // Health monitoring
  lastHeartbeatAt: string; // ISO 8601 timestamp
  lastSmsAt: string | null; // ISO 8601 timestamp
  queueSize: number; // Pending messages
  batteryLevel: number; // Percentage (0-100)
  isCharging: boolean;
  networkStatus: NetworkStatus;

  // Device metadata
  appVersion: string;
  androidVersion: string;
  deviceModel: string | null;
  locale: string;

  // Timestamps
  boundAt: string; // When device was bound to workspace
  disabledAt: string | null;
  revokedAt: string | null;

  // Computed fields (frontend only)
  lastHeartbeatRelative?: string; // "2 min ago"
  lastSmsRelative?: string; // "5 hours ago"
}

// ============================================================================
// DEVICE HEARTBEAT TYPES
// ============================================================================

export interface DeviceHeartbeat {
  id: string;
  deviceId: string;
  timestamp: string;
  batteryLevel: number;
  isCharging: boolean;
  networkStatus: NetworkStatus;
  queueSize: number;
  lastSmsForwardedAt: string | null;
  appVersion: string;
  androidVersion: string;
}

// ============================================================================
// SMS EVENT TYPES (Simplified for device monitoring)
// ============================================================================

export interface DeviceSmsEvent {
  id: string;
  deviceId: string;
  sender: string;
  receivedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
  classification: UnifiedSmsClassification | null;
}

// ============================================================================
// DEVICE ACTIONS TYPES
// ============================================================================

export interface RenameDeviceInput {
  deviceId: string;
  newName: string;
}

export interface ChangePriorityInput {
  deviceId: string;
  newPriority: DevicePriority;
}

export interface DisableDeviceInput {
  deviceId: string;
  reason?: string;
}

export interface RevokeDeviceInput {
  deviceId: string;
  confirmationText: string; // Must type "REVOKE" to confirm
}

// ============================================================================
// DEVICE STATISTICS TYPES
// ============================================================================

export interface DeviceStatistics {
  totalDevices: number;
  activeDevices: number;
  degradedDevices: number;
  offlineDevices: number;
  primaryDevice: SmsDevice | null;
  hasRedundancy: boolean; // true if multiple devices exist
  redundancyCoverage: 'full' | 'partial' | 'none'; // full = all active, partial = some active, none = all offline
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GetDevicesResponse {
  devices: SmsDevice[];
  statistics: DeviceStatistics;
}

export interface GetDeviceDetailResponse {
  device: SmsDevice;
  recentHeartbeats: DeviceHeartbeat[];
  recentSmsEvents: DeviceSmsEvent[];
}

export interface DeviceActionResponse {
  success: boolean;
  message: string;
  device?: SmsDevice;
}
