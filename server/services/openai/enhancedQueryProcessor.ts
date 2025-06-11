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
    console.log(`🔍 Procesando consulta: "${question}"`);
    console.log(`📍 StartupId: ${startupId}, FundId: ${fundId}`);
    
    // 1. Obtener contexto de la tesis de inversión
    let thesisContext = "";
    try {
      if (fundId) {
        thesisContext = await investmentThesisService.buildThesisContext(fundId);
      }
    } catch (thesisError) {
      console.warn("Error obteniendo tesis:", thesisError);
      thesisContext = "";
    }

    // 2. Generar embedding y buscar chunks
    let questionEmbedding: number[] | null = null;
    try {
      questionEmbedding = await generateEmbedding(question);
      console.log(`✅ Embedding generado correctamente`);
    } catch (embeddingError) {
      console.error("❌ Error al generar embedding:", embeddingError);
    }

    // 3. Determinar parámetros de búsqueda
    const effectiveStartupId = startupId === "all" ? undefined : startupId;
    console.log(`🎯 Búsqueda - StartupId: ${effectiveStartupId}, FundId: ${fundId}`);
    
    let relevantChunks: any[] = [];
    
    // 4. Búsqueda de chunks con múltiples intentos
    if (questionEmbedding) {
      console.log(`🔍 Intentando búsqueda vectorial...`);
      relevantChunks = await storage.searchChunksByEmbedding(
        questionEmbedding,
        effectiveStartupId,
        15,
        fundId
      );
      console.log(`📊 Búsqueda vectorial: ${relevantChunks.length} chunks`);
    } 
    
    if (relevantChunks.length === 0) {
      console.log(`🔍 Fallback a búsqueda de texto...`);
      relevantChunks = await storage.searchChunks(
        question,
        effectiveStartupId,
        15,
        fundId
      );
      console.log(`📊 Búsqueda de texto: ${relevantChunks.length} chunks`);
    }

    // 5. Si no hay chunks, intentar búsquedas más amplias
    if (relevantChunks.length === 0) {
      console.log(`⚠️ Sin resultados, ampliando búsqueda...`);
      
      // Intentar sin fundId
      if (fundId) {
        console.log(`🔄 Intentando sin fundId...`);
        if (questionEmbedding) {
          relevantChunks = await storage.searchChunksByEmbedding(
            questionEmbedding,
            effectiveStartupId,
            15,
            undefined
          );
        } else {
          relevantChunks = await storage.searchChunks(
            question,
            effectiveStartupId,
            15,
            undefined
          );
        }
        console.log(`📊 Sin fundId: ${relevantChunks.length} chunks`);
      }
      
      // Intentar sin startupId
      if (relevantChunks.length === 0 && effectiveStartupId) {
        console.log(`🔄 Intentando sin startupId...`);
        if (questionEmbedding) {
          relevantChunks = await storage.searchChunksByEmbedding(
            questionEmbedding,
            undefined,
            15,
            fundId
          );
        } else {
          relevantChunks = await storage.searchChunks(
            question,
            undefined,
            15,
            fundId
          );
        }
        console.log(`📊 Sin startupId: ${relevantChunks.length} chunks`);
      }
      
      // Búsqueda completamente abierta
      if (relevantChunks.length === 0) {
        console.log(`🔄 Búsqueda completamente abierta...`);
        relevantChunks = await storage.searchChunks(
          "",
          undefined,
          15,
          undefined
        );
        console.log(`📊 Búsqueda abierta: ${relevantChunks.length} chunks`);
      }
    }

    // 6. Verificar resultados finales
    if (relevantChunks.length === 0) {
      console.log(`❌ No se encontraron chunks`);
      
      // Debugging: verificar si hay chunks en la BD
      try {
        const totalChunks = await storage.searchChunks("", undefined, 3, undefined);
        console.log(`🔍 DEBUGGING: Total chunks en BD: ${totalChunks.length}`);
        
        if (totalChunks.length > 0) {
          console.log(`📄 Ejemplo chunk:`, {
            id: totalChunks[0].id?.substring(0, 8),
            startupId: totalChunks[0].startupId?.substring(0, 8),
            fundId: totalChunks[0].fundId?.substring(0, 8) || 'null',
            contentPreview: totalChunks[0].content?.substring(0, 100) + "..."
          });
        }
      } catch (debugError) {
        console.error(`❌ Error debugging:`, debugError);
      }
      
      return {
        answer: `No encontré información específica para responder "${question}". Esto puede deberse a:

1. Los documentos aún se están procesando
2. No hay documentos subidos para esta consulta
3. Los documentos no contienen información relevante

Por favor, verifica que haya documentos procesados o reformula la pregunta.`,
        sources: []
      };
    }

    console.log(`✅ Usando ${relevantChunks.length} chunks para generar respuesta`);

    // 7. Preparar contexto
    const documentContext = relevantChunks
      .map((chunk, index) => {
        const sourceName = chunk.metadata?.source || "Documento sin nombre";
        const sourceType = chunk.metadata?.documentType || "desconocido";
        const pageInfo = chunk.metadata?.page ? ` (página ${chunk.metadata.page})` : "";
        const citationNumber = index + 1;
        
        return `[FUENTE ${citationNumber}] "${sourceName}" (${sourceType})${pageInfo}:\n${chunk.content}`;
      })
      .join("\n\n");

    // 8. Generar respuesta
    const systemPrompt = thesisContext ? `
Eres un asistente analista de inversiones especializado que debe evaluar basándote en:

TESIS DE INVERSIÓN DEL FONDO:
${thesisContext}

INSTRUCCIONES:
- Evalúa contra los criterios específicos de la tesis
- Cita fuentes usando [FUENTE X]
- Proporciona análisis balanceado
- Relaciona con criterios de evaluación de la tesis
- Destaca red flags y must-haves de la tesis

Responde basándote ÚNICAMENTE en el contexto proporcionado.
    ` : `
Eres un asistente analista de inversiones. Responde basándote ÚNICAMENTE en el contexto proporcionado.

INSTRUCCIONES:
- Cita fuentes usando [FUENTE X]
- Proporciona análisis profesional
- Si falta información, indícalo claramente

Responde de manera profesional basándote en el contexto.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `
CONTEXTO DE DOCUMENTOS:
${documentContext}

PREGUNTA: ${question}

Responde basándote en la información proporcionada.
          `
        }
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const answer = response.choices?.[0]?.message?.content || "No se pudo generar una respuesta.";

    // 9. Preparar fuentes
    let sources: AiQueryResponse['sources'] = [];
    if (includeSourceDocuments) {
      sources = await Promise.all(
        relevantChunks.slice(0, 8).map(async (chunk, index) => {
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

    console.log(`📤 Respuesta completada con ${sources.length} fuentes`);
    return { answer, sources };

  } catch (error) {
    console.error("❌ Error procesando consulta:", error);
    throw new Error("No se pudo procesar tu consulta. Por favor, intenta de nuevo más tarde.");
  }
}