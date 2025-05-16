import { db, pool } from "../server/db";
import { storage } from "../server/storage";
import { generateEmbedding } from "../server/services/openai";

async function testVectorSearch() {
  try {
    console.log("Iniciando prueba de búsqueda vectorial...");
    
    // Obtener un startup para la prueba
    const startups = await storage.getStartups();
    if (startups.length === 0) {
      console.log("No hay startups disponibles para la prueba");
      return;
    }
    
    const testStartup = startups[0];
    console.log(`Usando startup: ${testStartup.name} (${testStartup.id})`);
    
    // Crear un chunk de prueba con embedding
    const testText = "Este es un texto de prueba para búsqueda vectorial sobre inversiones en startups de tecnología financial";
    console.log(`Generando embedding para: "${testText}"`);
    
    const embedding = await generateEmbedding(testText);
    console.log(`Embedding generado con ${embedding.length} dimensiones`);
    
    // Probar búsqueda vectorial
    const query = "inversiones en fintech";
    console.log(`\nRealizando búsqueda para: "${query}"`);
    
    const queryEmbedding = await generateEmbedding(query);
    const results = await storage.searchChunksByEmbedding(queryEmbedding, testStartup.id, 3);
    
    console.log(`\nResultados (${results.length}):`);
    results.forEach((chunk, index) => {
      console.log(`\n${index + 1}. Chunk ID: ${chunk.id}`);
      console.log(`   Similaridad: ${chunk.similarity || 'N/A'}`);
      console.log(`   Contenido: ${chunk.content.substring(0, 100)}...`);
    });
    
    console.log("\nPrueba completada con éxito");
  } catch (error) {
    console.error("Error en la prueba de búsqueda vectorial:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Ejecutar la prueba
testVectorSearch();