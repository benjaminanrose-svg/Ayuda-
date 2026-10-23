'use strict';
/* Pruebas de punta a punta de la API con un Postgres real (embedded-postgres). Ejecutar: node --test test/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const EmbeddedPostgres = require('embedded-postgres').default;

const PUERTO_BD = 55000 + Math.floor(Math.random() * 3000);
const dir = path.join(os.tmpdir(), 'ra-pg-' + process.pid + '-' + Date.now()); // lo crea initdb con su propio usuario
const bd = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'prueba', port: PUERTO_BD, persistent: false, onLog: () => {} });

Object.assign(process.env, {
  DATABASE_URL: `postgres://postgres:prueba@127.0.0.1:${PUERTO_BD}/prueba`,
  CLAVE_DATOS: 'frase-secreta-de-prueba-con-mas-de-32-caracteres',
  ADMIN_CORREO: 'admin@ejemplo.cl', ADMIN_CLAVE: 'clave-inicial-123',
  ESCALAR_ALTO_SEG: '1', SIN_RESPUESTA_SEG: '1', TZ: 'America/Santiago'
});

let srv, base, svc, db;
const cookies = {};
function guardarCookies(quien, res) {
  for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, v] = kv.split('='); (cookies[quien] = cookies[quien] || {})[k] = v; }
}
async function pedir(quien, metodo, ruta, cuerpo, extra = {}) {
  const h = { origin: base, ...(extra.headers || {}) };
  const c = cookies[quien];
  if (c) h.cookie = Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cuerpo !== undefined) h['content-type'] = 'application/json';
  const res = await fetch(base + ruta, { method: metodo, headers: h, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  guardarCookies(quien, res);
  const datos = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { estado: res.status, datos };
}
function escuchar(quien, ruta) {
  const eventos = [];
  const ctl = new AbortController();
  const h = { cookie: Object.entries(cookies[quien] || {}).map(([k, v]) => `${k}=${v}`).join('; ') };
  fetch(base + ruta, { headers: h, signal: ctl.signal }).then(async res => {
    const lector = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await lector.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const bloque = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /^event: (.+)$/m.exec(bloque), da = /^data: (.+)$/m.exec(bloque);
        if (ev && da) eventos.push({ evento: ev[1], datos: JSON.parse(da[1]) });
      }
    }
  }).catch(() => {});
  return {
    eventos, cerrar: () => ctl.abort(),
    esperar: async (pred, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = eventos.find(pred); if (e) return e; await new Promise(r => setTimeout(r, 40)); } throw new Error('No llegó el evento esperado'); }
  };
}
const textos = r => r.datos.mensajes.map(m => m.texto).join(' | ');

test.before(async () => {
  await bd.initialise(); await bd.start(); await bd.createDatabase('prueba');
  await require('../src/migrar')();
  await require('../src/avisos').iniciar();
  await require('../src/sesion').adminInicial(require('../src/config'));
  svc = require('../src/servicio'); db = require('../src/db');
  srv = require('../src/app').crearApp().listen(0);
  await new Promise(r => srv.once('listening', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
test.after(async () => {
  if (srv) { srv.closeAllConnections(); srv.close(); }
  if (db) await db.pool.end();
  await bd.stop().catch(() => {});
  fs.rmSync(dir, { recursive: true, force: true });
});

let casoId, ganador, perdedor;

test('la persona conversa y, sin especialistas conectados, el bot lo dice con honestidad', async () => {
  const ini = await pedir('p1', 'GET', '/api/persona/inicio');
  assert.equal(ini.estado, 200); assert.equal(ini.datos.conversacion, false); assert.equal(ini.datos.mensajes.length, 2);
  const sinJson = await fetch(base + '/api/persona/mensajes', { method: 'POST', headers: { origin: base }, body: 'texto=hola' });
  assert.equal(sinJson.status, 415);
  const ajeno = await pedir('x', 'POST', '/api/persona/mensajes', { texto: 'hola' }, { headers: { origin: 'https://otro.sitio' } });
  assert.equal(ajeno.estado, 403);
  const r = await pedir('p1', 'POST', '/api/persona/mensajes', { texto: 'me quiero matar' });
  assert.equal(r.estado, 200);
  assert.ok(cookies.p1.ra_conv, 'debe crear la cookie de la conversación');
  assert.match(textos(r), /no hay especialistas conectados/);
  assert.equal(r.datos.caso.paso, 'buscando');
  assert.equal(r.datos.caso.folio, '000001');
  assert.ok(r.datos.crisis && r.datos.crisis.recursos.some(x => x.numero === '*4141'));
  const crudo = (await db.q('select contenido, estado_bot from mensajes, conversaciones')).rows.map(x => x.contenido.toString('latin1') + x.estado_bot.toString('latin1')).join('');
  assert.ok(!crudo.includes('matar'), 'los textos deben quedar cifrados en la base');
});

test('el administrador ingresa, cambia la clave y crea especialistas', async () => {
  const mal = await pedir('a', 'POST', '/api/equipo/ingresar', { correo: 'admin@ejemplo.cl', clave: 'otra' });
  assert.equal(mal.estado, 401);
  const ok = await pedir('a', 'POST', '/api/equipo/ingresar', { correo: 'ADMIN@ejemplo.cl', clave: 'clave-inicial-123' });
  assert.equal(ok.estado, 200);
  const bloqueado = await pedir('a', 'GET', '/api/equipo/casos');
  assert.equal(bloqueado.estado, 403); assert.equal(bloqueado.datos.cambiarClave, true);
  assert.equal((await pedir('a', 'POST', '/api/equipo/clave', { actual: 'clave-inicial-123', nueva: 'nueva-clave-admin-1' })).estado, 200);
  for (const [quien, correo, guardia] of [['e1', 'camila@ejemplo.cl', true], ['e2', 'tomas@ejemplo.cl', false]]) {
    const c = await pedir('a', 'POST', '/api/admin/usuarios', { correo, nombre: quien === 'e1' ? 'Camila Fuentes' : 'Tomás Reyes', titulo: 'Ps.', guardia });
    assert.equal(c.estado, 200); assert.match(c.datos.claveTemporal, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    assert.equal((await pedir(quien, 'POST', '/api/equipo/ingresar', { correo, clave: c.datos.claveTemporal })).estado, 200);
    assert.equal((await pedir(quien, 'POST', '/api/equipo/clave', { actual: c.datos.claveTemporal, nueva: 'clave-segura-' + quien })).estado, 200);
    assert.equal((await pedir(quien, 'POST', '/api/equipo/disponible', { disponible: true })).datos.disponible, true);
  }
  assert.equal((await pedir('e2', 'GET', '/api/admin/usuarios')).estado, 403);
  assert.equal((await pedir('nadie', 'GET', '/api/equipo/casos')).estado, 401);
});

test('el caso aparece en la cola y solo uno puede tomarlo', async () => {
  const cola = await pedir('e1', 'GET', '/api/equipo/casos');
  const k = cola.datos.casos[0];
  assert.equal(k.riesgo, 'high'); assert.equal(k.folio, '000001');
  assert.ok(k.extracto.includes('me quiero matar'));
  casoId = k.id;
  const [a, b] = await Promise.all([pedir('e1', 'POST', `/api/equipo/casos/${casoId}/tomar`, {}), pedir('e2', 'POST', `/api/equipo/casos/${casoId}/tomar`, {})]);
  assert.deepEqual([a.estado, b.estado].sort(), [200, 409]);
  [ganador, perdedor] = a.estado === 200 ? ['e1', 'e2'] : ['e2', 'e1'];
  assert.equal((await pedir(perdedor, 'GET', `/api/equipo/casos/${casoId}`)).estado, 403);
  const d = await pedir(ganador, 'GET', `/api/equipo/casos/${casoId}`);
  assert.ok(d.datos.registro.some(m => m.autor === 'persona' && m.texto === 'me quiero matar'));
});

test('especialista y persona conversan en vivo', async () => {
  const sp = escuchar('p1', '/api/persona/stream');
  const se = escuchar(ganador, '/api/equipo/stream');
  await new Promise(r => setTimeout(r, 150));
  const m = await pedir(ganador, 'POST', `/api/equipo/casos/${casoId}/mensajes`, { texto: 'Hola, soy tu psicóloga. Estoy contigo.' });
  assert.equal(m.estado, 200);
  await sp.esperar(e => e.evento === 'mensaje' && e.datos.autor === 'especialista' && /Estoy contigo/.test(e.datos.texto));
  const p = await pedir('p1', 'POST', '/api/persona/mensajes', { texto: 'gracias por venir' });
  assert.equal(p.datos.mensajes.length, 0, 'con especialista, el bot no responde');
  await se.esperar(e => e.evento === 'mensaje' && e.datos.mensaje.texto === 'gracias por venir');
  assert.equal((await pedir(perdedor, 'POST', `/api/equipo/casos/${casoId}/mensajes`, { texto: 'hola' })).estado, 409);
  const v = await pedir(ganador, 'POST', `/api/equipo/casos/${casoId}/videollamada`, {});
  assert.equal(v.estado, 200); assert.equal(v.datos.mensaje.tipo, 'videollamada');
  assert.match(v.datos.mensaje.texto, /^https:\/\/meet\.jit\.si\/ContenMente-[a-f0-9]{20}$/);
  await sp.esperar(e => e.evento === 'mensaje' && e.datos.tipo === 'videollamada');
  assert.equal((await pedir(perdedor, 'POST', `/api/equipo/casos/${casoId}/videollamada`, {})).estado, 409);
  const ed = await pedir('a', 'PATCH', '/api/admin/usuarios/1', { titulo: 'Ps.', nombre: 'Benjamín Rojas' });
  assert.equal(ed.estado, 200); assert.equal(ed.datos.usuario.nombre, 'Benjamín Rojas');
  assert.equal((await pedir(ganador, 'POST', `/api/equipo/casos/${casoId}/agendar`, { para: '2020-01-01T10:00' })).estado, 400);
  assert.equal((await pedir(ganador, 'POST', `/api/equipo/casos/${casoId}/cerrar`, { nota: 'Contenida, con red de apoyo.' })).estado, 200);
  await sp.esperar(e => e.evento === 'mensaje' && /terminó/.test(e.datos.texto));
  sp.cerrar(); se.cerrar();
});

test('si nadie toma un caso urgente, pasa a guardia y la persona lo sabe', async () => {
  const r = await pedir('p2', 'POST', '/api/persona/mensajes', { texto: 'me quiero morir, ya no aguanto' });
  assert.equal(r.datos.caso.paso, 'buscando');
  assert.doesNotMatch(textos(r), /no hay especialistas conectados/);
  await new Promise(res => setTimeout(res, 1300));
  await svc.escalar();
  const h = await pedir('p2', 'GET', '/api/persona/inicio');
  assert.match(h.datos.mensajes.map(m => m.texto).join(' '), /equipo de guardia/);
  const cola = await pedir('e1', 'GET', '/api/equipo/casos');
  assert.equal(cola.datos.casos.find(k => k.folio === '000002').estado, 'guardia');
});

test('agendar crea la hora y la persona recibe el aviso', async () => {
  const r = await pedir('p3', 'POST', '/api/persona/mensajes', { texto: 'quiero hablar con un psicólogo' });
  const k = (await pedir('e2', 'GET', '/api/equipo/casos')).datos.casos.find(x => x.estado === 'esperando');
  assert.ok(k, 'debe existir un caso en espera: ' + JSON.stringify(r.datos.caso));
  const man = new Date(Date.now() + 864e5); man.setHours(10, 0, 0, 0);
  const a = await pedir('e2', 'POST', `/api/equipo/casos/${k.id}/agendar`, { para: man.toISOString() });
  assert.equal(a.estado, 200); assert.equal(a.datos.caso.estado, 'agendado');
  const h = await pedir('p3', 'GET', '/api/persona/inicio');
  assert.match(h.datos.mensajes.map(m => m.texto).join(' '), /mañana a las 10:00 con Ps\. Tomás Reyes/);
  assert.equal(h.datos.caso.paso, 'agendado');
});

test('directorio: un psicólogo se registra, completa su perfil, se aprueba y recibe una solicitud', async () => {
  let r = await pedir('ps', 'POST', '/api/directorio/registro', { titulo: 'Ps.', nombre: 'Javiera Soto', correo: 'javiera@ejemplo.cl', clave: 'clave-javiera-1' });
  assert.equal(r.estado, 200);
  r = await pedir('ps', 'GET', '/api/directorio/mio');
  assert.equal(r.datos.perfil.estado, 'borrador'); assert.equal(r.datos.perfil.slug, 'javiera-soto');
  assert.equal((await pedir('ps', 'GET', '/api/equipo/casos')).estado, 403, 'una cuenta de directorio no ve casos');
  assert.equal((await pedir('ps', 'POST', '/api/directorio/mio/enviar', {})).estado, 400, 'perfil incompleto no se envía');
  r = await pedir('ps', 'PUT', '/api/directorio/mio', { titulo: 'Ps.', nombre: 'Javiera Soto', registroSis: '123456', modalidad: 'ambas', comuna: 'Melipilla', precio: '30000',
    resumen: 'Psicóloga clínica. Acompaño a adolescentes y adultos con ansiedad, ánimo bajo y procesos de duelo, con un enfoque cercano.', especialidades: ['Ansiedad', 'Duelo'],
    estudios: [{ tipo: 'titulo', titulo: 'Psicóloga', institucion: 'Universidad de Chile', anio: '2018' }], experiencia: [{ cargo: 'Psicóloga', lugar: 'CESFAM', periodo: '2019 – hoy' }], linkedin: 'https://www.linkedin.com/in/javiera' });
  assert.equal(r.estado, 200); assert.equal(r.datos.perfil.precio, 30000);
  assert.equal((await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto')).estado, 404, 'no se ve antes de aprobar');
  assert.equal((await pedir('ps', 'POST', '/api/directorio/mio/enviar', {})).datos.estado, 'pendiente');
  r = await pedir('a', 'GET', '/api/admin/perfiles');
  const pf = r.datos.perfiles.find(x => x.slug === 'javiera-soto');
  assert.equal(pf.estado, 'pendiente');
  assert.equal((await pedir('a', 'POST', `/api/admin/perfiles/${pf.id}/aprobar`, {})).datos.estado, 'publicado');
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles');
  assert.ok(r.datos.perfiles.some(x => x.slug === 'javiera-soto' && x.especialidades.includes('Duelo')));
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto');
  assert.equal(r.datos.perfil.verificado, true); assert.equal(r.datos.perfil.estado, undefined, 'el público no ve datos internos');
  const pdf = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 prueba').toString('base64');
  assert.equal((await pedir('ps', 'POST', '/api/directorio/mio/documentos', { tipo: 'titulo', nombre: 'Título', archivo: 'data:text/html;base64,' + Buffer.from('<script>').toString('base64') })).estado, 400, 'solo PDF o imagen');
  const doc = (await pedir('ps', 'POST', '/api/directorio/mio/documentos', { tipo: 'titulo', nombre: 'Título de Psicóloga', archivo: pdf, publico: false })).datos.id;
  assert.equal((await pedir('nadie', 'GET', '/api/directorio/documentos/' + doc)).estado, 404, 'un documento privado no se ve en público');
  assert.equal((await pedir('a', 'GET', '/api/directorio/documentos/' + doc)).estado, 200, 'administración sí lo ve');
  await pedir('ps', 'PATCH', '/api/directorio/mio/documentos/' + doc, { publico: true });
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto');
  assert.equal(r.datos.perfil.documentos.length, 1); assert.ok(r.datos.perfil.fondo.startsWith('/img/fondos/'));
  r = await pedir('z', 'POST', '/api/directorio/perfiles/javiera-soto/solicitudes', { nombre: 'Ana', contacto: '+56 9 1234 5678', mensaje: 'Busco hora para mi hija' });
  assert.equal(r.estado, 200);
  r = await pedir('ps', 'GET', '/api/directorio/mio/solicitudes');
  assert.equal(r.datos.solicitudes[0].contacto, '+56 9 1234 5678');
  const fila = (await db.q('select contenido from solicitudes limit 1')).rows[0];
  assert.ok(!fila.contenido.toString('latin1').includes('Ana'), 'la solicitud se guarda cifrada');
  r = await pedir('ps', 'PUT', '/api/directorio/mio', { titulo: 'Ps.', nombre: 'Javiera Soto Pérez', registroSis: '123456', resumen: 'x'.repeat(90), especialidades: ['Ansiedad'], estudios: [{ titulo: 'Psicóloga' }] });
  assert.equal(r.datos.volvioARevision, true, 'cambiar el nombre vuelve a revisión');
});

test('agenda: el psicólogo publica su horario, un paciente reserva, no hay doble reserva y puede cancelar', async () => {
  const todos = [1, 2, 3, 4, 5, 6, 7].map(dia => ({ dia, desde: '00:00', hasta: '23:45' }));
  const pf = (await pedir('a', 'GET', '/api/admin/perfiles')).datos.perfiles.find(x => x.slug === 'javiera-soto');
  await pedir('a', 'POST', `/api/admin/perfiles/${pf.id}/aprobar`, {});
  let r = await pedir('ps', 'PUT', '/api/directorio/mio/agenda', { agenda: { bloques: todos, duracion: 50, descanso: 10, anticipacion: 0, dias: 3 }, bloqueos: [] });
  assert.ok(r.datos.libres > 10);
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto/horas');
  const hora = r.datos.horas[0];
  assert.ok(hora > Date.now());
  const datos = { inicio: new Date(hora).toISOString(), modalidad: 'online', nombre: 'Pedro', contacto: 'pedro@ejemplo.cl', motivo: 'Ansiedad en el trabajo' };
  r = await pedir('z', 'POST', '/api/directorio/perfiles/javiera-soto/citas', datos);
  assert.equal(r.estado, 200); assert.match(r.datos.enlace, /^\/cita\/[\w-]{20,}$/);
  const tok = r.datos.enlace.split('/').pop();
  assert.equal((await pedir('x', 'POST', '/api/directorio/perfiles/javiera-soto/citas', datos)).estado, 409, 'no se puede reservar la misma hora dos veces');
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto/horas');
  assert.ok(!r.datos.horas.includes(hora), 'la hora reservada desaparece');
  r = await pedir('nadie', 'GET', '/api/directorio/citas/' + tok);
  assert.equal(r.datos.cita.estado, 'confirmada'); assert.match(r.datos.cita.sala, /^https:\/\/meet\.jit\.si\/ContenMente-/);
  assert.equal(r.datos.cita.nombre, undefined, 'el enlace no expone datos del paciente');
  r = await pedir('nadie', 'GET', '/api/directorio/citas/' + tok + '/calendario.ics');
  assert.match(r.datos, /BEGIN:VEVENT[\s\S]*SUMMARY:Sesión con Ps\. Javiera/);
  r = await pedir('ps', 'GET', '/api/directorio/mio/agenda');
  const c = r.datos.citas.find(x => +new Date(x.inicio) === hora);
  assert.equal(c.contacto, 'pedro@ejemplo.cl');
  const fila = (await db.q('select datos from citas where id = $1', [c.id])).rows[0];
  assert.ok(!fila.datos.toString('latin1').includes('Pedro'), 'los datos del paciente van cifrados');
  assert.equal((await pedir('nadie', 'GET', '/api/directorio/citas/token-inventado')).estado, 404);
  assert.equal((await pedir('nadie', 'POST', '/api/directorio/citas/' + tok + '/cancelar', { motivo: 'Me enfermé' })).estado, 200);
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto/horas');
  assert.ok(r.datos.horas.includes(hora), 'al cancelar, la hora vuelve a quedar libre');
  const manana = new Date(hora); const f = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
  await pedir('ps', 'PUT', '/api/directorio/mio/agenda', { agenda: { bloques: todos, duracion: 50, descanso: 10, anticipacion: 0, dias: 3 }, bloqueos: [f] });
  r = await pedir('nadie', 'GET', '/api/directorio/perfiles/javiera-soto/horas');
  assert.ok(!r.datos.horas.includes(hora), 'un día bloqueado no muestra horas');
});

test('límite de intentos de ingreso', async () => {
  let ultimo;
  for (let i = 0; i < 9; i++) ultimo = await pedir('z', 'POST', '/api/equipo/ingresar', { correo: 'nadie@ejemplo.cl', clave: 'x' + i });
  assert.equal(ultimo.estado, 429);
});
