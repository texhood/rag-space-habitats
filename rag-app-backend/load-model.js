// load-model.js
const { pipeline } = require('@xenova/transformers');

async function loadModel() {
  console.log('Downloading/loading model... (first time only)');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model loaded successfully! Cache ready for offline use.');
  const testOutput = await extractor('Test sentence.', { pooling: 'mean', normalize: true });
  console.log('Test embedding dimension:', testOutput.data.length); // Should print 384
}

loadModel().catch(console.error);