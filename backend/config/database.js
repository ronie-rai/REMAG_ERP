import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use standard PG environment variables or fallback to the current DATABASE_* env vars
const poolConfig = {
  host: process.env.DATABASE_SERVER || process.env.PGHOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.PGPORT || '5432'),
  database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'ERP_DB',
  user: process.env.DATABASE_USER || process.env.PGUSER || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || '',
};

let pgPool = null;
let poolWrapper = null;

// Connection Pool Wrapper to mimic mssql connection pool behaviors
class ConnectionPoolWrapper {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  request() {
    return new Request(this);
  }

  async query(queryString, values) {
    // Translate direct queries on the pool wrapper
    const translated = translateSQL(queryString);
    // Since direct query doesn't have named parameters bound via Request,
    // this handles plain queries (like executing schema scripts).
    return this.pgPool.query(translated, values);
  }

  async connect() {
    return this.pgPool.connect();
  }

  async end() {
    return this.pgPool.end();
  }
}

export const getConnection = async () => {
  if (!pgPool) {
    pgPool = new Pool(poolConfig);
    // test connection
    const client = await pgPool.connect();
    client.release();
    console.log('Connected to PostgreSQL');
    poolWrapper = new ConnectionPoolWrapper(pgPool);
  }
  return poolWrapper;
};

export const closeConnection = async () => {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    poolWrapper = null;
    console.log('PostgreSQL connection pool closed');
  }
};

// SQL string translation function
export function translateSQL(sqlString) {
  if (!sqlString) return '';
  
  let query = sqlString;

  // Intercept SQL Server system/metadata/schema checks and return no-op
  if (/IF\s+OBJECT_ID|IF\s+COL_LENGTH|IF\s+EXISTS\s*\(SELECT\b[\s\S]*?\b(?:sys\.objects|sys\.columns|sys\.foreign_keys|sys\.indexes|sys\.check_constraints)\b/i.test(query)) {
    return 'SELECT 1;';
  }

  // 1. GETDATE() and GETUTCDATE()
  query = query.replace(/\bGETDATE\(\)/gi, 'CURRENT_TIMESTAMP');
  query = query.replace(/\bGETUTCDATE\(\)/gi, "timezone('utc', CURRENT_TIMESTAMP)");

  // 2. ISNULL to COALESCE
  query = query.replace(/\bISNULL\s*\(/gi, 'COALESCE(');

  // 3. SELECT TOP N -> LIMIT N
  let limitValue = null;
  query = query.replace(/\bSELECT\s+(DISTINCT\s+)?TOP\s+(\d+)/gi, (match, distinct, limit) => {
    limitValue = limit;
    return 'SELECT ' + (distinct || '');
  });

  // 4. OUTPUT INSERTED/DELETED -> RETURNING
  let returningClause = '';
  query = query.replace(/\bOUTPUT\s+((?:(?:INSERTED|DELETED)\.[a-zA-Z0-9_*]+(?:\s*,\s*)?)+)/gi, (match, p1) => {
    const fields = p1.replace(/(?:INSERTED|DELETED)\./gi, '');
    returningClause = ` RETURNING ${fields}`;
    return '';
  });

  query = query.replace(/\bOUTPUT\s+(?:INSERTED|DELETED)\.\*/gi, () => {
    returningClause = ' RETURNING *';
    return '';
  });

  if (returningClause) {
    if (query.trim().endsWith(';')) {
      query = query.trim().slice(0, -1) + returningClause + ';';
    } else {
      query = query + returningClause;
    }
  }

  if (limitValue !== null) {
    if (query.trim().endsWith(';')) {
      query = query.trim().slice(0, -1) + ` LIMIT ${limitValue};`;
    } else {
      query = query + ` LIMIT ${limitValue}`;
    }
  }

  return query;
}

// Mock Request class mimicking mssql Request
class Request {
  constructor(connection) {
    this.connection = connection; // can be the poolWrapper or a Transaction instance
    this.parameters = {};
  }

  input(name, type, value) {
    const val = value === undefined ? null : value;
    this.parameters[name] = { type, value: val };
    return this;
  }

  async query(queryString) {
    // Translate SQL syntax
    let translatedQuery = translateSQL(queryString);

    // If query was intercepted as no-op, just return empty recordset
    if (translatedQuery === 'SELECT 1;') {
      return {
        recordset: [],
        recordsets: [[]],
        rowsAffected: [0],
        output: {}
      };
    }

    // Map named parameters @param to PG positional parameters $1, $2, etc.
    const inputParamNames = Object.keys(this.parameters);
    inputParamNames.sort((a, b) => b.length - a.length);

    const values = [];
    let placeholderCounter = 1;
    const nameToPlaceholder = {};

    for (const paramName of inputParamNames) {
      const regex = new RegExp('@' + paramName + '\\b', 'g');
      if (regex.test(translatedQuery)) {
        if (!nameToPlaceholder[paramName]) {
          nameToPlaceholder[paramName] = '$' + placeholderCounter;
          values.push(this.parameters[paramName].value);
          placeholderCounter++;
        }
        translatedQuery = translatedQuery.replace(regex, nameToPlaceholder[paramName]);
      }
    }

    // Determine execution client
    let execClient;
    if (this.connection && this.connection.client) {
      // Within transaction
      execClient = this.connection.client;
    } else {
      // Standard pool execution
      const conn = poolWrapper || (await getConnection());
      execClient = conn.pgPool;
    }

    let result;
    try {
      result = await execClient.query(translatedQuery, values);
    } catch (err) {
      console.error('Database query error:', err.message);
      console.error('Query:', translatedQuery);
      console.error('Values:', values);
      throw err;
    }

    const rows = result.rows || [];
    return {
      recordset: rows,
      recordsets: [rows],
      rowsAffected: [result.rowCount],
      output: {}
    };
  }
}

// Mock Transaction class mimicking mssql Transaction
class Transaction {
  constructor(connection) {
    this.poolWrapper = connection; // connection is the poolWrapper
    this.client = null;
  }

  async begin() {
    const conn = poolWrapper || (await getConnection());
    this.client = await conn.pgPool.connect();
    await this.client.query('BEGIN');
    return this;
  }

  async commit() {
    if (!this.client) throw new Error('Transaction has not begun');
    try {
      await this.client.query('COMMIT');
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  async rollback() {
    if (!this.client) throw new Error('Transaction has not begun');
    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.client.release();
      this.client = null;
    }
  }
}

// Mock the sql object exported by mssql
const sql = {
  Request,
  Transaction,
  Int: 'INT',
  VarChar: (len) => `VARCHAR(${len})`,
  NVarChar: (len) => `NVARCHAR(${len})`,
  Decimal: (precision, scale) => `DECIMAL(${precision},${scale})`,
  Float: 'FLOAT',
  Date: 'DATE',
  DateTime: 'DATETIME',
  Bit: 'BOOLEAN',
  Text: 'TEXT',
  MAX: 'MAX',
  getConnection,
  closeConnection
};

export default sql;
