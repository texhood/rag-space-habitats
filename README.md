# Space Habitats RAG

A web app for asking questions about space habitats. Answers are generated from a document corpus and, inside a project, from that project's uploads.

## Request path

1. The Vite app in `frontend/` calls the Express API in `backend-refactored/`.
2. Sign-in is a Passport session cookie. Authenticated questions go to `POST /api/rag/ask`. Project questions go to `POST /api/projects/:id/query`.
3. `services/ragService.js` embeds the question, reads the nearest rows from `document_chunks`, and asks Grok or Claude for an answer.
4. The embedding step uses the local Python server (`python-services/embedding_server.py`) or the Hugging Face API when that server is down.

`GET /health` reports that the process is up. It does not check either database.

## Stores

**PostgreSQL** (`DATABASE_URL`) holds users, sessions data, document chunks and their vectors, projects, conversations, subscriptions, and usage. Schema changes that are still applied live in `backend-refactored/migrations/`. Older scripts in `backend-refactored/sql_scripts/` are historical.

**MongoDB** (`MONGODB_URI`, database `MONGODB_DB`) holds `document_submissions` and GridFS bytes for project uploads. Extracted text and embeddings for those uploads are copied into PostgreSQL.

## Run locally

```bash
cd backend-refactored && npm install && npm run dev
cd frontend && npm install && npm run dev
```

The API listens on port 5000. The client listens on port 3500 and reads `REACT_APP_API_URL` (default `http://localhost:5000`).

Copy the environment values you need into `backend-refactored/.env`: `DATABASE_URL`, `MONGODB_URI`, `SESSION_SECRET`, `XAI_API_KEY`, and optionally `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `HUGGINGFACE_API_KEY`.
