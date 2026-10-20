'use strict';
/* Utilidades HTTP: cookies, errores, límites de uso y cabeceras de seguridad. */

function leerCookies(req) {
  const out = {};
  for (const p of (req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch { /* ignorar */ } }
  }
  return out;
}

function ponerCookie(res, req, nombre, valor, segundos) {
  const partes = [`${nombre}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.max(0, segundos | 0)}`];
  if (req.secure) partes.push('Secure');
  res.append('Set-Cookie', partes.join('; '));
}

const falla = (estado, mensaje, extra) => Object.assign(new Error(mensaje), { estado, extra });

function crearLimite(max, ventanaMs) {
  const mapa = new Map();
  setInterval(() => { const ahora = Date.now(); for (const [k, v] of mapa) if (v.hasta < ahora) mapa.delete(k); }, ventanaMs).unref();
  return clave => {
    const ahora = Date.now();
    let v = mapa.get(clave);
    if (!v || v.hasta < ahora) { v = { n: 0, hasta: ahora + ventanaMs }; mapa.set(clave, v); }
    v.n++;
    return v.n <= max;
  };
}

function limitador(max, ventanaMs, clave) {
  const permitir = crearLimite(max, ventanaMs);
  return (req, res, next) => (permitir(clave(req)) ? next() : next(falla(429, 'Demasiados intentos. Espera un momento y vuelve a probar.')));
}

/* Peticiones que cambian datos: solo JSON y solo desde este mismo sitio. */
function mismoOrigen(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.get('origin');
  if (origen) {
    let host = null;
    try { host = new URL(origen).host; } catch { /* inválido */ }
    if (host !== req.get('host')) return next(falla(403, 'Origen no permitido.'));
  }
  if (!req.is('application/json')) return next(falla(415, 'Formato no permitido.'));
  next();
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
const CSP_DEMO = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";

function cabeceras(req, res, next) {
  res.set({
    'Content-Security-Policy': req.path.startsWith('/demo') ? CSP_DEMO : CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  });
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

module.exports = { leerCookies, ponerCookie, falla, crearLimite, limitador, mismoOrigen, cabeceras };
