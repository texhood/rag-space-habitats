// services/projectDocumentProcessor.js - Document text extraction for project uploads
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const embeddingService = require('./embeddingService');

class ProjectDocumentProcessor {
  /**
   * Extract text from a document based on mime type
   * @param {Buffer} fileBuffer - File content
   * @param {String} mimeType - MIME type of the file
   * @param {String} filename - Original filename
   * @returns {Promise<String>} - Extracted text
   */
  async extractText(fileBuffer, mimeType, filename) {
    console.log(`[ProjectDocProc] Extracting text from ${filename} (${mimeType})`);

    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(fileBuffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDOCX(fileBuffer);

        case 'text/plain':
        case 'text/markdown':
          return this.extractFromText(fileBuffer);

        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (err) {
      console.error(`[ProjectDocProc] Extraction error for ${filename}:`, err.message);
      throw err;
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  async extractFromPDF(fileBuffer) {
    try {
      const data = await pdf(fileBuffer);
      console.log(`[ProjectDocProc] PDF: Extracted ${data.text.length} characters, ${data.numpages} pages`);
      return data.text;
    } catch (err) {
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  async extractFromDOCX(fileBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      console.log(`[ProjectDocProc] DOCX: Extracted ${result.value.length} characters`);

      if (result.messages.length > 0) {
        console.warn(`[ProjectDocProc] DOCX warnings:`, result.messages);
      }

      return result.value;
    } catch (err) {
      throw new Error(`DOCX extraction failed: ${err.message}`);
    }
  }

  /**
   * Extract text from plain text or markdown files
   */
  extractFromText(fileBuffer) {
    const text = fileBuffer.toString('utf-8');
    console.log(`[ProjectDocProc] Text: Extracted ${text.length} characters`);
    return text;
  }

  /**
   * Process document: extract text and generate embedding
   * @param {Buffer} fileBuffer - File content
   * @param {String} mimeType - MIME type
   * @param {String} filename - Original filename
   * @returns {Promise<Object>} - {text, embedding}
   */
  async processDocument(fileBuffer, mimeType, filename) {
    console.log(`[ProjectDocProc] Processing document: ${filename}`);

    // Extract text
    const text = await this.extractText(fileBuffer, mimeType, filename);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    // Generate embedding
    console.log(`[ProjectDocProc] Generating embedding for ${filename}...`);
    const embedding = await embeddingService.generateEmbedding(text);

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    console.log(`[ProjectDocProc] Successfully processed ${filename}`);
    console.log(`[ProjectDocProc] Text length: ${text.length}, Embedding dimensions: ${embedding.length}`);

    return {
      text,
      embedding
    };
  }

  /**
   * Validate file type
   * @param {String} mimeType - MIME type to validate
   * @returns {Boolean}
   */
  isValidFileType(mimeType) {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   * @param {Number} size - File size in bytes
   * @param {Number} maxSize - Maximum allowed size (default 200MB)
   * @returns {Boolean}
   */
  isValidFileSize(size, maxSize = 200 * 1024 * 1024) {
    return size <= maxSize;
  }
}

// Export singleton instance
module.exports = new ProjectDocumentProcessor();
