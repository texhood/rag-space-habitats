// services/crawlerSettings.js
// Crawler-specific settings helper using existing SystemSettings model
// Stores crawler configuration in system_settings table with key 'crawler_config'

const SystemSettings = require('../models/SystemSettings');

const CRAWLER_KEY = 'crawler_config';
const SEARCH_TERMS_KEY = 'crawler_search_terms';

// Default crawler configuration
const DEFAULT_CRAWLER_CONFIG = {
  enabled: false,
  lastRun: null,
  lastRunStatus: null,
  lastRunError: null,
  lastRunDocuments: 0,
  documentsToday: 0,
  dailyLimit: 100,
  lastResetDate: new Date().toISOString().split('T')[0],
  sources: {
    ntrs: { enabled: true, priority: 1 },
    arxiv: { enabled: true, priority: 2 }
  }
};

const DEFAULT_SEARCH_TERMS = {
  seed: [
    'space habitat',
    'orbital station',
    'life support systems',
    'closed-loop ECLSS',
    'artificial gravity',
    'O\'Neill cylinder',
    'rotating spacecraft',
    'lunar base',
    'Mars habitat',
    'space settlement',
    'Bernal sphere',
    'Stanford torus',
    'space colonization',
    'in-situ resource utilization',
    'radiation shielding spacecraft'
  ],
  learned: [],
  lastCorpusExtraction: null
};

class CrawlerSettings {
  /**
   * Get crawler configuration
   */
  static async getConfig() {
    const config = await SystemSettings.get(CRAWLER_KEY);
    
    if (!config) {
      // Initialize with defaults
      await SystemSettings.set(CRAWLER_KEY, DEFAULT_CRAWLER_CONFIG, null);
      return { ...DEFAULT_CRAWLER_CONFIG };
    }
    
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_CRAWLER_CONFIG, ...config };
  }

  /**
   * Update crawler configuration
   */
  static async updateConfig(updates, updatedBy = null) {
    const current = await this.getConfig();
    const updated = { ...current, ...updates };
    await SystemSettings.set(CRAWLER_KEY, updated, updatedBy);
    return updated;
  }

  /**
   * Toggle crawler enabled/disabled
   */
  static async toggle(updatedBy = null) {
    const config = await this.getConfig();
    const newState = !config.enabled;
    return this.updateConfig({ enabled: newState }, updatedBy);
  }

  /**
   * Check if crawler is enabled
   */
  static async isEnabled() {
    const config = await this.getConfig();
    return config.enabled === true;
  }

  /**
   * Get search terms configuration
   */
  static async getSearchTermsConfig() {
    const terms = await SystemSettings.get(SEARCH_TERMS_KEY);
    
    if (!terms) {
      await SystemSettings.set(SEARCH_TERMS_KEY, DEFAULT_SEARCH_TERMS, null);
      return { ...DEFAULT_SEARCH_TERMS };
    }
    
    return { ...DEFAULT_SEARCH_TERMS, ...terms };
  }

  /**
   * Get all active search terms (seed + learned)
   */
  static async getSearchTerms() {
    const config = await this.getSearchTermsConfig();
    const allTerms = [
      ...(config.seed || []),
      ...(config.learned || [])
    ];
    
    // Deduplicate and return
    return [...new Set(allTerms.map(t => t.toLowerCase()))];
  }

  /**
   * Update learned terms from corpus
   */
  static async updateLearnedTerms(terms, updatedBy = null) {
    const config = await this.getSearchTermsConfig();
    config.learned = terms;
    config.lastCorpusExtraction = new Date().toISOString();
    await SystemSettings.set(SEARCH_TERMS_KEY, config, updatedBy);
    return config;
  }

  /**
   * Add seed search terms
   */
  static async addSeedTerms(newTerms, updatedBy = null) {
    const config = await this.getSearchTermsConfig();
    const existingSet = new Set(config.seed.map(t => t.toLowerCase()));
    
    const toAdd = newTerms
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length > 2 && !existingSet.has(t));
    
    if (toAdd.length > 0) {
      config.seed = [...config.seed, ...toAdd];
      await SystemSettings.set(SEARCH_TERMS_KEY, config, updatedBy);
    }
    
    return { added: toAdd, config };
  }

  /**
   * Remove a search term
   */
  static async removeSearchTerm(term, updatedBy = null) {
    const config = await this.getSearchTermsConfig();
    const lowerTerm = term.toLowerCase();
    
    config.seed = config.seed.filter(t => t.toLowerCase() !== lowerTerm);
    config.learned = config.learned.filter(t => t.toLowerCase() !== lowerTerm);
    
    await SystemSettings.set(SEARCH_TERMS_KEY, config, updatedBy);
    return config;
  }

  /**
   * Increment documents processed today
   */
  static async incrementDocumentsToday(count = 1, updatedBy = null) {
    const config = await this.getConfig();
    const today = new Date().toISOString().split('T')[0];
    
    // Reset counter if it's a new day
    if (config.lastResetDate !== today) {
      config.documentsToday = count;
      config.lastResetDate = today;
    } else {
      config.documentsToday = (config.documentsToday || 0) + count;
    }
    
    await SystemSettings.set(CRAWLER_KEY, config, updatedBy);
    return config;
  }

  /**
   * Check if daily limit reached
   */
  static async canCrawlMore() {
    const config = await this.getConfig();
    const today = new Date().toISOString().split('T')[0];
    
    // Reset if new day
    if (config.lastResetDate !== today) {
      return true;
    }
    
    return (config.documentsToday || 0) < config.dailyLimit;
  }

  /**
   * Get remaining documents allowed today
   */
  static async getRemainingToday() {
    const config = await this.getConfig();
    const today = new Date().toISOString().split('T')[0];
    
    if (config.lastResetDate !== today) {
      return config.dailyLimit;
    }
    
    return Math.max(0, config.dailyLimit - (config.documentsToday || 0));
  }

  /**
   * Record crawler run result
   */
  static async recordRun(status, documentsProcessed = 0, error = null, updatedBy = null) {
    const config = await this.getConfig();
    
    config.lastRun = new Date().toISOString();
    config.lastRunStatus = status;
    config.lastRunDocuments = documentsProcessed;
    config.lastRunError = error;
    
    await SystemSettings.set(CRAWLER_KEY, config, updatedBy);
    return config;
  }

  /**
   * Get full status for API
   */
  static async getStatus() {
    const config = await this.getConfig();
    const searchTerms = await this.getSearchTerms();
    const remaining = await this.getRemainingToday();
    
    return {
      enabled: config.enabled,
      lastRun: config.lastRun,
      lastRunStatus: config.lastRunStatus,
      lastRunDocuments: config.lastRunDocuments,
      lastRunError: config.lastRunError,
      documentsToday: config.documentsToday || 0,
      dailyLimit: config.dailyLimit,
      remainingToday: remaining,
      sources: config.sources,
      searchTermsCount: searchTerms.length
    };
  }
}

module.exports = CrawlerSettings;