// server/services/memoGenerator/templates.ts

// Template for investment memos
export const DEFAULT_MEMO_TEMPLATE = [
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
   * Prompts específicos para cada sección del memo
   */
  export const SECTION_PROMPTS: Record<string, string> = {
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
  
  /**
   * Prompt de sistema para generación de secciones del memo
   */
  export const MEMO_SECTION_SYSTEM_PROMPT = 
    "Eres un experto analista de venture capital especializado en la creación de investment memos. " +
    "Tu tarea es generar una sección específica de un memo de inversión con contenido de alta calidad " +
    "basado únicamente en la información proporcionada. " +
    "Utiliza un estilo profesional, analítico y objetivo. " +
    "Incluye datos concretos y métricas cuando estén disponibles. " +
    "Organiza el contenido con subtítulos cuando sea apropiado para mejorar la legibilidad. " +
    "Si hay información inconsistente entre fuentes, indica la discrepancia. " +
    "No inventes información; si hay brechas importantes en los datos, indícalo claramente.";