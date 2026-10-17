import { useState } from 'react';
import type { SmsEvent } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/financial-data';
import { MessageSquare, Search, Filter, Phone, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PhoneSection } from '@/components/SmsPhoneConfig';
import { SmsPhoneConfig } from '@/components/SmsPhoneConfig';
import { Button } from '@/components/ui/button';

interface SmsEventLoggerProps {
  events: SmsEvent[];
}

// Default phone sections configuration
const DEFAULT_PHONE_SECTIONS: PhoneSection[] = [
  { index: 1, phoneNumber: '+12025551234', label: 'Phone 1', isConfigured: true },
  { index: 2, phoneNumber: '+12025555678', label: 'Phone 2', isConfigured: true },
  { index: 3, phoneNumber: '+12025559012', label: 'Phone 3', isConfigured: false },
  { index: 4, phoneNumber: '+12025553456', label: 'Phone 4', isConfigured: false },
];

export function SmsEventLogger({ events }: SmsEventLoggerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSms, setSelectedSms] = useState<SmsEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phoneSections, setPhoneSections] = useState<PhoneSection[]>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('sms-phone-sections');
    return saved ? JSON.parse(saved) : DEFAULT_PHONE_SECTIONS;
  });

  const handleSavePhoneSections = (updatedSections: PhoneSection[]) => {
    setPhoneSections(updatedSections);
    localStorage.setItem('sms-phone-sections', JSON.stringify(updatedSections));
  };

  const handleSmsClick = (event: SmsEvent) => {
    setSelectedSms(event);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSms(null);
  };

  // Group events by receiving phone number
  const eventsByPhone = phoneSections.reduce((acc, section) => {
    acc[section.phoneNumber] = events.filter(
      event => event.receivingPhoneNumber === section.phoneNumber
    );
    return acc;
  }, {} as Record<string, SmsEvent[]>);

  const renderEventsTable = (sectionEvents: SmsEvent[], phoneLabel: string) => {
    const filteredEvents = sectionEvents.filter((event) => {
      const matchesSearch =
        searchTerm === '' ||
        event.smsContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.senderNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
      const matchesStatus = statusFilter === 'all' || event.processingStatus === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });

    const getEventTypeBadge = (type: SmsEvent['eventType']) => {
      const config = {
        payment_confirmation: {
          label: 'Payment',
          className: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        },
        due_date_alert: { label: 'Due Date', className: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
        limit_update: { label: 'Limit Update', className: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
        other: { label: 'Other', className: 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
      };
      const { label, className } = config[type];
      return (
        <Badge variant="outline" className={className}>
          {label}
        </Badge>
      );
    };

    const getStatusBadge = (status: SmsEvent['processingStatus']) => {
      const config = {
        processed: { label: 'Processed', className: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
        pending: { label: 'Pending', className: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
        failed: { label: 'Failed', className: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
      };
      const { label, className } = config[status];
      return (
        <Badge variant="outline" className={className}>
          {label}
        </Badge>
      );
    };

    return (
      <div className="space-y-4">
        {/* Section Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Total Messages: {filteredEvents.length} / {sectionEvents.length}</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Processed: {sectionEvents.filter((e) => e.processingStatus === 'processed').length}</span>
              <span>Pending: {sectionEvents.filter((e) => e.processingStatus === 'pending').length}</span>
              <span>Failed: {sectionEvents.filter((e) => e.processingStatus === 'failed').length}</span>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                <TableRow>
                  <TableHead className="dark:text-gray-200">Timestamp</TableHead>
                  <TableHead className="dark:text-gray-200">Sender</TableHead>
                  <TableHead className="dark:text-gray-200">Event Type</TableHead>
                  <TableHead className="dark:text-gray-200">SMS Content</TableHead>
                  <TableHead className="dark:text-gray-200">Parsed Data</TableHead>
                  <TableHead className="dark:text-gray-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSmsClick(event)}
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{event.senderNumber}</TableCell>
                      <TableCell>{getEventTypeBadge(event.eventType)}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{event.smsContent}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {event.parsedData.paymentAmount && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                              <span className="font-semibold">
                                {formatCurrency(event.parsedData.paymentAmount)}
                              </span>
                            </div>
                          )}
                          {event.parsedData.dueDate && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Due: </span>
                              <span className="font-semibold">
                                {formatDate(event.parsedData.dueDate)}
                              </span>
                            </div>
                          )}
                          {event.parsedData.creditLimit && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Limit: </span>
                              <span className="font-semibold">
                                {formatCurrency(event.parsedData.creditLimit)}
                              </span>
                            </div>
                          )}
                          {event.parsedData.availableBalance && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Available: </span>
                              <span className="font-semibold">
                                {formatCurrency(event.parsedData.availableBalance)}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(event.processingStatus)}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSmsClick(event);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No SMS messages found for {phoneLabel}.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              SMS Event Log
            </CardTitle>
            <CardDescription>
              Banking SMS messages organized by phone number
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {phoneSections.filter(s => s.isConfigured).length} / 4 Phones Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Global Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search SMS content or sender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment_confirmation">Payment</SelectItem>
                <SelectItem value="due_date_alert">Due Date</SelectItem>
                <SelectItem value="limit_update">Limit Update</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Phone Number Tabs */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Configure
            </TabsTrigger>
            {phoneSections.map((section) => (
              <TabsTrigger
                key={section.index}
                value={`phone-${section.index}`}
                className="flex items-center gap-2"
                disabled={!section.isConfigured}
              >
                <MessageSquare className="w-4 h-4" />
                {section.label}
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {eventsByPhone[section.phoneNumber]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="config" className="mt-0">
            <SmsPhoneConfig
              phoneSections={phoneSections}
              onSave={handleSavePhoneSections}
            />
          </TabsContent>

          {phoneSections.map((section) => (
            <TabsContent key={section.index} value={`phone-${section.index}`} className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {section.label}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {section.phoneNumber}
                    </p>
                  </div>
                  <Badge variant={section.isConfigured ? 'default' : 'secondary'}>
                    {section.isConfigured ? 'Active' : 'Not Configured'}
                  </Badge>
                </div>

                {renderEventsTable(eventsByPhone[section.phoneNumber] || [], section.label)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Full SMS Content Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              SMS Message Details
            </DialogTitle>
            <DialogDescription>
              Complete SMS message with all parsed information
            </DialogDescription>
          </DialogHeader>

          {selectedSms && (
            <div className="space-y-6 mt-4">
              {/* Message Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedSms.timestamp).toLocaleString('en-US', {
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
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sender Number</p>
                  <p className="text-sm font-mono font-medium">{selectedSms.senderNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Receiving Phone</p>
                  <p className="text-sm font-mono font-medium">{selectedSms.receivingPhoneNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Event Type</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = {
                        payment_confirmation: {
                          label: 'Payment',
                          className: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
                        },
                        due_date_alert: { label: 'Due Date', className: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
                        limit_update: { label: 'Limit Update', className: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                        other: { label: 'Other', className: 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
                      };
                      const { label, className } = config[selectedSms.eventType];
                      return (
                        <Badge variant="outline" className={className}>
                          {label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Processing Status</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = {
                        processed: { label: 'Processed', className: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
                        pending: { label: 'Pending', className: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
                        failed: { label: 'Failed', className: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
                      };
                      const { label, className } = config[selectedSms.processingStatus];
                      return (
                        <Badge variant="outline" className={className}>
                          {label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Full SMS Content */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Complete SMS Message
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedSms.smsContent}
                  </p>
                </div>
              </div>

              {/* Parsed Data */}
              {(selectedSms.parsedData.paymentAmount ||
                selectedSms.parsedData.dueDate ||
                selectedSms.parsedData.creditLimit ||
                selectedSms.parsedData.availableBalance) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">AI-Extracted Information</h3>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    {selectedSms.parsedData.paymentAmount && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Payment Amount</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedSms.parsedData.paymentAmount)}
                        </p>
                      </div>
                    )}
                    {selectedSms.parsedData.dueDate && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {formatDate(selectedSms.parsedData.dueDate)}
                        </p>
                      </div>
                    )}
                    {selectedSms.parsedData.creditLimit && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Credit Limit</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(selectedSms.parsedData.creditLimit)}
                        </p>
                      </div>
                    )}
                    {selectedSms.parsedData.availableBalance && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Available Balance</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(selectedSms.parsedData.availableBalance)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {selectedSms.relatedCardId && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Related Information</h3>
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Related Card ID</p>
                      <p className="text-sm font-mono">{selectedSms.relatedCardId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
