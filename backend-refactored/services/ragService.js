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
      const queryEmbedding = await embeddingService.generateEmbedding(question);

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
  async generateAnswer(question, chunks, conversationHistory = [], projectContext = null) {
    if (!chunks || chunks.length === 0) {
      return "I don't have enough information to answer that question. Could you please rephrase or ask something else about space habitats?";
    }

    const context = chunks.map((c, i) => `[Source ${i + 1}]\n${c}`).join('\n\n---\n\n');
    const userPreference = this.currentUserPreference || 'both';

    console.log(`[RAG] User preference: ${userPreference}, Available - Grok: ${this.useGrok}, Claude: ${this.useClaude}`);
    console.log(`[RAG] Conversation history: ${conversationHistory.length} messages`);
    if (projectContext) {
      console.log(`\n========== PROJECT CONTEXT DETECTED ==========`);
      console.log(`Project Name: ${projectContext.name}`);
      console.log(`Description: ${projectContext.description || 'N/A'}`);
      console.log(`Objectives: ${projectContext.objectives || 'N/A'}`);
      console.log(`Constraints: ${projectContext.constraints || 'N/A'}`);
      console.log(`==============================================\n`);
    } else {
      console.log(`[RAG] No project context (regular query)`);
    }

    // Determine which LLM(s) to use
    if (userPreference === 'both' && this.useClaude && this.useGrok) {
      console.log('[RAG] Using BOTH LLMs for comparison');
      return await this._generateWithBoth(question, context, conversationHistory, projectContext);
    } else if ((userPreference === 'claude' || userPreference === 'both') && this.useClaude) {
      console.log('[RAG] Using Claude API');
      return await this._generateWithClaude(question, context, conversationHistory, projectContext);
    } else if ((userPreference === 'grok' || userPreference === 'both') && this.useGrok) {
      console.log('[RAG] Using Grok API');
      return await this._generateWithGrok(question, context, conversationHistory, projectContext);
    }

    return this._formatChunksAsAnswer(chunks);
  }

  /**
   * Generate with Claude - WITH CONVERSATION HISTORY AND PROJECT CONTEXT
   */
  async _generateWithClaude(question, context, conversationHistory = [], projectContext = null) {
    try {
      console.log('[Claude] Calling API...');

      let systemPrompt = `You are an expert assistant specializing in space habitats, orbital engineering, and extraterrestrial settlement design.

Your knowledge comes from NASA SP-413 "Space Settlements: A Design Study" and related research.

CRITICAL FORMATTING RULES:
- Use $ for inline math: $x = 2$
- Use $$ for display math: $$E = mc^2$$
- NEVER use \\( \\) or \\[ \\] delimiters
- Use proper markdown formatting
- Be conversational and remember previous context in the conversation`;

      // Add project context as primary instructions if present
      if (projectContext) {
        systemPrompt += `\n\n=== PROJECT CONTEXT ===
You are currently working within a specific project with the following parameters:

PROJECT: ${projectContext.name}`;

        if (projectContext.description) {
          systemPrompt += `\nDESCRIPTION: ${projectContext.description}`;
        }

        if (projectContext.objectives) {
          systemPrompt += `\n\nOBJECTIVES (FOCUS AREAS):
${projectContext.objectives}

Apply these objectives when answering - prioritize information that aligns with these goals.`;
        }

        if (projectContext.constraints) {
          systemPrompt += `\n\nCONSTRAINTS (LIMITS & EXCLUSIONS):
${projectContext.constraints}

Strictly apply these constraints when formulating your response.`;
        }

        systemPrompt += `\n\n🚨 CRITICAL OVERRIDE INSTRUCTION:
When this PROJECT CONTEXT is provided, you MUST use ONLY the dimensions, parameters, and specifications from the project objectives and constraints above.

DO NOT substitute dimensions from the retrieved documents below.
DO NOT use generic O'Neill Cylinder dimensions (5 miles × 20 miles).
DO NOT use any dimensions other than those specified in this project.

The retrieved documents below are for reference only. If there is ANY conflict between the project specifications above and the retrieved documents below, ALWAYS use the project specifications.

=== END PROJECT CONTEXT ===\n`;
      }

      systemPrompt += `\n\nUse the following retrieved context to help answer questions:\n\n${context}`;

      // Add another reminder AFTER the RAG context if project context exists
      if (projectContext) {
        systemPrompt += `\n\n🚨 REMINDER: You are working within the project "${projectContext.name}". Use ONLY the project-specific dimensions and parameters specified in the PROJECT CONTEXT section above. Do not use dimensions from the retrieved documents.`;
      }

      // LOG THE FULL SYSTEM PROMPT
      console.log(`\n========== CLAUDE SYSTEM PROMPT ==========`);
      console.log(systemPrompt.substring(0, 1500)); // First 1500 chars
      console.log(`\n... (truncated for readability) ...`);
      if (projectContext) {
        console.log(`\n[PROJECT CONTEXT SECTION IN PROMPT]:`);
        const projectSection = systemPrompt.match(/=== PROJECT CONTEXT ===[\s\S]*?=== END PROJECT CONTEXT ===/);
        if (projectSection) {
          console.log(projectSection[0]);
        } else {
          console.log('WARNING: Project context section NOT FOUND in prompt!');
        }
      }
      console.log(`==========================================\n`);

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
   * Generate with Grok - WITH CONVERSATION HISTORY AND PROJECT CONTEXT
   */
  async _generateWithGrok(question, context, conversationHistory = [], projectContext = null) {
    try {
      console.log('[Grok] Calling API...');

      let systemPrompt = `You are an expert assistant specializing in space habitats, orbital engineering, and extraterrestrial settlement design.

Your knowledge comes from NASA SP-413 "Space Settlements: A Design Study" and related research.

CRITICAL FORMATTING RULES:
- Use $ for inline math: $x = 2$
- Use $$ for display math: $$E = mc^2$$
- NEVER use \\( \\) or \\[ \\] delimiters
- Use proper markdown formatting
- Be conversational and remember previous context in the conversation`;

      // Add project context as primary instructions if present
      if (projectContext) {
        systemPrompt += `\n\n=== PROJECT CONTEXT ===
You are currently working within a specific project with the following parameters:

PROJECT: ${projectContext.name}`;

        if (projectContext.description) {
          systemPrompt += `\nDESCRIPTION: ${projectContext.description}`;
        }

        if (projectContext.objectives) {
          systemPrompt += `\n\nOBJECTIVES (FOCUS AREAS):
${projectContext.objectives}

Apply these objectives when answering - prioritize information that aligns with these goals.`;
        }

        if (projectContext.constraints) {
          systemPrompt += `\n\nCONSTRAINTS (LIMITS & EXCLUSIONS):
${projectContext.constraints}

Strictly apply these constraints when formulating your response.`;
        }

        systemPrompt += `\n\n🚨 CRITICAL OVERRIDE INSTRUCTION:
When this PROJECT CONTEXT is provided, you MUST use ONLY the dimensions, parameters, and specifications from the project objectives and constraints above.

DO NOT substitute dimensions from the retrieved documents below.
DO NOT use generic O'Neill Cylinder dimensions (5 miles × 20 miles).
DO NOT use any dimensions other than those specified in this project.

The retrieved documents below are for reference only. If there is ANY conflict between the project specifications above and the retrieved documents below, ALWAYS use the project specifications.

=== END PROJECT CONTEXT ===\n`;
      }

      systemPrompt += `\n\nUse the following retrieved context to help answer questions:\n\n${context}`;

      // Add another reminder AFTER the RAG context if project context exists
      if (projectContext) {
        systemPrompt += `\n\n🚨 REMINDER: You are working within the project "${projectContext.name}". Use ONLY the project-specific dimensions and parameters specified in the PROJECT CONTEXT section above. Do not use dimensions from the retrieved documents.`;
      }

      // LOG THE FULL SYSTEM PROMPT
      console.log(`\n========== GROK SYSTEM PROMPT ==========`);
      console.log(systemPrompt.substring(0, 1500)); // First 1500 chars
      console.log(`\n... (truncated for readability) ...`);
      if (projectContext) {
        console.log(`\n[PROJECT CONTEXT SECTION IN PROMPT]:`);
        const projectSection = systemPrompt.match(/=== PROJECT CONTEXT ===[\s\S]*?=== END PROJECT CONTEXT ===/);
        if (projectSection) {
          console.log(projectSection[0]);
        } else {
          console.log('WARNING: Project context section NOT FOUND in prompt!');
        }
      }
      console.log(`==========================================\n`);

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
          model: 'grok-4-fast-reasoning',
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
   * Generate with both LLMs - WITH CONVERSATION HISTORY AND PROJECT CONTEXT
   */
  async _generateWithBoth(question, context, conversationHistory = [], projectContext = null) {
    console.log('[Both] Requesting answers from both Claude and Grok...');

    try {
      const [claudeAnswer, grokAnswer] = await Promise.all([
        this._generateWithClaude(question, context, conversationHistory, projectContext),
        this._generateWithGrok(question, context, conversationHistory, projectContext)
      ]);

      return `## 🔵 Grok's Answer:\n\n${grokAnswer}\n\n---\n\n## 🟣 Claude's Answer:\n\n${claudeAnswer}`;

    } catch (err) {
      console.error('[Both] Error:', err.message);

      // Try individual fallbacks - MUST include projectContext!
      if (this.useClaude) {
        try {
          console.log('[Both] Falling back to Claude only (with project context)');
          return await this._generateWithClaude(question, context, conversationHistory, projectContext);
        } catch (e) { /* continue */ }
      }
      if (this.useGrok) {
        try {
          console.log('[Both] Falling back to Grok only (with project context)');
          return await this._generateWithGrok(question, context, conversationHistory, projectContext);
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