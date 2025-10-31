# Space Habitats RAG - Refactored with MVC Architecture

A production-ready RAG (Retrieval-Augmented Generation) application with clean MVC architecture, AdminJS integration, and comprehensive admin features.

## 🎯 What Changed

### Before (Monolithic)
- Single `server.js` file with 200+ lines
- Mixed concerns (auth, RAG, admin in one place)
- Difficult to maintain and extend

### After (MVC Architecture)
- Organized into Models, Views (API), Controllers
- Separation of concerns
- Easy to maintain and extend
- Professional AdminJS dashboard

## 📁 Project Structure

```
backend-refactored/
├── config/
│   ├── database.js         # Database connection pool
│   ├── passport.js         # Authentication strategy
│   ├── session.js          # Session configuration
│   └── adminjs.js          # AdminJS setup
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── ragController.js    # RAG query handling
│   └── adminController.js  # Admin operations
├── models/
│   ├── User.js            # User data access
│   └── QueryLog.js        # Query logging & analytics
├── middleware/
│   ├── auth.js            # Auth middleware (requireAuth, requireAdmin)
│   └── errorHandler.js    # Global error handling
├── routes/
│   ├── auth.js            # Auth routes
│   ├── rag.js             # RAG routes
│   └── admin.js           # Admin routes
├── services/
│   └── ragService.js      # RAG business logic (retrieval + generation)
├── migrations/
│   └── 001_add_query_log.sql  # Database migrations
├── lib/                   # Legacy code (retrieval, etc.)
├── server.js              # Main application entry
├── package.json           # Dependencies
└── .env.example           # Environment template
```

## 🚀 Installation

### 1. Install Dependencies

```bash
cd backend-refactored
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `SESSION_SECRET` - Session encryption key
- `ANTHROPIC_API_KEY` or `XAI_API_KEY` - LLM API key

### 3. Run Database Migrations

```bash
mysql -u root -p space_habitats_rag < migrations/001_add_query_log.sql
```

### 4. Start Server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## 🎨 Features

### Core Features
- ✅ User authentication (register, login, logout)
- ✅ Role-based access control (admin, user)
- ✅ RAG question answering with Claude or Grok
- ✅ Query logging and analytics
- ✅ LaTeX math rendering support

### Admin Features
- ✅ AdminJS dashboard at `/admin`
- ✅ User management (view, edit, delete)
- ✅ Query analytics (response times, usage stats)
- ✅ Query history viewer
- ✅ Role management
- ✅ Protected admin operations

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login
POST   /api/auth/logout      - Logout
GET    /api/auth/me          - Get current user
```

### RAG
```
POST   /api/rag/ask          - Ask a question (requires auth)
GET    /api/rag/history      - Get query history (requires auth)
```

### Admin
```
GET    /api/admin/users              - List all users
PATCH  /api/admin/users/:id/role    - Update user role
DELETE /api/admin/users/:id          - Delete user
GET    /api/admin/analytics          - Get analytics
POST   /api/admin/preprocess         - Trigger preprocessing
```

### Legacy Compatibility
```
POST   /register              - Redirects to /api/auth/register
POST   /login                 - Redirects to /api/auth/login
POST   /logout                - Redirects to /api/auth/logout
GET    /me                    - Redirects to /api/auth/me
POST   /ask                   - Redirects to /api/rag/ask
POST   /admin/preprocess      - Redirects to /api/admin/preprocess
```

## 🎛️ AdminJS Dashboard

Access at `http://localhost:5000/admin`

Features:
- 📊 User management interface
- 📈 Query log viewer
- 🔍 Search and filter capabilities
- ✏️ Inline editing
- 🗑️ Bulk operations
- 📱 Responsive design

## 🔒 Security Features

1. **Password Hashing**: Bcrypt with salt rounds
2. **Session Management**: Secure HTTP-only cookies
3. **Role-Based Access**: Middleware protection
4. **SQL Injection Protection**: Parameterized queries
5. **CORS Configuration**: Restricted origins
6. **Admin Protection**: Cannot delete last admin or self

## 📊 Analytics

Track important metrics:
- Total queries
- Active users
- Average response time
- Chunks retrieved per query
- Query history per user

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}' \
  -c cookies.txt

# Ask question
curl -X POST http://localhost:5000/api/rag/ask \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"question":"What is a Stanford torus?"}'
```

## 🔄 Migration from Old Server

Your existing frontend will work without changes! Legacy routes are supported:

```javascript
// Old frontend code still works:
axios.post('http://localhost:5000/ask', { question })
axios.post('http://localhost:5000/login', { username, password })
```

But you can also use the new cleaner routes:

```javascript
// New cleaner routes:
axios.post('http://localhost:5000/api/rag/ask', { question })
axios.post('http://localhost:5000/api/auth/login', { username, password })
```

## 🛠️ Development

### Adding New Features

**Add a new model:**
```javascript
// models/Document.js
class Document {
  static async findAll() { ... }
  static async create(data) { ... }
}
```

**Add a new controller:**
```javascript
// controllers/documentController.js
class DocumentController {
  static async list(req, res, next) { ... }
}
```

**Add a new route:**
```javascript
// routes/documents.js
router.get('/', DocumentController.list);
```

**Register in server.js:**
```javascript
const documentRoutes = require('./routes/documents');
app.use('/api/documents', documentRoutes);
```

## 📦 Dependencies

### Core
- `express` - Web framework
- `mysql2` - Database driver
- `passport` - Authentication
- `bcrypt` - Password hashing

### AdminJS
- `adminjs` - Admin panel framework
- `@adminjs/express` - Express integration
- `@adminjs/sql` - SQL database adapter

### AI
- `@anthropic-ai/sdk` - Claude API
- `axios` - HTTP client (for Grok)

### Development
- `nodemon` - Auto-reload
- `dotenv` - Environment variables

## 🎓 Key Improvements

1. **Separation of Concerns**: Each file has one responsibility
2. **Testability**: Controllers and services are easily testable
3. **Maintainability**: Clear structure, easy to find code
4. **Scalability**: Easy to add new features
5. **Error Handling**: Centralized error management
6. **Logging**: Built-in query and access logging
7. **Admin Interface**: Professional dashboard out of the box

## 🚨 Common Issues

### AdminJS Not Loading
- Check that migrations ran successfully
- Verify database connection
- Check console for errors

### Authentication Issues
- Ensure cookies are enabled
- Check CORS configuration
- Verify session secret is set

### Database Connection Failed
- Check .env database credentials
- Ensure MySQL is running
- Verify database exists

## 📝 TODO / Future Enhancements

- [ ] Add API rate limiting
- [ ] Implement API key authentication
- [ ] Add document upload via AdminJS
- [ ] Background job queue for preprocessing
- [ ] WebSocket support for real-time updates
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📄 License

MIT

## 🤝 Contributing

This is your project! Feel free to:
- Add new features
- Improve existing code
- Fix bugs
- Update documentation

---

Built with ❤️ for Space Habitats research
