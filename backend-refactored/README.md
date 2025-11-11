# Space Habitats RAG System

A Retrieval-Augmented Generation (RAG) system for querying information about space habitats, powered by AI and vector embeddings.

## Features

- 🤖 **Dual LLM Support**: Grok and Claude AI integration
- 🔍 **Vector Search**: 768-dimensional embeddings with semantic search
- 💳 **Subscription Tiers**: Free, Basic, Pro, Enterprise with Stripe payments
- 🚀 **Beta Mode**: Admin-controlled promotional pricing
- 📊 **Admin Dashboard**: User management, pricing control, analytics
- 🎨 **Modern UI**: React frontend with responsive design

## Tech Stack

**Backend:**
- Node.js + Express
- MySQL (MariaDB) for relational data
- MongoDB for document storage
- Python (SentenceTransformer) for embeddings
- Stripe for payments
- Passport.js for authentication

**Frontend:**
- React
- Axios for API calls
- CSS3 with modern gradients

## Prerequisites

- Node.js 16+
- Python 3.9+
- MariaDB 10.5+
- MongoDB 4.4+

## Installation

### 1. Clone Repository

\`\`\`bash
git clone <your-repo-url>
cd rag-space-habitats
\`\`\`

### 2. Backend Setup

\`\`\`bash
cd backend-refactored

# Install dependencies
npm install

# Install Python dependencies
pip install sentence-transformers flask flask-cors --break-system-packages

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run database migrations
mysql -h localhost -P 3307 -u rag_user -p manual_db < migrations/*.sql
\`\`\`

### 3. Frontend Setup

\`\`\`bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
\`\`\`

### 4. Start Services

**Terminal 1 - Backend:**
\`\`\`bash
cd backend-refactored
npm run dev
\`\`\`

**Terminal 2 - Embedding Server:**
\`\`\`bash
cd backend-refactored/python-services
python embedding_server.py
\`\`\`

**Terminal 3 - Frontend:**
\`\`\`bash
cd frontend
npm start
\`\`\`

**Terminal 4 - Stripe Webhooks (Development):**
\`\`\`bash
stripe listen --forward-to localhost:5000/api/subscriptions/webhook
\`\`\`

## Configuration

### Stripe Setup

1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Run: `node scripts/setup-stripe-products.js`
4. Start webhook listener for local testing

### Admin User

First registered user is automatically an admin, or run:

\`\`\`sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
\`\`\`

## Usage

1. Navigate to http://localhost:3000
2. Register/Login
3. Ask questions about space habitats
4. Upgrade to paid tiers for more features

## Admin Features

- Manage users and roles
- Configure pricing tiers
- Toggle beta mode
- View analytics
- Process document submissions

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide.

## License

MIT

## Support

For issues, please create a GitHub issue.
\`\`\`

---

## 🚀 Deployment Options

Now let's discuss deployment. What's your preference?

### **Option A: Heroku (Easiest)**
- ✅ Simple deployment
- ✅ Free tier available (with limits)
- ✅ Automatic HTTPS
- ⚠️ Requires add-ons for databases

### **Option B: DigitalOcean App Platform**
- ✅ Good for full-stack apps
- ✅ Integrated databases
- ✅ $5-10/month
- ✅ Easy scaling

### **Option C: AWS (Most Flexible)**
- ✅ Complete control
- ✅ Can be cheap with free tier
- ⚠️ More complex setup
- ✅ Best for production scale

### **Option D: Vercel (Frontend) + Railway (Backend)**
- ✅ Vercel: Free frontend hosting
- ✅ Railway: Easy backend deployment
- ✅ Good developer experience

### **Option E: VPS (DigitalOcean Droplet, Linode, etc.)**
- ✅ Full control
- ✅ $5-10/month
- ⚠️ Manual setup (Docker recommended)
- ✅ Run everything on one server

---

## 📊 What Each Option Needs

**All options need:**
- MySQL database (or convert to PostgreSQL)
- MongoDB database
- Environment variables
- Stripe webhook endpoint (must be public URL)

**Embedding server:**
- Can run on same server OR
- Use cloud embedding API (costs $)

---

## 💡 My Recommendation

**For MVP/Testing: Option D (Vercel + Railway)**
- Frontend on Vercel (free)
- Backend on Railway ($5/month, includes DB)
- Easiest to get started

**For Production: Option E (VPS with Docker)**
- One $10/month droplet
- Docker Compose for all services
- Full control, predictable costs

---

## 🎯 Next Steps

**What would you like to do?**

1. **Commit the code first** - Let's create a clean commit
2. **Choose deployment platform** - Which option interests you?
3. **Create deployment guide** - I'll write step-by-step instructions

**Want to commit first, then we'll tackle deployment?** 🚀