import { storage } from "../storage";
import { Memo, MemoSection } from "@shared/types";
import { processQuery, generateEmbedding } from "./openai";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from 'docx';

// Template for investment memos
const DEFAULT_MEMO_TEMPLATE = [
  "Resumen Ejecutivo",
  "Tesis de Inversión",
  "Equipo",
  "Producto/Tecnología",
  "Mercado y Competencia",
  "Modelo de Negocio",
  "Métricas y Tracción",
  "Finanzas",
  "Riesgos y Mitigación",
  "Conclusión y Recomendación"
];

/**
 * Genera una sección específica del memo de inversión
 */
export async function generateMemoSection(startupId: string, section: string): Promise<MemoSection> {
  try {
    console.log(`Generando sección "${section}" para startup ${startupId}`);
    
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error(`Startup con ID ${startupId} no encontrado`);
    }
    
    // Preparar embedding para la sección con contexto adicional
    const sectionContext = `Sección de memo de inversión: ${section}. 
    Información relevante para ${section} en un startup de ${startup.vertical} 
    en etapa ${startup.stage} ubicado en ${startup.location}.`;
    
    // Generar embedding para búsqueda contextual
    let relevantChunks = [];
    try {
      console.log(`Generando embedding para sección "${section}"`);
      const sectionEmbedding = await generateEmbedding(sectionContext);
      
      // Búsqueda vectorial para encontrar chunks relevantes
      relevantChunks = await storage.searchChunksByEmbedding(sectionEmbedding, startupId, 10);
      console.log(`Encontrados ${relevantChunks.length} chunks relevantes para sección "${section}"`);
    } catch (embeddingError) {
      console.error(`Error al generar embedding para sección "${section}":`, embeddingError);
      
      // Fallback a búsqueda por texto
      relevantChunks = await storage.searchChunks(section, startupId, 10);
      console.log(`Fallback: Encontrados ${relevantChunks.length} chunks por búsqueda de texto`);
    }
    
    // Si no hay chunks relevantes, usar algunos genéricos
    if (relevantChunks.length === 0) {
      console.log("No se encontraron chunks específicos, usando información general");
      relevantChunks = await storage.searchChunks("", startupId, 5);
    }
    
    // Preparar contexto con información detallada de las fuentes
    const context = relevantChunks
      .map(chunk => {
        const sourceName = chunk.metadata?.source || 'Documento sin título';
        const sourceType = chunk.metadata?.documentType || 'desconocido';
        const pageInfo = chunk.metadata?.page ? ` (página ${chunk.metadata.page})` : '';
        const score = chunk.similarity 
          ? ` (relevancia: ${(chunk.similarity * 100).toFixed(1)}%)` 
          : '';
        return `--- De "${sourceName}" (${sourceType})${pageInfo}${score} ---\n${chunk.content}`;
      })
      .join("\n\n");
    
    // Preparar datos estructurados del startup
    const startupData = {
      nombre: startup.name,
      vertical: startup.vertical,
      etapa: startup.stage,
      ubicacion: startup.location,
      montoBuscado: startup.amountSought 
        ? `${startup.amountSought.toLocaleString()} ${startup.currency}`
        : "No especificado"
    };
    
    // Crear prompt específico según la sección
    let sectionSpecificPrompt = "";
    const sectionPrompts: Record<string, string> = {
      "Resumen Ejecutivo": "Sintetiza los puntos más importantes del startup, destacando propuesta de valor, equipo clave, tracción y potencial de inversión. Sé conciso y directo.",
      "Tesis de Inversión": "Explica por qué este startup podría ser una buena inversión. Analiza su alineación con la tesis de H20 Capital, destacando oportunidad de mercado, diferenciación y potencial de retorno.",
      "Equipo": "Analiza en detalle el equipo fundador, incluyendo experiencia previa, habilidades técnicas, conocimiento del mercado y track record. Identifica fortalezas y posibles debilidades.",
      "Producto/Tecnología": "Describe el producto o servicio, su tecnología, diferenciación, ventajas competitivas, propiedad intelectual y roadmap de desarrollo.",
      "Mercado y Competencia": "Analiza el tamaño y crecimiento del mercado, competidores principales, tendencias relevantes y estrategia competitiva del startup.",
      "Modelo de Negocio": "Explica cómo el startup genera ingresos, sus canales de venta, estructura de precios, costos principales y potencial de escalabilidad.",
      "Métricas y Tracción": "Presenta las métricas clave de rendimiento, crecimiento histórico, logros significativos y proyecciones a corto/mediano plazo.",
      "Finanzas": "Analiza estados financieros, uso de fondos, proyecciones, unidades económicas y necesidades de capital futuras.",
      "Riesgos y Mitigación": "Identifica los principales riesgos (mercado, ejecución, tecnológicos, regulatorios) y las estrategias de mitigación propuestas.",
      "Conclusión y Recomendación": "Proporciona una recomendación argumentada sobre la inversión, resumiendo los puntos fuertes y áreas de cautela."
    };
    
    sectionSpecificPrompt = sectionPrompts[section] || 
      "Analiza la información disponible y genera contenido relevante para esta sección del memo de inversión.";
    
    console.log(`Generando contenido para sección "${section}" con ${relevantChunks.length} chunks`);
    
    // Llamada a OpenAI con prompt mejorado para mejor calidad
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "Eres un experto analista de venture capital especializado en la creación de investment memos. " +
            "Tu tarea es generar una sección específica de un memo de inversión con contenido de alta calidad " +
            "basado únicamente en la información proporcionada. " +
            "Utiliza un estilo profesional, analítico y objetivo. " +
            "Incluye datos concretos y métricas cuando estén disponibles. " +
            "Organiza el contenido con subtítulos cuando sea apropiado para mejorar la legibilidad. " +
            "Si hay información inconsistente entre fuentes, indica la discrepancia. " +
            "No inventes información; si hay brechas importantes en los datos, indícalo claramente."
        },
        {
          role: "user",
          content: `
          # Datos del startup
          ${Object.entries(startupData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
          
          # Sección a generar
          "${section}"
          
          # Instrucciones específicas para esta sección
          ${sectionSpecificPrompt}
          
          # Información disponible (cita estas fuentes cuando sea relevante)
          ${context}
          
          Por favor, genera un contenido profesional, bien estructurado y basado en datos para la sección "${section}" del memo de inversión. 
          Extensión recomendada: 400-800 palabras. Utiliza formato Markdown para estructurar el contenido.`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });
    
    const content = response.choices[0].message.content || 
      `No se pudo generar contenido para la sección "${section}".`;
    
    // Procesar fuentes para citación explícita
    const sources = await Promise.all(
      relevantChunks.slice(0, 5).map(async chunk => {
        const document = await storage.getDocument(chunk.documentId);
        return {
          documentId: chunk.documentId,
          documentName: document?.name || "Documento sin nombre",
          documentType: document?.type || "desconocido", 
          content: chunk.content.substring(0, 150) + "...",
          relevanceScore: chunk.similarity || 0,
          metadata: {
            page: chunk.metadata?.page,
            extractedAt: chunk.metadata?.extractedAt
          }
        };
      })
    );
    
    console.log(`Sección "${section}" generada exitosamente`);
    
    return {
      title: section,
      content,
      sources,
      lastEdited: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error al generar la sección ${section} del memo:`, error);
    return {
      title: section,
      content: `No se pudo generar la sección "${section}" debido a un error. Por favor, intenta nuevamente más tarde.`,
      lastEdited: new Date().toISOString()
    };
  }
}

/**
 * Genera un memo de inversión completo
 */
export async function generateMemo(startupId: string, sections = DEFAULT_MEMO_TEMPLATE): Promise<Memo> {
  try {
    console.log(`Iniciando generación de memo para startup ${startupId}`);
    
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error(`Startup with ID ${startupId} not found`);
    }
    
    // Verificar si tenemos suficientes documentos
    const documents = await storage.getDocumentsByStartup(startupId);
    if (documents.length < 2) {
      throw new Error("Documentos insuficientes para generar un memo. Por favor, sube más información.");
    }
    
    // Obtener memos existentes para determinar versión
    const existingMemos = await storage.getMemosByStartup(startupId);
    const version = existingMemos.length + 1;
    
    console.log(`Generando memo v${version} para ${startup.name} con ${sections.length} secciones`);
    
    // Generar cada sección en paralelo para mayor eficiencia
    console.log("Iniciando generación paralela de secciones...");
    const generatedSections = await Promise.all(
      sections.map(section => generateMemoSection(startupId, section))
    );
    
    console.log(`${generatedSections.length} secciones generadas exitosamente`);
    
    // Crear el memo en la base de datos
    const memo = await storage.createMemo({
      startupId,
      version,
      status: 'draft',
      sections: generatedSections,
      exportUrls: {}
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_generated',
      startupId,
      memoId: memo.id,
      content: `Memo de inversión (v${version}) generado para ${startup.name}`,
      metadata: {
        sectionCount: sections.length,
        generatedAt: new Date().toISOString()
      }
    });
    
    console.log(`Memo ${memo.id} (v${version}) creado exitosamente para ${startup.name}`);
    
    return memo;
  } catch (error) {
    console.error(`Error generando memo para startup ${startupId}:`, error);
    
    // Registrar actividad de fallo
    await storage.createActivity({
      type: 'memo_generation_failed',
      startupId,
      content: `Error al generar memo de inversión: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Actualiza secciones específicas de un memo existente
 */
export async function updateMemoSections(
  memoId: string, 
  sectionUpdates: { title: string, content: string }[]
): Promise<Memo | undefined> {
  try {
    console.log(`Actualizando secciones para memo ${memoId}`);
    
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    // Obtener secciones actuales
    const currentSections = memo.sections as MemoSection[];
    
    // Actualizar las secciones especificadas
    const updatedSections = currentSections.map(section => {
      const update = sectionUpdates.find(u => u.title === section.title);
      if (update) {
        console.log(`Actualizando sección "${section.title}"`);
        return {
          ...section,
          content: update.content,
          lastEdited: new Date().toISOString()
        };
      }
      return section;
    });
    
    // Actualizar memo en base de datos
    const updatedMemo = await storage.updateMemo(memoId, {
      sections: updatedSections,
      updatedAt: new Date()
    });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_updated',
      memoId,
      startupId: memo.startupId,
      content: `Secciones del memo actualizadas`,
      metadata: {
        updatedSections: sectionUpdates.map(s => s.title)
      }
    });
    
    console.log(`Memo ${memoId} actualizado exitosamente`);
    
    return updatedMemo;
  } catch (error) {
    console.error(`Error actualizando memo ${memoId}:`, error);
    throw error;
  }
}

/**
 * Genera un PDF a partir de un memo de inversión
 */
async function exportMemoToPdf(memo: Memo, startup: Startup): Promise<string> {
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

/**
 * Genera un documento DOCX a partir de un memo de inversión
 */
async function exportMemoToDocx(memo: Memo, startup: Startup): Promise<string> {
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

/**
 * Exporta un memo a diferentes formatos (PDF, DOCX, slides)
 */
export async function exportMemo(memoId: string, format: 'pdf' | 'docx' | 'slides'): Promise<string> {
  try {
    console.log(`Exportando memo ${memoId} a formato ${format}`);
    
    const memo = await storage.getMemo(memoId);
    if (!memo) {
      throw new Error(`Memo with ID ${memoId} not found`);
    }
    
    const startup = await storage.getStartup(memo.startupId);
    if (!startup) {
      throw new Error(`Startup with ID ${memo.startupId} not found`);
    }
    
    // Seleccionar método de exportación según formato
    let exportUrl: string;
    
    if (format === 'pdf') {
      exportUrl = await exportMemoToPdf(memo, startup);
    } else if (format === 'docx') {
      exportUrl = await exportMemoToDocx(memo, startup);
    } else if (format === 'slides') {
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
      exportUrl = await googleCloudStorage.uploadFile(fileName, buffer);
      console.log(`Slides (simulación) subido a Google Cloud Storage: ${exportUrl}`);
    } else {
      throw new Error(`Formato no soportado: ${format}`);
    }
    
    // Actualizar memo con URL de exportación
    const exportUrls = memo.exportUrls as Record<string, string> || {};
    exportUrls[format] = exportUrl;
    
    await storage.updateMemo(memoId, { exportUrls });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_exported',
      memoId,
      startupId: memo.startupId,
      content: `Memo exportado a formato ${format.toUpperCase()}`,
      metadata: { format, url: exportUrl }
    });
    
    console.log(`Memo ${memoId} exportado exitosamente a ${format}`);
    
    return exportUrl;
  } catch (error) {
    console.error(`Error exportando memo ${memoId} a ${format}:`, error);
    throw error;
  }
}