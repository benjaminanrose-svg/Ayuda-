'use strict';
/* API del panel del especialista. */
const express = require('express');
const { q } = require('./db');
const svc = require('./servicio');
const tr = require('./tiempo-real');
const avisos = require('./avisos');
const ses = require('./sesion');
const { falla, limitador } = require('./http');

const r = express.Router();
const idDe = req => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) throw falla(400, 'Caso inválido.');
  return id;
};

r.post('/ingresar', limitador(8, 15 * 60e3, req => req.ip + '|' + String((req.body && req.body.correo) || '').toLowerCase()), async (req, res) => {
  const u = await ses.ingresar(req, res);
  res.json({ usuario: ses.usuarioPublico(u) });
});

r.get('/estado', async (req, res) => {
  const s = await ses.usuarioDeSesion(req);
  res.json({ sesion: !!s, debeCambiarClave: !!(s && s.r.debe_cambiar_clave) });
});

r.use(ses.sesion);
r.post('/salir', async (req, res) => { await ses.salir(req, res); res.json({ ok: true }); });
r.get('/yo', (req, res) => res.json({ usuario: ses.usuarioPublico(req.usuario), clavePush: avisos.clavePublica() }));
r.post('/clave', limitador(10, 15 * 60e3, req => 'clave|' + req.usuario.id), async (req, res) => { await ses.cambiarClave(req); res.json({ ok: true }); });

r.use(ses.claveAlDia);
r.post('/disponible', async (req, res) => {
  const d = !!(req.body && req.body.disponible);
  await q('update usuarios set disponible = $2 where id = $1', [req.usuario.id, d]);
  await svc.auditar({ query: q }, req.usuario.id, d ? 'disponible' : 'no disponible');
  res.json({ disponible: d });
});
r.get('/casos', async (req, res) => res.json({ casos: await svc.listarCasos(req.usuario) }));
r.get('/casos/:id', async (req, res) => res.json(await svc.detalleCaso(req.usuario, idDe(req))));
r.post('/casos/:id/tomar', async (req, res) => res.json({ caso: await svc.tomar(req.usuario, idDe(req)) }));
r.post('/casos/:id/agendar', async (req, res) => res.json({ caso: await svc.agendar(req.usuario, idDe(req), req.body && req.body.para) }));
r.post('/casos/:id/derivar', async (req, res) => res.json({ caso: await svc.derivar(req.usuario, idDe(req)) }));
r.post('/casos/:id/cerrar', async (req, res) => res.json({ caso: await svc.cerrar(req.usuario, idDe(req), req.body && req.body.nota) }));
r.post('/casos/:id/mensajes', limitador(60, 60e3, req => 'esp|' + req.usuario.id), async (req, res) =>
  res.json({ mensaje: await svc.mensajeEspecialista(req.usuario, idDe(req), req.body && req.body.texto) }));
r.post('/casos/:id/videollamada', limitador(10, 60e3, req => 'video|' + req.usuario.id), async (req, res) =>
  res.json({ mensaje: await svc.videollamada(req.usuario, idDe(req)) }));
r.get('/stream', (req, res) => tr.abrirEquipo(req, res, req.usuario.id));
r.post('/push', async (req, res) => {
  await avisos.guardar(req.body && req.body.suscripcion, { usuarioId: req.usuario.id });
  res.json({ ok: true });
});

module.exports = r;
