// server/services/documentProcessor/fileHandlers/imageHandler.ts

import Tesseract from 'tesseract.js';

/**
 * Extracción de texto mediante OCR para imágenes
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
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