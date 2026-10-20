'use strict';
/* Aplica una sola vez cada archivo de /migraciones, en orden. */
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

module.exports = async function migrar() {
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(727001)');
    await c.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())');
    const hechas = new Set((await c.query('select nombre from migraciones')).rows.map(r => r.nombre));
    const dir = path.join(__dirname, '..', 'migraciones');
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.sql')).sort()) {
      if (hechas.has(f)) continue;
      await c.query('begin');
      try {
        await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
        await c.query('insert into migraciones (nombre) values ($1)', [f]);
        await c.query('commit');
        console.log('[bd] migración aplicada:', f);
      } catch (e) {
        await c.query('rollback');
        throw e;
      }
    }
  } finally {
    try { await c.query('select pg_advisory_unlock(727001)'); } catch { /* ignorar */ }
    c.release();
  }
};
