# Migration Guide: From Monolithic to MVC Architecture

This guide will help you migrate from your current `server.js` to the new refactored MVC structure.

## 📋 Pre-Migration Checklist

- [ ] Backup your current database
- [ ] Backup your current `server.js`
- [ ] Note your current environment variables
- [ ] Ensure you have Node.js 16+ installed
- [ ] Ensure MySQL is running

## 🔄 Migration Steps

### Step 1: Backup Current Setup

```bash
# Backup database
mysqldump -u root -p space_habitats_rag > backup_$(date +%Y%m%d).sql

# Backup current code
cp server.js server_old_backup.js
```

### Step 2: Install Refactored Backend

```bash
# Navigate to your project root
cd /path/to/your/project

# Copy the refactored backend
cp -r /path/to/backend-refactored ./backend

# Navigate to new backend
cd backend

# Install dependencies
npm install
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

Update with your current values:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_current_password
DB_NAME=space_habitats_rag
SESSION_SECRET=your_current_secret
ANTHROPIC_API_KEY=your_api_key_if_you_have_one
XAI_API_KEY=your_grok_key
```

### Step 4: Run Database Migrations

```bash
# Add query_log table
mysql -u root -p space_habitats_rag < migrations/001_add_query_log.sql
```

Verify migration:
```sql
USE space_habitats_rag;
SHOW TABLES;  -- Should see 'users' and 'query_log'
DESCRIBE query_log;
```

### Step 5: Copy Your Custom Code

If you have custom retrieval logic in `lib/retrieval.js`:

```bash
# Copy your existing lib directory
cp -r /path/to/old/lib ./lib
```

Update `services/ragService.js` to use your retrieval logic:
```javascript
// Replace the placeholder retrieval with your actual implementation
const { retrieveRelevantChunks } = require('../lib/retrieval');

async retrieveRelevantChunks(question, limit = 5) {
  return await retrieveRelevantChunks(question, limit);
}
```

### Step 6: Test the New Backend

```bash
# Start the server
npm run dev
```

You should see:
```
🚀 Space Habitats RAG Server
📡 Server: http://localhost:5000
🎨 Frontend: http://localhost:3000
⚙️  AdminJS: http://localhost:5000/admin
```

### Step 7: Test Core Functionality

#### Test Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","uptime":...}
```

#### Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

#### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' \
  -c cookies.txt -v
```

#### Test Protected Route
```bash
curl -X POST http://localhost:5000/api/rag/ask \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"question":"What is a Stanford torus?"}'
```

### Step 8: Update Frontend (If Needed)

Your current frontend should work without changes due to legacy route support. But if you want to use the new clean routes:

**Old (still works):**
```javascript
axios.post('http://localhost:5000/ask', { question })
```

**New (cleaner):**
```javascript
axios.post('http://localhost:5000/api/rag/ask', { question })
```

### Step 9: Test AdminJS Dashboard

1. Navigate to `http://localhost:5000/admin`
2. Log in with admin credentials
3. Verify you can:
   - View users
   - View query logs
   - Edit user roles
   - Delete users (except yourself)

### Step 10: Migrate Existing Data (Optional)

If you have existing query logs or data to migrate, create a migration script:

```javascript
// migrations/migrate_old_data.js
const pool = require('../config/database');

async function migrate() {
  // Example: Migrate old data structure
  const [oldData] = await pool.query('SELECT * FROM old_table');
  
  for (const row of oldData) {
    await pool.query(
      'INSERT INTO new_table (...) VALUES (...)',
      [row.field1, row.field2]
    );
  }
  
  console.log('Migration complete');
}

migrate().catch(console.error);
```

## 🔍 Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] Database connection works
- [ ] Users can register
- [ ] Users can login
- [ ] Users can ask questions
- [ ] Admin can access admin panel
- [ ] AdminJS dashboard loads
- [ ] Query logging works
- [ ] Analytics display correctly
- [ ] Frontend connects successfully

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u root -p -h localhost

# Check if database exists
SHOW DATABASES;
USE space_habitats_rag;
```

### Session Issues
- Clear browser cookies
- Verify SESSION_SECRET is set
- Check that express-session is installed

### AdminJS Not Loading
```bash
# Check AdminJS installation
npm list adminjs @adminjs/express @adminjs/sql

# Verify database tables exist
mysql -u root -p space_habitats_rag -e "SHOW TABLES;"
```

### Missing Dependencies
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Stop new server
# Restore old server
cp server_old_backup.js server.js

# Restore database if needed
mysql -u root -p space_habitats_rag < backup_YYYYMMDD.sql

# Start old server
node server.js
```

## 📈 Post-Migration

### Monitor Logs
```bash
# Watch server logs
npm run dev

# Watch for errors
tail -f /var/log/mysql/error.log  # MySQL errors
```

### Update Documentation
- Update README with new structure
- Document any custom changes
- Update deployment scripts

### Performance Check
- Monitor response times
- Check database query performance
- Verify memory usage

## 🎉 Success!

If all checks pass, you've successfully migrated to the MVC architecture!

### What You've Gained:
- ✅ Clean, organized codebase
- ✅ Professional admin dashboard
- ✅ Query analytics
- ✅ Better error handling
- ✅ Easier to maintain and extend
- ✅ Production-ready structure

### Next Steps:
1. Explore AdminJS features
2. Add custom admin functionality
3. Implement additional analytics
4. Consider adding tests
5. Set up CI/CD pipeline

---

Need help? Check the README.md or ask for assistance!
