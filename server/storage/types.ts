// server/storage/types.ts

// Tipo para consultas AI
export interface AiQuery {
    id: string;
    question: string;
    answer: string;
    sources: any[];
    startupId?: string;
    userId?: number;
    processingTimeMs: number;
    metadata?: Record<string, any>;
    createdAt: Date;
  }
  
  export interface InsertAiQuery {
    question: string;
    answer: string;
    sources: any[];
    startupId?: string;
    userId?: number;
    processingTimeMs: number;
    metadata?: Record<string, any>;
    fundId?: string; // Añadido para Clerk
  }
  
  // Tipo para historial de consultas
  export interface QueryHistoryOptions {
    limit?: number;
    startupId?: string;
    userId?: number;
    fromDate?: Date;
    toDate?: Date;
    fundId?: string;
  }