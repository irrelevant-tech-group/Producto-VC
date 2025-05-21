// server/services/documentProcessor/entityExtraction.ts

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracción de entidades con OpenAI
 */
export async function extractEntities(text: string): Promise<any> {
  // Si el texto es muy largo, tomamos solo una muestra representativa
  const sampleText = text.length > 8000 ? 
    text.substring(0, 4000) + "\n\n[...]\n\n" + text.substring(text.length - 4000) : 
    text;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            Extrae entidades clave del siguiente texto. Devuelve JSON con estas categorías:
            - people: Personas mencionadas con sus roles/cargos
            - organizations: Organizaciones mencionadas (competidores, partners, inversores)
            - metrics: Métricas financieras y de tracción (ARR, MRR, CAC, LTV, tasas de crecimiento, etc.)
            - keypoints: Puntos clave sobre el startup (máximo 5 puntos, los más relevantes)
            - products: Productos o servicios mencionados
            - technologies: Tecnologías o frameworks utilizados
            
            Utiliza un formato como:
            {
              "people": [{"name": "Nombre", "role": "Cargo", "confidence": 0.9}],
              "organizations": [{"name": "Nombre", "type": "competitor|partner|investor|customer", "confidence": 0.9}],
              "metrics": [{"name": "Métrica", "value": "Valor", "unit": "Unidad", "context": "Contexto adicional", "confidence": 0.9}],
              "keypoints": ["Punto 1", "Punto 2"],
              "products": [{"name": "Nombre", "description": "Descripción breve", "confidence": 0.9}],
              "technologies": [{"name": "Tecnología", "description": "Uso en el startup", "confidence": 0.9}]
            }
            
            Sé específico y conciso. Si no encuentras información en alguna categoría, devuelve un array vacío.
            Incluye un valor de confianza (confidence) entre 0 y 1 para cada entidad, donde 1 significa máxima certeza.
          `
        },
        {
          role: "user",
          content: sampleText
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    // Validar y parsear la respuesta
    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    
    // Asegurar que todas las categorías existan, incluso si están vacías
    return {
      people: parsed.people || [],
      organizations: parsed.organizations || [],
      metrics: parsed.metrics || [],
      keypoints: parsed.keypoints || [],
      products: parsed.products || [],
      technologies: parsed.technologies || []
    };
  } catch (error) {
    console.error("Error extrayendo entidades:", error);
    return { 
      people: [], 
      organizations: [], 
      metrics: [], 
      keypoints: [], 
      products: [], 
      technologies: [] 
    };
  }
}