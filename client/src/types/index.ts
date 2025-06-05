export interface StartupSummary {
    id: string;
    name: string;
    vertical: string;
    stage: string;
    location: string;
    status: 'active' | 'invested' | 'standby' | 'declined' | 'archived';
    currency: string;
    amountSought?: number;
    valuation?: number;
    alignmentScore?: number;
    completionPercentage: number;
    documentsCount: number;
    lastUpdated: string;
    primaryContact: {
      name: string;
      email: string;
      position: string;
    };
    firstContactDate: string;
    createdAt: string;
    description?: string;
  }
  
  export interface Memo {
    id: string;
    version: number;
    status: 'draft' | 'review' | 'final' | 'approved' | 'rejected';
    sections: Array<{
      title: string;
      content: string;
      sources?: Array<{
        content: string;
      }>;
    }>;
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    summary?: string;
  }
  
  export interface InvestmentDecision {
    investmentAmount: number;
    investmentDate: string;
    ownershipPercentage: number;
    decisionReason: string;
  }
  
  export interface DecisionReason {
    decisionReason: string;
  }
  
  export interface MemoApproval {
    comments?: string;
  }
  
  export interface MemoRejection {
    comments: string;
  }