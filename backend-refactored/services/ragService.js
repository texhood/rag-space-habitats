// services/ragService.js
const pool = require('../config/database');
const embeddingService = require('./embeddingService');

class RAGService {
  /**
   * Retrieve relevant chunks using vector similarity
   */
  async retrieveRelevantChunks(question, limit = 5) {
    try {
      // Try vector search first
      const vectorResults = await this.vectorSearch(question, limit);
      
      if (vectorResults.length > 0) {
        console.log('[RAG] Using vector search');
        return vectorResults;
      }
      
      // Fallback to keyword search
      console.log('[RAG] Falling back to keyword search');
      return await this.keywordSearch(question, limit);
      
    } catch (err) {
      console.error('[RAG] Retrieval error:', err);
      return await this.keywordSearch(question, limit);
    }
  }

  /**
   * Vector similarity search
   */
  async vectorSearch(question, limit = 5) {
  try {
    const queryEmbedding = await embeddingService.generateEmbedding(question);
    
    // Get all chunks with embeddings (using index)
    const [chunks] = await pool.query(`
      SELECT id, content, embedding_vector 
      FROM document_chunks 
      WHERE has_embedding = TRUE
    `);
      
      console.log(`[RAG] Comparing query against ${chunks.length} chunks`);
      
      // Calculate similarity scores
      const scoredChunks = chunks.map(chunk => {
        const chunkEmbedding = JSON.parse(chunk.embedding_vector);
        const similarity = embeddingService.cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          content: chunk.content,
          similarity: similarity,
          id: chunk.id
        };
      });
      
      // Sort by similarity and take top results
      scoredChunks.sort((a, b) => b.similarity - a.similarity);
      const topChunks = scoredChunks.slice(0, limit);
      
      console.log(`[RAG] Top ${limit} similarities:`, 
        topChunks.map(c => c.similarity.toFixed(3)).join(', '));
      
      return topChunks.map(c => c.content);
      
    } catch (err) {
      console.error('[RAG] Vector search error:', err.message);
      return [];
    }
  }

  /**
   * Fallback keyword search
   */
  async keywordSearch(question, limit = 5) {
    const keywords = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const searchPattern = `%${keywords.join('%')}%`;

    const [chunks] = await pool.query(`
      SELECT content 
      FROM document_chunks 
      WHERE LOWER(content) LIKE ?
      LIMIT ?
    `, [searchPattern, limit]);

    return chunks.map(chunk => chunk.content);
  }
}

module.exports = new RAGService();