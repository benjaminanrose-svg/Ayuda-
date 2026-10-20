'use strict';
/* Cifrado de textos (AES-256-GCM), claves de usuarios (scrypt) y fichas de sesión. */
const crypto = require('crypto');
const { promisify } = require('util');
const cfg = require('./config');

const scrypt = promisify(crypto.scrypt);
const OPC = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
let llave = null;
const clave = () => llave || (llave = crypto.createHash('sha256').update(cfg.claveDatos, 'utf8').digest());

function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), datos]);
}

function descifrar(b) {
  if (!b || !b.length) return '';
  if (b[0] !== 1) throw new Error('Versión de cifrado desconocida');
  const d = crypto.createDecipheriv('aes-256-gcm', clave(), b.subarray(1, 13));
  d.setAuthTag(b.subarray(13, 29));
  return Buffer.concat([d.update(b.subarray(29)), d.final()]).toString('utf8');
}

const token = () => crypto.randomBytes(32).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');

async function hashClave(texto) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(String(texto), sal, 64, OPC);
  return `scrypt$${OPC.N}$${OPC.r}$${OPC.p}$${sal.toString('base64')}$${h.toString('base64')}`;
}

async function verificarClave(texto, guardado) {
  try {
    const [alg, N, r, p, sal, h] = String(guardado).split('$');
    if (alg !== 'scrypt') return false;
    const esperado = Buffer.from(h, 'base64');
    const calc = await scrypt(String(texto), Buffer.from(sal, 'base64'), esperado.length, { N: +N, r: +r, p: +p, maxmem: OPC.maxmem });
    return crypto.timingSafeEqual(calc, esperado);
  } catch {
    return false;
  }
}

function claveTemporal() {
  const letras = 'abcdefghjkmnpqrstuvwxyz', nums = '23456789';
  const b = crypto.randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) { const set = i % 4 === 3 ? nums : letras; s += set[b[i] % set.length]; }
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

module.exports = { cifrar, descifrar, token, hashToken, hashClave, verificarClave, claveTemporal };
