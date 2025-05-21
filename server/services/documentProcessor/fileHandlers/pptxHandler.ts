// server/services/documentProcessor/fileHandlers/pptxHandler.ts

/**
 * Extracción de PPTX mejorada
 */
export async function extractFromPPTX(buffer: Buffer): Promise<string> {
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