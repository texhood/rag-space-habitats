// services/textExtractor.js
const fs = require('fs').promises;
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const path = require('path');

class TextExtractor {
  /**
   * Extract text from uploaded file based on type
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.pdf':
          return await this.extractFromPDF(filePath);
        
        case '.docx':
          return await this.extractFromDocx(filePath);
        
        case '.doc':
          return await this.extractFromDoc(filePath);
        
        case '.txt':
          return await this.extractFromTxt(filePath);
        
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (err) {
      console.error('Text extraction error:', err);
      throw new Error(`Failed to extract text from ${ext} file: ${err.message}`);
    }
  }

  /**
   * Extract text from PDF
   */
  async extractFromPDF(filePath) {
    try {
      // Read the PDF file as a buffer
      const dataBuffer = await fs.readFile(filePath);
      
      // Parse the PDF - pdf-parse returns a promise directly
      const data = await pdfParse(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text (might be scanned images)');
      }
      
      console.log(`Extracted ${data.text.length} characters from ${data.numpages} pages`);
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version
        }
      };
    } catch (err) {
      console.error('PDF extraction error:', err);
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }

  /**
   * Extract text from Word (.docx)
   */
  async extractFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Word document appears to be empty');
      }
      
      console.log(`Extracted ${result.value.length} characters from Word document`);
      
      return {
        text: result.value,
        metadata: {
          messages: result.messages,
          warnings: result.messages.filter(m => m.type === 'warning')
        }
      };
    } catch (err) {
      console.error('Word extraction error:', err);
      throw new Error(`Word extraction failed: ${err.message}`);
    }
  }

  /**
   * Extract text from old Word format (.doc)
   */
  async extractFromDoc(filePath) {
    // .doc files require different handling
    // mammoth has limited .doc support
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      console.log(`Extracted ${result.value.length} characters from legacy .doc file`);
      
      return {
        text: result.value,
        metadata: {
          note: 'Extracted from .doc format (legacy)',
          messages: result.messages
        }
      };
    } catch (err) {
      throw new Error('Failed to extract from .doc file. Please convert to .docx or PDF format.');
    }
  }

  /**
   * Extract text from plain text file
   */
  async extractFromTxt(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text file appears to be empty');
      }
      
      console.log(`Extracted ${text.length} characters from text file`);
      
      return {
        text: text,
        metadata: {
          encoding: 'utf-8'
        }
      };
    } catch (err) {
      console.error('Text file extraction error:', err);
      throw new Error(`Text extraction failed: ${err.message}`);
    }
  }

  /**
   * Get file info without extracting
   */
  async getFileInfo(filePath) {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    return {
      size: stats.size,
      sizeReadable: this.formatBytes(stats.size),
      extension: ext,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = new TextExtractor();