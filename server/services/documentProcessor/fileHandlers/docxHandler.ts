// server/services/documentProcessor/fileHandlers/docxHandler.ts

/**
 * DOCX: mammoth con manejo de errores
 */
export async function extractFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      console.error("Error en extracción DOCX:", err);
      throw new Error("Error al extraer texto del documento DOCX.");
    }
  }