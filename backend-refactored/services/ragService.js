// services/ragService.js
const pool = require('../config/database');
const embeddingService = require('./embeddingService');
const axios = require('axios');

// System prompt with strict LaTeX formatting rules for BOTH Grok and Claude
const SYSTEM_PROMPT = `You are a helpful AI assistant with expertise in space habitats and orbital engineering.

CRITICAL: MATHEMATICAL NOTATION FORMATTING RULES
When including mathematical formulas or equations in your response, you MUST follow these rules exactly:

1. Use $...$ for inline math (e.g., "The radius $r = 500$ meters")
2. Use $$...$$ for display equations on their own line
3. Do NOT use square brackets [ ] or \\[ \\] for math
4. Do NOT use \\( \\) notation
5. Do NOT wrap math in HTML tags like <p>, <span>, etc.
6. Always use proper LaTeX syntax inside the delimiters

CORRECT EXAMPLES:
✓ "The centripetal acceleration is $a = \\omega^2 r$ where $\\omega$ is angular velocity."
✓ "The rotation period is:

$$T = \\frac{2\\pi}{\\omega}$$

where $T$ is in seconds."

INCORRECT EXAMPLES (NEVER DO THIS):
✗ "[ a = \\omega^2 r ]"
✗ "<p>$$a = \\omega^2 r$$</p>"
✗ "\\[ a = \\omega^2 r \\]"
✗ "\\( a = \\omega^2 r \\)"

Answer questions accurately using the provided context. Use proper mathematical notation as specified above.`;

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
   * Generate answer using selected LLM(s)
   */
  async generateAnswer(question, chunks, llmPreference = 'grok') {
    if (!chunks || chunks.length === 0) {
      return "I don't have enough information to answer that question.";
    }

    // Build context from chunks
    const context = chunks.join('\n\n---\n\n');

    // Check which APIs are available
    const hasGrok = !!(process.env.XAI_API_KEY && process.env.XAI_API_KEY !== 'xai_key');
    const hasClaude = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'not_yet_available');

    console.log(`[RAG] User preference: ${llmPreference}, Available - Grok: ${hasGrok}, Claude: ${hasClaude}`);

    // Handle "both" mode - get answers from both and compare
    if (llmPreference === 'both' && hasClaude && hasGrok) {
      console.log('[RAG] Using BOTH LLMs for comparison');
      return await this._generateWithBoth(question, context);
    }

    // Handle specific preference
    if (llmPreference === 'claude' && hasClaude) {
      console.log('[RAG] Using Claude (user preference)');
      return await this._generateWithClaude(question, context);
    }

    if (llmPreference === 'grok' && hasGrok) {
      console.log('[RAG] Using Grok (user preference)');
      return await this._generateWithGrok(question, context);
    }

    // Fallback: use whatever is available
    if (hasGrok) {
      console.log('[RAG] Falling back to Grok');
      return await this._generateWithGrok(question, context);
    }

    if (hasClaude) {
      console.log('[RAG] Falling back to Claude');
      return await this._generateWithClaude(question, context);
    }

    // No LLM available
    return `Based on the available information:\n\n${chunks[0].substring(0, 500)}...\n\n(No LLM available)`;
  }

  /**
   * Generate answer using Grok API
   */
  async _generateWithGrok(question, context) {
    const prompt = `${SYSTEM_PROMPT}

Context from knowledge base:
${context}

Question: ${question}

Answer:`;

    try {
      console.log('[Grok] Calling API...');
      
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `Context from knowledge base:\n${context}\n\nQuestion: ${question}\n\nAnswer:`
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
      console.log('[Grok] Response received');
      return answer;

    } catch (err) {
      console.error('[Grok] API error:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Generate answer using Claude API
   */
  async _generateWithClaude(question, context) {
    try {
      console.log('[Claude] Calling API...');
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Context from knowledge base:\n${context}\n\nQuestion: ${question}\n\nAnswer:`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          timeout: 60000
        }
      );

      const answer = response.data.content[0].text;
      console.log('[Claude] Response received');
      return answer;

    } catch (err) {
      console.error('[Claude] API error:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Generate answers from BOTH LLMs and present comparison
   */
  async _generateWithBoth(question, context) {
    try {
      console.log('[Both] Requesting answers from both Claude and Grok...');
      
      // Run both in parallel
      const [grokResult, claudeResult] = await Promise.allSettled([
        this._generateWithGrok(question, context),
        this._generateWithClaude(question, context)
      ]);

      let response = '## Comparison of Responses\n\n';

      // Add Grok's response
      if (grokResult.status === 'fulfilled') {
        response += '### 🔵 Grok\'s Answer:\n\n';
        response += grokResult.value + '\n\n';
      } else {
        response += '### 🔵 Grok\'s Answer:\n\n';
        response += '_Grok API unavailable_\n\n';
      }

      response += '---\n\n';

      // Add Claude's response
      if (claudeResult.status === 'fulfilled') {
        response += '### 🟣 Claude\'s Answer:\n\n';
        response += claudeResult.value + '\n\n';
      } else {
        response += '### 🟣 Claude\'s Answer:\n\n';
        response += '_Claude API unavailable_\n\n';
      }

      return response;

    } catch (err) {
      console.error('[Both] Error getting responses:', err);
      // Fall back to whichever one works
      try {
        return await this._generateWithGrok(question, context);
      } catch {
        return await this._generateWithClaude(question, context);
      }
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