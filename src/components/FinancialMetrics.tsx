import { useState } from 'react';
import type { FinancialMetrics, FinancialTransaction, TransactionType, PayrollEmployee, CompanyCard } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrencyWithLocale, formatDateWithLocale } from '@/lib/country-config';
import { DEFAULT_COUNTRY } from '@/lib/country-config';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Image as ImageIcon,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';

interface FinancialMetricsProps {
  monthlyMetrics: FinancialMetrics[];
  yearlyMetrics: FinancialMetrics;
  recentTransactions: FinancialTransaction[];
  countryCode?: string;
  locale?: string;
  currency?: string;
  onAddTransaction?: (transaction: FinancialTransaction) => void;
  cards?: CompanyCard[];
  onUpdateCard?: (cardId: string, updates: Partial<CompanyCard>) => void;
}

export function FinancialMetrics({
  monthlyMetrics,
  yearlyMetrics,
  recentTransactions,
  countryCode = DEFAULT_COUNTRY,
  locale,
  currency,
  onAddTransaction,
  cards = [],
  onUpdateCard,
}: FinancialMetricsProps) {
  const [expandedPayroll, setExpandedPayroll] = useState<string | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    category: '',
    description: '',
    cardId: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [viewingPhotoData, setViewingPhotoData] = useState<string | null>(null);

  // Employee management for payroll transactions
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    department: '',
    amount: '',
  });

  const currentMonth = monthlyMetrics[monthlyMetrics.length - 1];
  const previousMonth = monthlyMetrics[monthlyMetrics.length - 2];

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.department || !newEmployee.amount) {
      return;
    }

    const employee: PayrollEmployee = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newEmployee.name,
      department: newEmployee.department,
      amount: Number(newEmployee.amount),
    };

    setEmployees([...employees, employee]);
    setNewEmployee({
      name: '',
      department: '',
      amount: '',
    });
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployees(employees.filter((emp) => emp.id !== employeeId));
  };

  // Photo upload handler
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Handle view photo
  const handleViewPhoto = (photoData: string) => {
    setViewingPhotoData(photoData);
    setIsPhotoViewerOpen(true);
  };

  // Handle edit transaction
  const handleEditTransaction = (txn: FinancialTransaction) => {
    setEditingTransaction(txn);
    setNewTransaction({
      type: txn.type,
      amount: txn.amount.toString(),
      category: txn.category,
      description: txn.description,
      cardId: txn.relatedCardId || '',
    });
    if (txn.photoData) {
      setPhotoPreview(txn.photoData);
    }
    setIsEditTransactionOpen(true);
  };

  // Handle update transaction
  const handleUpdateTransaction = () => {
    if (!editingTransaction) return;

    const updatedTransaction: FinancialTransaction = {
      ...editingTransaction,
      type: newTransaction.type,
      amount: Number(newTransaction.amount),
      category: newTransaction.category,
      description: newTransaction.description,
      relatedCardId: newTransaction.cardId || undefined,
      photoData: photoPreview || undefined,
      updatedAt: new Date(),
    };

    onAddTransaction?.(updatedTransaction);
    setIsEditTransactionOpen(false);
    setEditingTransaction(null);
    clearPhoto();
    setNewTransaction({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      cardId: '',
    });
  };

  const calculateTotalPayroll = () => {
    return employees.reduce((sum, emp) => sum + emp.amount, 0);
  };

  const handleAddTransaction = () => {
    // For payroll transactions, validate employees
    if (newTransaction.type === 'payroll') {
      if (employees.length === 0) {
        alert('Please add at least one employee for payroll transactions');
        return;
      }
    } else if (newTransaction.type === 'credit_payment') {
      // For credit card payments, validate card selection and amount
      if (!newTransaction.cardId || !newTransaction.amount) {
        alert('Please select a credit card and enter a payment amount');
        return;
      }
    } else {
      // For non-payroll transactions, validate basic fields
      if (!newTransaction.amount || !newTransaction.category || !newTransaction.description) {
        return;
      }
    }

    const transaction: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      type: newTransaction.type,
      amount: newTransaction.type === 'payroll' ? calculateTotalPayroll() : Number(newTransaction.amount),
      category: newTransaction.category || (newTransaction.type === 'payroll' ? 'Salaries' : 'Credit Card Payment'),
      description: newTransaction.description || (newTransaction.type === 'payroll' ? `Payroll for ${employees.length} employees` : 'Credit card debt payment'),
      date: new Date(),
      status: 'completed',
      ...(newTransaction.type === 'payroll' && { payrollEmployees: employees }),
      ...(newTransaction.type === 'credit_payment' && { relatedCardId: newTransaction.cardId }),
    };

    // If it's a credit card payment, update the card's outstanding debt
    if (newTransaction.type === 'credit_payment' && newTransaction.cardId && onUpdateCard) {
      const card = cards.find(c => c.id === newTransaction.cardId);
      if (card && card.cardType === 'credit') {
        const paymentAmount = Number(newTransaction.amount);
        const currentDebt = card.outstandingDebt || (card.creditLimit - card.availableBalance);
        const newDebt = Math.max(0, currentDebt - paymentAmount);
        const newAvailableBalance = card.creditLimit - newDebt;

        onUpdateCard(newTransaction.cardId, {
          outstandingDebt: newDebt,
          availableBalance: newAvailableBalance,
          paymentStatus: newDebt === 0 ? 'paid' : 'unpaid',
          minimumPayment: newDebt > 0 ? Math.max(500, newDebt * 0.05) : 0,
        });
      }
    }

    // Add photo data if available
    if (photoPreview) {
      transaction.photoData = photoPreview;
    }

    onAddTransaction?.(transaction);
    setIsAddTransactionOpen(false);
    setNewTransaction({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      cardId: '',
    });
    setEmployees([]);
    setNewEmployee({
      name: '',
      department: '',
      amount: '',
    });
    clearPhoto();
  };

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = previousMonth
    ? calculateGrowth(currentMonth.totalRevenue, previousMonth.totalRevenue)
    : 0;
  const profitGrowth = previousMonth
    ? calculateGrowth(currentMonth.netProfit, previousMonth.netProfit)
    : 0;

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-sm font-semibold">+{value.toFixed(1)}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <ArrowDownRight className="w-4 h-4" />
          <span className="text-sm font-semibold">{value.toFixed(1)}%</span>
        </div>
      );
    }
    return <span className="text-sm text-gray-500 dark:text-gray-400">0%</span>;
  };

  const AnimatedNetWorth = ({ value, countryCode, locale }: { value: number; countryCode: string; locale?: string }) => {
    const { ref, isInView } = useInView({ triggerOnce: true });
    const animatedValue = useCountUp({
      end: isInView ? value : 0,
      duration: 1500,
      decimals: 0,
    });

    return (
      <div ref={ref} className="text-3xl font-bold">
        {formatCurrencyWithLocale(animatedValue, countryCode, locale, currency)}
      </div>
    );
  };

  // Sparkline component for mini trend graphs
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 20;

    // Normalize data to 0-1 range and create path
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;

    return (
      <svg width={width} height={height} className="opacity-50">
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={color}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    growth,
    color,
    delay = 0,
    sparklineData,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    growth?: number;
    color: string;
    delay?: number;
    sparklineData?: number[];
  }) => {
    const { ref, isInView } = useInView({ triggerOnce: true });
    const animatedValue = useCountUp({
      end: isInView ? value : 0,
      duration: 1500,
      decimals: 0,
      delay,
    });

    return (
      <Card ref={ref} className="animate-on-mount animate-slideInUp" style={{ animationDelay: `${delay}ms` }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>{title}</CardDescription>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">
                {formatCurrencyWithLocale(animatedValue, countryCode, locale, currency)}
              </div>
              {growth !== undefined && <GrowthIndicator value={growth} />}
            </div>
            {sparklineData && sparklineData.length > 0 && (
              <div className="flex items-center gap-2">
                <Sparkline data={sparklineData} color={color} />
                <span className="text-xs text-muted-foreground">6-month trend</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getTransactionBadge = (type: FinancialTransaction['type']) => {
    const config = {
      revenue: { label: 'Revenue', className: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
      expense: { label: 'Expense', className: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
      payroll: { label: 'Payroll', className: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
      tax: { label: 'Tax', className: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
      credit_payment: { label: 'Credit Payment', className: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
    };
    const { label, className } = config[type];
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          <TabsTrigger value="yearly">Yearly View</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Revenue"
              value={currentMonth.totalRevenue}
              icon={DollarSign}
              growth={revenueGrowth}
              color="text-green-600"
              delay={0}
              sparklineData={monthlyMetrics.map(m => m.totalRevenue)}
            />
            <MetricCard
              title="Expenses"
              value={currentMonth.totalExpenses}
              icon={CreditCard}
              color="text-red-600"
              delay={100}
              sparklineData={monthlyMetrics.map(m => m.totalExpenses)}
            />
            <MetricCard
              title="Payroll"
              value={currentMonth.totalPayroll}
              icon={Users}
              color="text-blue-600"
              delay={200}
              sparklineData={monthlyMetrics.map(m => m.totalPayroll)}
            />
            <MetricCard
              title="Net Profit"
              value={currentMonth.netProfit}
              icon={TrendingUp}
              growth={profitGrowth}
              color={currentMonth.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
              delay={300}
              sparklineData={monthlyMetrics.map(m => m.netProfit)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="animate-on-mount animate-slideInUp animation-delay-400">
              <CardHeader className="pb-2">
                <CardDescription>Net Worth</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedNetWorth value={currentMonth.netWorth} countryCode={countryCode} locale={locale} />
              </CardContent>
            </Card>
            <Card className="animate-on-mount animate-slideInUp animation-delay-500">
              <CardHeader className="pb-2">
                <CardDescription>Taxes Paid (This Month)</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedNetWorth value={currentMonth.totalTaxes} countryCode={countryCode} locale={locale} />
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card className="animate-on-mount animate-fadeIn animation-delay-500">
            <CardHeader>
              <CardTitle>6-Month Trend</CardTitle>
              <CardDescription>Revenue and profit over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Payroll</TableHead>
                      <TableHead className="text-right">Taxes</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Net Worth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyMetrics.map((metric) => (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">{metric.period}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          {formatCurrencyWithLocale(metric.totalRevenue, countryCode, locale, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          {formatCurrencyWithLocale(metric.totalExpenses, countryCode, locale, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrencyWithLocale(metric.totalPayroll, countryCode, locale, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrencyWithLocale(metric.totalTaxes, countryCode, locale, currency)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            metric.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrencyWithLocale(metric.netProfit, countryCode, locale, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrencyWithLocale(metric.netWorth, countryCode, locale, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Annual Revenue"
              value={yearlyMetrics.totalRevenue}
              icon={DollarSign}
              color="text-green-600"
              delay={0}
              sparklineData={monthlyMetrics.map(m => m.totalRevenue)}
            />
            <MetricCard
              title="Annual Expenses"
              value={yearlyMetrics.totalExpenses}
              icon={CreditCard}
              color="text-red-600"
              delay={100}
              sparklineData={monthlyMetrics.map(m => m.totalExpenses)}
            />
            <MetricCard
              title="Annual Payroll"
              value={yearlyMetrics.totalPayroll}
              icon={Users}
              color="text-blue-600"
              delay={200}
              sparklineData={monthlyMetrics.map(m => m.totalPayroll)}
            />
            <MetricCard
              title="Annual Profit"
              value={yearlyMetrics.netProfit}
              icon={yearlyMetrics.netProfit >= 0 ? TrendingUp : TrendingDown}
              color={yearlyMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
              delay={300}
              sparklineData={monthlyMetrics.map(m => m.netProfit)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="animate-on-mount animate-slideInUp animation-delay-400">
              <CardHeader className="pb-2">
                <CardDescription>Total Taxes Paid</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedNetWorth value={yearlyMetrics.totalTaxes} countryCode={countryCode} locale={locale} />
              </CardContent>
            </Card>
            <Card className="animate-on-mount animate-slideInUp animation-delay-500">
              <CardHeader className="pb-2">
                <CardDescription>Current Net Worth</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedNetWorth value={yearlyMetrics.netWorth} countryCode={countryCode} locale={locale} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Transactions */}
      <Card className="animate-on-mount animate-fadeIn animation-delay-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest financial activity</CardDescription>
            </div>
            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className={newTransaction.type === 'payroll' ? 'sm:max-w-[800px]' : 'sm:max-w-[525px]'}>
                <DialogHeader>
                  <DialogTitle>Add Manual Transaction</DialogTitle>
                  <DialogDescription>
                    {newTransaction.type === 'payroll'
                      ? 'Add employees with their names, roles, and salaries for payroll processing.'
                      : newTransaction.type === 'credit_payment'
                      ? 'Record a payment made toward your credit card debt. This will reduce the outstanding balance.'
                      : 'Enter transaction details for tax, revenue, expenses, or any other income/outflow.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transactionType" className="text-right">
                      Type
                    </Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value) => {
                        setNewTransaction({ ...newTransaction, type: value as TransactionType });
                        // Reset employees when switching away from payroll
                        if (value !== 'payroll') {
                          setEmployees([]);
                          setNewEmployee({ name: '', department: '', amount: '' });
                        }
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue (Income)</SelectItem>
                        <SelectItem value="expense">Expense (Outflow)</SelectItem>
                        <SelectItem value="tax">Tax Payment</SelectItem>
                        <SelectItem value="payroll">Payroll</SelectItem>
                        <SelectItem value="credit_payment">Credit Card Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Conditional rendering based on transaction type */}
                  {newTransaction.type === 'credit_payment' ? (
                    <>
                      {/* Credit Card Payment Fields */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="creditCard" className="text-right">
                          Credit Card
                        </Label>
                        <Select
                          value={newTransaction.cardId}
                          onValueChange={(value) => {
                            setNewTransaction({ ...newTransaction, cardId: value });
                            // Auto-fill suggested payment amount (outstanding debt)
                            const card = cards.find(c => c.id === value);
                            if (card && card.cardType === 'credit') {
                              const debt = card.outstandingDebt || (card.creditLimit - card.availableBalance);
                              setNewTransaction({
                                ...newTransaction,
                                cardId: value,
                                amount: debt.toString(),
                                description: `Payment for card ending in ${card.lastFourDigits}`,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select credit card" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards.filter(c => c.cardType === 'credit').map((card) => {
                              const debt = card.outstandingDebt || (card.creditLimit - card.availableBalance);
                              return (
                                <SelectItem key={card.id} value={card.id}>
                                  •••• {card.lastFourDigits} - {card.cardholderName} (Debt: {formatCurrencyWithLocale(debt, countryCode, locale, currency)})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentAmount" className="text-right">
                          Payment Amount
                        </Label>
                        <Input
                          id="paymentAmount"
                          type="number"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                          placeholder="5000"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentDescription" className="text-right">
                          Description
                        </Label>
                        <Input
                          id="paymentDescription"
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          placeholder="Credit card debt payment"
                          className="col-span-3"
                        />
                      </div>
                    </>
                  ) : newTransaction.type === 'payroll' ? (
                    <>
                      {/* Employee Input Section */}
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Add Employees</Label>
                          {employees.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {employees.length} employee{employees.length !== 1 ? 's' : ''} • Total: {formatCurrencyWithLocale(calculateTotalPayroll(), countryCode, locale, currency)}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mb-2 italic">
                          💡 Employee IDs are auto-generated. View them in the Payroll tab.
                        </div>

                        <div className="grid grid-cols-12 items-end gap-2">
                          <div className="col-span-4">
                            <Label htmlFor="empName" className="text-xs">Employee Name</Label>
                            <Input
                              id="empName"
                              value={newEmployee.name}
                              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                              placeholder="John Doe"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor="empDept" className="text-xs">Role/Department</Label>
                            <Input
                              id="empDept"
                              value={newEmployee.department}
                              onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                              placeholder="Engineering"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor="empAmount" className="text-xs">Salary</Label>
                            <Input
                              id="empAmount"
                              type="number"
                              value={newEmployee.amount}
                              onChange={(e) => setNewEmployee({ ...newEmployee, amount: e.target.value })}
                              placeholder="5000"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-2">
                            <Button
                              type="button"
                              onClick={handleAddEmployee}
                              size="sm"
                              className="w-full"
                              disabled={!newEmployee.name || !newEmployee.department || !newEmployee.amount}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Employee List Table */}
                        {employees.length > 0 && (
                          <div className="border rounded-md max-h-[240px] overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[35%]">Name</TableHead>
                                  <TableHead className="w-[30%]">Role</TableHead>
                                  <TableHead className="text-right w-[25%]">Salary</TableHead>
                                  <TableHead className="w-[10%]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {employees.map((emp) => (
                                  <TableRow key={emp.id}>
                                    <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{emp.department}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                      {formatCurrencyWithLocale(emp.amount, countryCode, locale, currency)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveEmployee(emp.id)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Optional Category and Description for Payroll */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <Label htmlFor="payrollCategory" className="text-xs">Category (Optional)</Label>
                            <Select
                              value={newTransaction.category}
                              onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Salaries" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Salaries">Salaries</SelectItem>
                                <SelectItem value="Bonuses">Bonuses</SelectItem>
                                <SelectItem value="Benefits">Benefits</SelectItem>
                                <SelectItem value="Contractor Payments">Contractor Payments</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="payrollDesc" className="text-xs">Description (Optional)</Label>
                            <Input
                              id="payrollDesc"
                              value={newTransaction.description}
                              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                              placeholder="Monthly payroll"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard Transaction Fields */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                          Amount
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                          placeholder="5000"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                          Category
                        </Label>
                        <Select
                          value={newTransaction.category}
                          onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {newTransaction.type === 'revenue' && (
                              <>
                                <SelectItem value="Website Sales">Website Sales</SelectItem>
                                <SelectItem value="Product Sales">Product Sales</SelectItem>
                                <SelectItem value="Service Revenue">Service Revenue</SelectItem>
                                <SelectItem value="Consulting">Consulting</SelectItem>
                                <SelectItem value="Subscription">Subscription</SelectItem>
                                <SelectItem value="Other Income">Other Income</SelectItem>
                              </>
                            )}
                            {newTransaction.type === 'expense' && (
                              <>
                                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                                <SelectItem value="Rent">Rent</SelectItem>
                                <SelectItem value="Utilities">Utilities</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Software">Software</SelectItem>
                                <SelectItem value="Equipment">Equipment</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Insurance">Insurance</SelectItem>
                                <SelectItem value="Other Expenses">Other Expenses</SelectItem>
                              </>
                            )}
                            {newTransaction.type === 'tax' && (
                              <>
                                <SelectItem value="Income Tax">Income Tax</SelectItem>
                                <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                                <SelectItem value="Property Tax">Property Tax</SelectItem>
                                <SelectItem value="Payroll Tax">Payroll Tax</SelectItem>
                                <SelectItem value="VAT">VAT</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Input
                          id="description"
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          placeholder="Enter transaction details"
                          className="col-span-3"
                        />
                      </div>
                    </>
                  )}

                  {/* Photo Upload Field - Available for all transaction types */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="photo" className="text-right">
                      Photo
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('photo')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {photoPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearPhoto}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {photoPreview && (
                        <div className="relative w-full h-32 border rounded overflow-hidden">
                          <img
                            src={photoPreview}
                            alt="Transaction preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddTransaction}>
                    Add Transaction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.slice(0, 7).map((txn) => (
                  <>
                    <TableRow
                      key={txn.id}
                      className={
                        txn.type === 'payroll' && txn.payrollEmployees
                          ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                          : ''
                      }
                      onClick={() => {
                        if (txn.type === 'payroll' && txn.payrollEmployees) {
                          setExpandedPayroll(expandedPayroll === txn.id ? null : txn.id);
                        }
                      }}
                    >
                      <TableCell className="text-sm">
                        {formatDateWithLocale(txn.date, countryCode, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {txn.type === 'payroll' && txn.payrollEmployees && (
                            expandedPayroll === txn.id ?
                              <ChevronDown className="w-4 h-4 text-gray-500" /> :
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          {getTransactionBadge(txn.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{txn.category}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {txn.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          txn.type === 'revenue' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {txn.type === 'revenue' ? '+' : '-'}
                        {formatCurrencyWithLocale(txn.amount, countryCode, locale, currency)}
                        {txn.type === 'credit_payment' && (
                          <span className="text-xs block text-orange-600 dark:text-orange-400">Card Payment</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {txn.photoData && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPhoto(txn.photoData!);
                              }}
                              className="hover:bg-green-50 dark:hover:bg-green-950"
                              title="View photo"
                            >
                              <ImageIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTransaction(txn);
                            }}
                            className="hover:bg-blue-50 dark:hover:bg-blue-950"
                            title="Edit transaction"
                          >
                            <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {txn.type === 'payroll' && txn.payrollEmployees && expandedPayroll === txn.id && (
                      <TableRow key={`${txn.id}-details`}>
                        <TableCell colSpan={7} className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400">
                          <div className="p-4">
                            <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-200">Employee Payroll Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {txn.payrollEmployees.map((emp) => (
                                <div key={emp.id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <div>
                                      <div className="font-medium text-sm dark:text-gray-100">{emp.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{emp.department}</div>
                                    </div>
                                  </div>
                                  <div className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                                    {formatCurrencyWithLocale(emp.amount, countryCode, locale, currency)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details and upload a photo if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Timestamps Display */}
            {editingTransaction && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="font-medium">
                      {editingTransaction.createdAt
                        ? formatDateWithLocale(editingTransaction.createdAt, countryCode, locale)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Last Updated</div>
                    <div className="font-medium">
                      {editingTransaction.updatedAt
                        ? formatDateWithLocale(editingTransaction.updatedAt, countryCode, locale)
                        : 'Not updated'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-type" className="text-right">
                Type
              </Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value) =>
                  setNewTransaction({ ...newTransaction, type: value as TransactionType })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue (Income)</SelectItem>
                  <SelectItem value="expense">Expense (Outflow)</SelectItem>
                  <SelectItem value="tax">Tax Payment</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="credit_payment">Credit Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">
                Amount
              </Label>
              <Input
                id="edit-amount"
                type="number"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, amount: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                Category
              </Label>
              <Input
                id="edit-category"
                value={newTransaction.category}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, category: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, description: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {/* Photo Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-photo" className="text-right">
                Photo
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('edit-photo')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearPhoto}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {photoPreview && (
                  <div className="relative w-full h-40 border rounded overflow-hidden">
                    <img
                      src={photoPreview}
                      alt="Transaction"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!photoPreview && editingTransaction?.photoData && (
                  <p className="text-sm text-gray-500">No photo attached</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditTransactionOpen(false);
                setEditingTransaction(null);
                clearPhoto();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleUpdateTransaction}>
              Update Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={isPhotoViewerOpen} onOpenChange={setIsPhotoViewerOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Transaction Photo</DialogTitle>
            <DialogDescription>
              View attached transaction receipt or document
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {viewingPhotoData ? (
              <img
                src={viewingPhotoData}
                alt="Transaction receipt"
                className="max-w-full max-h-[600px] object-contain rounded"
              />
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No photo available</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPhotoViewerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
