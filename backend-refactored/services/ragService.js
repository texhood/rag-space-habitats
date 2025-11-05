// services/ragService.js
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const axios = require('axios');

class RAGService {
  constructor() {
    // Initialize Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      this.claudeAvailable = true;
    } else {
      this.claudeAvailable = false;
    }

    // Initialize Grok if API key is available
    if (process.env.XAI_API_KEY) {
      this.grokAvailable = true;
    } else {
      this.grokAvailable = false;
    }

    // Dual LLM mode configuration
    this.dualLLMMode = process.env.DUAL_LLM_MODE === 'true';
    this.primaryLLM = process.env.PRIMARY_LLM || 'claude'; // 'claude' or 'grok'
  }

  /**
   * Retrieve relevant chunks from database
   */
  async retrieveRelevantChunks(question, limit = 5) {
    try {
      // This is a placeholder - implement your actual retrieval logic
      // Could use vector similarity, keyword search, etc.

      // Example: Simple keyword search
      const keywords = question.toLowerCase().split(' ').filter(w => w.length > 3);
      const searchPattern = `%${keywords.join('%')}%`;

      const [chunks] = await pool.query(`
        SELECT content 
        FROM document_chunks 
        WHERE LOWER(content) LIKE ?
        LIMIT ?
      `, [searchPattern, limit]);

      return chunks.map(chunk => chunk.content);
    } catch (err) {
      console.error('Retrieval error:', err);
      return [];
    }
  }

  /**
   * Generate answer using Claude and/or Grok based on configuration
   * Supports single LLM mode and dual LLM mode
   */
  async generateAnswer(question, chunks) {
    const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n');

    // If no LLM configured, return chunks
    if (!this.claudeAvailable && !this.grokAvailable) {
      return this._formatChunksAsAnswer(chunks);
    }

    // Dual LLM mode - get both answers and combine
    if (this.dualLLMMode && this.claudeAvailable && this.grokAvailable) {
      return await this._generateDualLLM(question, context);
    }

    // Single LLM mode - use primary or fallback
    if (this.primaryLLM === 'claude' && this.claudeAvailable) {
      return await this._generateWithClaude(question, context);
    }

    if (this.primaryLLM === 'grok' && this.grokAvailable) {
      return await this._generateWithGrok(question, context);
    }

    // Fallback to whatever is available
    if (this.claudeAvailable) {
      return await this._generateWithClaude(question, context);
    }

    if (this.grokAvailable) {
      return await this._generateWithGrok(question, context);
    }
  }

  /**
   * Generate answers from both Claude and Grok, combine results
   */
  async _generateDualLLM(question, context) {
    console.log('Dual LLM mode enabled - fetching answers from both Claude and Grok');

    try {
      const [claudeAnswer, grokAnswer] = await Promise.all([
        this._generateWithClaude(question, context).catch(err => {
          console.error('Claude failed in dual mode:', err.message);
          return null;
        }),
        this._generateWithGrok(question, context).catch(err => {
          console.error('Grok failed in dual mode:', err.message);
          return null;
        })
      ]);

      // If both failed, return error
      if (!claudeAnswer && !grokAnswer) {
        throw new Error('Both Claude and Grok failed to generate answers');
      }

      // If only one succeeded, return it
      if (!claudeAnswer) {
        return `**Grok Response** (Claude unavailable):\n\n${grokAnswer}`;
      }
      if (!grokAnswer) {
        return `**Claude Response** (Grok unavailable):\n\n${claudeAnswer}`;
      }

      // Both succeeded - combine responses
      return this._combineDualLLMResponses(claudeAnswer, grokAnswer);
    } catch (err) {
      console.error('Dual LLM error:', err);
      throw new Error('Failed to generate answers in dual LLM mode');
    }
  }

  /**
   * Combine responses from both LLMs
   */
  _combineDualLLMResponses(claudeAnswer, grokAnswer) {
    const separator = '\n\n---\n\n';

    return `## Comparative Analysis from Dual LLMs\n\n` +
           `### Claude Sonnet Response\n\n${claudeAnswer}` +
           `${separator}` +
           `### Grok Response\n\n${grokAnswer}` +
           `${separator}` +
           `**Note:** This response combines perspectives from both Claude and Grok to provide comprehensive coverage of your question.`;
  }
  /**
   * Generate answer with Claude
   */
  async _generateWithClaude(question, context) {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        temperature: 0.3,
        system: `You are an expert on space habitats from NASA SP-413. Answer questions using the provided context.

CRITICAL: Use markdown with proper LaTeX math delimiters:
- Inline math: $x = 2$
- Display math: $$E = mc^2$$

NEVER use \\( \\) or \\[ \\] delimiters - always use $ and $$.

Format your response in clean markdown:
- Use **bold** for emphasis
- Use proper paragraphs
- Structure calculations as numbered steps

Include when relevant:
1. **Strengths** (bullets, cite chunks by number)
2. **Weaknesses** (bullets, cite chunks by number)  
3. **Comparison** to other geometries
4. **Exact Calculations** (show all steps with LaTeX)

Example math formatting:
- Inline: The radius is $r = 250$ meters
- Display: $$a = \\omega^2 r$$`,
        messages: [{
          role: 'user',
          content: `Context from NASA SP-413:

${context}

Question: ${question}

Answer (use $ and $$ for all math):`
        }]
      });

      return message.content[0].text;
    } catch (err) {
      console.error('Claude API error:', err);
      throw new Error('Failed to generate answer with Claude');
    }
  }

  /**
   * Generate answer with Grok
   */
  async _generateWithGrok(question, context) {
    try {
      const prompt = `You are an expert on space habitats from NASA SP-413. Answer using **markdown with LaTeX math**:

CRITICAL: Use these exact delimiters for math:
- Inline math: $x = 2$
- Display math: $$E = mc^2$$

NEVER use \\( \\) or \\[ \\] delimiters - always use $ and $$.

Format your response in clean markdown:
- Use **bold** for emphasis
- Use proper paragraphs
- Structure calculations as numbered steps

Include:
1. **Strengths** (bullets, cite chunks)
2. **Weaknesses** (bullets, cite chunks)  
3. **Comparison** to other geometries
4. **Exact Gravity Calculation** (show all steps with LaTeX)

Example math formatting:
- Inline: The radius is $r = 250$ meters
- Display: $$a = \\omega^2 r$$

Context from NASA SP-413:
${context}

Question: ${question}

Answer (use $ and $$ for all math):`;

      const res = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-3',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.3
        },
        {
          headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` }
        }
      );

      return res.data.choices[0].message.content.trim();
    } catch (err) {
      console.error('Grok API error:', err);
      throw new Error('Failed to generate answer with Grok');
    }
  }

  /**
   * Format chunks as basic answer when no LLM available
   */
  _formatChunksAsAnswer(chunks) {
    if (chunks.length === 0) {
      return 'No relevant information found in the database.';
    }

    return chunks
      .map((chunk, i) => `**[Chunk ${i + 1}]**\n\n${chunk}`)
      .join('\n\n---\n\n');
  }
}

// Export singleton instance
module.exports = new RAGService();
