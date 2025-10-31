// services/ragService.js
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

class RAGService {
  constructor() {
    // Initialize Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    } else if (process.env.XAI_API_KEY) {
      // Keep Grok support as fallback
      this.useGrok = true;
    }
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
   * Generate answer using Claude or Grok
   */
  async generateAnswer(question, chunks) {
    const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n');

    // If no LLM configured, return chunks
    if (!this.anthropic && !this.useGrok) {
      return this._formatChunksAsAnswer(chunks);
    }

    // Use Claude
    if (this.anthropic) {
      return await this._generateWithClaude(question, context);
    }

    // Use Grok
    if (this.useGrok) {
      return await this._generateWithGrok(question, context);
    }
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
    const axios = require('axios');

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
