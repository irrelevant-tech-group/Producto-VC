// server/storage/utils/validation.ts

/**
 * Checks if a string is a valid UUID format
 */
export function isValidUUID(id: string): boolean {
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
  
  /**
   * Safely converts a value to a string for database storage
   */
  export function safeStringify(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Error stringifying value:', error);
      return null;
    }
  }
  
  /**
   * Safely parses a JSON string
   */
  export function safeParse(value: string | null): any {
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }