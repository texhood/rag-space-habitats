# PostgreSQL + pgvector Migration Guide

## Overview

This migration converts your Space Habitats RAG backend from MySQL to PostgreSQL with pgvector for native vector similarity search.

## Key Changes Summary

### Package Dependencies
- Removed: `mysql2`
- Added: `pg` (PostgreSQL client)

### Database Configuration (`config/database.js`)
- Changed from mysql2 pool to pg Pool
- Uses `DATABASE_URL` environment variable
- SSL configured for production
- Query results accessed via `result.rows` instead of destructuring `[rows]`

### Query Syntax Changes

| MySQL | PostgreSQL |
|-------|------------|
| `?` placeholders | `$1, $2, $3` positional |
| `[rows]` = await pool.query() | `result = await pool.query()` then `result.rows` |
| `result.insertId` | `RETURNING id` clause + `result.rows[0].id` |
| `result.affectedRows` | `result.rowCount` |
| `ON DUPLICATE KEY UPDATE` | `ON CONFLICT ... DO UPDATE` |
| `DATE_SUB(NOW(), INTERVAL ? DAY)` | `NOW() - INTERVAL '1 day' * $1` |
| `TINYINT(1)` | `BOOLEAN` |
| `LONGTEXT` | `TEXT` |
| `JSON` column | `JSONB` |

### Vector Search (`services/ragService.js`)
**Before (MySQL):**
```javascript
// Load ALL embeddings into memory
const [chunks] = await pool.query('SELECT * FROM document_chunks WHERE has_embedding = TRUE');
// Calculate similarity in JavaScript for each chunk
const scored = chunks.map(c => ({
  similarity: cosineSimilarity(queryEmbedding, JSON.parse(c.embedding_vector))
}));
```

**After (PostgreSQL + pgvector):**
```javascript
// Database handles everything - O(log n) via HNSW index
const result = await pool.query(`
  SELECT content, 1 - (embedding <=> $1::vector) as similarity
  FROM document_chunks
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector
  LIMIT $2
`, [embeddingStr, limit]);
```

### Schema Changes (`document_chunks` table)
- `embedding_vector LONGTEXT` → `embedding vector(1024)` (native pgvector type)
- `has_embedding TINYINT` → removed (use `embedding IS NOT NULL`)
- `metadata LONGTEXT` → `metadata JSONB`
- Added HNSW index for vector similarity search

## Files Modified

### Core Configuration
- `config/database.js` - PostgreSQL connection pool
- `config/passport.js` - Updated queries for auth

### Models (All queries updated)
- `models/User.js`
- `models/Subscription.js`
- `models/QueryLog.js`
- `models/Pricing.js`
- `models/SystemSettings.js`

### Services
- `services/ragService.js` - **Major changes**: Native pgvector similarity search
- `services/documentProcessor.js` - Updated for pgvector INSERT
- `services/usageService.js` - Updated UPSERT syntax

### Routes
- `routes/admin.js` - Updated all direct queries
- `routes/subscriptions.js` - Updated Stripe webhook query

### Server
- `server.js` - Updated webhook handler query

## Files Unchanged
- `config/mongodb.js` - MongoDB config unchanged
- `config/session.js` - Session config unchanged
- `services/embeddingService.js` - HuggingFace API unchanged
- `services/emailService.js` - Email service unchanged
- `services/textExtractor.js` - Text extraction unchanged
- `routes/submissions.js` - Uses MongoDB, unchanged
- `routes/rag.js` - Uses services, unchanged
- `routes/auth.js` - Uses models, unchanged
- All middleware files

## Environment Variables

Update your `.env` file:

```bash
# Remove MySQL variables
# MYSQL_HOST=...
# MYSQL_USER=...
# MYSQL_PASSWORD=...
# MYSQL_DATABASE=...

# Add PostgreSQL
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/space_habitats_rag
```

For Railway production:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

## Testing Locally

1. **Start Docker PostgreSQL with pgvector:**
```bash
docker run -d \
  --name pgvector-dev \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=space_habitats_rag \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

2. **Run the import script** (from your previous migration work):
```bash
node migration/import-postgres.js
```

3. **Install dependencies:**
```bash
npm install
```

4. **Start the server:**
```bash
npm run dev
```

5. **Test vector search:**
```bash
curl -X POST http://localhost:5000/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How do space stations create artificial gravity?"}'
```

## Performance Expectations

| Metric | MySQL (before) | PostgreSQL + pgvector (after) |
|--------|----------------|-------------------------------|
| Vector search (1.2k chunks) | 150-300ms | 5-20ms |
| Vector search (50k chunks) | 6-12 seconds | 20-50ms |
| Memory per query | 10-400MB | ~0 (database handles) |
| Search complexity | O(n) linear | O(log n) HNSW |

## Railway Deployment

1. Add PostgreSQL service in Railway dashboard
2. Install pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
3. Run schema migration
4. Update environment variables
5. Deploy new backend code

## Rollback Plan

Your MySQL database and code are tagged at `v2.0-mysql-stable`. To rollback:

```bash
git checkout v2.0-mysql-stable
```

Update Railway environment variables back to MySQL configuration.
