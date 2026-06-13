import { useEffect, useCallback, useRef } from 'react';
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { FormStorage, type FormStorageOptions } from '../../lib/form-storage';

export interface UsePersistentFormOptions<T extends FieldValues> extends Omit<FormStorageOptions, 'formKey'> {
  /** Unique key for the form */
  formKey: string;
  /** Form instance from react-hook-form */
  form: UseFormReturn<T>;
  /** Whether to enable persistence (default: true) */
  enabled?: boolean;
  /** Debounce delay for saving in milliseconds (default: 500) */
  saveDelay?: number;
  /** Callback when data is restored from storage */
  onRestore?: (data: Partial<T>) => void;
  /** Callback when data is saved to storage */
  onSave?: (data: T) => void;
  /** Fields to watch for changes (if not provided, watches all fields) */
  watchFields?: Path<T>[];
}

/**
 * Hook for persistent form state across page refreshes and navigation
 * Automatically saves form data to localStorage and restores it when the component mounts
 */
export function usePersistentForm<T extends FieldValues>(
  options: UsePersistentFormOptions<T>
) {
  const {
    formKey,
    form,
    enabled = true,
    saveDelay = 500,
    ttl = 24 * 60 * 60 * 1000, // 24 hours
    clearOnSubmit = true,
    excludeFields = [],
    serializers,
    onRestore,
    onSave,
    watchFields
  } = options;

  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false);

  // Watch form values for changes
  const watchedValues = watchFields ? form.watch(watchFields) : form.watch();

  /**
   * Save form data to storage with debouncing
   */
  const saveFormData = useCallback((data: T) => {
    if (!enabled || isRestoringRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      FormStorage.save(formKey, data, {
        ttl,
        excludeFields,
        serializers
      });
      onSave?.(data);
    }, saveDelay);
  }, [enabled, formKey, ttl, excludeFields, serializers, saveDelay, onSave]);

  /**
   * Restore form data from storage
   */
  const restoreFormData = useCallback(() => {
    if (!enabled || hasRestoredRef.current) return;

    const storedData = FormStorage.load(formKey, { serializers });
    if (storedData) {
      isRestoringRef.current = true;
      
      // Reset form with stored data, preserving existing default values
      const currentValues = form.getValues();
      const mergedData = { ...currentValues, ...storedData };
      
      form.reset(mergedData);
      onRestore?.(storedData as Partial<T>);
      
      isRestoringRef.current = false;
    }
    
    hasRestoredRef.current = true;
  }, [enabled, formKey, form, serializers, onRestore]);

  /**
   * Clear stored form data
   */
  const clearStoredData = useCallback(() => {
    FormStorage.clear(formKey);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [formKey]);

  /**
   * Manually save current form data
   */
  const saveNow = useCallback(() => {
    if (!enabled) return;
    
    const currentData = form.getValues();
    FormStorage.save(formKey, currentData, {
      ttl,
      excludeFields,
      serializers
    });
    onSave?.(currentData);
  }, [enabled, form, formKey, ttl, excludeFields, serializers, onSave]);

  /**
   * Check if there is stored data available
   */
  const hasStoredData = useCallback(() => {
    const storedData = FormStorage.load(formKey, { serializers });
    return storedData !== null && Object.keys(storedData).length > 0;
  }, [formKey, serializers]);

  // Restore data on mount
  useEffect(() => {
    restoreFormData();
  }, [restoreFormData]);

  // Save data when form values change
  useEffect(() => {
    if (hasRestoredRef.current && enabled) {
      const currentData = form.getValues();
      saveFormData(currentData);
    }
  }, [watchedValues, saveFormData, form, enabled]);

  // Handle form submission
  const originalHandleSubmit = form.handleSubmit;
  const handleSubmit = useCallback(
    (onValid: (data: T) => void | Promise<void>, onInvalid?: (errors: any) => void) => {
      return originalHandleSubmit(async (data) => {
        try {
          await onValid(data);
          // Clear stored data on successful submission if enabled
          if (clearOnSubmit) {
            clearStoredData();
          }
        } catch (error) {
          // Don't clear data if submission failed
          throw error;
        }
      }, onInvalid);
    },
    [originalHandleSubmit, clearOnSubmit, clearStoredData]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    /** Enhanced handleSubmit that clears storage on successful submission */
    handleSubmit,
    /** Manually clear stored form data */
    clearStoredData,
    /** Manually save current form data */
    saveNow,
    /** Check if there is stored data available */
    hasStoredData,
    /** Restore form data from storage */
    restoreFormData
  };
}
