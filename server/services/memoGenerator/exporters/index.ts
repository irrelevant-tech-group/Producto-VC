// server/services/memoGenerator/exporters/index.ts

import { Memo } from "@shared/types";
import { exportMemoToPdf } from './pdfExporter';
import { exportMemoToDocx } from './docxExporter';
import { exportMemoToSlides } from './slidesExporter';

/**
 * Selecciona y ejecuta el exportador apropiado según el formato
 */
export async function exportMemoByFormat(
  memo: Memo, 
  startup: any, 
  format: 'pdf' | 'docx' | 'slides'
): Promise<string> {
  switch (format) {
    case 'pdf':
      return await exportMemoToPdf(memo, startup);
    case 'docx':
      return await exportMemoToDocx(memo, startup);
    case 'slides':
      return await exportMemoToSlides(memo, startup);
    default:
      throw new Error(`Formato no soportado: ${format}`);
  }
}

// Exportar todos los exportadores específicos
export { exportMemoToPdf } from './pdfExporter';
export { exportMemoToDocx } from './docxExporter';
export { exportMemoToSlides } from './slidesExporter';