// services/sourceAdapters/arxivAdapter.js
// arXiv.org API adapter for open-access research papers
// Documentation: https://info.arxiv.org/help/api/index.html

const axios = require('axios');
const crypto = require('crypto');
const { parseStringPromise } = require('xml2js');

class ArxivAdapter {
  constructor() {
    this.baseUrl = 'http://export.arxiv.org/api/query';
    this.name = 'arXiv';
    this.rateLimitDelay = 3000; // 3 seconds - arXiv asks for minimal requests
    
    // arXiv categories relevant to space habitats
    this.relevantCategories = [
      'astro-ph.EP',    // Earth and Planetary Astrophysics
      'astro-ph.IM',    // Instrumentation and Methods
      'physics.space-ph', // Space Physics
      'physics.ao-ph',  // Atmospheric and Oceanic Physics
      'physics.pop-ph', // Popular Physics (includes space topics)
    ];
  }

  /**
   * Generate document hash for deduplication
   */
  generateHash(title, attribution) {
    const normalized = `${title.toLowerCase().trim()}|${attribution.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
  }

  /**
   * Search arXiv for documents matching a query
   * @param {string} query - Search term
   * @param {number} limit - Maximum results to return
   * @returns {Array} Array of document metadata
   */
  async search(query, limit = 20) {
    try {
      console.log(`[arXiv] Searching for: "${query}"`);
      
      // Build search query - search in title and abstract
      const searchQuery = `all:${query.replace(/\s+/g, '+AND+')}`;
      
      const response = await axios.get(this.baseUrl, {
        params: {
          search_query: searchQuery,
          start: 0,
          max_results: limit,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        },
        timeout: 30000
      });

      // Parse XML response
      const parsed = await parseStringPromise(response.data, { explicitArray: false });
      
      if (!parsed.feed || !parsed.feed.entry) {
        console.log(`[arXiv] No results for: "${query}"`);
        return [];
      }

      // Ensure entry is always an array
      const entries = Array.isArray(parsed.feed.entry) 
        ? parsed.feed.entry 
        : [parsed.feed.entry];

      const documents = entries
        .filter(doc => this.isEligible(doc))
        .map(doc => this.normalizeDocument(doc));

      console.log(`[arXiv] Found ${documents.length} eligible documents for: "${query}"`);
      return documents;

    } catch (error) {
      console.error(`[arXiv] Search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Check if document is eligible for ingestion
   * arXiv papers are generally CC-BY or similar open licenses
   */
  isEligible(doc) {
    // Check for summary/abstract
    if (!doc.summary) {
      return false;
    }

    // Filter for relevance - check categories
    const categories = this.extractCategories(doc);
    const hasRelevantCategory = categories.some(cat => 
      this.relevantCategories.some(rel => cat.startsWith(rel.split('.')[0]))
    );

    // Also check title/abstract for space-related terms
    const text = `${doc.title || ''} ${doc.summary || ''}`.toLowerCase();
    const spaceTerms = ['space', 'habitat', 'station', 'orbital', 'lunar', 'mars', 
                        'spacecraft', 'astronaut', 'microgravity', 'life support'];
    const hasSpaceTerms = spaceTerms.some(term => text.includes(term));

    return hasRelevantCategory || hasSpaceTerms;
  }

  /**
   * Extract categories from arXiv entry
   */
  extractCategories(doc) {
    if (!doc.category) return [];
    
    const cats = Array.isArray(doc.category) ? doc.category : [doc.category];
    return cats.map(c => c.$ ? c.$.term : c).filter(Boolean);
  }

  /**
   * Normalize arXiv document to common format
   */
  normalizeDocument(doc) {
    // Extract authors
    const authorList = Array.isArray(doc.author) ? doc.author : [doc.author];
    const authors = authorList
      .map(a => a.name || a)
      .filter(Boolean)
      .join(', ');
    
    const attribution = `${authors} - arXiv`;
    
    // Extract arXiv ID from URL
    const idMatch = doc.id.match(/abs\/(.+)$/);
    const arxivId = idMatch ? idMatch[1] : doc.id;
    
    // Clean up summary (remove extra whitespace)
    const summary = (doc.summary || '').replace(/\s+/g, ' ').trim();
    
    return {
      source: 'arxiv',
      externalId: arxivId,
      title: (doc.title || 'Untitled Paper').replace(/\s+/g, ' ').trim(),
      description: summary,
      content: summary, // Full paper text would require PDF extraction
      authors: authors,
      attribution: attribution,
      license: this.getLicense(doc),
      url: doc.id,
      pdfUrl: this.getPdfUrl(doc),
      publishedDate: doc.published,
      updatedDate: doc.updated,
      category: this.categorize(doc),
      tags: this.extractTags(doc),
      hash: this.generateHash(doc.title || '', attribution),
      metadata: {
        categories: this.extractCategories(doc),
        arxivId: arxivId,
        doi: doc['arxiv:doi'] ? doc['arxiv:doi']._ : null,
        journalRef: doc['arxiv:journal_ref'] ? doc['arxiv:journal_ref']._ : null
      }
    };
  }

  /**
   * Get license information
   * arXiv papers use various licenses
   */
  getLicense(doc) {
    // Check for explicit license link
    if (doc.link) {
      const links = Array.isArray(doc.link) ? doc.link : [doc.link];
      const licenseLink = links.find(l => l.$ && l.$.title === 'license');
      
      if (licenseLink && licenseLink.$.href) {
        const href = licenseLink.$.href;
        if (href.includes('creativecommons.org/licenses/by/')) return 'CC-BY';
        if (href.includes('creativecommons.org/publicdomain/')) return 'Public Domain';
        if (href.includes('arxiv.org/licenses/nonexclusive')) return 'arXiv Non-exclusive';
      }
    }
    
    return 'arXiv Non-exclusive License';
  }

  /**
   * Get PDF URL
   */
  getPdfUrl(doc) {
    if (doc.link) {
      const links = Array.isArray(doc.link) ? doc.link : [doc.link];
      const pdfLink = links.find(l => l.$ && l.$.type === 'application/pdf');
      if (pdfLink) return pdfLink.$.href;
    }
    
    // Construct PDF URL from entry URL
    return doc.id.replace('/abs/', '/pdf/') + '.pdf';
  }

  /**
   * Determine category based on document content
   */
  categorize(doc) {
    const text = `${doc.title || ''} ${doc.summary || ''}`.toLowerCase();
    
    if (text.includes('life support') || text.includes('eclss') || text.includes('bioregenerative')) 
      return 'life_support';
    if (text.includes('radiation') || text.includes('shielding') || text.includes('cosmic ray')) 
      return 'radiation';
    if (text.includes('artificial gravity') || text.includes('rotation') || text.includes('centrifugal')) 
      return 'gravity';
    if (text.includes('structural') || text.includes('material') || text.includes('stress')) 
      return 'structural';
    if (text.includes('propulsion') || text.includes('orbit') || text.includes('trajectory')) 
      return 'propulsion';
    if (text.includes('habitat') || text.includes('settlement') || text.includes('colony')) 
      return 'habitat_design';
    if (text.includes('psychology') || text.includes('social') || text.includes('crew')) 
      return 'human_factors';
    
    return 'general';
  }

  /**
   * Extract relevant tags from document
   */
  extractTags(doc) {
    const tags = new Set();
    
    // Add arXiv categories
    this.extractCategories(doc).forEach(cat => tags.add(cat));
    
    // Extract keywords from title/abstract
    const text = `${doc.title || ''} ${doc.summary || ''}`.toLowerCase();
    
    const keywords = [
      'habitat', 'station', 'colony', 'settlement', 'lunar', 'mars', 'moon',
      'orbital', 'gravity', 'radiation', 'life support', 'atmosphere',
      'iss', 'spacecraft', 'astronaut', 'space', 'microgravity',
      'closed-loop', 'isru', 'in-situ', 'sustainable'
    ];
    
    keywords.forEach(kw => {
      if (text.includes(kw)) tags.add(kw);
    });
    
    return Array.from(tags).slice(0, 10);
  }

  /**
   * Rate-limited delay
   */
  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }
}

module.exports = new ArxivAdapter();