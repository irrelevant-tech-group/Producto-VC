// server/services/memoGenerator/exporters/docxExporter.ts

import { Memo, MemoSection } from "@shared/types";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { googleCloudStorage } from "../../storageService";

/**
 * Genera un documento DOCX a partir de un memo de inversión
 */
export async function exportMemoToDocx(memo: Memo, startup: any): Promise<string> {
  try {
    const sections = memo.sections as MemoSection[];
    const docxSections = [];
    
    // Título y información básica
    docxSections.push(
      new Paragraph({
        text: `Investment Memo: ${startup.name}`,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 }
      }),
      
      new Paragraph({
        children: [
          new TextRun({
            text: `Vertical: ${startup.vertical} | Etapa: ${startup.stage} | Versión: ${memo.version}`,
            size: 24
          })
        ],
        spacing: { after: 200 }
      }),
      
      new Paragraph({
        children: [
          new TextRun({
            text: `Fecha: ${new Date().toLocaleDateString()}`,
            size: 24
          })
        ],
        spacing: { after: 400 }
      })
    );
    
    // Crear secciones del documento
    for (const section of sections) {
      // Título de sección
      docxSections.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );
      
      // Dividir contenido en párrafos
      const paragraphs = section.content.split('\n\n');
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') continue;
        
        // Verificar si es subtítulo (comienza con ## en markdown)
        if (paragraph.trim().startsWith('## ')) {
          docxSections.push(
            new Paragraph({
              text: paragraph.trim().substring(3),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            })
          );
          continue;
        }
        
        // Texto normal
        docxSections.push(
          new Paragraph({
            text: paragraph,
            spacing: { after: 200 }
          })
        );
      }
    }
    
    // Crear documento DOCX
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: docxSections
      }]
    });
    
    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc);
    
    // Generar nombre de archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${startup.name.replace(/\s+/g, '_')}_Investment_Memo_v${memo.version}_${timestamp}.docx`;
    
    // Subir a Google Cloud Storage
    const fileUrl = await googleCloudStorage.uploadFile(fileName, buffer);
    console.log(`DOCX subido a Google Cloud Storage: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error("Error exportando memo a DOCX:", error);
    throw new Error("No se pudo exportar el memo a DOCX");
  }
}