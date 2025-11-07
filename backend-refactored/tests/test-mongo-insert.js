require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testInsert() {
  const client = new MongoClient('mongodb://localhost:27017/local');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('local');
    const collection = db.collection('document_submissions');
    
    // Try to insert a test document
    const testDoc = {
      title: 'TEST INSERT',
      content: 'This is a test',
      submitted_by: 1,
      submitted_by_username: 'test',
      submitted_at: new Date(),
      status: 'pending',
      tags: ['test'],
      category: 'test',
      upvotes: 0,
      downvotes: 0,
      comments: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('Inserting test document...');
    const result = await collection.insertOne(testDoc);
    console.log('Insert result:', result);
    console.log('Inserted ID:', result.insertedId);
    
    // Verify it's there
    const count = await collection.countDocuments();
    console.log('Total documents in collection:', count);
    
    // Find the document we just inserted
    const found = await collection.findOne({ _id: result.insertedId });
    console.log('Found document:', found ? 'YES' : 'NO');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

testInsert();