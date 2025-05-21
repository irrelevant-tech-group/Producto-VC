// server/services/documentProcessor/fileHandlers/csvHandler.ts

/**
 * Extracción de texto de CSV
 */
export async function extractFromCSV(buffer: Buffer): Promise<string> {
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