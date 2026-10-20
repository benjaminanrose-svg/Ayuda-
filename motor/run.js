const E = require('./engine.js'), CASES = require('./cases.js');
let fail = 0;
for (const [txt, exp, extra] of CASES) {
  const a = E.analyze(txt);
  let ok = exp === 'RISA_O_NADA' ? (a.primary === 'RISA' || a.primary === 'NADA') : a.primary === exp;
  if (ok && extra) ok = a.themes.includes(extra) || a.flags.includes(extra);
  if (!ok) { fail++; console.log('FAIL', JSON.stringify(txt), 'esperado', exp, extra||'', '→', a.primary, a.intents.join(','), '| temas', a.themes.join(','), '| flags', a.flags.join(','), '| norm:', a.norm); }
}
console.log(`${CASES.length - fail}/${CASES.length} OK`);
