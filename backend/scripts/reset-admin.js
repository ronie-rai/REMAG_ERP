import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import sql, { getConnection, closeConnection } from '../config/database.js';

dotenv.config();

const ensureUsersSchema = async (pool) => {
  await pool.request().query(`
    IF COL_LENGTH('dbo.users', 'permissions_json') IS NULL
    BEGIN
      ALTER TABLE users ADD permissions_json NVARCHAR(MAX) NULL;
    END
  `);

  await pool.request().query(`
    IF COL_LENGTH('dbo.users', 'created_at') IS NULL
    BEGIN
      ALTER TABLE users ADD created_at DATETIME NULL;
    END

    IF COL_LENGTH('dbo.users', 'updated_at') IS NULL
    BEGIN
      ALTER TABLE users ADD updated_at DATETIME NULL;
    END
  `);
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
