'use strict';
/* Aplica en orden los archivos de /migraciones que aún no se han aplicado. Usa un candado para no correr dos veces a la vez. */
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./db');

const DIR = path.join(__dirname, '..', 'migraciones');

async function migrar() {
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(727001)');
    await c.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())');
    const hechas = new Set((await c.query('select nombre from migraciones')).rows.map(r => r.nombre));
    const archivos = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
    for (const f of archivos) {
      if (hechas.has(f)) continue;
      const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
      await c.query('BEGIN');
      try {
        await c.query(sql);
        await c.query('insert into migraciones (nombre) values ($1)', [f]);
        await c.query('COMMIT');
        console.log('[migración] aplicada', f);
      } catch (e) {
        await c.query('ROLLBACK');
        throw new Error(`La migración ${f} falló: ${e.message}`);
      }
    }
  } finally {
    await c.query('select pg_advisory_unlock(727001)').catch(() => {});
    c.release();
  }
}

module.exports = { migrar };

if (require.main === module) {
  migrar().then(() => { console.log('Migraciones al día.'); return pool.end(); }).catch(e => { console.error(e.message); process.exit(1); });
}
