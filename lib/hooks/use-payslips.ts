import useSWR from 'swr';
import { useState } from 'react';
import apiClient from '../api';
import type { ApiResponse } from '@/utils/types';

// Align with React Query: reduce duplicate requests and avoid refetch on tab focus
const SWR_OPTIONS = {
  dedupingInterval: 2 * 60 * 1000, // 2 min
  revalidateOnFocus: false,
} as const;

// Types for payslip data
export interface PayslipEarning {
  name: string;
  amount: number;
}

export interface PayslipDeduction {
  name: string;
  amount: number;
}

export interface Payslip {
  _id: string;
  payrollEntryId: string;
  payrollRunId: string;
  employeeId: string;
  organizationId: string;
  payPeriod: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  employeeDetails: {
    name: string;
    employeeId: string;
    email: string;
    department: string;
    designation: string;
    dateOfJoining?: Date;
    bankName: string;
    accountNumber: string;
    panNumber?: string;
    uanNumber?: string;
  };
  earnings: PayslipEarning[];
  totalEarnings: number;
  deductions: PayslipDeduction[];
  totalDeductions: number;
  attendanceSummary: {
    daysInMonth: number;
    daysWorked: number;
    paidLeaves: number;
    unpaidLeaves: number;
    lopDays: number;
    holidays: number;
    overtimeHours: number;
  };
  summary: {
    grossEarnings: number;
    totalDeductions: number;
    netPayable: number;
  };
  ytdSummary: {
    grossEarnings: number;
    totalDeductions: number;
    netEarnings: number;
    pfContribution: number;
    taxDeducted: number;
  };
  statutoryDetails: {
    pfEmployee: number;
    pfEmployer: number;
    esiEmployee: number;
    esiEmployer: number;
    professionalTax: number;
    tds: number;
  };
  generatedAt: Date;
  pdfPath?: string;
  emailedAt?: Date;
  version: number;
  payPeriodLabel?: string;
  financialYear?: string;
  payslipNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fetcher function
const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

// ==================== MY PAYSLIPS (Employee View) ====================

export function useMyPayslips(year?: number) {
  const url = year ? `/payroll/payslips/my?year=${year}` : '/payroll/payslips/my';
  
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Payslip[]>>(
    url,
    fetcher,
    SWR_OPTIONS
  );

  return {
    payslips: data?.data || [],
    isLoading,
    isError: error,
    refetch: mutate
  };
}

// ==================== ALL PAYSLIPS (Admin View) ====================

export function usePayslips(filters?: { month?: number; year?: number; employeeId?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.month) queryParams.set('month', filters.month.toString());
  if (filters?.year) queryParams.set('year', filters.year.toString());
  if (filters?.employeeId) queryParams.set('employeeId', filters.employeeId);
  
  const queryString = queryParams.toString();
  const url = `/payroll/payslips${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Payslip[]>>(
    url,
    fetcher,
    SWR_OPTIONS
  );

  return {
    payslips: data?.data || [],
    isLoading,
    isError: error,
    refetch: mutate
  };
}

// ==================== SINGLE PAYSLIP ====================

export function usePayslip(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Payslip>>(
    id ? `/payroll/payslips/${id}` : null,
    fetcher,
    SWR_OPTIONS
  );

  return {
    payslip: data?.data,
    isLoading,
    isError: error,
    refetch: mutate
  };
}

// ==================== PAYSLIP ACTIONS ====================

export function usePayslipActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPayslip = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // For now, just get the payslip data
      // In the future, this could trigger PDF generation and download
      const response = await apiClient.get(`/payroll/payslips/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download payslip');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    downloadPayslip,
    isLoading,
    error
  };
}

// ==================== UTILITY FUNCTIONS ====================

export function formatPayPeriod(month: number, year: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[month - 1]} ${year}`;
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

export function getFinancialYear(month: number, year: number): string {
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}
