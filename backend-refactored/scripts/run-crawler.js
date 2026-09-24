require('dotenv').config();

const mongoClient = require('../config/mongodb');
const crawlerService = require('../services/crawlerService');

/**
 * Run one crawler pass and exit. Schedule this process outside the API,
 * for example daily at 23:00 America/Chicago.
 * @returns {Promise<void>}
 */
async function main() {
  await mongoClient.connect();
  try {
    const result = await crawlerService.run();
    console.log('[Crawler] Finished:', result.status);
    if (result.documentsProcessed) {
      console.log(`[Crawler] Documents processed: ${result.documentsProcessed}`);
    }
  } finally {
    await mongoClient.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Crawler] Failed:', err);
    process.exit(1);
  });
}

module.exports = { main };
