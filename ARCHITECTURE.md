# Project Statement
This project is intended to learn to develop a R-A-G applications. The first iteration will use a node.js, React, MariaDB 11.7+ stack. The first model should be a free model that can be run 100% locally. Subsequent iterations will explore different software stacks and models.

Ultimately, I want to produce at least one RAG app that gathers publicly available content on the design and construction of space and exoplanet habitats to create a queryable knowledge base for space afficionados. In its final form, it should: 
	- render mathematics expressions in mathematics notation, 
	- enable registration and login, - paid subscriptions, 
	- continuous updates/document addition, - documents submitted for inclusion in the app are stored in MongoDB, 
	- documents submitted must be approved prior to extraction and chunking into MariaDB, 
	- have a set of visual Admin tools for 
		- app maintenance issues, 
		- user maintenance, 
		- query analytics.

The publicly deployed solution must be CORS compliant. A fallback embedding server should be configured so that if a local embedding server is not available an appropriate Hugging Face model is used.

A pipeline should be developed so that a pull request into the main branch of the repo automatically deploys the updates to a production site.

# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                     http://localhost:3000                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS + Cookies
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    EXPRESS.JS SERVER                             │
│                   http://localhost:5000                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Middleware   │  │   Middleware   │  │   Middleware   │    │
│  │      CORS      │→ │    Session     │→ │    Passport    │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                       ROUTES                               │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  /api/auth/*    → Auth Controller                         │  │
│  │  /api/rag/*     → RAG Controller                          │  │
│  │  /api/admin/*   → Admin Controller (requires admin)      │  │
│  │  /admin         → AdminJS Dashboard                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────────────┐ │
│  │                    CONTROLLERS                              │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  authController    │  ragController   │  adminController   │ │
│  │  - register        │  - ask           │  - getUsers        │ │
│  │  - login           │  - getHistory    │  - updateRole      │ │
│  │  - logout          │                  │  - getAnalytics    │ │
│  └──────────┬──────────────────┬───────────────────┬──────────┘ │
│             │                  │                   │             │
│  ┌──────────▼──────────────────▼───────────────────▼──────────┐ │
│  │                        SERVICES                             │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  RAG Service                                                │ │
│  │  - retrieveRelevantChunks()                                 │ │
│  │  - generateAnswer()                                         │ │
│  │  - Integrates with Claude/Grok API                          │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │                        MODELS                               │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  User              │  QueryLog                              │ │
│  │  - findById()      │  - create()                            │ │
│  │  - findAll()       │  - getAnalytics()                      │ │
│  │  - create()        │  - getRecent()                         │ │
│  │  - updateRole()    │                                        │ │
│  └──────────┬─────────────────┬────────────────────────────────┘ │
│             │                 │                                   │
└─────────────┼─────────────────┼───────────────────────────────────┘
              │                 │
              │                 │
┌─────────────▼─────────────────▼───────────────────────────────────┐
│                       MySQL DATABASE                               │
│                  space_habitats_rag                                │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │    users     │  │  query_log   │  │  document_chunks     │    │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤    │
│  │ id           │  │ id           │  │ id                   │    │
│  │ username     │  │ user_id  (FK)│  │ content              │    │
│  │ password     │  │ question     │  │ embedding            │    │
│  │ role         │  │ response_time│  │ metadata             │    │
│  │ created_at   │  │ created_at   │  └──────────────────────┘    │
│  └──────────────┘  └──────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
              │                                  
              │                                  
┌─────────────▼──────────────────────────────────────────────────────┐
│                        EXTERNAL APIs                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐              ┌──────────────────┐           │
│  │  Claude API      │              │   Grok API       │           │
│  │  (Anthropic)     │              │   (X.AI)         │           │
│  └──────────────────┘              └──────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Request Flow Example

### User Asks a Question

```
1. User types question in React frontend
   ↓
2. Frontend sends POST /api/rag/ask with credentials
   ↓
3. Express receives request
   ↓
4. Session middleware validates session cookie
   ↓
5. Passport middleware deserializes user from session
   ↓
6. requireAuth middleware checks authentication
   ↓
7. RAG Controller receives request
   ↓
8. RAG Service retrieves relevant chunks from database
   ↓
9. RAG Service calls Claude/Grok API with context
   ↓
10. Response received from LLM
   ↓
11. QueryLog model logs the query (user, time, chunks)
   ↓
12. Response sent back to frontend
   ↓
13. Frontend renders answer with LaTeX math
```

## Admin Dashboard Flow

```
1. Admin navigates to /admin
   ↓
2. AdminJS middleware checks authentication
   ↓
3. AdminJS queries database via SQL adapter
   ↓
4. Renders admin interface with:
   - User management
   - Query log viewer
   - Inline editing
   ↓
5. Admin makes changes (edit role, delete user, etc.)
   ↓
6. AdminJS validates and saves to database
```

## MVC Pattern

```
┌──────────────────────────────────────────────────────┐
│                      CLIENT                          │
│                   (React Frontend)                   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────┐
│                      ROUTES                          │
│              (URL → Controller mapping)              │
└──────────────────────┬───────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────┐
│                   CONTROLLERS                        │
│        (Handle requests, return responses)           │
└──────────────────────┬───────────────────────────────┘
                       │
                ┌──────┴──────┐
                ↓             ↓
┌─────────────────────┐  ┌─────────────────────┐
│     SERVICES        │  │      MODELS         │
│  (Business Logic)   │→ │  (Data Access)      │
└─────────────────────┘  └──────────┬──────────┘
                                    │
                                    ↓
                         ┌──────────────────┐
                         │    DATABASE      │
                         └──────────────────┘
```

## Security Layers

```
Request → CORS Check → Session Validation → Authentication
                                              ↓
                                    User Role Check
                                              ↓
                                       Controller
                                              ↓
                                    Protected Resource
```

## File Organization

```
backend-refactored/
│
├── 🔧 CONFIG                    # App configuration
│   ├── database.js              # DB connection
│   ├── passport.js              # Auth strategy
│   ├── session.js               # Session config
│   └── adminjs.js               # Admin panel
│
├── 🎮 CONTROLLERS               # Request handlers
│   ├── authController.js        # Login/Register/Logout
│   ├── ragController.js         # Question answering
│   └── adminController.js       # Admin operations
│
├── 📊 MODELS                    # Data layer
│   ├── User.js                  # User CRUD
│   └── QueryLog.js              # Analytics data
│
├── 🛣️  ROUTES                    # API endpoints
│   ├── auth.js                  # /api/auth/*
│   ├── rag.js                   # /api/rag/*
│   └── admin.js                 # /api/admin/*
│
├── 🔧 SERVICES                  # Business logic
│   └── ragService.js            # RAG pipeline
│
├── 🛡️  MIDDLEWARE                # Cross-cutting concerns
│   ├── auth.js                  # Auth guards
│   └── errorHandler.js          # Error handling
│
└── 🚀 SERVER.JS                 # Application entry point
```

## Data Flow Comparison

### Before (Monolithic)
```
Request → Giant server.js (200+ lines)
          ↓
       Everything mixed together
       - Auth logic
       - RAG logic  
       - Admin logic
       - Database queries
          ↓
       Response
```

### After (MVC)
```
Request → Routes → Controller → Service → Model → Database
   ↑                                              ↓
   └──────────── Response ←──────────────────────┘
   
Each layer has ONE responsibility
Easy to test, maintain, and extend
```
