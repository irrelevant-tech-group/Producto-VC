// server/services/memoGenerator/sectionGenerator.ts

import { storage } from "../../storage";
import { MemoSection } from "@shared/types";
import { generateEmbedding } from "../openai";
import OpenAI from "openai";
import { MEMO_SECTION_SYSTEM_PROMPT, SECTION_PROMPTS } from './templates';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const sectionSpecificPrompt = SECTION_PROMPTS[section] || 
      "Analiza la información disponible y genera contenido relevante para esta sección del memo de inversión.";
    
    console.log(`Generando contenido para sección "${section}" con ${relevantChunks.length} chunks`);
    
    // Llamada a OpenAI con prompt mejorado para mejor calidad
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: MEMO_SECTION_SYSTEM_PROMPT
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