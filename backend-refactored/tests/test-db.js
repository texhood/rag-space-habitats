require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Database connection successful!');
    
    const [rows] = await connection.query('SELECT DATABASE() as db');
    console.log('Connected to database:', rows[0].db);
    
    await connection.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Details:', err);
  }
}

testConnection();