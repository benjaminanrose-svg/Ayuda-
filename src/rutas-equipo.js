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
  const pf = s ? (await q('select slug from perfiles where usuario_id = $1', [s.r.id])).rows[0] : null;
  res.json({ sesion: !!s, debeCambiarClave: !!(s && s.r.debe_cambiar_clave), correo: s ? s.r.correo : null, rol: s ? s.r.rol : null, slug: pf ? pf.slug : null });
});

/* «¿Olvidaste tu clave?»: avisa a administración; la respuesta es siempre igual para no revelar qué correos existen */
r.post('/olvide-clave', limitador(5, 3600e3, req => 'olvide|' + req.ip), async (req, res) => {
  const correo = String((req.body && req.body.correo) || '').trim().toLowerCase().slice(0, 200);
  const u = correo ? (await q('update usuarios set pide_clave_en = now() where correo = $1 and activo returning id, nombre, titulo', [correo])).rows[0] : null;
  if (u) {
    await q('insert into auditoria (usuario_id, accion) values ($1, $2)', [u.id, 'pidió nueva clave']);
    const admins = (await q("select id from usuarios where rol = 'admin' and activo")).rows.map(x => x.id);
    avisos.aUsuarios(admins, { titulo: 'ConténMente', cuerpo: [u.titulo, u.nombre].filter(Boolean).join(' ') + ' olvidó su clave y pide una nueva.', url: '/equipo#admin', etiqueta: 'clave' }).catch(() => {});
  }
  res.json({ ok: true });
});

r.use(ses.sesion);
r.post('/salir', async (req, res) => { await ses.salir(req, res); res.json({ ok: true }); });
r.get('/yo', (req, res) => res.json({ usuario: ses.usuarioPublico(req.usuario), clavePush: avisos.clavePublica() }));
r.post('/clave', limitador(10, 15 * 60e3, req => 'clave|' + req.usuario.id), async (req, res) => { await ses.cambiarClave(req); res.json({ ok: true }); });

r.use(ses.claveAlDia);
// las cuentas solo de directorio no entran al panel de casos
r.use((req, res, next) => (req.usuario.rol === 'psicologo' && req.path !== '/push' ? next(falla(403, 'Tu cuenta es solo para el directorio.', { directorio: true })) : next()));
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
