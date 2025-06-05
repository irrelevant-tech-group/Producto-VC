// server/services/openai/enhancedQueryProcessor.ts

import { investmentThesisService } from "../investmentThesis/thesisService";
import { AiQueryRequest, AiQueryResponse } from "@shared/types";
import { storage } from "../../storage";
import { generateEmbedding } from "./embeddings";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processQueryWithThesis(
  request: AiQueryRequest,
  fundId?: string
): Promise<AiQueryResponse> {
  const { startupId, question, includeSourceDocuments = true } = request;
  
  try {
    // 1. Obtener contexto de la tesis de inversión
    const thesisContext = fundId 
      ? await investmentThesisService.buildThesisContext(fundId)
      : investmentThesisService.getDefaultThesisContext();

    // 2. Generar embedding y buscar chunks
    let questionEmbedding: number[] | null = null;
    try {
      questionEmbedding = await generateEmbedding(question);
    } catch (embeddingError) {
      console.error("Error al generar embedding:", embeddingError);
    }

    const effectiveStartupId = startupId === "all" ? undefined : startupId;
    let relevantChunks: any[] = [];
    
    if (questionEmbedding) {
      relevantChunks = await storage.searchChunksByEmbedding(
        questionEmbedding,
        effectiveStartupId,
        10,
        fundId
      );
    } else {
      relevantChunks = await storage.searchChunks(
        question,
        effectiveStartupId,
        10,
        fundId
      );
    }

    if (relevantChunks.length === 0) {
      return {
        answer: "No tengo suficiente información para responder esa pregunta basándome en los documentos disponibles.",
        sources: []
      };
    }

    // 3. Preparar contexto enriquecido
    const documentContext = relevantChunks
      .map((chunk, index) => {
        const sourceName = chunk.metadata?.source || "Documento sin nombre";
        const sourceType = chunk.metadata?.documentType || "desconocido";
        const pageInfo = chunk.metadata?.page ? ` (página ${chunk.metadata.page})` : "";
        const citationNumber = index + 1;
        
        return `[FUENTE ${citationNumber}] "${sourceName}" (${sourceType})${pageInfo}:\n${chunk.content}`;
      })
      .join("\n\n");

    // 4. Crear prompt enriquecido con la tesis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
Eres un asistente analista de inversiones especializado que debe evaluar y responder basándote en:

1. LA TESIS DE INVERSIÓN DEL FONDO (CRÍTICO - debe guiar todas tus respuestas):
${thesisContext}

2. INSTRUCCIONES DE ANÁLISIS:
- SIEMPRE evalúa contra los criterios específicos de la tesis de inversión
- Cita fuentes usando [FUENTE X] donde X es el número de la fuente
- Proporciona análisis balanceados que consideren tanto oportunidades como riesgos
- Relaciona tu análisis con los criterios de evaluación definidos en la tesis
- Si detectas red flags de la tesis, mencionálos específicamente
- Si encuentras must-haves de la tesis, destácalos

3. ESTILO DE RESPUESTA:
- Profesional pero accesible
- Orientado a decisiones de inversión
- Basado en datos cuando estén disponibles
- Objetivo y equilibrado

Responde ÚNICAMENTE basándote en la información proporcionada en el contexto y siempre desde la perspectiva de la tesis de inversión del fondo.
          `
        },
        {
          role: "user",
          content: `
CONTEXTO DE DOCUMENTOS:
${documentContext}

PREGUNTA: ${question}

Por favor, responde basándote en la tesis de inversión y el contexto de documentos proporcionado.
          `
        }
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const answer = response.choices?.[0]?.message?.content || "No se pudo generar una respuesta.";

    // 5. Preparar fuentes
    let sources: AiQueryResponse['sources'] = [];
    if (includeSourceDocuments) {
      sources = await Promise.all(
        relevantChunks.map(async (chunk, index) => {
          const document = await storage.getDocument(chunk.documentId);
          return {
            documentId: chunk.documentId,
            documentName: document?.name || "Documento desconocido",
            documentType: document?.type || "desconocido",
            content: chunk.content,
            relevanceScore: chunk.similarity || 0,
            sourceIndex: index + 1,
            metadata: {
              ...chunk.metadata || {},
              extractedAt: chunk.metadata?.extractedAt || null,
              pageInfo: chunk.metadata?.page || null,
            }
          };
        })
      );
    }

    return { answer, sources };

  } catch (error) {
    console.error("Error al procesar consulta con tesis:", error);
    throw new Error("No se pudo procesar tu consulta. Por favor, intenta de nuevo más tarde.");
  }
}