import OpenAI from "openai";
import { MemoSection } from "@shared/types";
import { storage } from "../../storage";
import { generateEmbedding } from "./embeddings";
import { calculateCosineSimilarity } from "./embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera una sección de memo de inversión usando embeddings y OpenAI
 */
export async function generateMemoSection(
  startupId: string,
  section: string
): Promise<MemoSection> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }

    const allChunks = await storage.searchChunks("", startupId, 30);

    if (allChunks.length === 0) {
      return {
        title: section,
        content:
          "No hay suficientes datos disponibles para generar esta sección. Por favor, sube más documentos relevantes.",
      };
    }

    // Intentar usar embeddings para relevancia
    let relevantChunks: any[] = [];
    try {
      const sectionContext = `Sección de memo: ${section}. Startup ${startup.name}.`;
      const sectionEmbedding = await generateEmbedding(sectionContext);

      const scored = await Promise.all(
        allChunks.map(async (chunk: any) => {
          try {
            // Usar embedding prexistente si está disponible, de lo contrario generar nuevo
            let chunkEmbedding;
            if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
              chunkEmbedding = chunk.embedding;
            } else {
              chunkEmbedding = await generateEmbedding(chunk.content);
            }
            
            const sim = calculateCosineSimilarity(
              sectionEmbedding,
              chunkEmbedding
            );
            return { ...chunk, semanticScore: sim };
          } catch {
            return { ...chunk, semanticScore: 0 };
          }
        })
      );

      relevantChunks = scored
        .sort((a, b) => b.semanticScore - a.semanticScore)
        .slice(0, 10);
      console.log(
        `Seleccionados ${relevantChunks.length} chunks por similitud semántica`
      );
    } catch (error) {
      console.error("Error al usar embeddings para la sección:", error);
      relevantChunks = await storage.searchChunks(section, startupId, 15);
    }

    if (relevantChunks.length === 0) {
      relevantChunks = allChunks.slice(0, 5);
    }

    const context = relevantChunks
      .map((chunk) => {
        const source = chunk.metadata?.source || "Documento sin título";
        const score = chunk.semanticScore
          ? ` (relevancia: ${(chunk.semanticScore * 100).toFixed(1)}%)`
          : "";
        return `--- De "${source}"${score} ---\n${chunk.content}`;
      })
      .join("\n\n");

    // Mejorar prompt para generar contenido de mayor calidad
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Eres un analista de inversiones experto en capital de riesgo. " +
            "Genera contenido profesional, objetivo y detallado para la sección solicitada del memo de inversión. " +
            "Usa un tono analítico, apoyándote solo en datos concretos del contexto, sin especulaciones. " +
            "Cita fuentes cuando sea posible. Organiza el contenido con subtítulos si es apropiado. " +
            "No inventes información. Si los datos son insuficientes, indícalo claramente."
        },
        {
          role: "user",
          content: `Información del startup:
- Nombre: ${startup.name}
- Sector: ${startup.vertical}
- Etapa: ${startup.stage}
- Ubicación: ${startup.location || "No especificada"}

SECCIÓN DE MEMO DE INVERSIÓN: ${section}

Contexto extraído de documentos:
${context}

Genera un contenido profesional y analítico para esta sección del memo de inversión.
Estructura el texto adecuadamente y mantén un enfoque equilibrado que destaque tanto oportunidades como riesgos.`
        },
      ],
      max_tokens: 1500, // Aumentado para secciones más detalladas
    });

    const content =
      response.choices?.[0]?.message?.content ||
      "No se pudo generar contenido para esta sección.";

    const sources = await Promise.all(
      relevantChunks.map(async (chunk) => {
        const doc = await storage.getDocument(chunk.documentId);
        return {
          documentId: chunk.documentId,
          documentName: doc?.name || "Documento sin nombre",
          documentType: doc?.type || "Desconocido",
          uploadedAt: doc?.uploadedAt || null,
          content: chunk.content.substring(0, 180) + "...", // Ampliado para más contexto
          relevanceScore:
            (chunk.semanticScore as number) ||
            (chunk.similarityScore as number) ||
            0,
        };
      })
    );

    return {
      title: section,
      content,
      sources,
      lastEdited: new Date().toISOString(),
      generatedBy: "gpt-4o"
    };
  } catch (error) {
    console.error(`Error al generar la sección ${section}:`, error);
    return {
      title: section,
      content:
        "Error al generar esta sección. Por favor, intenta nuevamente más tarde.",
      lastEdited: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}