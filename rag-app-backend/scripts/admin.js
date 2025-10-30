// scripts/admin.js
require('dotenv').config();
const readline = require('readline');
const pool = require('../lib/db');
const bcrypt = require('bcrypt');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (q) => new Promise(res => rl.question(q, res));

(async () => {
  const username = await prompt('Admin username: ');
  const password = await prompt('Admin password: ');

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND role = "admin"', [username]);
  if (!rows.length) {
    console.log('Access denied');
    rl.close();
    process.exit(1);
  }

  const match = await bcrypt.compare(password, rows[0].password);
  if (!match) {
    console.log('Invalid password');
    rl.close();
    process.exit(1);
  }

  console.log('Admin authenticated');
  const action = await prompt('Action (reset-db / list-users / delete-user): ');

  if (action === 'reset-db') {
    await pool.query('DROP TABLE IF EXISTS manual_chunks, processed_pdfs');
    console.log('DB reset');
  } else if (action === 'list-users') {
    const [users] = await pool.query('SELECT id, username, role, created_at FROM users');
    console.table(users);
  } else if (action === 'delete-user') {
    const target = await prompt('Username to delete: ');
    await pool.query('DELETE FROM users WHERE username = ? AND role = "user"', [target]);
    console.log('User deleted');
  }

  rl.close();
})();