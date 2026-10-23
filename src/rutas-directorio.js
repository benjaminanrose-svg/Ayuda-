'use strict';
/* Directorio de psicólogos: perfiles públicos, registro, edición del perfil propio y solicitudes de hora. */
const express = require('express');
const { q } = require('./db');
const ses = require('./sesion');
const avisos = require('./avisos');
const { cifrar, descifrar, hashClave, token, hashToken } = require('./cifrado');
const { falla, limitador, ponerCookie } = require('./http');
const cfg = require('./config');
const ag = require('./agenda');

const r = express.Router();
const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,20}$/;
const MODALIDAD = ['online', 'presencial', 'ambas'];
const TIPOS = ['titulo', 'magister', 'doctorado', 'diplomado', 'curso'];
const DISENOS = ['calma', 'lavanda', 'brotes', 'noche', 'trama', 'aurora'];
const TIPOS_DOC = ['titulo', 'diploma', 'certificado', 'otro'];
const MAX_DOCS = 12;
const texto = (v, max) => String(v == null ? '' : v).replace(/\s+\n/g, '\n').trim().slice(0, max);
const linea = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const nombreDe = u => [u.titulo, u.nombre].filter(Boolean).join(' ');

function slugDe(nombre) {
  const s = String(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return s.length >= 2 ? s : 'psicologo';
}
async function slugLibre(base, usuarioId) {
  for (let i = 1; i < 500; i++) {
    const s = i === 1 ? base : `${base}-${i}`;
    const x = (await q('select usuario_id from perfiles where slug = $1', [s])).rows[0];
    if (!x || x.usuario_id === usuarioId) return s;
  }
  return base + '-' + Date.now();
}
async function perfilDe(u) {
  let p = (await q('select * from perfiles where usuario_id = $1', [u.id])).rows[0];
  if (!p) {
    await q('insert into perfiles (usuario_id, slug) values ($1, $2) on conflict do nothing', [u.id, await slugLibre(slugDe(u.nombre), u.id)]);
    p = (await q('select * from perfiles where usuario_id = $1', [u.id])).rows[0];
  }
  return p;
}

/* tipo real del archivo, por sus primeros bytes (no se confía en lo que dice el navegador) */
function tipoArchivo(buf) {
  if (buf.length > 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}
function jpegDe(dataUrl, max) {
  const m = String(dataUrl || '').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  const buf = m ? Buffer.from(m[1], 'base64') : null;
  if (!buf || buf.length > max || tipoArchivo(buf) !== 'image/jpeg') throw falla(400, 'La imagen no es válida o es muy grande.');
  return buf;
}
async function documentosDe(usuarioId, todos) {
  return (await q(`select id, tipo, nombre, tipo_archivo, publico from documentos where usuario_id = $1${todos ? '' : ' and publico'} order by creado_en`, [usuarioId])).rows
    .map(d => ({ id: d.id, tipo: d.tipo, nombre: d.nombre, pdf: d.tipo_archivo === 'application/pdf', publico: d.publico, url: '/api/directorio/documentos/' + d.id }));
}

/* forma pública (y la del dueño, que además ve estado y nota de revisión) */
function vista(p, u, propio) {
  const v0 = new Date(p.actualizado_en).getTime();
  const v = {
    slug: p.slug, nombre: nombreDe(u), resumen: p.resumen, enfoque: p.enfoque, especialidades: p.especialidades,
    estudios: p.estudios, experiencia: p.experiencia, modalidad: p.modalidad, comuna: p.comuna, registroSis: p.registro_sis,
    linkedin: p.linkedin, precio: p.precio, foto: p.foto ? `/api/directorio/perfiles/${p.slug}/foto?v=${v0}` : null,
    fondo: p.fondo ? `/api/directorio/perfiles/${p.slug}/fondo?v=${v0}` : `/img/fondos/${DISENOS.includes(p.fondo_diseno) ? p.fondo_diseno : 'calma'}.svg`,
    fondoPropio: !!p.fondo, fondoDiseno: p.fondo_diseno,
    verificado: p.estado === 'publicado'
  };
  if (propio) Object.assign(v, { estado: p.estado, notaRevision: p.nota_revision, titulo: u.titulo, nombreSolo: u.nombre });
  return v;
}
const tarjeta = p => ({
  slug: p.slug, nombre: nombreDe(p), resumen: p.resumen.slice(0, 220), especialidades: p.especialidades.slice(0, 6),
  modalidad: p.modalidad, comuna: p.comuna, precio: p.precio,
  foto: p.tiene_foto ? `/api/directorio/perfiles/${p.slug}/foto?v=${new Date(p.actualizado_en).getTime()}` : null,
  fondo: p.tiene_fondo ? `/api/directorio/perfiles/${p.slug}/fondo?v=${new Date(p.actualizado_en).getTime()}` : `/img/fondos/${DISENOS.includes(p.fondo_diseno) ? p.fondo_diseno : 'calma'}.svg`,
  documentos: p.n_docs
});

/* ── público ── */
r.get('/perfiles', async (req, res) => {
  const filas = (await q(`select p.slug, p.resumen, p.especialidades, p.modalidad, p.comuna, p.precio, p.actualizado_en, p.foto is not null tiene_foto, p.fondo is not null tiene_fondo, p.fondo_diseno, u.nombre, u.titulo,
    (select count(*)::int from documentos d where d.usuario_id = p.usuario_id and d.publico) n_docs
    from perfiles p join usuarios u on u.id = p.usuario_id where p.estado = 'publicado' and u.activo order by p.publicado_en desc nulls last limit 500`)).rows;
  res.json({ perfiles: filas.map(tarjeta) });
});

async function publicoPorSlug(slug) {
  return (await q('select p.*, u.nombre, u.titulo, u.activo from perfiles p join usuarios u on u.id = p.usuario_id where p.slug = $1', [String(slug).slice(0, 60)])).rows[0];
}
r.get('/perfiles/:slug', async (req, res) => {
  const p = await publicoPorSlug(req.params.slug);
  const s = await ses.usuarioDeSesion(req);
  const puedeVer = p && ((p.estado === 'publicado' && p.activo) || (s && (s.r.id === p.usuario_id || s.r.rol === 'admin')));
  if (!puedeVer) throw falla(404, 'Este perfil no existe o aún no está publicado.');
  const revisor = !!(s && (s.r.id === p.usuario_id || s.r.rol === 'admin'));
  res.json({ perfil: { ...vista(p, p, false), documentos: await documentosDe(p.usuario_id, revisor) }, vistaPrevia: p.estado !== 'publicado', revisor });
});
async function imagenPerfil(req, res, campo) {
  const p = await publicoPorSlug(req.params.slug);
  if (!p || !p[campo]) return res.status(404).end();
  if (p.estado !== 'publicado') {
    const s = await ses.usuarioDeSesion(req);
    if (!s || (s.r.id !== p.usuario_id && s.r.rol !== 'admin')) return res.status(404).end();
  }
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }).send(p[campo]);
}
r.get('/perfiles/:slug/foto', (req, res) => imagenPerfil(req, res, 'foto'));
r.get('/perfiles/:slug/fondo', (req, res) => imagenPerfil(req, res, 'fondo'));

/* diplomas y certificados: públicos si el psicólogo lo eligió y su perfil está publicado; siempre para él y administración */
r.get('/documentos/:id', async (req, res) => {
  const d = (await q(`select d.*, p.estado, u.activo from documentos d join perfiles p on p.usuario_id = d.usuario_id join usuarios u on u.id = d.usuario_id where d.id = $1`,
    [Number.parseInt(req.params.id, 10) || 0])).rows[0];
  if (!d) return res.status(404).end();
  if (!(d.publico && d.estado === 'publicado' && d.activo)) {
    const s = await ses.usuarioDeSesion(req);
    if (!s || (s.r.id !== d.usuario_id && s.r.rol !== 'admin')) return res.status(404).end();
  }
  const ext = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[d.tipo_archivo];
  res.set({ 'Content-Type': d.tipo_archivo, 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': `inline; filename="documento-${d.id}.${ext}"`,
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'self'" }).send(d.archivo);
});

r.post('/perfiles/:slug/solicitudes', limitador(5, 3600e3, req => 'sol|' + req.ip), async (req, res) => {
  const p = await publicoPorSlug(req.params.slug);
  if (!p || p.estado !== 'publicado' || !p.activo) throw falla(404, 'Este perfil no está disponible.');
  const b = req.body || {};
  const d = { nombre: linea(b.nombre, 80), contacto: linea(b.contacto, 120), mensaje: texto(b.mensaje, 1500) };
  if (!d.nombre || !d.contacto) throw falla(400, 'Escribe tu nombre y cómo contactarte (teléfono o correo).');
  await q('insert into solicitudes (usuario_id, contenido) values ($1, $2)', [p.usuario_id, cifrar(JSON.stringify(d))]);
  avisos.aUsuarios([p.usuario_id], { titulo: 'ConténMente', cuerpo: 'Tienes una nueva solicitud de hora.', url: '/mi-perfil', etiqueta: 'solicitud' }).catch(() => {});
  res.json({ ok: true });
});

r.post('/registro', limitador(5, 3600e3, req => 'reg|' + req.ip), async (req, res) => {
  const b = req.body || {};
  const correo = linea(b.correo, 200).toLowerCase(), nombre = linea(b.nombre, 80), titulo = linea(b.titulo, 12);
  if (!CORREO.test(correo)) throw falla(400, 'Escribe un correo válido.');
  if (nombre.length < 4) throw falla(400, 'Escribe tu nombre y apellido.');
  ses.validarClave(b.clave);
  if ((await q('select 1 from usuarios where correo = $1', [correo])).rows[0]) throw falla(409, 'Ya existe una cuenta con ese correo. Ingresa con tu clave.');
  const u = (await q(`insert into usuarios (correo, nombre, titulo, rol, clave_hash, debe_cambiar_clave) values ($1, $2, $3, 'psicologo', $4, false) returning *`,
    [correo, nombre, titulo, await hashClave(String(b.clave))])).rows[0];
  await perfilDe(u);
  await q('insert into auditoria (usuario_id, accion) values ($1, $2)', [u.id, 'registro psicólogo']);
  const t = token();
  await q("insert into sesiones (token_hash, usuario_id, expira_en) values ($1, $2, now() + interval '12 hours')", [hashToken(t), u.id]);
  ponerCookie(res, req, 'ra_sesion', t, 12 * 3600);
  res.json({ ok: true });
});

/* ── perfil propio ── */
r.use('/mio', ses.sesion, ses.claveAlDia);
r.get('/mio', async (req, res) => {
  const p = await perfilDe(req.usuario);
  const n = (await q('select count(*) filter (where not leida)::int n from solicitudes where usuario_id = $1', [req.usuario.id])).rows[0].n;
  res.json({ perfil: { ...vista(p, req.usuario, true), documentos: await documentosDe(req.usuario.id, true) }, rol: req.usuario.rol, solicitudesNuevas: n });
});

function lista(v, campos, max) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map(x => {
    const o = {};
    for (const [k, n] of Object.entries(campos)) o[k] = linea(x && x[k], n);
    return o;
  }).filter(o => Object.values(o).some(Boolean));
}
r.put('/mio', async (req, res) => {
  const b = req.body || {}, u = req.usuario;
  const antes = await perfilDe(u);
  const nombre = linea(b.nombre, 80), titulo = linea(b.titulo, 12);
  if (nombre.length < 4) throw falla(400, 'Escribe tu nombre y apellido.');
  const modalidad = MODALIDAD.includes(b.modalidad) ? b.modalidad : 'online';
  const precio = b.precio === '' || b.precio == null ? null : Math.round(Number(b.precio));
  if (precio != null && (!Number.isFinite(precio) || precio < 0 || precio > 1e7)) throw falla(400, 'El valor de la sesión no es válido.');
  const linkedin = linea(b.linkedin, 200);
  if (linkedin && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(linkedin)) throw falla(400, 'El enlace de LinkedIn debe empezar con https://www.linkedin.com/');
  const especialidades = [...new Set((Array.isArray(b.especialidades) ? b.especialidades : []).map(x => linea(x, 40)).filter(Boolean))].slice(0, 12);
  const estudios = lista(b.estudios, { tipo: 20, titulo: 120, institucion: 120, anio: 4 }, 15).map(e => ({ ...e, tipo: TIPOS.includes(e.tipo) ? e.tipo : 'curso' }));
  const experiencia = lista(b.experiencia, { cargo: 100, lugar: 120, periodo: 40 }, 15);
  const registro = linea(b.registroSis, 20);
  // si cambia lo que se verificó (nombre o registro), el perfil vuelve a revisión
  const cambiaVerificado = nombre !== u.nombre || titulo !== u.titulo || registro !== antes.registro_sis;
  const estado = antes.estado === 'publicado' && cambiaVerificado ? 'pendiente' : antes.estado;
  await q('update usuarios set nombre = $2, titulo = $3 where id = $1', [u.id, nombre, titulo]);
  await q(`update perfiles set resumen = $2, enfoque = $3, especialidades = $4, estudios = $5::jsonb, experiencia = $6::jsonb, modalidad = $7,
      comuna = $8, registro_sis = $9, linkedin = $10, precio = $11, estado = $12, fondo_diseno = $13, actualizado_en = now() where usuario_id = $1`,
    [u.id, texto(b.resumen, 1500), texto(b.enfoque, 800), especialidades, JSON.stringify(estudios), JSON.stringify(experiencia), modalidad,
      linea(b.comuna, 60), registro, linkedin, precio, estado, DISENOS.includes(b.fondoDiseno) ? b.fondoDiseno : antes.fondo_diseno]);
  const p = (await q('select * from perfiles where usuario_id = $1', [u.id])).rows[0];
  res.json({ perfil: vista(p, { ...u, nombre, titulo }, true), volvioARevision: estado !== antes.estado });
});

r.post('/mio/foto', async (req, res) => {
  const buf = jpegDe(req.body && req.body.imagen, 500e3);
  await perfilDe(req.usuario);
  await q('update perfiles set foto = $2, actualizado_en = now() where usuario_id = $1', [req.usuario.id, buf]);
  res.json({ ok: true });
});
r.delete('/mio/foto', async (req, res) => {
  await q('update perfiles set foto = null, actualizado_en = now() where usuario_id = $1', [req.usuario.id]);
  res.json({ ok: true });
});
r.post('/mio/fondo', async (req, res) => {
  const buf = jpegDe(req.body && req.body.imagen, 900e3);
  await perfilDe(req.usuario);
  await q('update perfiles set fondo = $2, actualizado_en = now() where usuario_id = $1', [req.usuario.id, buf]);
  res.json({ ok: true });
});
r.delete('/mio/fondo', async (req, res) => {
  await q('update perfiles set fondo = null, actualizado_en = now() where usuario_id = $1', [req.usuario.id]);
  res.json({ ok: true });
});

r.post('/mio/documentos', async (req, res) => {
  const b = req.body || {};
  const m = String(b.archivo || '').match(/^data:[a-z/+.-]+;base64,([A-Za-z0-9+/=]+)$/);
  const buf = m ? Buffer.from(m[1], 'base64') : null;
  const tipo = buf && tipoArchivo(buf);
  if (!tipo) throw falla(400, 'Sube un PDF o una imagen (JPG o PNG).');
  if (buf.length > 4.5e6) throw falla(400, 'El archivo pesa más de 4 MB. Prueba con una foto o un PDF más liviano.');
  const nombre = linea(b.nombre, 120);
  if (!nombre) throw falla(400, 'Escribe qué documento es (por ejemplo: Título de Psicólogo, Diplomado en Trauma).');
  if ((await q('select count(*)::int n from documentos where usuario_id = $1', [req.usuario.id])).rows[0].n >= MAX_DOCS) throw falla(400, `Puedes subir hasta ${MAX_DOCS} documentos.`);
  await perfilDe(req.usuario);
  const d = (await q('insert into documentos (usuario_id, tipo, nombre, tipo_archivo, archivo, publico) values ($1, $2, $3, $4, $5, $6) returning id',
    [req.usuario.id, TIPOS_DOC.includes(b.tipo) ? b.tipo : 'otro', nombre, tipo, buf, b.publico !== false])).rows[0];
  await q('update perfiles set actualizado_en = now() where usuario_id = $1', [req.usuario.id]);
  res.json({ id: d.id });
});
r.patch('/mio/documentos/:id', async (req, res) => {
  const b = req.body || {};
  await q('update documentos set publico = coalesce($3, publico), nombre = coalesce(nullif($4, \'\'), nombre) where id = $1 and usuario_id = $2',
    [Number.parseInt(req.params.id, 10) || 0, req.usuario.id, typeof b.publico === 'boolean' ? b.publico : null, linea(b.nombre, 120)]);
  res.json({ ok: true });
});
r.delete('/mio/documentos/:id', async (req, res) => {
  await q('delete from documentos where id = $1 and usuario_id = $2', [Number.parseInt(req.params.id, 10) || 0, req.usuario.id]);
  res.json({ ok: true });
});

r.post('/mio/enviar', async (req, res) => {
  const p = await perfilDe(req.usuario);
  const falta = [];
  if (p.resumen.length < 80) falta.push('un resumen de al menos 80 letras');
  if (!p.especialidades.length) falta.push('al menos una especialidad');
  if (!p.estudios.length) falta.push('tus estudios');
  if (!p.registro_sis) falta.push('tu número de registro en la Superintendencia de Salud');
  if (falta.length) throw falla(400, 'Para enviar a revisión falta: ' + falta.join(', ') + '.');
  if (p.estado === 'publicado') return res.json({ estado: p.estado });
  await q("update perfiles set estado = 'pendiente', nota_revision = '' where usuario_id = $1", [req.usuario.id]);
  const admins = (await q("select id from usuarios where rol = 'admin' and activo")).rows.map(x => x.id);
  avisos.aUsuarios(admins, { titulo: 'ConténMente', cuerpo: 'Hay un perfil de psicólogo para revisar.', url: '/equipo#admin', etiqueta: 'revision' }).catch(() => {});
  res.json({ estado: 'pendiente' });
});

r.get('/mio/solicitudes', async (req, res) => {
  const filas = (await q('select id, contenido, leida, creada_en from solicitudes where usuario_id = $1 order by creada_en desc limit 100', [req.usuario.id])).rows;
  res.json({ solicitudes: filas.map(s => ({ id: s.id, leida: s.leida, creadaEn: s.creada_en, ...JSON.parse(descifrar(s.contenido)) })) });
});
r.post('/mio/solicitudes/:id/leida', async (req, res) => {
  await q('update solicitudes set leida = true where id = $1 and usuario_id = $2', [Number.parseInt(req.params.id, 10) || 0, req.usuario.id]);
  res.json({ ok: true });
});

/* ───────── agenda y citas ───────── */
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fmt = d => new Date(d).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false });
async function libresDe(usuarioId, agenda) {
  const bloq = new Set((await q("select to_char(fecha, 'YYYY-MM-DD') f from bloqueos where usuario_id = $1 and fecha >= current_date", [usuarioId])).rows.map(x => x.f));
  const ocup = (await q("select inicio, fin from citas where usuario_id = $1 and estado <> 'cancelada' and fin > now()", [usuarioId])).rows.map(c => [+c.inicio, +c.fin]);
  return ag.horasLibres(agenda, bloq, ocup);
}
const citaPublica = (c, p) => ({
  inicio: c.inicio, fin: c.fin, modalidad: c.modalidad, estado: c.estado, canceladaPor: c.cancelada_por, motivoCancelacion: c.motivo_cancelacion,
  sala: c.modalidad === 'online' && c.estado === 'confirmada' ? c.sala : null,
  profesional: { nombre: nombreDe(p), slug: p.slug, comuna: p.comuna, foto: p.foto ? `/api/directorio/perfiles/${p.slug}/foto` : null }
});
async function citaPorToken(t) {
  return (await q(`select c.*, p.slug, p.comuna, p.foto is not null foto, u.nombre, u.titulo from citas c join perfiles p on p.usuario_id = c.usuario_id
    join usuarios u on u.id = c.usuario_id where c.token_hash = $1`, [hashToken(String(t).slice(0, 100))])).rows[0];
}

r.get('/perfiles/:slug/horas', async (req, res) => {
  const p = await publicoPorSlug(req.params.slug);
  if (!p || p.estado !== 'publicado' || !p.activo) throw falla(404, 'Este perfil no está disponible.');
  const a = ag.normalizar(p.agenda);
  res.json({ horas: await libresDe(p.usuario_id, a), duracion: a.duracion, modalidad: p.modalidad });
});

r.post('/perfiles/:slug/citas', limitador(6, 3600e3, req => 'cita|' + req.ip), async (req, res) => {
  const p = await publicoPorSlug(req.params.slug);
  if (!p || p.estado !== 'publicado' || !p.activo) throw falla(404, 'Este perfil no está disponible.');
  const b = req.body || {}, a = ag.normalizar(p.agenda);
  const inicio = new Date(b.inicio).getTime();
  const d = { nombre: linea(b.nombre, 80), contacto: linea(b.contacto, 120), motivo: texto(b.motivo, 1000) };
  if (!d.nombre || !d.contacto) throw falla(400, 'Escribe tu nombre y un teléfono o correo para que te puedan contactar.');
  const modalidad = p.modalidad === 'ambas' ? (b.modalidad === 'presencial' ? 'presencial' : 'online') : p.modalidad;
  if (!(await libresDe(p.usuario_id, a)).includes(inicio)) throw falla(409, 'Esa hora ya no está disponible. Elige otra.');
  const t = token();
  const sala = modalidad === 'online' ? `${cfg.videoBase}/ContenMente-${require('crypto').randomBytes(10).toString('hex')}` : null;
  try {
    await q('insert into citas (usuario_id, inicio, fin, modalidad, datos, token_hash, sala) values ($1, $2, $3, $4, $5, $6, $7)',
      [p.usuario_id, new Date(inicio), new Date(inicio + a.duracion * 60e3), modalidad, cifrar(JSON.stringify(d)), hashToken(t), sala]);
  } catch (e) { if (e.code === '23505') throw falla(409, 'Alguien acaba de tomar esa hora. Elige otra.'); throw e; }
  avisos.aUsuarios([p.usuario_id], { titulo: 'ConténMente', cuerpo: 'Nueva cita: ' + fmt(inicio), url: '/mi-perfil#agenda', etiqueta: 'cita' }).catch(() => {});
  res.json({ enlace: '/cita/' + t });
});

r.get('/citas/:token', async (req, res) => {
  const c = await citaPorToken(req.params.token);
  if (!c) throw falla(404, 'No encontramos esta cita. Revisa el enlace.');
  res.json({ cita: citaPublica(c, c) });
});
r.get('/citas/:token/calendario.ics', async (req, res) => {
  const c = await citaPorToken(req.params.token);
  if (!c) return res.status(404).end();
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="cita-contenmente.ics"' })
    .send(ag.ics({ id: c.id, inicio: c.inicio, fin: c.fin, titulo: 'Sesión con ' + nombreDe(c),
      descripcion: (c.sala ? 'Videollamada: ' + c.sala + '\n' : '') + 'Para ver o cancelar tu cita: ' + cfg.urlApp + '/cita/' + req.params.token,
      lugar: c.modalidad === 'online' ? 'Online' : c.comuna }));
});
r.post('/citas/:token/cancelar', async (req, res) => {
  const c = await citaPorToken(req.params.token);
  if (!c) throw falla(404, 'No encontramos esta cita.');
  if (c.estado !== 'confirmada' || new Date(c.inicio) < new Date()) throw falla(409, 'Esta cita ya no se puede cancelar.');
  await q("update citas set estado = 'cancelada', cancelada_por = 'paciente', motivo_cancelacion = $2 where id = $1", [c.id, texto(req.body && req.body.motivo, 300)]);
  avisos.aUsuarios([c.usuario_id], { titulo: 'ConténMente', cuerpo: 'Se canceló la cita del ' + fmt(c.inicio), url: '/mi-perfil#agenda', etiqueta: 'cita' }).catch(() => {});
  res.json({ ok: true });
});

/* agenda propia del psicólogo */
r.get('/mio/agenda', async (req, res) => {
  const p = await perfilDe(req.usuario);
  const bloqueos = (await q("select to_char(fecha, 'YYYY-MM-DD') f from bloqueos where usuario_id = $1 and fecha >= current_date order by fecha", [req.usuario.id])).rows.map(x => x.f);
  const citas = (await q(`select id, inicio, fin, modalidad, datos, estado, cancelada_por, motivo_cancelacion, sala from citas
    where usuario_id = $1 and inicio > now() - interval '7 days' order by inicio limit 200`, [req.usuario.id])).rows
    .map(c => ({ id: c.id, inicio: c.inicio, fin: c.fin, modalidad: c.modalidad, estado: c.estado, canceladaPor: c.cancelada_por, motivoCancelacion: c.motivo_cancelacion, sala: c.sala, ...JSON.parse(descifrar(c.datos)) }));
  res.json({ agenda: ag.normalizar(p.agenda), bloqueos, citas, modalidad: p.modalidad, publicado: p.estado === 'publicado', libres: (await libresDe(req.usuario.id, p.agenda)).length });
});
r.put('/mio/agenda', async (req, res) => {
  const b = req.body || {};
  await perfilDe(req.usuario);
  const a = ag.normalizar(b.agenda);
  await q('update perfiles set agenda = $2::jsonb where usuario_id = $1', [req.usuario.id, JSON.stringify(a)]);
  const fechas = [...new Set((Array.isArray(b.bloqueos) ? b.bloqueos : []).filter(f => FECHA.test(f)))].slice(0, 120);
  await q('delete from bloqueos where usuario_id = $1', [req.usuario.id]);
  if (fechas.length) await q('insert into bloqueos (usuario_id, fecha) select $1, unnest($2::date[]) on conflict do nothing', [req.usuario.id, fechas]);
  res.json({ agenda: a, libres: (await libresDe(req.usuario.id, a)).length });
});
r.post('/mio/citas/:id/:accion', async (req, res) => {
  const acc = req.params.accion, id = Number.parseInt(req.params.id, 10) || 0;
  if (!['cancelar', 'realizada'].includes(acc)) throw falla(404, 'Acción desconocida.');
  const x = acc === 'cancelar'
    ? await q("update citas set estado = 'cancelada', cancelada_por = 'psicologo', motivo_cancelacion = $3 where id = $1 and usuario_id = $2 and estado = 'confirmada' returning id", [id, req.usuario.id, texto(req.body && req.body.motivo, 300)])
    : await q("update citas set estado = 'realizada' where id = $1 and usuario_id = $2 and estado = 'confirmada' and inicio < now() returning id", [id, req.usuario.id]);
  if (!x.rows[0]) throw falla(409, acc === 'cancelar' ? 'Esta cita ya no se puede cancelar.' : 'Solo puedes marcar como realizada una cita que ya empezó.');
  res.json({ ok: true });
});

module.exports = r;
