// server/services/documentProcessor/fileHandlers/index.ts

import { Document } from "@shared/schema";
import { extractFromPDF } from './pdfHandler';
import { extractFromDOCX } from './docxHandler';
import { extractFromXLSX } from './xlsxHandler';
import { extractFromPPTX } from './pptxHandler';
import { extractFromCSV } from './csvHandler';
import { extractFromText, extractFromMarkdown } from './textHandler';

/**
 * Extrae texto según el tipo de documento
 */
export async function extractTextFromDocument(document: Document, buffer: Buffer): Promise<string> {
  console.log(`Extrayendo según fileType: ${document.fileType}`);
  switch (document.fileType) {
    case "application/pdf":
      return extractFromPDF(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDOCX(buffer);
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return extractFromXLSX(buffer);
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return extractFromPPTX(buffer);
    case "text/plain":
      return extractFromText(buffer);
    case "text/csv":
      return extractFromCSV(buffer);
    case "text/markdown":
      return extractFromMarkdown(buffer);
    default:
      console.log(`Tipo no soportado ${document.fileType}, tratando como texto plano`);
      return buffer.toString("utf-8");
  }
}

export * from './imageHandler';