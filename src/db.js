'use strict';
const { Pool } = require('pg');
const config = require('./config');

if (!config.databaseUrl) {
  console.error('Falta DATABASE_URL. En Railway agrega una base PostgreSQL y crea la variable DATABASE_URL = ${{Postgres.DATABASE_URL}}.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: config.pgSsl ? { rejectUnauthorized: false } : undefined
});
pool.on('error', e => console.error('[db] error en conexión inactiva:', e.message));

const q = (text, params) => pool.query(text, params);

async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { pool, q, tx };
