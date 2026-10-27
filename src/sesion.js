'use strict';
/* Sesiones del equipo: cookie httpOnly con una ficha aleatoria; en la base solo queda su huella (hash). */
const { q } = require('./db');
const { leerCookies, ponerCookie, falla } = require('./http');
const { token, hashToken, verificarClave, hashClave } = require('./cifrado');

const HORAS = 12;
const COOKIE = 'ra_sesion';
let falsa = null; // para que un correo inexistente tarde lo mismo que uno real

const usuarioPublico = u => ({
  id: u.id, correo: u.correo, nombre: u.nombre, titulo: u.titulo, especialidad: u.especialidad, rol: u.rol,
  guardia: u.guardia, disponible: u.disponible, activo: u.activo, debeCambiarClave: u.debe_cambiar_clave, ultimoAcceso: u.ultimo_acceso, pideClave: u.pide_clave_en || null
});

function validarClave(c) {
  if (typeof c !== 'string' || c.length < 10) throw falla(400, 'La clave debe tener al menos 10 caracteres.');
  if (c.length > 200) throw falla(400, 'La clave es demasiado larga.');
}

async function ingresar(req, res) {
  const correo = String((req.body && req.body.correo) || '').trim().toLowerCase().slice(0, 200);
  const clave = String((req.body && req.body.clave) || '').slice(0, 200);
  const u = (await q('select * from usuarios where correo = $1 and activo', [correo])).rows[0];
  if (!falsa) falsa = await hashClave('clave-que-no-existe');
  const ok = await verificarClave(clave, u ? u.clave_hash : falsa);
  if (!u || !ok) throw falla(401, 'Correo o clave incorrectos.');
  const t = token();
  await q(`insert into sesiones (token_hash, usuario_id, expira_en) values ($1, $2, now() + make_interval(hours => ${HORAS}))`, [hashToken(t), u.id]);
  await q('update usuarios set ultimo_acceso = now() where id = $1', [u.id]);
  await q('insert into auditoria (usuario_id, accion) values ($1, $2)', [u.id, 'ingreso']);
  ponerCookie(res, req, COOKIE, t, HORAS * 3600);
  return u;
}

async function usuarioDeSesion(req) {
  const t = leerCookies(req)[COOKIE];
  if (!t) return null;
  const h = hashToken(t);
  const r = (await q(`select u.*, s.expira_en from sesiones s join usuarios u on u.id = s.usuario_id
                      where s.token_hash = $1 and s.expira_en > now() and u.activo`, [h])).rows[0];
  return r ? { r, h, t } : null;
}

async function sesion(req, res, next) {
  const s = await usuarioDeSesion(req);
  if (!s) return next(falla(401, 'Tu sesión terminó. Vuelve a ingresar.'));
  const { r, h, t } = s;
  req.usuario = r;
  req.sesionHash = h;
  if (new Date(r.expira_en) - Date.now() < (HORAS / 2) * 3600e3) {
    await q(`update sesiones set expira_en = now() + make_interval(hours => ${HORAS}) where token_hash = $1`, [h]);
    ponerCookie(res, req, COOKIE, t, HORAS * 3600);
  }
  next();
}

async function salir(req, res) {
  if (req.sesionHash) await q('delete from sesiones where token_hash = $1', [req.sesionHash]);
  ponerCookie(res, req, COOKIE, '', 0);
}

async function cambiarClave(req) {
  const { actual, nueva } = req.body || {};
  validarClave(nueva);
  if (!(await verificarClave(String(actual || ''), req.usuario.clave_hash))) throw falla(400, 'La clave actual no es correcta.');
  if (actual === nueva) throw falla(400, 'La clave nueva debe ser distinta de la actual.');
  await q('update usuarios set clave_hash = $2, debe_cambiar_clave = false where id = $1', [req.usuario.id, await hashClave(nueva)]);
  await q('delete from sesiones where usuario_id = $1 and token_hash <> $2', [req.usuario.id, req.sesionHash]);
  await q('insert into auditoria (usuario_id, accion) values ($1, $2)', [req.usuario.id, 'cambio de clave']);
}

const claveAlDia = (req, res, next) => (req.usuario.debe_cambiar_clave ? next(falla(403, 'Primero cambia tu clave.', { cambiarClave: true })) : next());
const soloAdmin = (req, res, next) => (req.usuario.rol === 'admin' ? next() : next(falla(403, 'Solo para administradores.')));

/* Crea el primer administrador desde ADMIN_CORREO y ADMIN_CLAVE si aún no hay usuarios. */
async function adminInicial(cfg) {
  const n = (await q('select count(*)::int n from usuarios')).rows[0].n;
  if (n > 0) return true;
  if (!cfg.adminCorreo || !cfg.adminClave) return false;
  validarClave(cfg.adminClave);
  const nombre = cfg.adminCorreo.split('@')[0].replace(/[._-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  await q(`insert into usuarios (correo, nombre, titulo, rol, clave_hash, debe_cambiar_clave) values ($1, $2, '', 'admin', $3, true)`,
    [cfg.adminCorreo, nombre, await hashClave(cfg.adminClave)]);
  console.log('[inicio] administrador inicial creado:', cfg.adminCorreo);
  return true;
}

module.exports = { ingresar, sesion, usuarioDeSesion, salir, cambiarClave, claveAlDia, soloAdmin, adminInicial, usuarioPublico, validarClave };
