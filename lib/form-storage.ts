/**
 * Form State Storage Utility
 * Handles persistent form state across page refreshes and navigation
 * Supports all field types with proper serialization/deserialization
 */

export interface FormStorageOptions {
  /** Unique key for the form */
  formKey: string;
  /** TTL in milliseconds (default: 24 hours) */
  ttl?: number;
  /** Whether to clear storage on successful submission */
  clearOnSubmit?: boolean;
  /** Fields to exclude from persistence */
  excludeFields?: string[];
  /** Custom serializers for specific field types */
  serializers?: Record<string, {
    serialize: (value: any) => string;
    deserialize: (value: string) => any;
  }>;
}

interface StoredFormData {
  data: Record<string, any>;
  timestamp: number;
  ttl: number;
}

class FormStorage {
  private static readonly STORAGE_PREFIX = 'form_state_';
  
  /**
   * Save form data to localStorage
   */
  static save(formKey: string, data: Record<string, any>, options: Omit<FormStorageOptions, 'formKey'> = {}): void {
    if (typeof window === 'undefined') return;
    
    const { ttl = 24 * 60 * 60 * 1000, excludeFields = [] } = options;
    
    try {
      // Filter out excluded fields
      const filteredData = Object.keys(data).reduce((acc, key) => {
        if (!excludeFields.includes(key)) {
          acc[key] = data[key];
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Serialize the data
      const serializedData = this.serializeFormData(filteredData, options.serializers);
      
      const storageData: StoredFormData = {
        data: serializedData,
        timestamp: Date.now(),
        ttl
      };
      
      localStorage.setItem(
        `${this.STORAGE_PREFIX}${formKey}`,
        JSON.stringify(storageData)
      );
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }
  
  /**
   * Load form data from localStorage
   */
  static load(formKey: string, options: Omit<FormStorageOptions, 'formKey'> = {}): Record<string, any> | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${formKey}`);
      if (!stored) return null;
      
      const storageData: StoredFormData = JSON.parse(stored);
      
      // Check if data has expired
      if (Date.now() - storageData.timestamp > storageData.ttl) {
        this.clear(formKey);
        return null;
      }
      
      // Deserialize the data
      return this.deserializeFormData(storageData.data, options.serializers);
    } catch (error) {
      console.warn('Failed to load form data:', error);
      this.clear(formKey);
      return null;
    }
  }
  
  /**
   * Clear form data from localStorage
   */
  static clear(formKey: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${formKey}`);
    } catch (error) {
      console.warn('Failed to clear form data:', error);
    }
  }
  
  /**
   * Clear all expired form data
   */
  static clearExpired(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.STORAGE_PREFIX)
      );
      
      keys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const storageData: StoredFormData = JSON.parse(stored);
            if (Date.now() - storageData.timestamp > storageData.ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired form data:', error);
    }
  }
  
  /**
   * Get all stored form keys
   */
  static getStoredFormKeys(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .map(key => key.replace(this.STORAGE_PREFIX, ''));
    } catch {
      return [];
    }
  }
  
  /**
   * Serialize form data with support for different field types
   */
  private static serializeFormData(
    data: Record<string, any>, 
    customSerializers?: Record<string, { serialize: (value: any) => string }>
  ): Record<string, any> {
    const serialized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      // Use custom serializer if available
      if (customSerializers?.[key]) {
        serialized[key] = {
          __type: 'custom',
          __value: customSerializers[key].serialize(value)
        };
        return;
      }
      
      // Handle different data types
      if (value === null || value === undefined) {
        serialized[key] = { __type: 'null', __value: value };
      } else if (value instanceof Date) {
        serialized[key] = { __type: 'date', __value: value.toISOString() };
      } else if (value instanceof File) {
        // Files cannot be serialized, skip them
        return;
      } else if (value instanceof FileList) {
        // FileList cannot be serialized, skip them
        return;
      } else if (Array.isArray(value)) {
        serialized[key] = { 
          __type: 'array', 
          __value: value.map(item => 
            typeof item === 'object' ? this.serializeFormData(item, customSerializers) : item
          )
        };
      } else if (typeof value === 'object') {
        serialized[key] = { 
          __type: 'object', 
          __value: this.serializeFormData(value, customSerializers) 
        };
      } else {
        serialized[key] = { __type: 'primitive', __value: value };
      }
    });
    
    return serialized;
  }
  
  /**
   * Deserialize form data with support for different field types
   */
  private static deserializeFormData(
    data: Record<string, any>, 
    customSerializers?: Record<string, { deserialize: (value: string) => any }>
  ): Record<string, any> {
    const deserialized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, serializedValue]) => {
      if (!serializedValue || typeof serializedValue !== 'object' || !serializedValue.__type) {
        // Fallback for non-serialized values
        deserialized[key] = serializedValue;
        return;
      }
      
      const { __type, __value } = serializedValue;
      
      switch (__type) {
        case 'custom':
          if (customSerializers?.[key]) {
            deserialized[key] = customSerializers[key].deserialize(__value);
          }
          break;
        case 'null':
          deserialized[key] = __value;
          break;
        case 'date':
          deserialized[key] = new Date(__value);
          break;
        case 'array':
          deserialized[key] = __value.map((item: any) => 
            typeof item === 'object' && item.__type ? 
              this.deserializeFormData({ temp: item }, customSerializers).temp : 
              item
          );
          break;
        case 'object':
          deserialized[key] = this.deserializeFormData(__value, customSerializers);
          break;
        case 'primitive':
        default:
          deserialized[key] = __value;
          break;
      }
    });
    
    return deserialized;
  }
}

// Clean up expired data on module load
if (typeof window !== 'undefined') {
  FormStorage.clearExpired();
}

export { FormStorage };
