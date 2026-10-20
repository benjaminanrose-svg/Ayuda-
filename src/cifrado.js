'use strict';
/* Cifrado AES-256-GCM del texto libre. Formato: [versión=1][id de clave][iv 12][tag 16][texto cifrado].
   Clave 2: DATA_KEY de las variables de entorno (recomendada). Clave 1: generada y guardada en la base la primera vez,
   para que la app funcione aunque DATA_KEY no esté configurada todavía. Lo cifrado con una clave sigue legible con ella. */
const crypto = require('node:crypto');
const config = require('./config');

const claves = new Map();
let actual = null;

async function iniciar(db) {
  const r = await db.q("select valor from ajustes where clave = 'clave_datos'");
  let base = r.rows[0] && r.rows[0].valor;
  if (!base) {
    base = crypto.randomBytes(32).toString('base64');
    await db.q("insert into ajustes (clave, valor) values ('clave_datos', $1) on conflict (clave) do nothing", [base]);
    base = (await db.q("select valor from ajustes where clave = 'clave_datos'")).rows[0].valor;
  }
  claves.set(1, Buffer.from(base, 'base64'));
  actual = 1;
  if (config.dataKey) {
    const k = Buffer.from(config.dataKey, 'base64');
    if (k.length !== 32) throw new Error('DATA_KEY debe ser de 32 bytes en base64 (genera una con: npm run claves).');
    claves.set(2, k);
    actual = 2;
  } else {
    console.warn('[cifrado] DATA_KEY no está configurada: se usa la clave guardada en la base. Configúrala en producción (npm run claves).');
  }
}

function cifrar(texto) {
  const id = actual, iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', claves.get(id), iv);
  const ct = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return Buffer.concat([Buffer.from([1, id]), iv, c.getAuthTag(), ct]);
}

function descifrar(buf) {
  if (!buf) return '';
  const id = buf[1], k = claves.get(id);
  if (buf[0] !== 1 || !k) throw new Error('No hay clave para descifrar este dato (id ' + id + ').');
  const d = crypto.createDecipheriv('aes-256-gcm', k, buf.subarray(2, 14));
  d.setAuthTag(buf.subarray(14, 30));
  return Buffer.concat([d.update(buf.subarray(30)), d.final()]).toString('utf8');
}

const usaClaveDeEntorno = () => actual === 2;

module.exports = { iniciar, cifrar, descifrar, usaClaveDeEntorno };
