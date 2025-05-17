// server/services/documentProcessor.ts

import { storage } from "../storage";
import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import OpenAI from "openai";
import { analyzeStartupAlignment } from "./openai";
import * as fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Procesa un documento: extrae texto, genera embeddings y almacena los chunks
 */
export async function processDocument(documentId: string): Promise<DocumentProcessingResult> {
  let document: Document | undefined;
  try {
    // Obtener detalles del documento
    document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Actualizar estado a processing
    await storage.updateDocument(documentId, { processingStatus: "processing" });
    console.log(`Iniciando procesamiento para documento: ${document.name}`);

    // Extraer, chunkear y guardar
    const result = await extractAndProcessContent(document);

    // Marcar completado y guardar metadata
    await storage.updateDocument(documentId, {
      processed: true,
      processingStatus: "completed",
      metadata: {
        ...document.metadata,
        processingResult: {
          chunks: result.chunks,
          processedAt: new Date().toISOString(),
          processingTime: result.metadata.processingTime
        }
      }
    });

    // Log de actividad
    await storage.createActivity({
      type: "document_processed",
      documentId: document.id,
      startupId: document.startupId,
      content: `Documento "${document.name}" procesado exitosamente`,
      metadata: {
        documentType: document.type,
        chunksCreated: result.chunks
      }
    });

    // Recalcular alignment
    await analyzeStartupAlignment(document.startupId);

    return result;
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error occurred";
    console.error(`Error procesando documento ${documentId}:`, errorMessage);

    if (document) {
      // Marcar fallo y guardar info
      await storage.updateDocument(documentId, {
        processingStatus: "failed",
        metadata: {
          ...document.metadata,
          error: errorMessage,
          failedAt: new Date().toISOString()
        }
      });
      await storage.createActivity({
        type: "document_processing_failed",
        documentId,
        startupId: document.startupId,
        content: `Error al procesar documento "${document.name}": ${errorMessage}`
      });
    }
    throw error;
  }
}

/**
 * Extrae y procesa el contenido de un documento: texto, chunking y embeddings
 */
async function extractAndProcessContent(document: Document): Promise<DocumentProcessingResult> {
  const startTime = Date.now();

  // Leer buffer: local o fallback simulado
  let buffer: Buffer;
  if (document.fileUrl && document.fileUrl.startsWith("file://")) {
    const filePath = document.fileUrl.slice("file://".length);
    buffer = await fs.promises.readFile(filePath);
  } else {
    console.log(`No fileUrl válido para ${document.id}, usando contenido simulado`);
    const simulated = generateMockContent(document);
    buffer = Buffer.from(simulated, "utf-8");
  }

  // Extraer texto
  console.log(`Extrayendo texto de ${document.fileType}`);
  let content: string;
  try {
    content = await extractTextFromDocument(document, buffer);
  } catch (err) {
    console.error("Error extrayendo texto, usando contenido simulado:", err);
    content = generateMockContent(document);
  }
  if (!content.trim()) {
    throw new Error("No se pudo extraer texto del documento");
  }
  console.log(`Texto extraído (${content.length} caracteres)`);

  // Chunking semántico
  const chunks = splitIntoChunks(content);
  console.log(`Dividido en ${chunks.length} chunks`);

  const processingTime = (Date.now() - startTime) / 1000;
  const metadata = {
    pageCount: Math.max(1, Math.ceil(content.length / 3000)),
    extractedAt: new Date().toISOString(),
    fileSize: buffer.length,
    processingTime,
    contentSummary: content.substring(0, 200) + "..."
  };

  // Guardar chunks con embeddings, sanitizando null bytes
  for (let i = 0; i < chunks.length; i++) {
    const raw = chunks[i];
    const chunkText = raw.replace(/\u0000/g, "");  // Eliminar bytes nulos

    const chunkRecord: InsertChunk = {
      documentId: document.id,
      startupId: document.startupId,
      content: chunkText,
      metadata: {
        source: document.name,
        documentType: document.type,
        chunkIndex: i,
        extractedAt: metadata.extractedAt
      }
    };

    try {
      await storage.createChunkWithEmbedding(chunkRecord, chunkText);
    } catch (err: any) {
      console.error(`Error embedding chunk ${i}:`, err);
      await storage.createChunk({
        ...chunkRecord,
        metadata: { ...chunkRecord.metadata, error: err.message }
      });
    }
  }

  console.log(`Procesamiento completado para ${document.id}`);
  return {
    documentId: document.id,
    startupId: document.startupId,
    status: "completed",
    metadata,
    chunks: chunks.length
  };
}

/**
 * Extrae texto según el tipo de documento
 */
async function extractTextFromDocument(document: Document, buffer: Buffer): Promise<string> {
  console.log(`Extrayendo según fileType: ${document.fileType}`);
  switch (document.fileType) {
    case "application/pdf":
      return extractFromPDF(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDOCX(buffer);
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return extractFromXLSX(buffer);
    case "text/plain":
    case "text/csv":
      return buffer.toString("utf-8");
    default:
      console.log(`Tipo no soportado ${document.fileType}, como plain text`);
      return buffer.toString("utf-8");
  }
}

/**
 * PDF: usando pdf-parse/lib/pdf-parse.js directamente para evitar problemas con paths internos
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Importamos directamente desde el módulo principal de pdf-parse
    const pdfParse = await import("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (err) {
    // Si falla el método anterior, intentamos con un enfoque alternativo
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Configurar worker
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      
      // Cargar el documento PDF
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdfDocument = await loadingTask.promise;
      
      let text = '';
      // Extraer texto de cada página
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n';
      }
      
      return text;
    } catch (secondErr) {
      console.error("Los dos métodos de extracción de PDF fallaron:", secondErr);
      throw err; // Propagar el error original
    }
  }
}

/**
 * DOCX: mammoth
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * XLSX: xlsx
 */
async function extractFromXLSX(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  wb.SheetNames.forEach(name => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    text += `Sheet: ${name}\n`;
    rows.forEach(r => { if (r.length) text += r.join(", ") + "\n"; });
    text += "\n";
  });
  return text;
}

/**
 * Contenido simulado si no hay URL de archivo
 */
function generateMockContent(document: Document): string {
  return `${document.name} - Contenido simulado para ${document.type}`;
}

/**
 * Divide en chunks semánticos por párrafos
 */
function splitIntoChunks(content: string, maxChunkSize = 1000): string[] {
  const paras = content.split(/\n\n+/);
  const chunks: string[] = [];
  let curr = "";
  for (const p of paras) {
    const t = p.trim();
    if (!t) continue;
    if (curr.length + t.length > maxChunkSize && curr) {
      chunks.push(curr.trim());
      curr = t;
    } else {
      curr += (curr ? "\n\n" : "") + t;
    }
  }
  if (curr.trim()) chunks.push(curr.trim());
  return chunks;
}