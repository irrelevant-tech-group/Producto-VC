// server/services/openai/thesisAlignmentAnalyzer.ts

import { investmentThesisService } from "../investmentThesis/thesisService";
import { storage } from "../../storage";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeStartupAlignmentWithThesis(
  startupId: string,
  fundId?: string
): Promise<any> {
  try {
    const startup = await storage.getStartup(startupId);
    if (!startup) throw new Error("Startup not found");

    // Obtener contexto de la tesis
    const thesisContext = fundId 
      ? await investmentThesisService.buildAlignmentContext(fundId)
      : "";

    const documents = await storage.getDocumentsByStartup(startupId);
    const chunks = await storage.searchChunks("", startupId, 50);

    if (documents.length === 0 && chunks.length === 0) {
      return generateFallbackWithThesis(startup, thesisContext);
    }

    const contextSample = chunks
      .slice(0, 30)
      .map(chunk => chunk.content)
      .join("\n\n")
      .slice(0, 20000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
Eres un analista de venture capital que debe evaluar el alineamiento de startups con una tesis de inversión específica.

TESIS DE INVERSIÓN A APLICAR:
${thesisContext}

INSTRUCCIONES:
- Evalúa ESTRICTAMENTE contra los criterios de la tesis proporcionada
- Usa los pesos y criterios específicos definidos en la tesis
- Menciona específicamente qué aspectos de la tesis se cumplen o no
- Califica red flags definidos en la tesis
- Verifica must-haves de la tesis

Responde ÚNICAMENTE con JSON válido en este formato:
{
  "alignmentScore": 75,
  "summary": "Análisis contra la tesis específica del fondo",
  "criteriaScores": {
    "vertical": {"score": 80, "justification": "Evaluación contra verticales preferidos de la tesis"},
    "stage": {"score": 70, "justification": "Evaluación contra etapas preferidas"},
    "market": {"score": 85, "justification": "Análisis de mercado según criterios de la tesis"},
    "team": {"score": 75, "justification": "Evaluación del equipo según estándares de la tesis"},
    "product": {"score": 80, "justification": "Análisis de producto según criterios"},
    "traction": {"score": 60, "justification": "Evaluación de tracción según expectations"},
    "thesis_fit": {"score": 90, "justification": "Fit general con la filosofía del fondo"}
  },
  "strengths": ["Fortaleza específica vs tesis", "Otra fortaleza"],
  "weaknesses": ["Debilidad vs criterios", "Otra área de mejora"],
  "recommendations": ["Recomendación basada en tesis", "Siguiente paso"],
  "riskFactors": ["Riesgo identificado", "Otro riesgo"],
  "thesisAlignment": {
    "verticalMatch": 0.8,
    "stageMatch": 0.9,
    "redFlagsCount": 0,
    "mustHavesMatch": 0.7
  }
}
          `
        },
        {
          role: "user",
          content: `
Evalúa este startup contra la tesis de inversión:

STARTUP: ${startup.name}
VERTICAL: ${startup.vertical}
ETAPA: ${startup.stage}
UBICACIÓN: ${startup.location}
MONTO: ${startup.amountSought ? `${startup.amountSought} ${startup.currency}` : "No especificado"}

DOCUMENTOS: ${documents.length}
TIPOS: ${documents.map(d => d.type).join(', ') || 'ninguno'}

CONTENIDO:
${contextSample || 'Sin contenido disponible'}

Evalúa el alineamiento con la tesis específica y responde con el JSON requerido.
          `
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || "{}");
    
    // Procesar y guardar resultado
    const result = {
      startupId,
      name: startup.name,
      alignmentScore: analysisResult.alignmentScore / 100,
      analysis: {
        summary: analysisResult.summary,
        criteriaScores: analysisResult.criteriaScores || {},
        strengths: analysisResult.strengths || [],
        weaknesses: analysisResult.weaknesses || [],
        recommendations: analysisResult.recommendations || [],
        riskFactors: analysisResult.riskFactors || [],
        thesisAlignment: analysisResult.thesisAlignment || {}
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        documentCount: documents.length,
        usedCustomThesis: !!fundId,
        thesisVersion: fundId ? "custom" : "default"
      }
    };

    // Actualizar en base de datos
    await storage.updateStartup(startupId, { 
      alignmentScore: result.alignmentScore,
      lastAnalyzedAt: new Date().toISOString(),
      metadata: {
        ...startup.metadata,
        alignmentAnalysis: {
          ...result.analysis,
          lastUpdated: new Date().toISOString(),
          thesisUsed: fundId || "default"
        }
      }
    });

    return result;

  } catch (error) {
    console.error("Error analyzing with thesis:", error);
    throw error;
  }
}

function generateFallbackWithThesis(startup: any, thesisContext: string): any {
  // Implementar fallback básico cuando no hay documentos
  const preferredVerticals = ["fintech", "saas", "ai", "marketplace"];
  const verticalMatch = preferredVerticals.includes(startup.vertical.toLowerCase()) ? 0.8 : 0.3;
  
  const stageScores: Record<string, number> = {
    "first approach": 0.9,
    "due diligence": 0.8,
    "post inversion": 0.4,
  };
  const stageMatch = stageScores[startup.stage.toLowerCase()] || 0.2;
  
  const alignmentScore = (verticalMatch + stageMatch) / 2;
  
  return {
    startupId: startup.id,
    name: startup.name,
    alignmentScore,
    analysis: {
      summary: `Análisis básico contra tesis de inversión. Vertical ${startup.vertical} ${verticalMatch > 0.5 ? 'alineado' : 'no prioritario'}, etapa ${startup.stage} ${stageMatch > 0.5 ? 'objetivo' : 'fuera de foco'}.`,
      criteriaScores: {
        vertical: { score: verticalMatch * 100, justification: `Vertical ${startup.vertical} evaluado contra tesis` },
        stage: { score: stageMatch * 100, justification: `Etapa ${startup.stage} evaluada contra preferencias` }
      },
      strengths: verticalMatch > 0.5 ? [`Vertical ${startup.vertical} alineado con tesis`] : ["Startup con potencial"],
      weaknesses: verticalMatch <= 0.5 ? [`Vertical ${startup.vertical} no es foco principal`] : ["Información limitada"],
      recommendations: ["Solicitar más documentación", "Revisar contra criterios detallados de la tesis"],
      riskFactors: ["Información insuficiente para evaluación completa"]
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      fallbackMode: true,
      thesisUsed: "custom"
    }
  };
}