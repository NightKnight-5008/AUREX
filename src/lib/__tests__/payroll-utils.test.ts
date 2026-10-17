import { describe, it, expect } from 'vitest';
import { extractEmployeesFromTransactions } from '../payroll-utils';
import type { FinancialTransaction } from '@/types/financial';

describe('Payroll Utils - Employee Extraction', () => {
  it('should extract single employee from payroll transaction', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'Monthly payroll',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          {
            id: 'pe-1',
            name: 'Sarah Chen',
            amount: 8000,
            department: 'Engineering',
          },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    expect(employees[0].name).toBe('Sarah Chen');
    expect(employees[0].baseSalary).toBe(8000);
    expect(employees[0].department).toBe('Engineering');
    expect(employees[0].employeeId).toMatch(/^\d{6}$/); // 6 digits
  });

  it('should generate consistent employee IDs for same name', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'January payroll',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'February payroll',
        date: new Date('2024-02-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-2', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    expect(employees[0].name).toBe('Sarah Chen');
    expect(employees[0].baseSalary).toBe(8000);
  });

  it('should detect bonuses correctly and link to employee ID', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'Monthly salary',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 2000,
        category: 'Bonuses',
        description: 'Performance Bonus',
        date: new Date('2024-01-15'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-2', name: 'Sarah Chen', amount: 2000, department: 'Engineering' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    expect(employees[0].baseSalary).toBe(8000);
    expect(employees[0].bonuses).toBeDefined();
    expect(employees[0].bonuses).toHaveLength(1);

    // CRITICAL: Bonus employeeId should match employee's ID
    expect(employees[0].bonuses![0].employeeId).toBe(employees[0].employeeId);
    expect(employees[0].bonuses![0].amount).toBe(2000);
  });

  it('should average multiple salary entries', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'January',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 8500,
        category: 'Salaries',
        description: 'February with raise',
        date: new Date('2024-02-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-2', name: 'Sarah Chen', amount: 8500, department: 'Engineering' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    // Average of 8000 and 8500
    expect(employees[0].baseSalary).toBe(8250);
  });

  it('should handle multiple employees correctly', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 15000,
        category: 'Salaries',
        description: 'Team payroll',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
          { id: 'pe-2', name: 'Michael Brown', amount: 7000, department: 'Sales' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(2);

    // Sorted by salary descending
    expect(employees[0].name).toBe('Sarah Chen');
    expect(employees[0].baseSalary).toBe(8000);
    expect(employees[1].name).toBe('Michael Brown');
    expect(employees[1].baseSalary).toBe(7000);

    // Each should have unique employee ID
    expect(employees[0].employeeId).not.toBe(employees[1].employeeId);
    expect(employees[0].employeeId).toMatch(/^\d{6}$/);
    expect(employees[1].employeeId).toMatch(/^\d{6}$/);
  });

  it('should track hire date as first transaction date', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'January',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'February',
        date: new Date('2024-02-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-2', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    expect(employees[0].hireDate.toISOString()).toBe(new Date('2024-01-01').toISOString());
  });

  it('should update department to latest value', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 8000,
        category: 'Salaries',
        description: 'January',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
        ],
      },
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 8500,
        category: 'Salaries',
        description: 'February - Promoted',
        date: new Date('2024-02-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-2', name: 'Sarah Chen', amount: 8500, department: 'Management' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(1);
    expect(employees[0].department).toBe('Management');
  });

  it('should return empty array for non-payroll transactions', () => {
    const transactions: FinancialTransaction[] = [
      {
        id: 'txn-1',
        type: 'expense',
        amount: 5000,
        category: 'Office Supplies',
        description: 'Equipment',
        date: new Date('2024-01-01'),
        status: 'completed',
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(0);
  });

  it('should handle complex scenario: multiple employees with bonuses', () => {
    const transactions: FinancialTransaction[] = [
      // January payroll
      {
        id: 'txn-1',
        type: 'payroll',
        amount: 15000,
        category: 'Salaries',
        description: 'January payroll',
        date: new Date('2024-01-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-1', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
          { id: 'pe-2', name: 'Michael Brown', amount: 7000, department: 'Sales' },
        ],
      },
      // Bonus for Sarah
      {
        id: 'txn-2',
        type: 'payroll',
        amount: 2000,
        category: 'Bonuses',
        description: 'Q1 Performance Bonus',
        date: new Date('2024-01-15'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-3', name: 'Sarah Chen', amount: 2000, department: 'Engineering' },
        ],
      },
      // February payroll
      {
        id: 'txn-3',
        type: 'payroll',
        amount: 15000,
        category: 'Salaries',
        description: 'February payroll',
        date: new Date('2024-02-01'),
        status: 'completed',
        payrollEmployees: [
          { id: 'pe-4', name: 'Sarah Chen', amount: 8000, department: 'Engineering' },
          { id: 'pe-5', name: 'Michael Brown', amount: 7000, department: 'Sales' },
        ],
      },
    ];

    const employees = extractEmployeesFromTransactions(transactions);

    expect(employees).toHaveLength(2);

    const sarah = employees.find(e => e.name === 'Sarah Chen')!;
    const michael = employees.find(e => e.name === 'Michael Brown')!;

    expect(sarah).toBeDefined();
    expect(michael).toBeDefined();

    // Sarah should have base salary of 8000 (average of two 8000 entries)
    expect(sarah.baseSalary).toBe(8000);

    // Sarah should have 1 bonus
    expect(sarah.bonuses).toBeDefined();
    expect(sarah.bonuses).toHaveLength(1);
    expect(sarah.bonuses![0].amount).toBe(2000);

    // CRITICAL: Bonus should reference Sarah's employee ID
    expect(sarah.bonuses![0].employeeId).toBe(sarah.employeeId);

    // Michael should have no bonuses
    expect(michael.bonuses).toBeUndefined();
    expect(michael.baseSalary).toBe(7000);
  });
});
