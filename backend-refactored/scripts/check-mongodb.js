// Save as backend-refactored/scripts/check-mongodb.js
// Run with: node scripts/check-mongodb.js

require('dotenv').config();
const mongoClient = require('../config/mongodb');

async function checkMongoDB() {
  try {
    await mongoClient.connect();
    const db = mongoClient.getDB();
    
    console.log('\n=== MongoDB Collections ===');
    const collections = await db.listCollections().toArray();
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Check each collection for document count
    console.log('\n=== Document Counts ===');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name}: ${count} documents`);
    }
    
    // Try to find the main documents collection
    const possibleCollections = ['documents', 'nasa_documents', 'papers', 'chunks', 'document_chunks'];
    
    for (const collName of possibleCollections) {
      try {
        const sample = await db.collection(collName).findOne();
        if (sample) {
          console.log(`\n=== Sample from '${collName}' ===`);
          console.log('Fields:', Object.keys(sample));
          console.log('Sample doc:', JSON.stringify(sample, null, 2).substring(0, 1000));
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }
    
    // Also check what's actually there
    console.log('\n=== Checking all collections for content ===');
    for (const coll of collections) {
      if (coll.name.startsWith('system.')) continue;
      const sample = await db.collection(coll.name).findOne();
      if (sample) {
        console.log(`\n--- ${coll.name} ---`);
        console.log('Fields:', Object.keys(sample));
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkMongoDB();