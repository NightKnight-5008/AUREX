import type { Employee, EmployeeBonus, FinancialTransaction, PayrollEmployee } from '@/types/financial';

/**
 * Generate a unique 6-digit employee ID based on name hash
 */
function generateEmployeeId(name: string, index: number): string {
  // Create a simple hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Ensure positive number and make it 6 digits
  const baseId = Math.abs(hash % 900000) + 100000;

  // Add index to ensure uniqueness if multiple people have same name
  return String(baseId + index);
}

/**
 * Extract and aggregate employee data from payroll transactions
 */
export function extractEmployeesFromTransactions(
  transactions: FinancialTransaction[],
  countryCode: string = 'US'
): Employee[] {
  // Filter payroll transactions that have employee data
  const payrollTransactions = transactions.filter(
    t => t.type === 'payroll' && t.payrollEmployees && t.payrollEmployees.length > 0
  );

  if (payrollTransactions.length === 0) {
    return [];
  }

  // PASS 1: Generate employee IDs for all unique employees first
  const employeeIdMap = new Map<string, string>();
  let idIndex = 0;

  payrollTransactions.forEach((transaction) => {
    transaction.payrollEmployees?.forEach((payrollEmp: PayrollEmployee) => {
      const key = payrollEmp.name.toLowerCase().trim();
      if (!employeeIdMap.has(key)) {
        const employeeId = generateEmployeeId(payrollEmp.name, idIndex);
        employeeIdMap.set(key, employeeId);
        idIndex++;
      }
    });
  });

  // PASS 2: Aggregate employee data with correct IDs
  const employeeMap = new Map<string, {
    employeeId: string;
    name: string;
    department: string;
    baseSalary: number;
    bonuses: EmployeeBonus[];
    hireDate: Date;
    salaryCount: number;
  }>();

  payrollTransactions.forEach((transaction) => {
    transaction.payrollEmployees?.forEach((payrollEmp: PayrollEmployee) => {
      const key = payrollEmp.name.toLowerCase().trim();
      const correctEmployeeId = employeeIdMap.get(key)!;

      if (employeeMap.has(key)) {
        // Employee exists - check if this is a bonus or regular salary
        const existing = employeeMap.get(key)!;

        // If the amount is significantly different from base salary, treat as bonus
        const avgSalary = existing.baseSalary;
        const amountDiff = Math.abs(payrollEmp.amount - avgSalary);
        const isBonus = amountDiff > avgSalary * 0.2; // More than 20% difference suggests bonus

        if (isBonus) {
          // This is likely a bonus payment - use correct employee ID
          existing.bonuses.push({
            id: `bonus-${transaction.id}-${correctEmployeeId}`,
            employeeId: correctEmployeeId, // ✅ Uses generated employee ID
            amount: payrollEmp.amount,
            date: transaction.date,
            reason: transaction.description.includes('Bonus')
              ? transaction.description
              : `Bonus payment - ${transaction.category}`,
          });
        } else {
          // Regular salary - update running average
          existing.salaryCount += 1;
          existing.baseSalary = Math.round(
            (existing.baseSalary * (existing.salaryCount - 1) + payrollEmp.amount) / existing.salaryCount
          );
        }

        // Update department if provided and different
        if (payrollEmp.department && payrollEmp.department !== existing.department) {
          existing.department = payrollEmp.department;
        }
      } else {
        // New employee - initialize with correct ID
        employeeMap.set(key, {
          employeeId: correctEmployeeId,
          name: payrollEmp.name,
          department: payrollEmp.department || 'General',
          baseSalary: payrollEmp.amount,
          bonuses: [],
          hireDate: transaction.date,
          salaryCount: 1,
        });
      }
    });
  });

  // Convert map to Employee array
  const employees: Employee[] = [];

  employeeMap.forEach((data, key) => {
    employees.push({
      id: `emp-${data.employeeId}`,
      employeeId: data.employeeId,
      name: data.name,
      baseSalary: data.baseSalary,
      department: data.department,
      hireDate: data.hireDate,
      bonuses: data.bonuses.length > 0 ? data.bonuses : undefined,
      monthlySales: undefined, // Sales data would come from different source
    });
  });

  // Sort by base salary descending
  return employees.sort((a, b) => b.baseSalary - a.baseSalary);
}

/**
 * Calculate payroll metrics from employee data
 */
export function calculatePayrollMetrics(employees: Employee[]) {
  const totalBaseSalaries = employees.reduce((sum, emp) => sum + emp.baseSalary, 0);

  const totalBonuses = employees.reduce((sum, emp) => {
    if (!emp.bonuses) return sum;
    return sum + emp.bonuses.reduce((bonusSum, bonus) => bonusSum + bonus.amount, 0);
  }, 0);

  const employeeCount = employees.length;
  const avgSalary = employeeCount > 0 ? totalBaseSalaries / employeeCount : 0;

  // Get employees with bonuses this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const employeesWithBonuses = employees.filter(emp =>
    emp.bonuses && emp.bonuses.some(bonus => {
      const bonusDate = new Date(bonus.date);
      return bonusDate.getMonth() === currentMonth &&
             bonusDate.getFullYear() === currentYear;
    })
  ).length;

  return {
    totalBaseSalaries,
    totalBonuses,
    totalPayroll: totalBaseSalaries + totalBonuses,
    employeeCount,
    avgSalary,
    employeesWithBonuses,
  };
}

/**
 * Get department summary statistics
 */
export function getDepartmentSummary(employees: Employee[]) {
  const deptMap = new Map<string, {
    count: number;
    totalSalary: number;
    employees: string[];
  }>();

  employees.forEach(emp => {
    const dept = emp.department;
    if (deptMap.has(dept)) {
      const existing = deptMap.get(dept)!;
      existing.count += 1;
      existing.totalSalary += emp.baseSalary;
      existing.employees.push(emp.name);
    } else {
      deptMap.set(dept, {
        count: 1,
        totalSalary: emp.baseSalary,
        employees: [emp.name],
      });
    }
  });

  const summary: Array<{
    department: string;
    employeeCount: number;
    totalSalary: number;
    avgSalary: number;
    employees: string[];
  }> = [];

  deptMap.forEach((data, dept) => {
    summary.push({
      department: dept,
      employeeCount: data.count,
      totalSalary: data.totalSalary,
      avgSalary: data.totalSalary / data.count,
      employees: data.employees,
    });
  });

  return summary.sort((a, b) => b.totalSalary - a.totalSalary);
}
