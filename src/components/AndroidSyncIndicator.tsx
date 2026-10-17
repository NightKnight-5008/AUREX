import { useAndroidSync, formatTimeSince } from '@/hooks/use-android-sync';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AndroidSyncIndicatorProps {
  smsEvents: Array<{ timestamp: Date }>;
}

export function AndroidSyncIndicator({ smsEvents }: AndroidSyncIndicatorProps) {
  const syncStatus = useAndroidSync(smsEvents);

  if (!syncStatus.isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
              <WifiOff className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Android Not Connected</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Android App Status</p>
              <p className="text-xs">Status: Disconnected</p>
              <p className="text-xs">
                Last Sync: {syncStatus.lastSyncTime ? formatTimeSince(syncStatus.lastSyncTime) : 'Never'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Install the Android app to sync SMS messages
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-sm cursor-help">
            <div className="relative">
              <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
              <Wifi className="w-3 h-3 text-green-600 dark:text-green-400 absolute -top-1 -right-1" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-green-700 dark:text-green-300">
                Android Synced
              </span>
            </div>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
              {syncStatus.messagesSynced} SMS
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Android App Connected</p>
            <p className="text-xs">Device: {syncStatus.deviceName}</p>
            <p className="text-xs">Last Sync: {formatTimeSince(syncStatus.lastSyncTime)}</p>
            <p className="text-xs">Messages Synced: {syncStatus.messagesSynced}</p>
            <p className="text-xs">Phone Numbers: {syncStatus.phoneCount}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              ✓ Real-time sync active
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
