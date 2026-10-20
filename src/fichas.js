'use strict';
/* Resumen de un caso para el panel: la ficha de derivación. */
const db = require('./db');
const { descifrar } = require('./cifrado');
const { NIVEL, senales, temas } = require('./motor');

const SQL = `
select c.*, o.nombre as org_nombre, o.slug as org_slug, mk.contenido as clave_contenido, l.ult_ids, l.ult_cont,
  case when u.id is null then null else u.titulo || ' ' || u.nombre end as tomado_nombre,
  case when ua.id is null then null else ua.titulo || ' ' || ua.nombre end as agendado_nombre
from casos c
join organizaciones o on o.id = c.organizacion_id
left join mensajes mk on mk.id = c.mensaje_clave_id
left join usuarios u on u.id = c.tomado_por
left join usuarios ua on ua.id = c.agendado_con
left join lateral (
  select array_agg(t.id order by t.id desc) as ult_ids, array_agg(t.contenido order by t.id desc) as ult_cont
  from (select m.id, m.contenido from mensajes m where m.conversacion_id = c.conversacion_id and m.autor = 'persona' order by m.id desc limit 2) t
) l on true`;

const ORDEN_COLA = `order by (c.estado = 'escalado') desc, case c.riesgo when 'high' then 0 when 'mid' then 1 else 2 end, c.urgente desc, c.creado_en asc`;

function armar(f) {
  const ult = (f.ult_ids || []).map((id, i) => ({ id: +id, texto: descifrar(f.ult_cont[i]) }));
  let lineas;
  if (f.mensaje_clave_id && ult[0] && +f.mensaje_clave_id !== ult[0].id && f.clave_contenido) lineas = [descifrar(f.clave_contenido), ult[0].texto];
  else lineas = ult.slice().reverse().map(x => x.texto);
  return {
    id: f.id, folio: f.folio, org: f.org_nombre, estado: f.estado, riesgo: f.riesgo, nivel: NIVEL[f.riesgo], urgente: f.urgente,
    senales: senales(f.senales), temas: temas(f.temas), seguro: f.seguro, menor: f.menor, mensajes: f.mensajes_persona,
    creadoEn: f.creado_en, escaladoEn: f.escalado_en, tomadoPor: f.tomado_por, tomadoNombre: f.tomado_nombre, tomadoEn: f.tomado_en,
    agendadoPara: f.agendado_para, agendadoCon: f.agendado_con, agendadoNombre: f.agendado_nombre, cerradoEn: f.cerrado_en,
    conversacionId: f.conversacion_id, lineas
  };
}

async function resumen(id, c = db) {
  const r = await c.query(SQL + ' where c.id = $1', [id]);
  return r.rows[0] ? armar(r.rows[0]) : null;
}

async function listado(usuarioId) {
  const [cola, mios, agendados] = await Promise.all([
    db.q(SQL + ` where c.estado in ('esperando', 'escalado') ` + ORDEN_COLA),
    db.q(SQL + ` where c.estado = 'en_atencion' and c.tomado_por = $1 order by c.tomado_en asc`, [usuarioId]),
    db.q(SQL + ` where c.estado = 'agendado' and c.agendado_con = $1 order by c.agendado_para asc`, [usuarioId])
  ]);
  return { cola: cola.rows.map(armar), mios: mios.rows.map(armar), agendados: agendados.rows.map(armar) };
}

async function transcripcion(conversacionId) {
  const r = await db.q(`select m.id, m.autor, m.tipo, m.contenido, m.riesgo, m.creado_en, case when u.id is null then null else u.titulo || ' ' || u.nombre end as nombre
                        from mensajes m left join usuarios u on u.id = m.usuario_id where m.conversacion_id = $1 order by m.id`, [conversacionId]);
  return r.rows.map(m => ({ id: +m.id, autor: m.autor, tipo: m.tipo, texto: descifrar(m.contenido), riesgo: m.riesgo, nombre: m.nombre, creadoEn: m.creado_en }));
}

const folio = n => 'N.º ' + String(n).padStart(6, '0');

module.exports = { resumen, listado, transcripcion, folio };
