'use strict';
/* Arranque: revisa variables, aplica migraciones, prepara avisos y abre el servidor. */
process.env.TZ = process.env.TZ || 'America/Santiago';
const path = require('path');
const express = require('express');
const cfg = require('./config');

const faltan = [];
if (!cfg.baseDatos) faltan.push({ variable: 'DATABASE_URL', que: 'la conexión a Postgres. En Railway escribe ${{Postgres.DATABASE_URL}}' });
if (cfg.claveDatos.length < 32) faltan.push({ variable: 'CLAVE_DATOS', que: 'una frase secreta larga (32 caracteres o más) para cifrar las conversaciones. No la pierdas ni la cambies después' });

function modoConfiguracion(lista) {
  const app = express();
  const esc = s => String(s).replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[c]);
  app.get('/salud', (req, res) => res.json({ ok: false, faltan: lista.map(x => x.variable) }));
  app.use('/demo', express.static(path.join(__dirname, '..', 'public', 'demo')));
  app.use((req, res) => res.type('html').send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ConténMente · configuración</title>
<body style="font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#222B3B"><h1 style="color:#30486C">Falta configurar ConténMente</h1>
<p>Agrega estas variables en Railway (servicio de la app → <b>Variables</b>) y vuelve a desplegar:</p><ul>${lista.map(x => `<li><b>${esc(x.variable)}</b>: ${esc(x.que)}.</li>`).join('')}</ul>
<p>Mientras tanto puedes ver la <a href="/demo/">demo</a>.</p></body></html>`));
  app.listen(cfg.puerto, '0.0.0.0', () => console.log(`[inicio] modo configuración en el puerto ${cfg.puerto}. Faltan: ${lista.map(x => x.variable).join(', ')}`));
}

async function iniciar() {
  const migrar = require('./migrar');
  const avisos = require('./avisos');
  const ses = require('./sesion');
  const svc = require('./servicio');
  const tr = require('./tiempo-real');
  const { pool } = require('./db');
  const { crearApp } = require('./app');

  await migrar();
  await avisos.iniciar();
  if (!(await ses.adminInicial(cfg))) console.warn('[inicio] aún no hay cuentas: agrega ADMIN_CORREO y ADMIN_CLAVE en Railway para crear la primera.');

  const srv = crearApp().listen(cfg.puerto, '0.0.0.0', () => console.log(`[inicio] ConténMente lista en el puerto ${cfg.puerto}`));

  let ocupado = false, ultimaLimpieza = 0;
  const ciclo = async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      await svc.escalar();
      await svc.sinRespuesta();
      await svc.recordatorios();
      if (Date.now() - ultimaLimpieza > 3600e3) { ultimaLimpieza = Date.now(); await svc.limpieza(); }
    } catch (e) {
      console.error('[trabajos]', e.message);
    } finally {
      ocupado = false;
    }
  };
  const reloj = setInterval(ciclo, 5000);

  const apagar = () => {
    console.log('[apagado] cerrando…');
    clearInterval(reloj);
    tr.cerrarTodo();
    srv.close(() => pool.end().then(() => (global.antesDeSalir ? global.antesDeSalir() : null)).finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', apagar);
  process.on('SIGINT', apagar);
}

if (faltan.length) modoConfiguracion(faltan);
else iniciar().catch(e => { console.error('[inicio] no se pudo arrancar:', e.message); process.exit(1); });
