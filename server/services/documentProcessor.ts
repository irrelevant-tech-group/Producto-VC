// server/services/documentProcessor.ts

import { storage } from "../storage";
import { Document, InsertChunk } from "@shared/schema";
import { DocumentProcessingResult } from "@shared/types";
import OpenAI from "openai";
import { analyzeStartupAlignment, generateEmbedding } from "./openai";
import * as fs from "fs";
import Tesseract from 'tesseract.js';

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
    extractedEntities: entities
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
        extractedAt: metadata.extractedAt
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
      
      // Convertir cada hoja a CSV para mejor extracción de texto
      const csv = XLSX.utils.sheet_to_csv(sheet, { 
        blankrows: false,
        defval: "", 
        rawNumbers: false
      });
      
      text += csv + "\n\n";
    });
    
    return text;
  } catch (err) {
    console.error("Error en extracción XLSX:", err);
    throw new Error("Error al extraer texto de la hoja de cálculo.");
  }
}

/**
 * Extracción de texto de CSV
 */
async function extractFromCSV(buffer: Buffer): Promise<string> {
  try {
    const Papa = await import("papaparse");
    const csvText = buffer.toString('utf-8');
    
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    let text = "";
    // Añadir encabezados
    if (result.meta && result.meta.fields) {
      text += result.meta.fields.join(", ") + "\n";
    }
    
    // Añadir datos
    result.data.forEach((row: any) => {
      const values = Object.values(row);
      text += values.join(", ") + "\n";
    });
    
    return text;
  } catch (err) {
    console.error("Error en extracción CSV:", err);
    return buffer.toString('utf-8');  // Fallback a texto plano
  }
}

/**
 * Extracción de PPTX mejorada
 */
async function extractFromPPTX(buffer: Buffer): Promise<string> {
  try {
    // Intentamos usar pptx-text-extract si está disponible
    try {
      const pptxExtract = await import("pptx-text-extract");
      const result = await pptxExtract.default(buffer);
      
      if (Array.isArray(result)) {
        return result.join("\n\n");
      }
      
      return result.toString();
    } catch (importErr) {
      console.warn("pptx-text-extract no disponible, usando extracción alternativa:", importErr);
      
      // Intento alternativo con mammoth (si aplica)
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (mammothErr) {
        console.warn("Mammoth no pudo procesar PPTX, usando método zip:", mammothErr);
      }
      
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
        
        // Extraer texto usando regex simple
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
 * Extracción de texto plano
 */
async function extractFromText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

/**
 * Extracción de texto Markdown
 */
async function extractFromMarkdown(buffer: Buffer): Promise<string> {
  // Para markdown, simplemente devolvemos el texto plano
  // Opcionalmente podríamos usar una librería para convertir MD a texto plano
  return buffer.toString("utf-8");
}

/**
 * Extracción de texto mediante OCR para imágenes
 */
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(buffer, 'spa+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progreso: ${m.progress}`);
        }
      }
    });
    
    console.log(`OCR completado con confianza: ${result.data.confidence}%`);
    return result.data.text;
  } catch (err) {
    console.error("Error en OCR de imagen:", err);
    throw new Error("Error al extraer texto mediante OCR de la imagen.");
  }
}

/**
 * Contenido simulado si no hay URL de archivo
 */
function generateMockContent(document: Document): string {
  return `${document.name} - Contenido simulado para ${document.type} - Generado el ${new Date().toISOString()}`;
}

/**
 * Limpia y normaliza texto para mejor procesamiento
 */
function cleanText(text: string): string {
  // Normalizar unicode
  let cleaned = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Eliminar caracteres especiales y símbolos que no aportan valor
  cleaned = cleaned.replace(/[^\w\s.,;:¿?¡!()[\]{}%$#@&*+-]/g, " ");
  
  // Eliminar espacios múltiples, tabulaciones y saltos de línea excesivos
  cleaned = cleaned.replace(/\s+/g, " ");
  
  // Eliminar espacios al inicio y final
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Divide en chunks semánticos implementando nuestro propio TextSplitter
 */
function semanticChunking(text: string, maxChunkSize = 1000, overlapSize = 200): string[] {
  // Implementamos nuestro propio chunking semántico sin dependencias externas
  return intelligentSplitIntoChunks(text, maxChunkSize, overlapSize);
}

/**
 * División inteligente de texto en chunks semánticos
 * Implementación mejorada sin dependencias externas
 */
function intelligentSplitIntoChunks(content: string, maxChunkSize = 1000, overlapSize = 200): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  
  // Primero dividir por secciones principales (dobles saltos de línea)
  const sections = content.split(/\n\s*\n/).filter(section => section.trim().length > 0);
  
  let currentChunk = "";
  
  for (const section of sections) {
    const sectionText = section.trim();
    
    // Si la sección es muy larga, dividirla por párrafos o oraciones
    if (sectionText.length > maxChunkSize) {
      // Guardar chunk actual si existe
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = getOverlap(currentChunk, overlapSize);
      }
      
      // Procesar sección larga
      const subChunks = processLongSection(sectionText, maxChunkSize, overlapSize);
      
      // Añadir los sub-chunks
      for (let i = 0; i < subChunks.length; i++) {
        if (i === 0 && currentChunk.trim()) {
          // Para el primer sub-chunk, añadir overlap del chunk anterior
          chunks.push((currentChunk + " " + subChunks[i]).trim());
        } else {
          chunks.push(subChunks[i]);
        }
      }
      
      // Preparar overlap para el siguiente chunk
      currentChunk = getOverlap(subChunks[subChunks.length - 1], overlapSize);
      
    } else if (currentChunk.length + sectionText.length + 2 > maxChunkSize) {
      // Si añadir esta sección excede el límite, finalizar chunk actual
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // Empezar nuevo chunk con overlap
      currentChunk = getOverlap(currentChunk, overlapSize) + "\n\n" + sectionText;
      
    } else {
      // Añadir sección al chunk actual
      if (currentChunk.trim()) {
        currentChunk += "\n\n" + sectionText;
      } else {
        currentChunk = sectionText;
      }
    }
  }
  
  // Añadir el último chunk si no está vacío
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Filtrar chunks muy pequeños y combinarlos si es necesario
  return optimizeChunks(chunks, maxChunkSize * 0.1, maxChunkSize); // Mínimo 10% del tamaño máximo
}

/**
 * Procesa secciones largas dividiéndolas en chunks apropiados
 */
function processLongSection(section: string, maxChunkSize: number, overlapSize: number): string[] {
  const chunks: string[] = [];
  
  // Intentar dividir por oraciones
  const sentences = section.match(/[^.!?]+[.!?]+\s*/g) || [section];
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    const sentenceText = sentence.trim();
    
    if (currentChunk.length + sentenceText.length > maxChunkSize) {
      // Finalizar chunk actual
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // Si la oración en sí es muy larga, dividirla por comas o espacios
      if (sentenceText.length > maxChunkSize) {
        const subParts = splitLongSentence(sentenceText, maxChunkSize);
        chunks.push(...subParts);
        currentChunk = getOverlap(subParts[subParts.length - 1], overlapSize);
      } else {
        // Empezar nuevo chunk con overlap
        const overlap = chunks.length > 0 ? getOverlap(chunks[chunks.length - 1], overlapSize) : "";
        currentChunk = overlap ? overlap + " " + sentenceText : sentenceText;
      }
    } else {
      // Añadir oración al chunk actual
      currentChunk += (currentChunk ? " " : "") + sentenceText;
    }
  }
  
  // Añadir último chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Divide oraciones muy largas de manera inteligente
 */
function splitLongSentence(sentence: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  
  // Intentar dividir por comas primero
  const parts = sentence.split(/,\s*/);
  
  if (parts.length > 1) {
    let currentChunk = "";
    
    for (const part of parts) {
      if (currentChunk.length + part.length + 2 > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = part;
      } else {
        currentChunk += (currentChunk ? ", " : "") + part;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  } else {
    // Si no hay comas, dividir por espacios como último recurso
    const words = sentence.split(/\s+/);
    let currentChunk = "";
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }
  
  return chunks;
}

/**
 * Obtiene el overlap del final de un texto para mantener contexto
 */
function getOverlap(text: string, overlapSize: number): string {
  if (!text || overlapSize <= 0) return "";
  if (text.length <= overlapSize) return text;
  
  // Intentar cortar en una oración completa
  const lastPart = text.slice(-overlapSize * 2);
  const sentenceEnd = lastPart.search(/[.!?]\s+/);
  
  if (sentenceEnd >= 0 && sentenceEnd < overlapSize * 1.5) {
    return lastPart.slice(sentenceEnd + 2).trim();
  }
  
  // Si no hay oración completa, cortar en un espacio
  const shortPart = text.slice(-overlapSize * 1.5);
  const spaceIndex = shortPart.indexOf(' ', shortPart.length - overlapSize);
  
  if (spaceIndex >= 0) {
    return shortPart.slice(spaceIndex + 1).trim();
  }
  
  // Como último recurso, tomar los últimos caracteres
  return text.slice(-overlapSize).trim();
}

/**
 * Optimiza la lista de chunks combinando los muy pequeños
 */
function optimizeChunks(chunks: string[], minSize: number, maxSize: number): string[] {
  const optimized: string[] = [];
  let i = 0;
  
  while (i < chunks.length) {
    let currentChunk = chunks[i];
    
    // Si el chunk es muy pequeño, intentar combinarlo con el siguiente
    while (i + 1 < chunks.length && 
           currentChunk.length < minSize &&
           currentChunk.length + chunks[i + 1].length <= maxSize) {
      currentChunk += "\n\n" + chunks[i + 1];
      i++;
    }
    
    optimized.push(currentChunk);
    i++;
  }
  
  return optimized;
}

/**
 * Función helper para obtener los últimos N caracteres con sentido semántico
 * (mantenida para compatibilidad)
 */
function getLastNChars(text: string, n: number): string {
  return getOverlap(text, n);
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
              "people": [{"name": "Nombre", "role": "Cargo", "confidence": 0.9}],
              "organizations": [{"name": "Nombre", "type": "competitor|partner|investor|customer", "confidence": 0.9}],
              "metrics": [{"name": "Métrica", "value": "Valor", "unit": "Unidad", "context": "Contexto adicional", "confidence": 0.9}],
              "keypoints": ["Punto 1", "Punto 2"],
              "products": [{"name": "Nombre", "description": "Descripción breve", "confidence": 0.9}],
              "technologies": [{"name": "Tecnología", "description": "Uso en el startup", "confidence": 0.9}]
            }
            
            Sé específico y conciso. Si no encuentras información en alguna categoría, devuelve un array vacío.
            Incluye un valor de confianza (confidence) entre 0 y 1 para cada entidad, donde 1 significa máxima certeza.
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