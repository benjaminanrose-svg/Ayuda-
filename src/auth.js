'use strict';
/* Claves (scrypt), sesiones del equipo y token anónimo de la persona, ambos en cookies httpOnly. */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('./config');
const db = require('./db');

const scrypt = promisify(crypto.scrypt);
const N = 16384, R = 8, P = 1, LARGO = 64;

async function hashClave(clave) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(clave, sal, LARGO, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, R, P, sal.toString('base64'), h.toString('base64')].join('$');
}

async function verificarClave(clave, guardado) {
  const [alg, n, r, p, sal, hash] = String(guardado).split('$');
  if (alg !== 'scrypt') return false;
  const esperado = Buffer.from(hash, 'base64');
  const h = await scrypt(String(clave), Buffer.from(sal, 'base64'), esperado.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(h, esperado);
}

const token = () => crypto.randomBytes(32).toString('base64url');
const sha = t => crypto.createHash('sha256').update(String(t)).digest();
const claveTemporal = () => crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x');

function leerCookies(req) {
  const out = {};
  for (const par of String(req.headers.cookie || '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0) out[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  }
  return out;
}

function ponerCookie(res, nombre, valor, maxAgeSeg) {
  const partes = [`${nombre}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeg}`];
  if (config.prod) partes.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [].concat(prev || [], partes.join('; ')));
}

const COOKIE_EQUIPO = 'ra_sesion', COOKIE_PERSONA = 'ra_conv';

async function crearSesion(res, usuarioId) {
  const t = token();
  const horas = config.sesionHoras;
  await db.q("insert into sesiones (token_hash, usuario_id, expira_en) values ($1, $2, now() + make_interval(hours => $3))", [sha(t), usuarioId, horas]);
  await db.q('update usuarios set ultimo_acceso = now() where id = $1', [usuarioId]);
  ponerCookie(res, COOKIE_EQUIPO, t, horas * 3600);
}

async function cerrarSesion(req, res) {
  const t = leerCookies(req)[COOKIE_EQUIPO];
  if (t) await db.q('delete from sesiones where token_hash = $1', [sha(t)]);
  ponerCookie(res, COOKIE_EQUIPO, '', 0);
}

async function usuarioDeSesion(req) {
  const t = leerCookies(req)[COOKIE_EQUIPO];
  if (!t) return null;
  const r = await db.q(`select u.*, s.expira_en from sesiones s join usuarios u on u.id = s.usuario_id
                        where s.token_hash = $1 and s.expira_en > now() and u.activo`, [sha(t)]);
  const u = r.rows[0];
  if (!u) return null;
  // la sesión se renueva sola mientras se usa
  if (new Date(u.expira_en) - Date.now() < (config.sesionHoras * 3600e3) / 2) {
    await db.q("update sesiones set expira_en = now() + make_interval(hours => $2) where token_hash = $1", [sha(t), config.sesionHoras]);
  }
  return u;
}

function requiereEquipo(opciones = {}) {
  return async (req, res, next) => {
    const u = await usuarioDeSesion(req);
    if (!u) return res.status(401).json({ error: 'Tu sesión terminó. Vuelve a ingresar.' });
    if (u.debe_cambiar_clave && !opciones.permitirCambioPendiente) return res.status(403).json({ error: 'Debes cambiar tu clave temporal.', cambiarClave: true });
    if (opciones.admin && u.rol !== 'admin') return res.status(403).json({ error: 'Solo para administración.' });
    req.usuario = u;
    next();
  };
}

module.exports = {
  hashClave, verificarClave, token, sha, claveTemporal, leerCookies, ponerCookie,
  crearSesion, cerrarSesion, usuarioDeSesion, requiereEquipo, COOKIE_PERSONA
};
