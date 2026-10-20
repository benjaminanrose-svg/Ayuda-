'use strict';
/* Eventos en vivo por Server-Sent Events. Una conexión por pestaña; latido cada 25 s para que el proxy no la corte.
   Funciona con una réplica. Para varias réplicas, publicar los eventos por LISTEN/NOTIFY de Postgres. */
const conv = new Map(), usr = new Map();

function agregar(mapa, id, res) { if (!mapa.has(id)) mapa.set(id, new Set()); mapa.get(id).add(res); }
function quitar(mapa, id, res) { const s = mapa.get(id); if (s) { s.delete(res); if (!s.size) mapa.delete(id); } }

function abrir(req, res, tipo, id, alAbrir) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
  const mapa = tipo === 'conv' ? conv : usr;
  agregar(mapa, id, res);
  const latido = setInterval(() => res.write(': latido\n\n'), 25e3);
  req.on('close', () => { clearInterval(latido); quitar(mapa, id, res); });
  if (alAbrir) alAbrir();
}

function escribir(set, evento, datos) {
  if (!set) return 0;
  const msg = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const res of set) res.write(msg);
  return set.size;
}

const aConversacion = (id, evento, datos) => escribir(conv.get(id), evento, datos);
const aUsuario = (id, evento, datos) => escribir(usr.get(id), evento, datos);
function aEquipo(evento, datos, filtro) { let n = 0; for (const [id, set] of usr) if (!filtro || filtro(id)) n += escribir(set, evento, datos); return n; }
const conversacionConectada = id => conv.has(id);
const usuarioConectado = id => usr.has(id);
const usuariosConectados = () => [...usr.keys()];

function cerrarTodo() { for (const m of [conv, usr]) for (const set of m.values()) for (const res of set) res.end(); }

module.exports = { abrir, aConversacion, aUsuario, aEquipo, conversacionConectada, usuarioConectado, usuariosConectados, cerrarTodo };
