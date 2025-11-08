// services/embeddingService.js
const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:5001';
    this.dimensions = 384; // all-MiniLM-L6-v2
  }

  /**
   * Check if embedding server is running
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.embeddingServerUrl}/health`, {
        timeout: 2000
      });
      console.log('✅ Embedding server healthy:', response.data);
      return true;
    } catch (err) {
      console.error('❌ Embedding server not reachable:', err.message);
      return false;
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(`${this.embeddingServerUrl}/embed`, {
        text: text.substring(0, 5000) // Limit length
      }, {
        timeout: 10000
      });
      
      return response.data.embedding;
    } catch (err) {
      console.error('Embedding generation error:', err.message);
      throw new Error('Failed to generate embedding: ' + err.message);
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateBatchEmbeddings(texts) {
    try {
      // Split into batches of 50
      const batchSize = 50;
      const allEmbeddings = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map(t => t.substring(0, 5000));
        
        const response = await axios.post(`${this.embeddingServerUrl}/embed-batch`, {
          texts: batch
        }, {
          timeout: 30000
        });
        
        allEmbeddings.push(...response.data.embeddings);
        console.log(`Embedded ${allEmbeddings.length}/${texts.length} chunks`);
      }
      
      return allEmbeddings;
    } catch (err) {
      console.error('Batch embedding error:', err.message);
      throw new Error('Failed to generate batch embeddings: ' + err.message);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = new EmbeddingService();