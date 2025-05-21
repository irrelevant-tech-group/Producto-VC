// server/services/documentProcessor/fileHandlers/pdfHandler.ts

/**
 * PDF: implementación robusta con manejo de errores y alternativas
 */
export async function extractFromPDF(buffer: Buffer): Promise<string> {
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