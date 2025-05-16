import OpenAI from "openai";
import { AiQueryRequest, AiQueryResponse, MemoGenerationRequest, MemoSection } from "@shared/types";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Processes a natural language query and returns an answer with optional sources
 */
export async function processQuery(request: AiQueryRequest): Promise<AiQueryResponse> {
  const { startupId, question, includeSourceDocuments = true } = request;
  
  try {
    console.log(`Procesando consulta: "${question}" para startupId: ${startupId || 'todos'}`);
    
    // Primero intentemos obtener todos los chunks para ese startup si existen
    let relevantChunks = [];
    
    if (startupId && startupId !== "all") {
      // Si se seleccionó un startup específico, obtener todos sus chunks
      console.log("Buscando todos los chunks para el startup:", startupId);
      const allStartupChunks = await storage.searchChunks("", startupId, 10);
      console.log(`Encontrados ${allStartupChunks.length} chunks totales para el startup`);
      
      if (allStartupChunks.length > 0) {
        // Si hay chunks disponibles, intentamos filtrar por relevancia primero
        const filteredChunks = await storage.searchChunks(question, startupId);
        console.log(`Filtrados ${filteredChunks.length} chunks relevantes a la consulta`);
        
        // Si encontramos chunks relevantes los usamos, si no usamos todos
        relevantChunks = filteredChunks.length > 0 ? filteredChunks : allStartupChunks;
      }
    } else {
      // Buscar en todos los startups
      console.log("Buscando chunks en todos los startups");
      relevantChunks = await storage.searchChunks(question);
    }
    
    console.log(`Usando ${relevantChunks.length} chunks para responder`);
    
    if (relevantChunks.length === 0) {
      console.log("No se encontraron chunks relevantes");
      return {
        answer: "I don't have enough information to answer that question. Try uploading more documents or rephrasing your question."
      };
    }
    
    // Prepare context from chunks
    const context = relevantChunks.map(chunk => chunk.content).join("\n\n");
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an investment analyst assistant helping with startup due diligence. " +
            "Answer questions based on the context provided, and only use that information. " +
            "If you don't know or the information isn't in the context, say so. " +
            "Be concise, accurate, and focus on facts and insights that would matter to investors."
        },
        {
          role: "user",
          content: `Context information from startup documents:\n\n${context}\n\nQuestion: ${question}`
        }
      ],
    });
    
    const answer = response.choices[0].message.content || "Unable to generate an answer.";
    
    // Prepare sources if requested
    let sources;
    if (includeSourceDocuments) {
      sources = await Promise.all(
        relevantChunks.map(async (chunk) => {
          const document = await storage.getDocument(chunk.documentId);
          return {
            documentId: chunk.documentId,
            documentName: document?.name || "Unknown document",
            content: chunk.content,
          };
        })
      );
    }
    
    return {
      answer,
      sources,
    };
  } catch (error) {
    console.error("Error processing query:", error);
    throw new Error("Failed to process your query. Please try again later.");
  }
}

/**
 * Analyzes startup alignment with investment thesis
 */
export async function analyzeStartupAlignment(startupId: string): Promise<number> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    // Get relevant chunks for this startup
    const documents = await storage.getDocumentsByStartup(startupId);
    if (documents.length === 0) {
      return 0; // Not enough data to analyze
    }
    
    // In a real implementation, we would analyze the data more thoroughly
    // For simplicity in this MVP, we'll generate a random score based on startup stage and vertical
    
    // Preferred verticals for H20 Capital
    const preferredVerticals = ['fintech', 'saas', 'ai'];
    const verticalBonus = preferredVerticals.includes(startup.vertical) ? 0.3 : 0;
    
    // Preferred stages
    const stageScores = {
      'pre-seed': 0.25,
      'seed': 0.25,
      'series-a': 0.1
    };
    
    // Base score + vertical bonus + stage score + document count factor
    const baseScore = 0.3;
    const stageScore = stageScores[startup.stage] || 0;
    const docsScore = Math.min(documents.length / 20, 0.1);
    
    // Calculate final score (0-1)
    const alignmentScore = baseScore + verticalBonus + stageScore + docsScore;
    
    // Update the startup with the calculated alignment score
    await storage.updateStartup(startupId, { alignmentScore });
    
    return alignmentScore;
  } catch (error) {
    console.error("Error analyzing startup alignment:", error);
    throw new Error("Failed to analyze startup alignment. Please try again later.");
  }
}

/**
 * Generate investment memo sections
 */
export async function generateMemoSection(startupId: string, section: string): Promise<MemoSection> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) {
      throw new Error("Startup not found");
    }
    
    // Get relevant chunks for this startup and section topic
    const relevantChunks = await storage.searchChunks(section, startupId, 15);
    
    if (relevantChunks.length === 0) {
      return {
        title: section,
        content: "Insufficient data available to generate this section. Please upload more relevant documents.",
      };
    }
    
    // Prepare context from chunks
    const context = relevantChunks.map(chunk => chunk.content).join("\n\n");
    
    // Create section content with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an investment memo writer for a venture capital firm. " +
            "Generate professional, well-structured content for the requested section of an investment memo. " +
            "Use only the provided context information. If insufficient data is available, " +
            "note the information gaps clearly. Use the voice and style of an experienced investment analyst."
        },
        {
          role: "user",
          content: `
          Startup: ${startup.name}
          Vertical: ${startup.vertical}
          Stage: ${startup.stage}
          Location: ${startup.location}
          Amount sought: ${startup.amountSought} ${startup.currency}
          
          Section to generate: ${section}
          
          Context information:
          ${context}
          
          Generate a well-structured, professional ${section} section for an investment memo.`
        }
      ],
    });
    
    const content = response.choices[0].message.content || "Unable to generate content for this section.";
    
    // Collect document sources
    const sources = relevantChunks.map(chunk => ({
      documentId: chunk.documentId,
      content: chunk.content.substring(0, 100) + "..."
    }));
    
    return {
      title: section,
      content,
      sources,
      lastEdited: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error generating memo section ${section}:`, error);
    return {
      title: section,
      content: "Error generating this section. Please try again later.",
    };
  }
}
