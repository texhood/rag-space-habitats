/**
 * MongoDB client for document_submissions and GridFS bytes of project uploads.
 * Extracted text and embeddings are copied into PostgreSQL.
 */
const { MongoClient } = require('mongodb');

// Connection URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'space_habitats_rag';

let client;
let db;

/**
 * Open the Mongo connection named by MONGODB_URI and MONGODB_DB.
 * @returns {Promise<import('mongodb').Db>}
 */
async function connect() {
  try {
    if (client && client.topology && client.topology.isConnected()) {
      return db;
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    
    console.log('✅ Connected to MongoDB:', dbName);
    
    // Test the connection
    await db.command({ ping: 1 });
    console.log('✅ MongoDB ping successful');
    
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

/**
 * Get database instance
 */
/**
 * Database handle. Throws if connect() has not finished.
 * @returns {import('mongodb').Db}
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return db;
}

/**
 * A collection in the connected database. document_submissions is the library inbox.
 * @param {string} collectionName
 * @returns {import('mongodb').Collection}
 */
function getCollection(collectionName) {
  return getDB().collection(collectionName);
}

/**
 * Close the Mongo client.
 * @returns {Promise<void>}
 */
async function close() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connect,
  getDB,
  getCollection,
  close
};