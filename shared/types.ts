// User-related types
export interface UserProfile {
  id: number;
  name: string;
  position: string;
  email: string;
}

// Document processing related types
export interface DocumentUploadRequest {
  startupId: string;
  type: 'pitch-deck' | 'financials' | 'legal' | 'tech' | 'market' | 'other';
}

export interface DocumentProcessingResult {
  documentId: string;
  startupId: string;
  status: 'completed' | 'failed';
  metadata: Record<string, any>;
  chunks?: number;
}

// Query & AI related types
export interface AiQueryRequest {
  startupId?: string;
  question: string;
  includeSourceDocuments?: boolean;
}

export interface AiQueryResponse {
  answer: string;
  sources?: Array<{
    documentId: string;
    documentName: string;
    content: string;
  }>;
}

// Investment memo related types
export interface MemoSection {
  title: string;
  content: string;
  sources?: Array<{
    documentId: string;
    content: string;
  }>;
  lastEdited?: string;
}

export interface MemoGenerationRequest {
  startupId: string;
  sections?: string[]; // Optional specific sections to generate, otherwise use default template
}

export interface MemoGenerationResponse {
  memoId: string;
  startupId: string;
  status: 'draft' | 'review' | 'final';
  sections: MemoSection[];
}

// Startup-related types
export interface StartupSummary {
  id: string;
  name: string;
  vertical: string;
  stage: string;
  location: string;
  amountSought: number;
  currency: string;
  status: string;
  alignmentScore?: number;
  documentsCount: number;
  completionPercentage: number;
  lastUpdated: string;
}

export interface DueDiligenceProgress {
  startupId: string;
  overallCompletion: number;
  categories: {
    [key: string]: {
      completion: number;
      required: number;
      uploaded: number;
    }
  };
}

// Dashboard metrics
export interface DashboardMetrics {
  totalStartups: number;
  activeDueDiligence: number;
  pendingMemos: number;
  docsProcessed: number;
  trendStartups: number;
  trendDD: number;
  trendMemos: number;
  trendDocs: number;
}

// Activity-related types
export interface ActivityItem {
  id: string;
  type: string;
  userId?: number;
  userName?: string;
  startupId?: string;
  startupName?: string;
  documentId?: string;
  documentName?: string;
  memoId?: string;
  timestamp: string;
  content?: string;
  metadata?: Record<string, any>;
}
