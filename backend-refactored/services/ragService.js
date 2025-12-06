// services/ragService.js - With Conversation History Support
const pool = require('../config/database');
const embeddingService = require('./embeddingService');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

class RAGService {
  constructor() {
    // Initialize Claude
    this.anthropic = null;
    this.useClaude = false;
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.useClaude = true;
      console.log('✅ Claude API initialized');
    }

    // Initialize Grok
    this.useGrok = !!process.env.XAI_API_KEY;
    if (this.useGrok) {
      console.log('✅ Grok API initialized');
    }

    this.currentUserPreference = 'both';
  }

  setUserPreference(preference) {
    this.currentUserPreference = preference;
  }

  /**
   * Retrieve relevant chunks using vector similarity
   */
  async retrieveRelevantChunks(question, limit = 5) {
    try {
      const vectorResults = await this.vectorSearch(question, limit);
      
      if (vectorResults.length > 0) {
        console.log('[RAG] Using vector search');
        return vectorResults;
      }
      
      console.log('[RAG] Falling back to keyword search');
      return await this.keywordSearch(question, limit);
      
    } catch (err) {
      console.error('[RAG] Retrieval error:', err);
      return await this.keywordSearch(question, limit);
    }
  }

  /**
   * Vector search using embeddings
   */
  async vectorSearch(question, limit = 5) {
    try {
      const embeddings = await embeddingService.generateEmbeddings([question]);
      const queryEmbedding = embeddings[0];
      
      if (!queryEmbedding) {
        console.log('[RAG] Failed to generate query embedding');
        return [];
      }

      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const result = await pool.query(`
        SELECT content, metadata, 
               1 - (embedding <=> $1::vector) as similarity
        FROM document_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `, [embeddingStr, limit]);

      console.log(`[RAG] Vector search found ${result.rows.length} chunks`);
      
      if (result.rows.length > 0) {
        const similarities = result.rows.map(r => r.similarity.toFixed(3));
        console.log(`[RAG] Top similarities: ${similarities.join(', ')}`);
      }

      return result.rows.map(row => row.content);

    } catch (err) {
      console.error('[RAG] Vector search error:', err);
      return [];
    }
  }

  /**
   * Keyword search fallback
   */
  async keywordSearch(question, limit = 5) {
    try {
      const keywords = question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 5);
      
      if (keywords.length === 0) {
        return [];
      }

      const searchPattern = keywords.join(' | ');
      
      const result = await pool.query(`
        SELECT content, metadata
        FROM document_chunks
        WHERE to_tsvector('english', content) @@ to_tsquery('english', $1)
        LIMIT $2
      `, [searchPattern, limit]);

      console.log(`[RAG] Keyword search found ${result.rows.length} chunks`);
      return result.rows.map(row => row.content);

    } catch (err) {
      console.error('[RAG] Keyword search error:', err);
      return [];
    }
  }

  /**
   * Generate answer from chunks using LLM - NOW WITH CONVERSATION HISTORY
   */
  async generateAnswer(question, chunks, conversationHistory = []) {
    if (!chunks || chunks.length === 0) {
      return "I don't have enough information to answer that question. Could you please rephrase or ask something else about space habitats?";
    }

    const context = chunks.map((c, i) => `[Source ${i + 1}]\n${c}`).join('\n\n---\n\n');
    const userPreference = this.currentUserPreference || 'both';

    console.log(`[RAG] User preference: ${userPreference}, Available - Grok: ${this.useGrok}, Claude: ${this.useClaude}`);
    console.log(`[RAG] Conversation history: ${conversationHistory.length} messages`);

    // Determine which LLM(s) to use
    if (userPreference === 'both' && this.useClaude && this.useGrok) {
      console.log('[RAG] Using BOTH LLMs for comparison');
      return await this._generateWithBoth(question, context, conversationHistory);
    } else if ((userPreference === 'claude' || userPreference === 'both') && this.useClaude) {
      console.log('[RAG] Using Claude API');
      return await this._generateWithClaude(question, context, conversationHistory);
    } else if ((userPreference === 'grok' || userPreference === 'both') && this.useGrok) {
      console.log('[RAG] Using Grok API');
      return await this._generateWithGrok(question, context, conversationHistory);
    }

    return this._formatChunksAsAnswer(chunks);
  }

  /**
   * Generate with Claude - WITH CONVERSATION HISTORY
   */
  async _generateWithClaude(question, context, conversationHistory = []) {
    try {
      console.log('[Claude] Calling API...');
      
      const systemPrompt = `You are an expert assistant specializing in space habitats, orbital engineering, and extraterrestrial settlement design. 

Your knowledge comes from NASA SP-413 "Space Settlements: A Design Study" and related research.

CRITICAL FORMATTING RULES:
- Use $ for inline math: $x = 2$
- Use $$ for display math: $$E = mc^2$$
- NEVER use \\( \\) or \\[ \\] delimiters
- Use proper markdown formatting
- Be conversational and remember previous context in the conversation

Use the following retrieved context to help answer questions:

${context}`;

      // Build messages array with conversation history
      const messages = [];
      
      // Add previous conversation (trimmed if too long)
      const trimmedHistory = this._trimHistory(conversationHistory, 8000);
      messages.push(...trimmedHistory);
      
      // Add current question
      messages.push({
        role: 'user',
        content: question
      });

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        system: systemPrompt,
        messages: messages
      });

      console.log('[Claude] Response received');
      return response.content[0].text;

    } catch (err) {
      console.error('[Claude] Error:', err.message);
      throw err;
    }
  }

  /**
   * Generate with Grok - WITH CONVERSATION HISTORY
   */
  async _generateWithGrok(question, context, conversationHistory = []) {
    try {
      console.log('[Grok] Calling API...');

      const systemPrompt = `You are an expert assistant specializing in space habitats, orbital engineering, and extraterrestrial settlement design.

Your knowledge comes from NASA SP-413 "Space Settlements: A Design Study" and related research.

CRITICAL FORMATTING RULES:
- Use $ for inline math: $x = 2$
- Use $$ for display math: $$E = mc^2$$
- NEVER use \\( \\) or \\[ \\] delimiters
- Use proper markdown formatting
- Be conversational and remember previous context in the conversation

Use the following retrieved context to help answer questions:

${context}`;

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt }
      ];
      
      // Add previous conversation (trimmed if too long)
      const trimmedHistory = this._trimHistory(conversationHistory, 8000);
      messages.push(...trimmedHistory);
      
      // Add current question
      messages.push({
        role: 'user',
        content: question
      });

      const res = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2-latest',
          messages: messages,
          max_tokens: 8000,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Grok] Response received');
      return res.data.choices[0].message.content.trim();

    } catch (err) {
      console.error('[Grok] Error:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Generate with both LLMs - WITH CONVERSATION HISTORY
   */
  async _generateWithBoth(question, context, conversationHistory = []) {
    console.log('[Both] Requesting answers from both Claude and Grok...');

    try {
      const [claudeAnswer, grokAnswer] = await Promise.all([
        this._generateWithClaude(question, context, conversationHistory),
        this._generateWithGrok(question, context, conversationHistory)
      ]);

      return `## 🔵 Grok's Answer:\n\n${grokAnswer}\n\n---\n\n## 🟣 Claude's Answer:\n\n${claudeAnswer}`;

    } catch (err) {
      console.error('[Both] Error:', err.message);
      
      // Try individual fallbacks
      if (this.useClaude) {
        try {
          console.log('[Both] Falling back to Claude only');
          return await this._generateWithClaude(question, context, conversationHistory);
        } catch (e) { /* continue */ }
      }
      if (this.useGrok) {
        try {
          console.log('[Both] Falling back to Grok only');
          return await this._generateWithGrok(question, context, conversationHistory);
        } catch (e) { /* continue */ }
      }
      
      throw err;
    }
  }

  /**
   * Trim conversation history to fit within token limits
   * Keeps most recent messages, drops oldest if too long
   */
  _trimHistory(history, maxTokens = 8000) {
    if (!history || history.length === 0) return [];
    
    // Rough estimate: 4 chars per token
    const estimateTokens = (text) => Math.ceil((text || '').length / 4);
    
    let tokenCount = 0;
    const trimmed = [];
    
    // Work backwards from most recent
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const msgTokens = estimateTokens(msg.content);
      
      if (tokenCount + msgTokens > maxTokens) {
        console.log(`[RAG] Trimmed conversation history from ${history.length} to ${trimmed.length} messages`);
        break;
      }
      
      trimmed.unshift(msg);
      tokenCount += msgTokens;
    }
    
    return trimmed;
  }

  /**
   * Format chunks as basic answer when no LLM available
   */
  _formatChunksAsAnswer(chunks) {
    if (chunks.length === 0) {
      return 'No relevant information found in the database.';
    }

    return chunks
      .map((chunk, i) => `**[Source ${i + 1}]**\n\n${chunk}`)
      .join('\n\n---\n\n');
  }
}

module.exports = new RAGService();