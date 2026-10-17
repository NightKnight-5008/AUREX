import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lock, Unlock, DollarSign, TrendingUp, Users, Star, Upload, Edit2, Sparkles } from 'lucide-react';
import type { Employee, FinancialMetrics, PayrollKPIs } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/financial-data';
import { SecureStorage } from '@/lib/security/SecureStorage';
import { hashPin, verifyPin } from '@/lib/security/EncryptionService';
import { createPayrollSession, type SessionManager } from '@/lib/security/SessionManager';

interface PayrollTabProps {
  employees: Employee[];
  monthlyMetrics: FinancialMetrics[];
  countryCode: string;
  locale?: string;
  onUpdateEmployee?: (employeeId: string, updates: Partial<Employee>) => void;
}

export function PayrollTab({ employees, monthlyMetrics, countryCode, locale, onUpdateEmployee }: PayrollTabProps) {
  const [pin, setPin] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(true); // Will be updated after async check
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newSalary, setNewSalary] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSpreadsheet, setIsUploadingSpreadsheet] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session Manager State (for inactivity tracking)
  const sessionManagerRef = useRef<SessionManager | null>(null);

  // Calculate payroll KPIs
  const currentMonth = monthlyMetrics[monthlyMetrics.length - 1];
  const totalPayrollMonthly = currentMonth.totalPayroll;
  const totalPayrollYearly = monthlyMetrics.reduce((sum, m) => sum + m.totalPayroll, 0);
  const totalRevenue = monthlyMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
  const payrollPercentOfRevenue = totalRevenue > 0 ? (totalPayrollYearly / totalRevenue) * 100 : 0;

  // Calculate net payroll (simulated deductions of ~10%)
  const netPayroll = totalPayrollMonthly * 0.9;
  const payrollBurnRate = totalPayrollYearly / monthlyMetrics.length;

  const payrollKPIs: PayrollKPIs = {
    totalPayrollMonthly,
    totalPayrollYearly,
    payrollPercentOfRevenue,
    netPayroll,
    payrollBurnRate,
  };

  // Top 5 highest paid employees
  const topPaidEmployees = [...employees]
    .sort((a, b) => b.baseSalary - a.baseSalary)
    .slice(0, 5);

  // Employees with sales data
  const salesEmployees = employees.filter(emp => emp.monthlySales && emp.monthlySales.length > 0);

  // Payroll trend data
  const payrollTrendData = monthlyMetrics.map((m) => ({
    month: m.period.split('-')[1],
    payroll: m.totalPayroll,
    revenue: m.totalRevenue,
    percentage: m.totalRevenue > 0 ? (m.totalPayroll / m.totalRevenue) * 100 : 0,
  }));

  // Advanced AI Insights
  const generateAIInsights = () => {
    const insights: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; message: string; action?: string }> = [];

    // 1. Payroll-to-Revenue Ratio Analysis
    if (payrollPercentOfRevenue > 45) {
      insights.push({
        type: 'danger',
        title: 'High Payroll Ratio Alert',
        message: `Payroll is ${formatPercent(payrollPercentOfRevenue)} of revenue (optimal: 30-40%). Consider workforce optimization or revenue growth strategies.`,
        action: 'Review staffing levels and productivity metrics'
      });
    } else if (payrollPercentOfRevenue < 25) {
      insights.push({
        type: 'warning',
        title: 'Low Payroll Investment',
        message: `Payroll is only ${formatPercent(payrollPercentOfRevenue)} of revenue. Consider strategic hiring to scale operations.`,
        action: 'Explore talent acquisition opportunities'
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Optimal Payroll Ratio',
        message: `Payroll at ${formatPercent(payrollPercentOfRevenue)} of revenue is within healthy range (30-40%).`,
      });
    }

    // 2. Department Salary Distribution Analysis
    const deptSalaries = new Map<string, { total: number; count: number; avg: number }>();
    employees.forEach(emp => {
      const existing = deptSalaries.get(emp.department) || { total: 0, count: 0, avg: 0 };
      existing.total += emp.baseSalary;
      existing.count += 1;
      existing.avg = existing.total / existing.count;
      deptSalaries.set(emp.department, existing);
    });

    const avgCompanySalary = employees.length > 0
      ? employees.reduce((sum, e) => sum + e.baseSalary, 0) / employees.length
      : 0;

    deptSalaries.forEach((data, dept) => {
      const deviation = ((data.avg - avgCompanySalary) / avgCompanySalary) * 100;
      if (Math.abs(deviation) > 25) {
        insights.push({
          type: 'info',
          title: `${dept} Salary Variance`,
          message: `${dept} salaries are ${deviation > 0 ? 'above' : 'below'} company average by ${formatPercent(Math.abs(deviation))}. Avg: ${formatCurrency(data.avg, countryCode)}`,
          action: 'Review compensation equity'
        });
      }
    });

    // 3. Payroll Growth Trend
    if (payrollTrendData.length >= 3) {
      const recentMonths = payrollTrendData.slice(-3);
      const oldestRecent = recentMonths[0].payroll;
      const newestRecent = recentMonths[recentMonths.length - 1].payroll;
      const growthRate = oldestRecent > 0 ? ((newestRecent - oldestRecent) / oldestRecent) * 100 : 0;

      if (growthRate > 15) {
        insights.push({
          type: 'warning',
          title: 'Rapid Payroll Growth',
          message: `Payroll increased ${formatPercent(growthRate)} in last 3 months. Ensure revenue growth aligns.`,
          action: 'Monitor hiring ROI and productivity'
        });
      } else if (growthRate < -10) {
        insights.push({
          type: 'warning',
          title: 'Payroll Reduction Detected',
          message: `Payroll decreased ${formatPercent(Math.abs(growthRate))} recently. Monitor workforce morale.`,
          action: 'Review retention strategies'
        });
      }
    }

    // 4. Top Earner Concentration
    if (topPaidEmployees.length > 0 && employees.length > 0) {
      const top20PercentCount = Math.ceil(employees.length * 0.2);
      const top20Employees = [...employees].sort((a, b) => b.baseSalary - a.baseSalary).slice(0, top20PercentCount);
      const top20Total = top20Employees.reduce((sum, e) => sum + e.baseSalary, 0);
      const totalSalaries = employees.reduce((sum, e) => sum + e.baseSalary, 0);
      const top20Percent = totalSalaries > 0 ? (top20Total / totalSalaries) * 100 : 0;

      if (top20Percent > 50) {
        insights.push({
          type: 'info',
          title: 'High Salary Concentration',
          message: `Top 20% of employees account for ${formatPercent(top20Percent)} of payroll. Consider succession planning.`,
          action: 'Develop talent pipeline'
        });
      }
    }

    // 5. Bonus Distribution Analysis
    const employeesWithBonuses = employees.filter(e => e.bonuses && e.bonuses.length > 0);
    const bonusRate = employees.length > 0 ? (employeesWithBonuses.length / employees.length) * 100 : 0;

    if (bonusRate < 30 && employees.length > 10) {
      insights.push({
        type: 'info',
        title: 'Low Bonus Participation',
        message: `Only ${formatPercent(bonusRate)} of employees received bonuses. Consider performance incentive programs.`,
        action: 'Design bonus structure'
      });
    }

    // 6. Hiring Recommendations
    const revenuePerEmployee = employees.length > 0 ? totalRevenue / employees.length : 0;
    const industryBenchmark = 250000; // $250k revenue per employee (industry average)

    if (revenuePerEmployee > industryBenchmark * 1.5) {
      insights.push({
        type: 'success',
        title: 'High Employee Productivity',
        message: `Revenue per employee (${formatCurrency(revenuePerEmployee, countryCode)}) exceeds industry benchmark. Consider strategic expansion.`,
        action: 'Explore scaling opportunities'
      });
    } else if (revenuePerEmployee < industryBenchmark * 0.7) {
      insights.push({
        type: 'warning',
        title: 'Below Productivity Benchmark',
        message: `Revenue per employee (${formatCurrency(revenuePerEmployee, countryCode)}) below industry average. Focus on efficiency.`,
        action: 'Review processes and training'
      });
    }

    return insights.slice(0, 5); // Return top 5 most important insights
  };

  const aiInsights = useMemo(() => generateAIInsights(), [employees, monthlyMetrics, payrollPercentOfRevenue, countryCode]);

  // Focus the input when not unlocked - with multiple attempts for reliability
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

  const handleSalaryEdit = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setNewSalary(employee.baseSalary.toString());
  };

  const handleSalarySave = (employeeId: string) => {
    const salary = parseFloat(newSalary);
    if (!isNaN(salary) && salary > 0 && onUpdateEmployee) {
      onUpdateEmployee(employeeId, { baseSalary: salary });
    }
    setEditingEmployeeId(null);
    setNewSalary('');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingSpreadsheet(true);
    setUploadError(null);

    try {
      // Read file content
      const fileContent = await readFileAsText(file);

      // Process with AI to extract employee sales data
      const extractedData = await processSalesSpreadsheet(fileContent, file.name);

      // Update employees in the database/app
      if (extractedData.salesData && extractedData.salesData.length > 0) {
        let successCount = 0;
        const notFound: string[] = [];

        extractedData.salesData.forEach((salesUpdate: { employeeId: string; name?: string; salesValue: number; numberOfSales: number }) => {
          // Find employee by ID or name with fuzzy matching
          const existingEmployee = employees.find(e => {
            // Try exact employee ID match first
            if (e.employeeId === salesUpdate.employeeId) return true;

            // Try normalized name match
            if (salesUpdate.name) {
              const normalizedUpdateName = normalizeString(salesUpdate.name);
              const normalizedEmployeeName = normalizeString(e.name);

              // Exact normalized match
              if (normalizedEmployeeName === normalizedUpdateName) return true;

              // Partial match (contains)
              if (normalizedEmployeeName.includes(normalizedUpdateName) ||
                  normalizedUpdateName.includes(normalizedEmployeeName)) return true;
            }

            // Try normalized employeeId as name
            const normalizedEmployeeId = normalizeString(salesUpdate.employeeId);
            const normalizedEmployeeName = normalizeString(e.name);
            if (normalizedEmployeeName === normalizedEmployeeId) return true;
            if (normalizedEmployeeName.includes(normalizedEmployeeId) ||
                normalizedEmployeeId.includes(normalizedEmployeeName)) return true;

            return false;
          });

          if (existingEmployee && onUpdateEmployee) {
            // Get current month in YYYY-MM format
            const currentMonth = new Date().toISOString().slice(0, 7);

            // Update or add sales data for current month
            const existingSalesData = existingEmployee.monthlySales || [];
            const currentMonthIndex = existingSalesData.findIndex(s => s.month === currentMonth);

            let updatedMonthlySales: typeof existingSalesData;
            if (currentMonthIndex >= 0) {
              // Update existing month
              updatedMonthlySales = [...existingSalesData];
              updatedMonthlySales[currentMonthIndex] = {
                employeeId: existingEmployee.employeeId,
                month: currentMonth,
                salesValue: salesUpdate.salesValue,
                numberOfSales: salesUpdate.numberOfSales,
                updatedAt: new Date(),
              };
            } else {
              // Add new month
              updatedMonthlySales = [
                ...existingSalesData,
                {
                  employeeId: existingEmployee.employeeId,
                  month: currentMonth,
                  salesValue: salesUpdate.salesValue,
                  numberOfSales: salesUpdate.numberOfSales,
                  updatedAt: new Date(),
                }
              ];
            }

            onUpdateEmployee(existingEmployee.id, { monthlySales: updatedMonthlySales });
            successCount++;
            console.log('✅ Updated sales for:', existingEmployee.name, existingEmployee.employeeId, updatedMonthlySales);
          } else {
            notFound.push(salesUpdate.name || salesUpdate.employeeId);
          }
        });

        console.log('📊 Upload Summary:', {
          total: extractedData.salesData.length,
          successful: successCount,
          notFound: notFound.length,
          employees: employees.length
        });

        if (successCount > 0) {
          let message = `✅ Successfully updated ${successCount} employee sales record${successCount > 1 ? 's' : ''}`;
          if (notFound.length > 0) {
            message += `. Not found: ${notFound.join(', ')}`;
          }
          setUploadError(message);

          // Force a small delay to ensure state updates propagate
          setTimeout(() => {
            console.log('🔄 Sales employees after update:', employees.filter(e => e.monthlySales && e.monthlySales.length > 0));
          }, 100);
        } else {
          setUploadError(`❌ No matching employees found. Tried: ${notFound.join(', ')}`);
        }
      } else {
        setUploadError('No valid sales data found in the spreadsheet');
      }
    } catch (error) {
      console.error('Error processing spreadsheet:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process spreadsheet');
    } finally {
      setIsUploadingSpreadsheet(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const normalizeString = (str: string): string => {
    // Normalize string for fuzzy matching: lowercase, trim, collapse multiple spaces
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const processSalesSpreadsheet = async (content: string, filename: string): Promise<{
    salesData: Array<{ employeeId: string; name?: string; salesValue: number; numberOfSales: number }>;
  }> => {
    // Parse CSV/Excel format and extract employee sales data
    const lines = content.split('\n').filter(line => line.trim());
    const salesData: Array<{ employeeId: string; name?: string; salesValue: number; numberOfSales: number }> = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/[,\t;]/); // Support CSV, TSV, semicolon

      if (parts.length >= 2) {
        // Try to parse different formats:
        // Format 1: employeeId, salesValue, numberOfSales
        // Format 2: employeeId, name, salesValue, numberOfSales
        // Format 3: name, salesValue, numberOfSales

        let employeeId = '';
        let name = '';
        let salesValue = 0;
        let numberOfSales = 0;

        if (parts.length === 3) {
          // Could be: employeeId, salesValue, numberOfSales OR name, salesValue, numberOfSales
          const first = parts[0].trim();
          const second = parseFloat(parts[1].trim().replace(/[^0-9.]/g, ''));
          const third = parseInt(parts[2].trim().replace(/[^0-9]/g, ''), 10);

          if (!isNaN(second) && !isNaN(third)) {
            // Check if first part looks like an ID (contains numbers/dashes) or a name
            if (/^[A-Z0-9-]+$/i.test(first)) {
              employeeId = first;
            } else {
              name = first;
              employeeId = first; // Use name as fallback ID
            }
            salesValue = second;
            numberOfSales = third;
          }
        } else if (parts.length >= 4) {
          // Format: employeeId, name, salesValue, numberOfSales
          employeeId = parts[0].trim();
          name = parts[1].trim();
          const parsedSalesValue = parseFloat(parts[2].trim().replace(/[^0-9.]/g, ''));
          const parsedNumberOfSales = parseInt(parts[3].trim().replace(/[^0-9]/g, ''), 10);

          if (!isNaN(parsedSalesValue) && !isNaN(parsedNumberOfSales)) {
            salesValue = parsedSalesValue;
            numberOfSales = parsedNumberOfSales;
          }
        } else if (parts.length === 2) {
          // Just two columns: name/id, salesValue (assume 1 sale)
          const first = parts[0].trim();
          const second = parseFloat(parts[1].trim().replace(/[^0-9.]/g, ''));

          if (!isNaN(second) && second > 0) {
            if (/^[A-Z0-9-]+$/i.test(first)) {
              employeeId = first;
            } else {
              name = first;
              employeeId = first;
            }
            salesValue = second;
            numberOfSales = 1; // Default to 1 sale
          }
        }

        if (salesValue > 0 && (employeeId || name)) {
          salesData.push({
            employeeId: employeeId || name,
            name: name || undefined,
            salesValue,
            numberOfSales: numberOfSales > 0 ? numberOfSales : 1,
          });
        }
      }
    }

    if (salesData.length === 0) {
      throw new Error('Could not parse sales data from spreadsheet. Please ensure format: employeeId/name, salesValue, numberOfSales');
    }

    return { salesData };
  };


  // Check if there are any employees
  const hasEmployees = employees.length > 0;

  return (
    <div className="space-y-6 relative">
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
                  ? 'Create a 6-digit PIN to secure payroll and bonus actions'
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
              <p className="text-xs text-muted-foreground text-center mt-4">
                💡 You can switch to other tabs while this is locked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Management</h2>
          <p className="text-muted-foreground">Workforce cost control and performance tracking</p>
          {!hasEmployees && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              💡 No employees found. Add payroll transactions in the Overview tab to see employee data here.
            </p>
          )}
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

      {/* Payroll KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollKPIs.totalPayrollMonthly, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yearly Payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollKPIs.totalPayrollYearly, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 6 months annualized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payroll % of Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(payrollKPIs.payrollPercentOfRevenue)}</div>
            <Progress value={payrollKPIs.payrollPercentOfRevenue} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {payrollKPIs.payrollPercentOfRevenue > 40 ? 'Above optimal range' : 'Healthy range'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payroll Burn Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollKPIs.payrollBurnRate, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Trend (6 Months)</CardTitle>
          <CardDescription>Payroll costs and revenue relationship</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={payrollTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Payroll %') return formatPercent(Number(value));
                  return formatCurrency(Number(value), countryCode);
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="payroll" stroke="#8b5cf6" strokeWidth={2} name="Payroll" />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#ec4899" strokeWidth={2} name="Payroll %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll</CardTitle>
          <CardDescription>
            {isUnlocked ? 'Edit salaries by clicking the edit icon' : 'Unlock to edit salaries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead className="text-center">Bonus</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const hasBonus = employee.bonuses && employee.bonuses.length > 0;
                const isEditing = editingEmployeeId === employee.id;

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="font-mono text-sm">{employee.employeeId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.department}</Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing && isUnlocked ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newSalary}
                            onChange={(e) => setNewSalary(e.target.value)}
                            className="w-32"
                          />
                          <Button size="sm" onClick={() => handleSalarySave(employee.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingEmployeeId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className={!isUnlocked ? 'blur-sm' : ''}>
                          {formatCurrency(employee.baseSalary, countryCode)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasBonus && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="relative">
                              <Star className="w-5 h-5 fill-gradient-to-br from-pink-400 to-blue-400 text-pink-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Bonus Details - {employee.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              {employee.bonuses?.map((bonus) => (
                                <div key={bonus.id} className="p-3 rounded border">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{bonus.reason || 'Performance Bonus'}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(bonus.date).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="text-lg font-bold">
                                      {formatCurrency(bonus.amount, countryCode)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isUnlocked && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSalaryEdit(employee)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Highest Paid */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Highest Paid Employees</CardTitle>
            <CardDescription>By base salary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPaidEmployees.map((employee, index) => (
                <div key={employee.id} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-bold">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <p className="text-sm text-muted-foreground">{employee.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${!isUnlocked ? 'blur-sm' : ''}`}>
                      {formatCurrency(employee.baseSalary, countryCode)}
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {employee.employeeId}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales per Employee */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales per Employee</CardTitle>
                <CardDescription>Latest sales performance</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={isUploadingSpreadsheet || !isUnlocked}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingSpreadsheet ? 'Processing...' : 'Update'}
                </Button>
                {!isUnlocked && (
                  <p className="text-xs text-muted-foreground">Unlock to upload</p>
                )}
              </div>
            </div>
            {uploadError && (
              <div className={`mt-2 text-sm p-2 rounded ${
                uploadError.startsWith('✅')
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {uploadError}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {salesEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No sales data available. Upload employee sales data to view performance.
              </p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={salesEmployees.map(emp => {
                      // Get the most recent sales data
                      const latestSales = emp.monthlySales && emp.monthlySales.length > 0
                        ? emp.monthlySales.reduce((latest, current) =>
                            current.month > latest.month ? current : latest
                          )
                        : null;

                      return {
                        name: emp.name.split(' ')[0],
                        sales: latestSales?.salesValue || 0,
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value), countryCode)} />
                    <Bar dataKey="sales" fill="#8b5cf6" name="Sales Value" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {salesEmployees.map(employee => {
                    // Get the most recent sales data
                    const latestSales = employee.monthlySales && employee.monthlySales.length > 0
                      ? employee.monthlySales.reduce((latest, current) =>
                          current.month > latest.month ? current : latest
                        )
                      : null;

                    if (!latestSales) return null;

                    return (
                      <div key={employee.id} className="p-4 rounded-lg border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base">{employee.name}</span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {employee.employeeId}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{employee.department}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-primary">{formatCurrency(latestSales.salesValue, countryCode)}</div>
                            <div className="text-xs text-muted-foreground">{latestSales.month}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-semibold">{latestSales.numberOfSales} sales</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg: {formatCurrency(latestSales.salesValue / latestSales.numberOfSales, countryCode)}/sale
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-Powered Payroll Insights
            </CardTitle>
            <CardDescription>Advanced analytics and actionable recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'success'
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-500'
                      : insight.type === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500'
                      : insight.type === 'danger'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                      {insight.action && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {insight.action}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
