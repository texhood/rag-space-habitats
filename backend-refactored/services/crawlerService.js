// services/crawlerService.js
// Main crawler orchestration service
// Runs as scheduled job at 23:00 CT daily

const { getCollection } = require('../config/mongodb');
const { ObjectId } = require('mongodb');
const pool = require('../config/database');
const CrawlerSettings = require('./crawlerSettings');
const ntrsAdapter = require('./sourceAdapters/ntrsAdapter');
const arxivAdapter = require('./sourceAdapters/arxivAdapter');
const embeddingService = require('./embeddingService');

class CrawlerService {
  constructor() {
    this.adapters = [ntrsAdapter, arxivAdapter];
    this.chunkSize = 1000;
    this.chunkOverlap = 200;
    this.isRunning = false;
  }

  /**
   * Main entry point - run the crawler
   */
  async run() {
    if (this.isRunning) {
      console.log('[Crawler] Already running, skipping...');
      return { status: 'skipped', reason: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let documentsProcessed = 0;
    let errors = [];

    try {
      console.log('\n========================================');
      console.log('[Crawler] Starting crawl run...');
      console.log(`[Crawler] Time: ${new Date().toISOString()}`);
      console.log('========================================\n');

      // Check if crawler is enabled
      const isEnabled = await CrawlerSettings.isEnabled();
      if (!isEnabled) {
        console.log('[Crawler] Crawler is disabled, skipping...');
        return { status: 'skipped', reason: 'Crawler disabled' };
      }

      // Check daily limit
      const remaining = await CrawlerSettings.getRemainingToday();
      if (remaining <= 0) {
        console.log('[Crawler] Daily limit reached, skipping...');
        return { status: 'skipped', reason: 'Daily limit reached' };
      }

      console.log(`[Crawler] Remaining quota: ${remaining} documents`);

      // Get search terms
      const searchTerms = await this.getSearchTerms();
      console.log(`[Crawler] Using ${searchTerms.length} search terms`);

      // Collect documents from all sources
      const allDocuments = [];

      for (const adapter of this.adapters) {
        if (allDocuments.length >= remaining) break;

        console.log(`\n[Crawler] Querying ${adapter.name}...`);

        // Rotate through search terms
        const termsToUse = this.shuffleArray([...searchTerms]).slice(0, 5);

        for (const term of termsToUse) {
          if (allDocuments.length >= remaining) break;

          try {
            const docs = await adapter.search(term, 10);
            allDocuments.push(...docs);
            await adapter.delay();
          } catch (err) {
            console.error(`[Crawler] Error searching ${adapter.name} for "${term}":`, err.message);
            errors.push({ source: adapter.name, term, error: err.message });
          }
        }
      }

      console.log(`\n[Crawler] Collected ${allDocuments.length} documents total`);

      // Deduplicate
      const uniqueDocs = await this.deduplicateDocuments(allDocuments);
      console.log(`[Crawler] ${uniqueDocs.length} unique new documents after deduplication`);

      // Process documents up to daily limit
      const docsToProcess = uniqueDocs.slice(0, remaining);

      for (const doc of docsToProcess) {
        try {
          await this.processDocument(doc);
          documentsProcessed++;
          await CrawlerSettings.incrementDocumentsToday();

          console.log(`[Crawler] Processed: ${doc.title.substring(0, 50)}...`);

          // Small delay between processing
          await new Promise(r => setTimeout(r, 500));

        } catch (err) {
          console.error(`[Crawler] Error processing "${doc.title}":`, err.message);
          errors.push({ title: doc.title, error: err.message });
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n========================================`);
      console.log(`[Crawler] Completed in ${duration}s`);
      console.log(`[Crawler] Processed: ${documentsProcessed} documents`);
      console.log(`[Crawler] Errors: ${errors.length}`);
      console.log('========================================\n');

      await CrawlerSettings.recordRun('success', documentsProcessed);

      return {
        status: 'success',
        documentsProcessed,
        duration: parseFloat(duration),
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (err) {
      console.error('[Crawler] Fatal error:', err);
      await CrawlerSettings.recordRun('error', documentsProcessed, err.message);

      return {
        status: 'error',
        error: err.message,
        documentsProcessed
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get search terms from settings + corpus extraction
   */
  async getSearchTerms() {
    const termsConfig = await CrawlerSettings.getSearchTermsConfig();
    let terms = [...(termsConfig.seed || [])];

    // Check if we should refresh learned terms (weekly)
    const lastExtraction = termsConfig.lastCorpusExtraction;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (!lastExtraction || new Date(lastExtraction) < weekAgo) {
      console.log('[Crawler] Extracting terms from corpus...');
      const learned = await this.extractCorpusTerms();
      await CrawlerSettings.updateLearnedTerms(learned);
      terms = [...terms, ...learned];
    } else {
      terms = [...terms, ...(termsConfig.learned || [])];
    }

    // Deduplicate
    return [...new Set(terms.map(t => t.toLowerCase()))];
  }

  /**
   * Extract common terms from existing corpus
   */
  async extractCorpusTerms() {
    try {
      const result = await pool.query(`
        SELECT content FROM document_chunks 
        ORDER BY RANDOM() 
        LIMIT 100
      `);

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      // Simple term frequency analysis
      const termCounts = {};
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
        'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
        'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'why', 'how'
      ]);

      for (const row of result.rows) {
        const words = row.content.toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 4 && !stopWords.has(w));

        words.forEach(word => {
          termCounts[word] = (termCounts[word] || 0) + 1;
        });
      }

      // Get top terms that appear multiple times
      const topTerms = Object.entries(termCounts)
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([term]) => term);

      console.log(`[Crawler] Extracted ${topTerms.length} corpus terms`);
      return topTerms;

    } catch (err) {
      console.error('[Crawler] Corpus extraction error:', err.message);
      return [];
    }
  }

  /**
   * Check for duplicate documents
   */
  async deduplicateDocuments(documents) {
    const submissions = getCollection('document_submissions');
    const unique = [];

    for (const doc of documents) {
      // Check by hash
      const existing = await submissions.findOne({
        $or: [
          { hash: doc.hash },
          { externalId: doc.externalId, source: doc.source }
        ]
      });

      if (!existing) {
        unique.push(doc);
      }
    }

    return unique;
  }

  /**
   * Process a single document - store and embed
   */
  async processDocument(doc) {
    const submissions = getCollection('document_submissions');

    // Store in MongoDB
    const submission = {
      title: doc.title,
      description: doc.description,
      content: doc.content,
      source: doc.source,
      externalId: doc.externalId,
      hash: doc.hash,
      attribution: doc.attribution,
      authors: doc.authors,
      license: doc.license,
      url: doc.url,
      category: doc.category,
      tags: doc.tags,
      status: 'crawled', // Special status for auto-ingested
      submitted_by_username: 'crawler',
      submitted_at: new Date(),
      published_date: doc.publishedDate,
      metadata: doc.metadata,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await submissions.insertOne(submission);
    const submissionId = result.insertedId;

    // Chunk the content
    const chunks = this.createChunks(doc.content);

    // Generate embeddings
    let embeddings = [];
    try {
      embeddings = await embeddingService.generateBatchEmbeddings(chunks);
    } catch (err) {
      console.error(`[Crawler] Embedding failed for ${doc.title}:`, err.message);
      embeddings = new Array(chunks.length).fill(null);
    }

    // Store chunks in PostgreSQL
    for (let i = 0; i < chunks.length; i++) {
      const metadata = JSON.stringify({
        title: doc.title,
        source: doc.source,
        category: doc.category,
        tags: doc.tags,
        attribution: doc.attribution,
        license: doc.license
      });

      const embedding = embeddings[i];
      const embeddingStr = embedding ? `[${embedding.join(',')}]` : null;

      await pool.query(`
        INSERT INTO document_chunks 
        (content, metadata, source_id, source_type, chunk_index, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
      `, [
        chunks[i],
        metadata,
        submissionId.toString(),
        'crawler',
        i,
        embeddingStr
      ]);
    }

    // Update MongoDB status
    await submissions.updateOne(
      { _id: submissionId },
      {
        $set: {
          status: 'processed',
          processed_at: new Date(),
          chunk_count: chunks.length
        }
      }
    );
  }

  /**
   * Split content into overlapping chunks
   */
  createChunks(text) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;

      // Try to break at sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        if (lastPeriod > start + this.chunkSize / 2) {
          end = lastPeriod + 1;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - this.chunkOverlap;

      if (start >= text.length) break;
    }

    return chunks.filter(c => c.length > 50);
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Manual trigger for testing
   */
  async runManual() {
    console.log('[Crawler] Manual run triggered');
    return this.run();
  }

  /**
   * Get crawler status
   */
  async getStatus() {
    return CrawlerSettings.getStatus();
  }
}

module.exports = new CrawlerService();