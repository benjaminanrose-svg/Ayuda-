'use strict';
/* Avisos en vivo por Server-Sent Events: personas (por conversación) y equipo (por usuario). */
const personas = new Map();
const equipo = new Map();
const salidas = new Map();
let alPresencia = null;

function abrir(req, res, mapa, clave) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 4000\n\n');
  let s = mapa.get(clave);
  const nueva = !s;
  if (!s) mapa.set(clave, (s = new Set()));
  s.add(res);
  if (mapa === personas) {
    if (salidas.has(clave)) { clearTimeout(salidas.get(clave)); salidas.delete(clave); } // se reconectó: sigue en línea
    else if (nueva && alPresencia) alPresencia(clave, true);
  }
  const latido = setInterval(() => res.write(': latido\n\n'), 25000);
  req.on('close', () => {
    clearInterval(latido);
    s.delete(res);
    if (!s.size && mapa.get(clave) === s) {
      mapa.delete(clave);
      if (mapa === personas && alPresencia) salidas.set(clave, setTimeout(() => { salidas.delete(clave); if (!personas.has(clave)) alPresencia(clave, false); }, 15000));
    }
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
  personaConectada: convId => personas.has(convId) || salidas.has(convId),
  onPresencia: fn => { alPresencia = fn; },
  usuarioConectado: usuarioId => equipo.has(usuarioId),
  cerrarTodo: () => [personas, equipo].forEach(m => m.forEach(s => s.forEach(r => { try { r.end(); } catch { /* ignorar */ } })))
};
