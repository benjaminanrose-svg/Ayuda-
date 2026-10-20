'use strict';
/* Cabeceras de seguridad, verificación de origen (contra CSRF) y límites de uso en memoria. */
const config = require('./config');

const CSP_APP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "font-src 'self'", "img-src 'self' data:",
  "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"
].join('; ');
// la demo para presentaciones es una sola página con scripts y estilos en línea
const CSP_DEMO = CSP_APP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");

function cabeceras(req, res, next) {
  res.setHeader('Content-Security-Policy', req.path.startsWith('/demo') ? CSP_DEMO : CSP_APP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.prod) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/* Las peticiones que cambian algo deben venir de esta misma página: el Origin (o el Referer) debe coincidir con el host. */
function mismoOrigen(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.headers.origin || req.headers.referer;
  let ok = false;
  try { ok = !!origen && new URL(origen).host === req.headers.host; } catch { ok = false; }
  if (!ok) return res.status(403).json({ error: 'Origen no permitido.' });
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return res.status(415).json({ error: 'Se esperaba JSON.' });
  next();
}

/* Ventanas fijas en memoria. Para varias réplicas, cambiar por Redis o por la base. */
const cubos = new Map();
setInterval(() => { const ahora = Date.now(); for (const [k, v] of cubos) if (v.fin < ahora) cubos.delete(k); }, 60e3).unref();

function permitir(clave, maximo, ventanaSeg) {
  const ahora = Date.now();
  let c = cubos.get(clave);
  if (!c || c.fin < ahora) { c = { n: 0, fin: ahora + ventanaSeg * 1000 }; cubos.set(clave, c); }
  c.n++;
  return c.n <= maximo;
}

function limite(nombre, maximo, ventanaSeg, claveFn) {
  return (req, res, next) => {
    const k = nombre + ':' + (claveFn ? claveFn(req) : req.ip);
    if (!permitir(k, maximo, ventanaSeg)) return res.status(429).json({ error: 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.' });
    next();
  };
}

module.exports = { cabeceras, mismoOrigen, limite, permitir };
