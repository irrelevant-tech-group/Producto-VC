// server/services/documentProcessor.ts

import { storage } from "../storage";
import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import OpenAI from "openai";
import { analyzeStartupAlignment, generateEmbedding } from "./openai";
import * as fs from "fs";

// Usando gpt-4o como modelo actual según la nota del código original
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

  // Chunking semántico mejorado
  const chunks = splitIntoChunks(content);
  console.log(`Dividido en ${chunks.length} chunks`);

  // Extracción de entidades del contenido completo
  let entities = {};
  try {
    entities = await extractEntities(content);
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
    contentSummary: content.substring(0, 200) + "...",
    extractedEntities: entities
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
      // Generar embedding para el chunk usando el servicio de OpenAI
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
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return extractFromPPTX(buffer);
    case "text/plain":
    case "text/csv":
      return buffer.toString("utf-8");
    default:
      console.log(`Tipo no soportado ${document.fileType}, tratando como texto plano`);
      return buffer.toString("utf-8");
  }
}

/**
 * PDF: implementación robusta con manejo de errores y alternativas
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Importamos directamente desde el módulo principal de pdf-parse
    const pdfParse = await import("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (err) {
    console.error("Error primario en extracción PDF:", err);
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
      console.error("Error secundario en extracción PDF:", secondErr);
      throw new Error("Error al extraer texto del PDF. El documento puede estar dañado o contener protección.");
    }
  }
}

/**
 * DOCX: mammoth con manejo de errores
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    console.error("Error en extracción DOCX:", err);
    throw new Error("Error al extraer texto del documento DOCX.");
  }
}

/**
 * XLSX: mejora con manejo de errores y opciones avanzadas
 */
async function extractFromXLSX(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx");
    // Usar opciones avanzadas para preservar más información
    const workbook = XLSX.read(buffer, { 
      type: "buffer",
      cellDates: true,  // Preservar fechas
      cellNF: true,     // Preservar formato numérico
      cellStyles: true  // Preservar estilos
    });
    
    let text = "";
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      text += `Hoja: ${name}\n`;
      
      // Convertir a formato JSON para mejor procesamiento
      const json = XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        raw: false,  // Convertir a strings para mantener consistencia
        dateNF: 'yyyy-mm-dd' // Formato para fechas
      });
      
      json.forEach((row: any) => {
        if (row && row.length) {
          text += row.join(", ") + "\n";
        }
      });
      text += "\n";
    });
    
    return text;
  } catch (err) {
    console.error("Error en extracción XLSX:", err);
    throw new Error("Error al extraer texto de la hoja de cálculo.");
  }
}

/**
 * Extracción de PPTX mejorada
 */
async function extractFromPPTX(buffer: Buffer): Promise<string> {
  try {
    // Intentamos usar pptx-parser si está disponible
    try {
      const pptxParser = await import("pptx-parser");
      const result = await pptxParser.default.extract(buffer);
      let text = "";
      
      // Procesar diapositivas y su contenido
      if (result && result.slides) {
        result.slides.forEach((slide: any, index: number) => {
          text += `Diapositiva ${index + 1}:\n`;
          
          // Extraer texto de los elementos
          if (slide.elements) {
            slide.elements.forEach((element: any) => {
              if (element.type === 'text' && element.text) {
                text += element.text + "\n";
              }
            });
          }
          
          text += "\n";
        });
      }
      
      return text;
    } catch (importErr) {
      // Si no podemos importar pptx-parser, usamos un método alternativo
      console.warn("pptx-parser no disponible, usando extracción alternativa:", importErr);
      
      // Intento alternativo: PPTX como archivo ZIP con XMLs
      const JSZip = await import("jszip");
      const zip = new JSZip();
      
      const content = await zip.loadAsync(buffer);
      const slideFiles = Object.keys(content.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      let text = "";
      for (const slideFile of slideFiles) {
        const slideXml = await content.files[slideFile].async('text');
        
        // Extraer texto usando regex simple (para una implementación real sería mejor usar un parser XML)
        const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
        if (textMatches) {
          const slideNumber = slideFile.match(/slide(\d+)\.xml/)?.[1] || '?';
          text += `Diapositiva ${slideNumber}:\n`;
          
          textMatches.forEach(match => {
            const content = match.replace(/<a:t>|<\/a:t>/g, '');
            if (content.trim()) {
              text += content.trim() + "\n";
            }
          });
          
          text += "\n";
        }
      }
      
      return text || "Contenido extraído de presentación PowerPoint.";
    }
  } catch (err) {
    console.error("Error en extracción PPTX:", err);
    return "Contenido extraído de presentación PowerPoint. Para soporte completo de PPTX, integre una biblioteca especializada.";
  }
}

/**
 * Contenido simulado si no hay URL de archivo
 */
function generateMockContent(document: Document): string {
  return `${document.name} - Contenido simulado para ${document.type} - Generado el ${new Date().toISOString()}`;
}

/**
 * Divide en chunks semánticos mejorado para manejar mejor párrafos largos y preservar contexto
 */
function splitIntoChunks(content: string, maxChunkSize = 1000, overlapSize = 100): string[] {
  // Dividir por párrafos primero
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    // Si el párrafo por sí solo es mayor que el tamaño máximo, subdividirlo
    if (paragraph.length > maxChunkSize) {
      // Si hay contenido acumulado, guardarlo como chunk
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      
      // Dividir párrafo grande en oraciones
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let sentenceChunk = "";
      
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize) {
          chunks.push(sentenceChunk.trim());
          // Agregar overlap para mantener contexto
          sentenceChunk = getLastNChars(sentenceChunk, overlapSize) + sentence;
        } else {
          sentenceChunk += (sentenceChunk ? " " : "") + sentence;
        }
      }
      
      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
    } else if (currentChunk.length + paragraph.length > maxChunkSize) {
      // Si añadir este párrafo excede el límite, guardar el chunk actual y empezar uno nuevo
      chunks.push(currentChunk.trim());
      // Agregar overlap desde el final del chunk anterior
      currentChunk = getLastNChars(currentChunk, overlapSize) + paragraph;
    } else {
      // Añadir el párrafo al chunk actual
      if (currentChunk) currentChunk += "\n\n";
      currentChunk += paragraph;
    }
  }
  
  // Añadir el último chunk si queda contenido
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Función helper para obtener los últimos N caracteres con sentido semántico
 */
function getLastNChars(text: string, n: number): string {
  if (!text || n <= 0) return "";
  if (text.length <= n) return text;
  
  // Intentar cortar en un espacio para no romper palabras
  const lastPart = text.slice(-n * 2); // Tomar un poco más para encontrar un buen punto de corte
  const spaceIndex = lastPart.indexOf(' ', lastPart.length - n);
  
  if (spaceIndex >= 0) {
    return lastPart.slice(spaceIndex + 1);
  }
  
  // Si no hay un buen punto de corte, simplemente tomar los últimos n caracteres
  return text.slice(-n);
}

/**
 * Extracción de entidades con OpenAI
 */
async function extractEntities(text: string): Promise<any> {
  // Si el texto es muy largo, tomamos solo una muestra representativa
  const sampleText = text.length > 8000 ? 
    text.substring(0, 4000) + "\n\n[...]\n\n" + text.substring(text.length - 4000) : 
    text;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            Extrae entidades clave del siguiente texto. Devuelve JSON con estas categorías:
            - people: Personas mencionadas con sus roles/cargos
            - organizations: Organizaciones mencionadas (competidores, partners, inversores)
            - metrics: Métricas financieras y de tracción (ARR, MRR, CAC, LTV, tasas de crecimiento, etc.)
            - keypoints: Puntos clave sobre el startup (máximo 5 puntos, los más relevantes)
            - products: Productos o servicios mencionados
            - technologies: Tecnologías o frameworks utilizados
            
            Utiliza un formato como:
            {
              "people": [{"name": "Nombre", "role": "Cargo"}],
              "organizations": [{"name": "Nombre", "type": "competitor|partner|investor|customer"}],
              "metrics": [{"name": "Métrica", "value": "Valor", "unit": "Unidad", "context": "Contexto adicional"}],
              "keypoints": ["Punto 1", "Punto 2"],
              "products": [{"name": "Nombre", "description": "Descripción breve"}],
              "technologies": ["Tecnología 1", "Tecnología 2"]
            }
            
            Sé específico y conciso. Si no encuentras información en alguna categoría, devuelve un array vacío.
          `
        },
        {
          role: "user",
          content: sampleText
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    // Validar y parsear la respuesta
    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    
    // Asegurar que todas las categorías existan, incluso si están vacías
    return {
      people: parsed.people || [],
      organizations: parsed.organizations || [],
      metrics: parsed.metrics || [],
      keypoints: parsed.keypoints || [],
      products: parsed.products || [],
      technologies: parsed.technologies || []
    };
  } catch (error) {
    console.error("Error extrayendo entidades:", error);
    return { 
      people: [], 
      organizations: [], 
      metrics: [], 
      keypoints: [], 
      products: [], 
      technologies: [] 
    };
  }
}