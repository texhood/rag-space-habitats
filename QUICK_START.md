# 🚀 Quick Start Guide

Get your refactored Space Habitats RAG running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- MySQL running
- Your existing database `space_habitats_rag`

## Installation

### 1. Copy Files

```bash
# Extract the backend-refactored folder to your project
unzip backend-refactored.zip
cd backend-refactored
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

Minimum required:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=space_habitats_rag
SESSION_SECRET=change-this-secret
XAI_API_KEY=your_grok_key_here
```

### 4. Run Database Migration

```bash
mysql -u root -p space_habitats_rag < migrations/001_add_query_log.sql
```

### 5. Start Server

```bash
npm run dev
```

You should see:
```
🚀 Space Habitats RAG Server
📡 Server: http://localhost:5000
⚙️  AdminJS: http://localhost:5000/admin
```

## Test It Out

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. Login
Visit `http://localhost:3000` in your browser (your existing frontend)

### 3. Access AdminJS
Visit `http://localhost:5000/admin`

## What's New?

### For Developers
- 📁 Clean MVC structure
- 🎯 Separated concerns (Models, Controllers, Services)
- 🔧 Easy to maintain and extend
- 📊 Built-in analytics

### For Admins
- 🎨 Professional admin dashboard at `/admin`
- 👥 User management interface
- 📈 Query analytics and monitoring
- 🔍 Search and filter capabilities

### For Users
- ⚡ Same great experience
- 📝 Query history tracking
- 🔒 Enhanced security

## Compatibility

Your existing frontend works without any changes! All old routes are supported:

- `POST /login` → Still works
- `POST /register` → Still works
- `POST /ask` → Still works

But you can also use the new cleaner API routes:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/rag/ask`

## Next Steps

1. ✅ **Explore AdminJS** - Visit `/admin` to see your new dashboard
2. 📊 **Check Analytics** - View query stats and user activity
3. 🎨 **Customize** - Add your own features using the MVC structure
4. 📚 **Read Documentation** - Check README.md for details

## Need Help?

- 📖 **Full Documentation**: See `README.md`
- 🔄 **Migration Guide**: See `MIGRATION_GUIDE.md`
- 🐛 **Troubleshooting**: Check the guides for common issues

## Structure Overview

```
backend-refactored/
├── config/          # Configuration (database, passport, adminjs)
├── controllers/     # Request handlers
├── models/          # Data access layer
├── routes/          # API routes
├── services/        # Business logic
├── middleware/      # Auth, error handling
└── server.js        # Main entry point
```

## Pro Tips

### Development Mode
```bash
npm run dev  # Auto-reloads on changes
```

### Production Mode
```bash
npm start  # Stable, no auto-reload
```

### Check Health
```bash
curl http://localhost:5000/health
```

### View Logs
All requests are logged to console with timestamps

### Database Access
```bash
mysql -u root -p space_habitats_rag
```

---

## 🎉 You're Ready!

Your refactored RAG application is now running with:
- ✅ Clean MVC architecture
- ✅ AdminJS dashboard
- ✅ Query analytics
- ✅ Better security
- ✅ Easy to extend

Enjoy your upgraded Space Habitats RAG! 🚀
