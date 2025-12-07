# 🚀 Space Habitats RAG

An AI-powered knowledge base for space habitat research and design. Built with Retrieval-Augmented Generation (RAG) technology to make designing space and extraterrestrial habitats easy, educational, and fun.

![Version](https://img.shields.io/badge/version-3.0.0--stable-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Mission

1. **Learn & Share** — A comprehensive knowledge base for space habitat design
2. **Contribute** — Enable users to submit research and ideas to grow the community knowledge
3. **Explore** — Make the journey toward becoming a spacefaring species enjoyable

## ✨ Features

### Core RAG System
- **Vector Similarity Search** — PostgreSQL with pgvector for semantic document retrieval
- **Multi-LLM Support** — Choose between Grok, Claude, or compare both side-by-side
- **Conversation History** — Follow-up questions maintain context for natural dialogue
- **LaTeX Math Rendering** — Proper mathematical notation in responses

### Document Crawler
- **Automated Ingestion** — Scheduled crawling from NASA NTRS and arXiv
- **Smart Deduplication** — Hash-based detection prevents duplicate content
- **Admin Controls** — Start/stop, daily limits, search term management
- **Quality Filtering** — Eligibility checks for relevance and licensing

### User Features
- **Tiered Subscriptions** — Free, Basic, Pro, and Enterprise plans
- **Content Submission** — Users can contribute documents for review
- **Knowledge Base Browser** — Explore indexed documents by category

### Admin Dashboard
- **User Management** — Role assignments, analytics, query history
- **Document Processing** — Approve submissions, generate embeddings
- **Crawler Controls** — Monitor and configure automated ingestion
- **Beta Mode** — Special pricing for early adopters

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React + Vite (Vercel)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │Landing  │ │Dashboard│ │ Admin   │ │ Browse  │ │ Submit    │ │
│  │Page     │ │ (RAG)   │ │ Panel   │ │   KB    │ │ Content   │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                  Node.js + Express (Railway)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Auth        │ │ RAG         │ │ Crawler     │               │
│  │ Controller  │ │ Controller  │ │ Service     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│         │               │               │                       │
│  ┌─────────────────────────────────────────────┐               │
│  │              Services Layer                  │               │
│  │  • ragService      • embeddingService       │               │
│  │  • crawlerService  • crawlerSettings        │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │PostgreSQL │   │ MongoDB   │   │ External  │
       │+ pgvector │   │  Atlas    │   │   APIs    │
       │ (Railway) │   │           │   │           │
       │           │   │           │   │• HuggingFace
       │• Chunks   │   │• Submissions  │• Grok     │
       │• Users    │   │• Metadata │   │• Claude   │
       │• Settings │   │           │   │• NASA NTRS│
       └───────────┘   └───────────┘   │• arXiv    │
                                       └───────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| React Router | Navigation |
| Axios | HTTP client |
| ReactMarkdown | Markdown rendering |
| KaTeX | LaTeX math rendering |
| Vite | Build tool |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Express.js | Web framework |
| Passport.js | Authentication |
| node-cron | Scheduled tasks |
| Anthropic SDK | Claude API |
| Axios | External API calls |

### Databases
| Database | Purpose |
|----------|---------|
| PostgreSQL 16 + pgvector | Vector storage, users, settings |
| MongoDB Atlas | Document submissions, metadata |

### External Services
| Service | Purpose |
|---------|---------|
| HuggingFace Inference API | Embedding generation (multilingual-e5-large) |
| Grok API (xAI) | LLM responses |
| Claude API (Anthropic) | LLM responses |
| Stripe | Payment processing |

### Deployment
| Platform | Service |
|----------|---------|
| Vercel | Frontend hosting |
| Railway | Backend + PostgreSQL |
| MongoDB Atlas | Document database |

---

## 📁 Project Structure

```
rag-space-habitats/
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main app with routing
│   │   ├── App.css             # Global styles
│   │   ├── config.js           # API URL configuration
│   │   ├── AdminPanel.js       # Admin dashboard
│   │   ├── AdminPanel.css
│   │   ├── AppNavbar.js        # Navigation component
│   │   ├── AppNavbar.css
│   │   ├── LandingPage.js      # Public landing page
│   │   ├── LandingPage.css
│   │   ├── PricingPage.js      # Subscription tiers
│   │   ├── SubmitContent.js    # Document submission
│   │   ├── BrowseKnowledgeBase.js
│   │   └── DocumentViewer.js
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend-refactored/
│   ├── server.js               # Express app entry point
│   ├── package.json
│   │
│   ├── config/
│   │   ├── database.js         # PostgreSQL connection
│   │   ├── mongodb.js          # MongoDB connection
│   │   ├── passport.js         # Auth strategy
│   │   └── session.js          # Session configuration
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── ragController.js    # RAG query handling
│   │   └── adminController.js
│   │
│   ├── services/
│   │   ├── ragService.js       # RAG logic + LLM calls
│   │   ├── embeddingService.js # HuggingFace embeddings
│   │   ├── crawlerService.js   # Document crawler
│   │   ├── crawlerSettings.js  # Crawler configuration
│   │   └── sourceAdapters/
│   │       ├── ntrsAdapter.js  # NASA NTRS API
│   │       └── arxivAdapter.js # arXiv API
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── QueryLog.js
│   │   ├── Subscription.js
│   │   └── SystemSettings.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rag.js
│   │   ├── admin.js
│   │   ├── submissions.js
│   │   ├── subscriptions.js
│   │   └── crawler.js
│   │
│   └── middleware/
│       ├── auth.js             # isAuthenticated, isAdmin
│       └── errorHandler.js
│
└── README.md
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=production

# PostgreSQL (Railway)
DATABASE_URL=postgresql://user:password@host:port/database

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
MONGODB_DB=space_habitats_rag

# Authentication
SESSION_SECRET=your-session-secret

# LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...

# Embeddings
HUGGINGFACE_API_KEY=hf_...

# Stripe (optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend-domain.railway.app
```

---

## 🗄️ Database Schemas

### PostgreSQL

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    llm_preference VARCHAR(50) DEFAULT 'grok',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### document_chunks
```sql
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    source_id VARCHAR(255),
    source_type VARCHAR(50) DEFAULT 'mongodb_submission',
    chunk_index INTEGER DEFAULT 0,
    processed_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1024)
);

CREATE INDEX idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### system_settings
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### query_logs
```sql
CREATE TABLE query_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    question TEXT NOT NULL,
    response_time INTEGER,
    chunks_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB

#### document_submissions
```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  category: String,           // life_support, radiation, structural, etc.
  description: String,
  attribution: String,        // Author + source
  license: String,            // Public Domain, CC-BY, etc.
  url: String,
  status: String,             // pending, approved, rejected, processed, crawled
  submitted_by: ObjectId,
  submitted_by_username: String,
  reviewed_by: ObjectId,
  review_notes: String,
  submitted_at: Date,
  reviewed_at: Date,
  processed_at: Date,
  chunk_count: Number,
  
  // Crawler-specific fields
  source: String,             // ntrs, arxiv
  externalId: String,         // Original ID from source
  hash: String,               // SHA256 for deduplication
  published_date: Date,
  metadata: {
    // NTRS
    center: String,
    subjectCategories: [String],
    reportNumber: String,
    
    // arXiv
    categories: [String],
    arxivId: String,
    doi: String,
    journalRef: String
  }
}
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/settings` | Get user settings |
| POST | `/api/auth/settings/llm` | Update LLM preference |

### RAG
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/ask` | Ask a question (with optional conversationHistory) |
| GET | `/api/rag/history` | Get user's query history |

### Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/submissions` | List submissions (filterable by status) |
| POST | `/api/submissions` | Create new submission |
| GET | `/api/submissions/:id` | Get submission details |
| PATCH | `/api/submissions/:id/status` | Update submission status |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users/:id/role` | Update user role |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/analytics` | Get system analytics |
| GET | `/api/admin/processing-stats` | Get processing statistics |
| POST | `/api/admin/process-all` | Process approved submissions |
| POST | `/api/admin/embed-all` | Generate missing embeddings |
| GET | `/api/admin/beta-mode` | Get beta mode status |
| POST | `/api/admin/beta-mode` | Toggle beta mode |
| GET | `/api/admin/pricing` | Get pricing tiers |
| PUT | `/api/admin/pricing/:tier` | Update pricing tier |

### Crawler
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/crawler/status` | Get crawler status |
| POST | `/api/crawler/toggle` | Enable/disable crawler |
| POST | `/api/crawler/run` | Trigger manual run |
| POST | `/api/crawler/stop` | Stop running crawler |
| GET | `/api/crawler/settings` | Get crawler settings |
| PATCH | `/api/crawler/settings` | Update settings (dailyLimit, sources) |
| POST | `/api/crawler/search-terms` | Add search terms |
| DELETE | `/api/crawler/search-terms/:term` | Remove search term |
| GET | `/api/crawler/history` | Get recently crawled documents |
| GET | `/api/crawler/stats` | Get crawler statistics |

---

## 🕷️ Crawler System

### Data Sources

#### NASA NTRS (Technical Reports Server)
- **API**: `https://ntrs.nasa.gov/api/citations/search`
- **Content**: NASA technical reports, conference papers
- **Filtering**: Excludes ITAR/export controlled, requires abstract
- **Rate Limit**: 1 second between requests

#### arXiv
- **API**: `http://export.arxiv.org/api/query`
- **Content**: Physics, astrophysics preprints
- **Categories**: astro-ph.EP, physics.space-ph, and keyword matching
- **Rate Limit**: 3 seconds between requests

### Default Search Terms
```
space habitat, orbital station, life support systems, closed-loop ECLSS,
artificial gravity, O'Neill cylinder, rotating spacecraft, lunar base,
Mars habitat, space settlement, Bernal sphere, Stanford torus,
space colonization, in-situ resource utilization, radiation shielding spacecraft
```

### Processing Pipeline
```
1. Query sources with rotated search terms
2. Filter by eligibility (license, content, relevance)
3. Deduplicate against existing documents (hash + externalId)
4. Store metadata in MongoDB (status: 'crawled')
5. Chunk content (1000 chars, 200 overlap)
6. Generate embeddings via HuggingFace
7. Store chunks + vectors in PostgreSQL
8. Update MongoDB status to 'processed'
```

### Scheduling
- **Automatic**: Daily at 23:00 CT (America/Chicago)
- **Manual**: Via admin panel or API
- **Default Limit**: 100 documents/day

---

## 🚀 Deployment

### Railway (Backend)

1. Connect GitHub repository
2. Set environment variables
3. Deploy from main branch
4. PostgreSQL plugin auto-configured

### Vercel (Frontend)

1. Import from GitHub
2. Set `VITE_API_URL` environment variable
3. Build command: `npm run build`
4. Output directory: `dist`

### MongoDB Atlas

1. Create cluster (M0 free tier works)
2. Create database user
3. Whitelist Railway IPs (or allow all: 0.0.0.0/0)
4. Get connection string for `MONGODB_URI`

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)
- MongoDB (local or Atlas)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/rag-space-habitats.git
cd rag-space-habitats

# Start PostgreSQL with pgvector
docker run -d \
  --name pgvector-dev \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=space_habitats_rag \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Backend setup
cd backend-refactored
cp .env.example .env  # Edit with your values
npm install
npm run dev

# Frontend setup (new terminal)
cd frontend
cp .env.example .env  # Edit with your values
npm install
npm run dev
```

### Initialize Database

```bash
# Connect to PostgreSQL
docker exec -it pgvector-dev psql -U postgres -d space_habitats_rag

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Run schema (see Database Schemas section)
```

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| v3.0.0-stable | 2024-12-06 | PostgreSQL migration, conversation support, document crawler |
| v2.0-mysql-stable | 2024-11 | MySQL implementation, admin panel, subscriptions |
| v1.1-stable | 2024-10 | LLM selection, math rendering |
| v1.0.0-stable | 2024-10 | Initial release with Grok integration |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **NASA SP-413** "Space Settlements: A Design Study" — Primary knowledge source
- **Isaac Asimov's Foundation series** — Design inspiration
- **Anthropic** — Claude API
- **xAI** — Grok API
- **HuggingFace** — Embedding models

---

## 📞 Support

- **Issues**: GitHub Issues
- **Email**: [your-email]
- **Documentation**: This README

---

*Building humanity's future among the stars, one query at a time.* 🌟
