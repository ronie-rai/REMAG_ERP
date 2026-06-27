import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DATABASE_SERVER || 'localhost',
  database: process.env.DATABASE_NAME || 'ERP_DB',
  user: process.env.DATABASE_USER || 'sa',
  password: process.env.DATABASE_PASSWORD || '',
  port: parseInt(process.env.DATABASE_PORT || '1433'),
  options: {
    encrypt: false, // Use true for Azure
    trustServerCertificate: true, // Use true for local dev
    enableArithAbort: true
  }
};

let pool = null;

export const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

export default sql;

