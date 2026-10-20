'use strict';
/* Notificaciones push del navegador (Web Push). Las llaves VAPID se generan una vez y quedan en la base de datos. */
const webpush = require('web-push');
const { q } = require('./db');
const cfg = require('./config');
const { falla } = require('./http');

const SERVICIOS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/;
let publica = null;

async function iniciar() {
  const leer = async () => (await q("select valor from ajustes where clave = 'vapid'")).rows[0];
  let r = await leer();
  if (!r) {
    await q("insert into ajustes (clave, valor) values ('vapid', $1) on conflict (clave) do nothing", [webpush.generateVAPIDKeys()]);
    r = await leer();
  }
  publica = r.valor.publicKey;
  webpush.setVapidDetails(cfg.adminCorreo ? 'mailto:' + cfg.adminCorreo : cfg.urlApp, r.valor.publicKey, r.valor.privateKey);
}

async function enviar(filas, datos) {
  await Promise.all(filas.map(async f => {
    try {
      await webpush.sendNotification(f.datos, JSON.stringify(datos), { TTL: 3600, urgency: datos.urgente ? 'high' : 'normal' });
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await q('delete from suscripciones where endpoint = $1', [f.endpoint]);
      else console.error('[avisos] no se pudo enviar:', e.statusCode || e.message);
    }
  }));
}

async function aUsuarios(ids, datos) {
  const lista = ids.filter(Boolean);
  if (!lista.length) return;
  await enviar((await q('select endpoint, datos from suscripciones where usuario_id = any($1::int[])', [lista])).rows, datos);
}

async function aConversacion(convId, datos) {
  await enviar((await q('select endpoint, datos from suscripciones where conversacion_id = $1', [convId])).rows, datos);
}

async function guardar(s, { usuarioId = null, conversacionId = null }) {
  let host = '';
  try { host = new URL(s.endpoint).host; } catch { /* inválido */ }
  if (!s || !/^https:\/\//.test(s.endpoint || '') || !SERVICIOS.test(host) || !s.keys || !s.keys.p256dh || !s.keys.auth) throw falla(400, 'Suscripción de avisos inválida.');
  const datos = { endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) } };
  await q(`insert into suscripciones (endpoint, usuario_id, conversacion_id, datos) values ($1, $2, $3, $4)
           on conflict (endpoint) do update set usuario_id = excluded.usuario_id, conversacion_id = excluded.conversacion_id, datos = excluded.datos`,
  [datos.endpoint, usuarioId, conversacionId, datos]);
}

module.exports = { iniciar, clavePublica: () => publica, aUsuarios, aConversacion, guardar };
