import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Search, Phone, Eye, AlertCircle, CheckCircle, XCircle, Loader2, Info, Shield, Brain, TrendingUp, RefreshCw, Clock, AlertTriangle, Check, Smartphone, Filter, Calendar, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchSmsByPhoneNumber, useSemiAccounts, type SmsMessage } from '@/hooks/use-sms-queries';
import { SmsDevicesPage } from '@/components/SmsDevicesPage';
import { useWorkspace } from '@/hooks/use-workspace';

export function SmsLogTab() {
  const workspaceState = useWorkspace();
  const [subTab, setSubTab] = useState<'logs' | 'devices'>('logs');

  // Check device management permissions
  const hasDeviceView = workspaceState.membership?.role === 'owner' || workspaceState.membership?.customPermissions?.canManageUsers;
  const hasDeviceAdmin = workspaceState.membership?.role === 'owner';

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  SMS Management
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md p-4" side="bottom">
                        <div className="space-y-2">
                          <p className="font-semibold">Enterprise SMS System:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>View and manage SMS messages</li>
                            <li>Monitor device health and heartbeats</li>
                            <li>E2EE encrypted message collection</li>
                            <li>AI-powered transaction detection</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription className="mt-1">
                  Messages and device monitoring across all registered devices
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sub-Tabs: Logs and Device Monitor */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'logs' | 'devices')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Device Monitor
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab Content */}
        <TabsContent value="logs" className="mt-4">
          <SmsLogsView />
        </TabsContent>

        {/* Device Monitor Tab Content */}
        <TabsContent value="devices" className="mt-4">
          {!hasDeviceView ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-16">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  You don't have permission to view device monitoring. Contact your workspace owner for access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <SmsDevicesPage
              workspaceId={workspaceState.workspace?.id || ''}
              canManage={hasDeviceAdmin}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// SMS LOGS VIEW COMPONENT
// ============================================================================

function SmsLogsView() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedSms, setSelectedSms] = useState<SmsMessage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');

  // State preservation: Store scroll position for each account
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Content transition state for smooth animations
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  // Query hooks
  const { data: semiAccounts = [], isLoading: loadingSemiAccounts } = useSemiAccounts();

  // Get the phone number for the selected account
  const selectedAccount = semiAccounts.find(acc => acc.id === selectedAccountId);
  const phoneNumber = selectedAccount?.phoneNumber || null;

  const {
    data: searchResult,
    isLoading: searchLoading,
    error: searchError,
  } = useSearchSmsByPhoneNumber(phoneNumber);

  // Filter messages based on search and filters
  const filteredMessages = useMemo(() => {
    if (!searchResult?.messages) return [];

    let messages = searchResult.messages;

    // Search filter
    if (searchQuery) {
      messages = messages.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      messages = messages.filter(msg => msg.syncMetadata.status === statusFilter);
    }

    // Classification filter
    if (classificationFilter !== 'all') {
      messages = messages.filter(msg => msg.classification === classificationFilter);
    }

    return messages;
  }, [searchResult, searchQuery, statusFilter, classificationFilter]);

  // Calculate statistics for selected account
  const accountStats = useMemo(() => {
    if (!searchResult?.messages) return null;

    const total = searchResult.messages.length;
    const synced = searchResult.messages.filter(m => m.syncMetadata.status === 'synced').length;
    const failed = searchResult.messages.filter(m => m.syncMetadata.status === 'failed').length;
    const encrypted = searchResult.messages.filter(m => m.isEncrypted).length;
    const highConfidence = searchResult.messages.filter(m => m.extractedData && m.extractedData.confidence >= 0.95).length;

    return { total, synced, failed, encrypted, highConfidence };
  }, [searchResult]);

  // Save scroll position before account change with smooth transition
  const handleAccountSelect = (accountId: string) => {
    if (accountId === selectedAccountId) return;

    if (selectedAccountId && messagesContainerRef.current) {
      const scrollableElement = messagesContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableElement) {
        scrollPositions.current.set(selectedAccountId, scrollableElement.scrollTop);
      }
    }

    setIsTransitioning(true);
    setContentVisible(false);
    setSearchQuery('');
    setStatusFilter('all');
    setClassificationFilter('all');

    setTimeout(() => {
      setSelectedAccountId(accountId);
    }, 150);
  };

  // Restore scroll position and fade in content after account change
  useEffect(() => {
    if (selectedAccountId && !searchLoading && searchResult?.messages) {
      const savedPosition = scrollPositions.current.get(selectedAccountId) || 0;

      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const scrollableElement = messagesContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollableElement) {
            scrollableElement.scrollTop = savedPosition;
          }
        }

        setTimeout(() => {
          setContentVisible(true);
          setIsTransitioning(false);
        }, 50);
      });
    }
  }, [selectedAccountId, searchLoading, searchResult]);

  const handleSmsClick = (sms: SmsMessage) => {
    setSelectedSms(sms);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSms(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setClassificationFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LEFT SIDEBAR: Device List */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Devices
            </CardTitle>
            <CardDescription className="text-xs">
              Select a device to view messages
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSemiAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : semiAccounts.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-1 p-2">
                  {semiAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ease-in-out ${
                        selectedAccountId === account.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Phone className={`w-3.5 h-3.5 ${selectedAccountId === account.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`font-medium text-sm ${selectedAccountId === account.id ? 'text-primary' : ''}`}>
                            {account.name}
                          </span>
                        </div>
                        {selectedAccountId === account.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      {account.phoneNumber ? (
                        <p className="text-xs font-mono text-muted-foreground pl-5">
                          {account.phoneNumber}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground pl-5">
                          No phone number
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 px-4">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-sm mb-1">No Devices Found</p>
                <p className="text-xs text-muted-foreground">
                  Register devices in Settings
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT CONTENT: Messages Display */}
        <div className="space-y-4">
          {!selectedAccountId ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-16">
                <Smartphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Select a Device</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  Choose a device from the sidebar to view its SMS messages and sync status
                </p>
              </CardContent>
            </Card>
          ) : searchLoading ? (
            <Card>
              <CardContent className="text-center py-16">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading messages...</p>
              </CardContent>
            </Card>
          ) : searchError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading messages. Please try again.
              </AlertDescription>
            </Alert>
          ) : !searchResult ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No data available</AlertDescription>
            </Alert>
          ) : !searchResult.exists ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>No data found</strong>
                <br />
                This device has no registered phone number.
              </AlertDescription>
            </Alert>
          ) : !searchResult.hasAccess ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Access denied</strong>
                <br />
                You don't have permission to view this device's messages.
              </AlertDescription>
            </Alert>
          ) : (
            <div
              className="space-y-4 transition-opacity duration-200 ease-in-out"
              style={{ opacity: contentVisible ? 1 : 0 }}
            >
              {/* Device Summary Stats */}
              {accountStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Total</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{accountStats.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-muted-foreground">Synced</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{accountStats.synced}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs text-muted-foreground">Failed</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{accountStats.failed}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-muted-foreground">Encrypted</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{accountStats.encrypted}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50 dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs text-muted-foreground">High Conf</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{accountStats.highConfidence}</div>
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
                        {filteredMessages.length} of {searchResult.messages.length}
                      </Badge>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search messages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Sync Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="synced">Synced</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="retrying">Retrying</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="transaction">Transaction</SelectItem>
                          <SelectItem value="otp">OTP</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(searchQuery || statusFilter !== 'all' || classificationFilter !== 'all') && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
                        Clear
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Messages Table */}
              {filteredMessages.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Messages</CardTitle>
                    <CardDescription className="text-xs">
                      {selectedAccount?.name} • {phoneNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]" ref={messagesContainerRef}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                          <TableRow>
                            <TableHead className="w-[130px]">Date</TableHead>
                            <TableHead className="w-[100px]">Sender</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[80px]">Conf</TableHead>
                            <TableHead className="w-[90px]">Sync</TableHead>
                            <TableHead className="w-[70px] text-center">View</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMessages.map((sms) => (
                            <TableRow
                              key={sms.id}
                              className="cursor-pointer hover:bg-muted/50 transition-all duration-150 ease-in-out"
                              onClick={() => handleSmsClick(sms)}
                            >
                              <TableCell className="text-xs font-medium whitespace-nowrap">
                                {new Date(sms.receivedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-semibold">
                                {sms.sender}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {sms.content}
                                </div>
                              </TableCell>
                              <TableCell>
                                {sms.classification ? (
                                  <Badge
                                    variant={
                                      sms.classification === 'rejected' || sms.classification === 'ambiguous'
                                        ? 'destructive'
                                        : 'default'
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {sms.classification.replace(/_/g, ' ')}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {sms.extractedData?.confidence ? (
                                  <span className={`text-xs font-semibold ${
                                    sms.extractedData.confidence >= 0.95 ? 'text-green-600' :
                                    sms.extractedData.confidence >= 0.85 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {(sms.extractedData.confidence * 100).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      {sms.syncMetadata.status === 'synced' && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 dark:bg-green-950/20 border-green-200">
                                          <Check className="w-2.5 h-2.5 text-green-600" />
                                        </Badge>
                                      )}
                                      {sms.syncMetadata.status === 'pending' && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                                          <Clock className="w-2.5 h-2.5 text-blue-600" />
                                        </Badge>
                                      )}
                                      {sms.syncMetadata.status === 'retrying' && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                                          <RefreshCw className="w-2.5 h-2.5 text-yellow-600" />
                                        </Badge>
                                      )}
                                      {sms.syncMetadata.status === 'failed' && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          <XCircle className="w-2.5 h-2.5" />
                                        </Badge>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                      {sms.syncMetadata.status}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSmsClick(sms);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="font-medium mb-1">No Messages Found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' || classificationFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'This device has no messages yet'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[1800px] h-[95vh] p-0 flex flex-col">
          <div className="p-6 flex-shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <MessageSquare className="w-6 h-6 text-primary" />
                Message Details
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Complete message information and AI analysis
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedSms && (
            <div className="flex-1 overflow-hidden px-6 py-4">
              <div className="h-full grid grid-cols-2 gap-6">
                <div className="h-full overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      {/* Message Info */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Message Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Received At</p>
                            <p className="font-medium">
                              {new Date(selectedSms.receivedAt).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Sender</p>
                            <p className="font-mono font-semibold">{selectedSms.sender}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                            <p className="font-mono text-sm">{selectedSms.phoneNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Security</p>
                            {selectedSms.isEncrypted ? (
                              <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30">
                                <Shield className="w-3 h-3 mr-1 text-green-600" />
                                E2EE
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Unsecure</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* AI Processing */}
                      {selectedSms.classification && selectedSms.extractedData && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              AI Processing
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Classification</p>
                                <Badge>{selectedSms.classification.replace(/_/g, ' ')}</Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                                <p className="font-semibold">
                                  {(selectedSms.extractedData.confidence * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            {selectedSms.extractedData.amount && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                                <p className="font-semibold text-blue-600">
                                  {selectedSms.extractedData.currency} {selectedSms.extractedData.amount.toFixed(2)}
                                </p>
                              </div>
                            )}
                            {selectedSms.extractedData.merchant && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Merchant</p>
                                <p>{selectedSms.extractedData.merchant}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Sync Status */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Sync Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Status</p>
                              <Badge variant={selectedSms.syncMetadata.status === 'synced' ? 'default' : 'secondary'}>
                                {selectedSms.syncMetadata.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Retry Count</p>
                              <p>{selectedSms.syncMetadata.retryCount}</p>
                            </div>
                          </div>
                          {selectedSms.syncMetadata.syncedAt && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Last Synced</p>
                              <p className="text-xs">
                                {new Date(selectedSms.syncMetadata.syncedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>

                <div className="h-full overflow-hidden">
                  <ScrollArea className="h-full">
                    <Card className="mr-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Complete Message</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedSms.content.length} characters
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {selectedSms.content}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 p-6 border-t flex-shrink-0">
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
