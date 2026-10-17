import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAccessibleTabs, getDefaultTab, canAccessTab, TAB_DEFINITIONS } from '@/lib/permission-enforcement';
import { AccessRestrictedScreen } from '@/components/AccessRestrictedScreen';
import { CardManagement } from '@/components/CardManagement';
import { CardManagementEnterprise } from '@/components/enterprise/CardManagementEnterprise';
import { DashboardCardsSection } from '@/components/DashboardCardsSection';
import { FinancialMetrics } from '@/components/FinancialMetrics';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { SmsEventLogger } from '@/components/SmsEventLogger';
import { SmsLogTab } from '@/components/SmsLogTab';
import { SmsProcessingIndicator } from '@/components/SmsProcessingIndicator';
import { AndroidSyncIndicator } from '@/components/AndroidSyncIndicator';
import { PaymentAlertsBanner } from '@/components/PaymentAlertsBanner';
import { TaxCalculator } from '@/components/TaxCalculator';
import { UserSettings } from '@/components/UserSettings';
import { AssistantTab } from '@/components/AssistantTab';
import { AssistantTabWhatsApp } from '@/components/AssistantTabWhatsApp';
import { MetricsTab } from '@/components/MetricsTab';
import { PayrollTab } from '@/components/PayrollTab';
import { PayrollTabEnterprise } from '@/components/enterprise/PayrollTabEnterprise';
import { GoogleIntegrations } from '@/components/GoogleIntegrations';
import { ThemeToggle } from '@/components/theme-toggle';
import { AnimationProvider } from '@/contexts/animation-context';
import { useAuth } from '@/contexts/auth-context';
import { AuthScreen } from '@/components/AuthScreen';
import { useWorkspace, getAllWorkspaces } from '@/hooks/use-workspace';
import { ChoiceScreen } from '@/components/ChoiceScreen';
import { CreateWorkspaceScreen } from '@/components/CreateWorkspaceScreen';
import { RequestAccessScreen } from '@/components/RequestAccessScreen';
import { PendingApprovalScreen } from '@/components/PendingApprovalScreen';
import { DeniedAccessScreen } from '@/components/DeniedAccessScreen';
import { OfflineStatusIndicator } from '@/components/OfflineStatusIndicator';
import { GlobalHeader } from '@/components/GlobalHeader';
import { AccessManagementPage } from '@/components/AccessManagementPage';
import { formatCurrency, formatDate, getDaysUntilDue, formatNumber, formatPercent } from '@/lib/financial-data';
import { processSmsEventsBatch } from '@/lib/sms-processor';
import { convertToEnhancedCards, convertToBasicCard } from '@/lib/card-converter';
import { extractEmployeesFromTransactions } from '@/lib/payroll-utils';
import type { CompanyCard, FinancialTransaction, FinancialMetrics as MetricsType, Product, Employee, WebsiteMetrics, SmsEvent, PaymentAlert, TaxConfiguration } from '@/types/financial';
import type { EnhancedCompanyCard } from '@/types/enhanced-financial';
import { DEFAULT_COUNTRY } from '@/lib/country-config';
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  MessageSquare,
  Calculator,
  Settings,
  Loader2,
  Sparkles,
  Zap,
  Users,
  BarChart3,
  Calendar,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  component: App,
});

// Calculate net worth: Total Assets − Total Liabilities
// Assets  = cumulative cash position (revenue − expenses − payroll − taxes + starting capital)
// Liabilities = outstanding credit card debt (no double-counting with expenses)
function calculateNetWorth(cards: CompanyCard[], cumulativeCash: number): number {
  const creditCardLiabilities = cards
    .filter((c) => c.cardType === 'credit')
    .reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
  return cumulativeCash - creditCardLiabilities;
}

// Helper function to calculate metrics from transactions
function calculateMetricsFromTransactions(
  transactions: FinancialTransaction[],
  cards: CompanyCard[] = []
): MetricsType[] {
  const monthlyData = new Map<string, {
    revenue: number;
    expenses: number;
    payroll: number;
    taxes: number;
  }>();

  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(key, { revenue: 0, expenses: 0, payroll: 0, taxes: 0 });
  }

  // Aggregate transactions by month
  transactions.forEach((txn) => {
    const date = new Date(txn.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const data = monthlyData.get(key);

    if (data) {
      switch (txn.type) {
        case 'revenue':
          data.revenue += txn.amount;
          break;
        case 'expense':
          data.expenses += txn.amount;
          break;
        case 'payroll':
          // Calculate actual payroll amount from employee data if available
          if (txn.payrollEmployees && txn.payrollEmployees.length > 0) {
            const actualPayrollAmount = txn.payrollEmployees.reduce((sum, emp) => sum + emp.amount, 0);
            data.payroll += actualPayrollAmount;
          } else {
            data.payroll += txn.amount;
          }
          break;
        case 'tax':
          data.taxes += txn.amount;
          break;
        case 'credit_payment':
          // Credit card payments reduce available cash, so they're treated as expenses
          data.expenses += txn.amount;
          break;
      }
    }
  });

  // Convert to metrics array
  const monthlyMetrics: MetricsType[] = [];
  let cumulativeCash = 150000; // Starting cash position (assets)

  Array.from(monthlyData.entries()).forEach(([period, data]) => {
    const netProfit = data.revenue - data.expenses - data.payroll - data.taxes;
    cumulativeCash += netProfit;

    const [year, month] = period.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });

    monthlyMetrics.push({
      id: `month-${period}`,
      period: `${monthName} ${year}`,
      periodType: 'monthly',
      totalRevenue: data.revenue,
      totalExpenses: data.expenses,
      totalPayroll: data.payroll,
      totalTaxes: data.taxes,
      netProfit,
      netWorth: calculateNetWorth(cards, cumulativeCash),
    });
  });

  // Calculate yearly totals
  const yearlyTotals = {
    revenue: 0,
    expenses: 0,
    payroll: 0,
    taxes: 0,
  };

  monthlyMetrics.forEach((metric) => {
    yearlyTotals.revenue += metric.totalRevenue;
    yearlyTotals.expenses += metric.totalExpenses;
    yearlyTotals.payroll += metric.totalPayroll;
    yearlyTotals.taxes += metric.totalTaxes;
  });

  const yearlyMetric: MetricsType = {
    id: 'year-2024',
    period: '2024',
    periodType: 'yearly',
    totalRevenue: yearlyTotals.revenue,
    totalExpenses: yearlyTotals.expenses,
    totalPayroll: yearlyTotals.payroll,
    totalTaxes: yearlyTotals.taxes,
    netProfit: yearlyTotals.revenue - yearlyTotals.expenses - yearlyTotals.payroll - yearlyTotals.taxes,
    netWorth: calculateNetWorth(cards, cumulativeCash),
  };

  return [...monthlyMetrics, yearlyMetric];
}

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const workspaceState = useWorkspace();

  // Choice screen state - track user's explicit choice
  const [userChoice, setUserChoice] = useState<'create' | 'request' | null>(null);

  // Access management navigation state
  const [showAccessManagement, setShowAccessManagement] = useState(false);

  // Country, locale, and currency selection state
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [locale, setLocale] = useState<string | undefined>(() => {
    // Load saved locale from localStorage on initial mount
    const savedLocale = localStorage.getItem('user-locale');
    return savedLocale || undefined;
  });
  const [currency, setCurrency] = useState<string | undefined>(() => {
    // Load saved currency from localStorage on initial mount
    const savedCurrency = localStorage.getItem('user-currency');
    return savedCurrency || undefined;
  });

  // Initialize empty data (populated from backend in production)
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [enhancedCards, setEnhancedCards] = useState<EnhancedCompanyCard[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [smsEvents, setSmsEvents] = useState<SmsEvent[]>([]);
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [taxConfig, setTaxConfig] = useState<TaxConfiguration>({
    id: '1',
    country: '',
    taxBracket: 0,
    taxRate: 0,
    taxYear: new Date().getFullYear(),
    estimatedMonthlyTax: 0,
    estimatedAnnualTax: 0,
  });
  const [products] = useState<Product[]>([]);
  const [websiteMetrics] = useState<WebsiteMetrics[]>([]);

  // Store employee sales data separately (persisted across sessions)
  const [employeeSalesData, setEmployeeSalesData] = useState<Map<string, Employee['monthlySales']>>(() => {
    const saved = localStorage.getItem('employee-sales-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Map(Object.entries(parsed));
      } catch {
        return new Map();
      }
    }
    return new Map();
  });

  // === ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS ===
  // This prevents React Hook #310 error

  // Save sales data to localStorage whenever it changes
  useEffect(() => {
    const dataObj = Object.fromEntries(employeeSalesData);
    localStorage.setItem('employee-sales-data', JSON.stringify(dataObj));
  }, [employeeSalesData]);

  // Extract employees dynamically from payroll transactions and merge sales data
  const employees = useMemo(() => {
    const baseEmployees = extractEmployeesFromTransactions(transactions, countryCode);
    // Merge in sales data
    return baseEmployees.map(emp => ({
      ...emp,
      monthlySales: employeeSalesData.get(emp.id) || emp.monthlySales || [],
    }));
  }, [transactions, countryCode, employeeSalesData]);

  // Automatically process SMS events and update cards
  useEffect(() => {
    if (smsEvents.length > 0) {
      const updatedCards = processSmsEventsBatch(smsEvents, cards);
      // Only update if there are actual changes
      if (JSON.stringify(updatedCards) !== JSON.stringify(cards)) {
        setCards(updatedCards);
      }
    }
  }, [smsEvents]); // Run when SMS events change

  // Calculate metrics from transactions dynamically
  const metrics = useMemo(() => calculateMetricsFromTransactions(transactions, cards), [transactions, cards]);

  // Save locale to localStorage whenever it changes
  useEffect(() => {
    if (locale) {
      localStorage.setItem('user-locale', locale);
    } else {
      localStorage.removeItem('user-locale');
    }
  }, [locale]);

  // Save currency to localStorage whenever it changes
  useEffect(() => {
    if (currency) {
      localStorage.setItem('user-currency', currency);
    } else {
      localStorage.removeItem('user-currency');
    }
  }, [currency]);

  // Calculate derived values that depend on metrics
  const monthlyMetrics = useMemo(() => metrics.filter((m: MetricsType) => m.periodType === 'monthly'), [metrics]);
  const yearlyMetrics = useMemo(() => metrics.find((m: MetricsType) => m.periodType === 'yearly')!, [metrics]);

  // Active tab state with permission guarding
  const accessibleTabs = useMemo(() => getAccessibleTabs(workspaceState.membership), [workspaceState.membership]);
  const defaultTab = useMemo(() => getDefaultTab(workspaceState.membership) || 'overview', [workspaceState.membership]);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update activeTab when defaultTab changes (e.g., after workspace loads)
  useEffect(() => {
    if (!canAccessTab(activeTab, workspaceState.membership)) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, defaultTab, workspaceState.membership]);

  // === ALL HOOKS CALLED - NOW SAFE TO DO CONDITIONAL RENDERING ===

  // === AUTHORITATIVE UX ROUTING (MANDATORY) ===
  // Always render exactly one screen based on user state.
  // Blank screens are FORBIDDEN.

  // Priority 1: Loading state (cold start)
  if (isLoading || workspaceState.isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading AUREX...</p>
        </div>
      </div>
    );
  }

  // Priority 2: Not authenticated → Auth Screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Priority 3: User has no workspace/membership AND has not made a choice → Choice Screen
  // This is the EXPLICIT CHOICE requirement - user MUST consciously choose
  const allWorkspaces = getAllWorkspaces();
  const hasNoWorkspaceOrMembership = !workspaceState.hasWorkspace && !workspaceState.membership;

  if (hasNoWorkspaceOrMembership && !userChoice) {
    return (
      <ChoiceScreen
        onCreateWorkspace={() => setUserChoice('create')}
        onRequestAccess={() => setUserChoice('request')}
      />
    );
  }

  // Priority 4: User chose "Create Workspace" → Create Workspace Screen WITH BACK NAV
  if (userChoice === 'create' && hasNoWorkspaceOrMembership) {
    return <CreateWorkspaceScreen onBack={() => setUserChoice(null)} />;
  }

  // Priority 5: User chose "Request Access" → Request Access Screen
  if (userChoice === 'request' && hasNoWorkspaceOrMembership) {
    return <RequestAccessScreen onBack={() => setUserChoice(null)} />;
  }

  // Priority 6: Access request exists AND status = pending → Pending Approval Screen
  if (workspaceState.hasPendingRequest) {
    return (
      <PendingApprovalScreen
        workspace={workspaceState.workspace}
        membership={workspaceState.membership!}
      />
    );
  }

  // Priority 7: Access request exists AND status = denied → Denied Access Screen
  if (workspaceState.isDenied) {
    return (
      <DeniedAccessScreen
        workspace={workspaceState.workspace}
        membership={workspaceState.membership!}
      />
    );
  }

  // Priority 8: Workspace membership exists AND approved → Dashboard (permission-filtered)
  if (!workspaceState.isApproved || !workspaceState.workspace) {
    // Fallback: Show choice screen if state is inconsistent and user hasn't chosen
    if (!userChoice) {
      return (
        <ChoiceScreen
          onCreateWorkspace={() => setUserChoice('create')}
          onRequestAccess={() => setUserChoice('request')}
        />
      );
    }
    return <RequestAccessScreen />;
  }

  // === USER IS APPROVED - RENDER DASHBOARD ===

  // Show Access Management Page if navigated to it
  if (showAccessManagement) {
    return (
      <AccessManagementPage
        workspace={workspaceState.workspace}
        membership={workspaceState.membership}
        onBack={() => setShowAccessManagement(false)}
      />
    );
  }

  // Handle country change
  // CRITICAL: Currency switch is DISPLAY-ONLY. Do NOT regenerate data.
  // All data is stored in USD (base currency). Only the display formatting changes.
  const handleCountryChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    // NOTE: We do NOT regenerate cards, transactions, or any other data
    // The formatCurrency function will automatically convert USD to display currency
    // Data remains in USD internally, only display changes
    setTaxConfig({
      id: '1',
      country: '',
      taxBracket: 0,
      taxRate: 0,
      taxYear: new Date().getFullYear(),
      estimatedMonthlyTax: 0,
      estimatedAnnualTax: 0,
    });
  };

  // Handle adding new card
  const handleAddCard = (newCard: CompanyCard) => {
    setCards([...cards, newCard]);
  };

  // Handle adding new transaction
  const handleAddTransaction = (newTransaction: any) => {
    setTransactions([newTransaction, ...transactions]);
  };

  // Handle updating a card
  const handleUpdateCard = (cardId: string, updates: Partial<CompanyCard>) => {
    setCards(cards.map(card => card.id === cardId ? { ...card, ...updates } : card));
  };

  // Handle updating an employee
  const handleUpdateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    // Find the employee to get their name
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // If updating sales data, save it to the sales data state
    if (updates.monthlySales !== undefined) {
      setEmployeeSalesData(prev => {
        const newMap = new Map(prev);
        newMap.set(employeeId, updates.monthlySales);
        return newMap;
      });
    }

    // Update payroll transactions for salary/department changes
    if (updates.baseSalary !== undefined || updates.department !== undefined) {
      setTransactions(transactions.map(txn => {
        if (txn.type === 'payroll' && txn.payrollEmployees) {
          const updatedEmployees = txn.payrollEmployees.map(emp => {
            if (emp.name === employee.name) {
              return {
                ...emp,
                amount: updates.baseSalary !== undefined ? updates.baseSalary : emp.amount,
                department: updates.department !== undefined ? updates.department : emp.department,
              };
            }
            return emp;
          });
          return { ...txn, payrollEmployees: updatedEmployees };
        }
        return txn;
      }));
    }
  };

  // Icon mapping for dynamic tab rendering
  const iconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
    BarChart3: <BarChart3 className="w-4 h-4" />,
    CreditCard: <CreditCard className="w-4 h-4" />,
    Users: <Users className="w-4 h-4" />,
    Sparkles: <Sparkles className="w-4 h-4" />,
    MessageSquare: <MessageSquare className="w-4 h-4" />,
    Calculator: <Calculator className="w-4 h-4" />,
    Settings: <Settings className="w-4 h-4" />,
  };

  // Guard tab changes - prevent unauthorized tab access
  const handleTabChange = (newTab: string) => {
    if (canAccessTab(newTab, workspaceState.membership)) {
      setActiveTab(newTab);
    } else {
      // User attempted to access forbidden tab - redirect to restricted screen
      setActiveTab('restricted');
    }
  };

  return (
    <AnimationProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-200 to-black dark:from-black dark:to-gray-800 transition-colors duration-300">
      {/* Global Header with Access Requests Icon */}
      <GlobalHeader
        workspace={workspaceState.workspace}
        membership={workspaceState.membership}
        smsEvents={smsEvents}
        onAccessRequestsClick={() => setShowAccessManagement(true)}
        currency={currency}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* SMS Processing Indicator */}
        <SmsProcessingIndicator smsEvents={smsEvents} cards={cards} />

        {/* Payment Alerts - DISABLED */}
        {/* <PaymentAlertsBanner alerts={alerts} cards={cards} /> */}

        {/* Dashboard Tabs - PERMISSION ENFORCED */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full max-w-[75rem]`} style={{ gridTemplateColumns: `repeat(${accessibleTabs.length}, minmax(0, 1fr))` }}>
            {/* CRITICAL: Only render tabs user can access */}
            {accessibleTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                {iconMap[tab.icon]}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Access Restricted Screen - shown when user attempts forbidden access */}
          <TabsContent value="restricted" className="mt-6">
            <AccessRestrictedScreen onGoBack={() => setActiveTab(defaultTab)} />
          </TabsContent>

          {/* CRITICAL: Permission-guarded tab contents */}
          {canAccessTab('overview', workspaceState.membership) && (
            <TabsContent value="overview" className="space-y-6 mt-6">
              <FinancialMetrics
                monthlyMetrics={monthlyMetrics}
                yearlyMetrics={yearlyMetrics}
                recentTransactions={transactions}
                countryCode={countryCode}
                locale={locale}
                currency={currency}
                onAddTransaction={handleAddTransaction}
                cards={cards}
                onUpdateCard={handleUpdateCard}
              />
              <DashboardCardsSection cards={cards} countryCode={countryCode} locale={locale} currency={currency} />
            </TabsContent>
          )}

          {canAccessTab('metrics', workspaceState.membership) && (
            <TabsContent value="metrics" className="mt-6">
              <MetricsTab
                monthlyMetrics={monthlyMetrics}
                products={products}
                websiteMetrics={websiteMetrics}
                cards={cards}
                countryCode={countryCode}
                locale={locale}
                currency={currency}
              />
            </TabsContent>
          )}

          {canAccessTab('cards', workspaceState.membership) && (
            <TabsContent value="cards" className="mt-6">
              <CardManagementEnterprise cards={cards} countryCode={countryCode} locale={locale} currency={currency} />
            </TabsContent>
          )}

          {canAccessTab('payroll', workspaceState.membership) && (
            <TabsContent value="payroll" className="mt-6">
              <PayrollTabEnterprise
                employees={employees}
                monthlyMetrics={monthlyMetrics}
                countryCode={countryCode}
                locale={locale}
                currency={currency}
              />
            </TabsContent>
          )}

          {canAccessTab('assistant', workspaceState.membership) && (
            <TabsContent value="assistant" className="mt-6">
              <AssistantTabWhatsApp
                cards={cards}
                transactions={transactions}
                employees={employees}
                monthlyMetrics={monthlyMetrics}
                countryCode={countryCode}
                currency={currency}
              />
            </TabsContent>
          )}

          {canAccessTab('sms', workspaceState.membership) && (
            <TabsContent value="sms" className="mt-6">
              <SmsLogTab />
            </TabsContent>
          )}

          {canAccessTab('tax', workspaceState.membership) && (
            <TabsContent value="tax" className="mt-6">
              <TaxCalculator
                initialConfig={taxConfig}
                yearlyMetrics={yearlyMetrics}
                countryCode={countryCode}
                locale={locale}
              />
            </TabsContent>
          )}

          {canAccessTab('settings', workspaceState.membership) && (
            <TabsContent value="settings" className="mt-6">
              <UserSettings
                countryCode={countryCode}
                onCountryChange={handleCountryChange}
                locale={locale}
                onLocaleChange={setLocale}
                currency={currency}
                onCurrencyChange={setCurrency}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 dark:border-gray-700/30 mt-12 animate-fadeIn">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-white dark:text-gray-200">
            <div>
              <p className="font-semibold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                AUREX v1.0
              </p>
              <p className="text-xs mt-1">
                Financial Intelligence Platform • Enterprise-Grade Security
              </p>
            </div>
            <div className="text-right">
              <p>Active Cards: {cards.length}</p>
              <p>Transactions: {transactions.length}</p>
              <p>SMS Events: {smsEvents.length}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AnimationProvider>
  );
}
