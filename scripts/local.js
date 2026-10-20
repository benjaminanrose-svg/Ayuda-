'use strict';
/* Corre Red Acompaña en tu computador con un Postgres incluido (sin instalar nada más).
   Uso: npm run local  →  http://localhost:3000  (panel: /equipo, admin@local / clave-local-admin) */
const path = require('path');
const fs = require('fs');
const EmbeddedPostgres = require('embedded-postgres').default;

const dir = process.env.DATOS_LOCALES || path.join(__dirname, '..', '.datos-locales');
const puertoBd = Number(process.env.PUERTO_BD || 5499);
const bd = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'local', port: puertoBd, persistent: true, onLog: () => {} });

(async () => {
  const nueva = !fs.existsSync(path.join(dir, 'PG_VERSION'));
  if (nueva) await bd.initialise();
  await bd.start();
  if (nueva) await bd.createDatabase('acompana');
  Object.assign(process.env, {
    DATABASE_URL: process.env.DATABASE_URL || `postgres://postgres:local@127.0.0.1:${puertoBd}/acompana`,
    CLAVE_DATOS: process.env.CLAVE_DATOS || 'solo-para-desarrollo-local-no-usar-en-produccion',
    ADMIN_CORREO: process.env.ADMIN_CORREO || 'admin@local',
    ADMIN_CLAVE: process.env.ADMIN_CLAVE || 'clave-local-admin'
  });
  global.antesDeSalir = () => bd.stop();
  require('../src/server');
})().catch(e => { console.error(e); process.exit(1); });
