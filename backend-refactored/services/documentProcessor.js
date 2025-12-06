// services/documentProcessor.js
const pool = require('../config/database');
const { getCollection } = require('../config/mongodb');
const { ObjectId } = require('mongodb');
const embeddingService = require('./embeddingService');

class DocumentProcessor {
  constructor() {
    this.chunkSize = 1000; // characters per chunk
    this.chunkOverlap = 200; // overlap between chunks
  }

  /**
   * Process an approved submission into chunks
   */
  async processSubmission(submissionId) {
    try {
      console.log(`\n=== Processing Submission ${submissionId} ===`);
      
      // Get submission from MongoDB
      const submissions = getCollection('document_submissions');
      const submission = await submissions.findOne({ 
        _id: new ObjectId(submissionId) 
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      if (submission.status !== 'approved') {
        throw new Error('Only approved submissions can be processed');
      }

      console.log(`Processing: ${submission.title}`);
      console.log(`Content length: ${submission.content.length} characters`);

      // Split content into chunks
      const chunks = this.createChunks(submission.content);
      console.log(`Created ${chunks.length} chunks`);

      // Generate embeddings for chunks
      console.log('Generating embeddings...');
      let embeddings = [];
      try {
        embeddings = await embeddingService.generateBatchEmbeddings(chunks);
        console.log(`✅ Generated ${embeddings.length} embeddings`);
      } catch (embErr) {
        console.error('⚠️  Embedding generation failed, continuing without embeddings:', embErr.message);
        // Continue without embeddings (they can be generated later)
        embeddings = new Array(chunks.length).fill(null);
      }

      // Store chunks in PostgreSQL with native pgvector embeddings
      let insertedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const metadata = {
          title: submission.title,
          source: submission.file_info?.original_name || 'text_submission',
          category: submission.category,
          tags: submission.tags,
          submitted_by: submission.submitted_by_username,
          submitted_at: submission.submitted_at
        };

        // Convert embedding array to pgvector format string
        let embeddingValue = null;
        if (embeddings[i] && Array.isArray(embeddings[i])) {
          embeddingValue = `[${embeddings[i].join(',')}]`;
        }

        await pool.query(
          `INSERT INTO document_chunks 
           (content, metadata, source_id, source_type, chunk_index, embedding) 
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [
            chunks[i], 
            JSON.stringify(metadata),  // JSONB column
            submissionId, 
            'mongodb_submission', 
            i, 
            embeddingValue
          ]
        );
        insertedCount++;
      }

      console.log(`✅ Inserted ${insertedCount} chunks into PostgreSQL`);

      // Update submission status in MongoDB
      await submissions.updateOne(
        { _id: new ObjectId(submissionId) },
        { 
          $set: { 
            status: 'processed',
            processed_at: new Date(),
            chunks_created: insertedCount,
            updated_at: new Date()
          } 
        }
      );

      console.log(`✅ Updated submission status to 'processed'`);
      console.log(`=== Processing Complete ===\n`);

      return {
        success: true,
        submission_id: submissionId,
        title: submission.title,
        chunks_created: insertedCount
      };

    } catch (err) {
      console.error('Processing error:', err);
      
      // Mark as failed in MongoDB
      try {
        const submissions = getCollection('document_submissions');
        await submissions.updateOne(
          { _id: new ObjectId(submissionId) },
          { 
            $set: { 
              status: 'processing_failed',
              error_message: err.message,
              updated_at: new Date()
            } 
          }
        );
      } catch (updateErr) {
        console.error('Failed to update error status:', updateErr);
      }

      throw err;
    }
  }

  /**
   * Split text into overlapping chunks
   */
  createChunks(text, chunkSize = this.chunkSize, overlap = this.chunkOverlap) {
    const chunks = [];
    let start = 0;

    // Clean text
    text = text.trim().replace(/\r\n/g, '\n');

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      
      // Try to break at sentence or paragraph boundary
      let chunk = text.slice(start, end);
      
      // If not at end of text, try to break at sentence end
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > chunkSize * 0.7) { // At least 70% of chunk size
          chunk = text.slice(start, start + breakPoint + 1);
        }
      }
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      start = end - overlap;
      
      // Prevent infinite loop
      if (start >= text.length - overlap) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Process all approved submissions
   */
  async processAllApproved() {
    const submissions = getCollection('document_submissions');
    const approved = await submissions.find({ status: 'approved' }).toArray();

    console.log(`Found ${approved.length} approved submissions to process`);

    const results = [];
    for (const sub of approved) {
      try {
        const result = await this.processSubmission(sub._id.toString());
        results.push(result);
      } catch (err) {
        console.error(`Failed to process ${sub._id}:`, err.message);
        results.push({
          success: false,
          submission_id: sub._id.toString(),
          error: err.message
        });
      }
    }

    return results;
  }

  /**
   * Get processing statistics
   */
  async getStats() {
    const submissions = getCollection('document_submissions');
    
    const [pending, approved, processed, failed] = await Promise.all([
      submissions.countDocuments({ status: 'pending' }),
      submissions.countDocuments({ status: 'approved' }),
      submissions.countDocuments({ status: 'processed' }),
      submissions.countDocuments({ status: 'processing_failed' })
    ]);

    const chunksResult = await pool.query(
      'SELECT COUNT(*) as total FROM document_chunks'
    );

    return {
      submissions: {
        pending,
        approved,
        processed,
        failed,
        total: pending + approved + processed + failed
      },
      chunks: {
        total: parseInt(chunksResult.rows[0].total) || 0
      }
    };
  }
}

module.exports = new DocumentProcessor();
