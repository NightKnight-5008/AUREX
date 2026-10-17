/**
 * Assistant Tab with WhatsApp Reminders + Google Integration
 *
 * Enterprise-grade assistant tab combining:
 * - WhatsApp payment reminders
 * - Google Docs financial report generation (weekly / monthly / yearly)
 * - Google Tasks payment scheduling (card name, last 4 digits, due date)
 * - Google Docs payment list export
 *
 * UX Rules:
 * - Sub-sections (Overdue, Due Soon, etc.) all start CLOSED.
 * - When the user switches between the internal semi-tabs the sub-sections
 *   reset to closed automatically (via the `key` prop forcing remount).
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Shield,
  FileText,
  CheckSquare,
  RefreshCw,
  Download,
  List,
  ExternalLink,
  MessageSquare,
  Zap,
  BarChart3,
  CreditCard,
  Users,
  CalendarCheck,
} from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import { formatCurrency } from '@/lib/financial-data';
import { WhatsAppReminderSettings } from '@/components/WhatsAppReminderSettings';
import { UpcomingPaymentsSectioned } from '@/components/UpcomingPaymentsSectioned';
import { HighUtilizationSectioned } from '@/components/HighUtilizationSectioned';
import { useCreateGoogleDoc, useBatchUpdateGoogleDoc } from '@/hooks/use-google-docs';
import { useCreateTask } from '@/hooks/use-google-tasks';
import {
  generateCardPaymentReportData,
  formatCardPaymentReport,
  generatePayrollReportData,
  formatPayrollReport,
  generateExpenseReportData,
  formatExpenseReport,
  formatProfitLossReport,
} from '@/lib/google-report-generator';

interface AssistantTabProps {
  cards: CompanyCard[];
  countryCode: string;
  currency?: string;
  employees?: Array<{
    id: string;
    name: string;
    baseSalary: number;
    department: string;
  }>;
  monthlyMetrics?: Array<{
    period: string;
    totalRevenue: number;
    totalExpenses: number;
    totalPayroll: number;
    netProfit: number;
  }>;
  transactions?: Array<{
    id: string;
    date: Date;
    amount: number;
    type: string;
    description: string;
  }>;
}

export function AssistantTabWhatsApp({
  cards,
  countryCode,
  employees = [],
  monthlyMetrics = [],
  transactions = [],
}: AssistantTabProps) {
  // Active semi-tab — used as `key` for sub-components so they remount
  // (and therefore reset all inner collapsible states) on tab switch.
  const [activeTab, setActiveTab] = useState<'reminders' | 'google'>('reminders');

  const creditCards = cards.filter((c) => c.cardType === 'credit');

  // Upcoming payments calculation
  const upcomingPayments = creditCards
    .filter((card) => card.dueDate && card.minimumPayment && card.minimumPayment > 0)
    .map((card) => ({
      cardId: card.id,
      cardName: card.cardholderName || 'Credit Card',
      lastFour: card.lastFourDigits,
      amount: card.minimumPayment || 0,
      dueDate: card.dueDate,
      daysTillDue: card.dueDate
        ? Math.ceil((new Date(card.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }))
    .sort((a, b) =>
      a.dueDate && b.dueDate ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : 0
    );

  // Summary stats
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
  const totalOutstanding = creditCards.reduce((sum, card) => sum + (card.outstandingDebt || 0), 0);
  const utilizationRate = totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0;

  const highRiskCards = creditCards.filter((card) => {
    if (!card.creditLimit || !card.outstandingDebt) return false;
    return (card.outstandingDebt / card.creditLimit) * 100 > 80;
  });

  const overdueCount = upcomingPayments.filter((p) => p.daysTillDue < 0).length;
  const dueSoonCount = upcomingPayments.filter((p) => p.daysTillDue >= 0 && p.daysTillDue <= 3).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assistant & Automation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payment reminders, risk monitoring, and financial report generation
          </p>
        </div>
        {/* Live status pill */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-3 py-1.5 bg-muted/40">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Monitoring active
        </div>
      </div>

      {/* ── Summary KPI Row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Payments */}
        <div className="rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#0B0B0B] p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Upcoming Payments</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingPayments.length}</div>
          <div className="text-xs">
            {overdueCount > 0 ? (
              <span className="text-red-400 font-medium">{overdueCount} overdue</span>
            ) : dueSoonCount > 0 ? (
              <span className="text-amber-400">{dueSoonCount} due within 3 days</span>
            ) : (
              <span className="text-gray-500">All on schedule</span>
            )}
          </div>
        </div>

        {/* Utilization */}
        <div className="rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#0B0B0B] p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Credit Utilization</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold ${utilizationRate > 70 ? 'text-red-600 dark:text-red-400' : utilizationRate > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {utilizationRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {formatCurrency(totalOutstanding, countryCode)} outstanding
          </div>
        </div>

        {/* High Risk */}
        <div className="rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#0B0B0B] p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">High Risk Cards</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold ${highRiskCards.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {highRiskCards.length}
          </div>
          <div className="text-xs text-gray-500">
            {highRiskCards.length > 0 ? 'Over 80% utilization' : 'All cards healthy'}
          </div>
        </div>

        {/* Active Cards */}
        <div className="rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#0B0B0B] p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Active Cards</span>
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditCards.length}</div>
          <div className="text-xs text-gray-500">Credit cards monitored</div>
        </div>
      </div>

      {/* ── Overdue Alert Banner (shown only when there are overdue payments) ── */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:border-red-600/30 dark:bg-red-950/20 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-red-700 dark:text-red-400">{overdueCount} payment{overdueCount > 1 ? 's are' : ' is'} overdue.</span>
            <span className="text-gray-700 dark:text-muted-foreground ml-1">Review the Upcoming Payments section below.</span>
          </div>
        </div>
      )}

      {/* ── Semi-tabs: WhatsApp Reminders vs Google Integration ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'reminders' | 'google')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="reminders" className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp Reminders
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2 text-sm">
            <Zap className="w-3.5 h-3.5" />
            Google Integration
          </TabsTrigger>
        </TabsList>

        {/* ── WhatsApp Reminders tab ── */}
        <TabsContent value="reminders" className="mt-5 space-y-5">
          {/* WhatsApp Settings */}
          <WhatsAppReminderSettings />

          <Separator />

          {/* Upcoming Payments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Payments</h3>
                <p className="text-xs text-gray-600 dark:text-muted-foreground">Payment schedule for credit cards</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-gray-300 dark:border-gray-700">
                {upcomingPayments.length}
              </Badge>
            </div>
            {/* key resets inner section states on tab switch */}
            <UpcomingPaymentsSectioned
              key={activeTab}
              cards={cards}
              countryCode={countryCode}
            />
          </div>

          <Separator />

          {/* High Utilization Alert */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                  High Utilization Alert
                </h3>
                <p className="text-xs text-gray-600 dark:text-muted-foreground">Cards with elevated credit utilization</p>
              </div>
              {highRiskCards.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {highRiskCards.length} at risk
                </Badge>
              )}
            </div>
            {/* key resets inner section states on tab switch */}
            <HighUtilizationSectioned
              key={activeTab}
              cards={cards}
              countryCode={countryCode}
            />
          </div>

          <Separator />

          {/* Security & Privacy — compact horizontal layout */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold">Security & Privacy</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['Phone Number Encryption', 'AES-256-GCM encrypted storage'],
                ['Minimal Data Exposure', 'Only last 4 digits sent via WhatsApp'],
                ['No Third-Party Sharing', 'Number never shared externally'],
                ['Opt-Out Anytime', 'Disable or delete at any time'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">{title}:</span>{' '}
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Google Integration tab ── */}
        <TabsContent value="google" className="mt-5">
          <GoogleIntegrationPanel
            cards={cards}
            countryCode={countryCode}
            employees={employees}
            monthlyMetrics={monthlyMetrics}
            transactions={transactions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Google Integration Panel
   - Financial report generation → Google Docs (weekly / monthly / yearly)
   - Payment schedule → Google Tasks (card name, •••• 1234, due date)
   - Payment list → Google Docs
───────────────────────────────────────────────────────────────────────────── */

interface GoogleIntegrationPanelProps {
  cards: CompanyCard[];
  countryCode: string;
  employees: AssistantTabProps['employees'];
  monthlyMetrics: AssistantTabProps['monthlyMetrics'];
  transactions: AssistantTabProps['transactions'];
}

function GoogleIntegrationPanel({
  cards,
  countryCode,
  employees = [],
  monthlyMetrics = [],
  transactions = [],
}: GoogleIntegrationPanelProps) {
  const createDoc = useCreateGoogleDoc();
  const updateDoc = useBatchUpdateGoogleDoc();
  const createTask = useCreateTask();

  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ text: string; ok: boolean } | null>(null);

  const creditCards = cards.filter((c) => c.cardType === 'credit');

  // Build payment rows for use in report / task creation
  const paymentRows = creditCards
    .filter((c) => c.dueDate && c.minimumPayment && c.minimumPayment > 0)
    .map((c) => ({
      name: c.cardholderName || 'Card Holder',
      lastFour: c.lastFourDigits,
      amount: c.minimumPayment || 0,
      dueDate: new Date(c.dueDate!),
      daysTillDue: Math.ceil(
        (new Date(c.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  /** Push every payment as a Google Task */
  const handleSchedulePaymentsToTasks = async () => {
    setBusy('tasks');
    setLastResult(null);
    try {
      let created = 0;
      for (const p of paymentRows) {
        const dueDateIso = p.dueDate.toISOString().split('T')[0];
        const title = `Pay ${p.name} •••• ${p.lastFour} — due ${dueDateIso}`;
        const notes =
          `Cardholder: ${p.name}\n` +
          `Card ending: •••• ${p.lastFour}\n` +
          `Amount: ${formatCurrency(p.amount, countryCode)}\n` +
          `Due: ${p.dueDate.toLocaleDateString()}\n` +
          `Days remaining: ${p.daysTillDue}`;

        await createTask.mutateAsync({
          title,
          notes,
          due: `${dueDateIso}T00:00:00.000Z`,
        });
        created++;
      }
      setLastResult({ text: `${created} payment tasks added to Google Tasks.`, ok: true });
    } catch {
      setLastResult({ text: 'Failed to create tasks. Check your Google connection.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  /** Export payment list as a Google Doc */
  const handleExportPaymentListToDoc = async () => {
    setBusy('payment-doc');
    setLastResult(null);
    try {
      const today = new Date();
      const title = `Payment Schedule — ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

      const lines: string[] = [
        title,
        '='.repeat(title.length),
        `Generated: ${today.toLocaleString()}`,
        '',
        `${'Cardholder'.padEnd(30)} ${'Card'.padEnd(10)} ${'Amount'.padEnd(14)} ${'Due Date'.padEnd(12)} Days`,
        '-'.repeat(80),
      ];

      for (const p of paymentRows) {
        const status = p.daysTillDue < 0 ? 'OVERDUE' : `${p.daysTillDue}d`;
        lines.push(
          `${p.name.padEnd(30)} •••• ${p.lastFour.padEnd(6)} ` +
            `${formatCurrency(p.amount, countryCode).padEnd(14)} ` +
            `${p.dueDate.toLocaleDateString().padEnd(12)} ${status}`
        );
      }

      lines.push('', `Total payments: ${paymentRows.length}`);

      const doc = await createDoc.mutateAsync({ title });
      await updateDoc.mutateAsync({
        documentId: doc.documentId,
        requests: [{ insertText: { location: { index: 1 }, text: lines.join('\n') } }],
      });

      setLastResult({ text: 'Payment list exported to Google Docs.', ok: true });
      window.open(`https://docs.google.com/document/d/${doc.documentId}/edit`, '_blank');
    } catch {
      setLastResult({ text: 'Failed to create document. Check your Google connection.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  /** Generate a financial report in Google Docs */
  const handleGenerateReport = async (
    reportType: 'weekly' | 'monthly' | 'yearly',
    category: 'card_payments' | 'payroll' | 'expenses' | 'profit_loss'
  ) => {
    const key = `${reportType}-${category}`;
    setBusy(key);
    setLastResult(null);
    try {
      const today = new Date();

      let from: Date;
      let to: Date = today;
      let periodLabel: string;

      if (reportType === 'weekly') {
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        periodLabel = `Week of ${from.toLocaleDateString()} – ${today.toLocaleDateString()}`;
      } else if (reportType === 'monthly') {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        periodLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        from = new Date(today.getFullYear(), 0, 1);
        to = new Date(today.getFullYear(), 11, 31);
        periodLabel = `${today.getFullYear()}`;
      }

      let reportTitle = '';
      let reportContent = '';

      switch (category) {
        case 'card_payments': {
          const data = generateCardPaymentReportData(cards, from, to, countryCode);
          reportTitle = `Card Payments Report (${reportType}) — ${periodLabel}`;
          reportContent = formatCardPaymentReport(data, countryCode, undefined);
          break;
        }
        case 'payroll': {
          const txns = (transactions as unknown) as Parameters<typeof generatePayrollReportData>[1];
          const data = generatePayrollReportData(
            (employees as unknown) as Parameters<typeof generatePayrollReportData>[0],
            txns,
            from,
            to,
            countryCode
          );
          reportTitle = `Payroll Report (${reportType}) — ${periodLabel}`;
          reportContent = formatPayrollReport(data, countryCode, undefined);
          break;
        }
        case 'expenses': {
          const txns = (transactions as unknown) as Parameters<typeof generateExpenseReportData>[0];
          const data = generateExpenseReportData(txns, cards, from, to, countryCode);
          reportTitle = `Expense Report (${reportType}) — ${periodLabel}`;
          reportContent = formatExpenseReport(data, countryCode, undefined);
          break;
        }
        case 'profit_loss': {
          const metricsForReport = (monthlyMetrics as unknown) as Parameters<typeof formatProfitLossReport>[0];
          reportTitle = `Profit & Loss (${reportType}) — ${periodLabel}`;
          reportContent = formatProfitLossReport(metricsForReport, countryCode, undefined);
          break;
        }
      }

      const doc = await createDoc.mutateAsync({ title: reportTitle });
      await updateDoc.mutateAsync({
        documentId: doc.documentId,
        requests: [{ insertText: { location: { index: 1 }, text: reportContent } }],
      });

      setLastResult({ text: `"${reportTitle}" created in Google Docs.`, ok: true });
      window.open(`https://docs.google.com/document/d/${doc.documentId}/edit`, '_blank');
    } catch {
      setLastResult({ text: 'Failed to generate report. Check your Google connection.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const overduePayments = paymentRows.filter((p) => p.daysTillDue < 0);

  return (
    <div className="space-y-5">
      {/* Status feedback */}
      {lastResult && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border ${
          lastResult.ok
            ? 'border-green-600/30 bg-green-950/20 text-green-400'
            : 'border-red-600/30 bg-red-950/20 text-red-400'
        }`}>
          {lastResult.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />
          }
          {lastResult.text}
        </div>
      )}

      {/* ── Payment Scheduling ── */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10">
              <CalendarCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Payment Scheduling</div>
              <div className="text-xs text-gray-600 dark:text-muted-foreground">
                Push due dates to Google Tasks or export as a Google Doc
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{paymentRows.length}</span> payments
            {overduePayments.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-1">
                {overduePayments.length} overdue
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Preview list */}
          {paymentRows.length > 0 ? (
            <div className="divide-y rounded-lg border border-gray-200 dark:border-gray-700 text-sm overflow-hidden bg-white dark:bg-card">
              {paymentRows.slice(0, 5).map((p) => (
                <div key={`${p.name}-${p.lastFour}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-muted-foreground font-mono text-xs shrink-0">•••• {p.lastFour}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-semibold tabular-nums">{formatCurrency(p.amount, countryCode)}</span>
                    <span className={`text-xs min-w-[70px] text-right ${
                      p.daysTillDue < 0
                        ? 'text-red-500 font-medium'
                        : p.daysTillDue <= 3
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                    }`}>
                      {p.daysTillDue < 0 ? `${Math.abs(p.daysTillDue)}d overdue` : `in ${p.daysTillDue}d`}
                    </span>
                  </div>
                </div>
              ))}
              {paymentRows.length > 5 && (
                <div className="px-3 py-2 text-xs text-gray-600 dark:text-muted-foreground bg-gray-50 dark:bg-muted/10">
                  + {paymentRows.length - 5} more payments not shown
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-muted-foreground text-center py-6">
              No upcoming credit card payments found.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={busy !== null || paymentRows.length === 0}
              onClick={handleSchedulePaymentsToTasks}
            >
              {busy === 'tasks' ? (
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5 mr-2" />
              )}
              Add to Google Tasks
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={busy !== null || paymentRows.length === 0}
              onClick={handleExportPaymentListToDoc}
            >
              {busy === 'payment-doc' ? (
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <List className="w-3.5 h-3.5 mr-2" />
              )}
              Export to Google Docs
            </Button>
          </div>
        </div>
      </div>

      {/* ── Financial Reports ── */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-card">
        {/* Section header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-muted/20">
          <div className="p-1 rounded bg-primary/10">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Financial Reports → Google Docs</div>
            <div className="text-xs text-gray-600 dark:text-muted-foreground">
              Generate weekly, monthly, or yearly reports from the latest data
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReportBlock
              title="Card Payments"
              description="Payments made, missed, and overdue across all credit cards"
              icon={<CreditCard className="w-3.5 h-3.5" />}
              busy={busy}
              onGenerate={(period) => handleGenerateReport(period, 'card_payments')}
              keyPrefix="card_payments"
            />
            <ReportBlock
              title="Payroll"
              description="Employee payroll payments, dates, and totals by department"
              icon={<Users className="w-3.5 h-3.5" />}
              busy={busy}
              onGenerate={(period) => handleGenerateReport(period, 'payroll')}
              keyPrefix="payroll"
            />
            <ReportBlock
              title="Expenses"
              description="Categorised expenses and card-based spend breakdown"
              icon={<Activity className="w-3.5 h-3.5" />}
              busy={busy}
              onGenerate={(period) => handleGenerateReport(period, 'expenses')}
              keyPrefix="expenses"
            />
            <ReportBlock
              title="Profit & Loss"
              description="Revenue vs expenses, net profit, and cash-flow summary"
              icon={<FileText className="w-3.5 h-3.5" />}
              busy={busy}
              onGenerate={(period) => handleGenerateReport(period, 'profit_loss')}
              keyPrefix="profit_loss"
            />
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-600 dark:text-muted-foreground flex items-center gap-1.5">
        <ExternalLink className="w-3 h-3 shrink-0" />
        Reports and tasks open directly in your Google account. Ensure Google is connected via
        Settings → Integrations.
      </p>
    </div>
  );
}

/* ─── ReportBlock: one report category with three period buttons ─── */
function ReportBlock({
  title,
  description,
  icon,
  busy,
  onGenerate,
  keyPrefix,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  busy: string | null;
  onGenerate: (period: 'weekly' | 'monthly' | 'yearly') => void;
  keyPrefix: string;
}) {
  return (
    <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-muted/10 hover:bg-gray-100 dark:hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 bg-primary/10 rounded text-primary shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{title}</div>
          <div className="text-xs text-gray-600 dark:text-muted-foreground leading-relaxed">{description}</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {(['weekly', 'monthly', 'yearly'] as const).map((period) => {
          const key = `${period}-${keyPrefix}`;
          const isLoading = busy === key;
          return (
            <Button
              key={period}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              disabled={busy !== null}
              onClick={() => onGenerate(period)}
            >
              {isLoading ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
