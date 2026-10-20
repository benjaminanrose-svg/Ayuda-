'use strict';
/* Avisos en vivo por Server-Sent Events: personas (por conversación) y equipo (por usuario). */
const personas = new Map();
const equipo = new Map();

function abrir(req, res, mapa, clave) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 4000\n\n');
  let s = mapa.get(clave);
  if (!s) mapa.set(clave, (s = new Set()));
  s.add(res);
  const latido = setInterval(() => res.write(': latido\n\n'), 25000);
  req.on('close', () => {
    clearInterval(latido);
    s.delete(res);
    if (!s.size && mapa.get(clave) === s) mapa.delete(clave);
  });
}

const enviar = (res, evento, datos) => { try { res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`); } catch { /* cerrada */ } };
const a = (mapa, clave, evento, datos) => (mapa.get(clave) || []).forEach(r => enviar(r, evento, datos));

module.exports = {
  abrirPersona: (req, res, convId) => abrir(req, res, personas, convId),
  abrirEquipo: (req, res, usuarioId) => abrir(req, res, equipo, usuarioId),
  aPersona: (convId, evento, datos) => a(personas, convId, evento, datos),
  aUsuario: (usuarioId, evento, datos) => a(equipo, usuarioId, evento, datos),
  aEquipo: (evento, datos) => equipo.forEach(s => s.forEach(r => enviar(r, evento, datos))),
  personaConectada: convId => personas.has(convId),
  usuarioConectado: usuarioId => equipo.has(usuarioId),
  cerrarTodo: () => [personas, equipo].forEach(m => m.forEach(s => s.forEach(r => { try { r.end(); } catch { /* ignorar */ } })))
};
