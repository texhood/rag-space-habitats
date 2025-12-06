// services/sourceAdapters/ntrsAdapter.js
// NASA Technical Reports Server API adapter
// Documentation: https://ntrs.nasa.gov/api/

const axios = require('axios');
const crypto = require('crypto');

class NTRSAdapter {
  constructor() {
    this.baseUrl = 'https://ntrs.nasa.gov/api';
    this.name = 'NASA NTRS';
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Generate document hash for deduplication
   */
  generateHash(title, attribution) {
    const normalized = `${title.toLowerCase().trim()}|${attribution.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
  }

  /**
   * Search NTRS for documents matching a query
   * @param {string} query - Search term
   * @param {number} limit - Maximum results to return
   * @returns {Array} Array of document metadata
   */
  async search(query, limit = 20) {
    try {
      console.log(`[NTRS] Searching for: "${query}"`);
      
      const response = await axios.get(`${this.baseUrl}/citations/search`, {
        params: {
          q: query,
          page: { size: limit },
          sort: 'publishedDate desc'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.results) {
        console.log(`[NTRS] No results for: "${query}"`);
        return [];
      }

      const documents = response.data.results
        .filter(doc => this.isEligible(doc))
        .map(doc => this.normalizeDocument(doc));

      console.log(`[NTRS] Found ${documents.length} eligible documents for: "${query}"`);
      return documents;

    } catch (error) {
      console.error(`[NTRS] Search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Check if document is eligible for ingestion
   * - Must be public domain or permissively licensed
   * - Must have downloadable content
   */
  isEligible(doc) {
    // NASA documents are generally public domain (17 U.S.C. § 105)
    // Check for explicit restrictions
    if (doc.distribution === 'EXPORT CONTROLLED' || 
        doc.distribution === 'ITAR' ||
        doc.distribution === 'LIMITED') {
      return false;
    }

    // Must have abstract or description
    if (!doc.abstract && !doc.description) {
      return false;
    }

    // Prefer documents with PDF downloads
    const hasDownload = doc.downloads && doc.downloads.length > 0;
    
    return true; // Even without download, abstract is valuable
  }

  /**
   * Normalize NTRS document to common format
   */
  normalizeDocument(doc) {
    const authors = doc.authorAffiliations 
      ? doc.authorAffiliations.map(a => a.meta?.author?.name || 'Unknown').join(', ')
      : 'NASA';
    
    const attribution = `${authors} - NASA Technical Reports Server`;
    
    return {
      source: 'ntrs',
      externalId: doc.id || doc._id,
      title: doc.title || 'Untitled NASA Document',
      description: doc.abstract || doc.description || '',
      content: doc.abstract || doc.description || '', // Will be replaced with full text if PDF available
      authors: authors,
      attribution: attribution,
      license: 'Public Domain (U.S. Government Work)',
      url: `https://ntrs.nasa.gov/citations/${doc.id || doc._id}`,
      publishedDate: doc.publications?.[0]?.publicationDate || doc.created,
      category: this.categorize(doc),
      tags: this.extractTags(doc),
      hash: this.generateHash(doc.title || '', attribution),
      downloads: doc.downloads || [],
      metadata: {
        center: doc.center,
        subjectCategories: doc.subjectCategories,
        reportNumber: doc.reportNumber
      }
    };
  }

  /**
   * Determine category based on document metadata
   */
  categorize(doc) {
    const categories = doc.subjectCategories || [];
    const title = (doc.title || '').toLowerCase();
    const abstract = (doc.abstract || '').toLowerCase();
    
    const text = `${title} ${abstract}`;
    
    if (text.includes('life support') || text.includes('eclss')) return 'life_support';
    if (text.includes('radiation') || text.includes('shielding')) return 'radiation';
    if (text.includes('gravity') || text.includes('rotation')) return 'gravity';
    if (text.includes('structural') || text.includes('material')) return 'structural';
    if (text.includes('propulsion') || text.includes('orbit')) return 'propulsion';
    if (text.includes('habitat') || text.includes('settlement')) return 'habitat_design';
    
    return 'general';
  }

  /**
   * Extract relevant tags from document
   */
  extractTags(doc) {
    const tags = new Set();
    
    // Add subject categories
    if (doc.subjectCategories) {
      doc.subjectCategories.forEach(cat => tags.add(cat.toLowerCase()));
    }
    
    // Extract keywords from title/abstract
    const text = `${doc.title || ''} ${doc.abstract || ''}`.toLowerCase();
    
    const keywords = [
      'habitat', 'station', 'colony', 'settlement', 'lunar', 'mars', 
      'orbital', 'gravity', 'radiation', 'life support', 'atmosphere',
      'pressure', 'temperature', 'oxygen', 'water', 'food', 'waste',
      'solar', 'nuclear', 'power', 'propulsion', 'docking', 'eva'
    ];
    
    keywords.forEach(kw => {
      if (text.includes(kw)) tags.add(kw);
    });
    
    return Array.from(tags).slice(0, 10);
  }

  /**
   * Fetch full document content (PDF text extraction)
   * For now, returns abstract - PDF extraction can be added later
   */
  async fetchFullContent(document) {
    // TODO: Implement PDF download and text extraction
    // For now, use abstract as content
    return document.content || document.description || '';
  }

  /**
   * Rate-limited delay
   */
  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }
}

module.exports = new NTRSAdapter();