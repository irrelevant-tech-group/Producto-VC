// server/services/documentProcessor/processor.ts

import { storage } from "../../storage";
import { Document } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import { extractAndProcessContent } from './contentExtractor';
import { analyzeStartupAlignment } from "../openai";

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
          processingTime: result.metadata.processingTime,
          extractedEntities: result.metadata.extractedEntities || {}
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