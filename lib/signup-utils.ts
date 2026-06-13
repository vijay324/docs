// Signup flow utilities and constants

import type { SignupOrganizationData, SignupUserData } from '@/types';

// Storage key for signup data
const SIGNUP_STORAGE_KEY = 'flotick_signup_data';

// Industry options
export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Consulting',
  'Marketing',
  'Legal',
  'Media & Entertainment',
  'Non-Profit',
  'Government',
  'Other'
] as const;

// Primary use case options
export const USE_CASE_OPTIONS = [
  'Task & Project Tracking',
  'Internal Operations',
  'Client Work Management',
  'Team Collaboration',
  'Agile Development',
  'Product Management',
  'Customer Support',
  'Sales Operations',
  'HR & Recruitment',
  'Other'
] as const;

// Referral source options
export const REFERRAL_OPTIONS = [
  'Google Search',
  'Social Media',
  'Friend or Colleague',
  'Blog or Article',
  'YouTube',
  'LinkedIn',
  'Product Hunt',
  'Other'
] as const;

// Common countries list (top 50)
export const COUNTRY_OPTIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'China',
  'Brazil',
  'South Korea',
  'Italy',
  'Spain',
  'Mexico',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Singapore',
  'United Arab Emirates',
  'Saudi Arabia',
  'South Africa',
  'Indonesia',
  'Poland',
  'Belgium',
  'Russia',
  'Ireland',
  'New Zealand',
  'Israel',
  'Norway',
  'Denmark',
  'Finland',
  'Austria',
  'Portugal',
  'Czech Republic',
  'Malaysia',
  'Philippines',
  'Thailand',
  'Vietnam',
  'Argentina',
  'Chile',
  'Colombia',
  'Nigeria',
  'Egypt',
  'Kenya',
  'Turkey',
  'Ukraine',
  'Pakistan',
  'Bangladesh',
  'Other'
] as const;

// Timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'EST (Eastern Standard Time)' },
  { value: 'America/Chicago', label: 'CST (Central Standard Time)' },
  { value: 'America/Denver', label: 'MST (Mountain Standard Time)' },
  { value: 'America/Los_Angeles', label: 'PST (Pacific Standard Time)' },
  { value: 'America/Sao_Paulo', label: 'BRT (Brazil Time)' },
  { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Europe/Paris', label: 'CET (Central European Time)' },
  { value: 'Europe/Moscow', label: 'MSK (Moscow Standard Time)' },
  { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)' },
  { value: 'Asia/Kolkata', label: 'IST (India Standard Time)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore Time)' },
  { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' },
  { value: 'Asia/Shanghai', label: 'CST (China Standard Time)' },
  { value: 'Australia/Sydney', label: 'AEST (Australian Eastern Time)' },
  { value: 'Pacific/Auckland', label: 'NZST (New Zealand Standard Time)' }
] as const;

// Save Step 1 data to sessionStorage
export function saveSignupData(data: SignupOrganizationData): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(data));
  }
}

// Load Step 1 data from sessionStorage
export function loadSignupData(): SignupOrganizationData | null {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(SIGNUP_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as SignupOrganizationData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Clear signup data from sessionStorage
export function clearSignupData(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SIGNUP_STORAGE_KEY);
  }
}

// Check if Step 1 data exists
export function hasSignupData(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SIGNUP_STORAGE_KEY) !== null;
  }
  return false;
}

// Storage key for user signup data (Step 1 now)
const USER_SIGNUP_STORAGE_KEY = 'flotick_user_signup_data';

// Save User data (Step 1) to sessionStorage
export function saveSignupUserData(data: SignupUserData): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_SIGNUP_STORAGE_KEY, JSON.stringify(data));
  }
}

// Load User data (Step 1) from sessionStorage
export function loadSignupUserData(): SignupUserData | null {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(USER_SIGNUP_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as SignupUserData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Clear User data from sessionStorage
export function clearSignupUserData(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_SIGNUP_STORAGE_KEY);
  }
}

// Check if User data exists
export function hasSignupUserData(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(USER_SIGNUP_STORAGE_KEY) !== null;
  }
  return false;
}
