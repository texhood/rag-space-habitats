// services/ragService.js
const pool = require('../config/database');
const embeddingService = require('./embeddingService');
const axios = require('axios');

class RAGService {
  /**
   * Retrieve relevant chunks using vector similarity or keyword search
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
   * Generate answer from chunks using LLM
   */
  async generateAnswer(question, chunks) {
    if (!chunks || chunks.length === 0) {
      return "I don't have enough information to answer that question.";
    }

    // Build context from chunks
    const context = chunks.join('\n\n---\n\n');

    const prompt = `You are a helpful AI assistant with expertise in space habitats and orbital engineering. Use the following context to answer the question accurately and concisely.

Context from knowledge base:
${context}

Question: ${question}

Please provide a clear, accurate answer based on the context above. If the context doesn't contain enough information, say so.

Answer:`;

    try {
      console.log('[LLM] Calling Grok API...');
      
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant specializing in space habitats and orbital engineering.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'grok-3',
          stream: false,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`
          },
          timeout: 60000
        }
      );

      const answer = response.data.choices[0].message.content;
      console.log('[LLM] Response received');
      return answer;

    } catch (err) {
      console.error('[LLM] Grok error:', err.response?.data || err.message);
      
      // Fallback: return context-based response
      return `Based on the available information:\n\n${chunks[0].substring(0, 500)}...\n\n(Full LLM response unavailable)`;
    }
  }

  /**
   * Vector similarity search with smart query expansion
   */
  async vectorSearch(question, limit = 5) {
    try {
      // Smart query expansion based on detected keywords
      let expandedQuery = question;
      
      const lowerQuestion = question.toLowerCase();
      
      // Gravity-related queries
      if (lowerQuestion.includes('gravity') || lowerQuestion.includes('g-force') || 
          lowerQuestion.includes('simulate') || lowerQuestion.includes('artificial')) {
        expandedQuery += ' rotation centrifugal spinning angular velocity';
      }
      
      // Radiation-related queries
      if (lowerQuestion.includes('radiation') || lowerQuestion.includes('shielding') || 
          lowerQuestion.includes('protection') || lowerQuestion.includes('cosmic')) {
        expandedQuery += ' shield protection water regolith magnetic field';
      }
      
      // Habitat structure queries
      if (lowerQuestion.includes('habitat') || lowerQuestion.includes('station') || 
          lowerQuestion.includes('cylinder') || lowerQuestion.includes('torus')) {
        expandedQuery += ' structure design colony settlement spacecraft';
      }
      
      // Life support queries
      if (lowerQuestion.includes('life support') || lowerQuestion.includes('oxygen') || 
          lowerQuestion.includes('air') || lowerQuestion.includes('water')) {
        expandedQuery += ' recycling atmosphere breathing closed-loop';
      }
      
      // Agriculture/food queries
      if (lowerQuestion.includes('food') || lowerQuestion.includes('farm') || 
          lowerQuestion.includes('agriculture') || lowerQuestion.includes('grow')) {
        expandedQuery += ' hydroponics plants crops cultivation greenhouse';
      }
      
      // Structural/engineering queries
      if (lowerQuestion.includes('material') || lowerQuestion.includes('structure') || 
          lowerQuestion.includes('stress') || lowerQuestion.includes('strength')) {
        expandedQuery += ' steel aluminum composite tension compression engineering';
      }
      
      console.log('[RAG] Original query:', question);
      console.log('[RAG] Expanded query:', expandedQuery);
      
      // Generate embedding for the expanded question
      const queryEmbedding = await embeddingService.generateEmbedding(expandedQuery);
      
      // Get all chunks with embeddings
      const [chunks] = await pool.query(`
        SELECT id, content, embedding_vector 
        FROM document_chunks 
        WHERE has_embedding = TRUE
      `);
      
      if (chunks.length === 0) {
        console.log('[RAG] No embedded chunks found');
        return [];
      }
      
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
      
      // Return just the content strings (what the controller expects)
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
    console.log('[RAG] Using keyword search');
    
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