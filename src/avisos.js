'use strict';
/* Avisos al equipo: en vivo a quien tenga el panel abierto y por Web Push a quien esté disponible. */
const db = require('./db');
const tr = require('./tiempo-real');
const push = require('./push');
const fichas = require('./fichas');

async function ids(sql) { return (await db.q(sql)).rows.map(r => r.id); }
const disponibles = () => ids('select id from usuarios where activo and atiende and disponible');
const guardias = () => ids('select id from usuarios where activo and atiende and disponible and guardia');
const admins = () => ids("select id from usuarios where activo and rol = 'admin'");

async function casoNuevo(id) {
  const f = await fichas.resumen(id);
  if (!f) return null;
  tr.aEquipo('caso', { accion: 'nuevo', caso: f });
  await push.aUsuarios(await disponibles(), {
    titulo: `Nuevo caso · prioridad ${f.nivel.toLowerCase()}${f.urgente ? ' · urgente' : ''}`,
    cuerpo: `Ficha ${fichas.folio(f.folio)} · ${f.org}`, url: '/equipo', urgente: f.riesgo === 'high', etiqueta: 'caso-' + f.id
  });
  return f;
}

async function casoActualizado(id) {
  const f = await fichas.resumen(id);
  if (!f) return null;
  if (['esperando', 'escalado'].includes(f.estado)) tr.aEquipo('caso', { accion: 'actualizado', caso: f });
  else {
    const duenos = [f.tomadoPor, f.agendadoCon].filter(Boolean);
    tr.aEquipo('caso', { accion: 'quitado', id: f.id }, uid => !duenos.includes(uid));
    for (const uid of duenos) tr.aUsuario(uid, 'caso', { accion: 'actualizado', caso: f });
  }
  return f;
}

/* Caso sin tomar a tiempo, derivado o con un mensaje urgente sin respuesta: se avisa a la guardia; si no hay guardia, a todos los disponibles y a administración. */
async function aGuardia(id, motivo) {
  const f = await fichas.resumen(id);
  if (!f) return 0;
  let destino = await guardias();
  const hayGuardia = destino.length > 0;
  if (!hayGuardia) destino = [...new Set([...(await disponibles()), ...(await admins())])];
  tr.aEquipo('caso', { accion: 'actualizado', caso: f });
  for (const uid of destino) tr.aUsuario(uid, 'alerta', { casoId: f.id, folio: f.folio, motivo });
  await push.aUsuarios(destino, { titulo: motivo, cuerpo: `Ficha ${fichas.folio(f.folio)} · prioridad ${f.nivel.toLowerCase()}`, url: '/equipo', urgente: true, etiqueta: 'guardia-' + f.id });
  return hayGuardia ? destino.length : 0;
}

async function mensajeAlEspecialista(id, mensaje) {
  const f = await fichas.resumen(id);
  if (!f || !f.tomadoPor) return;
  tr.aUsuario(f.tomadoPor, 'mensaje', { casoId: f.id, mensaje });
  tr.aUsuario(f.tomadoPor, 'caso', { accion: 'actualizado', caso: f });
  const urgente = mensaje.riesgo === 'high';
  if (urgente || !tr.usuarioConectado(f.tomadoPor)) {
    await push.aUsuarios([f.tomadoPor], { titulo: urgente ? 'Mensaje urgente de la persona' : 'Mensaje nuevo', cuerpo: `Ficha ${fichas.folio(f.folio)}`, url: '/equipo', urgente, etiqueta: 'mensaje-' + f.id });
  }
}

module.exports = { casoNuevo, casoActualizado, aGuardia, mensajeAlEspecialista, disponibles, guardias };
