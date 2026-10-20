/* Pruebas del motor en modo servidor: estado guardado/restaurado y honestidad sin especialistas. */
const E = require('./engine.js'), SC = require('./scenarios.js'), CASES = require('./cases.js');
const OPTS = { planB: { guardia: 0 }, accepted: {}, tomorrow: { cuando: 'mañana a las 10:00', con: 'Ps. Camila Fuentes', aviso: false } };
const EV = { '@planB': 'planB', '@accept': 'accepted', '@tomorrow': 'tomorrow' };
let fallas = 0, turnos = 0;
const falla = (...m) => { fallas++; if (fallas <= 15) console.log('FALLA', ...m); };
const limpio = r => JSON.stringify({ replies: r.replies, chips: r.chips, risk: r.risk, urgent: r.urgent, showCrisis: r.showCrisis, startSearch: r.startSearch, flags: r.flags, themes: r.themes, safe: r.safe, minor: r.minor, resources: r.resources, forward: !!r.forward });
function correr(nombre, msgs, pros) {
  const a = E.create(); a.setPros(pros); a.start();
  for (const m of msgs) {
    if (m[0] === '@') { const ev = EV[m]; const r = a.event(ev, pros === null ? undefined : OPTS[ev]); revisar(nombre, m, r, pros); continue; }
    const b = E.create(a.exportState()); b.setPros(pros);
    const ra = a.reply(m), rb = b.reply(m); turnos++;
    if (limpio(ra) !== limpio(rb)) falla('estado restaurado distinto', nombre, JSON.stringify(m));
    if (a.exportState() !== b.exportState()) falla('estado final distinto', nombre, JSON.stringify(m));
    revisar(nombre, m, ra, pros);
  }
}
function revisar(nombre, m, r, pros) {
  if (pros !== 0) return;
  for (const x of r.replies) if (typeof x === 'string' && E.PROMESA.test(x)) falla('promesa sin especialistas', nombre, JSON.stringify(m), '→', x);
}
for (const pros of [null, 0, 2]) for (const [nombre, msgs] of SC) correr(nombre, msgs, pros);
// conversaciones aleatorias sin especialistas
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pool = CASES.map(c => c[0]).concat(['@planB', 'no', 'sí', 'ya te dije', 'cuánto falta?', 'quiero hablar con una persona', 'nadie me responde', 'gracias']);
for (let i = 0; i < 1500; i++) { const n = 3 + Math.floor(rnd() * 9); const msgs = []; for (let j = 0; j < n; j++) msgs.push(pool[Math.floor(rnd() * pool.length)]); correr('aleatoria ' + i, msgs, 0); }
// eventos de producción
const b = E.create(); b.setPros(1); b.start(); b.reply('me quiero matar');
const t = b.event('tomorrow', { cuando: 'el jueves a las 16:00', con: 'Ps. Tomás Reyes', aviso: true }).replies.join(' ');
if (!/jueves a las 16:00 con Ps\. Tomás Reyes/.test(t) || !/avisar en este navegador/.test(t)) falla('texto de agenda', t);
const c = E.create(); c.start(); c.reply('estoy muy triste'); c.event('accepted', {}); if (c.state.mode !== 'humano') falla('tomado no pasa a modo humano');
const cer = c.event('closed').replies.join(' '); if (c.state.mode !== 'normal' || !/terminó/.test(cer)) falla('cierre');
const d = E.create(); d.setPros(0); d.start(); d.reply('me quiero matar'); const pb = d.event('planB', { guardia: 0 }).replies.join(' ');
if (E.PROMESA.test(pb) || !/131/.test(pb)) falla('plan B sin guardia', pb);
console.log(`${turnos} turnos revisados, ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
