import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureStorage } from '@/lib/security/SecureStorage';
import { hashPin, verifyPin } from '@/lib/security/EncryptionService';
import { createPayrollSession, type SessionManager } from '@/lib/security/SessionManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrencyWithLocale } from '@/lib/country-config';
import type { Employee, FinancialMetrics } from '@/types/financial';
import {
  Users,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Building2,
  Award,
  ChevronRight,
  Grid3x3,
  List,
  Briefcase,
  Lock,
  Unlock,
} from 'lucide-react';

interface PayrollTabEnterpriseProps {
  employees: Employee[];
  monthlyMetrics: FinancialMetrics[];
  countryCode: string;
  locale?: string;
  currency?: string;
}

type ViewMode = 'executive' | 'departments' | 'individuals';
type DisplayMode = 'grid' | 'list';

export function PayrollTabEnterprise({
  employees,
  monthlyMetrics,
  countryCode,
  locale,
  currency
}: PayrollTabEnterpriseProps) {
  // PIN Security State
  const [pin, setPin] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(true); // Will be updated after async check
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string>('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Session Manager State (for inactivity tracking)
  const sessionManagerRef = useRef<SessionManager | null>(null);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('executive');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 100000]);
  const [showSalesOnly, setShowSalesOnly] = useState(false);
  const [showBonusOnly, setShowBonusOnly] = useState(false);

  // Extract unique departments
  const uniqueDepartments = useMemo(() =>
    Array.from(new Set(employees.map(e => e.department))).sort()
  , [employees]);

  // Apply filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search filter
      if (searchQuery && !emp.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Department filter
      if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) {
        return false;
      }

      // Salary range filter
      if (emp.baseSalary < salaryRange[0] || emp.baseSalary > salaryRange[1]) {
        return false;
      }

      // Sales filter
      if (showSalesOnly && (!emp.monthlySales || emp.monthlySales.length === 0)) {
        return false;
      }

      // Bonus filter
      if (showBonusOnly && (!emp.bonuses || emp.bonuses.length === 0)) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, selectedDepartment, salaryRange, showSalesOnly, showBonusOnly]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = employees.length;
    const totalPayroll = employees.reduce((sum, e) => sum + e.baseSalary, 0);
    const avgSalary = total > 0 ? totalPayroll / total : 0;
    const totalBonuses = employees.reduce((sum, e) =>
      sum + (e.bonuses?.reduce((s, b) => s + b.amount, 0) || 0), 0
    );
    const employeesWithSales = employees.filter(e => e.monthlySales && e.monthlySales.length > 0).length;
    const employeesWithBonuses = employees.filter(e => e.bonuses && e.bonuses.length > 0).length;

    // Department breakdown
    const byDepartment = employees.reduce((acc, emp) => {
      if (!acc[emp.department]) {
        acc[emp.department] = { count: 0, payroll: 0 };
      }
      acc[emp.department].count++;
      acc[emp.department].payroll += emp.baseSalary;
      return acc;
    }, {} as Record<string, { count: number; payroll: number }>);

    return {
      total,
      totalPayroll,
      avgSalary,
      totalBonuses,
      employeesWithSales,
      employeesWithBonuses,
      byDepartment,
      uniqueDepartments: uniqueDepartments.length,
    };
  }, [employees, uniqueDepartments.length]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    return filteredEmployees.reduce((acc, emp) => {
      if (!acc[emp.department]) acc[emp.department] = [];
      acc[emp.department].push(emp);
      return acc;
    }, {} as Record<string, Employee[]>);
  }, [filteredEmployees]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setSalaryRange([0, 100000]);
    setShowSalesOnly(false);
    setShowBonusOnly(false);
  }, []);

  // Load saved PIN from secure storage on mount
  useEffect(() => {
    const loadPin = async () => {
      const credential = await SecureStorage.getPayrollCredential();
      if (credential) {
        setSavedPin(credential.pin);
        setIsPinSetup(false);
      } else {
        setIsPinSetup(true);
      }
    };
    loadPin();
  }, []);

  // Focus the PIN input when not unlocked
  useEffect(() => {
    if (!isUnlocked) {
      // Try focusing immediately
      pinInputRef.current?.focus();

      // Also try after a short delay to handle rendering
      const timer1 = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);

      // And one more time to be really sure
      const timer2 = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isUnlocked]);

  // Cleanup session manager on unmount
  useEffect(() => {
    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.destroy();
      }
    };
  }, []);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    setIsUnlocked(false);
    setPinError('Session timed out due to inactivity');

    // Stop session tracking
    if (sessionManagerRef.current) {
      sessionManagerRef.current.destroy();
      sessionManagerRef.current = null;
    }
  }, []);

  // Handle PIN submission
  const handlePinSubmit = async () => {
    setPinError('');

    if (isPinSetup) {
      // Setting up new PIN
      if (pin.length === 6) {
        const pinHash = await hashPin(pin);
        const credential = {
          pin: pinHash,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          failedAttempts: 0,
        };
        await SecureStorage.setPayrollCredential(credential);
        setSavedPin(pinHash);
        setIsUnlocked(true);
        setPin('');
        setIsPinSetup(false);

        // Start session tracking
        sessionManagerRef.current = createPayrollSession(handleSessionTimeout);
        sessionManagerRef.current.startSession();
      } else {
        setPinError('PIN must be exactly 6 digits');
      }
    } else {
      // Verifying existing PIN
      if (savedPin && await verifyPin(pin, savedPin)) {
        // Update last used time
        const credential = await SecureStorage.getPayrollCredential();
        if (credential) {
          credential.lastUsedAt = Date.now();
          credential.failedAttempts = 0;
          await SecureStorage.setPayrollCredential(credential);
        }
        setIsUnlocked(true);
        setPin('');

        // Start session tracking
        sessionManagerRef.current = createPayrollSession(handleSessionTimeout);
        sessionManagerRef.current.startSession();
      } else {
        // Update failed attempts
        const credential = await SecureStorage.getPayrollCredential();
        if (credential) {
          credential.failedAttempts = (credential.failedAttempts || 0) + 1;
          await SecureStorage.setPayrollCredential(credential);
        }
        setPinError('Incorrect PIN');
        setPin('');
      }
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* PIN Overlay - Only blocks payroll content, not tab navigation */}
      {!isUnlocked && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center pt-8 rounded-lg">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {isPinSetup ? 'Create Payroll PIN' : 'Enter Payroll PIN'}
              </CardTitle>
              <CardDescription>
                {isPinSetup
                  ? 'Create a 6-digit PIN to secure payroll data access'
                  : 'Enter your 6-digit PIN to access payroll management'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPin(value);
                    setPinError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pin.length === 6) {
                      handlePinSubmit();
                    }
                  }}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                {pinError && (
                  <p className="text-sm text-red-500 text-center">{pinError}</p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {pin.length}/6 digits entered
                </p>
              </div>
              <Button
                onClick={handlePinSubmit}
                className="w-full"
                disabled={pin.length !== 6}
              >
                <Unlock className="w-4 h-4 mr-2" />
                {isPinSetup ? 'Create PIN' : 'Unlock'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Header with Lock Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Payroll Management</h2>
          <p className="text-muted-foreground">Enterprise workforce management and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <Badge variant="default" className="text-lg px-4 py-2">
              <Unlock className="w-4 h-4 mr-2" />
              Unlocked
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Payroll Overview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={displayMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={displayMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KPICard
              icon={Users}
              label="Total Employees"
              value={kpis.total.toString()}
              color="text-blue-600"
            />
            <KPICard
              icon={DollarSign}
              label="Total Payroll"
              value={formatCurrencyWithLocale(kpis.totalPayroll, countryCode, locale, currency)}
              color="text-green-600"
              compact
            />
            <KPICard
              icon={TrendingUp}
              label="Avg Salary"
              value={formatCurrencyWithLocale(kpis.avgSalary, countryCode, locale, currency)}
              color="text-purple-600"
              compact
            />
            <KPICard
              icon={Award}
              label="Total Bonuses"
              value={formatCurrencyWithLocale(kpis.totalBonuses, countryCode, locale, currency)}
              color="text-orange-600"
              compact
            />
            <KPICard
              icon={Briefcase}
              label="Departments"
              value={kpis.uniqueDepartments.toString()}
              color="text-indigo-600"
            />
            <KPICard
              icon={TrendingUp}
              label="With Sales"
              value={kpis.employeesWithSales.toString()}
              color="text-teal-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <Card className="border-2 sticky top-0 z-10 bg-background shadow-lg">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filters</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredEmployees.length} of {employees.length} employees
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Department Filter */}
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments ({uniqueDepartments.length})</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({kpis.byDepartment[dept]?.count || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Quick Filters */}
              <div className="flex gap-2">
                <Button
                  variant={showSalesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowSalesOnly(!showSalesOnly)}
                  className="flex-1"
                >
                  Sales Only
                </Button>
                <Button
                  variant={showBonusOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowBonusOnly(!showBonusOnly)}
                  className="flex-1"
                >
                  Bonus Only
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="individuals">Individuals</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4">
          <ExecutiveView
            employees={filteredEmployees}
            kpis={kpis}
            countryCode={countryCode}
            locale={locale}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <DepartmentsView
            employeesByDepartment={employeesByDepartment}
            displayMode={displayMode}
            countryCode={countryCode}
            locale={locale}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="individuals" className="mt-4">
          <IndividualsView
            employees={filteredEmployees}
            displayMode={displayMode}
            countryCode={countryCode}
            locale={locale}
            currency={currency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// KPI Card - Enterprise-grade styling with light/dark mode support
function KPICard({
  icon: Icon,
  label,
  value,
  color,
  compact
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700/30 dark:bg-[#0B0B0B]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`font-bold ${compact ? 'text-sm' : 'text-lg'} text-gray-900 dark:text-white`}>
        {value}
      </div>
    </div>
  );
}

// Executive View
function ExecutiveView({
  employees,
  kpis,
  countryCode,
  locale,
  currency
}: {
  employees: Employee[];
  kpis: any;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const departmentData = useMemo(() => {
    return Object.entries(kpis.byDepartment)
      .map(([dept, data]) => ({
        dept,
        count: (data as { count: number; payroll: number }).count,
        payroll: (data as { count: number; payroll: number }).payroll
      }))
      .sort((a, b) => b.payroll - a.payroll);
  }, [kpis.byDepartment]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {departmentData.map(({ dept, count, payroll }) => (
                <div key={dept} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">{dept}</div>
                    <Badge variant="secondary">{count} emp</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: {formatCurrencyWithLocale(payroll, countryCode, locale, currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg: {formatCurrencyWithLocale(count > 0 ? payroll / count : 0, countryCode, locale, currency)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Salaries</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {[...employees]
                .sort((a, b) => b.baseSalary - a.baseSalary)
                .slice(0, 10)
                .map((emp, idx) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.department}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrencyWithLocale(emp.baseSalary, countryCode, locale, currency)}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Departments View
function DepartmentsView({
  employeesByDepartment,
  displayMode,
  countryCode,
  locale,
  currency
}: {
  employeesByDepartment: Record<string, Employee[]>;
  displayMode: DisplayMode;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (dept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepts(newExpanded);
  };

  return (
    <div className="space-y-3">
      {Object.entries(employeesByDepartment).map(([dept, emps]) => (
        <Card key={dept} className="overflow-hidden">
          <button
            onClick={() => toggleDept(dept)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`w-5 h-5 transition-transform ${expandedDepts.has(dept) ? 'rotate-90' : ''}`} />
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">{dept}</span>
              <Badge variant="secondary">{emps.length} employees</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {formatCurrencyWithLocale(
                emps.reduce((sum, e) => sum + e.baseSalary, 0),
                countryCode,
                locale
              )}
            </div>
          </button>

          {expandedDepts.has(dept) && (
            <div className="border-t p-4">
              {displayMode === 'list' ? (
                <CompactEmployeeList employees={emps.slice(0, 50)} countryCode={countryCode} locale={locale} currency={currency} />
              ) : (
                <CompactEmployeeGrid employees={emps.slice(0, 50)} countryCode={countryCode} locale={locale} currency={currency} />
              )}
              {emps.length > 50 && (
                <div className="text-center text-sm text-muted-foreground mt-3">
                  Showing 50 of {emps.length} employees. Use filters to narrow down.
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// Individuals View
function IndividualsView({
  employees,
  displayMode,
  countryCode,
  locale,
  currency
}: {
  employees: Employee[];
  displayMode: DisplayMode;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  return (
    <div>
      {employees.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No Employees Found</h3>
          <p className="text-muted-foreground">Try adjusting your filters.</p>
        </Card>
      ) : (
        <div>
          {displayMode === 'list' ? (
            <CompactEmployeeList employees={employees.slice(0, 100)} countryCode={countryCode} locale={locale} currency={currency} />
          ) : (
            <CompactEmployeeGrid employees={employees.slice(0, 100)} countryCode={countryCode} locale={locale} currency={currency} />
          )}
          {employees.length > 100 && (
            <div className="text-center text-sm text-muted-foreground mt-4 p-4 border rounded-lg bg-yellow-50">
              Showing 100 of {employees.length} employees. Use filters to narrow down results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact Employee List
function CompactEmployeeList({
  employees,
  countryCode,
  locale,
  showSales,
  currency
}: {
  employees: Employee[];
  countryCode: string;
  locale?: string;
  showSales?: boolean;
  currency?: string;
}) {
  return (
    <div className="space-y-1">
      {employees.map(emp => {
        const salesValue = emp.monthlySales?.[0]?.salesValue || 0;
        const hasSales = emp.monthlySales && emp.monthlySales.length > 0;
        const hasBonus = emp.bonuses && emp.bonuses.length > 0;

        return (
          <div
            key={emp.id}
            className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{emp.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{emp.employeeId}</span>
                  <span>•</span>
                  <span>{emp.department}</span>
                  {hasSales && <Badge variant="secondary" className="text-xs px-1.5 py-0">Sales</Badge>}
                  {hasBonus && <Badge variant="secondary" className="text-xs px-1.5 py-0">Bonus</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Salary</div>
                <div className="font-semibold text-green-600">
                  {formatCurrencyWithLocale(emp.baseSalary, countryCode, locale, currency)}
                </div>
              </div>
              {showSales && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Sales</div>
                  <div className="font-semibold text-blue-600">
                    {formatCurrencyWithLocale(salesValue, countryCode, locale, currency)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact Employee Grid
function CompactEmployeeGrid({
  employees,
  countryCode,
  locale,
  currency
}: {
  employees: Employee[];
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {employees.map(emp => {
        const hasSales = emp.monthlySales && emp.monthlySales.length > 0;
        const hasBonus = emp.bonuses && emp.bonuses.length > 0;

        return (
          <div key={emp.id} className="p-3 border-2 rounded-lg hover:border-primary transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
              <div className="flex gap-1">
                {hasSales && <Badge variant="secondary" className="text-xs px-1.5 py-0">$</Badge>}
                {hasBonus && <Badge variant="secondary" className="text-xs px-1.5 py-0">★</Badge>}
              </div>
            </div>
            <div className="font-medium text-sm mb-1 truncate">{emp.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{emp.department}</div>
            <div className="text-sm font-semibold text-green-600">
              {formatCurrencyWithLocale(emp.baseSalary, countryCode, locale, currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
