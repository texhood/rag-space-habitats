// services/embeddingService.js
const axios = require('axios');

class EmbeddingService {
  constructor() {
    // Check if local embedding server is configured
    this.embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:5001';
    this.useLocalServer = !process.env.USE_HUGGINGFACE_API; // Default to local if available
    
    // HuggingFace API fallback - CORRECT NEW ENDPOINT
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.modelName = 'sentence-transformers/all-mpnet-base-v2'; // 768 dimensions
    this.apiUrl = 'https://router.huggingface.co/hf-inference';
    this.dimensions = 768;
    
    console.log(`🔧 Embedding Service Mode: ${this.useLocalServer ? 'Local Server' : 'HuggingFace API'}`);
  }

  /**
   * Check if embedding server is running
   */
  async checkHealth() {
    // Try local server first
    if (this.useLocalServer) {
      try {
        const response = await axios.get(`${this.embeddingServerUrl}/health`, {
          timeout: 2000
        });
        console.log('✅ Local embedding server healthy:', response.data);
        return true;
      } catch (err) {
        console.warn('⚠️  Local embedding server not reachable, will use HuggingFace API');
        this.useLocalServer = false; // Switch to API
      }
    }
    
    // Try HuggingFace API
    if (!this.useLocalServer && this.huggingfaceApiKey) {
      try {
        const testEmbedding = await this.generateEmbeddingViaAPI('test');
        console.log(`✅ HuggingFace API healthy - dimension: ${testEmbedding.length}`);
        return true;
      } catch (err) {
        console.error('❌ HuggingFace API not reachable:', err.message);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Generate embedding for text (tries local first, falls back to API)
   */
  async generateEmbedding(text) {
    // Try local server first
    if (this.useLocalServer) {
      try {
        return await this.generateEmbeddingViaLocalServer(text);
      } catch (err) {
        console.warn('⚠️  Local server failed, falling back to HuggingFace API:', err.message);
        this.useLocalServer = false; // Switch to API for subsequent calls
      }
    }
    
    // Use HuggingFace API
    return await this.generateEmbeddingViaAPI(text);
  }

  /**
   * Generate embedding via local Python server
   */
  async generateEmbeddingViaLocalServer(text) {
    const response = await axios.post(`${this.embeddingServerUrl}/embed`, {
      text: text.substring(0, 5000)
    }, {
      timeout: 10000
    });
    
    return response.data.embedding;
  }

  /**
   * Generate embedding via HuggingFace Inference API (NEW ENDPOINT)
   */
  async generateEmbeddingViaAPI(text) {
    if (!this.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY not set and local server unavailable');
    }
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          inputs: text.substring(0, 5000)
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      // Response format may vary, handle both cases
      let embedding = response.data;
      
      // Check if it's wrapped in an array or object
      if (embedding.embeddings) {
        embedding = embedding.embeddings[0];
      } else if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        embedding = embedding[0];
      }
      
      // Verify dimensions
      if (embedding.length !== this.dimensions) {
        console.warn(`⚠️  Expected ${this.dimensions} dimensions, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error('HuggingFace API error:', errorMsg);
      throw new Error(`Failed to generate embedding via HuggingFace API: ${errorMsg}`);
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateBatchEmbeddings(texts) {
    // Try local server for batch (faster)
    if (this.useLocalServer) {
      try {
        return await this.generateBatchViaLocalServer(texts);
      } catch (err) {
        console.warn('⚠️  Local batch embedding failed, falling back to API');
        this.useLocalServer = false;
      }
    }
    
    // Use HuggingFace API (slower but works)
    return await this.generateBatchViaAPI(texts);
  }

  /**
   * Batch embedding via local server
   */
  async generateBatchViaLocalServer(texts) {
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
  }

  /**
   * Batch embedding via HuggingFace API (slower, one at a time)
   */
  async generateBatchViaAPI(texts) {
    const allEmbeddings = [];
    
    console.log(`[Embedding] Processing ${texts.length} texts via HuggingFace API...`);
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i].substring(0, 5000);
      
      try {
        const embedding = await this.generateEmbeddingViaAPI(text);
        allEmbeddings.push(embedding);
        
        if ((i + 1) % 10 === 0) {
          console.log(`[Embedding] Processed ${i + 1}/${texts.length} chunks`);
        }
        
        // Rate limiting
        if (i < texts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`[Embedding] Failed for chunk ${i + 1}:`, err.message);
        allEmbeddings.push(null);
      }
    }
    
    console.log(`[Embedding] Completed: ${allEmbeddings.filter(e => e !== null).length}/${texts.length} successful`);
    
    return allEmbeddings;
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