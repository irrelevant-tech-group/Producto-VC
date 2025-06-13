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

// Investment memo related types - ACTUALIZADO
export interface MemoSection {
  title: string;
  content: string;
  sources?: Array<{
    documentId: string;
    content: string;
  }>;
  lastEdited?: string;
  status?: 'draft' | 'review' | 'final' | 'approved' | 'rejected';
}

export interface MemoGenerationRequest {
  startupId: string;
  sections?: string[]; // Optional specific sections to generate, otherwise use default template
}

export interface MemoGenerationResponse {
  memoId: string;
  startupId: string;
  status: 'draft' | 'review' | 'final' | 'approved' | 'rejected';
  sections: MemoSection[];
}

// Startup-related types - ACTUALIZADO
export interface StartupSummary {
  id: string;
  name: string;
  vertical: string;
  stage: string;
  location: string;
  amountSought: number | null;
  valuation: number | null;
  currency: string;
  status: 'active' | 'invested' | 'standby' | 'declined' | 'archived';
  alignmentScore?: number;
  documentsCount: number;
  completionPercentage: number;
  lastUpdated: string;
  fundId?: string | null;
  investmentDate?: string | null;
  investmentAmount?: number | null;
  ownershipPercentage?: number | null;
  decisionReason?: string | null;
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

export interface DueDiligenceCategory {
  key: string;
  name: string;
  required: number;
  importance: 'high' | 'medium' | 'low';
  description: string;
  order: number;
  documentTypes?: string[];
  isDefault: boolean;
}

export interface DueDiligenceTemplate {
  id: string;
  fundId: string;
  name: string;
  isActive: boolean;
  categories: DueDiligenceCategory[];
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface InsertDueDiligenceTemplate {
  fundId: string;
  name: string;
  categories: DueDiligenceCategory[];
  isActive?: boolean;
  createdBy?: number;
}

// Nuevo tipo para tracking de inversiones
export interface InvestmentDetails {
  startupId: string;
  startupName: string;
  investmentDate: string;
  investmentAmount: number;
  valuation: number;
  ownershipPercentage: number;
  currency: string;
  stage: string;
  vertical: string;
}

// Nuevo tipo para estadísticas de inversión
export interface InvestmentStats {
  totalInvestments: number;
  totalAmountInvested: number;
  averageInvestment: number;
  portfolioCompanies: number;
  byStage: {
    [stage: string]: {
      count: number;
      totalAmount: number;
    }
  };
  byVertical: {
    [vertical: string]: {
      count: number;
      totalAmount: number;
    }
  };
  byStatus: {
    active: number;
    invested: number;
    standby: number;
    declined: number;
    archived: number;
  };
  currency: string;
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
  fundId?: string;
}