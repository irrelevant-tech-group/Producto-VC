import { storage } from "../storage";
import { Memo, MemoSection } from "@shared/types";
import { processQuery, generateEmbedding } from "./openai";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";

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
    
    // Preparar embedding para la sección - usar contexto adicional para mejorar relevancia
    const sectionContext = `Sección de memo de inversión: ${section}. 
    Información relacionada con ${section} para un startup de ${startup.vertical} 
    en etapa ${startup.stage} ubicado en ${startup.location}.`;
    
    // Generar embedding para buscar información relevante a esta sección
    let relevantChunks = [];
    try {
      console.log(`Generando embedding para sección "${section}"`);
      const sectionEmbedding = await generateEmbedding(sectionContext);
      
      // Buscar chunks relevantes usando búsqueda vectorial
      relevantChunks = await storage.searchChunksByEmbedding(sectionEmbedding, startupId, 10);
      console.log(`Encontrados ${relevantChunks.length} chunks relevantes para sección "${section}"`);
    } catch (embeddingError) {
      console.error(`Error al generar embedding para sección "${section}":`, embeddingError);
      
      // Fallback: búsqueda por texto
      relevantChunks = await storage.searchChunks(section, startupId, 10);
      console.log(`Fallback: Encontrados ${relevantChunks.length} chunks por búsqueda de texto`);
    }
    
    // Si no hay chunks relevantes, usar algunos genéricos
    if (relevantChunks.length === 0) {
      console.log("No se encontraron chunks específicos, usando información general");
      relevantChunks = await storage.searchChunks("", startupId, 5);
    }
    
    // Preparar contexto con información de la fuente
    const context = relevantChunks
      .map(chunk => {
        const sourceName = chunk.metadata?.source || 'Documento sin título';
        const score = chunk.semanticScore 
          ? ` (relevancia: ${(chunk.semanticScore * 100).toFixed(1)}%)` 
          : '';
        return `--- De "${sourceName}"${score} ---\n${chunk.content}`;
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
    
    // Llamada a OpenAI con prompt mejorado
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "Eres un experto analista de venture capital especializado en la creación de investment memos. " +
            "Tu tarea es generar una sección específica de un memo de inversión con contenido de alta calidad basado únicamente en la información proporcionada. " +
            "Usa un estilo profesional, analítico y objetivo. " +
            "Incluye datos concretos y métricas cuando estén disponibles. " +
            "Organiza el contenido con subtítulos cuando sea apropiado para mejorar la legibilidad. " +
            "No inventes información; si hay brechas en los datos, indícalo claramente."
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
          
          # Información disponible
          ${context}
          
          Por favor, genera un contenido profesional, bien estructurado y basado en datos para la sección "${section}" del memo de inversión. Extensión recomendada: 400-800 palabras.`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });
    
    const content = response.choices[0].message.content || 
      `No se pudo generar contenido para la sección "${section}".`;
    
    // Recopilar fuentes para citar
    const sources = await Promise.all(relevantChunks.slice(0, 5).map(async chunk => {
      const document = await storage.getDocument(chunk.documentId);
      return {
        documentId: chunk.documentId,
        documentName: document?.name || "Documento sin nombre",
        content: chunk.content.substring(0, 150) + "...",
        relevanceScore: chunk.semanticScore || chunk.similarityScore || 0
      };
    }));
    
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
    
    // En producción, este código generaría archivos reales y los subiría a S3
    // Para el MVP, simularemos este proceso
    
    // Generar nombre del archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = startup.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedName}_investment_memo_v${memo.version}_${timestamp}.${format}`;
    
    // Simular URL para exportación
    // En producción, sería URL de S3 o similar
    const exportDir = path.join(__dirname, '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Crear o simular archivo según formato
    let fileContent = '';
    
    if (format === 'pdf') {
      // Simular contenido de PDF
      // En implementación real, usar pdfkit u otra librería
      fileContent = `
Investment Memo: ${startup.name} (v${memo.version})
Generated: ${new Date().toISOString()}

${(memo.sections as MemoSection[]).map(section => {
  return `# ${section.title}\n\n${section.content}\n\n`;
}).join('\n')}
      `;
      
      // Guardar como texto para simular
      const filePath = path.join(exportDir, filename.replace('.pdf', '.txt'));
      fs.writeFileSync(filePath, fileContent);
      
    } else if (format === 'docx') {
      // Simular contenido de DOCX
      // En implementación real, usar docx u otra librería
      fileContent = `
Investment Memo: ${startup.name} (v${memo.version})
Generated: ${new Date().toISOString()}

${(memo.sections as MemoSection[]).map(section => {
  return `# ${section.title}\n\n${section.content}\n\n`;
}).join('\n')}
      `;
      
      // Guardar como texto para simular
      const filePath = path.join(exportDir, filename.replace('.docx', '.txt'));
      fs.writeFileSync(filePath, fileContent);
      
    } else if (format === 'slides') {
      // Simular contenido de presentación
      // En implementación real, usar pptxgenjs u otra librería
      fileContent = `
SLIDES: Investment Memo - ${startup.name} (v${memo.version})
Generated: ${new Date().toISOString()}

${(memo.sections as MemoSection[]).map(section => {
  return `## SLIDE: ${section.title}\n\n${section.content.substring(0, 150)}...\n\n`;
}).join('\n')}
      `;
      
      // Guardar como texto para simular
      const filePath = path.join(exportDir, filename.replace('.slides', '.txt'));
      fs.writeFileSync(filePath, fileContent);
    }
    
    // En producción, generar URL firmada de S3
    // Para MVP, simular URL local
    const mockUrl = `/exports/${filename}`;
    
    // Actualizar memo con URL de exportación
    const exportUrls = memo.exportUrls as Record<string, string> || {};
    exportUrls[format] = mockUrl;
    
    await storage.updateMemo(memoId, { exportUrls });
    
    // Registrar actividad
    await storage.createActivity({
      type: 'memo_exported',
      memoId,
      startupId: memo.startupId,
      content: `Memo exportado a formato ${format.toUpperCase()}`,
      metadata: { format, url: mockUrl }
    });
    
    console.log(`Memo ${memoId} exportado exitosamente a ${format}`);
    
    return mockUrl;
  } catch (error) {
    console.error(`Error exportando memo ${memoId} a ${format}:`, error);
    throw error;
  }
}