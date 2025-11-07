// config/mongodb.js
const { MongoClient } = require('mongodb');

// Connection URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'space_habitats_rag';

let client;
let db;

/**
 * Connect to MongoDB
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
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return db;
}

/**
 * Get collection
 */
function getCollection(collectionName) {
  return getDB().collection(collectionName);
}

/**
 * Close connection
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