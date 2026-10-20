'use strict';
/* Administración: especialistas, organizaciones y resumen. Solo rol admin. */
const express = require('express');
const { q } = require('./db');
const ses = require('./sesion');
const svc = require('./servicio');
const { hashClave, claveTemporal } = require('./cifrado');
const { falla } = require('./http');

const r = express.Router();
const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,20}$/;
const SLUG = /^[a-z0-9-]{2,40}$/;
const texto = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const idDe = req => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) throw falla(400, 'Identificador inválido.');
  return id;
};
const auditar = (req, accion, detalle) => svc.auditar({ query: q }, req.usuario.id, accion, null, detalle);

r.get('/usuarios', async (req, res) => {
  res.json({ usuarios: (await q('select * from usuarios order by activo desc, rol, nombre')).rows.map(ses.usuarioPublico) });
});

r.post('/usuarios', async (req, res) => {
  const b = req.body || {};
  const correo = texto(b.correo, 254).toLowerCase();
  const nombre = texto(b.nombre, 80);
  if (!CORREO.test(correo)) throw falla(400, 'Escribe un correo válido.');
  if (!nombre) throw falla(400, 'Escribe el nombre.');
  if ((await q('select 1 from usuarios where correo = $1', [correo])).rowCount) throw falla(409, 'Ya existe una cuenta con ese correo.');
  const temporal = claveTemporal();
  const u = (await q(`insert into usuarios (correo, nombre, titulo, especialidad, rol, guardia, clave_hash) values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [correo, nombre, texto(b.titulo, 12), texto(b.especialidad, 80), b.rol === 'admin' ? 'admin' : 'especialista', !!b.guardia, await hashClave(temporal)])).rows[0];
  await auditar(req, 'crear usuario', { usuario: u.id });
  res.json({ usuario: ses.usuarioPublico(u), claveTemporal: temporal });
});

r.patch('/usuarios/:id', async (req, res) => {
  const id = idDe(req), b = req.body || {};
  if (id === req.usuario.id && (b.activo === false || (b.rol && b.rol !== 'admin'))) throw falla(400, 'No puedes desactivarte ni quitarte el rol de administración a ti mismo.');
  const campos = [], vals = [id];
  const poner = (col, v) => { vals.push(v); campos.push(`${col} = $${vals.length}`); };
  if (b.nombre !== undefined) { const n = texto(b.nombre, 80); if (!n) throw falla(400, 'El nombre no puede quedar vacío.'); poner('nombre', n); }
  if (b.titulo !== undefined) poner('titulo', texto(b.titulo, 12));
  if (b.especialidad !== undefined) poner('especialidad', texto(b.especialidad, 80));
  if (b.rol !== undefined) poner('rol', b.rol === 'admin' ? 'admin' : 'especialista');
  if (b.guardia !== undefined) poner('guardia', !!b.guardia);
  if (b.activo !== undefined) { poner('activo', !!b.activo); if (!b.activo) poner('disponible', false); }
  if (!campos.length) throw falla(400, 'No hay cambios.');
  const u = (await q(`update usuarios set ${campos.join(', ')} where id = $1 returning *`, vals)).rows[0];
  if (!u) throw falla(404, 'Esa cuenta no existe.');
  if (b.activo === false) await q('delete from sesiones where usuario_id = $1', [id]);
  await auditar(req, 'editar usuario', { usuario: id, cambios: Object.keys(b) });
  res.json({ usuario: ses.usuarioPublico(u) });
});

r.post('/usuarios/:id/clave', async (req, res) => {
  const id = idDe(req), temporal = claveTemporal();
  const u = (await q('update usuarios set clave_hash = $2, debe_cambiar_clave = true where id = $1 returning *', [id, await hashClave(temporal)])).rows[0];
  if (!u) throw falla(404, 'Esa cuenta no existe.');
  await q('delete from sesiones where usuario_id = $1', [id]);
  await auditar(req, 'nueva clave temporal', { usuario: id });
  res.json({ usuario: ses.usuarioPublico(u), claveTemporal: temporal });
});

r.get('/organizaciones', async (req, res) => {
  res.json({ organizaciones: (await q(`select o.*, (select count(*)::int from casos k where k.organizacion_id = o.id and k.creado_en > now() - interval '30 days') casos_30
                                       from organizaciones o order by o.activa desc, o.nombre`)).rows });
});

r.post('/organizaciones', async (req, res) => {
  const b = req.body || {}, nombre = texto(b.nombre, 100), slug = texto(b.slug, 40).toLowerCase();
  if (!nombre) throw falla(400, 'Escribe el nombre de la organización.');
  if (!SLUG.test(slug)) throw falla(400, 'El identificador del enlace solo puede tener minúsculas, números y guiones (2 a 40).');
  if ((await q('select 1 from organizaciones where slug = $1', [slug])).rowCount) throw falla(409, 'Ese identificador ya está en uso.');
  const o = (await q('insert into organizaciones (slug, nombre) values ($1, $2) returning *', [slug, nombre])).rows[0];
  await auditar(req, 'crear organización', { organizacion: o.id });
  res.json({ organizacion: o });
});

r.patch('/organizaciones/:id', async (req, res) => {
  const id = idDe(req), b = req.body || {};
  const o = (await q('update organizaciones set nombre = coalesce($2, nombre), activa = coalesce($3, activa) where id = $1 returning *',
    [id, b.nombre !== undefined ? texto(b.nombre, 100) || null : null, b.activa !== undefined ? !!b.activa : null])).rows[0];
  if (!o) throw falla(404, 'Esa organización no existe.');
  await auditar(req, 'editar organización', { organizacion: id });
  res.json({ organizacion: o });
});

r.get('/metricas', async (req, res) => {
  const m = (await q(`select
      count(*) filter (where creado_en > now() - interval '1 day')::int hoy,
      count(*) filter (where creado_en > now() - interval '30 days')::int mes,
      count(*) filter (where creado_en > now() - interval '30 days' and riesgo = 'high')::int alto,
      count(*) filter (where estado in ('esperando', 'guardia'))::int en_espera,
      round(percentile_cont(0.5) within group (order by extract(epoch from tomado_en - creado_en))
        filter (where tomado_en is not null and creado_en > now() - interval '30 days'))::int mediana_seg
    from casos`)).rows[0];
  const disp = (await q('select count(*) filter (where disponible)::int disponibles, count(*) filter (where disponible and guardia)::int guardia from usuarios where activo')).rows[0];
  res.json({ ...m, ...disp });
});

module.exports = r;
