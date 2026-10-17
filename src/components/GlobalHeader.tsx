import { Bell, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { OfflineStatusIndicator } from '@/components/OfflineStatusIndicator';
import { AndroidSyncIndicator } from '@/components/AndroidSyncIndicator';
import { useAuth } from '@/contexts/auth-context';
import type { Workspace, WorkspaceMembership } from '@/hooks/use-workspace';
import type { SmsEvent } from '@/types/financial';
import { canApproveAccessRequests, getPendingAccessRequests } from '@/lib/access-permissions';

interface GlobalHeaderProps {
  workspace: Workspace | null;
  membership: WorkspaceMembership | null;
  smsEvents?: SmsEvent[];
  onAccessRequestsClick: () => void;
  currency?: string;
}

export function GlobalHeader({ workspace, membership, smsEvents = [], onAccessRequestsClick, currency }: GlobalHeaderProps) {
  const { user, signOut } = useAuth();

  // Check if user can approve access requests
  const hasApprovalAuthority = canApproveAccessRequests(membership);

  // Get pending request count if user has approval authority
  const pendingCount = hasApprovalAuthority && workspace
    ? getPendingAccessRequests(workspace.id).length
    : 0;

  const handleSignOut = async () => {
    await signOut();
    // Page will automatically redirect to auth screen via the auth context
  };

  return (
    <div className="bg-card border-b transition-all duration-150 ease-in-out">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left: App Logo + Workspace Name */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">
                AUREX
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Financial Intelligence Platform • AI-Powered Insights • Real-time Sync
              </p>
            </div>

            {/* Workspace Name (if attached) */}
            {workspace && (
              <div className="pl-4 border-l border-border">
                <div className="text-sm font-semibold">{workspace.name}</div>
                <div className="text-xs text-muted-foreground">@{workspace.username}</div>
              </div>
            )}
          </div>

          {/* Right: Access Requests Icon + Status Indicators + User Menu */}
          <div className="flex items-center gap-3">
            {/* Access Requests Icon - ONLY visible if user has approval authority */}
            {hasApprovalAuthority && (
              <Button
                variant="ghost"
                size="sm"
                className="relative transition-all duration-150 ease-in-out"
                onClick={onAccessRequestsClick}
              >
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )}

            <OfflineStatusIndicator />
            <ThemeToggle />
            <AndroidSyncIndicator smsEvents={smsEvents} />

            {/* User Account Menu - Always accessible for sign out */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="transition-all duration-150 ease-in-out">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Account</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
