// server/services/memoGenerator/thesisEnhancedGenerator.ts

import { investmentThesisService } from "../investmentThesis/thesisService";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateMemoSectionWithThesis(
  startupId: string, 
  section: string,
  fundId?: string
): Promise<MemoSection> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) throw new Error("Startup not found");

    // Obtener contexto de la tesis
    const thesisContext = fundId 
      ? await investmentThesisService.buildThesisContext(fundId)
      : "";

    // Buscar chunks relevantes
    const relevantChunks = await storage.searchChunks("", startupId, 15);

    const context = relevantChunks
      .map((chunk, index) => {
        const source = chunk.metadata?.source || "Documento sin título";
        return `--- Fuente ${index + 1}: "${source}" ---\n${chunk.content}`;
      })
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
Eres un analista experto en memos de inversión que debe generar contenido basándose en:

TESIS DE INVERSIÓN DEL FONDO:
${thesisContext}

INSTRUCCIONES:
- Genera contenido para la sección "${section}" del memo de inversión
- Evalúa SIEMPRE contra los criterios específicos de la tesis
- Menciona explícitamente cómo el startup se alinea o no con la tesis
- Usa los pesos y criterios definidos en la tesis para tu análisis
- Identifica red flags y must-haves según la tesis
- Proporciona recomendaciones basadas en la filosofía del fondo

ESTILO:
- Profesional y analítico
- Basado en datos del contexto
- Orientado a decisiones de inversión
- Equilibrado (oportunidades y riesgos)
          `
        },
        {
          role: "user",
          content: `
STARTUP: ${startup.name} (${startup.vertical}, ${startup.stage})
UBICACIÓN: ${startup.location}
MONTO BUSCADO: ${startup.amountSought ? `${startup.amountSought} ${startup.currency}` : "No especificado"}

SECCIÓN A GENERAR: ${section}

CONTEXTO DE DOCUMENTOS:
${context}

Genera contenido profesional para esta sección del memo, evaluando específicamente contra la tesis de inversión del fondo.
          `
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || 
      `No se pudo generar contenido para la sección "${section}".`;

    return {
      title: section,
      content,
      sources: relevantChunks.slice(0, 5).map(chunk => ({
        documentId: chunk.documentId,
        content: chunk.content.substring(0, 200) + "...",
        relevanceScore: chunk.similarity || 0
      })),
      lastEdited: new Date().toISOString(),
      generatedWithThesis: true
    };

  } catch (error) {
    console.error(`Error generating memo section with thesis:`, error);
    return {
      title: section,
      content: `Error al generar la sección "${section}". Por favor, intenta nuevamente.`,
      lastEdited: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}