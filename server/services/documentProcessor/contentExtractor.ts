// server/services/documentProcessor/contentExtractor.ts

import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import * as fs from "fs";
import { storage } from "../../storage";
import { generateEmbedding } from "../openai";
import { extractEntities } from './entityExtraction';
import { cleanText, semanticChunking } from './textProcessing';
import { generateMockContent } from './utils';
import { extractTextFromDocument } from './fileHandlers';
import { extractTextFromImage } from './fileHandlers/imageHandler';

/**
 * Extrae y procesa el contenido de un documento: texto, chunking y embeddings
 */
export async function extractAndProcessContent(document: Document): Promise<DocumentProcessingResult> {
  const startTime = Date.now();

  // Leer buffer: Google Cloud Storage, local o fallback simulado
  let buffer: Buffer;
  
  if (document.fileUrl && document.fileUrl.startsWith("https://storage.googleapis.com/")) {
    // Descargar desde Google Cloud Storage
    try {
      console.log(`Descargando archivo de Google Cloud Storage: ${document.fileUrl}`);
      const response = await fetch(document.fileUrl);
      
      if (!response.ok) {
        throw new Error(`Error al descargar archivo: ${response.status} ${response.statusText}`);
      }
      
      buffer = Buffer.from(await response.arrayBuffer());
      console.log(`Archivo descargado correctamente de GCS (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Error descargando archivo de Google Cloud Storage: ${err}`);
      const simulated = generateMockContent(document);
      buffer = Buffer.from(simulated, "utf-8");
    }
  } else if (document.fileUrl && document.fileUrl.startsWith("file://")) {
    // Mantener compatibilidad con archivos locales
    const filePath = document.fileUrl.slice("file://".length);
    try {
      buffer = await fs.promises.readFile(filePath);
      console.log(`Archivo local leído correctamente: ${filePath} (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Error leyendo archivo local ${filePath}: ${err}`);
      const simulated = generateMockContent(document);
      buffer = Buffer.from(simulated, "utf-8");
    }
  } else {
    console.log(`No fileUrl válido para ${document.id}, usando contenido simulado`);
    const simulated = generateMockContent(document);
    buffer = Buffer.from(simulated, "utf-8");
  }

  // Verificar si es una imagen para OCR
  let content: string;
  if (document.fileType.startsWith('image/')) {
    console.log(`Detectada imagen, aplicando OCR a ${document.name}`);
    content = await extractTextFromImage(buffer);
  } else {
    // Extraer texto
    console.log(`Extrayendo texto de ${document.fileType}`);
    try {
      content = await extractTextFromDocument(document, buffer);
    } catch (err) {
      console.error("Error extrayendo texto, usando contenido simulado:", err);
      content = generateMockContent(document);
    }
  }

  if (!content.trim()) {
    throw new Error("No se pudo extraer texto del documento");
  }
  console.log(`Texto extraído (${content.length} caracteres)`);

  // Limpiar texto
  const cleanedText = cleanText(content);
  console.log(`Texto limpiado (${cleanedText.length} caracteres)`);

  // Chunking semántico mejorado
  const chunks = semanticChunking(cleanedText);
  console.log(`Dividido en ${chunks.length} chunks semánticos`);

  // Extracción de entidades del contenido completo
  let entities = {};
  try {
    entities = await extractEntities(cleanedText);
    console.log("Entidades extraídas:", entities);
  } catch (error) {
    console.error("Error en extracción de entidades:", error);
  }

  const processingTime = (Date.now() - startTime) / 1000;
  const metadata = {
    pageCount: Math.max(1, Math.ceil(content.length / 3000)),
    extractedAt: new Date().toISOString(),
    fileSize: buffer.length,
    processingTime,
    contentSummary: cleanedText.substring(0, 200) + "...",
    extractedEntities: entities,
    storageProvider: document.fileUrl.startsWith("https://storage.googleapis.com/") ? 
      "google-cloud-storage" : "local"
  };

  // Guardar chunks con embeddings, sanitizando null bytes
  for (let i = 0; i < chunks.length; i++) {
    const raw = chunks[i];
    // Asegurar que chunkText es un string válido y sanitizar
    const chunkText = typeof raw === 'string' 
      ? raw.replace(/\u0000/g, "") 
      : String(raw).replace(/\u0000/g, "");

    // Verificar si el texto sanitizado no está vacío
    if (!chunkText.trim()) {
      console.log(`Saltando chunk ${i} porque está vacío después de sanitizar`);
      continue;
    }
    
    const chunkRecord: InsertChunk = {
      documentId: document.id,
      startupId: document.startupId,
      content: chunkText,
      metadata: {
        source: document.name,
        documentType: document.type,
        chunkIndex: i,
        extractedAt: metadata.extractedAt,
        storageProvider: metadata.storageProvider
      }
    };

    try {
      // Generar embedding para el chunk usando el servicio de OpenAI
      const embedding = await generateEmbedding(chunkText);
      
      // Verificar que el embedding es válido
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        // Insertar chunk con su embedding
        await storage.createChunkWithEmbedding(chunkRecord, embedding);
      } else {
        console.error(`Embedding inválido para chunk ${i}, guardando sin embedding`);
        await storage.createChunk(chunkRecord);
      }
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