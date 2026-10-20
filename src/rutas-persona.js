'use strict';
/* API pública de la persona. La conversación se identifica con una cookie httpOnly (sin datos personales). */
const express = require('express');
const E = require('../motor/engine.js');
const { q } = require('./db');
const cfg = require('./config');
const svc = require('./servicio');
const tr = require('./tiempo-real');
const avisos = require('./avisos');
const { token, hashToken } = require('./cifrado');
const { leerCookies, ponerCookie, falla, crearLimite, limitador } = require('./http');

const r = express.Router();
const COOKIE = 'ra_conv';
const DIAS = 30;
const SLUG = /^[a-z0-9-]{2,40}$/;
const porConversacion = crearLimite(20, 60e3);
const nuevasPorIp = crearLimite(15, 3600e3);

async function conversacion(req) {
  const t = leerCookies(req)[COOKIE];
  if (!t) return null;
  return (await q('select id, organizacion_id from conversaciones where token_hash = $1', [hashToken(t)])).rows[0] || null;
}

r.get('/inicio', async (req, res) => {
  const cv = await conversacion(req);
  if (cv) {
    const h = await svc.historiaPersona(cv.id);
    if (h) return res.json({ conversacion: true, ...h });
  }
  const s = E.create().start();
  res.json({ conversacion: false, mensajes: s.replies.map((t, i) => ({ id: 'i' + i, autor: 'bot', tipo: 'texto', texto: t })), chips: s.chips, crisis: null, caso: { paso: 'escuchando' } });
});

r.post('/mensajes', limitador(40, 60e3, req => req.ip), async (req, res) => {
  const texto = String((req.body && req.body.texto) || '').trim().slice(0, 2000);
  if (!texto) throw falla(400, 'Escribe un mensaje.');
  let cv = await conversacion(req);
  if (!cv) {
    if (!nuevasPorIp(req.ip)) throw falla(429, 'Demasiadas conversaciones nuevas desde esta conexión. Intenta más tarde.');
    const slug = String((req.body && req.body.org) || '');
    const org = (await q('select id from organizaciones where slug = $1 and activa', [SLUG.test(slug) ? slug : cfg.orgPorDefecto])).rows[0]
      || (await q('select id from organizaciones where slug = $1', [cfg.orgPorDefecto])).rows[0];
    const t = token();
    cv = { id: await svc.nuevaConversacion(hashToken(t), org ? org.id : null) };
    ponerCookie(res, req, COOKIE, t, DIAS * 86400);
  }
  if (!porConversacion(cv.id)) throw falla(429, 'Vas muy rápido. Espera unos segundos y vuelve a escribir.');
  res.json(await svc.mensajePersona(cv.id, texto));
});

r.get('/stream', async (req, res) => {
  const cv = await conversacion(req);
  if (!cv) return res.status(204).end();
  tr.abrirPersona(req, res, cv.id);
});

r.post('/push', async (req, res) => {
  const cv = await conversacion(req);
  if (!cv) throw falla(400, 'Primero escribe un mensaje.');
  await avisos.guardar(req.body && req.body.suscripcion, { conversacionId: cv.id });
  res.json({ ok: true });
});

r.post('/olvidar', (req, res) => {
  ponerCookie(res, req, COOKIE, '', 0);
  res.json({ ok: true });
});

module.exports = r;
