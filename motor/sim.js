/* Simulador: corre conversaciones y revisa reglas de coherencia en cada turno. */
const E = require('./engine.js');
const SC = require('./scenarios.js');
const CASES = require('./cases.js');

const FOLLOW_CASUAL = /¿(Desde cuándo te vienes|Qué es lo que más te pesa hoy|Cómo ha sido tu día|Cómo está tu cuerpo|Y cómo te hace sentir todo eso|Si pudieras cambiar|Cómo te sientes hoy|Qué te trajo|Qué cosas te han ayudado)/;
const CALL = /(llama|llamar|llames|llamas)\b[^.]*\b(4141|131)\b|\b(4141|131)\b[^.]*atiende/i;
const ASK_WITH = /¿(Hay alguien contigo|Estás con alguien)/;
const ASK_CONTACT = /¿(Hay alguien a quien puedas escribirle|Habría alguien de confianza)/;
const ASK_SAFE = /(lugar seguro|estás a salvo|a salvo ahora)\?/;

function check(turnIdx, msg, r, prevFacts, prevQs, prevBubbles){
  const v = [];
  const text = r.replies.filter(x => typeof x === 'string');
  if (r.forward) return v;
  if (!r.replies.length) v.push('VACIO');
  if (text.length > 4) v.push('MAS_DE_4_BURBUJAS');
  const qs = text.filter(x => /\?\s*$/.test(x));
  if (qs.length > 1) v.push('MAS_DE_1_PREGUNTA');
  for (const q of qs) if (prevQs.includes(q)) v.push('PREGUNTA_REPETIDA: ' + q.slice(0,60));
  for (const b of text) if (b.length > 45 && prevBubbles.includes(b) && !/^(Bien\. Ahora dime 4|Muy bien\. Ahora 3|Vas bien\. Ahora 2|Último: 1|Mira a tu alrededor|Escríbeme 5)/.test(b)) v.push('BURBUJA_REPETIDA: ' + b.slice(0,60));
  if (new Set(text).size !== text.length) v.push('DUPLICADO_EN_TURNO');
  if (text.some(x => /undefined|null|NaN|\$\{/.test(x))) v.push('TEXTO_ROTO');
  const emergencyLike = ['EMERGENCIA','PLAN','LUGAR_PELIGRO','AUTOLESION','VIOLENCIA','DANO_OTROS','TERCERO','YA_LLAME','LUGAR_ATENCION','FAQ_NUMEROS','BOT_LLAMA','PANICO','LO_HICE','EMERGENCIA_OTRO','VOCES_AHORA','TERCERO_NINO'].includes(r.primary);
  if (prevFacts && prevFacts.refusedCall && !prevFacts.emergency && !emergencyLike && text.some(x => CALL.test(x) && !/^Sé que no quieres llamar|esa persona|la dejes sola|lo dejes solo|la ves en peligro|lo ves en peligro|dolor fuerte en el pecho/.test(x))) v.push('INSISTE_LLAMAR');
  if (r.risk === 'high' && text.some(x => FOLLOW_CASUAL.test(x))) v.push('PREGUNTA_CASUAL_EN_CRISIS');
  if (prevFacts && prevFacts.alone !== null && text.some(x => ASK_WITH.test(x)) && !/^Te preguntaba/.test(text.find(x=>ASK_WITH.test(x)))) v.push('PREGUNTA_COMPANIA_YA_SABIDA');
  if (prevFacts && prevFacts.someone === false && text.some(x => ASK_CONTACT.test(x))) v.push('PREGUNTA_CONTACTO_YA_SABIDO');
  if (prevFacts && (prevFacts.safe === true || prevFacts.safe === false) && text.some(x => ASK_SAFE.test(x))) v.push('PREGUNTA_SEGURIDAD_YA_SABIDA');
  return v;
}

function runConv(msgs, print){
  const b = E.create(); if (process.env.PROS) b.setPros(+process.env.PROS); const st = b.start();
  let prevFacts = null, prevQs = [st.replies[1]], prevBubbles = [], lines = [], viol = [];
  if (print) lines.push('   🤖 ' + st.replies.join(' | '));
  msgs.forEach((m, i) => {
    let r;
    if (m[0] === '@') { const ev = { '@planB':'planB', '@accept':'accepted', '@tomorrow':'tomorrow' }[m]; r = b.event(ev, process.env.PROS ? { planB:{ guardia:+process.env.PROS }, accepted:{}, tomorrow:{ cuando:'mañana a las 10:00', con:'Ps. Camila Fuentes', aviso:false } }[ev] : undefined); if (print) lines.push(`   ⚙ ${ev}` + (r.replies.length ? ' → ' + r.replies.join(' | ') : '')); return; }
    r = b.reply(m);
    const v = check(i, m, r, prevFacts, prevQs, prevBubbles);
    if (print) {
      lines.push(`👤 ${m}   [${r.primary}·${r.risk}${r.urgent?'·URG':''}]`);
      if (r.forward) lines.push('   → (se envía al especialista)');
      else lines.push('   🤖 ' + r.replies.map(x => typeof x === 'string' ? x.replace(/\n/g,' ') : '[respiración]').join(' | ') + (r.chips.length ? `   ⟨${r.chips.join(' / ')}⟩` : ''));
      v.forEach(x => lines.push('   ⚠️ ' + x));
    }
    v.forEach(x => viol.push({ m, x }));
    const text = r.replies.filter(x => typeof x === 'string');
    prevQs = text.filter(x => /\?\s*$/.test(x));
    prevBubbles = prevBubbles.concat(text).slice(-8);
    prevFacts = r.facts || prevFacts;
  });
  return { lines, viol };
}

const mode = process.argv[2] || 'scenarios';
if (mode === 'scenarios') {
  const filter = process.argv[3];
  let total = 0;
  for (const [name, msgs] of SC) {
    if (filter && !name.startsWith(filter)) continue;
    const { lines, viol } = runConv(msgs, true);
    total += viol.length;
    console.log('\n=== ' + name); console.log(lines.join('\n'));
  }
  console.log('\nViolaciones totales:', total);
}
if (mode === 'random') {
  const N = +(process.argv[3] || 2000);
  const pool = CASES.map(c => c[0]).concat(SC.flatMap(s => s[1]).filter(m => m[0] !== '@'));
  const counts = {}, examples = {};
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < N; k++) {
    const b = E.create(); b.start();
    let prevFacts = null, prevQs = [], prevBubbles = [], chips = [], hist = [];
    for (let i = 0; i < 14; i++) {
      let m;
      if (chips.length && rnd() < 0.45) m = chips[Math.floor(rnd() * chips.length)];
      else m = pool[Math.floor(rnd() * pool.length)];
      if (rnd() < 0.04) { const r = b.event(rnd() < 0.7 ? 'planB' : 'accepted'); hist.push('⚙'); }
      let r;
      try { r = b.reply(m); } catch (e) { counts.CRASH = (counts.CRASH||0)+1; examples.CRASH = examples.CRASH || [m, e.stack.split('\n').slice(0,3).join(' ')]; break; }
      const v = check(i, m, r, prevFacts, prevQs, prevBubbles);
      hist.push('👤 ' + m + ' → ' + (r.forward ? '(fwd)' : r.replies.map(x => typeof x === 'string' ? x : '[resp]').join(' | ')));
      for (const x of v) { const key = x.split(':')[0]; counts[key] = (counts[key]||0)+1; if (!examples[key]) examples[key] = []; if (examples[key].length < (+process.env.EX||1)) examples[key].push(hist.slice(-5).concat(['   ⚠ '+x]).join('\n')); }
      const text = r.replies.filter(x => typeof x === 'string');
      prevQs = text.filter(x => /\?\s*$/.test(x)); prevBubbles = prevBubbles.concat(text).slice(-8); prevFacts = r.facts || prevFacts; chips = r.chips || [];
    }
  }
  console.log('Conversaciones:', N, 'Violaciones por regla:', counts);
  for (const k in examples) { console.log('\n--- ' + k); console.log(examples[k].join('\n\n')); }
}
