'use strict';
/* Arma la aplicación web: páginas, API y manejo de errores. */
const path = require('path');
const express = require('express');
const { q } = require('./db');
const avisos = require('./avisos');
const ses = require('./sesion');
const { cabeceras, mismoOrigen, falla } = require('./http');

const PUB = path.join(__dirname, '..', 'public');
const pagina = archivo => (req, res) => res.sendFile(path.join(PUB, archivo), { headers: { 'Cache-Control': 'no-cache' } });

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cabeceras);

  app.get('/salud', async (req, res) => {
    try { await q('select 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false, error: 'Sin conexión a la base de datos' }); }
  });

  // fotos, fondos y documentos pesan más que un mensaje
  app.use(['/api/directorio/mio/foto', '/api/directorio/mio/fondo'], express.json({ limit: '1400kb' }));
  app.use('/api/directorio/mio/documentos', express.json({ limit: '6500kb' }));
  app.use('/api', express.json({ limit: '32kb' }), mismoOrigen);
  app.get('/api/push/clave', (req, res) => res.json({ clave: avisos.clavePublica() }));
  app.use('/api/persona', require('./rutas-persona'));
  app.use('/api/equipo', require('./rutas-equipo'));
  app.use('/api/directorio', require('./rutas-directorio'));
  app.use('/api/admin', ses.sesion, ses.claveAlDia, ses.soloAdmin, require('./rutas-admin'));
  app.use('/api', (req, res, next) => next(falla(404, 'No encontrado.')));

  app.get('/', pagina('directorio.html'));
  app.get('/psicologos/:slug', pagina('perfil.html'));
  app.get('/registro', pagina('registro.html'));
  app.get('/mi-perfil', pagina('mi-perfil.html'));
  app.get('/conversar', pagina('index.html'));
  app.get('/cita/:token', pagina('cita.html'));
  app.get('/o/:slug', pagina('index.html'));
  app.get('/equipo', pagina('equipo.html'));
  app.get('/ingresar', pagina('ingresar.html'));
  app.get('/privacidad', pagina('privacidad.html'));
  app.get('/sw.js', (req, res) => res.sendFile(path.join(PUB, 'sw.js'), { headers: { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' } }));
  app.use('/fuentes', express.static(path.join(PUB, 'fuentes'), { maxAge: '30d', immutable: true }));
  app.use(express.static(PUB, { index: false, maxAge: 0, extensions: ['html'] }));

  app.use((req, res) => res.status(404).type('text/plain; charset=utf-8').send('No encontrado'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El mensaje es demasiado largo.' });
    const estado = err.estado || 500;
    if (estado >= 500) console.error('[error]', req.method, req.path, err);
    res.status(estado).json({ error: estado >= 500 ? 'Ocurrió un error. Intenta de nuevo en un momento.' : err.message, ...(err.extra || {}) });
  });
  return app;
}

module.exports = { crearApp };
