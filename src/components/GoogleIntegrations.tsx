import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  CheckSquare,
  FileText,
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  Settings,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Shield,
  Lock,
  Eye,
  Trash2,
} from 'lucide-react';
import type { CompanyCard, FinancialTransaction, Employee, FinancialMetrics } from '@/types/financial';
import type { PaymentReminder, GeneratedReport, GoogleIntegrationSettings } from '@/types/google-integrations';
import {
  generateCardPaymentReminders,
  formatAsCalendarEvent,
  formatAsTask,
} from '@/lib/google-payment-reminders';
import {
  generateCardPaymentReportData,
  formatCardPaymentReport,
  generatePayrollReportData,
  formatPayrollReport,
  generateTaxReportData,
  formatTaxReport,
  generateExpenseReportData,
  formatExpenseReport,
  formatProfitLossReport,
} from '@/lib/google-report-generator';
import { useCreateCalendarEvent, useListCalendarEvents, useUpdateCalendarEvent } from '@/hooks/use-google-calendar';
import { useCreateTask, useListTasks } from '@/hooks/use-google-tasks';
import { useCreateGoogleDoc, useBatchUpdateGoogleDoc } from '@/hooks/use-google-docs';
import { formatCurrencyWithLocale } from '@/lib/country-config';
import { GoogleConnectionOnboarding } from '@/components/GoogleConnectionOnboarding';

interface GoogleIntegrationsProps {
  cards: CompanyCard[];
  transactions: FinancialTransaction[];
  employees: Employee[];
  metrics: FinancialMetrics[];
  countryCode?: string;
  locale?: string;
}

export function GoogleIntegrations({
  cards,
  transactions,
  employees,
  metrics,
  countryCode = 'EG',
  locale,
}: GoogleIntegrationsProps) {
  const [settings, setSettings] = useState<GoogleIntegrationSettings>({
    calendarEnabled: false,
    tasksEnabled: false,
    docsEnabled: false,
    autoCreateReminders: false,
    reminderDaysBeforeDue: [1, 3, 7],
    escalateOverdue: true,
    autoGenerateReports: false,
    reportSchedule: 'monthly',
    reportTypes: ['card_payments', 'payroll', 'profit_loss'],
  });

  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [servicesConnected, setServicesConnected] = useState({
    tasksConnected: false,
    calendarConnected: false,
    docsConnected: false,
  });

  // Check for existing tokens on mount
  useEffect(() => {
    const tasksToken = localStorage.getItem('google_tasks_token');
    const calendarToken = localStorage.getItem('google_calendar_token');
    const docsToken = localStorage.getItem('google_docs_token');

    const connected = {
      tasksConnected: !!tasksToken,
      calendarConnected: !!calendarToken,
      docsConnected: !!docsToken,
    };

    setServicesConnected(connected);
    setIsAuthenticated(connected.tasksConnected || connected.calendarConnected || connected.docsConnected);

    // Update settings based on connected services
    if (connected.tasksConnected || connected.calendarConnected || connected.docsConnected) {
      setSettings(prev => ({
        ...prev,
        tasksEnabled: connected.tasksConnected,
        calendarEnabled: connected.calendarConnected,
        docsEnabled: connected.docsConnected,
      }));
    }
  }, []);

  // Handle OAuth connection completion
  const handleConnectionComplete = (services: {
    tasksConnected: boolean;
    calendarConnected: boolean;
    docsConnected: boolean;
  }) => {
    setServicesConnected(services);
    setIsAuthenticated(services.tasksConnected || services.calendarConnected || services.docsConnected);

    // Update settings to enable connected services
    setSettings(prev => ({
      ...prev,
      tasksEnabled: services.tasksConnected,
      calendarEnabled: services.calendarConnected,
      docsEnabled: services.docsConnected,
    }));
  };

  // Google API hooks
  const createCalendarEvent = useCreateCalendarEvent();
  const listCalendarEvents = useListCalendarEvents();
  const createTask = useCreateTask();
  const listTasks = useListTasks();
  const createDoc = useCreateGoogleDoc();
  const updateDoc = useBatchUpdateGoogleDoc();

  // Generate payment reminders
  const reminders = useMemo(() => {
    return generateCardPaymentReminders(cards, countryCode, locale);
  }, [cards, countryCode, locale]);

  // Group reminders by priority
  const remindersByPriority = useMemo(() => {
    return {
      critical: reminders.filter(r => r.priority === 'critical'),
      high: reminders.filter(r => r.priority === 'high'),
      medium: reminders.filter(r => r.priority === 'medium'),
      low: reminders.filter(r => r.priority === 'low'),
    };
  }, [reminders]);

  // Sync reminders to Google Calendar & Tasks
  const handleSyncReminders = async () => {
    if (!settings.calendarEnabled && !settings.tasksEnabled) {
      alert('Please enable Google Calendar or Tasks first');
      return;
    }

    setSyncing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const reminder of reminders) {
        try {
          // Create calendar event if enabled
          if (settings.calendarEnabled) {
            const eventData = formatAsCalendarEvent(reminder);
            await createCalendarEvent.mutateAsync({
              calendarId: 'primary',
              ...eventData,
            });
            successCount++;
          }

          // Create task if enabled
          if (settings.tasksEnabled) {
            const taskData = formatAsTask(reminder);
            await createTask.mutateAsync(taskData);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to sync reminder ${reminder.id}:`, error);
          errorCount++;
        }
      }

      setLastSync(new Date());
      alert(`Sync complete!\n${successCount} reminders synced\n${errorCount} errors`);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please check your Google credentials.');
    } finally {
      setSyncing(false);
    }
  };

  // Generate and export report
  const handleGenerateReport = async (reportType: string) => {
    if (!settings.docsEnabled) {
      alert('Please enable Google Docs first');
      return;
    }

    setSyncing(true);
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      let reportTitle = '';
      let reportContent = '';

      switch (reportType) {
        case 'card_payments': {
          const data = generateCardPaymentReportData(cards, firstDayOfMonth, lastDayOfMonth, countryCode);
          reportTitle = `Card Payment Report - ${today.toLocaleDateString('en-EG', { month: 'long', year: 'numeric' })}`;
          reportContent = formatCardPaymentReport(data, countryCode, locale);
          break;
        }
        case 'payroll': {
          const data = generatePayrollReportData(employees, transactions, firstDayOfMonth, lastDayOfMonth, countryCode);
          reportTitle = `Payroll Report - ${today.toLocaleDateString('en-EG', { month: 'long', year: 'numeric' })}`;
          reportContent = formatPayrollReport(data, countryCode, locale);
          break;
        }
        case 'tax': {
          const data = generateTaxReportData(transactions, firstDayOfMonth, lastDayOfMonth, countryCode);
          reportTitle = `Tax Report - ${today.toLocaleDateString('en-EG', { month: 'long', year: 'numeric' })}`;
          reportContent = formatTaxReport(data, countryCode, locale);
          break;
        }
        case 'expenses': {
          const data = generateExpenseReportData(transactions, cards, firstDayOfMonth, lastDayOfMonth, countryCode);
          reportTitle = `Expense Report - ${today.toLocaleDateString('en-EG', { month: 'long', year: 'numeric' })}`;
          reportContent = formatExpenseReport(data, countryCode, locale);
          break;
        }
        case 'profit_loss': {
          reportTitle = `Profit & Loss Statement - ${today.getFullYear()}`;
          reportContent = formatProfitLossReport(metrics, countryCode, locale);
          break;
        }
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Create Google Doc
      const doc = await createDoc.mutateAsync({
        title: reportTitle,
      });

      // Insert content into doc
      await updateDoc.mutateAsync({
        documentId: doc.documentId,
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: reportContent,
            },
          },
        ],
      });

      alert(`Report generated successfully!\nTitle: ${reportTitle}\nDocument ID: ${doc.documentId}`);
      window.open(`https://docs.google.com/document/d/${doc.documentId}/edit`, '_blank');
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please check your Google credentials.');
    } finally {
      setSyncing(false);
    }
  };

  // Show authentication screen if not connected to any service
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Google Integrations</h2>
            <p className="text-muted-foreground">
              Professional financial operations automation with Google Calendar, Tasks, and Docs
            </p>
          </div>
        </div>
        <GoogleConnectionOnboarding onConnectionComplete={handleConnectionComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Google Integrations</h2>
          <p className="text-muted-foreground">
            Professional financial operations automation with Google Calendar, Tasks, and Docs
          </p>
        </div>
        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Last sync: {lastSync.toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payment Reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reminders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {remindersByPriority.critical.length} critical, {remindersByPriority.high.length} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue Payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reminders.filter(r => r.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount Due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithLocale(
                reminders.reduce((sum, r) => sum + r.amount, 0),
                countryCode,
                locale
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all reminders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Integration Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {settings.calendarEnabled && <Badge variant="outline" className="text-xs">Calendar</Badge>}
              {settings.tasksEnabled && <Badge variant="outline" className="text-xs">Tasks</Badge>}
              {settings.docsEnabled && <Badge variant="outline" className="text-xs">Docs</Badge>}
              {!settings.calendarEnabled && !settings.tasksEnabled && !settings.docsEnabled && (
                <span className="text-sm text-muted-foreground">Not configured</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reminders">
            <Calendar className="w-4 h-4 mr-2" />
            Payment Reminders
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Payment Reminders Tab */}
        <TabsContent value="reminders" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Reminders</CardTitle>
                  <CardDescription>
                    Automatically sync payment obligations to Google Calendar and Tasks
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSyncReminders}
                  disabled={syncing || (!settings.calendarEnabled && !settings.tasksEnabled)}
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Reminders
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {/* Critical Reminders */}
                  {remindersByPriority.critical.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Critical - Immediate Action Required ({remindersByPriority.critical.length})
                      </h3>
                      <div className="space-y-2">
                        {remindersByPriority.critical.map(reminder => (
                          <ReminderCard key={reminder.id} reminder={reminder} countryCode={countryCode} locale={locale} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High Priority Reminders */}
                  {remindersByPriority.high.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        High Priority ({remindersByPriority.high.length})
                      </h3>
                      <div className="space-y-2">
                        {remindersByPriority.high.map(reminder => (
                          <ReminderCard key={reminder.id} reminder={reminder} countryCode={countryCode} locale={locale} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium Priority Reminders */}
                  {remindersByPriority.medium.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        Medium Priority ({remindersByPriority.medium.length})
                      </h3>
                      <div className="space-y-2">
                        {remindersByPriority.medium.slice(0, 10).map(reminder => (
                          <ReminderCard key={reminder.id} reminder={reminder} countryCode={countryCode} locale={locale} />
                        ))}
                        {remindersByPriority.medium.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center">
                            ... and {remindersByPriority.medium.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate professional, audit-quality reports in Google Docs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportCard
                  title="Card Payments Report"
                  description="All card payments made, missed, and overdue with timelines"
                  icon={<Calendar className="w-5 h-5" />}
                  onGenerate={() => handleGenerateReport('card_payments')}
                  disabled={!settings.docsEnabled || syncing}
                />
                <ReportCard
                  title="Payroll Report"
                  description="Payroll payments per employee, dates paid vs missed"
                  icon={<CheckSquare className="w-5 h-5" />}
                  onGenerate={() => handleGenerateReport('payroll')}
                  disabled={!settings.docsEnabled || syncing}
                />
                <ReportCard
                  title="Tax Report"
                  description="Tax obligations, payments, and compliance summary"
                  icon={<FileText className="w-5 h-5" />}
                  onGenerate={() => handleGenerateReport('tax')}
                  disabled={!settings.docsEnabled || syncing}
                />
                <ReportCard
                  title="Expense Report"
                  description="Categorized expenses, card-based tracking, date breakdowns"
                  icon={<TrendingUp className="w-5 h-5" />}
                  onGenerate={() => handleGenerateReport('expenses')}
                  disabled={!settings.docsEnabled || syncing}
                />
                <ReportCard
                  title="Profit & Loss Statement"
                  description="Revenue vs expenses, profit margins, net profit trends"
                  icon={<FileText className="w-5 h-5" />}
                  onGenerate={() => handleGenerateReport('profit_loss')}
                  disabled={!settings.docsEnabled || syncing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure Google Calendar, Tasks, and Docs integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Services */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Enabled Services</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="calendar-enabled">Google Calendar</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync payment reminders to your calendar
                    </p>
                  </div>
                  <Switch
                    id="calendar-enabled"
                    checked={settings.calendarEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, calendarEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tasks-enabled">Google Tasks</Label>
                    <p className="text-sm text-muted-foreground">
                      Create actionable payment tasks
                    </p>
                  </div>
                  <Switch
                    id="tasks-enabled"
                    checked={settings.tasksEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, tasksEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="docs-enabled">Google Docs</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate professional financial reports
                    </p>
                  </div>
                  <Switch
                    id="docs-enabled"
                    checked={settings.docsEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, docsEnabled: checked })
                    }
                  />
                </div>
              </div>

              {/* Auto-Create Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Automation</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-reminders">Auto-Create Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync new payment obligations
                    </p>
                  </div>
                  <Switch
                    id="auto-reminders"
                    checked={settings.autoCreateReminders}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoCreateReminders: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="escalate-overdue">Escalate Overdue</Label>
                    <p className="text-sm text-muted-foreground">
                      Create high-priority tasks for overdue payments
                    </p>
                  </div>
                  <Switch
                    id="escalate-overdue"
                    checked={settings.escalateOverdue}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, escalateOverdue: checked })
                    }
                  />
                </div>
              </div>

              {/* Trust & Control Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Trust & Control
                </h3>

                {/* Data Security */}
                <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3 mb-3">
                    <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Data Security & Encryption</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• End-to-end encryption for all data transfers</li>
                        <li>• Card numbers masked (last 4 digits only)</li>
                        <li>• OAuth2 with scoped permissions (read/write only what's needed)</li>
                        <li>• No data stored on third-party servers</li>
                        <li>• Secure token management with automatic expiration</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Privacy & Transparency */}
                <div className="p-4 border-2 border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-start gap-3 mb-3">
                    <Eye className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Privacy & Transparency</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Full control over which reports are generated</li>
                        <li>• Full control over which reminders are created</li>
                        <li>• Clear audit trail of all sync operations</li>
                        <li>• Review all data before syncing to Google</li>
                        <li>• No automated sharing without explicit consent</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="p-4 border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-start gap-3 mb-3">
                    <Trash2 className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Data Management & Control</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Delete all synced data anytime</li>
                        <li>• Revoke Google access instantly</li>
                        <li>• Export your data before deletion</li>
                        <li>• Selective sync - choose specific cards/employees</li>
                        <li>• Manual sync mode for maximum control</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Compliance & Standards
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• GDPR compliant data handling</li>
                    <li>• Egyptian data protection regulations</li>
                    <li>• Financial industry security standards</li>
                    <li>• Regular security audits</li>
                    <li>• SOC 2 Type II certified infrastructure</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Shield className="w-4 h-4 mr-2" />
                    Security Audit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reminder Card Component
function ReminderCard({
  reminder,
  countryCode,
  locale,
}: {
  reminder: PaymentReminder;
  countryCode: string;
  locale?: string;
}) {
  const statusColor =
    reminder.status === 'overdue' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
    reminder.priority === 'critical' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' :
    'border-border';

  const StatusIcon = reminder.status === 'paid' ? CheckCircle2 :
                     reminder.status === 'overdue' ? XCircle :
                     Clock;

  return (
    <div className={`p-4 border-2 rounded-lg ${statusColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`w-4 h-4 ${
              reminder.status === 'paid' ? 'text-green-600' :
              reminder.status === 'overdue' ? 'text-red-600' :
              'text-orange-600'
            }`} />
            <Badge variant={reminder.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
              {reminder.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {reminder.type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="font-semibold mb-1">{reminder.cardholderName || reminder.employeeName}</div>
          {reminder.cardLastFour && (
            <div className="text-sm text-muted-foreground mb-1">
              ****{reminder.cardLastFour} • {reminder.bankName}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Due: {reminder.dueDate.toLocaleDateString('en-EG', { timeZone: 'Africa/Cairo' })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">
            {formatCurrencyWithLocale(reminder.amount, countryCode, locale)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {reminder.status.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Report Card Component
function ReportCard({
  title,
  description,
  icon,
  onGenerate,
  disabled,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onGenerate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="p-4 border-2 rounded-lg hover:border-primary transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        onClick={onGenerate}
        disabled={disabled}
        variant="outline"
        className="w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        Generate Report
      </Button>
    </div>
  );
}
