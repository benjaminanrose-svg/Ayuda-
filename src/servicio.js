'use strict';
/* Lógica central: conversación con el bot, casos (fichas), acciones del especialista y trabajos periódicos. */
const E = require('../motor/engine.js');
const { pool, q, tx } = require('./db');
const { cifrar, descifrar } = require('./cifrado');
const tr = require('./tiempo-real');
const avisos = require('./avisos');
const cfg = require('./config');
const { falla } = require('./http');

const PRIO = { low: 'baja', mid: 'media', high: 'alta' };
const OCULTAS = new Set(['MEDIO_FEM', 'FAQ_PAIS', 'PLAN_B']);
const ORDEN_RES = ['4141', '131', '133', '1515', '147', '1455', '149', '1412'];
const INTRO_RESPIRACION = 'Hagamos algo juntos para bajar un poco la intensidad. Inhala cuando el círculo crece y exhala cuando se achica.';
const EN_COLA = ['esperando', 'guardia'];
const log = e => console.error('[servicio]', (e && e.message) || e);
const pad = n => String(n).padStart(6, '0');
const nombreDe = u => [u.titulo, u.nombre].filter(Boolean).join(' ');

/* ── utilidades ── */
function recursos(lista) {
  const s = new Set(lista || []);
  const orden = ORDEN_RES.filter(k => s.has(k)).concat([...s].filter(k => !ORDEN_RES.includes(k)));
  return orden.filter(k => E.RES[k]).map(k => ({ numero: E.RES[k][0], nombre: E.RES[k][1], enlace: E.RES[k][2] }));
}
const crisisDe = (lista, facts) => (lista && lista.length ? { recursos: recursos(lista), suave: !!(facts && (facts.refusedCall || facts.cantCall)) } : null);
const publico = m => ({ id: String(m.id), autor: m.autor, tipo: m.tipo, texto: m.texto != null ? m.texto : descifrar(m.contenido), nombre: m.nombre || null, riesgo: m.riesgo || null, hora: m.creado_en });

function cuandoTexto(fecha) {
  const d = new Date(fecha), hoy = new Date(), man = new Date();
  man.setDate(hoy.getDate() + 1);
  const dia = x => x.toLocaleDateString('es-CL');
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (dia(d) === dia(hoy)) return `hoy a las ${hora}`;
  if (dia(d) === dia(man)) return `mañana a las ${hora}`;
  return `el ${d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${hora}`;
}

async function guardarMensaje(c, convId, autor, texto, o = {}) {
  const r = await c.query(
    'insert into mensajes (conversacion_id, autor, usuario_id, tipo, contenido, riesgo) values ($1, $2, $3, $4, $5, $6) returning id, creado_en',
    [convId, autor, o.usuarioId || null, o.tipo || 'texto', cifrar(texto || ''), o.riesgo || null]);
  return { id: r.rows[0].id, autor, tipo: o.tipo || 'texto', texto: texto || '', nombre: o.nombre || null, riesgo: o.riesgo || null, creado_en: r.rows[0].creado_en };
}

async function guardarRespuestas(c, convId, replies) {
  const out = [];
  for (const x of replies || []) {
    if (typeof x === 'string' && x) out.push(await guardarMensaje(c, convId, 'bot', x));
    else if (x && x.type === 'breath') {
      out.push(await guardarMensaje(c, convId, 'bot', INTRO_RESPIRACION));
      out.push(await guardarMensaje(c, convId, 'bot', '', { tipo: 'respiracion' }));
    }
  }
  return out;
}

const contar = async (c, guardia) => (await c.query(`select count(*)::int n from usuarios where activo and disponible${guardia ? ' and guardia' : ''}`)).rows[0].n;

async function botDe(c, convId) {
  const cv = (await c.query('select * from conversaciones where id = $1 for update', [convId])).rows[0];
  if (!cv) throw falla(404, 'La conversación no existe.');
  return { cv, bot: E.create(cv.estado_bot ? descifrar(cv.estado_bot) : undefined) };
}
const guardarBot = (c, convId, bot, opciones) =>
  c.query('update conversaciones set estado_bot = $2, opciones = $3::jsonb, ultima_actividad = now() where id = $1', [convId, cifrar(bot.exportState()), JSON.stringify(opciones || [])]);

async function eventoBot(c, convId, nombre, opciones) {
  const { bot } = await botDe(c, convId);
  bot.setPros(await contar(c));
  const ev = bot.event(nombre, opciones);
  await guardarBot(c, convId, bot, []);
  return guardarRespuestas(c, convId, ev.replies);
}

const auditar = (c, usuarioId, accion, casoId, detalle) =>
  c.query('insert into auditoria (usuario_id, accion, caso_id, detalle) values ($1, $2, $3, $4)', [usuarioId || null, accion, casoId || null, detalle ? JSON.stringify(detalle) : null]);

const SQL_CLAVE = `select id from mensajes where conversacion_id = $1 and autor = 'persona'
  order by case riesgo when 'high' then 2 when 'mid' then 1 else 0 end desc, id asc limit 1`;
const SQL_HISTORIA = `select m.id, m.autor, m.tipo, m.contenido, m.riesgo, m.creado_en,
  nullif(trim(coalesce(u.titulo, '') || ' ' || coalesce(u.nombre, '')), '') nombre
  from mensajes m left join usuarios u on u.id = m.usuario_id where m.conversacion_id = $1 order by m.id`;

/* Ficha de derivación resumida (lo que ve el equipo). */
async function resumenCaso(c, id) {
  const k = (await c.query(`select k.*, o.nombre org, u.nombre t_nombre, u.titulo t_titulo,
      (select count(*)::int from mensajes m where m.conversacion_id = k.conversacion_id and m.autor = 'persona') n_msgs
    from casos k left join organizaciones o on o.id = k.organizacion_id left join usuarios u on u.id = k.tomado_por where k.id = $1`, [id])).rows[0];
  if (!k) return null;
  const ult = (await c.query("select id, contenido from mensajes where conversacion_id = $1 and autor = 'persona' order by id desc limit 2", [k.conversacion_id])).rows.reverse();
  let extracto = ult;
  if (k.mensaje_clave_id && ult.length && !ult.some(m => String(m.id) === String(k.mensaje_clave_id))) {
    const m = (await c.query('select id, contenido from mensajes where id = $1', [k.mensaje_clave_id])).rows[0];
    if (m) extracto = [m, ult[ult.length - 1]];
  }
  return {
    id: k.id, folio: pad(k.folio), estado: k.estado, riesgo: k.riesgo, urgente: k.urgente,
    senales: (k.senales || []).filter(f => E.FLAG_LABEL[f] && !OCULTAS.has(f)).map(f => ({ texto: E.FLAG_LABEL[f], urgente: E.URGENT.has(f) })),
    temas: (k.temas || []).filter(t => E.THEMES[t]).map(t => E.THEMES[t].label),
    seguro: k.seguro, menor: k.menor, organizacion: k.org, mensajes: k.n_msgs,
    extracto: extracto.map(m => descifrar(m.contenido)),
    creadoEn: k.creado_en, escaladoEn: k.escalado_en, tomadoEn: k.tomado_en, agendadoPara: k.agendado_para, cerradoEn: k.cerrado_en,
    tomadoPor: k.tomado_por, tomadoPorNombre: k.t_nombre ? nombreDe({ titulo: k.t_titulo, nombre: k.t_nombre }) : null
  };
}

function estadoPersona(k, r) {
  if (!k || k.estado === 'cerrado') return { paso: 'escuchando', folio: null };
  const paso = k.estado === 'en_atencion' ? 'con_especialista' : k.estado === 'agendado' ? 'agendado' : 'buscando';
  return { paso, folio: pad(k.folio), especialista: (r && r.tomadoPorNombre) || null, agendadoPara: k.agendado_para || null };
}

/* Envía el resumen a quien corresponde: la cola es de todos; un caso tomado, solo de quien lo atiende. */
function difundirCaso(r, aTodos) {
  if (!r) return;
  if (aTodos || EN_COLA.includes(r.estado)) tr.aEquipo('caso', r);
  else if (r.tomadoPor) tr.aUsuario(r.tomadoPor, 'caso', r);
}
function difundir(s) {
  difundirCaso(s.resumen, true);
  s.ms.forEach(m => tr.aPersona(s.k.conversacion_id, 'mensaje', publico(m)));
  tr.aPersona(s.k.conversacion_id, 'estado', estadoPersona(s.k, s.resumen));
}

async function avisarDisponibles(r) {
  const ids = (await q('select id from usuarios where activo and disponible')).rows.map(x => x.id);
  await avisos.aUsuarios(ids, { titulo: `Nuevo caso · prioridad ${PRIO[r.riesgo]}`, cuerpo: `N.º ${r.folio}${r.organizacion ? ' · ' + r.organizacion : ''}`, url: '/equipo#caso-' + r.id, etiqueta: 'caso-' + r.id, urgente: r.riesgo === 'high' });
}
async function avisarGuardia(r, texto) {
  const ids = (await q('select id from usuarios where activo and guardia')).rows.map(x => x.id);
  ids.forEach(id => tr.aUsuario(id, 'alerta', { casoId: r.id, folio: r.folio, texto }));
  await avisos.aUsuarios(ids, { titulo: `Guardia · caso N.º ${r.folio}`, cuerpo: texto, url: '/equipo#caso-' + r.id, etiqueta: 'guardia-' + r.id, urgente: true });
}

/* ── persona ── */
async function nuevaConversacion(tokenHash, orgId) {
  return tx(async c => {
    const bot = E.create();
    const s = bot.start();
    const id = (await c.query('insert into conversaciones (token_hash, organizacion_id, estado_bot, opciones) values ($1, $2, $3, $4::jsonb) returning id',
      [tokenHash, orgId, cifrar(bot.exportState()), JSON.stringify(s.chips || [])])).rows[0].id;
    await guardarMensaje(c, id, 'sistema', 'Conversación confidencial');
    await guardarRespuestas(c, id, s.replies);
    return id;
  });
}

async function historiaPersona(convId) {
  const cv = (await q('select * from conversaciones where id = $1', [convId])).rows[0];
  if (!cv) return null;
  const mensajes = (await q(SQL_HISTORIA, [convId])).rows.map(publico);
  const k = (await q("select * from casos where conversacion_id = $1 and estado <> 'cerrado'", [convId])).rows[0] || null;
  const bot = E.create(cv.estado_bot ? descifrar(cv.estado_bot) : undefined);
  const st = bot.state;
  return {
    mensajes, chips: cv.opciones || [],
    crisis: crisisDe([...st.resources], st.facts), mostrarCrisis: st.risk === 'high',
    caso: estadoPersona(k, k ? await resumenCaso(pool, k.id) : null)
  };
}

async function mensajePersona(convId, texto) {
  const s = await tx(async c => {
    const { cv, bot } = await botDe(c, convId);
    bot.setPros(await contar(c));
    const res = bot.reply(texto);
    const riesgoMsg = (res.analysis && res.analysis.risk) || 'low';
    const mp = await guardarMensaje(c, cv.id, 'persona', texto, { riesgo: riesgoMsg });
    const bots = res.forward ? [] : await guardarRespuestas(c, cv.id, res.replies);
    let k = (await c.query("select * from casos where conversacion_id = $1 and estado <> 'cerrado' for update", [cv.id])).rows[0] || null;
    let nuevo = false, volvio = false;
    if (!k && res.startSearch) {
      k = (await c.query(`insert into casos (conversacion_id, organizacion_id, estado, escalar_en)
          values ($1, $2, 'esperando', case when $3::int > 0 then now() + make_interval(secs => $3::int) end) returning *`,
      [cv.id, cv.organizacion_id, cfg.escalar[res.risk] || 0])).rows[0];
      nuevo = true;
    }
    if (k) {
      const clave = (await c.query(SQL_CLAVE, [cv.id])).rows[0].id;
      if (res.forward) {
        k = (await c.query('update casos set urgente = urgente or $2, mensaje_clave_id = $3, actualizado_en = now() where id = $1 returning *', [k.id, riesgoMsg === 'high', clave])).rows[0];
      } else {
        volvio = k.estado === 'agendado' && !!res.urgent;
        if (volvio) {
          bot.state.mode = 'normal';
          bots.push(await guardarMensaje(c, cv.id, 'sistema', 'El riesgo subió: tu caso volvió a la lista de urgentes.', { tipo: 'alerta' }));
        }
        k = (await c.query(`update casos set riesgo = $2, urgente = $3, senales = $4, temas = $5, seguro = $6, menor = $7, mensaje_clave_id = $8, actualizado_en = now(),
            estado = case when $9::boolean then 'esperando' else estado end,
            tomado_por = case when $9::boolean then null else tomado_por end,
            agendado_para = case when $9::boolean then null else agendado_para end,
            escalar_en = case
              when $9::boolean and $10::int > 0 then now() + make_interval(secs => $10::int)
              when estado = 'esperando' and $10::int > 0 then least(coalesce(escalar_en, now() + make_interval(secs => $10::int)), now() + make_interval(secs => $10::int))
              else escalar_en end
          where id = $1 returning *`,
        [k.id, res.risk, !!res.urgent, res.flags, res.themes, res.safe, !!res.minor, clave, volvio, cfg.escalar[res.risk] || 0])).rows[0];
      }
    }
    await guardarBot(c, cv.id, bot, res.forward ? [] : res.chips);
    return { res, mp, bots, k, nuevo, volvio, resumen: k ? await resumenCaso(c, k.id) : null };
  });
  const { res, k, resumen } = s;
  difundirCaso(resumen, s.nuevo || s.volvio);
  if (s.nuevo || s.volvio) avisarDisponibles(resumen).catch(log);
  if (k && res.forward && k.tomado_por) {
    const urgente = (res.analysis && res.analysis.risk) === 'high';
    tr.aUsuario(k.tomado_por, 'mensaje', { casoId: k.id, mensaje: publico(s.mp), urgente });
    if (urgente || !tr.usuarioConectado(k.tomado_por)) {
      avisos.aUsuarios([k.tomado_por], { titulo: `Caso N.º ${resumen.folio}`, cuerpo: urgente ? 'Mensaje urgente de la persona.' : 'La persona te escribió.', url: '/equipo#caso-' + k.id, etiqueta: 'caso-' + k.id, urgente }).catch(log);
    }
  }
  return {
    miMensaje: String(s.mp.id),
    mensajes: s.bots.map(publico),
    chips: res.forward ? [] : res.chips || [],
    crisis: crisisDe(res.resources, res.facts),
    mostrarCrisis: !!res.showCrisis,
    caso: estadoPersona(k, resumen)
  };
}

/* ── equipo ── */
async function listarCasos(u) {
  const ids = (await q(`select id from casos where estado in ('esperando', 'guardia') or (tomado_por = $1 and estado in ('en_atencion', 'agendado'))
                        order by urgente desc, case riesgo when 'high' then 0 when 'mid' then 1 else 2 end, creado_en`, [u.id])).rows;
  const out = [];
  for (const f of ids) out.push(await resumenCaso(pool, f.id));
  return out;
}

async function detalleCaso(u, id) {
  const r = await resumenCaso(pool, id);
  if (!r) throw falla(404, 'Ese caso no existe.');
  if (!EN_COLA.includes(r.estado) && r.tomadoPor !== u.id) throw falla(403, 'Este caso lo atiende otra persona.');
  let registro = null;
  if (r.tomadoPor === u.id) {
    const k = (await q('select conversacion_id from casos where id = $1', [id])).rows[0];
    registro = (await q(SQL_HISTORIA, [k.conversacion_id])).rows.map(publico);
    await auditar(pool, u.id, 'ver registro', id);
  }
  return { caso: r, registro };
}

async function tomar(u, id) {
  const s = await tx(async c => {
    const k = (await c.query(`update casos set estado = 'en_atencion', tomado_por = $2, tomado_en = now(), escalar_en = null, actualizado_en = now()
        where id = $1 and (estado in ('esperando', 'guardia') or (estado = 'agendado' and tomado_por = $2)) returning *`, [id, u.id])).rows[0];
    if (!k) throw falla(409, 'Otro especialista ya tomó este caso, o ya no está disponible.');
    await eventoBot(c, k.conversacion_id, 'accepted', {});
    const ms = [await guardarMensaje(c, k.conversacion_id, 'sistema', `${nombreDe(u)} tomó tu caso y se une ahora.`)];
    await auditar(c, u.id, 'tomar caso', k.id);
    return { k, ms, resumen: await resumenCaso(c, k.id) };
  });
  difundir(s);
  avisos.aConversacion(s.k.conversacion_id, { titulo: 'ConténMente', cuerpo: 'Un especialista tomó tu caso y te va a escribir.', url: '/conversar', etiqueta: 'contenmente' }).catch(log);
  return s.resumen;
}

async function agendar(u, id, para) {
  const f = new Date(para);
  if (Number.isNaN(f.getTime()) || f.getTime() < Date.now() + 60e3 || f.getTime() > Date.now() + 60 * 864e5) throw falla(400, 'Elige una fecha y hora futuras, dentro de los próximos 60 días.');
  const s = await tx(async c => {
    const k0 = (await c.query('select * from casos where id = $1 for update', [id])).rows[0];
    if (!k0 || k0.estado === 'cerrado') throw falla(404, 'El caso no existe o ya se cerró.');
    const mio = k0.tomado_por === u.id;
    if (!EN_COLA.includes(k0.estado) && !mio) throw falla(409, 'Este caso lo atiende otra persona.');
    if (k0.riesgo === 'high' && !mio) throw falla(409, 'Con riesgo alto solo se puede atender ahora o derivar a guardia.');
    const k = (await c.query(`update casos set estado = 'agendado', tomado_por = $2, agendado_para = $3, recordado = false, escalar_en = null, actualizado_en = now()
        where id = $1 returning *`, [id, u.id, f])).rows[0];
    const conAviso = (await c.query('select 1 from suscripciones where conversacion_id = $1 limit 1', [k.conversacion_id])).rowCount > 0;
    const ms = await eventoBot(c, k.conversacion_id, 'tomorrow', { cuando: cuandoTexto(f), con: nombreDe(u), aviso: conAviso });
    await auditar(c, u.id, 'agendar caso', k.id, { para: f.toISOString() });
    return { k, ms, resumen: await resumenCaso(c, k.id) };
  });
  difundir(s);
  avisos.aConversacion(s.k.conversacion_id, { titulo: 'ConténMente', cuerpo: 'Tu hora con un especialista quedó agendada.', url: '/conversar', etiqueta: 'contenmente' }).catch(log);
  return s.resumen;
}

async function derivar(u, id) {
  const s = await tx(async c => {
    const k0 = (await c.query('select * from casos where id = $1 for update', [id])).rows[0];
    if (!k0 || k0.estado === 'cerrado') throw falla(404, 'El caso no existe o ya se cerró.');
    if (!EN_COLA.includes(k0.estado) && k0.tomado_por !== u.id && u.rol !== 'admin') throw falla(409, 'Este caso lo atiende otra persona.');
    const k = (await c.query(`update casos set estado = 'guardia', escalado_en = now(), escalar_en = null, tomado_por = null, tomado_en = null, agendado_para = null, actualizado_en = now()
        where id = $1 returning *`, [id])).rows[0];
    const ms = await eventoBot(c, k.conversacion_id, 'refer', { guardia: await contar(c, true) });
    await auditar(c, u.id, 'derivar a guardia', k.id);
    return { k, ms, resumen: await resumenCaso(c, k.id) };
  });
  difundir(s);
  avisarGuardia(s.resumen, `Derivado a guardia por ${nombreDe(u)}.`).catch(log);
  return s.resumen;
}

async function cerrar(u, id, nota) {
  const s = await tx(async c => {
    const k = (await c.query(`update casos set estado = 'cerrado', cerrado_en = now(), nota_cierre = $3, escalar_en = null, actualizado_en = now()
        where id = $1 and estado <> 'cerrado' and (tomado_por = $2 or $4::boolean) returning *`,
    [id, u.id, nota ? cifrar(String(nota).slice(0, 4000)) : null, u.rol === 'admin'])).rows[0];
    if (!k) throw falla(409, 'Solo quien atiende el caso puede cerrarlo.');
    const ms = await eventoBot(c, k.conversacion_id, 'closed');
    await auditar(c, u.id, 'cerrar caso', k.id);
    return { k, ms, resumen: await resumenCaso(c, k.id) };
  });
  difundir(s);
  return s.resumen;
}

async function mensajeEspecialista(u, id, texto, tipo = 'texto') {
  texto = String(texto || '').trim().slice(0, 2000);
  if (!texto) throw falla(400, 'Escribe un mensaje.');
  const s = await tx(async c => {
    let k = (await c.query('select * from casos where id = $1 for update', [id])).rows[0];
    if (!k || k.tomado_por !== u.id || !['en_atencion', 'agendado'].includes(k.estado)) throw falla(409, 'Solo quien atiende el caso puede escribir.');
    const ms = [];
    if (k.estado === 'agendado') {
      k = (await c.query("update casos set estado = 'en_atencion', tomado_en = now() where id = $1 returning *", [id])).rows[0];
      await eventoBot(c, k.conversacion_id, 'accepted', {});
    }
    ms.push(await guardarMensaje(c, k.conversacion_id, 'especialista', texto, { usuarioId: u.id, nombre: nombreDe(u), tipo }));
    await c.query('update casos set actualizado_en = now() where id = $1', [id]);
    await c.query('update conversaciones set ultima_actividad = now() where id = $1', [k.conversacion_id]);
    return { k, ms, resumen: await resumenCaso(c, k.id) };
  });
  const m = publico(s.ms[0]);
  tr.aPersona(s.k.conversacion_id, 'mensaje', m);
  tr.aPersona(s.k.conversacion_id, 'estado', estadoPersona(s.k, s.resumen));
  tr.aUsuario(u.id, 'mensaje', { casoId: s.k.id, mensaje: m });
  if (!tr.personaConectada(s.k.conversacion_id)) avisos.aConversacion(s.k.conversacion_id, { titulo: 'ConténMente', cuerpo: 'Tienes un mensaje nuevo.', url: '/conversar', etiqueta: 'contenmente' }).catch(log);
  return m;
}

/* Invitación a videollamada: sala privada con nombre aleatorio; la persona entra desde el navegador. */
const videollamada = (u, id) => mensajeEspecialista(u, id, `${cfg.videoBase}/ContenMente-${require('crypto').randomBytes(10).toString('hex')}`, 'videollamada');

/* ── trabajos periódicos ── */
async function escalar() {
  const lista = await tx(async c => {
    const filas = (await c.query("select * from casos where estado = 'esperando' and escalar_en <= now() order by escalar_en limit 20 for update skip locked")).rows;
    const out = [];
    for (const k of filas) {
      await c.query("update casos set estado = 'guardia', escalado_en = now(), escalar_en = null, actualizado_en = now() where id = $1", [k.id]);
      const ms = await eventoBot(c, k.conversacion_id, 'planB', { guardia: await contar(c, true) });
      const kk = (await c.query('select * from casos where id = $1', [k.id])).rows[0];
      out.push({ k: kk, ms, resumen: await resumenCaso(c, k.id) });
    }
    return out;
  });
  for (const s of lista) {
    difundir(s);
    avisarGuardia(s.resumen, `Nadie tomó el caso a tiempo (prioridad ${PRIO[s.resumen.riesgo]}).`).catch(log);
  }
}

async function sinRespuesta() {
  const filas = (await q(`select k.id, k.tomado_por, x.id urg_id,
      (select max(m.id) from mensajes m where m.conversacion_id = k.conversacion_id and m.autor = 'especialista') esp_id
    from casos k
    join lateral (select id, creado_en from mensajes m where m.conversacion_id = k.conversacion_id and m.autor = 'persona' and m.riesgo = 'high' order by id desc limit 1) x on true
    where k.estado = 'en_atencion' and x.creado_en < now() - make_interval(secs => $1::int)
      and (k.alerta_sin_respuesta_en is null or k.alerta_sin_respuesta_en < x.creado_en)`, [cfg.sinRespuestaSeg])).rows;
  for (const f of filas) {
    if (f.esp_id && Number(f.esp_id) > Number(f.urg_id)) continue;
    await q('update casos set alerta_sin_respuesta_en = now() where id = $1', [f.id]);
    const r = await resumenCaso(pool, f.id);
    const texto = `Hay un mensaje urgente sin respuesta hace más de ${Math.max(1, Math.round(cfg.sinRespuestaSeg / 60))} min.`;
    tr.aUsuario(f.tomado_por, 'alerta', { casoId: f.id, folio: r.folio, texto });
    avisos.aUsuarios([f.tomado_por], { titulo: `Caso N.º ${r.folio}`, cuerpo: texto, url: '/equipo#caso-' + f.id, etiqueta: 'caso-' + f.id, urgente: true }).catch(log);
    avisarGuardia(r, texto).catch(log);
  }
}

async function recordatorios() {
  const filas = (await q(`update casos set recordado = true where estado = 'agendado' and not recordado and agendado_para <= now() + interval '5 minutes'
                          returning id, folio, tomado_por, conversacion_id`)).rows;
  for (const f of filas) {
    tr.aUsuario(f.tomado_por, 'alerta', { casoId: f.id, folio: pad(f.folio), texto: 'Tu hora agendada es en 5 minutos o menos.' });
    avisos.aUsuarios([f.tomado_por], { titulo: `Hora agendada · caso N.º ${pad(f.folio)}`, cuerpo: 'Es en 5 minutos o menos.', url: '/equipo#caso-' + f.id, etiqueta: 'hora-' + f.id, urgente: true }).catch(log);
    avisos.aConversacion(f.conversacion_id, { titulo: 'ConténMente', cuerpo: 'Tu hora con el especialista es en unos minutos. Vuelve a ConténMente.', url: '/conversar', etiqueta: 'contenmente' }).catch(log);
  }
}

async function limpieza() {
  await q('delete from sesiones where expira_en < now()');
  if (cfg.retencionDias > 0) {
    const r = await q(`delete from conversaciones c where ultima_actividad < now() - make_interval(days => $1::int)
                       and not exists (select 1 from casos k where k.conversacion_id = c.id and k.estado <> 'cerrado')`, [cfg.retencionDias]);
    if (r.rowCount) console.log(`[limpieza] ${r.rowCount} conversaciones antiguas eliminadas`);
  }
}

module.exports = {
  nuevaConversacion, historiaPersona, mensajePersona,
  listarCasos, detalleCaso, tomar, agendar, derivar, cerrar, mensajeEspecialista, videollamada,
  escalar, sinRespuesta, recordatorios, limpieza, auditar, cuandoTexto
};
