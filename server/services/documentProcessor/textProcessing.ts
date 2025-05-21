// server/services/documentProcessor/textProcessing.ts

/**
 * Limpia y normaliza texto para mejor procesamiento
 */
export function cleanText(text: string): string {
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
  export function semanticChunking(text: string, maxChunkSize = 1000, overlapSize = 200): string[] {
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
  export function getOverlap(text: string, overlapSize: number): string {
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