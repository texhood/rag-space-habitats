#!/usr/bin/env node
// scripts/preprocess.js - Process documents and create chunks

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Configuration
const INCOMING_DIR = path.join(__dirname, '../../incoming');
const PROCESSED_DIR = path.join(__dirname, '../../processed');
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Split text into chunks with overlap
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
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
 * Process a single file
 */
async function processFile(filePath) {
  console.log(`Processing: ${path.basename(filePath)}`);
  
  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split into chunks
    const chunks = chunkText(content);
    console.log(`  Created ${chunks.length} chunks`);
    
    // Insert into database
    let insertedCount = 0;
    for (const chunk of chunks) {
      const metadata = JSON.stringify({
        source: path.basename(filePath),
        processed_at: new Date().toISOString()
      });
      
      await pool.query(
        'INSERT INTO document_chunks (content, metadata) VALUES (?, ?)',
        [chunk, metadata]
      );
      insertedCount++;
    }
    
    console.log(`  ✅ Inserted ${insertedCount} chunks into database`);
    
    // Move file to processed directory
    const processedPath = path.join(PROCESSED_DIR, path.basename(filePath));
    fs.renameSync(filePath, processedPath);
    console.log(`  📁 Moved to processed folder`);
    
    return { success: true, chunks: insertedCount };
  } catch (err) {
    console.error(`  ❌ Error processing file:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Main preprocessing function
 */
async function preprocess() {
  console.log('='.repeat(50));
  console.log('📚 Starting Document Preprocessing');
  console.log('='.repeat(50));
  
  try {
    // Create directories if they don't exist
    if (!fs.existsSync(INCOMING_DIR)) {
      fs.mkdirSync(INCOMING_DIR, { recursive: true });
      console.log('Created incoming directory:', INCOMING_DIR);
    }
    
    if (!fs.existsSync(PROCESSED_DIR)) {
      fs.mkdirSync(PROCESSED_DIR, { recursive: true });
      console.log('Created processed directory:', PROCESSED_DIR);
    }
    
    // Get all .txt and .md files from incoming directory
    const files = fs.readdirSync(INCOMING_DIR)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .map(f => path.join(INCOMING_DIR, f));
    
    if (files.length === 0) {
      console.log('⚠️  No files found in incoming directory');
      console.log('   Place .txt or .md files in:', INCOMING_DIR);
      return;
    }
    
    console.log(`Found ${files.length} file(s) to process\n`);
    
    // Process each file
    const results = [];
    for (const file of files) {
      const result = await processFile(file);
      results.push(result);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Processing Summary');
    console.log('='.repeat(50));
    const successful = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);
    console.log(`✅ Successful: ${successful}/${results.length} files`);
    console.log(`📦 Total chunks created: ${totalChunks}`);
    console.log('='.repeat(50));
    
  } catch (err) {
    console.error('❌ Preprocessing failed:', err);
    throw err;
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  preprocess()
    .then(() => {
      console.log('✅ Preprocessing complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Preprocessing failed:', err);
      process.exit(1);
    });
}

module.exports = preprocess;