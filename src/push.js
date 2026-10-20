'use strict';
/* Avisos del navegador (Web Push). Las claves VAPID salen de las variables de entorno o se generan una vez y quedan en la base.
   Los avisos nunca llevan el contenido de la conversación: solo folio y prioridad. */
const webpush = require('web-push');
const config = require('./config');
const db = require('./db');

let listo = false, publica = '';

async function iniciar() {
  let pub = config.vapid.publica, priv = config.vapid.privada;
  if (!pub || !priv) {
    const r = await db.q("select clave, valor from ajustes where clave in ('vapid_publica', 'vapid_privada')");
    const a = Object.fromEntries(r.rows.map(x => [x.clave, x.valor]));
    if (a.vapid_publica && a.vapid_privada) { pub = a.vapid_publica; priv = a.vapid_privada; }
    else {
      const k = webpush.generateVAPIDKeys();
      await db.q("insert into ajustes (clave, valor) values ('vapid_publica', $1), ('vapid_privada', $2) on conflict (clave) do nothing", [k.publicKey, k.privateKey]);
      const r2 = await db.q("select clave, valor from ajustes where clave in ('vapid_publica', 'vapid_privada')");
      const b = Object.fromEntries(r2.rows.map(x => [x.clave, x.valor]));
      pub = b.vapid_publica; priv = b.vapid_privada;
    }
  }
  webpush.setVapidDetails(config.vapid.contacto, pub, priv);
  publica = pub; listo = true;
}

const clavePublica = () => publica;

async function guardar(sub, { usuarioId = null, conversacionId = null }) {
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw Object.assign(new Error('Suscripción inválida.'), { status: 400 });
  await db.q(`insert into suscripciones_push (endpoint, p256dh, auth, usuario_id, conversacion_id) values ($1, $2, $3, $4, $5)
              on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, usuario_id = excluded.usuario_id, conversacion_id = excluded.conversacion_id`,
  [sub.endpoint.slice(0, 1000), String(sub.keys.p256dh).slice(0, 200), String(sub.keys.auth).slice(0, 100), usuarioId, conversacionId]);
}

async function enviarA(filas, aviso) {
  if (!listo || !filas.length) return 0;
  const payload = JSON.stringify(aviso);
  let n = 0;
  await Promise.all(filas.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: aviso.urgente ? 'high' : 'normal' });
      n++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await db.q('delete from suscripciones_push where endpoint = $1', [s.endpoint]);
      else console.warn('[push] no se pudo enviar:', e.statusCode || e.message);
    }
  }));
  return n;
}

async function aUsuarios(ids, aviso) {
  if (!ids.length) return 0;
  const r = await db.q('select endpoint, p256dh, auth from suscripciones_push where usuario_id = any($1::int[])', [ids]);
  return enviarA(r.rows, aviso);
}

async function aConversacion(id, aviso) {
  const r = await db.q('select endpoint, p256dh, auth from suscripciones_push where conversacion_id = $1', [id]);
  return enviarA(r.rows, aviso);
}

async function tieneSuscripcion(conversacionId) {
  const r = await db.q('select 1 from suscripciones_push where conversacion_id = $1 limit 1', [conversacionId]);
  return r.rowCount > 0;
}

module.exports = { iniciar, clavePublica, guardar, aUsuarios, aConversacion, tieneSuscripcion };
