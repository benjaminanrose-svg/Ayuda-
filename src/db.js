'use strict';
const { Pool } = require('pg');
const cfg = require('./config');

const pool = new Pool({ connectionString: cfg.baseDatos, max: 10, idleTimeoutMillis: 30000 });
pool.on('error', e => console.error('[bd] error en una conexión inactiva:', e.message));

const q = (texto, params) => pool.query(texto, params);

async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    try { await c.query('rollback'); } catch { /* conexión caída */ }
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { pool, q, tx };
