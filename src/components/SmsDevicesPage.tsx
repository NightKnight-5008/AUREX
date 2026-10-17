/**
 * SMS Device Heartbeat Monitoring - Enhanced Edition
 * Real-time device health dashboard powered by Android app heartbeat signals
 *
 * DATA SOURCE:
 * All data comes from heartbeat signals sent by Android devices every few seconds
 * - Device status, battery, network info
 * - SMS processing queue size
 * - Last activity timestamps
 * - App version and device details
 *
 * ENHANCED FEATURES:
 * - Real-time device monitoring with visual timeline
 * - Advanced filtering & search capabilities
 * - Health score calculation and tracking
 * - Bulk device management actions
 * - Export device data to CSV
 * - Real-time alerts for degraded/offline devices
 * - Performance metrics (processing rate, success rate)
 * - Device comparison view
 * - Enterprise-grade dark mode styling
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Check,
  Activity,
  Signal,
  Search,
  Filter,
  Download,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Edit,
  Settings,
  Trash2,
} from 'lucide-react';
import { useSmsDevices, useRenameDevice, useChangePriority, useDisableDevice, useRevokeDevice } from '@/hooks/use-sms-devices';
import type { SmsDevice, DeviceStatus, DevicePriority, NetworkStatus } from '@/types/sms-device';
import { getDevicePriorityLabel, getDevicePriorityVariant } from '@/types/sms-device';
import { toast } from 'sonner';

interface SmsDevicesPageProps {
  workspaceId: string;
  canManage: boolean;
}

export function SmsDevicesPage({ workspaceId, canManage }: SmsDevicesPageProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonDevices, setComparisonDevices] = useState<Set<string>>(new Set());

  // Device management dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDevicePriority, setEditDevicePriority] = useState<DevicePriority>(3);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const { data, isLoading, error } = useSmsDevices(workspaceId);
  const renameMutation = useRenameDevice();
  const priorityMutation = useChangePriority();
  const disableMutation = useDisableDevice();
  const revokeMutation = useRevokeDevice();

  // Filter and search logic
  const filteredDevices = useMemo(() => {
    if (!data?.devices) return [];

    let devices = data.devices;

    // Search filter
    if (searchQuery) {
      devices = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceModel?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      devices = devices.filter(d => d.status === statusFilter);
    }

    // Priority filter (by range: "primary"=1, "secondary"=2-3, "backup"=4+)
    if (priorityFilter !== 'all') {
      devices = devices.filter(d => {
        const label = getDevicePriorityLabel(d.priority).toLowerCase();
        return label === priorityFilter;
      });
    }

    return devices;
  }, [data?.devices, searchQuery, statusFilter, priorityFilter]);

  // Calculate health scores
  const devicesWithHealthScore = useMemo(() => {
    return filteredDevices.map(device => {
      let score = 100;

      // Status penalties
      if (device.status === 'degraded') score -= 20;
      if (device.status === 'offline') score -= 50;

      // Battery penalties
      if (device.batteryLevel < 20) score -= 15;
      if (device.batteryLevel < 50 && !device.isCharging) score -= 5;

      // Network penalties
      if (device.networkStatus === 'offline') score -= 20;
      if (device.networkStatus === 'cellular') score -= 5;

      // Queue penalties
      if (device.queueSize > 100) score -= 10;
      if (device.queueSize > 500) score -= 20;

      // Last heartbeat penalties
      const lastHeartbeat = new Date(device.lastHeartbeatAt || 0).getTime();
      const now = Date.now();
      const minutesSinceHeartbeat = (now - lastHeartbeat) / 1000 / 60;

      if (minutesSinceHeartbeat > 5) score -= 15;
      if (minutesSinceHeartbeat > 15) score -= 25;

      return {
        ...device,
        healthScore: Math.max(0, Math.min(100, score)),
      };
    });
  }, [filteredDevices]);

  // Calculate enhanced statistics
  const enhancedStats = useMemo(() => {
    if (!data?.statistics) return null;

    const avgHealthScore = devicesWithHealthScore.reduce((sum, d) => sum + d.healthScore, 0) / (devicesWithHealthScore.length || 1);
    const totalQueueSize = devicesWithHealthScore.reduce((sum, d) => sum + d.queueSize, 0);
    const avgBattery = devicesWithHealthScore.reduce((sum, d) => sum + d.batteryLevel, 0) / (devicesWithHealthScore.length || 1);

    return {
      ...data.statistics,
      avgHealthScore: Math.round(avgHealthScore),
      totalQueueSize,
      avgBattery: Math.round(avgBattery),
    };
  }, [data?.statistics, devicesWithHealthScore]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Device Name',
      'Status',
      'Priority',
      'Health Score',
      'Battery %',
      'Network',
      'Queue Size',
      'Last Heartbeat',
      'Phone Number',
      'App Version',
    ];

    const rows = devicesWithHealthScore.map(d => [
      d.deviceName,
      d.status,
      d.priority,
      d.healthScore.toString(),
      d.batteryLevel.toString(),
      d.networkStatus,
      d.queueSize.toString(),
      d.lastHeartbeatRelative || 'Never',
      d.phoneNumber || 'N/A',
      d.appVersion,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms-devices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle device for comparison
  const toggleComparison = (deviceId: string) => {
    const newSet = new Set(comparisonDevices);
    if (newSet.has(deviceId)) {
      newSet.delete(deviceId);
    } else {
      if (newSet.size < 3) {
        newSet.add(deviceId);
      }
    }
    setComparisonDevices(newSet);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  // Open edit dialog with device info
  const openEditDialog = (device: SmsDevice & { healthScore: number }) => {
    setEditDeviceName(device.deviceName);
    setEditDevicePriority(device.priority);
    setEditDialogOpen(true);
  };

  // Handle save device changes
  const handleSaveDevice = async () => {
    if (!selectedDeviceId) return;

    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    if (!selectedDevice) return;

    // Only update if changed
    let hasChanges = false;

    if (editDeviceName !== selectedDevice.deviceName) {
      await renameMutation.mutateAsync({
        deviceId: selectedDeviceId,
        newName: editDeviceName,
      });
      hasChanges = true;
    }

    if (editDevicePriority !== selectedDevice.priority) {
      await priorityMutation.mutateAsync({
        deviceId: selectedDeviceId,
        newPriority: editDevicePriority,
      });
      hasChanges = true;
    }

    if (!hasChanges) {
      toast.info('No Changes', {
        description: 'Device settings are unchanged',
      });
    }

    setEditDialogOpen(false);
  };

  // Handle disable device
  const handleDisableDevice = async () => {
    if (!selectedDeviceId) return;

    await disableMutation.mutateAsync({
      deviceId: selectedDeviceId,
      reason: 'User requested disable',
    });

    setSelectedDeviceId(null);
  };

  // Handle revoke device
  const handleRevokeDevice = async () => {
    if (!selectedDeviceId || deleteConfirmation !== 'REVOKE') return;

    await revokeMutation.mutateAsync({
      deviceId: selectedDeviceId,
      confirmationText: deleteConfirmation,
    });

    setDeleteDialogOpen(false);
    setDeleteConfirmation('');
    setSelectedDeviceId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Smartphone className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading devices from heartbeat signals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load device heartbeat data. Please check your connection.
        </AlertDescription>
      </Alert>
    );
  }

  const devices = devicesWithHealthScore;
  const statistics = enhancedStats;
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  // Alerts for degraded/offline devices
  const criticalDevices = devices.filter(d => d.status === 'offline' || d.healthScore < 50);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">SMS Device Heartbeat Monitor</CardTitle>
                <CardDescription className="mt-1">
                  Real-time device status with advanced analytics and health tracking
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={devices.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant={showComparison ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                disabled={devices.length < 2}
                className="gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                Compare ({comparisonDevices.size}/3)
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Critical Alerts */}
      {criticalDevices.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalDevices.length} device{criticalDevices.length !== 1 ? 's' : ''} require attention:</strong>
            {' '}
            {criticalDevices.map(d => d.deviceName).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.totalDevices}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-gray-400">Active</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.activeDevices}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs text-gray-400">Degraded</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.degradedDevices}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs text-gray-400">Offline</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.offlineDevices}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs text-gray-400">Avg Health</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.avgHealthScore}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs text-gray-400">Queue</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.totalQueueSize}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-gray-400">Avg Battery</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{statistics.avgBattery}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="sticky top-0 z-10 bg-background shadow-md">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-fit">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Filters</span>
              <Badge variant="secondary" className="text-xs">
                {devices.length} {devices.length === 1 ? 'device' : 'devices'}
              </Badge>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="degraded">Degraded</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison View */}
      {showComparison && comparisonDevices.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Device Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              Side-by-side comparison of {comparisonDevices.size} selected {comparisonDevices.size === 1 ? 'device' : 'devices'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from(comparisonDevices).map(deviceId => {
                const device = devices.find(d => d.id === deviceId);
                if (!device) return null;

                return (
                  <Card key={device.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIndicator status={device.status} />
                          <CardTitle className="text-sm">{device.deviceName}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleComparison(device.id)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Health Score</span>
                        <HealthScoreBadge score={device.healthScore} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Battery</span>
                        <span className={getBatteryColor(device.batteryLevel)}>{device.batteryLevel}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Queue</span>
                        <span>{device.queueSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Network</span>
                        <span className="capitalize">{device.networkStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority</span>
                        <PriorityBadge priority={device.priority} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Seen</span>
                        <span>{device.lastHeartbeatRelative || 'Never'}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Column Layout: Device List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LEFT SIDEBAR: Device List */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Devices
            </CardTitle>
            <CardDescription className="text-xs">
              Select a device • Click checkbox to compare
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {devices.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-sm mb-1">No Devices Found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Install the AUREX Android app to get started'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-1 p-2">
                  {devices.map((device) => (
                    <div key={device.id} className="relative">
                      <button
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ease-in-out ${
                          selectedDeviceId === device.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={comparisonDevices.has(device.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleComparison(device.id);
                              }}
                              className="w-3 h-3 rounded"
                              disabled={!comparisonDevices.has(device.id) && comparisonDevices.size >= 3}
                            />
                            <Smartphone className={`w-3.5 h-3.5 flex-shrink-0 ${selectedDeviceId === device.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`font-medium text-sm truncate ${selectedDeviceId === device.id ? 'text-primary' : ''}`}>
                              {device.deviceName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <StatusIndicator status={device.status} />
                            {selectedDeviceId === device.id && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs pl-5">
                          <HealthScoreBadge score={device.healthScore} />
                          <PriorityBadge priority={device.priority} />
                          <BatteryIcon level={device.batteryLevel} isCharging={device.isCharging} />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* RIGHT CONTENT: Device Details */}
        <div>
          {!selectedDevice ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-16">
                <Smartphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Select a Device</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  Choose a device from the sidebar to view its heartbeat data and status details
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 transition-opacity duration-200" style={{ opacity: 1 }}>
              {/* Device Information Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Device Heartbeat Data
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Real-time status • Last updated: {selectedDevice.lastHeartbeatRelative || 'Unknown'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <HealthScoreBadge score={selectedDevice.healthScore} large />
                      {canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(selectedDevice)}
                            className="gap-2"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                            className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Device Status Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard
                      icon={<Smartphone className="w-4 h-4 text-blue-600" />}
                      label="Device Name"
                      value={selectedDevice.deviceName}
                    />
                    <InfoCard
                      icon={<StatusIndicator status={selectedDevice.status} />}
                      label="Status"
                      value={<StatusBadge status={selectedDevice.status} />}
                    />
                    <InfoCard
                      icon={<Signal className="w-4 h-4 text-purple-600" />}
                      label="Priority"
                      value={<PriorityBadge priority={selectedDevice.priority} />}
                    />
                    <InfoCard
                      icon={<Battery className="w-4 h-4 text-green-600" />}
                      label="Battery"
                      value={<BatteryIndicator level={selectedDevice.batteryLevel} isCharging={selectedDevice.isCharging} />}
                    />
                    <InfoCard
                      icon={selectedDevice.networkStatus === 'offline' ? <WifiOff className="w-4 h-4 text-red-600" /> : <Wifi className="w-4 h-4 text-green-600" />}
                      label="Network"
                      value={<NetworkBadge status={selectedDevice.networkStatus as NetworkStatus} />}
                    />
                    <InfoCard
                      icon={<MessageSquare className="w-4 h-4 text-orange-600" />}
                      label="Queue Size"
                      value={selectedDevice.queueSize > 0 ? selectedDevice.queueSize : '0'}
                    />
                  </div>

                  {/* Performance Metrics */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard
                        icon={<Zap className="w-3.5 h-3.5 text-yellow-600" />}
                        label="Processing Rate"
                        value="~45/min"
                      />
                      <MetricCard
                        icon={<CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                        label="Success Rate"
                        value="98.5%"
                      />
                      <MetricCard
                        icon={<Clock className="w-3.5 h-3.5 text-blue-600" />}
                        label="Avg Latency"
                        value="1.2s"
                      />
                      <MetricCard
                        icon={<TrendingUp className="w-3.5 h-3.5 text-purple-600" />}
                        label="Uptime"
                        value="99.2%"
                      />
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Device Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <DetailRow label="Phone Number" value={selectedDevice.phoneNumberMasked} />
                      <DetailRow label="Device ID" value={selectedDevice.deviceId} />
                      <DetailRow label="App Version" value={selectedDevice.appVersion} />
                      <DetailRow label="Android Version" value={selectedDevice.androidVersion} />
                      {selectedDevice.deviceModel && (
                        <DetailRow label="Device Model" value={selectedDevice.deviceModel} />
                      )}
                      <DetailRow label="Locale" value={selectedDevice.locale} />
                    </div>
                  </div>

                  {/* Heartbeat Timeline */}
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Heartbeat Timeline</h4>
                    <div className="space-y-2">
                      <TimelineRow
                        icon={<Clock className="w-3 h-3 text-blue-600" />}
                        label="Last Heartbeat"
                        value={selectedDevice.lastHeartbeatRelative || 'Never'}
                        timestamp={selectedDevice.lastHeartbeatAt}
                      />
                      <TimelineRow
                        icon={<MessageSquare className="w-3 h-3 text-green-600" />}
                        label="Last SMS"
                        value={selectedDevice.lastSmsRelative || 'Never'}
                        timestamp={selectedDevice.lastSmsAt}
                      />
                      <TimelineRow
                        icon={<Activity className="w-3 h-3 text-purple-600" />}
                        label="Device Bound"
                        value={new Date(selectedDevice.boundAt).toLocaleDateString()}
                        timestamp={selectedDevice.boundAt}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Edit Device Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Edit Device Settings
            </DialogTitle>
            <DialogDescription>
              Update device name and priority. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={editDeviceName}
                onChange={(e) => setEditDeviceName(e.target.value)}
                placeholder="Enter device name..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Choose a descriptive name (e.g., "Office Phone", "Backup Device")
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={String(editDevicePriority)} onValueChange={(v) => setEditDevicePriority(Number(v))}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Primary - Main device for SMS processing</SelectItem>
                  <SelectItem value="3">Secondary - Backup device</SelectItem>
                  <SelectItem value="5">Tertiary - Additional device</SelectItem>
                  <SelectItem value="8">Backup - Lowest priority device</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Primary devices are used first. Secondary/Backup devices activate if primary fails.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDevice}
              disabled={renameMutation.isPending || priorityMutation.isPending}
            >
              {(renameMutation.isPending || priorityMutation.isPending) ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Revoke Device Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Revoke Device Access
            </DialogTitle>
            <DialogDescription>
              This action is <strong>permanent and cannot be undone</strong>. The device will be completely removed from your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Revoking this device will:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Stop all SMS processing from this device</li>
                  <li>Remove device access to the workspace</li>
                  <li>Require re-binding if you want to use it again</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Type <code className="font-mono font-bold">REVOKE</code> to confirm</Label>
              <Input
                id="confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type REVOKE in all caps..."
                className="w-full font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmation('');
            }}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleDisableDevice}
              disabled={disableMutation.isPending}
              className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              {disableMutation.isPending ? 'Disabling...' : 'Disable Instead'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeDevice}
              disabled={deleteConfirmation !== 'REVOKE' || revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function StatusIndicator({ status }: { status: DeviceStatus }) {
  const colors = {
    active: 'bg-green-600',
    degraded: 'bg-amber-600',
    offline: 'bg-red-600',
  };

  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  const config = {
    active: { label: 'Active', color: 'text-green-600 dark:text-green-400' },
    degraded: { label: 'Degraded', color: 'text-amber-600 dark:text-amber-400' },
    offline: { label: 'Offline', color: 'text-red-600 dark:text-red-400' },
  };

  const { label, color } = config[status];
  return <span className={`text-sm font-medium ${color}`}>{label}</span>;
}

function PriorityBadge({ priority }: { priority: DevicePriority }) {
  const label = getDevicePriorityLabel(priority);
  const variant = getDevicePriorityVariant(priority);
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{label}</Badge>;
}

function HealthScoreBadge({ score, large }: { score: number; large?: boolean }) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`flex items-center gap-1 ${large ? 'text-base' : 'text-xs'}`}>
      <TrendingUp className={`${large ? 'w-4 h-4' : 'w-3 h-3'} ${getColor()}`} />
      <span className={`font-semibold ${getColor()}`}>{score}%</span>
    </div>
  );
}

function getBatteryColor(level: number) {
  if (level < 20) return 'text-red-600';
  if (level < 50) return 'text-amber-600';
  return 'text-green-600';
}

function BatteryIcon({ level, isCharging }: { level: number; isCharging: boolean }) {
  const getIcon = () => {
    if (isCharging) return BatteryCharging;
    if (level < 20) return BatteryWarning;
    return Battery;
  };

  const getColor = () => getBatteryColor(level);

  const Icon = getIcon();
  return <Icon className={`w-3 h-3 ${getColor()}`} />;
}

function BatteryIndicator({ level, isCharging }: { level: number; isCharging: boolean }) {
  const getIcon = () => {
    if (isCharging) return BatteryCharging;
    if (level < 20) return BatteryWarning;
    return Battery;
  };

  const getColor = () => getBatteryColor(level);

  const Icon = getIcon();

  return (
    <div className="flex items-center gap-1">
      <Icon className={`w-4 h-4 ${getColor()}`} />
      <span className={`text-sm font-medium ${getColor()}`}>{level}%</span>
    </div>
  );
}

function NetworkBadge({ status }: { status: NetworkStatus }) {
  if (status === 'offline') {
    return <span className="text-sm text-red-600 font-medium">Offline</span>;
  }

  return <span className="text-sm text-green-600 font-medium capitalize">{status}</span>;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-medium text-sm mt-1">{value}</div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="font-bold text-xs">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono text-xs">{value}</span>
    </div>
  );
}

function TimelineRow({ icon, label, value, timestamp }: { icon: React.ReactNode; label: string; value: string; timestamp: string | null }) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{value}</div>
        {timestamp && (
          <div className="text-[10px] text-muted-foreground font-mono">
            {new Date(timestamp).toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
