// services/embeddingService.js
const axios = require('axios');

class EmbeddingService {
  constructor() {
    // Check if local embedding server is configured
    this.embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:5001';
    this.useLocalServer = !process.env.USE_HUGGINGFACE_API; // Default to local if available
    
    // HuggingFace API fallback - CORRECT NEW ROUTER ENDPOINT
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.modelName = 'sentence-transformers/all-mpnet-base-v2'; // 768 dimensions
    this.apiUrl = `https://router.huggingface.co/hf-inference/models/${this.modelName}`; // CORRECT ENDPOINT
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
        console.warn('⚠️ Local embedding server not reachable, will use HuggingFace API');
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
        console.warn('⚠️ Local server failed, falling back to HuggingFace API:', err.message);
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
   * Generate embedding via HuggingFace Router API (NEW ENDPOINT - 2025)
   */
  async generateEmbeddingViaAPI(text) {
    if (!this.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY not set and local server unavailable');
    }
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          inputs: text.substring(0, 5000),
          options: {
            wait_for_model: true
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
      
      // Response format for feature-extraction through router
      let embedding = response.data;
      
      console.log('[HuggingFace] Raw response type:', typeof embedding, Array.isArray(embedding));
      
      // Handle nested array format (most common for embeddings)
      if (Array.isArray(embedding)) {
        if (Array.isArray(embedding[0])) {
          // Nested array: [[embedding]]
          embedding = embedding[0];
        }
        // Otherwise it's already a flat array
      } else if (embedding && typeof embedding === 'object') {
        // Check for wrapped formats
        if (embedding.embeddings && Array.isArray(embedding.embeddings)) {
          embedding = Array.isArray(embedding.embeddings[0]) ? embedding.embeddings[0] : embedding.embeddings;
        } else if (embedding.embedding && Array.isArray(embedding.embedding)) {
          embedding = embedding.embedding;
        } else {
          console.error('[HuggingFace] Unexpected response structure:', embedding);
          throw new Error('Unexpected response format from HuggingFace API');
        }
      }
      
      // Verify it's an array of numbers
      if (!Array.isArray(embedding) || typeof embedding[0] !== 'number') {
        console.error('[HuggingFace] Invalid embedding format:', embedding);
        throw new Error('Invalid embedding format from HuggingFace API');
      }
      
      // Verify dimensions
      if (embedding.length !== this.dimensions) {
        console.warn(`⚠️ Expected ${this.dimensions} dimensions, got ${embedding.length}`);
      }
      
      console.log(`[HuggingFace] Successfully generated embedding with ${embedding.length} dimensions`);
      return embedding;
      
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      const errorMsg = errorData?.error || err.message;
      
      console.error('[HuggingFace] API error:', {
        status,
        message: errorMsg,
        data: errorData,
        url: this.apiUrl
      });
      
      if (status === 404) {
        throw new Error(`Model endpoint not found. URL: ${this.apiUrl}. Try a different model like 'intfloat/multilingual-e5-large'`);
      }
      
      if (status === 410) {
        throw new Error(`Old API endpoint deprecated. Already using new endpoint: ${this.apiUrl}`);
      }
      
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
        console.warn('⚠️ Local batch embedding failed, falling back to API');
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