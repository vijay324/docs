import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Add type guard for string values
export function useDebouncedString(value: string, delay: number): string {
  return useDebounce(value, delay);
}

// Add type guard for number values  
export function useDebouncedNumber(value: number, delay: number): number {
  return useDebounce(value, delay);
}