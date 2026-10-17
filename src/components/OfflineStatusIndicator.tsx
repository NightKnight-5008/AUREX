/**
 * Offline Status Indicator
 *
 * Shows when app is offline or hasn't verified in a while
 * "Offline — last verified X days ago"
 * Does NOT block workflows - just informational
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function OfflineStatusIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="flex items-center gap-1.5 cursor-help">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            Some features may be limited while offline.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
