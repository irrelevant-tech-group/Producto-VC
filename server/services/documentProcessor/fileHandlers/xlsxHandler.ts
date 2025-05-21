// server/services/documentProcessor/fileHandlers/xlsxHandler.ts

/**
 * XLSX: mejora con manejo de errores y opciones avanzadas
 */
export async function extractFromXLSX(buffer: Buffer): Promise<string> {
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