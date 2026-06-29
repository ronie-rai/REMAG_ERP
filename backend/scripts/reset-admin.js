import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sql, { getConnection, closeConnection } from '../config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureUsersSchema = async (pool) => {
  const schemaPath = path.join(__dirname, 'create-tables-pg.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Initializing PostgreSQL database schema in reset-admin script...');
  await pool.query(schemaSql);
  console.log('Schema initialized successfully.');
};

const run = async () => {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const role = process.env.DEFAULT_ADMIN_ROLE || 'chairman';

  const pool = await getConnection();
  await ensureUsersSchema(pool);

  const password_hash = await bcrypt.hash(password, 10);

  const existing = await pool.request()
    .input('username', sql.VarChar(100), username)
    .query('SELECT id FROM users WHERE username = @username');

  if (existing.recordset.length === 0) {
    await pool.request()
      .input('username', sql.VarChar(100), username)
      .input('password_hash', sql.VarChar(255), password_hash)
      .input('role', sql.VarChar(50), role)
      .input('permissions_json', sql.NVarChar(sql.MAX), null)
      .query(`INSERT INTO users (username, password_hash, role, permissions_json, created_at, updated_at)
              VALUES (@username, @password_hash, @role, @permissions_json, GETDATE(), GETDATE())`);

    console.log(`Admin user created: username="${username}", role="${role}"`);
  } else {
    await pool.request()
      .input('username', sql.VarChar(100), username)
      .input('password_hash', sql.VarChar(255), password_hash)
      .input('role', sql.VarChar(50), role)
      .query(`UPDATE users
              SET password_hash = @password_hash,
                  role = @role,
                  updated_at = GETDATE()
              WHERE username = @username`);

    console.log(`Admin user updated: username="${username}", role="${role}"`);
  }

  await closeConnection();
};

run().catch(async (err) => {
  console.error('Failed to reset admin user:', err);
  try {
    await closeConnection();
  } catch {
    // ignore
  }
  process.exit(1);
});
