#!/usr/bin/env python3
"""
Simple embedding server using Sentence Transformers
Runs on http://localhost:5001
"""

from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Load model (happens once at startup)
print("Loading embedding model...")
model = SentenceTransformer('multi-qa-mpnet-base-dot-v1')  # 384 dimensions, fast
print("Model loaded!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model": "multi-qa-mpnet-base-dot-v1"})

@app.route('/embed', methods=['POST'])
def embed():
    """Generate embedding for a single text"""
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Generate embedding
        embedding = model.encode(text, convert_to_numpy=True)
        
        return jsonify({
            "embedding": embedding.tolist(),
            "dimensions": len(embedding)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/embed-batch', methods=['POST'])
def embed_batch():
    """Generate embeddings for multiple texts"""
    data = request.json
    texts = data.get('texts', [])
    
    if not texts:
        return jsonify({"error": "No texts provided"}), 400
    
    try:
        # Generate embeddings
        embeddings = model.encode(texts, convert_to_numpy=True)
        
        return jsonify({
            "embeddings": [emb.tolist() for emb in embeddings],
            "count": len(embeddings),
            "dimensions": len(embeddings[0])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)