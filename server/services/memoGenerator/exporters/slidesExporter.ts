// server/services/memoGenerator/exporters/slidesExporter.ts

import { Memo, MemoSection } from "@shared/types";
import { googleCloudStorage } from "../../storageService";

/**
 * Exporta el memo como presentación de diapositivas (actualmente simula con texto)
 */
export async function exportMemoToSlides(memo: Memo, startup: any): Promise<string> {
  try {
    // Para slides
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${startup.name.replace(/\s+/g, '_')}_slides_v${memo.version}_${timestamp}.txt`;
    
    // Simulación de archivo para slides
    const mockSlideContent = `
SLIDES: Investment Memo - ${startup.name} (v${memo.version})
Generated: ${new Date().toISOString()}

${(memo.sections as MemoSection[]).map(section => {
  return `## SLIDE: ${section.title}\n\n${section.content.substring(0, 150)}...\n\n`;
}).join('\n')}
    `;
    
    // Subir a Google Cloud Storage
    const buffer = Buffer.from(mockSlideContent, 'utf-8');
    const exportUrl = await googleCloudStorage.uploadFile(fileName, buffer);
    console.log(`Slides (simulación) subido a Google Cloud Storage: ${exportUrl}`);
    
    return exportUrl;
  } catch (error) {
    console.error("Error exportando memo a presentación:", error);
    throw new Error("No se pudo exportar el memo a formato de presentación");
  }
}