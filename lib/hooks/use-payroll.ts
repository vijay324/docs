import useSWR from 'swr';
import { useState } from 'react';
import apiClient from '../api';
import { ApiResponse } from '@/utils/types';

// Align with React Query: reduce duplicate requests and avoid refetch on tab focus
const SWR_OPTIONS = {
  dedupingInterval: 2 * 60 * 1000, // 2 min - same as React Query staleTime
  revalidateOnFocus: false,
} as const;

// Types for payroll data
export interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  category: 'fixed' | 'variable' | 'formula';
  calculationType: 'fixed' | 'percentage' | 'formula';
  value: number;
  percentageOf?: 'basic' | 'gross' | 'ctc';
  formula?: string;
  isTaxable: boolean;
  isStatutory: boolean;
  isActive: boolean;
  order: number;
}

export interface SalaryStructure {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  effectiveFrom: Date;
  components: SalaryComponent[];
  pfEnabled: boolean;
  pfEmployeePercentage: number;
  pfEmployerPercentage: number;
  esiEnabled: boolean;
  esiEmployeePercentage: number;
  esiEmployerPercentage: number;
  professionalTaxEnabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
  branchName?: string;
}

export interface EmployeeCompensation {
  _id: string;
  employeeId: any;
  organizationId: string;
  salaryStructureId: any;
  annualCTC: number;
  monthlyGross: number;
  basicSalary: number;
  currency: string;
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
  effectiveFrom: Date;
  effectiveTo?: Date;
  bankDetails: BankDetails;
  taxRegime: 'old' | 'new';
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;
  panNumber?: string;
  isActive: boolean;
  maskedAccountNumber?: string;
  dailyRate?: number;
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRun {
  _id: string;
  organizationId: string;
  payPeriod: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  status: 'draft' | 'processing' | 'pending_approval' | 'approved' | 'finalized' | 'cancelled';
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalStatutoryDeductions: number;
  totalTaxDeducted: number;
  processedBy: any;
  processedAt: Date;
  approvedBy?: any;
  approvedAt?: Date;
  finalizedBy?: any;
  finalizedAt?: Date;
  payPeriodLabel?: string;
  statusLabel?: string;
  averageNetSalary?: number;
  payrollEntries: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollStats {
  totalEmployees: number;
  totalStructures: number;
  payrollRunsCount: number;
  finalizedRunsCount: number;
  totalPayrollCost: number;
  pendingLoans: number;
  activeLoans: number;
  year: number;
}

// Fetcher functions
const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

// ==================== SALARY STRUCTURES ====================

export function useSalaryStructures() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<SalaryStructure[]>>(
    '/payroll/salary-structures',
    fetcher,
    SWR_OPTIONS
  );

  return {
    structures: data?.data || [],
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function useSalaryStructure(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<SalaryStructure>>(
    id ? `/payroll/salary-structures/${id}` : null,
    fetcher,
    SWR_OPTIONS
  );

  return {
    structure: data?.data,
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function useSalaryStructureActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStructure = async (data: Partial<SalaryStructure>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/payroll/salary-structures', data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salary structure');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStructure = async (id: string, data: Partial<SalaryStructure>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.put(`/payroll/salary-structures/${id}`, data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update salary structure');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStructure = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.delete(`/payroll/salary-structures/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete salary structure');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createStructure,
    updateStructure,
    deleteStructure,
    isLoading,
    error
  };
}

// ==================== EMPLOYEE COMPENSATION ====================

export function useEmployeeCompensations(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = `/payroll/compensation${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<any>>(
    url,
    fetcher,
    SWR_OPTIONS
  );

  return {
    compensations: data?.data || [],
    total: (data as any)?.total || 0,
    totalPages: (data as any)?.totalPages || 0,
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function useEmployeeCompensation(employeeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EmployeeCompensation>>(
    employeeId ? `/payroll/compensation/${employeeId}` : null,
    fetcher,
    SWR_OPTIONS
  );

  return {
    compensation: data?.data,
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function useCompensationActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsertCompensation = async (employeeId: string, data: Partial<EmployeeCompensation>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/payroll/compensation/${employeeId}`, data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save compensation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    upsertCompensation,
    isLoading,
    error
  };
}

// ==================== PAYROLL RUNS ====================

export function usePayrollRuns(filters?: { year?: number; status?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.year) queryParams.set('year', filters.year.toString());
  if (filters?.status) queryParams.set('status', filters.status);
  
  const queryString = queryParams.toString();
  const url = `/payroll/runs${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<PayrollRun[]>>(
    url,
    fetcher,
    SWR_OPTIONS
  );

  return {
    runs: data?.data || [],
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function usePayrollRun(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<PayrollRun>>(
    id ? `/payroll/runs/${id}` : null,
    fetcher,
    SWR_OPTIONS
  );

  return {
    run: data?.data,
    isLoading,
    isError: error,
    refetch: mutate
  };
}

export function usePayrollActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayrollRun = async (month: number, year: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/payroll/runs', { month, year });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payroll run');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const approvePayrollRun = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.put(`/payroll/runs/${id}/approve`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve payroll');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const finalizePayrollRun = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.put(`/payroll/runs/${id}/finalize`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize payroll');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPayrollRun,
    approvePayrollRun,
    finalizePayrollRun,
    isLoading,
    error
  };
}

// ==================== PAYROLL STATS ====================

export function usePayrollStats(year?: number) {
  const url = year ? `/payroll/stats?year=${year}` : '/payroll/stats';
  
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<PayrollStats>>(
    url,
    fetcher,
    SWR_OPTIONS
  );

  return {
    stats: data?.data,
    isLoading,
    isError: error,
    refetch: mutate
  };
}
