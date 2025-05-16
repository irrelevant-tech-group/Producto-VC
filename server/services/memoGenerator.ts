import { storage } from "../storage";
import { Memo, MemoSection } from "@shared/types";
import { processQuery, generateMemoSection } from "./openai";

// Template for investment memos
const DEFAULT_MEMO_TEMPLATE = [
  "Executive Summary",
  "Investment Thesis",
  "Team Analysis",
  "Product & Technology",
  "Market & Competition",
  "Business Model",
  "Metrics & Traction",
  "Financial Analysis",
  "Proposed Terms",
  "Risks & Mitigations",
  "Conclusion & Recommendation"
];

/**
 * Generate a complete investment memo
 */
export async function generateMemo(startupId: string, sections = DEFAULT_MEMO_TEMPLATE): Promise<Memo> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error(`Startup with ID ${startupId} not found`);
    }
    
    // Check if we have enough data
    const documents = await storage.getDocumentsByStartup(startupId);
    if (documents.length < 2) {
      throw new Error("Insufficient documents to generate a memo. Please upload more information.");
    }
    
    // Get existing memos to determine version
    const existingMemos = await storage.getMemosByStartup(startupId);
    const version = existingMemos.length + 1;
    
    // Generate each section in parallel
    const generatedSections = await Promise.all(
      sections.map(section => generateMemoSection(startupId, section))
    );
    
    // Create the memo in the database
    const memo = await storage.createMemo({
      startupId,
      version,
      status: 'draft',
      sections: generatedSections,
      exportUrls: {}
    });
    
    // Log activity
    await storage.createActivity({
      type: 'memo_generated',
      startupId,
      memoId: memo.id,
      content: `Investment memo (v${version}) generated for ${startup.name}`,
      metadata: {
        sectionCount: sections.length,
      }
    });
    
    return memo;
  } catch (error) {
    console.error(`Error generating memo for startup ${startupId}:`, error);
    
    // Log failure activity
    await storage.createActivity({
      type: 'memo_generation_failed',
      startupId,
      content: `Failed to generate investment memo: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Update specific sections of an existing memo
 */
export async function updateMemoSections(
  memoId: string, 
  sectionUpdates: { title: string, content: string }[]
): Promise<Memo | undefined> {
  try {
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    // Get current sections
    const currentSections = memo.sections as MemoSection[];
    
    // Update specified sections
    const updatedSections = currentSections.map(section => {
      const update = sectionUpdates.find(u => u.title === section.title);
      if (update) {
        return {
          ...section,
          content: update.content,
          lastEdited: new Date().toISOString()
        };
      }
      return section;
    });
    
    // Update memo in database
    const updatedMemo = await storage.updateMemo(memoId, {
      sections: updatedSections,
      updatedAt: new Date()
    });
    
    // Log activity
    await storage.createActivity({
      type: 'memo_updated',
      memoId,
      startupId: memo.startupId,
      content: `Investment memo sections updated`,
      metadata: {
        updatedSections: sectionUpdates.map(s => s.title)
      }
    });
    
    return updatedMemo;
  } catch (error) {
    console.error(`Error updating memo ${memoId}:`, error);
    throw error;
  }
}

/**
 * Export memo to different formats (PDF, DOCX, slides)
 * This is a simplified placeholder - in a real implementation,
 * this would generate actual files
 */
export async function exportMemo(memoId: string, format: 'pdf' | 'docx' | 'slides'): Promise<string> {
  try {
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    // In a real implementation, this would generate actual files
    // For the MVP, we'll just simulate successful export
    
    // Generate a filename based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `memo_export_${timestamp}.${format}`;
    
    // In a real implementation, we'd store the file in S3 or similar
    const mockUrl = `https://storage.example.com/exports/${memoId}/${filename}`;
    
    // Update the memo with the export URL
    const exportUrls = memo.exportUrls as Record<string, string> || {};
    exportUrls[format] = mockUrl;
    
    await storage.updateMemo(memoId, { exportUrls });
    
    // Log activity
    await storage.createActivity({
      type: 'memo_exported',
      memoId,
      startupId: memo.startupId,
      content: `Investment memo exported to ${format.toUpperCase()} format`,
      metadata: { format, url: mockUrl }
    });
    
    return mockUrl;
  } catch (error) {
    console.error(`Error exporting memo ${memoId} to ${format}:`, error);
    throw error;
  }
}
