// services/embeddingService.js
const axios = require('axios');

class EmbeddingService {
  constructor() {
    // Using HuggingFace Inference API instead of local server
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.modelName = 'sentence-transformers/all-mpnet-base-v2'; // 768 dimensions
    this.apiUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.modelName}`;
    this.dimensions = 768; // all-mpnet-base-v2
    
    if (!this.huggingfaceApiKey) {
      console.warn('⚠️  HUGGINGFACE_API_KEY not set - embeddings will fail');
    } else {
      console.log('✅ HuggingFace Embedding Service initialized with 768-dim model');
    }
  }

  /**
   * Check if embedding service is available
   */
  async checkHealth() {
    try {
      // Test with a simple embedding
      const testEmbedding = await this.generateEmbedding('test');
      console.log(`✅ HuggingFace API healthy - dimension: ${testEmbedding.length}`);
      return true;
    } catch (err) {
      console.error('❌ HuggingFace API not reachable:', err.message);
      return false;
    }
  }

  /**
   * Generate embedding for text using HuggingFace Inference API
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          inputs: text.substring(0, 5000), // Limit length
          options: { 
            wait_for_model: true,
            use_cache: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      // HuggingFace returns the embedding directly as an array
      const embedding = response.data;
      
      // Verify dimensions
      if (embedding.length !== this.dimensions) {
        console.warn(`⚠️  Expected ${this.dimensions} dimensions, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (err) {
      console.error('Embedding generation error:', err.response?.data || err.message);
      throw new Error('Failed to generate embedding: ' + err.message);
    }
  }

  /**
   * Generate embeddings in batch
   * Note: HuggingFace Inference API processes one at a time with rate limits
   */
  async generateBatchEmbeddings(texts) {
    try {
      const allEmbeddings = [];
      
      console.log(`[Embedding] Processing ${texts.length} texts...`);
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i].substring(0, 5000);
        
        try {
          const embedding = await this.generateEmbedding(text);
          allEmbeddings.push(embedding);
          
          if ((i + 1) % 10 === 0) {
            console.log(`[Embedding] Processed ${i + 1}/${texts.length} chunks`);
          }
          
          // Rate limiting: small delay between requests
          if (i < texts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.error(`[Embedding] Failed for chunk ${i + 1}:`, err.message);
          // Continue with other chunks
          allEmbeddings.push(null);
        }
      }
      
      console.log(`[Embedding] Completed: ${allEmbeddings.filter(e => e !== null).length}/${texts.length} successful`);
      
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