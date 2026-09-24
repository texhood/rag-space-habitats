/**
 * Embeddings for document_chunks and project_document_chunks.
 * Stored vectors are 1024 numbers (intfloat/multilingual-e5-large).
 * A local server result with a different length is rejected for that request
 * and does not switch later requests off the local server.
 */
const axios = require('axios');

/**
 * Reject a vector whose length does not match the pgvector column.
 * @param {number[]|undefined} embedding
 * @param {number} dimensions
 * @returns {number[]}
 */
function assertEmbeddingLength(embedding, dimensions) {
  const length = Array.isArray(embedding) ? embedding.length : 0;
  if (length !== dimensions || typeof embedding[0] !== 'number') {
    throw new Error(`Embedding length ${length} does not match required ${dimensions}`);
  }
  return embedding;
}

class EmbeddingService {
  constructor() {
    // Check if local embedding server is configured
    this.embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:5001';
    this.useLocalServer = !process.env.USE_HUGGINGFACE_API; // Default to local if available
    
    // HuggingFace API fallback - USE MODEL THAT SUPPORTS FEATURE-EXTRACTION
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    // Use intfloat/multilingual-e5-large which is confirmed to work with feature-extraction
    this.modelName = 'intfloat/multilingual-e5-large'; // 1024 dimensions
    this.apiUrl = `https://router.huggingface.co/hf-inference/models/${this.modelName}`;
    this.dimensions = 1024; // Changed from 768 to 1024
    
    console.log(`🔧 Embedding Service Mode: ${this.useLocalServer ? 'Local Server' : 'HuggingFace API'}`);
  }

  /**
   * Whether the local server or the Hugging Face API can produce a vector.
   * Does not change which backend later requests try first.
   * @returns {Promise<boolean>}
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
        console.warn('⚠️ Local embedding server not reachable, will try HuggingFace API for this check');
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
   * Vector for one text. Length is this.dimensions (1024).
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    if (this.useLocalServer) {
      try {
        const local = await this.generateEmbeddingViaLocalServer(text);
        return assertEmbeddingLength(local, this.dimensions);
      } catch (err) {
        console.warn('[Embedding] Local result rejected for this request:', err.message);
      }
    }

    const remote = await this.generateEmbeddingViaAPI(text);
    return assertEmbeddingLength(remote, this.dimensions);
  }

  /**
   * Generate embedding via local Python server
   *
   * @param {string} text
   * @returns {Promise<*>}
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
   * Generate an embedding via the Hugging Face router API.
   *
   * @param {string} text
   * @returns {Promise<*>}
   */
  async generateEmbeddingViaAPI(text) {
    if (!this.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY not set and local server unavailable');
    }
    
    try {
      console.log('[HuggingFace] Requesting embedding...', {
        url: this.apiUrl,
        textLength: text.length
      });
      
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
      
      // Handle response format
      if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        // Nested array: [[embedding]]
        embedding = embedding[0];
      } else if (!Array.isArray(embedding)) {
        console.error('[HuggingFace] Unexpected response structure:', embedding);
        throw new Error('Unexpected response format from HuggingFace API');
      }
      
      // Verify it's an array of numbers
      if (!Array.isArray(embedding) || typeof embedding[0] !== 'number') {
        console.error('[HuggingFace] Invalid embedding format:', embedding);
        throw new Error('Invalid embedding format from HuggingFace API');
      }
      
      console.log(`[HuggingFace] ✅ Successfully generated embedding with ${embedding.length} dimensions`);
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
        throw new Error(`Model endpoint not found: ${this.apiUrl}`);
      }
      
      if (status === 400) {
        throw new Error(`Bad request to HuggingFace API: ${errorMsg}. Check model and request format.`);
      }
      
      if (status === 410) {
        throw new Error(`API endpoint deprecated: ${this.apiUrl}`);
      }
      
      throw new Error(`Failed to generate embedding via HuggingFace API: ${errorMsg}`);
    }
  }

  /**
   * Generate embeddings in batch
   *
   * @param {*} texts
   * @returns {Promise<*>}
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
   *
   * @param {*} texts
   * @returns {Promise<*>}
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
   *
   * @param {*} texts
   * @returns {Promise<*>}
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
   *
   * @param {*} vecA
   * @param {*} vecB
   * @returns {*}
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
module.exports.assertEmbeddingLength = assertEmbeddingLength;