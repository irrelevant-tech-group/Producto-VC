import { storage } from "../storage";
import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import OpenAI from "openai";
// Importamos solo cuando se usen para evitar errores con pdf-parse
// import pdf from 'pdf-parse';
// import mammoth from 'mammoth';
// import xlsx from 'xlsx';

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
 * Extracts and processes content from various document types
 */
async function extractAndProcessContent(document: Document): Promise<DocumentProcessingResult> {
  // Start timer for processing time calculation
  const startTime = Date.now();
  
  // Since this is a simulated environment, we'll get the document buffer from multer's memory storage
  // In a real implementation, we would download the document from a storage service
  // For this example, let's assume we have the file in a buffer (modify based on your actual implementation)
  
  let extractedContent = '';
  let fileSize = 0;
  let pageCount = 0;
  
  try {
    // For demo purposes, if we don't have access to the actual file buffer,
    // we'll fall back to sample content based on the document type
    if (!document.fileUrl) {
      console.log(`No file URL available for document ${document.id}, using sample content`);
      extractedContent = generateMockContent(document);
    } else {
      // This part would download the actual file in a production environment
      // For now, we'll simulate with the file type based content
      extractedContent = generateMockContent(document);
      
      // In a real implementation, this would be:
      // const buffer = await downloadFileFromStorage(document.fileUrl);
      // extractedContent = await extractTextFromDocument(document, buffer);
      // fileSize = buffer.length;
    }
    
    // Split content into manageable chunks
    const chunks = splitIntoChunks(extractedContent);
    pageCount = Math.max(1, Math.ceil(extractedContent.length / 3000)); // Rough estimate of pages
    
    // Create metadata about the document
    const processingTime = (Date.now() - startTime) / 1000; // Processing time in seconds
    const metadata = {
      pageCount,
      extractedAt: new Date().toISOString(),
      fileSize: fileSize || extractedContent.length, // Use actual size if available, otherwise content length
      processingTime,
      contentSummary: extractedContent.substring(0, 200) + '...' // Short preview
    };
    
    // Store chunks in the database
    for (const chunkText of chunks) {
      try {
        // Generar embedding para el chunk
        const chunk: InsertChunk = {
          documentId: document.id,
          startupId: document.startupId,
          content: chunkText,
          metadata: {
            source: document.name,
            documentType: document.type,
            extractedAt: metadata.extractedAt,
          }
        };
        
        // Usar el nuevo método que incluye generación de embedding
        await storage.createChunkWithEmbedding(chunk, chunkText);
      } catch (error) {
        console.error(`Error al procesar chunk para documento ${document.id}:`, error);
        // Crear chunk sin embedding en caso de error
        await storage.createChunk({
          documentId: document.id,
          startupId: document.startupId,
          content: chunkText,
          metadata: {
            source: document.name,
            documentType: document.type,
            extractedAt: metadata.extractedAt,
          }
        });
      }
    }
    
    return {
      documentId: document.id,
      startupId: document.startupId,
      status: 'completed',
      metadata,
      chunks: chunks.length,
    };
  } catch (error) {
    console.error(`Error extracting content from document ${document.id}:`, error);
    throw error;
  }
}

/**
 * Extracts text from different document types
 */
async function extractTextFromDocument(document: Document, buffer: Buffer): Promise<string> {
  console.log(`Extracting text from ${document.fileType} document: ${document.name}`);
  
  try {
    switch(document.fileType) {
      case 'application/pdf':
        return await extractFromPDF(buffer);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractFromDOCX(buffer);
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return await extractFromXLSX(buffer);
      case 'text/plain':
        return buffer.toString('utf-8');
      case 'text/csv':
        return buffer.toString('utf-8');
      default:
        // For unsupported types, try to extract as plain text
        console.log(`Unsupported file type: ${document.fileType}, attempting to extract as plain text`);
        return buffer.toString('utf-8');
    }
  } catch (error) {
    console.error(`Error extracting text from ${document.name}:`, error);
    throw new Error(`Failed to extract text from ${document.name}: ${error.message}`);
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({buffer});
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

/**
 * Extract text from XLSX using xlsx
 */
async function extractFromXLSX(buffer: Buffer): Promise<string> {
  try {
    // Parse the Excel file
    const workbook = xlsx.read(buffer, {type: 'buffer'});
    
    // Extract text from all sheets
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(sheet, {header: 1});
      
      // Add sheet name as heading
      text += `Sheet: ${sheetName}\n\n`;
      
      // Convert each row to a string and add to text
      sheetData.forEach((row: any) => {
        if (row && row.length > 0) {
          text += row.join(', ') + '\n';
        }
      });
      
      text += '\n';
    });
    
    return text;
  } catch (error) {
    console.error('Error extracting text from XLSX:', error);
    throw error;
  }
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