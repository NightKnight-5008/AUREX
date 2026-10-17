/**
 * SMS Device Management Hooks
 * Enterprise-grade hooks for device monitoring and redundancy management
 *
 * ARCHITECTURE:
 * - Real API calls via apiClient (backend integration)
 * - Auto-refresh: 60-second polling for real-time device status
 * - Cache invalidation: Optimistic updates with React Query
 *
 * FEATURES:
 * - Device listing with statistics (total, active, degraded, offline)
 * - Device detail view with heartbeat and SMS event history
 * - Device management: rename, priority change, disable, revoke
 * - Error handling with user-friendly alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type {
  SmsDevice,
  DeviceStatistics,
  GetDevicesResponse,
  GetDeviceDetailResponse,
  RenameDeviceInput,
  ChangePriorityInput,
  DisableDeviceInput,
  RevokeDeviceInput,
  DeviceActionResponse,
  DeviceStatus,
  DevicePriority,
} from '@/types/sms-device';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get all SMS devices for the current workspace
 */
export function useSmsDevices(workspaceId: string | null) {
  return useQuery<GetDevicesResponse>({
    queryKey: ['sms-devices', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return {
          devices: [],
          statistics: {
            totalDevices: 0,
            activeDevices: 0,
            degradedDevices: 0,
            offlineDevices: 0,
            primaryDevice: null,
            hasRedundancy: false,
            redundancyCoverage: 'none',
          },
        };
      }

      const response = await apiClient.getSmsDevices(workspaceId);
      return response as GetDevicesResponse;
    },
    enabled: !!workspaceId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get detailed information for a specific device
 */
export function useSmsDeviceDetail(deviceId: string | null, workspaceId: string | null) {
  return useQuery<GetDeviceDetailResponse>({
    queryKey: ['sms-device-detail', deviceId, workspaceId],
    queryFn: async () => {
      if (!deviceId || !workspaceId) {
        throw new Error('Device ID and workspace ID are required');
      }

      const response = await apiClient.getSmsDeviceDetail(workspaceId, deviceId);
      return response as GetDeviceDetailResponse;
    },
    enabled: !!deviceId && !!workspaceId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Rename a device
 */
export function useRenameDevice() {
  const queryClient = useQueryClient();

  return useMutation<DeviceActionResponse, Error, RenameDeviceInput>({
    mutationFn: async (input) => {
      const response = await apiClient.renameDevice(input.deviceId, input.newName);
      return response as DeviceActionResponse;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the device name in cache
      queryClient.setQueryData(['sms-device-detail', variables.deviceId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          device: {
            ...old.device,
            deviceName: variables.newName,
          }
        };
      });

      // Invalidate device list to refetch with new name
      queryClient.invalidateQueries({ queryKey: ['sms-devices'], refetchType: 'active' });

      // Show success toast
      toast.success('Device Renamed', {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error('Rename Failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Change device priority
 */
export function useChangePriority() {
  const queryClient = useQueryClient();

  return useMutation<DeviceActionResponse, Error, ChangePriorityInput>({
    mutationFn: async (input) => {
      const response = await apiClient.changeDevicePriority(input.deviceId, String(input.newPriority));
      return response as DeviceActionResponse;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the priority in cache
      queryClient.setQueryData(['sms-device-detail', variables.deviceId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          device: {
            ...old.device,
            priority: variables.newPriority,
          }
        };
      });

      // Invalidate device list to refetch with new priority
      queryClient.invalidateQueries({ queryKey: ['sms-devices'], refetchType: 'active' });

      toast.success('Priority Changed', {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error('Priority Change Failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Disable a device (soft disable)
 */
export function useDisableDevice() {
  const queryClient = useQueryClient();

  return useMutation<DeviceActionResponse, Error, DisableDeviceInput>({
    mutationFn: async (input) => {
      const response = await apiClient.disableDevice(input.deviceId, input.reason);
      return response as DeviceActionResponse;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the disabled status
      queryClient.setQueryData(['sms-device-detail', variables.deviceId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          device: {
            ...old.device,
            status: 'offline' as DeviceStatus,
            disabledAt: new Date().toISOString(),
          }
        };
      });

      // Invalidate device list
      queryClient.invalidateQueries({ queryKey: ['sms-devices'], refetchType: 'active' });

      toast.success('Device Disabled', {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error('Disable Failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Revoke a device (permanent)
 */
export function useRevokeDevice() {
  const queryClient = useQueryClient();

  return useMutation<DeviceActionResponse, Error, RevokeDeviceInput>({
    mutationFn: async (input) => {
      if (input.confirmationText !== 'REVOKE') {
        throw new Error('Confirmation text must be "REVOKE"');
      }

      const response = await apiClient.revokeDevice(input.deviceId);
      return response as DeviceActionResponse;
    },
    onSuccess: (data, variables) => {
      // Remove device from detail cache
      queryClient.removeQueries({ queryKey: ['sms-device-detail', variables.deviceId] });

      // Invalidate device list to remove the device
      queryClient.invalidateQueries({ queryKey: ['sms-devices'], refetchType: 'active' });

      toast.success('Device Revoked', {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error('Revoke Failed', {
        description: error.message,
      });
    },
  });
}
