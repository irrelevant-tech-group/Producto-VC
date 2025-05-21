// server/services/documentProcessor/fileHandlers/textHandler.ts

/**
 * Extracción de texto plano
 */
export function extractFromText(buffer: Buffer): string {
    return buffer.toString("utf-8");
  }
  
  /**
   * Extracción de texto Markdown
   */
  export function extractFromMarkdown(buffer: Buffer): string {
    // Para markdown, simplemente devolvemos el texto plano
    // Opcionalmente podríamos usar una librería para convertir MD a texto plano
    return buffer.toString("utf-8");
  }