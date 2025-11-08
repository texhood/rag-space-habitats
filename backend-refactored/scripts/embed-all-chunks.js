#!/usr/bin/env node
require('dotenv').config();
const pool = require('../config/database');
const embeddingService = require('../services/embeddingService');

async function embedAllChunks() {
  try {
    console.log('🔬 Starting batch embedding process...\n');
    
    // Check embedding service
    const healthy = await embeddingService.checkHealth();
    if (!healthy) {
      console.error('❌ Embedding service not available');
      process.exit(1);
    }
    
    let totalEmbedded = 0;
    let batchNum = 1;
    
    while (true) {
      // Get chunks without embeddings
      const [chunks] = await pool.query(`
        SELECT id, content 
        FROM document_chunks 
        WHERE embedding_vector IS NULL
        LIMIT 500
      `);
      
      if (chunks.length === 0) {
        console.log('\n✅ All chunks have embeddings!');
        break;
      }
      
      console.log(`\nBatch ${batchNum}: Generating embeddings for ${chunks.length} chunks...`);
      
      const texts = chunks.map(c => c.content);
      const embeddings = await embeddingService.generateBatchEmbeddings(texts);
      
      // Update database
      for (let i = 0; i < chunks.length; i++) {
        const embeddingJson = JSON.stringify(embeddings[i]);
        await pool.query(
          'UPDATE document_chunks SET embedding_vector = ? WHERE id = ?',
          [embeddingJson, chunks[i].id]
        );
      }
      
      totalEmbedded += chunks.length;
      console.log(`✅ Batch ${batchNum} complete (${totalEmbedded} total)`);
      batchNum++;
    }
    
    console.log(`\n🎉 Successfully embedded ${totalEmbedded} chunks!`);
    process.exit(0);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

embedAllChunks();