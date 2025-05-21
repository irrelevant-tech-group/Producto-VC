// server/services/documentProcessor/index.ts

// Exportar la función principal de procesamiento de documentos
export { processDocument } from './processor';

// Exportar otras funciones útiles que podrían necesitarse desde fuera
export { extractEntities } from './entityExtraction';
export { semanticChunking, cleanText } from './textProcessing';