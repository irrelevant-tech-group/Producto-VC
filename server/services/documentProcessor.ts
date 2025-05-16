import { storage } from "../storage";
import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * This is a simplified document processing service.
 * In a real implementation, this would handle multiple document formats,
 * extract text, process content, and generate embeddings.
 */
export async function processDocument(documentId: string): Promise<DocumentProcessingResult> {
  try {
    // Get document details
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    
    // Update document status to processing
    await storage.updateDocument(documentId, {
      processingStatus: 'processing'
    });
    
    // Process document based on type
    const result = await extractAndProcessContent(document);
    
    // Update document status to completed
    await storage.updateDocument(documentId, {
      processed: true,
      processingStatus: 'completed',
      metadata: result.metadata
    });
    
    // Log activity
    await storage.createActivity({
      type: 'document_processed',
      documentId: document.id,
      startupId: document.startupId,
      content: `Document "${document.name}" was processed successfully`,
      metadata: {
        documentType: document.type,
        chunksCreated: result.chunks,
      }
    });
    
    // After processing document, update startup's alignment score
    await analyzeStartupAlignment(document.startupId);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error processing document ${documentId}:`, errorMessage);
    
    // Update document with error status
    if (documentId) {
      const document = await storage.getDocument(documentId);
      if (document) {
        await storage.updateDocument(documentId, {
          processingStatus: 'failed',
          metadata: { error: errorMessage }
        });
        
        // Log failure activity
        await storage.createActivity({
          type: 'document_processing_failed',
          documentId,
          startupId: document.startupId,
          content: `Failed to process document "${document.name}": ${errorMessage}`
        });
      }
    }
    
    throw error;
  }
}

/**
 * Simulates text extraction and processing for different document types
 */
async function extractAndProcessContent(document: Document): Promise<DocumentProcessingResult> {
  // In a real implementation, this would use different libraries based on document type
  // For example, pdf-parse for PDFs, docx for Word docs, etc.
  
  // For the MVP, we'll simulate content extraction with mock data based on document type
  const mockContent = generateMockContent(document);
  
  // Split content into chunks (in a real implementation, this would be more sophisticated)
  const chunks = splitIntoChunks(mockContent);
  
  // Create metadata about the document
  const metadata = {
    pageCount: chunks.length,
    extractedAt: new Date().toISOString(),
    fileSize: Math.floor(Math.random() * 5000) + 1000, // Simulated file size
    processingTime: Math.floor(Math.random() * 30) + 5, // Simulated processing time in seconds
  };
  
  // Store chunks in the database with embeddings
  for (const chunkText of chunks) {
    // Calculate a simple similarity score instead of embedding
    // This is a temporary solution until pgvector integration is complete
    const similarityScore = 0.5; // Default middle value
    
    // Create chunk in database
    const chunk: InsertChunk = {
      documentId: document.id,
      startupId: document.startupId,
      content: chunkText,
      similarityScore,
      metadata: {
        source: document.name,
        documentType: document.type,
        extractedAt: metadata.extractedAt,
      }
    };
    
    await storage.createChunk(chunk);
  }
  
  return {
    documentId: document.id,
    startupId: document.startupId,
    status: 'completed',
    metadata,
    chunks: chunks.length,
  };
}

/**
 * Placeholder function to generate mock content based on document type
 * In a real implementation, this would extract actual text from files
 */
function generateMockContent(document: Document): string {
  // This is just a placeholder - in a real app, we would extract actual document content
  const typeContent = {
    'pitch-deck': `${document.name} - Pitch Deck Content
    
    Company Overview:
    - Founded in 2021
    - Based in ${Math.random() > 0.5 ? 'Mexico City' : 'Bogotá'}
    - Team of 15 employees
    
    Problem:
    - Addressing inefficiencies in the ${document.type} market
    - Current solutions lack automation and intelligence
    
    Solution:
    - AI-powered platform for optimizing ${document.type} operations
    - Proprietary algorithms for data analysis
    
    Market Size:
    - $5B total addressable market
    - Growing at 15% annually
    
    Traction:
    - 25 customers
    - $50k MRR
    - 120% YoY growth
    
    Funding:
    - Raising $3M
    - Previous round: $500k seed`,
    
    'financials': `${document.name} - Financial Projections
    
    Current Metrics:
    - Revenue: $600k annualized
    - Burn rate: $80k/month
    - Runway: 8 months
    
    Projections (3 years):
    - Year 1: $1.5M revenue, -$800k EBITDA
    - Year 2: $4.2M revenue, -$200k EBITDA
    - Year 3: $9M revenue, $1.2M EBITDA
    
    Key Assumptions:
    - Customer acquisition cost: $5k
    - Lifetime value: $25k
    - Churn: 10% annually
    
    Use of Funds:
    - 60% Engineering
    - 25% Sales & Marketing
    - 15% Operations`,
    
    'legal': `${document.name} - Legal Document
    
    Corporate Structure:
    - Delaware C-Corp
    - Subsidiary in ${Math.random() > 0.5 ? 'Mexico' : 'Colombia'}
    
    Cap Table:
    - Founders: 70%
    - Angel investors: 15%
    - ESOP: 15%
    
    Intellectual Property:
    - 2 patents pending
    - Trademarks in process
    - Software copyright registered
    
    Key Contracts:
    - Partnership with Industry Leader Inc.
    - Service agreements with 3 enterprise customers`,
    
    'tech': `${document.name} - Technical Documentation
    
    Technology Stack:
    - Backend: Python, Node.js
    - Frontend: React
    - Database: PostgreSQL
    - Infrastructure: AWS
    
    Key Features:
    - Predictive analytics engine
    - Real-time data processing
    - Custom visualization dashboard
    
    Development Roadmap:
    - Q1: API enhancements
    - Q2: Mobile application
    - Q3: Advanced ML models
    - Q4: Enterprise features`,
    
    'market': `${document.name} - Market Analysis
    
    Market Overview:
    - $12B global market
    - 18% CAGR expected through 2026
    - Key regions: North America, LATAM
    
    Competitive Landscape:
    - 3 major incumbents
    - 5-7 emerging startups
    - Key differentiator: AI capabilities
    
    Industry Trends:
    - Increasing regulation
    - Shift to mobile-first solutions
    - Growing demand for real-time analytics
    
    Target Customer Segments:
    - Mid-market businesses (100-500 employees)
    - Enterprise early adopters
    - Vertical focus: Finance and Healthcare`,
    
    'other': `${document.name} - Additional Information
    
    Team Backgrounds:
    - CEO: Ex-Google, 8 years experience
    - CTO: MIT graduate, previous startup exit
    - COO: Industry veteran, 12 years experience
    
    Customer Testimonials:
    - "Transformed our workflow" - Major Client Inc.
    - "40% cost reduction" - Leading Company LLC
    
    Awards and Recognition:
    - Top 10 Startups to Watch - Tech Magazine
    - Innovation Award - Industry Conference 2023
    
    Future Vision:
    - Product expansion into adjacent markets
    - International growth strategy
    - Potential strategic partnerships`
  };
  
  return typeContent[document.type] || `Content for ${document.name}`;
}

/**
 * Split content into manageable chunks
 */
function splitIntoChunks(content: string, maxChunkSize = 1000): string[] {
  const paragraphs = content.split("\n\n");
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * This function is a placeholder for future vector embedding functionality
 * Currently not being used as we're using simple text search
 */
async function calculateTextSimilarity(text: string): Promise<number> {
  // This is a simple placeholder function that will be replaced
  // with proper vector embeddings in the future
  return 0.5; // Default similarity score
}

/**
 * Re-analyze startup alignment score after processing a document
 */
async function analyzeStartupAlignment(startupId: string): Promise<void> {
  const documents = await storage.getDocumentsByStartup(startupId);
  
  // Only perform analysis if we have enough documents
  if (documents.length >= 2) {
    // Calculate a basic alignment score based on document types
    // In a real implementation, this would use more sophisticated analysis
    
    // Check if we have key document types
    const hasFinancials = documents.some(d => d.type === 'financials');
    const hasPitchDeck = documents.some(d => d.type === 'pitch-deck');
    const hasMarket = documents.some(d => d.type === 'market');
    
    let alignmentScore = 0.5; // Base score
    
    if (hasFinancials) alignmentScore += 0.15;
    if (hasPitchDeck) alignmentScore += 0.1;
    if (hasMarket) alignmentScore += 0.1;
    
    // Bonus for having more documents
    alignmentScore += Math.min(documents.length * 0.02, 0.1);
    
    // Cap at 0.95
    alignmentScore = Math.min(alignmentScore, 0.95);
    
    // Update the startup
    await storage.updateStartup(startupId, { 
      alignmentScore,
      lastInteraction: new Date()
    });
  }
}
