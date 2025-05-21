// server/services/memoGenerator/exporters/pdfExporter.ts

import { Memo, MemoSection } from "@shared/types";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { googleCloudStorage } from "../../storageService";

/**
 * Genera un PDF a partir de un memo de inversión
 */
export async function exportMemoToPdf(memo: Memo, startup: any): Promise<string> {
  try {
    // Crear instancia PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configuración de estilo corporativo
    const primaryColor = '#1a56db'; // Azul corporativo
    const secondaryColor = '#374151'; // Gris oscuro
    const textColor = '#1f2937'; // Negro/gris oscuro
    
    // Configuración de fuentes
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    
    // Header con logo (simularemos un logo con texto)
    doc.setFontSize(24);
    doc.text('H20 Capital', 20, 20);
    
    // Título del documento
    doc.setFontSize(20);
    doc.text(`Investment Memo: ${startup.name}`, 20, 35);
    
    // Información básica del startup
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Vertical: ${startup.vertical} | Etapa: ${startup.stage} | v${memo.version}`, 20, 45);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 52);
    
    // Línea separadora
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    // Iterar por secciones
    let y = 65;
    const sections = memo.sections as MemoSection[];
    
    for (const section of sections) {
      // Verificar si necesitamos nueva página
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      // Título de sección
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryColor);
      doc.text(section.title, 20, y);
      y += 8;
      
      // Contenido de sección
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(textColor);
      
      // Dividir contenido en párrafos
      const paragraphs = section.content.split('\n\n');
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') continue;
        
        // Verificar si es subtítulo (comienza con ## en markdown)
        if (paragraph.trim().startsWith('## ')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          const subtitleText = paragraph.trim().substring(3);
          doc.text(subtitleText, 20, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          y += 6;
          continue;
        }
        
        // Texto normal con saltos de línea automáticos
        const textLines = doc.splitTextToSize(paragraph, 170);
        
        // Verificar si necesitamos una nueva página para este párrafo
        if (y + textLines.length * 6 > 280) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(textLines, 20, y);
        y += textLines.length * 6 + 4; // Espaciado entre párrafos
      }
      
      // Espacio entre secciones
      y += 10;
    }
    
    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      doc.text(`Confidencial - H20 Capital - Página ${i} de ${pageCount}`, 20, 285);
    }
    
    // Generar nombre de archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${startup.name.replace(/\s+/g, '_')}_Investment_Memo_v${memo.version}_${timestamp}.pdf`;
    
    // Obtener el buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Subir a Google Cloud Storage
    const fileUrl = await googleCloudStorage.uploadFile(fileName, pdfBuffer);
    console.log(`PDF subido a Google Cloud Storage: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error("Error exportando memo a PDF:", error);
    throw new Error("No se pudo exportar el memo a PDF");
  }
}