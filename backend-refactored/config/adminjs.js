// config/adminjs.js
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sql');
const pool = require('./database');

// Register SQL adapter
AdminJS.registerAdapter({
  Database: AdminJSSequelize.Database,
  Resource: AdminJSSequelize.Resource,
});

/**
 * Setup AdminJS
 */
const setupAdminJS = async (app) => {
  // Create AdminJS instance
  const adminJs = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'Space Habitats RAG',
      logo: false,
      softwareBrothers: false,
    },
    databases: [],
    resources: [
      {
        resource: { 
          model: 'users',
          client: pool 
        },
        options: {
          properties: {
            password: {
              isVisible: { list: false, filter: false, show: false, edit: true },
              type: 'password',
            },
            created_at: {
              isVisible: { list: true, filter: true, show: true, edit: false },
            },
          },
          actions: {
            delete: {
              before: async (request, context) => {
                // Prevent deletion of last admin
                const [admins] = await pool.query(
                  'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
                );
                
                if (admins[0].count <= 1) {
                  const [user] = await pool.query(
                    'SELECT role FROM users WHERE id = ?',
                    [request.params.recordId]
                  );
                  
                  if (user[0]?.role === 'admin') {
                    throw new Error('Cannot delete the last admin user');
                  }
                }
                
                return request;
              },
            },
          },
        },
      },
      {
        resource: { 
          model: 'query_log',
          client: pool 
        },
        options: {
          properties: {
            user_id: {
              reference: 'users',
            },
            created_at: {
              isVisible: { list: true, filter: true, show: true, edit: false },
            },
          },
          actions: {
            new: { isAccessible: false },
            edit: { isAccessible: false },
            delete: { isAccessible: true },
          },
        },
      },
    ],
  });

  // Build authentication
  const adminRouter = AdminJSExpress.buildRouter(adminJs);

  // Mount AdminJS
  app.use(adminJs.options.rootPath, adminRouter);

  console.log(`✅ AdminJS available at http://localhost:5000${adminJs.options.rootPath}`);

  return adminJs;
};

module.exports = setupAdminJS;
