/* Motor de Nexo, el bot de ConténMente · reglas sin IA generativa. Todo el contenido clínico debe validarlo un profesional.
   En el servidor: create(estadoGuardado), setPros(n) antes de cada reply, exportState() después. */
(function (root) {
'use strict';

/* ───────── 1. Normalización ───────── */
const ABBR = {
  sad:'triste',down:'bajoneado',idk:'no se',lonely:'solo',depressed:'deprimido',anxious:'ansioso',anxiety:'ansiedad',tired:'cansado',stressed:'estresado',bad:'mal',
  q:'que',k:'que',ke:'que',xq:'porque',pq:'porque',porq:'porque',xk:'porque',pk:'porque',x:'por',
  tb:'tambien',tmb:'tambien',tbn:'tambien',toy:'estoy',toi:'estoy',stoy:'estoy',stoi:'estoy',estoi:'estoy',
  nose:'no se',nse:'no se',ns:'no se',nd:'nada',d:'de',pa:'para',pal:'para el',bn:'bien',m:'me',t:'te',
  wn:'weon',hueon:'weon',won:'weon',weon:'weon',huevon:'weon',ahueonao:'aweonao',ahuevonado:'aweonao',
  ctm:'conchetumare',csm:'conchetumare',conchesumare:'conchetumare',ql:'culiao',qlo:'culiao',qlio:'culiao',
  culiado:'culiao',kiero:'quiero',qiero:'quiero',kero:'quiero',quero:'quiero',aora:'ahora',ahorita:'ahora',
  ola:'hola',holi:'hola',holis:'hola',wena:'hola',wenas:'hola',weena:'hola',grax:'gracias',grcs:'gracias',
  grs:'gracias',gracia:'gracias',xfa:'por favor',porfavor:'por favor',xfavor:'por favor',porfis:'por favor',porfa:'por favor',pls:'por favor',plis:'por favor',
  dps:'despues',sq:'es que',dnd:'donde',cdo:'cuando',kmo:'como',komo:'como',nunk:'nunca',mxo:'mucho',
  muxo:'mucho',xao:'chao',chau:'chao',bye:'chao',eri:'eres',erai:'eres',soi:'soy',estai:'estas',
  teni:'tienes',sabi:'sabes',podi:'puedes',queri:'quieres',cachai:'',po:'',pos:'',sipo:'si',nopo:'no',
  yapo:'ya',curao:'curado',curaa:'curada',pato:'pato',tamos:'estamos',ta:'esta',tan:'estan',
  wsp:'whatsapp',wasap:'whatsapp',insta:'instagram',psicologa:'psicologa',sicologa:'psicologa',
  sicologo:'psicologo',bulling:'bullying',buling:'bullying',bulin:'bullying'
};
const LEET = {'4':'a','3':'e','1':'i','0':'o','5':'s','7':'t','@':'a','$':'s'};
const EMOJI = [
  [/[\u{1F622}\u{1F62D}\u{1F61E}\u{1F614}☹\u{1F641}\u{1F494}\u{1F97A}\u{1F63F}\u{1F625}\u{1F613}\u{1F629}\u{1F62B}]/gu,' triste '],
  [/[\u{1F621}\u{1F92C}\u{1F47F}\u{1F624}]/gu,' rabia '],
  [/[\u{1F630}\u{1F628}\u{1F631}\u{1F616}\u{1F623}]/gu,' angustia '],
  [/\u{1F48A}/gu,' pastillas riskemoji '],
  [/[\u{1F52A}\u{1F5E1}]/gu,' cuchillo riskemoji '],
  [/\u{1FAA2}/gu,' cuerda riskemoji '],
  [/[⚰\u{1FAA6}☠]/gu,' muerte riskemoji '],
  [/[\u{1F642}\u{1F60A}\u{1F600}\u{1F604}\u{1F601}\u{1F44D}\u{1F64F}\u{1F49A}❤]/gu,' bien '],
  [/[\u{1F602}\u{1F923}\u{1F606}\u{1F605}\u{1F639}\u{1F61D}\u{1F61C}]/gu,' jaja '],
  [/\u{1F44B}/gu,' hola ']
];

function stripAccents(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,''); }

function normalize(raw){
  let t = String(raw||'');
  for (const [re,rep] of EMOJI) t = t.replace(re,rep);
  t = stripAccents(t.toLowerCase()).replace(/[º°ª]/g,'o');
  // edad y curso antes de transformar números
  let age = null, school = false;
  const m1 = t.match(/\b(?:tengo|tngo|cumpli|cumplo|soy de)\s+(\d{1,2})\b(?!\s*(?:pastill|remedio|lucas|pesos|dias|horas|semanas|meses|veces|minutos))/);
  if (m1) age = +m1[1];
  if (/\b[1-8]\s*(?:ro|do|ero|to|vo|mo|no|er|o)?\s*(?:basico|medio)\b/.test(t) ||
      /\b(?:primero|segundo|tercero|cuarto|quinto|sexto|septimo|octavo)\s+(?:basico|medio)\b/.test(t)) school = true;
  const math = /\d+\s*[-+*x\/]\s*\d+/.test(t);
  t = t.replace(/https?:\/\/\S+|www\.\S+/g,' http ');
  // leet sólo en palabras que mezclan letras y números
  t = t.replace(/\S+/g, w => (/[a-z]/.test(w) && /[0-9@$]/.test(w)) ? w.replace(/[0-9@$]/g,c=>LEET[c]||c) : w);
  t = t.replace(/[^a-z0-9#\s]/g,' ');
  t = t.replace(/([a-z])\1{2,}/g,'$1');            // tristeeee → triste
  t = t.replace(/\b(me)?(quiero|qiero|kiero|kero)(matar|morir|morirme|matarme|suicidarme|suicidar|desaparecer|vivir)\b/g, (m, me, q, v) => (me ? 'me ' : '') + 'quiero ' + v).replace(/\bno(quiero|qiero|kiero|kero)(vivir|seguir)\b/g, 'no quiero $2');
  let toks = t.split(/\s+/).filter(Boolean);
  // letras separadas: m a t a r m e → matarme
  const joined = []; let buf = [];
  const flush = () => { if (buf.length >= 4) joined.push(buf.join('')); else joined.push(...buf); buf = []; };
  for (const w of toks) { if (/^[a-z]$/.test(w)) buf.push(w); else { flush(); joined.push(w); } }
  flush();
  toks = [];
  for (let w of joined) { if (/^x[aeiou]/.test(w) && !ABBR[w]) w = 'ch' + w.slice(1); const r = ABBR[w]; if (r === undefined) toks.push(w); else if (r) toks.push(...r.split(' ')); }
  toks = toks.map(w => ABBR[w] !== undefined ? w : correct(w));
  const riskEmoji = toks.includes('riskemoji');
  toks = toks.filter(w => w !== 'riskemoji');
  return { text: toks.join(' '), toks, age, school, math, riskEmoji };
}


/* ───────── 1b. Corrector ortográfico ───────── */
const DICT = (typeof ACOMPANA_DICT !== 'undefined') ? ACOMPANA_DICT : (typeof require !== 'undefined' ? (()=>{ try { return require('./dict.json'); } catch(e) { return null; } })() : null);
const DANGER_W = new Set('matar matarme morir morirme suicidarme suicidio suicidar suicida ahorcarme colgarme cortarme envenenarme dispararme tirarme lanzarme quitarme desaparecer muerto muerta muerte veneno matarse morirse suicidarse cortarse matarlo matarla matarte'.split(' '));
let PROT = null, TBYLEN = null;
const BRAND_W = new Set(['nexo','contenmente','conten']); // nombres de la marca: no se corrigen
function correct(tok){
  if (!DICT || tok.length < 4 || !/^[a-z]+$/.test(tok) || LAUGH_RE.test(tok)) return tok;
  if (DICT.t[tok] !== undefined || BRAND_W.has(tok)) return tok;
  const c = DICT.c[tok]; if (c) return c;
  if (!PROT) { PROT = new Set(DICT.p); TBYLEN = {}; for (const w in DICT.t) (TBYLEN[w.length] = TBYLEN[w.length] || []).push({ w, p: phon(w), z: DICT.t[w] }); }
  if (PROT.has(tok)) return tok;
  const pt = phon(tok); let best = null;
  for (let len = tok.length - 2; len <= tok.length + 2; len++) for (const t of (TBYLEN[len] || [])) {
    const th = (t.w.length <= 5 || DANGER_W.has(t.w)) ? 1 : 2;
    const d = Math.min(lev(tok, t.w, th), lev(pt, t.p, th));
    if (d > th) continue;
    const same1 = pt[0] === t.p[0];
    if (!(d <= 1 || (same1 && Math.abs(tok.length - t.w.length) <= 1 && !DANGER_W.has(t.w)))) continue;
    if (!best || d < best.d || (d === best.d && t.z > best.z)) best = { d, z: t.z, w: t.w };
  }
  return best ? best.w : tok;
}
const LAUGH_RE = /^(?:a?(?:j+[aeisou]+)+j*|(?:js)+j?|x+d+|lol|lmao|(?:ha)+h?|(?:je)+|k+a+k+a*)$/;

/* ───────── 2. Coincidencia difusa ───────── */
function phon(w){
  return w.replace(/ch/g,'%').replace(/h/g,'').replace(/qu(?=[ei])/g,'k').replace(/gu(?=[ei])/g,'g')
    .replace(/c(?=[ei])/g,'s').replace(/c/g,'k').replace(/q/g,'k').replace(/z/g,'s').replace(/v/g,'b')
    .replace(/ll/g,'y').replace(/x/g,'ks').replace(/%/g,'ch').replace(/(.)\1+/g,'$1');
}
function lev(a,b,max){
  if (a===b) return 0;
  if (Math.abs(a.length-b.length) > max) return max+1;
  const d = [];
  for (let i=0;i<=a.length;i++) d[i]=[i];
  for (let j=0;j<=b.length;j++) d[0][j]=j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++){
    const c = a[i-1]===b[j-1]?0:1;
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+c);
    if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}
function parseTerm(t){
  return t.split('|').filter(Boolean).map(x => {
    let exact=false, pre=false;
    if (x[0]==='='){ exact=true; x=x.slice(1); }
    if (x.endsWith('*')){ pre=true; x=x.slice(0,-1); }
    return { raw:x, key: x==='#' ? '#' : phon(x), exact, pre };
  });
}
function altMatch(al, tok, key){
  if (al.key==='#') return /^\d+$/.test(tok) && +tok >= 5;
  if (al.pre){
    if (key.startsWith(al.key)) return true;
    if (al.exact || al.key.length < 7) return false;
    const L = al.key.length;
    for (const l of [L-1, L, L+1]) if (key.length >= l && l > 0 && lev(key.slice(0,l), al.key, 1) <= 1) return true;
    return false;
  }
  if (key===al.key) return true;
  if (al.exact) return false;
  if (al.raw.endsWith('me') && /(se|te|lo|la|le|los|las|nos)$/.test(tok) && tok.replace(/(se|te|lo|la|le|los|las|nos)$/,'') === al.raw.slice(0,-2)) return false;
  const m = al.key.length >= 8 ? 2 : al.key.length >= 5 ? 1 : 0;
  return m > 0 && lev(key, al.key, m) <= m;
}
function compile(list){
  return list.map(s => {
    const o = typeof s === 'string' ? { p:s } : s;
    return { gap: o.gap ?? 1, terms: o.p.trim().split(/\s+/).map(parseTerm), not: (o.not||[]).map(parseTerm), src:o.p };
  });
}
function matchPhrase(ph, toks, keys){
  const out = [];
  for (let i=0;i<toks.length;i++){
    if (!ph.terms[0].some(a => altMatch(a,toks[i],keys[i]))) continue;
    let j=i+1, end=i, ok=true;
    for (let k=1;k<ph.terms.length;k++){
      let f=-1;
      for (let t=j; t<=Math.min(toks.length-1, j+ph.gap); t++) if (ph.terms[k].some(a=>altMatch(a,toks[t],keys[t]))) { f=t; break; }
      if (f<0){ ok=false; break; }
      end=f; j=f+1;
    }
    if (!ok) continue;
    if (ph.not.length){
      let bad=false;
      for (let t=end+1; t<=Math.min(toks.length-1,end+3); t++) if (ph.not.some(term=>term.some(a=>altMatch(a,toks[t],keys[t])))) { bad=true; break; }
      if (bad) continue;
    }
    out.push({ s:i, e:end });
  }
  return out;
}
const NEG = new Set(['no','nunca','jamas','tampoco','ni']);
const NEG_BRIDGE = new Set(['pienso','pense','pensado','pensaria','querido','he','me','quiero','quise','queria','voy','a','en','de','tengo','tenia','ganas','intencion','planes','plan','pensando','estoy','es','era','seria','para','lo','la','haria','hare','ni','siquiera','eso','nada']);
function negated(toks, s){
  for (let t=Math.max(0,s-2); t<s; t++) if (NEG.has(toks[t]) && toks[t+1] !== 'se' && (t === s-1 || NEG_BRIDGE.has(toks[t+1]))) return true;
  const w = toks.slice(Math.max(0,s-3), s).join(' ');
  if (/\b(no es que|nunca he|jamas he|no creo que|ni cagando|ni ahi|ni en broma|ni muert[oa]|ni loc[oa]|ni en sueños)( con)?$/.test(w)) return true;
  // "no pienso en matarme", "no es para matarme", "no tengo intención de matarme"
  for (let t=Math.max(0,s-5); t<s-2; t++) if (NEG.has(toks[t]) && toks[t+1] !== 'se' && toks.slice(t+1, s).every(x => NEG_BRIDGE.has(x))) return true;
  return false;
}

/* ───────── 3. Léxico ───────── */
const MED = 'pastill*|remedio*|pildora*|medicament*|clonazepam*|ravotril*|rivotril*|alprazolam*|sertralin*|fluoxetin*|quetiapin*|zopiclon*|zolpidem*|escitalopram*|lorazepam*|diazepam*|paracetamol*|ibuprofen*|aspirina*|antidepresiv*|calmante*|somnifer*|tranquilizant*|benzodiazepin*|=litio|trazodon*|=pastis';
const MEDNAMES = 'clonazepam*|ravotril*|rivotril*|alprazolam*|sertralin*|fluoxetin*|quetiapin*|zopiclon*|zolpidem*|escitalopram*|lorazepam*|diazepam*|antidepresiv*|benzodiazepin*|=litio|trazodon*|aripiprazol*|risperidon*|venlafaxin*|bupropion*|melatonin*';
const DEST = '=puente|=edificio|=piso|=balcon|=ventana|=metro|=tren|=auto|=micro|=camion|=rio|=mar|=cerro|=precipicio|=acantilado|=techo|=azotea|=linea|=vias|=via|=viaducto|=torre|=paso|=autopista|=carretera';
const IDIOM = ['risa','verguenza','hambre','calor','frio','sueno','aburrimiento','ganas','amor','envidia','lata','flojera','felicidad','emocion','ternura','cringe','nervios','miedo','susto','cansancio','sed','ajena','rico','gusto','estudiando','trabajando','entrenando','corriendo','leyendo','cocinando','limpiando','jugando','bailando','riendo','riendome','cagando','estudiar','trabajar'];
const CUTNOT = ['pelo','chasquilla','unas','dedo','barba','cocin*','afeit*','papel','luz','agua','internet','senal','llamada','querer','accidente','pelito','flequillo'];
const ACCNOT = ['jugando','rodilla','tobillo','pie','espalda','cayendo','caida','accidente','pelota','futbol','entrenando','gym','gimnasio','trabajando','bicicleta','bici','querer'];
const BURNNOT = ['sol','cocin*','olla','plancha','agua','sarten','horno','lengua','cafe','te','sopa','fuego','vapor','accidente','tetera','hervidor','aceite','estufa','querer'];
const MEDNOT = ['manana','receta','recetadas','indicadas','correspondian','tocaban','diarias','dia','noche'];

const L = {
  EMERGENCIA: [
    { p:`=me =tome|=trague|=trage|=meti =todas|=todos|=todo|=toda|=muchas|=muchos|=varias|=varios|=demasiadas|=demasiados|=caja|=frasco|=blister|=tira|=punado|=bolsa ${MED}`, gap:3, not:MEDNOT },
    { p:`=me =tome|=trague|=trage # ${MED}`, gap:2 },
    { p:'=tome|=trague|=tomo|=trage =veneno|=cloro|=raticida|=matarratas|=insecticida|=lavaloza|=diablo|=acido|=parafina|=bencina', gap:3 },
    '=me =intoxique|=envenene', '=sobredosis',
    { p:'=me =corte|=abri =las|=la|=mis =venas|=muneca|=munecas', gap:1 },
    '=me =estoy =desangrando', '=estoy =sangrando =mucho|=harto',
    { p:`=tome|=trague|=trage|=ingeri =todas|=todos|=muchas|=muchos|=varias|=varios|=demasiadas|=demasiados|=caja|=frasco|=blister|=tira|=punado|=bolsa|=monton|=hartas|=hartos ${MED}`, gap:3, not:MEDNOT },
    { p:`=tome|=trague|=ingeri # ${MED}`, gap:2 }, { p:`=me =pase =con|=de ${MED}`, gap:2 }, '=me =empastille'
  ],
  METODO: [
    { p:'=como|=forma|=formas|=manera|=maneras|=metodo|=metodos|=modo|=modos|=tecnica|=tecnicas =de|=para =matarme|=matarse|=suicidarme|=suicidarse|=suicidio|=morir|=morirme|=morirse|=quitarme|=quitarse|=ahorcarme|=ahorcarse|=colgarme|=colgarse|=envenenarme|=envenenarse', gap:2, not:IDIOM },
    { p:'=como =matarme|=matarse|=suicidarme|=suicidarse|=morirme|=quitarme|=quitarse|=ahorcarme|=ahorcarse|=colgarme|=colgarse|=envenenarme|=envenenarse', gap:1 },
    { p:'=como =me =puedo|=podria|=deberia|=puedes =matar|=suicidar|=morir|=quitar|=ahorcar|=colgar|=envenenar', gap:1 },
    { p:'=como =se =puede =matar|=suicidar|=morir', gap:2 },
    { p:'=dosis =letal|=mortal|=toxica', gap:2 },
    { p:'=dosis =para =morir|=matarme|=matarse|=suicidarse', gap:2 },
    { p:`=cuantas|=cuantos|=cuanto|=cuanta ${MED}|=veneno|=cloro|=raticida =para =morir|=matarme|=matarse|=matar|=suicidarme|=suicidarse|=despertar`, gap:5 },
    { p:`${MED}|=algo|=que =para =no =despertar|=despertarme`, gap:6 },
    { p:`=cuantas|=cuantos|=cuanto|=cuanta ${MED}|=veneno|=cloro =matan|=mata|=letal|=letales|=mortal|=mortales`, gap:3 },
    { p:`=que|=cual|=cuales ${MED}|=veneno =matan|=mata|=letal|=letales|=mortal|=mortales`, gap:3 },
    { p:'=morir|=morirme|=matarme|=matarse|=suicidarse|=suicidarme =sin =dolor|=sufrir', gap:2 },
    { p:'=morir|=morirme|=matarme|=matarse =rapido', gap:1 },
    { p:'=sin =dolor =para|=de =morir|=matarse|=matarme|=suicidarse', gap:1 },
    '=muerte =sin =dolor', '=muerte =indolora|=rapida',
    { p:'=cuantos|=que =pisos|=metros|=altura =para =morir|=matarse|=matarme|=mortal', gap:2 },
    { p:'=altura =letal|=mortal', gap:0 },
    { p:'=como =hago|=puedo =para =no =despertar', gap:1 }, { p:'=como =hago|=puedo =para =morir|=morirme|=matarme|=suicidarme', gap:1, not:IDIOM },
    { p:'=mas =rapido|=facil|=efectivo|=seguro|=rapida|=facil =para =morir|=matarse|=matarme|=suicidarse|=suicidarme', gap:1 },
    { p:`=que =pasa =si =me =tomo =todas|=todos|=muchas|=muchos|=caja|=frasco ${MED}`, gap:3 }
  ],
  PLAN: [
    { p:'=me =voy =a =matar|=suicidar|=quitar|=ahorcar|=colgar|=envenenar|=disparar', gap:0, not:['estudiando','trabajando','risa','haciendo','pega','pensando','corriendo','entrenando','gym','de'] },
    { p:'=voy|=pienso =matarme|=suicidarme|=ahorcarme|=colgarme|=envenenarme|=dispararme|=tirarme|=lanzarme', gap:0, not:['cama','piscina','sillon','sofa','suelo','pasto','siesta','agua'] },
    { p:'=voy =a =matarme|=suicidarme|=ahorcarme|=colgarme|=envenenarme|=dispararme|=tirarme|=lanzarme', gap:0, not:['cama','piscina','sillon','sofa','suelo','pasto','siesta','agua'] },
    { p:'=voy =a =quitarme =la =vida', gap:0 },
    { p:`=tirarme|=lanzarme|=saltar|=tirar|=tiro|=lanzo|=lanzar|=botarme ${DEST}`, gap:3 },
    '=colgarme|=ahorcarme|=envenenarme|=dispararme|=balearme|=degollarme',
    { p:'=pegarme|=darme =un =tiro|=balazo|=disparo', gap:1 },
    { p:'=cortarme|=cortar|=abrirme =las|=mis =venas|=munecas|=muneca', gap:1 },
    { p:`=tomarme|=tragarme =todas|=todos|=muchas|=muchos|=caja|=frasco|=todo|=toda ${MED}`, gap:3 },
    { p:'=carta|=cartas =de =despedida', gap:0 }, '=carta|=cartas =suicida|=suicidas',
    { p:'=me =despido =de =todos|=ustedes|=uds|=ti|=todo|=todas', gap:1 },
    { p:'=adios|=chao =a =todos|=todas', gap:1 }, '=adios|=chao =mundo|=cruel', { p:'=adios|=chao =para =siempre', gap:0 },
    { p:'=este =es =mi =ultimo =mensaje|=dia', gap:0 }, '=mi =ultimo =mensaje|=dia', '=mi =ultima =noche'
  ],
  IDEACION: [
    { p:'=me =quiero|=quisiera|=quiera|=queria morir|matar|suicidar*|morirme|matarme', gap:1, not:IDIOM },
    { p:'=quiero|=quisiera|=quiera|=queria morirme|matarme|suicidarme|morir', gap:1, not:IDIOM },
    { p:'morirme|matarme|suicidarme|suicidarm*', not:IDIOM },
    '=quitarme =la =vida',
    { p:'=acabar|=terminar =con =mi =vida|=existencia', gap:1 },
    { p:'=acabar|=terminar =con =todo', gap:0, not:['el','la','los','las','lo','trabajo','pega','tarea','eso','mi','tu','su'] },
    { p:'=no =quiero =vivir|=existir', gap:1, not:['con','en','aca','alla','aqui','alli','solo','sola','junto','cerca','lejos','de','donde','ahi'] },
    { p:'=no =quiero =seguir =viviendo|=existiendo|=vivo|=viva', gap:1 },
    { p:'=no =quiero =estar =vivo|=viva', gap:1 }, '=no =quiero =seguir =en =este =mundo',
    { p:'=no =vale =la =pena =vivir|=seguir', gap:1 }, { p:'=la =vida =no =vale =la =pena', gap:1 },
    { p:'=dejar =de =existir|=vivir', gap:0, not:['aca','aqui','en','con','ahi','alla'] },
    { p:'=pienso|=pense|=pensando|=pensado|=pensar|=pensaba =en =matarme|=suicidarme|=quitarme|=morirme|=morir|=suicidio', gap:2, not:IDIOM },
    '=pensamientos|=pensamiento|=ideas|=ideacion =suicidas|=suicida',
    { p:'=pensamientos|=pensamiento|=ideas =de =suicidio|=matarme|=morir|=morirme|=quitarme', gap:1 },
    { p:'=ganas =de =morir|=morirme|=matarme|=suicidarme', gap:1, not:IDIOM },
    '=ganas =de =no =vivir',
    { p:'=mejor =me =mato|=muero', gap:0, not:IDIOM },
    '=quiero|=quisiera|=queria =estar =muerto|=muerta',
    { p:'=prefiero|=preferiria =morir|=morirme', gap:1, not:IDIOM.concat(['antes','que']) }, { p:'=prefiero|=preferiria =estar =muerto|=muerta', gap:1, not:['antes','que'] }
  ],
  AUTOLESION: [
    { p:'=me =corto|=corte|=cortaba|=rajo|=raje', gap:0, not:CUTNOT },
    '=me =estoy =cortando', { p:'=cortarme', not:CUTNOT },
    { p:'=me =hago|=hice|=hacia =dano', gap:1, not:ACCNOT }, '=hacerme =dano', '=me =estoy =haciendo =dano',
    { p:'=me =lastimo|=lastime|=lastimaba', gap:0, not:ACCNOT }, { p:'=lastimarme', not:ACCNOT },
    { p:'=me =quemo|=queme|=quemaba', gap:0, not:BURNNOT }, { p:'=quemarme', not:BURNNOT },
    { p:'=me =pego|=golpeo|=golpee|=pegaba =yo|=sola|=solo|=mismo|=misma|=a', gap:1 },
    'autolesi*', '=cutting', { p:'=me =hago|=hice|=hacia =cortes|=heridas|=marcas|=quemaduras', gap:1 }, { p:'=cortes =en =los|=mis|=las =brazos|=piernas|=munecas|=muslos', gap:1 }, '=me =rasguno|=rasgunaba|=arano|=aranaba'
  ],
  DANO_OTROS: [
    { p:'=quiero|=voy|=quisiera|=ganas =matarlo|=matarla|=matarlos|=matarlas|=matarte|=asesinarlo|=asesinarla|=asesinarte', gap:2 },
    { p:'=quiero|=voy|=quisiera|=ganas =matar|=asesinar =a|=al', gap:2, not:['veces'] },
    { p:'=te|=lo|=la|=los|=las =voy =a =matar', gap:0 },
    { p:'=le|=les =voy =a =pegar|=disparar|=sacar', gap:1, not:['grito','llamada','llamado','telefonazo','mensaje','foto'] },
    '=hacerle|=hacerles =dano', '=matar =a =todos',
    { p:'=llevar =un|=una =arma|=pistola|=cuchillo =al =colegio|=liceo', gap:2 }
  ],
  TERCERO: [
    { p:'=se =quiere|=queria =matar|=morir|=suicidar|=quitar', gap:0 },
    { p:'=quiere|=queria =matarse|=suicidarse|=morirse|=morir', gap:0, not:IDIOM },
    { p:'=se =va =a =matar|=suicidar', gap:0 },
    { p:'=se =corta|=cortaba|=corto', gap:0, not:CUTNOT }, '=se =esta =cortando',
    { p:'=se =hace|=hacia|=hizo =dano', gap:0, not:ACCNOT },
    '=intento =matarse|=suicidarse|=quitarse', '=se =intento =matar|=suicidar',
    { p:'=habla|=dice|=dijo|=hablo =de|=que =matarse|=suicidarse|=morirse|=morir|=suicidio', gap:2, not:IDIOM },
    { p:'=no =quiere =vivir|=seguir', gap:1, not:['con','en','aca','alla','aqui','alli','solo','sola','de'] },
    '=quiere =desaparecer', { p:'=se =iba =a =matar|=suicidar', gap:0 }, { p:'=dijo|=decia|=publico|=escribio =que =se =iba|=va =a =matar|=suicidar|=morir', gap:1 }, { p:'=amenaza|=amenazo|=amenazando =con =matarse|=suicidarse|=quitarse|=hacerse|=matarme', gap:1 }, { p:'=piensa|=pensando =en =matarse|=suicidarse|=morir|=suicidio', gap:2 }
  ],
  VIOLENCIA: [
    { p:'=me =pega|=pegan|=pego|=golpea|=golpean|=golpeo|=golpearon|=pegaron|=maltrata|=maltratan|=amenaza|=amenazan|=amenazo|=empuja|=empujo|=ahorca|=ahorco|=zamarrea|=tironea|=insulta|=humilla|=humillan', gap:0, not:['sol','calor','fuerte el'] },
    { p:'=me =viola|=violo|=violaron|=abusa|=abuso|=abusaron|=abusaba|=toquetea|=toqueteo|=manosea|=manoseo|=acosa|=acosan|=obliga|=obligan|=obligo|=obligaba', gap:0, not:['alcohol','drogas'] },
    { p:'=le =pega|=pegan|=golpea|=golpean|=pego|=maltrata|=maltratan =a =mi', gap:1 },
    { p:'=me =tocaron|=toco|=toca|=tocan|=tocaba =sin =permiso|=consentimiento|=querer', gap:2 }, { p:'=me =tocaron|=toco|=tocaba =mis|=las =partes', gap:2 },
    { p:'=abuso|=abusos =sexual|=sexuales', gap:0 }, '=violacion', '=violencia', '=acoso|=acosador|=acosadora',
    { p:'=no =me =deja|=dejan =salir|=trabajar|=estudiar', gap:1 },
    { p:'=me =tiene|=tienen =encerrado|=encerrada', gap:1 },
    { p:'=me =controla|=revisa =el =celular|=telefono', gap:1 },
    { p:'=tengo =miedo =de|=a =mi =pareja|=papa|=mama|=padrastro|=madrastra|=pololo|=polola|=marido|=esposo|=esposa', gap:1 },
    { p:'=padrastro|=tio|=abuelo|=primo|=papa|=profe|=profesor|=vecino|=hermano|=hermanastro|=entrenador|=padrino =me =toca|=tocaba|=toco|=manosea|=manoseaba', gap:1 },
    { p:'=me =mete|=metia =mano', gap:0 }, { p:'=me =toca|=toco|=tocaba =la|=las|=mi|=mis =pierna|=piernas|=pechos|=pecho|=poto|=trasero|=partes|=cuerpo|=cola', gap:1 }, { p:'=me =hace|=hacia|=hizo =cosas =que =no =me =gustan|=gustaban|=gusta', gap:1 }
  ],
  INTENTO_PREVIO: [
    { p:'=intente|=trate|=intentaba =de =matarme|=suicidarme|=quitarme|=morir|=ahorcarme', gap:1 },
    { p:'=intente|=trate|=intentaba matarme|suicidarme|=quitarme|=ahorcarme', gap:0 },
    { p:'=me =intente|=trate =matar|=suicidar|=ahorcar|=de', gap:0 },
    '=ya =lo =intente', { p:'=lo =intente =antes|=una|=varias', gap:1 }, '=lo =he =intentado',
    { p:'=intento|=intentos =de =suicidio', gap:0 }
  ],
  PASIVA: [
    { p:'=quiero|=quisiera|=ganas =desaparecer|=esfumarme', gap:2 },
    { p:'=quiero =dejar =de =sentir', gap:0 },
    { p:'=dormir =y =no =despertar', gap:1 }, { p:'=no =despertar =mas|=nunca', gap:0 },
    { p:'=ojala =no =despertar|=despierte', gap:1 }, '=no =quiero =despertar',
    { p:'=ojala =morir|=morirme|=muriera|=muera', gap:1 }, { p:'=ojala =me =muera|=muriera|=pase|=atropelle|=atropellen|=choque|=mate', gap:1 }, { p:'=ojala =estuviera|=estar =muerto|=muerta', gap:1 },
    { p:'=mejor =estaria|=estar =muerto|=muerta', gap:1 }, { p:'=estaria =mejor =muerto|=muerta', gap:0 },
    { p:'=estarian|=estaria|=estan|=estarian =mejor =sin =mi', gap:1 },
    { p:'=seria =mejor =si =no =estuviera|=existiera', gap:1 },
    { p:'=nadie =me =extranaria|=echaria|=extrana', gap:1 },
    { p:'=a =nadie =le =importaria|=importa =si =me =muero|=desaparezco|=muriera', gap:2 },
    '=nadie =notaria',
    { p:'=soy =una|=un =carga|=estorbo|=molestia|=cacho', gap:1 },
    { p:'=para =que =sigo|=vivo|=existo|=estoy', gap:1, not:['aca','aqui','en'] },
    { p:'=no =tiene =sentido =vivir|=seguir|=nada|=mi|=la', gap:1 }, { p:'=la =vida =no =tiene =sentido', gap:1 },
    { p:'=no =le =encuentro =sentido', gap:1 }, '=nada =tiene =sentido', '=sin =sentido =vivir',
    { p:'=cansado|=cansada|=harto|=harta|=chato|=chata =de =vivir|=existir', gap:1 }, { p:'=cansado|=cansada|=harto|=harta|=chato|=chata =de =la =vida', gap:1 },
    { p:'=ojala|=quisiera =no =haber =nacido', gap:1 }, { p:'=ojala =no =hubiera =nacido', gap:1 },
    { p:'=pienso|=pensando|=pense =en =la =muerte', gap:2 },
    { p:'=me =quiero =ir =de =este =mundo', gap:1 }, { p:'=me =quiero =ir =para =siempre', gap:1 }, '=irme =para =siempre',
    { p:'=quiero =que =todo|=esto =termine|=acabe|=pare', gap:2 },
    { p:'=no =se =si =quiero =vivir|=seguir', gap:0 },
    { p:'=me =mato', gap:0, not:['estudiando','trabajando','risa','haciendo','ejercicio','pega','gym','trabajo','estudi*','corriendo','entrenando','de'] },
    { p:'=me =voy =a =morir', gap:0, not:IDIOM.concat(['si','cuando','de']) },
    { p:'=me =muero', gap:0, not:IDIOM.concat(['de','si','con','por','jaj*','xd','jsj*','ja','lol']) },
    { p:'suicid*', gap:0 }, { p:'=muerte', gap:0, not:['de','del'] },
    { p:'=perdon =por =todo', gap:0, not:['lo','el','la','que','eso'] },
    { p:'=estoy =regalando =mis =cosas', gap:1 },
    { p:'=seria|=es =mejor =desaparecer|=morirme|=morir', gap:2 }, { p:'=no =tengo =ganas =de =vivir|=seguir|=existir', gap:0 }, { p:'=ya =no =quiero =estar =aqui|=aca|=aki|=viva|=vivo', gap:0 }, { p:'=no =quiero =estar =en =este =mundo', gap:0 }, { p:'=miedo =de =lo =que =pueda|=podria =hacer|=hacerme', gap:1 }, { p:'=miedo =de =mi =misma|=mismo', gap:0 }, { p:'=no =confio =en =mi', gap:0 }, { p:'=chato|=chata|=harto|=harta =de =vida', gap:3 }, { p:'=seria|=es =mejor =no =existir', gap:2 }, { p:'=pienso|=pensando|=pense =en =desaparecer|=morirme', gap:2 },
    { p:'=no =voy =a =molestar =mas', gap:1 }, { p:'=no =los|=las|=te =voy =a =molestar =mas', gap:1 }, { p:'=ya =no =voy =a =ser =una|=un =carga|=problema|=molestia|=cacho', gap:1 },
    { p:'=se =van =a =librar =de =mi', gap:0 }, { p:'=ya =no =van =a =tener =que =preocuparse|=aguantarme', gap:2 }, { p:'=esta =es =mi =despedida', gap:0 }, { p:'=adios =para =siempre', gap:0 }, { p:'=me =despido =de =todos|=ustedes', gap:0 }
  ],
  DUELO_SUICIDIO: [ '=se =suicido', { p:'=se =quito =la =vida', gap:0 }, { p:'=se =mato', gap:0, not:['estudiando','trabajando','risa','haciendo','ejercicio','pega','gym','trabajo','corriendo','entrenando','de','por'] }, { p:'=suicidio =de =mi', gap:0 }, { p:'=perdi =por =suicidio', gap:3 } ],
  MEDIOS: [
    { p:`=tengo|=compre|=consegui|=guarde|=guardo|=junte|=juntando|=acumulando|=guardado|=guardadas ${MED}|=pistola|=arma|=revolver|=escopeta|=cuerda|=soga|=veneno|=raticida|=navaja`, gap:3, not:MEDNOT }
  ],
  INMINENTE: [ '=hoy','=ahora','=noche','=rato','=ahora =mismo','=lo =voy =a =hacer','=ya =lo =decidi','=ya =decidi','=esta =decidido','=tome =la =decision','=ya =tengo =todo','=no =llego =a =manana' ],
  JAILBREAK: [
    { p:'=ignora|=olvida|=olvidate|=ignorar =tus|=las|=todas =instrucciones|=reglas|=indicaciones|=prompt', gap:2 },
    '=actua|=comportate =como', { p:'=olvida|=ignora =todo =lo =anterior', gap:1 }, { p:'=finge|=simula =que|=ser', gap:1 }, '=haz =como =si',
    { p:'=modo =dan|=desarrollador|=developer|=dios|=sin', gap:1 }, '=sin =restricciones|=filtros|=censura',
    '=eres =libre', '=jailbreak', '=prompt', '=roleplay', '=juego =de =rol'
  ],
  SEXUAL: [
    '=nudes|=nude|=pack|=packs|=porno|=porn|=xxx|=onlyfans|=sexting',
    { p:'=mandame|=manda|=pasame|=envia =fotos|=foto =desnuda|=desnudo|=sin|=hot', gap:2 }, { p:'=mandame|=pasame|=enviame =fotos|=foto|=fotito|=fotitos', gap:1 },
    '=desnuda|=desnudo|=desnudarte', '=culiar|=culeame|=follar|=chupala|=chupalo', '=tetas',
    { p:'=quiero =tener =sexo', gap:0 }, '=quiero =sexo'
  ],
  DATOS: [
    { p:'=tu|=su =numero|=whatsapp|=celular|=telefono|=instagram|=direccion|=correo|=mail', gap:1 },
    { p:'=numero|=whatsapp|=celular|=telefono|=direccion|=instagram|=correo =de|=del psicolog*|=especialista|=doctor|=doctora', gap:2 },
    { p:'=donde =vive|=trabaja psicolog*|=especialista|=doctor|=doctora', gap:2 }
  ],
  MEDICO: [
    MEDNAMES,
    { p:`=que|=cual =pastilla|=remedio|=medicamento|=pastillas|=remedios =tomo|=me|=puedo|=tomar|=sirve`, gap:2 },
    { p:`=cuanto|=cuantas|=cuantos ${MED}`, gap:2 }, '=dosis',
    '=puedo =mezclar', { p:`=puedo =tomar ${MED}`, gap:2 }, '=me =recetaron', { p:'=dejar|=deje =el =tratamiento', gap:1 }
  ],
  SPAM: [ 'http*', '=bitcoin|=cripto|=criptomoneda|=criptomonedas', { p:'=gana|=ganar|=gane =dinero|=plata', gap:1 }, '=promocion|=oferta|=descuento|=sorteo', { p:'=compra|=compre =ahora|=ya', gap:0 }, '=dinero =facil' ],
  INSULTO: [
    '=culiao|=culiaos|=culiaa|=culiada', '=conchetumare|=conchetumadre|=conchasumadre|=conchatumadre|=conchesumadre', '=hdp',
    '=hijo =de =puta', '=maricon|=maraco', '=aweonao|=aweonado|=aweona', '=chupalo|=chupala',
    { p:'=andate|=vete|=anda =a =la =mierda|=chucha|=cresta', gap:1 }, '=callate',
    { p:'=bot|=maquina|=robot|=app|=programa|=pagina =de =mierda', gap:0 },
    { p:'=bot|=maquina|=robot|=app|=programa =inutil|=culiao|=weon|=tonto|=estupido|=basura|=penca|=fome|=malo|=qlo', gap:1 },
    { p:'=eres =un|=una =inutil|=tonto|=tonta|=estupido|=estupida|=basura|=mierda|=weon|=weona|=idiota|=imbecil|=penca|=asco|=pesimo|=pesima', gap:2 },
    { p:'=eres =inutil|=tonto|=tonta|=estupido|=estupida|=basura|=weon|=weona|=idiota|=imbecil|=penca', gap:0 },
    { p:'=no =sirves|=servis =para =nada|=na', gap:1 }, '=que =bot =mas =inutil|=malo|=penca'
  ],
  BROMA: [
    { p:'=es|=era|=fue =broma|=bromita|=mentira|=chiste|=joda', gap:1 },
    { p:'=estoy|=estaba|=solo =probando|=bromeando|=weando|=hueveando|=webeando|=jodiendo|=molestando|=probaba', gap:1 },
    { p:'=te =estaba|=estoy =probando|=webeando|=weando|=hueveando', gap:1 },
    '=queria =probar', '=probar =el =bot', '=es =una =prueba', '=test|=testing|=testeo|=testeando',
    { p:'=no =es =en =serio', gap:0 }, '=no =era =en =serio', '=mentira', '=era =pa =molestar'
  ],
  SUSTANCIAS: [
    { p:'=estoy|=ando|=siento|=quede|=sentir =curado|=curada|=cura|=borracho|=borracha|=drogado|=drogada|=volado|=volada|=jalado|=jalada|=enfiestado|=pasado|=arriba', gap:1, not:['de','con','la','el'] },
    { p:'=tome =mucho|=harto|=demasiado', gap:0, not:['agua','te','cafe','jugo','leche','sol'] },
    '=me =drogue|=drogo|=drogaba', { p:'=consumo|=consumi|=consumiendo|=consumir', gap:0, not:['menos','agua','comida','energia','luz','datos'] },
    '=jale|=jalar|=jalando|=jalo', '=pasta =base', '=merca|=falopa|=cocaina|=perico|=keta|=tusi|=extasis|=lsd|=acido',
    { p:'=coca', gap:0, not:['cola','zero'] }, '=marihuana|=weed|=porro|=cogollo|=marihuano',
    '=copete|=copetiado|=copeteado|=copetear|=copeteando', '=alcohol|=alcoholico|=alcoholica|=alcoholismo',
    '=recai|=recaida', { p:'=no =puedo =dejar =de =tomar|=consumir|=fumar|=jalar|=beber', gap:0 },
    { p:'=caja =de =vino', gap:0 }, '=adiccion|=adicto|=adicta',
    { p:'=mal =viaje', gap:0 }, { p:'=tomo|=bebo|=tomando =todos =los =dias', gap:0, not:['pastill*','remedio*','agua','te','cafe','once','desayuno','medicament*','la','el'] },
    { p:'=tomo|=bebo|=tomar|=beber =para =olvidar|=olvidarme|=aguantar|=pasar =la|=las =pena|=penas', gap:1 }, { p:'=tomo|=bebo =mucho|=harto|=demasiado', gap:0, not:['agua','te','cafe','jugo','leche','sol','once','tiempo','en'] }
  ],
  HUMANO: [
    { p:'=quiero|=necesito|=puedo|=prefiero =hablar =con =alguien|=persona|=humano|psicolog*|=profesional|=especialista|=real|=doctor|=doctora|=terapeuta', gap:3 },
    '=hay =alguien =real', { p:'=quiero|=necesito|=busco|=dame|=pasame =un|=una psicolog*|=psiquiatra|=especialista|=terapeuta|=profesional|=doctor|=doctora', gap:1 }, { p:'=llama|=llamen|=pasame =a =un|=una psicolog*|=especialista|=humano|=persona', gap:2 }, { p:'=hablar =con =persona|=humano|psicolog*|=especialista|=profesional|=alguien', gap:2 }
  ],
  ES_BOT: [
    { p:'=eres|=sos =bot|=robot|=ia|=maquina|=programa|=humano|=humana|=persona|=real|=inteligencia', gap:2 },
    { p:'=hablo|=hablando|=escribiendo =con =bot|=robot|=maquina|=persona|=humano|=ia', gap:2 },
    '=eres =real', { p:'=hay =alguien', gap:0 }, '=chatgpt|=gpt', '=inteligencia =artificial'
  ],
  RESPIRAR: [ '=respirar|=respiremos|=respiracion', '=calmarme|=relajarme|=tranquilizarme', { p:'=ejercicio =de|=para =respirar|=calmarme|=relajarme', gap:1 } ],
  POSITIVO: [
    { p:'=estoy|=siento|=ando|=quede|=sentir =mejor|=bien|=tranquilo|=tranquila|=aliviado|=aliviada|=feliz|=contento|=contenta|=mas', gap:1 },
    { p:'=un =poco =mejor', gap:0 }, '=me =ayudo|=sirvio', { p:'=me =hizo =bien', gap:1 }, '=mucho =mejor', '=bien', '=la =raja', '=bacan|=bakan|=filete|=chevere'
  ],
  DESPEDIDA: [ '=chao|=adios','=nos =vemos','=hasta =luego|=manana','=me =voy =a =dormir','=me =voy =a =acostar','=me =tengo =que =ir','=buenas =noches', { p:'=ya =me =voy', gap:0, not:['a','de','al','con','para','lejos'] }, { p:'=me =voy =a =ir', gap:0, not:['de','a','al','con','para','lejos','pronto','del'] } ],
  GRACIAS: [ '=gracias|=thanks|=thank|=agradecido|=agradecida|=obrigado|=obrigada|=merci|=mesi', '=se =agradece', '=te =pasaste', '=te =lo =agradezco' ],
  SALUDO: [ '=hola|=hey|=alo|=buenas|=saludos|=buenos|=holis' ],
  OFFTOPIC: [
    '=tarea|=receta|=pelicula|=peliculas|=serie|=series|=netflix|=futbol|=clima|=chiste|=chistes|=python|=javascript|=codigo|=programar|=programacion',
    { p:'=capital =de', gap:0 }, { p:'=cuanto =es', gap:0 }, '=resuelve|=resuelveme|=traduce|=traduceme|=recomiendame',
    { p:'=hazme|=escribeme =un|=una|=la', gap:0 }, { p:'=quien =gano', gap:0 }, '=bomba|=hackear|=hackeo|=poema|=ensayo'
  ]
};

/* temas: id, etiqueta, frases */
const THEMES = {
  soledad:   { label:'Soledad', ph:[ { p:'=siento|=estoy|=ando|=quede|=vivo|=sentir|=sentirme|=sintiendo =solo|=sola|=solito|=solita|=solos|=solas', gap:2 }, '=soledad', { p:'=nadie =me =entiende|=quiere|=pesca|=habla|=escucha|=apoya|=toma', gap:1 }, '=sin =amigos', { p:'=no =tengo =amigos|=nadie', gap:1 }, 'aislad*', '=me =ignoran|=ignora', { p:'=nadie =se =preocupa', gap:1 }, { p:'=no =conozco =a =nadie', gap:0 }, { p:'=extrano =mi =casa|=familia|=gente', gap:0 } ] },
  sueno:     { label:'Sueño', ph:[ '=no =duermo', { p:'=no =he =dormido', gap:1 }, { p:'=no =puedo|=logro =dormir', gap:1 }, '=insomnio', { p:'=duermo =mal|=poco|=nada', gap:1 }, 'desvel*', 'pesadilla*', { p:'=no =pego =un|=pestana|=ojo', gap:1 } ] },
  ansiedad:  { label:'Ansiedad', ph:[ { p:'=me =da|=dan =miedo', gap:0, not:['que','de','perder','decir','contar','hablar'] }, '=ansiedad|ansios*|angusti*', '=panico', 'nervios*', { p:'=me =ahogo', gap:0 }, { p:'=me =falta =el =aire', gap:1 }, '=taquicardia', 'estres*|estresad*', 'preocupad*', { p:'=me =tiembla|=tiemblan', gap:0 }, { p:'=tengo|=siento =miedo|=susto', gap:1 }, 'asustad*' ] },
  animo:     { label:'Ánimo bajo', ph:[ 'triste*|=tristeza', 'bajon*', '=depre|deprimid*|=depresion', '=chato|=chata|chatisim*', { p:'=para =la =caga|=cagada|=mierda', gap:0 }, { p:'=para =el =pico|=hoyo|=gato|=loly|=perro', gap:0 }, { p:'=como =el =forro|=pico|=ajo|=hoyo|=gato|=hoyo|=raja|=tuto', gap:0 }, { p:'=como =las =weas|=mierda|=pelotas', gap:0 }, { p:'=como =la =mierda|=caga|=callampa', gap:0 }, '=pesimo|=pesima|=fatal|=horrible', { p:'=terrible =de =mal', gap:0 }, '=vacio|=vacia', 'desesper*', { p:'=no =puedo =mas', gap:0 }, { p:'=no =doy =mas', gap:0 }, { p:'=no =aguanto|=soporto', gap:0, not:['a','al','la','el','que','los','las','esa','ese'] }, 'colapsad*', 'sobrepasad*', 'agobiad*', { p:'=tengo|=siento|=ando|=da|=dan =pena|=penita', gap:2, not:['ajena','por','de','que'] }, { p:'=nada =importa', gap:0 }, { p:'=me =supera|=superan', gap:0 }, 'llor*', { p:'=sin =ganas|=animo|=energia|=fuerzas', gap:0 }, { p:'=ganas =de =nada', gap:0 }, { p:'=no =tengo =ganas =de =nada|=vivir|=hacer|=levantarme|=salir', gap:1 }, { p:'=todo =me =da =lo =mismo', gap:0 }, { p:'=me =da =todo =lo =mismo', gap:0 }, '=nada =me =importa', { p:'=me =da =lo =mismo =todo', gap:1 }, { p:'=cansado|=cansada|=harto|=harta =de =todo', gap:1 }, { p:'=estoy|=siento|=ando|=sentir|=sentirme|=quede =mal|=pesimo|=horrible|=fatal|=terrible|=roto|=rota|=destruido|=destruida|=hundido|=hundida|=perdido|=perdida|=desmotivado|=desmotivada|=apagado|=apagada|=fome|=peor', gap:2 }, 'destruid*', 'devastad*', 'hundid*', { p:'=no =se =que =hacer', gap:0 }, '=peor', { p:'=no =estoy =bien', gap:0 }, '=mal|=pesimo|=pesima|=fatal|=horrible', { p:'=estoy|=ando|=siento|=sentir|=me =cansado|=cansada|=agotado|=agotada|=reventado|=reventada|=quemado|=quemada|=exhausto|=exhausta', gap:1, not:['de','con'] } ] },
  familia:   { label:'Familia', ph:[ '=familia', '=mama|=mami|=madre|=papa|=papi|=padre|=padrastro|=madrastra', { p:'=mis =viejos|=papas|=padres', gap:0 }, { p:'=mi =vieja|=viejo', gap:0 }, 'herman*', '=hijo|=hija|=hijos|=hijas', 'abuel*', { p:'=me =echaron =de =la =casa', gap:1 }, { p:'=me =quiero =ir|=escapar|=arrancar =de =mi|=la =casa', gap:1 } ] },
  pareja:    { label:'Pareja', ph:[ { p:'=triste|=mal|=pena|=extrano|=pelee|=peleamos|=peleo|=pelea|=peleas|=peleando|=discutimos|=problemas|=celos|=celoso|=celosa|=llorando =por|=con|=de =mi =pareja|=polola|=pololo|=novio|=novia|=esposo|=esposa|=marido|=ex|=pinche|=andante', gap:3 }, { p:'=polola|=pololo|=novio|=novia|=pareja|=esposo|=esposa|=marido =peleamos|=discutimos|=peleando|=peleo|=peleas', gap:3 }, { p:'=mi =ex', gap:0 }, { p:'=mi =pareja|=polola|=pololo|=novio|=novia|=esposo|=esposa|=marido =me =dejo|=termino|=corto|=engano|=engana|=grita|=trata|=ignora|=celo', gap:1 }, '=terminamos', { p:'=termino|=corto|=termine =conmigo|=con', gap:1 }, { p:'=me =dejo|=dejaron|=pateo|=patearon|=boto|=boteo', gap:0, not:['mal','pensando','triste','asi','loco','loca','marcado','marcada','sin','de','hablar','esperando','plantado','plantada','solo','sola','un','una','el','la','los','las'] }, { p:'=engane =a =mi', gap:0 }, '=ruptura|=separacion', { p:'=me =separe', gap:0 }, 'divorci*', { p:'=me =engano|=enganaron|=engana|=cagaron', gap:0 }, 'infiel*|=infidelidad', { p:'=me =puso|=pusieron =el =gorro|=cachos', gap:1 }, { p:'=me =cago', gap:0 } ] },
  despido:   { label:'Despido / cesantía', ph:[ { p:'=me =echaron|=despidieron|=desvincularon|=cortaron =pega|=trabajo|=laburo|=pegas|=chamba', gap:3 }, { p:'=me =despidieron|=desvincularon', gap:0 }, '=despido|=despedido|=desvinculado|=desvinculada', 'finiquit*', { p:'=quede|=estoy|=ando =cesante', gap:1 }, { p:'=sin =pega|=trabajo|=laburo|=pegas', gap:0 }, 'cesant*', { p:'=no =encuentro =pega|=trabajo|=laburo', gap:1 } ] },
  trabajo:   { label:'Trabajo', ph:[ '=trabajo|=laburo|=chamba|=curro', { p:'=la|=mi|=de|=en|=sin|=una|=nueva|=harta|=mucha|=esta|=esa =pega|=pegas', gap:0 }, '=jefe|=jefa', '=burnout', { p:'=me =explotan', gap:0 }, { p:'=mucha|=demasiada =pega|=carga|=trabajo', gap:0 } ] },
  estudios:  { label:'Estudios', ph:[ 'prueba*', '=paes|=psu', '=notas', 'examen*', '=repeti|=repetir|=repito|=repitiendo', '=universidad|=uni|=facultad|=instituto', '=ramo|=ramos', '=tesis', { p:'=la =u', gap:0 }, '=colegio|=liceo|=escuela', '=profe|=profesor|=profesora|=profes', '=curso', 'reprob*', { p:'=eche =el|=la =ramo|=prueba|=curso', gap:1 }, '=matricula' ] },
  dinero:    { label:'Dinero', ph:[ '=plata', '=lucas', 'deuda*', '=dicom', 'endeudad*', { p:'=no =me =alcanza', gap:0 }, '=arriendo', '=cuentas', { p:'=estoy|=ando =pato|=pata', gap:0 }, { p:'=sin =plata|=dinero', gap:0 }, '=apuesta|=apuestas|=casino|=apostando|=aposte', 'ludopat*' ] },
  duelo:     { label:'Duelo', ph:[ '=murio|=murieron|=fallecio|=fallecieron|=fallecimiento', { p:'=la =muerte =de =mi', gap:0 }, { p:'=se =murio|=suicido', gap:0 }, { p:'=perdi =a =mi', gap:0 }, '=funeral|=velorio|=duelo', { p:'=ya =no =esta =conmigo|=con', gap:0 }, { p:'=perdi =el|=mi =bebe|=guagua|=embarazo', gap:1 }, '=aborto' ] },
  bullying:  { label:'Bullying', ph:[ '=bullying|=ciberbullying', { p:'=me =molestan|=molesta', gap:0 }, { p:'=se =burlan|=rien =de =mi', gap:1 }, { p:'=me =funaron', gap:0 }, '=funa', { p:'=me =hacen =la =vida =imposible', gap:0 }, { p:'=me =excluyen', gap:0 }, { p:'=me =dejan =de =lado', gap:1 }, '=meme|=memes', { p:'=todos|=todas =se =rien|=burlan', gap:0 } ] },
  identidad: { label:'Identidad / orientación', ph:[ { p:'=soy =gay|=lesbiana|=bisexual|=bi|=trans|=queer|=pansexual', gap:0 }, '=no =binario|=binaria', 'lgbt*', { p:'=no =me =aceptan|=acepta', gap:0 }, { p:'=salir|=sali =del =closet', gap:0 }, { p:'=nombre =muerto', gap:0 }, '=deadname', { p:'=no =respetan =mis =pronombres', gap:0 }, 'homofob*|transfob*', { p:'=me =discriminan', gap:0 }, '=orientacion =sexual' ] },
  alimentacion:{ label:'Alimentación', ph:[ { p:'=no =como', gap:0, not:['tu','que','yo','asi','eso'] }, { p:'=no =he =comido', gap:1 }, { p:'=no =quiero =comer', gap:0 }, { p:'=deje|=dejo =de =comer', gap:0 }, 'vomit*', '=atracon|=atracones', { p:'=me =veo|=siento =gordo|=gorda', gap:1 }, { p:'=odio =mi =cuerpo', gap:0 }, 'bulimi*', 'anorexi*' ] },
  salud:     { label:'Salud', ph:[ '=enfermo|=enferma|=enfermedad', 'diagnostic*', '=cancer', { p:'=dolor =cronico', gap:0 }, { p:'=me =duele =todo', gap:0 }, '=hospital|=hospitalizado|=hospitalizada' ] },
  embarazo:  { label:'Embarazo', ph:[ 'embarazad*', { p:'=me =embarace', gap:0 }, { p:'=test =de =embarazo', gap:0 } ] },
  autoestima:{ label:'Autoestima', ph:[ { p:'=me =odio', gap:0 }, { p:'=soy =un|=una =fracaso|=inutil|=estorbo|=basura|=desastre|=perdedor|=perdedora|=asco', gap:1 }, { p:'=no =sirvo =para =nada', gap:1 }, { p:'=no =valgo =nada', gap:1 }, { p:'=soy =feo|=fea|=horrible', gap:1 }, { p:'=me =siento|=veo|=encuentro =feo|=fea|=horrible|=asqueroso|=asquerosa', gap:1 }, { p:'=soy =una|=un =mala|=mal =persona', gap:0 }, { p:'=soy =mala|=malo =persona', gap:0 }, { p:'=todos|=todas =son =mejores|=mejor =que =yo', gap:1 }, { p:'=nadie =me =quiere', gap:0 }, { p:'=soy =lo =peor', gap:0 }, { p:'=todo =lo =hago =mal', gap:0 }, { p:'=me =siento =un|=una =fracaso', gap:1 }, { p:'=no =soy =suficiente', gap:1 }, { p:'=todos|=todas =son =mas =lindos|=lindas|=bonitos|=bonitas|=inteligentes|=flacos|=flacas =que =yo', gap:1 } ] },
  culpa:     { label:'Culpa', ph:[ { p:'=mi =culpa', gap:1 }, '=culpable', { p:'=hice =cosas =malas|=terribles|=horribles', gap:0 }, { p:'=engane =a =mi', gap:0 } ] },
  rabia:     { label:'Rabia', ph:[ '=rabia', 'enojad*', 'furios*', { p:'=estoy|=ando =caliente|=choreado|=choreada|=emputecido|=emputecida', gap:1 }, { p:'=quiero =romper =todo', gap:1 }, { p:'=odio =a =todos', gap:0 } ] },
  vivienda:  { label:'Vivienda', ph:[ { p:'=me =echaron =de =la =casa', gap:1 }, { p:'=me =dijeron =que =me =fuera', gap:1 }, { p:'=no =tengo =donde =vivir|=dormir|=quedarme', gap:1 }, { p:'=vivo|=estoy|=quede =en =la =calle', gap:1 }, '=desalojar|=desalojo|=desalojan|=desalojaron', { p:'=me =van =a =echar =de =la|=mi =casa|=pieza|=depto', gap:1 }, { p:'=no =tengo =donde =ir', gap:1 } ] },
  posparto:  { label:'Posparto', ph:[ { p:'=tuve =una|=un =guagua|=bebe|=hijo|=hija', gap:1 }, { p:'=tuve =a =mi =guagua|=bebe|=hijo|=hija', gap:0 }, { p:'=di =a =luz', gap:0 }, { p:'=nacio =mi =guagua|=bebe|=hijo|=hija', gap:0 }, '=posparto|=postparto', { p:'=no =soy =buena =mama|=madre', gap:1 }, { p:'=recien =naci*', gap:1 }, { p:'=desde =que =naci*', gap:1 } ] },
  verguenza: { label:'Vergüenza', ph:[ { p:'=me =da =verguenza', gap:0 }, '=verguenza', 'avergonzad*' ] },
  migracion: { label:'Migración', ph:[ '=migrante|=inmigrante|=extranjero|=extranjera', { p:'=soy =venezolano|=venezolana|=peruano|=peruana|=colombiano|=colombiana|=haitiano|=haitiana|=boliviano|=boliviana|=ecuatoriano|=ecuatoriana|=dominicano|=dominicana|=cubano|=cubana|=argentino|=argentina', gap:0 }, { p:'=llegue =a =chile', gap:1 }, { p:'=lejos =de =mi =pais|=familia|=gente', gap:1 }, { p:'=extrano =mi =pais', gap:0 } ] }
};


Object.assign(L, {
  AYUDA: [ '=ayuda|=ayudame|=ayudenme|=aiuda|=auxilio|=socorro', { p:'=haz|=hace|=haga|=hagan|=hagas =algo', gap:1 }, { p:'=que =hago', gap:0, not:['con','para','en','de'] },
           { p:'=necesito =ayuda', gap:1 }, { p:'=sacame =de =esto|=aqui', gap:1 }, { p:'=no =me =dejes|=dejen =solo|=sola', gap:0 }, { p:'=que =puedo =hacer', gap:0, not:['con','para'] } ],
  ESPERA: [ { p:'=cuando =llega|=viene|=atienden|=atiende|=contesta|=responde|=llegan|=vienen', gap:2 }, { p:'=cuanto =falta|=demora|=tarda|=demoran|=tardan', gap:2 },
            { p:'=por =que =se =demora|=tarda|=demoran|=tardan', gap:1 }, { p:'=nadie =me =responde|=contesta|=atiende', gap:0 }, '=sigo =esperando',
            { p:'=donde =esta =el|=la =especialista|=psicologo|=psicologa', gap:1 }, { p:'=va =a =venir|=llegar', gap:1 }, { p:'=se =demora|=demoran =mucho', gap:0 } ],
  NO_LLAMAR: [ { p:'=no =puedo =llamar|=hablar|=marcar', gap:1, not:['con','de'] }, { p:'=no =tengo =saldo|=celular|=telefono|=minutos|=credito|=senal', gap:1 },
               { p:'=me =da =miedo|=verguenza|=paja =llamar', gap:1 }, { p:'=no =quiero =llamar', gap:0 }, { p:'=no =me =atrevo =a =llamar', gap:1 }, 'no =puedo =llamar' ],
  YA_LLAME: [ '=ya =llame', { p:'=llame =y =no =contestan|=contesta|=nadie|=ocupado', gap:2 }, { p:'=no =contestan|=responden', gap:0 }, { p:'=esta =ocupado', gap:0 }, { p:'=llame =al', gap:0 }, '=no =me =contestaron' ],
  FAQ_CONF: [ { p:'=es =confidencial|=privado|=anonimo|=secreto', gap:1 }, { p:'=quien =lee|=ve =esto|=mensajes', gap:2 }, { p:'=alguien =mas =va =a =leer', gap:1 }, { p:'=quien|=quienes =lee|=leen|=ve|=ven|=revisa|=revisan', gap:1 },
              { p:'=pueden|=puede|=podrian|=podria =ver|=leer =esto|=lo|=mis|=la|=esta|=que', gap:1 },
              { p:'=van|=vas =a =saber|=enterar|=avisar|=decir|=llamar|=contar =mis|=a =papas|=padres|=mama|=papa|=familia|=carabineros|=pacos|=policia|=colegio|=jefe|=apoderado', gap:3 },
              { p:'=le|=les =van|=vas =a =decir|=contar|=avisar', gap:1 }, { p:'=se =van|=va =a =enterar', gap:1 }, { p:'=me =van =a =internar|=encerrar', gap:1 } ],
  FAQ_COSTO: [ { p:'=es =gratis|=gratuito|=pagado', gap:0 }, { p:'=cuanto =cuesta|=sale|=cobran|=vale', gap:0 }, { p:'=hay|=tengo =que =pagar', gap:0 } ],
  FAQ_QUE: [ '=que =es =esto', { p:'=que =es =esta =pagina|=app|=wea', gap:0 }, { p:'=para =que =sirve|=sirves', gap:1 }, { p:'=como =funciona', gap:1 }, { p:'=quien =eres', gap:0 }, { p:'=como =te =llamas', gap:0 }, { p:'=que =haces', gap:0 }, { p:'=que =puedes =hacer', gap:0 }, { p:'=que =sabes =hacer', gap:0 }, { p:'=que =hace =esta =app|=pagina|=wea', gap:0 }, { p:'=que|=quien =es|=significa =nexo|=contenmente', gap:1 }, { p:'=que =es =conten =mente', gap:0 } ],
  QUEJA: [ { p:'=ustedes|=uds =no =sirven|=ayudan|=hacen', gap:1 }, { p:'=como =si =te =importara|=importase|=importa', gap:0 }, { p:'=esto|=wea|=cosa|=app|=bot|=pagina =no =sirve', gap:1 }, { p:'=no =te =importa', gap:0 }, { p:'=que =te =importa', gap:0 }, { p:'=a =ti =que', gap:0 }, { p:'=no =me =sirve|=sirves|=ayudas|=ayudando|=entiendes|=escuchas|=pescas|=estas', gap:2 }, { p:'=repites|=repetis|=dices =lo =mismo', gap:2 }, '=siempre =lo =mismo',
           { p:'=ya =me =lo =dijiste|=preguntaste', gap:1 }, { p:'=respuestas =automaticas|=genericas|=robot', gap:1 }, { p:'=no =estas =ayudando|=escuchando|=entendiendo', gap:0 }, { p:'=no =me =estas =pescando|=ayudando|=escuchando', gap:0 } ],
  NO_ENTIENDO: [ { p:'=no =entiendo|=entendi|=cacho|=cache', gap:1 }, { p:'=que =significa', gap:0 }, { p:'=que =quieres =decir', gap:0 }, '=como =asi', { p:'=a =que =te =refieres', gap:0 }, '=explicame' ],
  NO_HABLAR: [ { p:'=no =quiero =hablar|=contar|=escribir|=decirte', gap:1 }, { p:'=no =tengo =ganas =de =hablar', gap:0 }, { p:'=dejame =solo|=sola|=tranquilo|=tranquila', gap:1 }, { p:'=dejame =en =paz', gap:0 }, '=no =quiero =nada', { p:'=dejame|=dejenme', gap:0, not:['pensar','contarte','explicarte','decirte','ver','preguntarte','terminar','escribir','hablar','contar','explicar','decir'] }, { p:'=no =me =molestes|=molesten|=jodas|=hueas|=webees', gap:0 } ],
  PRESENCIA: [ { p:'=sigues|=estas =ahi|=aca|=aqui', gap:0 }, { p:'=te =fuiste', gap:0 }, { p:'=hay =alguien =ahi|=aca|=aqui', gap:0 }, '=alo', { p:'=me =escuchas|=lees', gap:0 }, '=respondeme|=contestame', { p:'=por =que =no =respondes|=contestas', gap:0 } ],
  DISCULPA: [ '=perdon|=disculpa|=disculpame|=disculpe|=sorry|=perdona|=perdoname' ],
  GROUNDING: [ '=ejercicio', '=aterrizar', { p:'=algo =para =calmarme', gap:1 } ]
});

const DEST2 = '=puente|=techo|=azotea|=borde|=cornisa|=balcon|=linea|=vias|=via|=acantilado|=precipicio|=viaducto|=ventana|=anden|=carretera|=autopista';
const SHARP = '=gillette|=gilette|=hoja|=hojas|=cuchilla|=cuchillas|=navaja|=cutter|=tijeras|=cuchillo|=cuerda|=soga|=pistola|=arma|=revolver|=veneno|=raticida';
L.NO_LLAMAR = L.NO_LLAMAR.concat([
  { p:'=no =voy|=pienso =llamar|=llamarlos|=llamarles|=llamarle', gap:1 }, '=no =llamare',
  { p:'=no =quiero =llamar|=llamarlos|=llamarles|=llamarle|=marcar', gap:2 }, { p:'=no =quiero =hablar =con =nadie', gap:1 },
  { p:'=no =puedo =hablar =por =telefono', gap:1 }, { p:'=hay =gente|=alguien =y =no =puedo =hablar', gap:2 }, { p:'=no =me =deja|=dejan =llamar|=usar =el =telefono', gap:1 },
  { p:'=no =me =sirve =llamar', gap:0 }, { p:'=no =quiero =que =me =escuchen', gap:1 }
]);
L.NO_HABLAR[0] = { p:'=no =quiero =hablar|=contar|=escribir|=decirte', gap:1, not:['de','del','sobre','con'] };
L.VIOLENCIA = L.VIOLENCIA.concat([
  { p:'=me =manda|=mando|=pide|=pidio|=piden|=envia|=envio|=obliga|=obligo|=mandan =fotos|=foto|=videos|=video|=packs|=pack|=nudes|=desnuda|=desnudo', gap:2 },
  { p:'=me =chantajea|=extorsiona|=chantajean|=extorsionan|=chantajeo|=extorsiono', gap:0 }, { p:'=amenaza|=amenazo|=amenazan =con =publicar|=subir|=mostrar|=mandar', gap:2 },
  '=sextorsion|=grooming', { p:'=un =adulto|=viejo|=hombre|=caballero =me =escribe|=habla|=manda|=pide', gap:2 },
  { p:'=abusaron|=abuso|=violaron|=violo =de =mi', gap:1 }, { p:'=me =abusaban|=pegaban|=golpeaban|=violaban', gap:0 },
  { p:'=me =quiere|=quieren =pegar|=golpear|=matar|=pegarme|=golpearme|=matarme|=ahorcar', gap:1 }, { p:'=me =va|=van =a =pegar|=golpear|=pegarme|=golpearme', gap:1, not:['si','cuando','nota','notas','prueba','ramo'] },
  { p:'=esta =rompiendo|=tirando|=quebrando =cosas|=todo|=la =casa', gap:1 }, { p:'=me =esta =pegando|=golpeando|=amenazando|=gritando|=buscando', gap:0 },
  { p:'=tiene =fotos|=videos =mias|=mios|=intimas|=desnuda|=desnudo', gap:1 }, { p:'=las|=los|=mis =va|=van =a =publicar|=subir|=mostrar|=pasar|=difundir', gap:1 },
  { p:'=si =no =le =mando|=paso|=envio =mas|=fotos|=plata', gap:1 }
]);
L.AUTOLESION = L.AUTOLESION.concat([ { p:'=me =quiero =cortar|=quemar|=lastimar', gap:1 }, { p:'=ganas =de =cortarme|=hacerme|=lastimarme|=quemarme', gap:1 }, { p:`=me =corto|=corte|=cortaba =con ${SHARP}`, gap:3 } ]);
L.PLAN = L.PLAN.concat([
  { p:`=tengo =las|=el|=la|=un|=una|=mis ${MED}|${SHARP} =mano|=aqui|=aca|=lado|=listas|=listo|=lista|=preparado|=preparadas|=preparada`, gap:3 },
  { p:'=me =voy =a =dormir =para =siempre', gap:0 }, { p:'=hoy|=noche|=manana|=ahora =me =mato', gap:1, not:['estudiando','trabajando','risa','haciendo','ejercicio','pega','gym','trabajo','estudi*','corriendo','entrenando','de','con','en','jaj*','xd'] }, { p:'=me =mato =hoy|=ahora|=manana', gap:0 }, { p:'=ganas =de =tirarme|=lanzarme|=saltar|=botarme', gap:1, not:['cama','piscina','sillon','sofa','suelo','pasto','agua','arena','carrete','clase','clases','encima','mar','rio','pileta','tobogan','ola','olas','pera','talla','tallas','foto','fotos'] }, { p:'=esta =noche =lo =hago|=termino', gap:1 }, { p:'=hoy =lo =hago|=termino|=acabo', gap:1 }
]);
const TIRNOT = ['cama','piscina','sillon','sofa','suelo','pasto','agua','arena','pedo','pedos','flojo','floja','carrete','clase','clases','almuerzo','comida','cena','turno','encima','mar','rio','foto','fotos','pera','talla','tallas','pelota','partido','ola','olas','pileta','tobogan'];
L.PLAN = L.PLAN.concat([ { p:'=me =quiero =tirar|=lanzar|=saltar', gap:0, not:TIRNOT }, { p:'=me =voy =a =tirar|=lanzar|=saltar', gap:0, not:['cama','piscina','sillon','sofa','suelo','pasto','agua','arena','pedo','pedos','flojo','floja','carrete','clase','clases','almuerzo','comida','cena','turno','encima','mar','rio','foto','fotos','la pera','talla','tallas','pelota','partido','ola','olas','pileta','tobogan'] } ]);
L.PASIVA = L.PASIVA.concat([ { p:'=seria =mejor =no =estar|=existir|=haber|=despertar|=vivir', gap:1 }, { p:'=mejor =no =estar|=existir', gap:0 }, { p:'=preferiria =no =estar|=existir|=despertar|=vivir', gap:1 } ]);
L.PASIVA = L.PASIVA.concat([
  { p:'=pienso|=pensando|=pense|=pensar =en =no =estar|=existir|=seguir|=despertar', gap:1 }, { p:'=no =estar =mas', gap:0, not:['aca','aqui','en','con','contigo','ahi','alla','tan','tranquil*','enojad*','triste*','sol*'] },
  { p:'=ya =vivi =lo =que =tenia', gap:1 }, { p:'=ya =cumpli =mi =ciclo|=etapa', gap:0 }, { p:'=estoy =de =mas|=sobra', gap:0 }, { p:'=ya =no =tengo =nada =que =hacer =aqui|=aca|=en', gap:1 },
  { p:'=ojala =dios =me =lleve|=llevara', gap:0 }, { p:'=que =dios =me =lleve', gap:1 }, { p:'=que =me =llegue =la =hora', gap:1 }, { p:'=no =merezco =vivir|=estar|=existir', gap:1 },
  { p:'=quiero =irme =con =ella|=el', gap:0, not:['a','al','de','para','donde','pa'] } ]);
L.PASIVA = L.PASIVA.concat([ '=ya =nada =importa', { p:'=quiero =dormir =para =siempre', gap:0 }, { p:'=nada =vale =la =pena', gap:0 }, { p:'=quisiera|=quiero =desaparecer', gap:2 } ]);
L.MEDIOS = L.MEDIOS.concat([ { p:`=tengo|=compre|=consegui|=guardo ${SHARP}`, gap:3 } ]);
L.SALUDO = [ '=hola|=hey|=alo|=buenas|=saludos|=buenos|=holis|=hello|=hi' ];
Object.assign(L, {
  SECRETO: [ { p:'=no =sabe|=saben', gap:0, not:['que','como','donde','cuando','si','nada','leer','hacer','cocinar','manejar'] }, { p:'=nadie =sabe', gap:0 }, { p:'=no =le|=les =he =contado|=dicho', gap:0 }, { p:'=no =se =lo|=los =he =contado|=dicho', gap:1 }, { p:'=a =nadie =le =he =contado|=dicho', gap:0 }, { p:'=nunca =se =lo|=le =he =contado|=dicho', gap:1 }, { p:'=nunca =lo =he =contado|=dicho|=hablado', gap:1 }, { p:'=no =quiero =que =sepa|=sepan', gap:2 }, { p:'=no =quiero =que =se =entere|=enteren', gap:2 }, '=es =un =secreto' ],
  NO_LO_HARIA: [ { p:'=no =lo =haria|=hare', gap:0 }, { p:'=no =me =atreveria|=atrevo', gap:0 }, { p:'=no =lo =voy =a =hacer', gap:0 }, { p:'=no =tengo =planes|=un =plan', gap:1 }, { p:'=nunca =lo =haria', gap:0 }, { p:'=pero =no =lo =haria', gap:0 } ],
  HERIDA: [ '=sangra|=sangrando|=sangro|=sangre', '=herida|=heridas', '=venda|=parche|=curita|=puntos|=gasa', { p:'=ir =al|=a =medico|=doctor|=hospital|=consultorio|=urgencia|=sapu|=cesfam', gap:1 }, { p:'=no =es =tan =profund*|=grave', gap:1 }, { p:'=no =es|=fue =profundo|=profunda|=grave|=tanto', gap:1 }, '=superficial', { p:'=en =el|=la =brazo|=pierna|=muneca|=muslo|=guata|=estomago|=mano', gap:0 } ],
  NADIE: [ { p:'=no =tengo =a =nadie|=quien', gap:1 }, { p:'=no =tengo =con =quien =hablar', gap:0 }, '=no =hay =nadie', { p:'=estoy|=vivo =sin =nadie', gap:0 }, { p:'=no =hay =nadie =mas', gap:0 } ],
  YA_DIJE: [ { p:'=ya =te =lo =dije|=conte', gap:0 }, { p:'=ya =te =dije|=conte|=respondi', gap:0 }, { p:'=te =acabo =de =decir|=contar', gap:0 }, { p:'=ya =lo =dije', gap:0 }, { p:'=te =dije =que', gap:0 }, '=no =lees', '=lee =bien', { p:'=lee =lo =que =escribo|=digo', gap:0 }, { p:'=lee =lo =que =te =escribo|=digo', gap:0 }, { p:'=otra =vez =con =lo =mismo', gap:1 }, { p:'=cuantas =veces =te =tengo =que =decir', gap:1 }, '=ya =respondi' ],
  MINIMIZA: [ { p:'=ya =se =me =paso', gap:0 }, { p:'=ya =paso', gap:0 }, { p:'=no =es =para =tanto', gap:0 }, '=exagere|=exagerando|=exagero', '=olvidalo|=olvidate', { p:'=no =importa', gap:0, not:['si','que','lo','cuanto','donde','como','nada'] }, { p:'=da =igual', gap:0 }, { p:'=fue =un =momento', gap:1 }, { p:'=ya =estoy =bien|=mejor', gap:0 }, { p:'=estoy =bien =ya', gap:0 }, { p:'=no =te =preocupes', gap:0 }, '=filo', { p:'=ya =fue', gap:0, not:['el','la','que','a','cuando','hace','ayer','hoy'] } ],
  GRACIAS_TODO: [ { p:'=gracias =por =todo', gap:0 }, '=cuidense', { p:'=los|=las =quiero =a =todos|=mucho', gap:1 }, { p:'=diganle =a =mi', gap:0 }, { p:'=ya =no =importa =nada', gap:0 }, { p:'=ya =da =lo =mismo', gap:0 }, { p:'=fue =un =gusto', gap:0 }, { p:'=hasta =nunca', gap:0 } ],
  VINCULO: [ { p:'=quieres =ser =mi =polola|=novia|=pololo|=novio|=pareja', gap:1 }, { p:'=pololeemos|=pololear =conmigo', gap:0 }, { p:'=eres =mi =unico|=unica|=mejor =amigo|=amiga|=apoyo', gap:1 }, { p:'=eres =el|=la =unico|=unica =que =me', gap:1 }, { p:'=nadie =me =entiende|=escucha =como =tu', gap:1 }, { p:'=te =quiero|=amo', gap:0, not:['preguntar','decir','contar','pedir','hacer','molestar','consultar','mostrar','explicar','hablar','comentar'] }, '=me =quieres', '=te =importo',
            { p:'=vas =a =estar =manana|=siempre|=despues', gap:1 }, { p:'=puedo =hablarte|=escribirte|=volver =manana|=despues|=otro|=mas', gap:1 }, { p:'=te =vas =a =acordar|=recordar =de =mi', gap:0 }, { p:'=solo =tu =me =entiendes|=escuchas|=pescas', gap:0 }, { p:'=nadie =me =entiende =como =tu', gap:0 }, '=te =extrane' ],
  CONSEJO: [ { p:'=que =hago =con', gap:0 }, { p:'=que =deberia|=debo =hacer', gap:0 }, { p:'=tu =que =harias', gap:0 }, { p:'=que =harias =tu', gap:0 }, { p:'=dame =un =consejo', gap:0 }, '=aconsejame', { p:'=crees =que =deberia|=debo', gap:0 }, { p:'=deberia =dejar|=terminar|=renunciar|=decirle|=contarle|=irme|=hablar', gap:0 }, { p:'=que =me =recomiendas', gap:0 } ],
  RAZON: [ { p:'=dame =una =razon|=razones =para =vivir|=seguir', gap:1 }, { p:'=por =que =deberia =seguir|=vivir', gap:1 }, { p:'=vale =la =pena =vivir|=seguir', gap:0 }, { p:'=para =que =vivir|=seguir|=existir', gap:0 }, { p:'=cual =es =el =sentido =de =la =vida', gap:1 }, { p:'=que =sentido =tiene =vivir|=seguir|=la', gap:1 } ],
  EXISTENCIAL: [ { p:'=por =que =a =mi', gap:0 }, { p:'=por =que =me =pasa|=pasan =esto|=estas|=todo', gap:1 }, { p:'=que =hice =para =merecer', gap:1 }, { p:'=por =que =la =vida =es =asi', gap:1 }, { p:'=por =que =soy =asi', gap:0 }, { p:'=por =que =nadie =me =quiere', gap:0 } ],
  RELIGION: [ '=dios|=diosito', '=rezar|=rezo|=rezando|=oracion|=orar', '=iglesia|=pastor|=biblia', '=pecado', '=infierno', '=castigo =divino' ],
  CAMBIO_TEMA: [ { p:'=cambiemos|=cambiar =de =tema', gap:0 }, { p:'=hablemos =de =otra =cosa', gap:1 }, { p:'=no =quiero =hablar =de =eso|=esto|=ese|=ese', gap:1 }, { p:'=otra =cosa', gap:0, not:['que','mas','es','me'] } ],
  PERSONAL_BOT: [ { p:'=como =estas =tu', gap:0 }, { p:'=y =tu =como =estas', gap:0 }, { p:'=tu =como =estas', gap:0 }, { p:'=tienes =sentimientos|=emociones|=amigos|=familia', gap:0 }, { p:'=cuantos =anos =tienes', gap:0 }, { p:'=eres =feliz', gap:0 }, { p:'=que =te =gusta', gap:0 } ],
  NO_SE_DECIR: [ { p:'=no =se =que =decir|=escribir|=contar|=poner', gap:1 }, { p:'=no =se =por =donde =empezar', gap:0 }, { p:'=no =se =como =explicarlo|=explicar|=decirlo|=decir', gap:0 }, { p:'=me =cuesta =hablar|=explicar|=expresarme|=decirlo', gap:1 } ],
  TRATAMIENTO: [ { p:'=tengo|=tuve =psicologo|=psicologa|=psiquiatra|=terapeuta', gap:1 }, { p:'=voy =al|=a =psicologo|=psicologa|=psiquiatra|=terapeuta', gap:1 }, { p:'=estoy =en =tratamiento|=terapia', gap:0 }, { p:'=mi =psicologo|=psicologa|=psiquiatra|=terapeuta', gap:0 }, { p:'=tomo =antidepresivos|=medicamentos', gap:1 }, { p:'=me =dieron =de =alta', gap:0 }, { p:'=tengo =hora =con|=al|=a =psicologo|=psicologa|=psiquiatra|=terapeuta', gap:2 }, { p:'=estuve =internado|=internada|=hospitalizado|=hospitalizada', gap:0 }, { p:'=fui|=empece|=comence|=volvi =al|=a =la =psicologo|=psicologa|=psiquiatra|=terapia|=terapeuta', gap:1 } ],
  LUGAR_PELIGRO: [ { p:`=estoy|=ando|=sigo =en|=arriba ${DEST2}`, gap:3 }, { p:`=me =subi =al|=a ${DEST2}`, gap:2 }, { p:'=al =borde', gap:0 } ],
  OTRO_RIESGO: [ { p:'=kill =myself', gap:0 }, { p:'=want|=wanna =to =die', gap:1 }, '=suicide|=suicidal', { p:'=end =my =life', gap:0 }, { p:'=quero =morrer', gap:0 }, { p:'=vou =me =matar', gap:0 }, { p:'=veux =mourir', gap:0 }, { p:'=me =suicider', gap:0 }, { p:'=vle =mouri', gap:0 }, { p:'=touye =tet', gap:0 } ]
});

const C = {}; for (const k in L) C[k] = compile(L[k]);
const CT = {}; for (const k in THEMES) CT[k] = compile(THEMES[k].ph);

const ORDER = ['EMERGENCIA','METODO','PLAN','IDEACION','AUTOLESION','DANO_OTROS','VIOLENCIA','DUELO_SUICIDIO','TERCERO','INTENTO_PREVIO','RAZON','PASIVA','IDEACION_NEGADA','NO_LLAMAR','YA_LLAME','YA_DIJE','AYUDA','ESPERA','FAQ_CONF','FAQ_COSTO','FAQ_QUE','FAQ_PROTOCOLO','QUEJA','NO_ENTIENDO','CAMBIO_TEMA','NO_HABLAR','PRESENCIA','VINCULO','CONSEJO','EXISTENCIAL','PERSONAL_BOT','NO_SE_DECIR','JAILBREAK','SEXUAL','DATOS','MEDICO','SPAM','INSULTO','SUSTANCIAS','EN_SERIO','BROMA','MINIMIZA','HUMANO','ES_BOT','TRATAMIENTO','GROUNDING','HERIDA','NO_LO_HARIA','SECRETO','TEMA','NADIE','RELIGION','DISCULPA','RESPIRAR','POSITIVO','GRACIAS_TODO','DESPEDIDA','GRACIAS','SALUDO','OFFTOPIC','OTRO_IDIOMA','PREGUNTA','SILENCIO','GIBBERISH'];
const RISKY = new Set(['EMERGENCIA','METODO','PLAN','IDEACION','AUTOLESION','DANO_OTROS','VIOLENCIA']);
const NEGATABLE = new Set(['IDEACION','PLAN','PASIVA','AUTOLESION','POSITIVO','SUSTANCIAS']);
const RISK_OF = { EMERGENCIA:'high',METODO:'high',PLAN:'high',IDEACION:'high',AUTOLESION:'high',DANO_OTROS:'high',VIOLENCIA:'high',TERCERO:'mid',INTENTO_PREVIO:'mid',DUELO_SUICIDIO:'mid',PASIVA:'mid',IDEACION_NEGADA:'mid',SUSTANCIAS:'mid' };
const RANK = { low:0, mid:1, high:2 };
const FLAG_LABEL = {
  PLAN_CON_FECHA:'Plan con fecha', PLAN_LUGAR:'Plan en un lugar (metro, puente, altura)', GOLPE_PARED:'Se golpeó por rabia', HIPERBOLE:'Dijo "me quiero morir" como exageración (verificar)',
  MALTRATO_MENOR:'Posible maltrato a menor', ARMA_FUEGO:'Tiene un arma de fuego', NECESIDAD_BASICA:'Sin recursos para comer', LUGAR_RIESGO:'En un lugar de altura (verificar)',
  CORRECCION:'Se corrigió (escribió algo por error)', NOTICIA_SUICIDIO:'Impactado por noticia de suicidio', FRASE_AMBIGUA:'Frase ambigua con fecha', MASCOTA:'Duelo o enfermedad de mascota',
  DIAGNOSTICO:'Diagnóstico médico grave', GANAS_AUTOLESION:'Ganas de autolesionarse',
  EMERGENCIA:'Emergencia en curso', METODO:'Pregunta por método', PLAN:'Plan o despedida', IDEACION:'Ideación suicida',
  AUTOLESION:'Autolesión', DANO_OTROS:'Riesgo hacia otros', VIOLENCIA:'Violencia o abuso', TERCERO:'Consulta por un tercero',
  INTENTO_PREVIO:'Intento previo', PASIVA:'Ideación pasiva', IDEACION_NEGADA:'Menciona y niega ideación', MEDIOS:'Acceso a medios',
  INMINENTE:'Inminencia', MENOR:'Posible menor de edad', SUSTANCIAS:'Alcohol o drogas', MEDICO:'Pregunta por medicamentos',
  INSULTO:'Lenguaje agresivo', BROMA:'Dijo que era broma', JAILBREAK:'Intento de manipular el bot', SEXUAL:'Contenido sexual', SPAM:'Spam',
  NO_SEGURO:'No está en lugar seguro', SOLO:'Está solo/a', NO_PUEDE_LLAMAR:'No puede o no quiere llamar', PLAN_B:'Se activó el plan B', SIN_RESPUESTA_SEGURIDAD:'No respondió si está a salvo', MINIMIZA:'Minimiza tras la crisis', DESPEDIDA_EN_CRISIS:'Se despidió en crisis', OTRO_IDIOMA:'Escribe en otro idioma', LUGAR_PELIGRO:'En un lugar de riesgo',
  ACOSO_LABORAL:'Acoso laboral', AGRESOR:'Reconoce agredir a otra persona', AMENAZA_SUICIDA:'Le amenazan con suicidarse', AUTOLESION_PASADA:'Autolesión en el pasado',
  CAMBIO_ESPECIALISTA:'Pide otro especialista', CICATRICES:'Cicatrices de autolesión', CONTROL_PAREJA:'Control de la pareja', CUIDADOR:'Sobrecarga de cuidador/a',
  DECISION:'Habla de una decisión tomada', DISCRIMINACION:'Discriminación', DISOCIACION:'Sensación de irrealidad', DUELO_GESTA:'Pérdida de embarazo',
  DUELO_SUICIDIO:'Duelo por suicidio', EMERG_OTRO:'Emergencia médica de otra persona', HORA_AGENDADA:'Ya tiene hora con un profesional', HOSPITAL:'Está en un hospital',
  MEDIOS_CERCA:'Tiene medios a mano', MED_DEJAR:'Quiere dejar su medicación', MED_EFECTO:'Malestar con su medicación', PANICO:'Crisis de pánico',
  PIDE_BORRAR:'Pide borrar sus datos', POSIBLE_INTENTO:'Posible intento en curso', PROFESIONAL:'Profesional probando', QUEJA_ESP:'Queja sobre un especialista',
  RAZON:'Pide razones para vivir', RAZONES:'Nombró razones para vivir', RETRACTA_EMERGENCIA:'Dijo que la emergencia era broma', SIN_VIVIENDA:'Sin lugar para dormir',
  TERCERO_PREOCUPA:'Preocupación por otra persona', TERCERO_REDES:'Vio riesgo en redes sociales', TRAUMA:'Síntomas tras un trauma', VIOLENCIA_PSICOLOGICA:'Violencia psicológica',
  VOCES:'Escucha voces', IDEACION_HUMOR:'Ideación dicha en broma',
  IDEACION_PASADA:'Ideación en el pasado', AUTOLESION_SIN_IDEACION:'Autolesión sin intención de morir', NO_QUIERE_PSICOLOGO:'No quiere hablar con un psicólogo', PLAN_PASTILLAS:'Plan con pastillas',
  VIOLENCIA_EN_CURSO:'Violencia en curso', VIOLENCIA_SEXUAL_RECIENTE:'Violencia sexual reciente (menos de 72 h)', TERCERO_URGENTE:'Otra persona se despidió (urgente)', URGENCIA_MEDICA:'Posible urgencia médica',
  MALTRATO_LABORAL:'Maltrato en el trabajo', CRIANZA:'Sobrecarga en la crianza', ACADEMICO:'Consulta académica', SIN_PLAN:'Dice no tener un plan'
};
const URGENT = new Set(['EMERGENCIA','PLAN','INMINENTE','NO_SEGURO','DESPEDIDA_EN_CRISIS','LUGAR_PELIGRO','POSIBLE_INTENTO','EMERG_OTRO','MEDIOS_CERCA','AGRESOR','VOCES','VIOLENCIA_EN_CURSO','TERCERO_URGENTE','URGENCIA_MEDICA']);
const YES = new Set(['si','sip','sep','simon','obvio','claro','afirmativo','exacto','correcto','seguro','yes','sii','sipi','efectivamente','totalmente','cierto','verdad']);
const ACK = new Set(['ok','okey','oka','okay','ya','dale','bueno','listo','vale','aja','yap','sale','ahi','va','oki','okis','mm','mmm','ah']);
const NO_NEXT = new Set(['no','estoy','hay','ay','tengo','se','lo','nada','nunca','gracias','po','creo','para','solo','sola','mucho','tanto','ahora','todavia','aun','nadie','la','el','me','tan','realmente','exactamente','sabria','puedo']);
const NO_ = new Set(['no','nop','nope','nel','na','nah','nunca','negativo','tampoco','nones','jamas']);
const FOREIGN = new Set(['i','you','the','and','to','want','die','help','my','is','am','are','not','can','feel','sad','please','life','kill','myself','need','someone','talk','what','how','why','this','it','so','very','really','im','dont','cant','know','hello','hi','eu','voce','nao','quero','morrer','ajuda','estou','muito','sozinho','sozinha','minha','preciso','falar','alguem','je','veux','mourir','aide','moi','suis','seul','seule','mwen','vle','mouri','ede','konnen','tris','poukisa','bonjou','anpil','pa','do','speak','english','spanish','understand','language','sorry','falo','espanhol','obrigado','obrigada','oi','tudo','fala','portugues','entendo','nao']);
const LAUGH = /^(?:a?(?:j+[aeisou]+)+j*|(?:js)+j?|x+d+|lol|lmao|(?:ha)+h?|(?:je)+|k+a+k+a*)$/;
const ANSW = new Set('si no lo la el los las le me te se he ha a y o que eso esas esos cosas pienso pensado pense pensar en pasa pasado por cabeza mente momentos ratos rato dias noches ultimamente antes ahora tanto mucho poco nada ya bien muy harto siempre nunca todos cada vez veces cuando aparece aparecen idea ideas pensamiento pensamientos morir matarme vivir quitarme vida desaparecer hacerlo haria hare quiero quisiera ganas de del al con sin solo sola estoy siento sentido creo verdad pero tambien asi mas menos segura seguro tengo hay alguien nadie casa aqui aca eh em mm mmm uf ay bueno pucha oh ah osea sea como igual tal nose po sabria decir'.split(' '));

/* ───────── 4. Análisis ───────── */
function analyze(raw){
  const n = normalize(raw);
  const toks = n.toks, keys = toks.map(phon);
  const hits = {}, spans = [];
  const run = name => { const r=[]; for (const ph of C[name]) for (const m of matchPhrase(ph,toks,keys)) r.push(Object.assign(m,{src:ph.src})); return r; };
  for (const name of ['TERCERO','DANO_OTROS','INTENTO_PREVIO']) { let m = run(name); if (name === 'INTENTO_PREVIO') m = m.filter(x => !negated(toks, x.s)); if (m.length) { hits[name]=m; spans.push(...m); } }
  const overlaps = x => spans.some(s => x.s <= s.e && x.e >= s.s);
  let negRisk = false;
  for (const name of Object.keys(C)) {
    if (name==='TERCERO' || name==='DANO_OTROS' || name==='INTENTO_PREVIO') continue;
    let m = run(name).filter(x => !overlaps(x));
    if (!m.length) continue;
    if (NEGATABLE.has(name)) {
      const pos = m.filter(x => !negated(toks,x.s)), neg = m.filter(x => negated(toks,x.s));
      if (!pos.length && neg.length) {
        if (name==='IDEACION' || name==='PLAN' || name==='PASIVA' || name==='AUTOLESION') negRisk = true;
        if (name==='POSITIVO') hits._negPositive = true;
        continue;
      }
      m = pos;
    }
    hits[name] = m;
  }
  if (hits._negPositive) delete hits.POSITIVO;
  // temas (respetan negación)
  const themes = [];
  for (const k in CT) {
    let found = false;
    for (const ph of CT[k]) for (const m of matchPhrase(ph,toks,keys)) if (!negated(toks,m.s) && !overlaps(m)) found = true;
    if (found) themes.push(k);
  }
  if (hits._negPositive && !themes.includes('animo')) themes.push('animo');
  if (themes.includes('despido')) { const i=themes.indexOf('trabajo'); if (i>=0) themes.splice(i,1); }
  if (negRisk && !['IDEACION','PLAN','PASIVA','AUTOLESION','EMERGENCIA','METODO'].some(k=>hits[k])) hits.IDEACION_NEGADA = [{s:0,e:0}];
  if (n.riskEmoji && !RISKY_PRESENT(hits)) hits.PASIVA = hits.PASIVA || [{s:0,e:0}];
  if (hits.TRATAMIENTO && hits.QUEJA && /psicolog|psiquiatr|terapeut|terapia/.test(n.text)) delete hits.QUEJA;
  if (hits.YA_DIJE && /\bquien(es)?\b/.test(n.text)) delete hits.YA_DIJE;
  // la enfermedad de otra persona no es "tu salud"
  if (themes.includes('salud') && /\b(mi|mis|su|sus) (mama|papa|abuel\w*|herman\w*|hij\w*|tia|tio|pareja|esposo|esposa|marido|amig\w*|polol\w*|perr\w*|gat\w*|suegr\w*)\b/.test(n.text) && !/\b(tengo|me diagnosticaron|me detectaron|estoy enferm|me duele)\b/.test(n.text)) themes.splice(themes.indexOf('salud'), 1);
  if (themes.includes('salud') && themes.includes('duelo') && !/\b(tengo|me diagnosticaron|estoy enferm)\b/.test(n.text)) themes.splice(themes.indexOf('salud'), 1);
  if (hits.INSULTO && /\b(estoy|ando|toy|me siento|mi vida|esta vida|de vida|la vida|todo es|me tiene|estoy chat|que lata|que mierda de)\b/.test(n.text) && !/\b(bot|eres|eri|erai|sos|tu|contigo|te odio|callate)\b/.test(n.text)) delete hits.INSULTO;
  if (hits.VIOLENCIA && /\bme pego (cabezazos|cabesazos|en la cabeza|contra la pared|a mi mism\w*|combos|punetes|puñetes|cachetadas)\b/.test(n.text)) { delete hits.VIOLENCIA; hits.AUTOLESION = [{s:0,e:0}]; }
  if (hits.DUELO_SUICIDIO) { delete hits.PASIVA; delete hits.TERCERO; if (!themes.includes('duelo')) themes.push('duelo'); }
  if ((hits.IDEACION || hits.PASIVA) && /\b(y )?si (me |alguien |uno |una persona |yo )?(quisiera|quiere|quiero|quisieras|dijera|digo|dice|pensara)\b.*\b(que (haces|harias|pasa|pasaria|hacen|hace)|como (ayudas|funciona|reaccionas))\b/.test(n.text)) { delete hits.IDEACION; delete hits.PASIVA; delete hits.FAQ_QUE; hits.FAQ_PROTOCOLO = [{s:0,e:0}]; }
  if (hits.AYUDA && /\b(nada|no|nadie) (me|te|le|nos) (ayuda|sirve)/.test(n.text)) { delete hits.AYUDA; if (!themes.includes('animo')) themes.push('animo'); }
  // "me ayuda a sentir algo" no es pedir ayuda
  if (hits.AYUDA && /\b(me|te|le|nos|les|eso|esto|que|si) ayuda(ba|ria)? (a|con|para|mucho|harto|un poco|bastante|bien)\b/.test(n.text) && !/\b(necesito|pido|quiero|busco) ayuda\b|^ayuda\b/.test(n.text)) delete hits.AYUDA;
  // "no es broma" confirma lo dicho
  if (hits.BROMA && /\bno (es|era|fue|estoy|estaba|te estoy|lo estoy|lo digo|lo dije) (una |de )?(broma|bromeando|jugando|webeando|weando|hueveando|mentira|chiste|jodiendo|en broma|molestando)\b|\bno bromeo\b/.test(n.text)) { delete hits.BROMA; hits.EN_SERIO = [{s:0,e:0}]; }
  // "no les importo" no es "no lees"
  if (hits.YA_DIJE && /\bno les\b/.test(n.text) && !/\bno lees\b/.test(n.text)) delete hits.YA_DIJE;
  // el profe jefe no es la pega
  if (themes.includes('trabajo') && /\b(profe|profesor|profesora) jef[ea]\b/.test(n.text) && !/\b(trabajo|pega|laburo|oficina|chamba)\b/.test(n.text)) themes.splice(themes.indexOf('trabajo'), 1);
  if (toks.length===1 && toks[0]==='mejor') hits.POSITIVO = [{s:0,e:0}];
  if (!toks.length) hits.SILENCIO = [{s:0,e:0}];
  if (hits.OTRO_RIESGO) { hits.IDEACION = hits.IDEACION || hits.OTRO_RIESGO; hits.OTRO_IDIOMA = [{s:0,e:0}]; }
  else if (toks.length >= 2 && toks.filter(w => FOREIGN.has(w)).length / toks.length >= 0.5) hits.OTRO_IDIOMA = [{s:0,e:0}];
  if (/^(por favor ?)+$/.test(toks.join(' ')+' ') || /^por favor$/.test(toks.join(' '))) hits.AYUDA = hits.AYUDA || [{s:0,e:0}];
  if (n.math) hits.OFFTOPIC = hits.OFFTOPIC || [{s:0,e:0}];
  const isQ = /\?\s*$/.test(String(raw)) || /^\s*¿/.test(String(raw));
  if (!isQ && !hits.BROMA && /\b(lo digo|hablo|te lo digo|lo dije|te hablo|lo estoy diciendo|es|era|va|iba) (muy |bien |totalmente |completamente )?en serio\b|^(en serio|hablo en serio)$/.test(n.text)) hits.EN_SERIO = hits.EN_SERIO || [{s:0,e:0}];
  if (hits.ES_BOT && !isQ && /^(si|sip|no|nop|ya|claro|obvio)\b/.test(n.text) && /\bhay alguien\b/.test(n.text)) delete hits.ES_BOT;
  if (toks.length <= 2 && toks.every(w => /^(que|como|q)$/.test(w)) && (isQ || toks.length===1 && toks[0]!=='como')) hits.NO_ENTIENDO = hits.NO_ENTIENDO || [{s:0,e:0}];
  const realHits = Object.keys(hits).filter(k => !k.startsWith('_') && k !== 'INMINENTE' && k !== 'MEDIOS');
  if (isQ && !realHits.length && !themes.length) hits.PREGUNTA = [{s:0,e:0}];
  // tema
  if (themes.length) hits.TEMA = [{s:0,e:0}];
  const laugh = toks.some(w => LAUGH.test(w));
  const flags = new Set();
  const minor = (n.age !== null && n.age < 18 && n.age >= 6) || n.school || /\b(?:soy menor|menor de edad)\b/.test(n.text);
  if (minor) flags.add('MENOR');
  if (hits.MEDIOS) flags.add('MEDIOS');
  // galimatías
  const known = Object.keys(hits).filter(k=>!k.startsWith('_')).length;
  if (!known && toks.length && !toks.some(w => LAUGH.test(w))) {
    const noVowel = toks.filter(w => w.length > 2 && !/[aeiou]/.test(w) && !/^\d+$/.test(w)).length;
    const mash = toks.some(w => /(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|qwerty)/.test(w));
    if (mash || noVowel/toks.length >= 0.5) hits.GIBBERISH = [{s:0,e:0}];
  }
  // respuesta corta sí/no
  let answer = null;
  const at = toks.filter(w => !LAUGH.test(w) && !['weon','po','cachai','oye','pues','bueno','mira','igual'].includes(w) || (toks.length === 1));
  const t2 = at.join(' ');
  if (at.length && at.length <= 8) {
    if (/\bte dije que si\b|\b(creo que si|obvio que si|claro que si|si he|lo he pensado|he pensado|si a veces|si po|a veces si)\b/.test(t2)) answer = 'yes';
    else if (/\bte dije que no\b/.test(t2)) answer = 'no';
    else if (/\b(pa konnen|dont know|not sure|nao sei|je sais pas|je ne sais pas)\b/.test(t2)) answer = 'unsure';
    else if (/^(wi|oui|sim|yes|yeah|yep)$/.test(t2)) answer = 'yes';
    else if (/^(non|nao|nope|pa)$/.test(t2)) answer = 'no';
    else if (/\b(no se|no lo se|ni idea|mas o menos|a veces|tal vez|quizas|quiza|puede ser|depende|no estoy seguro|no estoy segura|algo asi|un poco(?! (mejor|peor|mas|menos|bien|mal))|capaz|si y no|no estoy tan seguro|no estoy tan segura|no sabria)\b/.test(t2) || /^(creo|igual|no se po)$/.test(t2)) {
      answer = 'unsure';
      const rest = t2.replace(/\b(no se|no lo se|ni idea|mas o menos|a veces|tal vez|quizas|quiza|puede ser|depende|no estoy (tan )?segur[oa]|algo asi|un poco|capaz|si y no|no sabria( decir)?|la verdad)\b/g, ' ').split(/\s+/).filter(Boolean);
      if (rest.some(w => !ANSW.has(w))) answer = null;
    }
    else if (/^(no )?(en verdad|la verdad|realmente|de verdad|en realidad) no$|^no (en verdad|la verdad|realmente|de verdad|en realidad)$/.test(t2)) answer = 'no';
    else if (/\b(creo que no|obvio que no|claro que no|para nada|ni ahi|ni cagando|nada que ver|en absoluto|no h?ay nadie|no tengo a nadie|no tengo a quien)\b/.test(t2) || /^(todavia no|aun no|ahora no|no gracias|no po|no nada)$/.test(t2) || t2 === 'cero' || /^no,? (no )?tanto$/.test(t2) || (NO_.has(at[0]) && (at.length === 1 || NO_NEXT.has(at[1])))) answer = 'no';
    else if (YES.has(at[0]) || /\b(estoy a salvo|estoy seguro|estoy segura|hay alguien|esta conmigo|estan conmigo|ya llame|puedo llamar|ya lo hice|me aleje)\b/.test(t2)) answer = 'yes';
    else if (at.every(w => ACK.has(w))) answer = 'ack';
  }
  const imminent = !!hits.INMINENTE;
  delete hits.INMINENTE; delete hits.MEDIOS;
  const primary = ORDER.find(k => hits[k]) || (laugh ? 'RISA' : 'NADA');
  let risk = 'low';
  for (const k of Object.keys(hits)) if (RISK_OF[k] && RANK[RISK_OF[k]] > RANK[risk]) risk = RISK_OF[k];
  if (risk === 'low' && themes.includes('animo')) risk = 'mid';
  for (const k of Object.keys(hits)) if (FLAG_LABEL[k] && !['TEMA'].includes(k)) flags.add(k);
  if (imminent && RANK[risk] >= 1) flags.add('INMINENTE');
  return { raw, norm:n.text, toks, primary, intents:Object.keys(hits).filter(k=>!k.startsWith('_')), themes, risk, flags:[...flags], answer, laugh, imminent, age:n.age, matches:hits };
}
function RISKY_PRESENT(h){ return ['EMERGENCIA','METODO','PLAN','IDEACION','AUTOLESION','PASIVA','INTENTO_PREVIO'].some(k=>h[k]); }

/* ───────── 5. Diálogo ───────── */
const R = {
  start: ['Hola, soy Nexo, el chatbot de ConténMente. Este es un espacio seguro y confidencial: puedes escribir lo que sientas, como te salga y a tu ritmo.', '¿Cómo te sientes ahora?'],
  search: ['Ya estoy buscando un especialista para que te atienda hoy o mañana. Mientras tanto, sigo aquí contigo.','Ya avisé a un especialista para que te atienda. Mientras llega, aquí estoy.'],
  follow: ['¿Desde cuándo te vienes sintiendo así?','¿Qué es lo que más te pesa hoy?','¿Hay alguien de confianza con quien hayas podido hablarlo?','¿Qué cosas te han ayudado otras veces, aunque sea un poco?','¿Cómo ha sido tu día hoy?','¿Cómo está tu cuerpo ahora: cansado, tenso, inquieto?','¿Y cómo te hace sentir todo eso?','Si pudieras cambiar una sola cosa de lo que estás viviendo, ¿cuál sería?'],
  openers: ['¿Cómo te sientes hoy?','¿Qué te trajo por aquí hoy?','Cuéntame, ¿cómo has estado?'],
  crisisKeep: [
    ['Te leo. Sigo aquí contigo.','¿Cómo estás en este momento, ahora mismo?'],
    ['Gracias por seguir escribiendo; eso ayuda.','¿Qué es lo más difícil en este momento?'],
    ['Lo que sientes ahora es muy intenso, pero las crisis bajan, aunque ahora no lo parezca.','¿Hay algo cerca que te dé un poco de calma: agua, una ventana abierta, una mascota, una canción?'],
    ['No tienes que resolver nada ahora. Solo pasar este momento, y no lo vas a pasar sin compañía.','¿Qué se te está pasando por la cabeza?'],
    ['Aquí sigo, no me voy.','¿Puedes tomar un poco de agua y contarme dónde estás ahora?'],
    ['Te estoy leyendo con atención.','¿Hay algo que te haya ayudado a seguir hasta hoy, aunque sea chiquito?']
  ],
  ackShort: ['Entiendo.','Te leo.','Ok, te sigo.','Gracias por contármelo.','Ya veo.'],
  ackLong: ['Gracias por contarme todo eso. Se nota que es mucho.','Te leí con atención. Es harto lo que estás cargando.','Gracias por la confianza de escribir todo esto.','Lo que cuentas tiene mucho sentido, y se nota que te ha costado.'],
  screen: 'A veces, cuando alguien se siente así, aparecen pensamientos de no querer vivir. Te lo pregunto directo porque me importa: ¿has tenido pensamientos de quitarte la vida?',
  askSafe: ['¿Estás en un lugar seguro en este momento?','Necesito saber algo importante: ¿estás en un lugar seguro ahora?','¿Ahora mismo estás en un lugar seguro?'],
  askWith: ['¿Hay alguien contigo ahora, aunque sea en la misma casa?','¿Estás con alguien en este momento?'],
  askContact: ['¿Hay alguien a quien puedas escribirle o llamar ahora: un familiar, una amistad, un vecino?','¿Habría alguien de confianza a quien le puedas mandar un mensaje ahora?'],
  askMeans: 'Hay algo que sí te quiero pedir: si tienes cerca algo con lo que te puedas hacer daño, ¿lo puedes dejar en otra pieza o lejos de ti?',
  offerExercise: '¿Quieres que hagamos un ejercicio corto para bajar la intensidad mientras llega el especialista?'
};
const T = {
  soledad:   { r:['La soledad pesa muchísimo. Me alegra que hayas escrito.','Esa sensación de que nadie está ahí duele mucho, y aquí sí hay alguien leyéndote.'], a:['Gracias por contármelo. La soledad cansa mucho.'], f:['¿Hay alguna persona, aunque sea una, con quien te sientas un poco más cerca?','¿Desde cuándo te sientes así?'] },
  sueno:     { r:['Dormir mal hace que todo se sienta más pesado.','Cuando el sueño se desordena, la cabeza no logra descansar.'], f:['¿Hace cuánto estás durmiendo así?','¿Qué te da vueltas en la cabeza cuando intentas dormir?'] },
  ansiedad:  { r:['Esa angustia es agotadora, y tiene sentido que te sientas así.','La ansiedad se puede sentir en todo el cuerpo y asusta mucho.'], a:['Entiendo, eso puede tener la cabeza dando vueltas todo el día.'], f:['¿Qué es lo que más te preocupa en este momento?','¿La estás sintiendo ahora? Si quieres, podemos respirar juntos.'] },
  animo:     { r:['Lamento que te estés sintiendo así. Aquí puedes decirlo sin filtro.','Suena a que estás cargando con mucho.','Gracias por decírmelo. No tienes que pasarlo sin compañía.','Qué difícil sentirse así.'], f:['¿Pasó algo en particular, o es algo que se fue acumulando?','¿Desde cuándo te vienes sintiendo así?'] },
  familia:   { r:['Lo que pasa con la familia nos toca muy hondo.','Los problemas en la casa pesan el doble, porque es donde uno debería sentirse a salvo.'], a:['Entiendo. Lo que pasa en la casa pesa mucho.'], f:['¿Qué está pasando en tu familia?','¿Cómo te llevas con ellos estos días?'] },
  pareja:    { r:['Lo que pasa con la pareja puede dejar todo de cabeza.','Una ruptura o una traición duele de verdad, no es exageración.'], a:['Entiendo, eso duele mucho.','Se nota que te importa harto.'], f:['¿Qué pasó?','¿Cómo lo has estado llevando estos días?'] },
  despido:   { r:['Perder la pega es un golpe fuerte: afecta la plata, la rutina y cómo uno se ve a sí mismo.','Que te echen es muy duro, y es normal sentir que todo se desordena.'], a:['Entiendo, es mucho de golpe.'], f:['¿Cuándo pasó?','¿Qué es lo que más te preocupa ahora que pasó esto?'] },
  trabajo:   { r:['La presión del trabajo puede llegar a desbordar.','Cuando la pega se vuelve demasiado, cuesta desconectarse.'], a:['Entiendo, eso desgasta mucho.'], f:['¿Qué es lo que más te está pesando de la pega?','¿Has podido descansar algo?'] },
  estudios:  { r:['La presión de los estudios puede ser muy fuerte, sobre todo cuando sientes que te juegas mucho.','Las notas y las pruebas pueden pesar muchísimo.'], a:['Entiendo, es mucha presión.'], f:['¿Qué está pasando con los estudios?','¿Sientes presión de alguien en particular?'] },
  dinero:    { r:['Las preocupaciones de plata generan muchísima tensión.','Cuando las cuentas no cuadran, es difícil pensar en otra cosa.'], a:['Entiendo. Las preocupaciones de plata no dejan descansar.'], f:['¿Es algo reciente o viene de hace tiempo?','¿Tienes a alguien con quien puedas ver el tema?'] },
  duelo:     { r:['Lamento mucho tu pérdida. El duelo duele de una forma muy particular.','Perder a alguien importante lo cambia todo, y no hay una forma correcta de vivirlo.'], a:['Se nota lo importante que es para ti. Gracias por contármelo.','Gracias por contarme de esa persona.'], f:['¿Quieres contarme cómo era?','¿Hace cuánto pasó?'] },
  vivienda:  { r:['Que te echen de tu casa es muy duro, y además te deja sin un lugar seguro.'], f:['¿Tienes dónde quedarte esta noche?'] },
  posparto:  { r:['Los primeros meses con una guagua remecen todo: el cuerpo, el sueño, las emociones. Lo que sientes le pasa a muchas personas y tiene ayuda.','Sentir que no estás siendo buena mamá es muy común en esta etapa, y no significa que lo seas.'], a:['Entiendo. Es muchísimo para una sola persona.'], f:['¿Has podido descansar algo estos días?','¿Tienes a alguien que te ayude con la guagua?'] },
  verguenza: { r:['La vergüenza es muy pesada, y es muy común sentirla con estas cosas. Aquí no hay nada de qué avergonzarse.'], f:['¿Qué es lo que más te da vergüenza?'] },
  bullying:  { r:['Nadie merece que lo traten así. Lo que te hacen no es tu culpa.','Que te molesten o se burlen de ti duele mucho.'], a:['Nadie debería pasar por eso.'], f:['¿Desde cuándo está pasando?','¿Algún adulto o alguien de confianza sabe lo que está pasando?'] },
  identidad: { r:['Quien eres es válido, y mereces respeto y cariño tal como eres.','Que no te acepten por quien eres duele muchísimo.'], f:['¿Cómo ha reaccionado tu entorno?','¿Tienes a alguien que te apoye?'] },
  alimentacion:{ r:['Gracias por contarme algo tan personal. La relación con la comida y el cuerpo puede ser muy difícil.'], f:['¿Cómo te has sentido con esto últimamente?'] },
  salud:     { r:['Lidiar con un problema de salud desgasta mucho, física y emocionalmente.'], f:['¿Cómo lo estás llevando?'] },
  embarazo:  { r:['Es mucho para procesar, y es normal sentir muchas cosas a la vez.'], f:['¿Cómo te sientes con eso?','¿Hay alguien de confianza que lo sepa?'] },
  autoestima:{ r:['Lamento que te estés viendo así. Lo que nos decimos en los peores momentos casi nunca es la verdad completa.','Suena a que te estás tratando con mucha dureza.'], a:['Gracias por contármelo. Te mereces más cuidado del que te estás dando.'], f:['¿Desde cuándo te sientes así contigo?','¿Pasó algo que te hiciera sentir así?'] },
  culpa:     { r:['La culpa pesa muchísimo.'], f:['¿Qué es lo que te hace sentir así?'] },
  rabia:     { r:['Tiene sentido sentir rabia; es una emoción válida.','Esa rabia suena muy intensa.'], f:['¿Qué la provocó?','¿Cómo la estás manejando ahora?'] },
  migracion: { r:['Estar lejos de tu país y de tu gente puede ser muy solitario.'], f:['¿Hace cuánto llegaste?'] }
};
const ALSO = {vivienda:'lo de tu casa', posparto:'todo lo de la guagua', verguenza:'la vergüenza', familia:'lo de tu familia', pareja:'lo de tu pareja', despido:'lo de la pega', trabajo:'lo del trabajo', estudios:'lo de los estudios', dinero:'lo de la plata', duelo:'la pérdida que viviste', bullying:'lo que te hacen en el colegio', soledad:'la soledad', sueno:'lo del sueño', ansiedad:'la angustia', salud:'lo de tu salud', embarazo:'lo del embarazo', autoestima:'cómo te estás viendo', rabia:'la rabia', culpa:'la culpa', migracion:'la distancia con tu país', identidad:'lo de que no te acepten', alimentacion:'lo de la comida'};
const TRACK_F = {
  violence: ['¿Esto pasa seguido?','¿Hay alguien de confianza que sepa lo que está pasando?','¿Tienes algún lugar seguro al que puedas ir si vuelve a pasar?','¿Cómo te sientes tú con todo esto?'],
  grooming: ['¿Le has contado a algún adulto de confianza?','¿Sabes quién es esa persona, o la conoces solo por internet?','¿Cómo te sientes con todo esto?'],
  past: ['¿Has podido hablarlo con alguien antes?','¿Cómo te sientes después de contármelo?','¿Hay algo que te ayude cuando esos recuerdos aparecen?'],
  others: ['¿Qué pasó para que llegaras a sentir esto?','¿Estás cerca de esa persona ahora?','¿Te había pasado antes sentir algo así?'],
  sustancias: ['¿Qué pasa cuando intentas dejarlo?','¿Alguien cercano sabe por lo que estás pasando?','¿Cómo te sientes con todo esto?'],
  agresor: ['¿Hay alguien que te pueda ayudar en los momentos más difíciles?','¿Qué suele pasar antes de que la rabia suba así?','¿Cómo te sientes tú con todo esto?'],
  redes: ['¿Te pasa seguido ver este tipo de cosas en redes?','¿Cómo estás tú ahora?','¿Hay alguien con quien puedas comentar lo que viste?'],
  amenaza: ['¿Tienes a alguien de confianza que sepa lo que está pasando?','¿Te había pasado antes sentir esa presión en la relación?','¿Cómo te sientes tú ahora?'],
  helper: ['¿Y tú cómo estás con todo esto?','¿Esa persona sabe que te preocupa?','¿Esa persona tiene a alguien más cerca que la acompañe?','Acompañar a alguien así cansa mucho. ¿Tienes con quién apoyarte tú?']
};
const TRACK_TIP = {
  violence: 'Algo que ayuda: ten tu celular cargado y piensa en un lugar seguro al que puedas ir si vuelve a pasar. El 149 y el 1455 te pueden orientar sin que tengas que hacer una denuncia de inmediato.',
  grooming: 'Algo que ayuda: no le respondas más, bloquéala y guarda capturas de los mensajes. Pedir ayuda no te va a meter en problemas a ti.',
  past: 'Lo que viviste no define quién eres, y hablarlo con un profesional, a tu ritmo, ayuda mucho.'
};
const ADVICE = {
  bullying: 'Lo primero: no es tu culpa. Contarle a un adulto de confianza (alguien de tu familia, un profe o el orientador) suele ayudar mucho; no tienes que enfrentarlo sin apoyo.',
  pareja: 'Darte tiempo, apoyarte en tus amistades y no tomar decisiones grandes en caliente suele ayudar en momentos así.',
  despido: 'Ir paso a paso ayuda: primero lo más urgente, y apoyarte en alguien de confianza para ordenar lo demás.',
  dinero: 'Ir paso a paso ayuda: primero lo más urgente, y apoyarte en alguien de confianza para ordenar lo demás.',
  duelo: 'No hay una forma correcta de vivir el duelo. Ir a tu ritmo y hablar de esa persona con alguien de confianza suele ayudar.',
  familia: 'Hablar con alguien de confianza, aunque sea fuera de la casa, puede ayudar a ordenar lo que sientes.',
  ansiedad: 'Respirar lento un par de minutos puede bajar un poco la intensidad. Si quieres, lo hacemos juntos.',
  sueno: 'Respirar lento un par de minutos antes de dormir puede ayudar. Si quieres, lo hacemos juntos.',
  estudios: 'Ir de a una cosa a la vez y pedir apoyo a algún profe o a tu familia suele alivianar la presión.',
  trabajo: 'Poner algún límite, aunque sea pequeño, y conversarlo con alguien de confianza puede ayudar.',
  soledad: 'Dar un paso chiquito hacia alguien, aunque sea un mensaje, puede ayudar. Y aquí también tienes con quién hablar.',
  autoestima: 'Tratarte con la misma paciencia con la que tratarías a una amistad puede ayudar, aunque cueste al principio.',
  identidad: 'Buscar personas o espacios donde te acepten tal como eres puede ayudar mucho; no tienes que pasar esto sin apoyo.',
  vivienda: 'Lo primero es que tengas un lugar seguro para esta noche. El especialista te puede ayudar a ver opciones.',
  embarazo: 'No tienes que decidir nada hoy. Hablar con alguien de confianza o con un profesional de salud puede ayudarte a ordenar las opciones.',
  posparto: 'Pedir ayuda con la guagua para poder descansar, aunque sea un rato, ayuda mucho. Lo que sientes tiene tratamiento.'
};
const TPRI = ['duelo','vivienda','posparto','bullying','identidad','alimentacion','despido','pareja','embarazo','migracion','verguenza','familia','soledad','autoestima','salud','dinero','ansiedad','sueno','rabia','culpa','migracion','estudios','trabajo','animo'];
const RES = {
  '4141':['*4141','Prevención del suicidio','tel:*4141'], '131':['131','SAMU','tel:131'], '133':['133','Carabineros','tel:133'],
  '1515':['1515','Línea Libre · niños y jóvenes','tel:1515'], '1455':['1455','Violencia contra la mujer','tel:1455'],
  '149':['149','Fono Familia','tel:149'], '147':['147','Fono Niños','tel:147'], '1412':['1412','Drogas y alcohol','tel:1412']
};
const CHIPS = {
  safe:['Sí','No','No sé'], ideacion:['Sí','No','A veces'], with:['Sí, hay alguien','No hay nadie'],
  contact:['Sí, a alguien','No tengo a quién'], third:['Sí, está en peligro','No, ahora no'], means:['Ya lo hice','No tengo nada cerca','No quiero'],
  calm:['Respirar juntos','Ejercicio para calmarme'], llamo131:['Ya llamé','No puedo'], alejarse:['Ya me alejé','No puedo'], ejercicio:['Sí, hagámoslo','Ahora no']
};
const IMPORTANT = new Set(['safe','safev','ideacion','means','llamo131','alejarse','third','autoles']);
const REASK = {
  safe: ['Y volviendo a lo importante: ¿estás en un lugar seguro en este momento?','Necesito saberlo para cuidarte: ¿ahora mismo estás a salvo?','Solo para saber cómo cuidarte: ¿estás a salvo ahora?'],
  safev: ['Te pregunto de nuevo porque me importa: ¿estás a salvo de esa persona ahora?','Antes de seguir: ¿en este momento esa persona te puede hacer daño?','Para saber cómo ayudarte: ¿ahora estás en un lugar donde esa persona no pueda llegar?'],
  ideacion: ['Y sobre lo que te pregunté recién: ¿has tenido pensamientos de quitarte la vida?','Te lo vuelvo a preguntar porque es importante: ¿has pensado en quitarte la vida?','Vuelvo a lo que te pregunté, porque me importa: ¿han aparecido ideas de quitarte la vida?'],
  means: ['Y sobre lo que te pedí: ¿pudiste alejar lo que te podría hacer daño?','¿Pudiste dejar lejos lo que te podría hacer daño?'],
  llamo131: ['¿Pudiste llamar al 131, o hay alguien llamando por ti?','¿Ya viene ayuda? ¿Alguien llamó al 131?','¿Hay alguien en camino para ayudarte?'],
  alejarse: ['¿Pudiste alejarte del borde?','¿Lograste dar unos pasos hacia atrás, lejos del borde?','¿Ya estás en un lugar más seguro, lejos del borde?'],
  third: ['¿Esa persona está en peligro en este momento?','Para saber cómo ayudarte: ¿crees que esa persona corre peligro ahora mismo?'],
  autoles: ['Y sobre lo que te pregunté: ¿te has vuelto a hacer daño últimamente?','Antes de seguir: ¿te has hecho daño estos días?'],
  with: ['Te preguntaba si hay alguien contigo en este momento. ¿Estás con alguien?','¿Hay alguien más en tu casa o cerca de ti ahora, aunque sea en otra pieza?']
};
const MAXASK = { safe:3, safev:2, ideacion:3, means:2, llamo131:2, alejarse:3, third:2, autoles:2, with:2, contact:1, ejercicio:2, busco:1, especialista:1 };
const LIMIT = { safe:2, safev:1, ideacion:1, means:1, llamo131:1, alejarse:2, third:1, autoles:1, with:1, contact:0, ejercicio:0 };
const SPECIFIC = new Set(['FAQ_LINEA','NO_AGUANTO','ALIM_FRECUENTE','AYUDA_URGENTE','CORRIGE','REVELA_PROPIO','NOTICIA_SUICIDIO','PREG_SUICIDIO','PLAN_AMBIGUO','BROMA_BOT','MED_NORMAL','MASCOTA','DOLOR_GOLPE','ENTUMECIDO','PET_NAME','GOLPE_PARED','NOTICIA2','DIAGNOSTICO','DIAG_MIEDO','GESTA_TIEMPO','RECAIDA_MIEDO','MASCOTA_EDAD','FAQ_GRABA','FAQ_CREADOR','FAQ_VOLVER','FAQ_SIN_PLATA','FAQ_PROMESA','DISTRAER','ALGO_BONITO','MALTRATO_MENOR','ARMA','DONDE_CASA','ANIVERSARIO','NECESIDAD_BASICA','CESANTE','AGRESION_CALLE','MATAR_IDIOMA','LUGAR_CHECK','DUELO_SIN_DESPEDIDA','CULPA_VIOLENCIA','UNICO_MOTIVO','SUST_MALVIAJE','IDEACION_HIPERBOLE','AMENAZA_SUICIDA','TERCERO_REDES','MEDIOS_RECHAZO','NO_QUIERO_IR','AGRESOR_AYUDA','VOCES','VOCES_AHORA','DESPEDIDA_OCULTA','DECISION','DECISION_RIESGO','HOSPITAL','EMERGENCIA_OTRO','AGRESOR','AGRESOR_ARREP','DISOCIACION','CUIDADOR','CUIDADOR_SOLO','CUIDADOR_CULPA','ACOSO_LABORAL','ACOSO_MIEDO','ACOSO_DETALLE','DISCRIMINACION','DISCRIM_LUGAR','MED_EFECTO','MED_PEOR','MED_DEJAR','TRAUMA','TRAUMA_EVITA','CONTROL_PAREJA','CONTROL_AMOR','CONTROL_NORMAL','DUELO_GESTA','MINIMIZAN','REPETIR','QUEJA_ESP','QUEJA_ESP2','ELOGIO','SIN_RAZON','CONVERSAR','TERCERO_NINO','DUDA_DECISION','MIEDO_RECAER','SUST_FREC','SUST_RECAIDA','LO_HICE','FAQ_PAIS2','ALIM_FREC','AGUANTE','DATOS_PROPIOS','BOT_LLAMA','FAQ_NUMEROS','FAQ_WHATSAPP','FAQ_PAIS','FAQ_ESPECIALISTA','FAQ_RIESGO','FAQ_BORRAR','FAQ_SISTEMA','PROFESIONAL','HORA','LUGAR_ATENCION','SARCASMO','PANICO','AMENAZA_DUDA','AMENAZA_CULPA','TERCERO_REDES2','CICATRICES','ESPERA_HORA','MIEDO_CONTAR','POSPARTO_CULPA','POSPARTO_SOLA','FAQ_PROTOCOLO','DUELO_SUICIDIO','MEDIOS_CRISIS','RETRACTA','CULPA_DUELO','METODO_EXCUSA','TERCERO_MAL','HELPER_IFYES','HELPER_NOQUIERE','HELPER_CALMA','HELPER_CERRADO','HELPER_SUST','NO_CREEN','NO_DENUNCIA','VIOL_MIEDO','GRACIAS','DESPEDIDA','SALUDO','HERIDA','SECRETO','NO_LO_HARIA','NO_LLAMAR','YA_LLAME','YA_DIJE','AYUDA','ESPERA','FAQ_CONF','FAQ_COSTO','FAQ_QUE','FAQ_PROTOCOLO','QUEJA','NO_ENTIENDO','NO_HABLAR','PRESENCIA','DISCULPA','GROUNDING','RESPIRAR','HUMANO','ES_BOT','SUSTANCIAS','INSULTO','JAILBREAK','SEXUAL','DATOS','MEDICO','VINCULO','CONSEJO','RAZON','EXISTENCIAL','RELIGION','CAMBIO_TEMA','PERSONAL_BOT','NO_SE_DECIR','TRATAMIENTO','MINIMIZA','GRACIAS_TODO','NADIE','OTRO_IDIOMA','SILENCIO']);
const LOC = /\b(casa|pieza|cama|bano|trabajo|pega|colegio|liceo|universidad|calle|auto|micro|metro|plaza|parque|departamento|depto|hospital|living|cocina|patio)\b/;
const TIME_RE = /\b(hace|desde)\b.*\b(dia|dias|semana|semanas|mes|meses|ano|anos|tiempo|rato|siempre)\b|\b(\d+|un|una|dos|tres|como|unos|unas) (dias|semanas|meses|anos)\b|\b(toda la vida|siempre|desde chico|desde chica|desde nino|desde nina)\b/;
const PAST_RE = /\b(cuando (era|tenia|chic|nin|peque)|de (chico|chica|nino|nina|pequeno|pequena)|hace (anos|mucho)|en el pasado|me paso hace|cuando chic)/;
const NAMES = new Set('matias martina mateo martin tomas sofia isidora florencia josefa catalina valentina antonia emilia maite amanda trinidad fernanda javiera constanza camila francisca daniela carolina andrea paula rodrigo cristian sebastian felipe diego nicolas joaquin ignacio gonzalo pablo francisco jose juan pedro luis carlos jorge manuel mario marcelo mauricio patricio claudio gabriel gabriela alejandro alejandra ricardo roberto sergio victor hugo raul fabian bastian maximiliano maximo lucas alonso gaspar lucia julieta renata rafaela agustina magdalena ignacia macarena javier esteban hector ivan hernan gustavo alvaro elena rosa maria teresa patricia marcela claudia veronica lorena paola pamela karina katherine kevin brian bryan jonathan byron yerko jordan dylan thiago santiago damian emiliano facundo benja mati coni cata vale fran nico seba pipe agustin vicente benjamin ana laura carla barbara natalia nicole romina vania karen tamara scarlett ashley anais belen monica silvia cecilia gloria jessica yasna daniel david eduardo enrique fernando hernan oscar rene samuel simon cristobal leonardo franco renato bruno'.split(' '));
const EXTRA = [
  ['BOT_LLAMA', /\b(puedes|podrias|pueden|podi|puedi|podis) (llamar|avisarle|avisar|escribirle|contactar|hablarle|llamarla|llamarlo)\b|\bllama tu\b|\bllamame\b|\bllama por mi\b|\bllamalos tu\b|\bme (pueden|puedes) llamar\b/],
  ['FAQ_NUMEROS', /\b(a que numero|que numero|cual es el numero|numero de (ayuda|emergencia|salud mental)|telefono de (ayuda|emergencia)|a quien llamo|donde llamo|algun numero|que fono|algun fono)\b/],
  ['FAQ_WHATSAPP', /\b(whatsapp|wsp|wasap|guasap|wasapp)\b|\b(tienen|tienes|hay|puedo (hablar|escribir|contactarlos)( con ustedes)? por) (un |una )?(instagram|insta|facebook|face|tiktok|telegram|twitter|redes sociales|messenger|correo|mail)\b/],
  ['FAQ_PAIS', /\b(estoy|vivo|escribo|estoy viviendo) (en|desde) (argentina|peru|bolivia|venezuela|colombia|mexico|espana|ecuador|uruguay|paraguay|brasil|estados unidos|eeuu|usa|canada|europa|el extranjero|otro pais)\b|\bno (soy|estoy|vivo) (de|en) chile\b|\bsirve (fuera de chile|en otro pais)\b/],
  ['FAQ_ESPECIALISTA', /\b(es|son) (hombre|mujer|hombres|mujeres)\b|\b(especialista|psicolog\w*) (es|son) (hombre|mujer|de verdad|real|reales)\b|\bpuedo elegir\b|\bcuanto cobra\b|\bpresencial\b|\bque (estudios|titulo) tiene\b|\bson psicolog\w* de verdad\b|\b(me )?(atiende|atienden|es|son) (un |una )?(psicolog|especialista|persona|profesional)\w* (de verdad|real|reales|de carne y hueso)\b|\bes (una )?persona real\b/],
  ['FAQ_RIESGO', /\bcomo (detectas|detecta|evaluas|mides|sabes|identificas) (el |si hay |si hay un )?riesgo\b|\bcomo funciona (el bot|la deteccion|por dentro)\b/],
  ['FAQ_BORRAR', /\b(borra|borrar|borro|elimina|eliminar|elimino|borren|borre|borrarla|borrarlo) (mi|la|esta|mis|los|el|este)? ?(conversacion|chat|mensajes|datos|cuenta|historial|esto)\b|\bcomo (se )?(borra|elimina|borro|elimino)\b|\bno quiero que quede (registro|guardado|nada)\b|\bse guarda (esto|lo que escribo|la conversacion)\b|\bno quiero que nadie (lo |la )?(vea|lea|vean|lean)\b/],
  ['FAQ_RASTREO', /\b(me|nos) (pueden|puedes|van a|podrian) (rastrear|ubicar|encontrar|identificar)\b|\b(saben|pueden saber|sabes|van a saber) (donde estoy|quien soy|mi nombre|mi ubicacion|mi direccion)\b|\b(ven|guardan|ves|guardas) (mi )?(ip|ubicacion|numero|direccion)\b|\bme rastrean\b/],
  ['FAQ_SISTEMA', /\b(y )?si (no (contesta|responde|llega|me atiende|me escribe) nadie|nadie (contesta|responde|me atiende|llega|me escribe)|no me (contesta|responde|contestan|responden|atienden) nadie)\b|\b(y )?si no (me )?(contesta|responde|contestan|responden|atienden)\b|\b(y )?si (el|la) (especialista|psicolog\w*) no me (entiende|cae bien|gusta|ayuda|sirve)\b/],
  ['PROFESIONAL', /\b(soy|somos) (psicolog|psiquiatr|terapeut|profesional|especialista|medic|enfermer|trabajador|trabajadora|orientador|orientadora|profe|profesor|profesora)\w*\b.*\b(probando|prueba|testeando|revisando|viendo|conocer)\b|\bestoy (probando|testeando) (la|esta|el) (plataforma|app|pagina|bot|sistema)\b/],
  ['HORA', /\bque hora es\b/],
  ['FAQ_LINEA', /\bque es (el |la )?(\*?4141|131|1515|133|1455|149|147|1412|linea libre|salud responde)\b|\b(el |la )?(\*?4141|1515|1412|linea libre) (es gratis|atiende|que es|sirve|de que es|es de)\b|\bcomo (se )?marc\w* (el )?\*?4141\b/],
  ['FAQ_GRABA', /\b(me estas|me estan|estas|estan) (grabando|escuchando|espiando|viendo|vigilando)\b|\bse graba\b|\bme graban\b|\bme espian\b/],
  ['FAQ_CREADOR', /\bquien te (creo|hizo|programo|invento|desarrollo)\b|\bquien esta detras\b|\bquienes son ustedes\b/],
  ['FAQ_VOLVER', /\bpuedo (volver|escribir|hablar|venir)( a escribir| a hablar)? (manana|despues|otro dia|cuando quiera|de nuevo|mas tarde|otra vez)\b/],
  ['FAQ_SIN_PLATA', /\bno tengo (plata|dinero|lucas|money) para (un |una |el |la )?(psicolog|terapia|tratamiento|psiquiatr|consulta)|\bno me alcanza para (un |una |el |la )?(psicolog|terapia|psiquiatr)|\b(el|la|los) (psicolog\w*|psiquiatr\w*|terapia) (es|son|sale|salen) (muy )?car[oa]s?\b/],
  ['FAQ_PROMESA', /\b(prometes|prometeme|me prometes|me juras|juras|promete)\b|\bno le digas a nadie\b|\bno se lo cuentes a nadie\b|\bqueda entre nosotros\b/],
  ['DISTRAER', /\b(hablame|habla me|cuentame|conversemos|hablemos) de (cualquier cosa|lo que sea|algo|otra cosa)\b|\bdistraeme\b|\bayudame a distraerme\b/],
  ['ALGO_BONITO', /\b(cuentame|dime|dame) (algo|una cosa) (bonit[oa]|lind[oa]|positiv[oa]|alegre|feliz|que me haga sentir mejor)\b/],
  ['LUGAR_ATENCION', /\b(donde (queda|hay|esta|encuentro)|cual es) (el|un|la|una) (hospital|consultorio|cesfam|sapu|urgencia|clinica|cosam)\b/]
];
const R2 = {
  autoestima: ['Compararse así duele mucho, y casi nunca es justo con uno mismo.','Esa voz que te habla tan duro no tiene toda la razón, aunque hoy suene fuerte.'],
  soledad: ['Sentirse lejos de todos pesa mucho, sobre todo cuando uno está en un lugar nuevo.','Extrañar lo conocido es muy natural. Aquí puedes contarlo.'],
  bullying: ['Que se rían de ti duele mucho, y no dice nada malo de ti: habla de ellos.','Nadie debería pasar por eso para ir a estudiar.'],
  familia: ['Cuando en la casa hay peleas, es muy difícil sentirse en paz.','Lo que pasa en la familia nos afecta, aunque no sea nuestra culpa.'],
  pareja: ['Cuando una relación duele, mueve el piso entero.','Es normal que te dé vueltas en la cabeza.'],
  duelo: ['Se nota cuánto lo querías. Ese vacío pesa mucho.','El duelo no tiene un tiempo fijo; cada uno lo vive a su manera.'],
  ansiedad: ['Ese miedo se siente muy real en el cuerpo, y cansa mucho.','La angustia hace que todo parezca más grande. Vamos de a poco.'],
  trabajo: ['La pega puede llegar a ocuparlo todo, y agota.'], estudios: ['La presión por rendir pesa mucho.'], dinero: ['Cuando falta la plata, todo se vuelve más difícil.'],
  sueno: ['Sin descanso, todo se siente más cuesta arriba.'], salud: ['Lo que pasa con la salud remueve mucho por dentro.'], culpa: ['La culpa a veces nos hace cargar con más de lo que nos toca.'],
  rabia: ['La rabia muchas veces aparece cuando algo nos duele o nos parece injusto.'], verguenza: ['La vergüenza hace querer esconderse, pero aquí no tienes que hacerlo.']
};
const REFLECT = [
  [/\b(estoy aburrid[oa]|que aburrimiento|me aburro mucho|ando aburrid[oa])\b/, ['El aburrimiento también pesa, sobre todo cuando se junta con desánimo.']],
  [/\b(se rien|se burlan|se rieron|se burlaron|me pelan|me hacen bullying)\b/, ['Que se rían de ti duele mucho, y no es tu culpa. Nadie merece eso.']],
  [/\b(mas (lindos|lindas|bonitos|bonitas|flacos|flacas|inteligentes|exitosos|exitosas|capaces) que yo|me comparo)\b/, ['Compararse así duele mucho, y casi siempre somos mucho más duros con nosotros mismos que con los demás.']],
  [/\b(extrano|echo de menos) (mi casa|a mi familia|mi pais|mi tierra|mi ciudad|mi pueblo|a mis papas|a mi mama|a mi papa)\b/, ['Extrañar así es muy natural. Habla de lo importante que es tu gente para ti.']],
  [/\b(pelean|discuten|se gritan|se pelean|se agarran)\b/, ['Vivir en medio de peleas desgasta mucho, y no es tu responsabilidad arreglarlo.']],
  [/\b(me dio (pena|tristeza|lata|rabia|miedo|angustia)|me afecto|me impacto|me pego fuerte|me dejo mal)\b/, ['Es muy humano que te afecte. A veces esas cosas también remueven lo propio.']],
  [/\b(matar|morir) (estudiando|trabajando)\b|\bmuert[oa] de (cansancio|sueno)\b/, ['Suena a que estás con mucho cansancio encima.']],
  [/\b(nada me sirve|nada sirve|nada funciona|nada me ayuda|nada ayuda|nada resulta)\b/, ['Entiendo que sientas que nada sirve. Igual no me voy a ir.','Cuando nada parece funcionar, todo cansa el doble. Aquí sigo.']],
  [/\b(pienso mucho|no paro de pensar|pienso demasiado|sobrepienso|la cabeza no para|mi cabeza no para|no puedo dejar de pensar|muchos pensamientos)\b/, ['Cuando la cabeza no para, todo se siente más pesado, sobre todo de noche.','Esa sensación de no poder apagar la cabeza agota mucho.']],
  [/^(en )?(todo|de todo)\b|\ben (mi|la) vida\b/, ['Es mucho para cargar de una vez.']],
  [/\b(no se que me pasa|no entiendo que me pasa|no se por que me siento|no se que tengo)\b/, ['A veces uno no sabe bien qué le pasa, y eso también es difícil.']],
  [/\bme siento (raro|rara|extrano|extrana|perdido|perdida|desconectad[oa]|ausente)\b/, ['Sentirse así, sin poder ponerle nombre, desconcierta mucho.']],
  [/\b(ok le escribo|le voy a escribir|le escribo|le voy a hablar|voy a hablar con (el|ella)|le voy a contar|voy a intentar|lo voy a intentar|lo intento|lo voy a hacer)\b/, ['Me parece muy bien. Aquí sigo mientras tanto.']],
  [/\b(ya le escribi|ya le hable|ya le conte|ya le dije|ya le mande|le escribi|le hable|le conte)\b/, ['Qué bueno que lo hiciste. Eso es muy importante.']],
  [/\b(me aburri|ya me aburri|me aburro de esto|que lata esto|que paja esto|esto es fome)\b/, ['Te entiendo. No tienes que seguir si no quieres; esto queda aquí para cuando quieras volver.'], 'noQ'],
  [/\b(lloro|llorando|llore|no paro de llorar|ganas de llorar)\b/, ['Llorar también es una forma de sacar lo que pesa. Aquí puedes hacerlo.']],
  [/\bera mi (companero|companera|todo|mejor amigo|mejor amiga|familia|vida|compania)\b/, ['Se nota cuánto lo querías. Ese vacío pesa mucho.']],
  [/\b(nadie me entiende|nadie me escucha|nadie me pesca|nadie me toma en cuenta)\b/, ['Sentir que nadie te entiende es muy solitario. Aquí te estoy leyendo.']]
];
/* reflejos específicos: tienen prioridad sobre el reflejo genérico del tema */
const REFLECT_P = [
  { re:/^(es que )?(son )?(muchas cosas|demasiadas cosas|de todo un poco|un monton de cosas)$/, s:['Cuando son muchas cosas a la vez, cuesta saber por dónde partir. Podemos ir de a una.'], q:'¿Cuál es la que más te pesa hoy?' },
  { re:/\bentrevista\b/, s:['Las entrevistas ponen nervioso a cualquiera, sobre todo cuando importan mucho.'], q:'¿Qué es lo que más te preocupa de la entrevista?' },
  { re:/\bson las (\d+|una|dos|tres|cuatro|cinco|seis)\b.*\b(despiert|dormir|duermo)|\bsigo despiert[oa]\b|\bno he dormido nada\b/, s:['Tan tarde y sin poder dormir… qué cansancio. A esta hora todo se siente más pesado.'], q:'¿Qué te está dando vueltas en la cabeza?' },
  { re:/\bno tengo tiempo (para mi|para nada|para descansar)\b/, s:['Cuando todo el tiempo se va en otros, uno queda al final de la lista. Tú también importas.'] },
  { re:/\b(me cambie|me vine|me mude|llegue) (de|a) (ciudad|santiago|region|pais|otra ciudad|vivir aca|vivir a)\b|\bme cambie de (ciudad|region|pais|casa)\b/, s:['Cambiarse de ciudad es un cambio enorme, y llegar sin conocer a nadie puede ser muy solitario.'], q:'¿Cómo han sido estos meses?' },
  { re:/\bno conozco a nadie\b/, s:['Estar en un lugar sin conocer a nadie es muy solitario.'] },
  { re:/\bme gustaria (hacer|tener|conocer) (amigos|amigas|amistades|gente)\b/, s:['Qué bueno que tengas ganas. A veces ayuda partir por algo que te guste: un taller, un deporte, un voluntariado o un grupo con intereses parecidos.'], q:'¿Qué cosas te gusta hacer?' },
  { re:/\bengane a\b/, s:['Gracias por contármelo con honestidad. Cargar con eso pesa mucho, y que te duela habla de que te importa.'], q:'¿Qué es lo que más te pesa de eso?' },
  { re:/\bsoy (una )?(mala persona|mal[oa])\b(?! (para|en|con|jugando|haciendo))|\bsoy (un|una) monstruo\b/, s:['Lo que sientes ahora es muy duro contigo. Equivocarse, aunque sea en algo grande, no te convierte en mala persona.'] },
  { re:/\bhice cosas (malas|terribles|horribles)\b/, s:['Todos cargamos con cosas de las que nos arrepentimos. Que te pesen habla de que te importa hacerlo distinto.'], q:'¿Quieres contarme un poco, a tu ritmo?' },
  { re:/\b(se (estan )?separando|se separaron|se van a separar|se divorci\w*)\b/, when:(S, t) => /\b(papas|padres|papa|mama|viejos)\b/.test(t), s:['Que tus papás se separen remueve mucho, y no es tu culpa.'], q:'¿Cómo lo estás viviendo tú?' },
  { re:/\bse fue de la casa\b|\bnos (abandono|dejo solos)\b/, s:['Que se haya ido de la casa es un cambio muy grande, y duele.'], q:'¿Cómo ha sido para ti?' },
  { re:/\b(es el|es la|son los|son las) (favorit[oa]s?|preferid[oa]s?|regalon[a]?)\b|\bprefieren a\b|\bme comparan con\b/, s:['Sentir que en tu casa prefieren a otra persona duele mucho.'], q:'¿Cómo te hace sentir eso?' },
  { re:/\b(mi familia|mis papas|mi papa|mi mama|en mi casa) no me (pesca|pescan|toma en cuenta|toman en cuenta|escucha|escuchan|entiende|entienden|ve|ven)\b/, s:['Sentir que no te ven en tu propia casa duele mucho.'] },
  { re:/\b(viven lejos|estan lejos|no me visitan|no me vienen a ver|no me llaman nunca|nunca me llaman)\b/, s:['Tener a los tuyos lejos hace que los días pesen más.'], q:'¿Cuándo fue la última vez que hablaste con alguno?' },
  { re:/\b(tiene|le (dio|diagnosticaron|detectaron)) (cancer|un tumor|alzheimer|demencia|leucemia)\b|\besta (muy )?(enferm[oa]|grave|hospitalizad[oa])\b/, when:(S, t) => !/\b(tengo|estoy enferm|me diagnosticaron)\b/.test(t), s:['Ver a alguien que quieres tan enfermo duele muchísimo.'], q:'¿Cómo lo estás llevando tú?' },
  { re:/\b(mis hijos|mi hijo|mi hija|mis hijas) (son|es) (chic[oa]s?|pequen[oa]s?|guaguas?)\b/, s:['Pensar en tus hijos en un momento así debe pesar muchísimo. Se nota cuánto te importan.'] },
  { re:/\bera como (mi|un|una) (papa|mama|hermano|hermana|abuelo|abuela|hijo|hija)\b/, s:['Se nota lo importante que fue para ti. Perder a alguien así deja un vacío enorme.'] },
  { re:/\b(lo|la) descubri\b|\bme entere (hoy|ayer|recien)\b/, s:['Enterarse así es un golpe fuerte. Es normal sentir susto, pena o rabia, todo junto.'] },
  { re:/\b(todos los dias|todo el dia|siempre) lo pienso\b|\blo pienso (todos los dias|todo el tiempo|siempre|a cada rato)\b/, s:['Pensarlo todos los días tiene que ser agotador. Gracias por decírmelo.'] },
  { re:/\b(para (sentir algo|sentir alivio|aliviar|aliviarme|calmarme|sacar lo que siento)|es para aliviar|me alivia|es la unica forma|me ayuda a (sentir|calmarme|aliviarme|desahogarme|sentirme)|me hace sentir (algo|mejor|vivo|viva)|me calma|me relaja|siento alivio|me libera|es mi forma de)\b/, when:(S) => S.flags.has('AUTOLESION'), s:['A veces hacerse daño aparece como una forma de aliviar o de sentir algo cuando por dentro duele demasiado. Tiene sentido, y también hay otras formas de aliviarlo que no te dañan.'] },
  { re:/\b(se dio cuenta|se entero|me pillo|me vio|lo descubrio|lo supo)\b/, when:(S) => S.flags.has('AUTOLESION'), s:['A veces que alguien cercano lo sepa, aunque asuste, puede ser un apoyo.'] },
  { re:/\bno te (voy a|lo voy a|quiero) (decir|contar)\b/, s:['Está bien, no tienes que contarme todo. Igual me importa que estés a salvo.'] },
  { re:/\b(nunca|no) lo he intentado\b/, s:['Gracias por contármelo.'] },
  { re:/\bno (he hablado|le he dicho|le he contado) (con |a )?(la|el|mi) (doctora|doctor|psiquiatra|medic[oa])\b/, s:['Te recomiendo contárselo pronto: a veces los remedios necesitan ajustes, y es importante que lo sepa.'] },
  { re:/\b(nombre muerto|deadname|no respetan mis pronombres|me dicen por mi nombre (de antes|anterior))\b/, s:['Que no usen tu nombre duele mucho: es como si no te vieran. Tu nombre y tu identidad merecen respeto.'] },
  { re:/\b(mi pololo|mi polola|mi pareja|el papa|el) no quiere\b|\bno se quiere hacer cargo\b/, when:(S) => S.themes.has('embarazo'), s:['Que no quiera hacerse cargo te deja con mucho encima, y no es justo.'] },
  { re:/\b(me van a|me va a) (echar|botar) de la casa\b/, when:(S) => S.themes.has('embarazo'), s:['Ese miedo es muy fuerte, y tiene sentido.'], q:'¿Ya saben, o todavía no les has contado?' },
  { re:/\b(se van a reir|se van a burlar|me van a pelar|me van a molestar)\b/, s:['Da mucho miedo que se rían de uno. Igual, lo que piensen ellos no define cuánto vales.'] },
  { re:/\b(no para de llorar|llora (todo el dia|mucho|siempre|todas las noches))\b/, when:(S, t) => S.themes.has('posparto') || /\b(guagua|bebe)\b/.test(t + ' ' + (S.lastUser || '')), s:['Que llore tanto cansa muchísimo, sobre todo cuando no tienes con quién turnarte.'] },
  { re:/^delante de todos$|^frente a todos$|\b(delante|frente) de (todos|mis companeros|la gente)\b/, s:['Que pase delante de otras personas lo hace todavía más humillante.'] },
  { re:/\b(subieron|publicaron|pasaron|compartieron) (fotos|videos|memes|una foto|un video) mi(as|os|a|o)?\b|\bfotos mias editadas\b/, s:['Que suban fotos tuyas para burlarse es una forma de acoso, y no es tu culpa. Se puede denunciar en la misma red social, y un adulto del colegio tiene que saberlo.'] },
  { re:/^(es verdad|es cierto|asi es|tal cual|si es verdad|en serio|de verdad|es la verdad)$/, when:(S) => ['PASIVA','IDEACION','TEMA'].includes(S.lastPrimary) && RANK[S.risk] >= 1, s:['Se nota que lo sientes así de verdad, y eso duele mucho.'] },
  { re:/\b(\d+|una|dos|tres|cuatro|cinco) horas\b/, when:(S) => S.themes.has('sueno'), s:['Dormir tan poco agota a cualquiera, y hace que todo pese más.'] },
  { re:/\bdespues de (tanto|tanto tiempo|\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)( meses| anos| semanas| tiempo| intentos)?\b/, when:(S) => S.goodNews && S.turn - S.goodNews <= 3, s:['Después de tanto esfuerzo, vale el doble.'] },
  { re:/\b(como que )?nada (me )?importa\b/, s:['Sentir que nada importa es muy pesado, y suele aparecer cuando uno lleva mucho tiempo agotado.'] },
  { re:/\bno se si (quiero|voy a) dejar(lo|la)?\b/, when:(S) => S.track === 'sustancias' || S.flags.has('SUSTANCIAS'), s:['Es muy normal tener sentimientos encontrados con eso. No tienes que decidirlo hoy, y el 1412 orienta sin presionarte.'] },
  { re:/^(estoy )?en (la micro|el metro|la calle|el trabajo|la pega|el colegio|la u|clases)$/, when:(S) => S.flags.has('PANICO') && !S.ground, s:['Ok. Si puedes, apoya bien los pies en el suelo, agárrate de algo firme y fija la vista en un punto quieto. Esto va a bajar.'] },
  { re:/^(no es urgente|no es tan urgente|no es urgencia|no es para ahora)$/, s:[(t, S) => S.searching ? 'Entendido, sin urgencia. Quedó anotado para que alguien del equipo te escriba por aquí.' : 'Entendido, sin urgencia. Aquí estoy para conversar con calma.'] },
  { re:/\b(me dijo|dijo) que ya no me (queria|quiere|amaba|ama)\b/, s:['Escuchar eso duele muchísimo.'] },
  { re:/\bme dejo de hablar\b/, s:['Que deje de hablarte sin explicación duele mucho y deja muchas preguntas.'] },
  { re:/\bme saque un ([1-3]|uno|dos|tres)\b|\bme fue (pesimo|horrible|mal) en (la|el) (prueba|examen|control|certamen)\b/, s:['Una mala nota duele, sobre todo cuando te esforzaste. Una prueba no dice todo lo que vales.'] },
  { re:/\bmi (pololo|polola|pareja|esposo|esposa|marido|novio|novia) me (engano|engana|puso el gorro|cago)\b/, s:['Que te engañen duele mucho, y remueve la confianza en todo.'], q:'¿Cómo lo estás llevando?' },
  { re:/\b(no tengo amigos|no tengo amigas)\b/, s:['No tener con quién compartir pesa mucho, sobre todo en los días difíciles.'] },
  { re:/\bya intente (eso|todo|de todo)\b/, s:['Se nota que lo has intentado, y que cansa cuando no resulta.'], q:'¿Qué pasó cuando lo intentaste?' },
  { re:/\b(mi hermana|mi hermano|mi mama|mi papa|mi pareja|mi polola|mi pololo) (se dio cuenta|lo sabe|sabe)\b/, when:(S) => !S.flags.has('AUTOLESION'), s:['Qué bueno que alguien cercano lo sepa; no tienes que cargarlo sin compañía.'] },
  /* tercera revisión */
  { re:/\b(mi papa|mi mama|mis papas|mi padrastro|mi madrastra|mi abuela|mi abuelo) me (grita|gritan|reta|retan|insulta|insultan|trata mal|tratan mal)\b/, s:['Que en tu casa te griten así desgasta muchísimo, y no es tu culpa.'], q:'¿Esto pasa seguido?' },
  { re:/\bme (dejo|cambio|engano) por otr[oa]\b/, s:['Que te deje por otra persona duele muchísimo, y remueve mucho la autoestima. No dice nada de lo que vales.'] },
  { re:/\b(rompio|me rompio|rompieron|me quito|me robo|me boto|me perdio|me escondio) (mi|el|la|mis|los|las) \w+/, when:(S) => S.themes.has('rabia'), s:['Da mucha rabia que pase algo así con tus cosas, y tiene sentido sentirla.'] },
  { re:/\b(ganas de (pegarle|golpearlo|golpearla|pegarles|ahorcarlo|ahorcarla)|le quiero pegar|lo quiero matar|la quiero matar)\b/, when:(S) => S.themes.has('rabia') && !S.flags.has('DANO_OTROS'), s:['Es normal sentir ganas así cuando la rabia está tan fuerte. Lo importante es no hacerlo: alejarte un rato, respirar o salir a caminar ayuda a que baje.'] },
  { re:/\b(me dicen|dicen|me dijeron) que (soy|era) (floj[oa]|tont[oa]|inutil|un fracaso|una fracasada|un fracasado|mal[oa]|un desastre)\b|^que soy (floj[oa]|tont[oa]|inutil|mal[oa]|un desastre)\b|\bno (les|le) importo\b/, s:['Escuchar eso de quienes quieres duele mucho. Lo que te dicen en un mal momento no define lo que vales.'] },
  { re:/\b(mi mama|mi papa|mi tia|mi abuela|mi abuelo) (llega|vuelve|viene) (en la noche|mas tarde|despues|tarde|en la tarde|a las \d+)\b/, when:(S) => S.track === 'violence' || S.flags.has('VIOLENCIA'), s:['Ok. Mientras tanto, trata de no quedarte a solas con esa persona: si puedes, anda donde un vecino, un familiar o alguien de confianza hasta que llegue.'] },
  { re:/\bmiedo (de |a )?que no me (crea|crean|vaya a creer|vayan a creer)\b|\bno me va(n)? a creer\b/, when:(S) => S.track === 'violence' || S.track === 'grooming' || S.flags.has('VIOLENCIA'), s:['Es un miedo muy común. Si alguien no te cree, no significa que estés mintiendo: busca a otro adulto que sí te escuche. El 147 y el 1515 también te pueden ayudar a pensar cómo contarlo.'] },
  { re:/^(a |con )?(mi|mis) (tia|tio|abuela|abuelo|profe|profesora|profesor|prima|primo|madrina|padrino|hermana|hermano|orientador|orientadora)( (tal vez|quizas|puede ser|creo|capaz))?$/, when:(S) => ['violence','grooming','past'].includes(S.track), s:[t => 'Contarle a ' + (personIn(t) || 'esa persona') + ' puede ser un muy buen paso. No tienes que contarle todo: basta con decirle que te está pasando algo y que necesitas ayuda.'], q:'¿Crees que podrías hablarle pronto?' },
  { re:/\b(me voy|ya me voy|voy|me estoy yendo|me fui) (para|a) (la|mi) casa\b|\bvoy camino a (la|mi) casa\b/, when:(S) => S.facts && S.facts.ideation === true, s:['Qué bueno que vayas a tu casa. Si puedes, vuelve con alguien de confianza y escríbeme cuando llegues.'] },
  { re:/\blo dice cuando (se enoja|esta enojad[oa]|pelea|lo retan|la retan|se frustra|se pone triste)\b/, when:(S) => S.track === 'helper', s:['Aunque lo diga cuando se enoja, vale la pena tomarlo en serio y conversarlo con calma cuando esté tranquilo. A veces es la forma de decir que algo le pesa mucho.'] },
  { re:/\b(mi familia|mis papas|mi mama|mi papa|mi pareja|mi esposo|mi esposa) (esta|estan) (enojad[oa]s?|molest[oa]s?|decepcionad[oa]s?|furios[oa]s?)\b/, s:[(t, S) => S.flags.has('INTENTO_PREVIO') || S.flags.has('HOSPITAL') ? 'Que estén así contigo debe pesar mucho. Muchas veces ese enojo es la forma en que sale el susto que pasaron.' : 'Que estén así contigo pesa mucho, sobre todo cuando ya lo estás pasando mal.'] },
  { re:/^(cuando|si|porque) (toma|se cura|esta curado|bebe|esta borracho|toma mucho|se emborracha|consume|se droga|anda curado|llega curado)\b/, when:(S) => S.track === 'violence' || S.flags.has('VIOLENCIA'), s:['Que tome no justifica lo que hace, y no es tu culpa.'] },
  { re:/\b(renunciar|renuncio|renunciare|voy a renunciar|dejar la pega|dejar el trabajo|irme de la pega)\b/, s:['Renunciar es una decisión grande, y es válido pensarla. No tienes que decidirlo hoy.'] },
  { re:/\b(mi (polola|pololo|pareja|novia|novio|esposa|esposo|marido)) me (dejo|termino|corto)\b|\bme (termino|corto|dejo) (mi )?(polola|pololo|pareja|novia|novio)\b|^terminamos$/, s:['Que termine una relación así duele muchísimo, sobre todo al principio.'] },
  { re:/\b(lo hago|me corto|me hago dano|me lastimo) (hace|desde hace|desde) (un|una|dos|tres|\d+|mucho|harto|varios|varias|anos|meses|tiempo|chic[oa])\b|\bhace (un ano|anos|meses|mucho tiempo|harto tiempo) que (lo hago|me corto|me hago dano)\b/, when:(S) => S.flags.has('AUTOLESION'), s:['Llevar tanto tiempo con esto, muchas veces a escondidas, es muy pesado. Gracias por contármelo.'] },
  { re:/^(es|son|fue) (mucho|harto|demasiado|demasiadas cosas|hartas cosas|largo)( que contar)?$|^es (una )?(larga historia|historia larga)$|^es largo de contar$/, s:['Podemos ir de a poco; no tienes que contarlo todo de una vez.'], q:'¿Por dónde te gustaría empezar?' },
  { re:/\btengo (\d+|un|una|dos|tres|cuatro|cinco|seis) (hijos|hijas|hijo|hija|ninos|guaguas)\b/, s:['Con hijos a cargo, todo pesa el doble: no solo te preocupas por ti.'], q:'¿Cómo están ellos con todo esto?' },
  { re:/\b(mi mama|mi papa|mi familia|nadie en mi casa|nadie) no hace nada\b|\bno me (defiende|defienden|protege|protegen)\b/, when:(S) => S.track === 'violence' || S.flags.has('VIOLENCIA') || S.flags.has('MALTRATO_MENOR'), s:['Que no te protejan también duele mucho. No es tu culpa, y mereces que un adulto te cuide.'] },
  { re:/\bme (dicen|gritan|tratan de|pusieron|ponen) (?!que\b)\w+/, when:(S) => S.themes.has('bullying'), s:['Que te digan cosas así duele, aunque lo hagan pasar por broma. No dice nada malo de ti; habla de ellos.'] },
  { re:/^(todos los dias|todo el dia|siempre|cada dia|a cada rato|todo el tiempo)$/, when:(S) => S.themes.has('bullying') || S.track === 'violence', s:['Todos los días es muchísimo para aguantar.'] },
  { re:/\b(profe jefe|profesor jefe|profesora jefe|inspector|inspectora|orientador|orientadora|encargad[oa] de convivencia|convivencia escolar|director|directora)\b/, when:(S) => S.themes.has('bullying'), s:['Contarle a tu profe jefe, al orientador o al encargado de convivencia escolar puede ayudar mucho: el colegio tiene la obligación de intervenir cuando hay acoso, y no te van a culpar a ti.'], q:'¿Hay algún adulto del colegio en quien confíes, aunque sea un poco?' },
  { re:/\bmiedo (de |a )?que (sea|se ponga|se vuelva|me vaya) peor\b|\bmiedo (de |a )?que (empeore|me hagan algo|se desquiten|me molesten mas)\b|\bse va a poner peor\b/, when:(S) => S.themes.has('bullying') || S.track === 'violence', s:['Es muy entendible ese miedo; mucha gente teme que contarlo empeore las cosas. Por eso ayuda contárselo a un adulto que pueda intervenir con cuidado, sin exponerte.'] },
  { re:/\b(estoy|me veo|me siento|soy) (muy |tan )?(gord[oa]|guaton[a]?|enorme|asqueros[oa])\b/, when:(S) => S.themes.has('alimentacion'), s:['Cuando la mirada sobre el propio cuerpo se pone tan dura, comer se vuelve muy difícil. Tu valor no depende de tu cuerpo.'] },
  { re:/\b(asco|odio) (de |a )?mi cuerpo\b|\bme da asco mi cuerpo\b/, s:['Sentir eso por tu propio cuerpo duele mucho. Mereces tratarte con más cuidado del que te estás dando.'] },
  { re:/\bvomit\w*|\bme provoco (el )?vomito\b|\bme meto los dedos\b/, when:(S, t) => S.themes.has('alimentacion') || /\b(como|comer|comida|despues de comer)\b/.test(t), s:['Gracias por contármelo; sé que no es fácil. Vomitar después de comer puede dañar mucho tu cuerpo, y lo que estás viviendo merece apoyo profesional, sin juicio.'] },
  { re:/\bno he comido (en|hace) (\d+|dos|tres|cuatro|varios) dias\b|\bno como hace (\d+|dos|tres|varios) dias\b|\bllevo (\d+|dos|tres|varios) dias sin comer\b/, s:['Pasar días sin comer es muy duro para el cuerpo y para la cabeza.'] },
  { re:/\b(no puedo (parar|dejar) de llorar|no paro de llorar|lloro todo el dia|lloro todos los dias)\b/, when:(S) => S.themes.has('duelo'), s:['Llorar así es parte del duelo: es la forma en que sale tanto cariño y tanta pena.'] },
  { re:/\bno se como (seguir|vivir|voy a seguir|voy a vivir) sin (el|ella)\b|\bno me imagino (la vida |mi vida )?sin (el|ella)\b/, s:[t => 'Cuando alguien tan importante se va, es muy común sentir que no sabes cómo seguir. Ese dolor habla de cuánto ' + (/\bsin ella\b/.test(t) ? 'la' : 'lo') + ' quieres.'] },
  { re:/\bmiedo (de |a )?que se (muera|vaya a morir|muera pronto|nos deje)\b|\bmiedo (de |a )?perder(lo|la)\b/, s:['Es muy entendible ese miedo. Cuando alguien que queremos está enfermo, uno vive con el corazón apretado.'], q:'¿Has podido hablar de esto con alguien de tu familia?' },
  { re:/\b(converso|hablo|converse|hable) con (la radio|la tele|la television|mi perro|mi perrita|mi gato|mi gata|las plantas|las paredes)\b/, s:[t => (/radio|tele/.test(t) ? 'La radio puede ser buena compañía, pero también mereces conversar con personas que te escuchen.' : /perr|gat/.test(t) ? 'Los animales son muy buena compañía. Igual mereces también conversar con personas que te escuchen.' : 'Mereces tener con quién conversar.') + ' Me alegra que hoy hayas escrito aquí.'] },
  { re:/\b(mi jefe|mi jefa|la pega|el trabajo|mi trabajo) me tiene (muy )?(chat[oa]|hart[oa]|mal|cansad[oa]|agotad[oa]|reventad[oa]|aburrid[oa]|loc[oa]|colapsad[oa])\b/, s:['Que la pega te tenga así desgasta mucho; son demasiadas horas al día con eso encima.'] },
  { re:/\bme gusta (un|una|mi) (companer[oa]|amig[oa]|chic[oa]|nin[oa]|profe|mina|loco|vecin[oa])\b|\bme gusta alguien\b|\bestoy enamorad[oa]\b/, s:['Gracias por contármelo. Que te guste alguien puede dar mucho susto, sobre todo cuando no sabes cómo lo va a tomar esa persona o tu entorno. Lo que sientes es válido.'], q:'¿Qué es lo que más miedo te da?' },
  { re:/\bsi se enteran (me echan|me van a echar|me botan|me pegan)\b|\bsi (mis papas|mi familia|mi mama|mi papa) se entera\w* (me echan|me van a echar|me botan)\b/, s:['Vivir con ese miedo es muy pesado. No tienes que contarle a nadie hasta que te sientas con apoyo y a salvo.'], q:'¿Hay alguien, aunque sea fuera de tu casa, que sepa y te apoye?' },
  { re:/\b(la casa|los ninos|mis hijos|los cabros|la guagua)\b.*\b(la casa|los ninos|mis hijos|los cabros|la guagua|el trabajo|la pega)\b|\btodo (lo hago )?yo sol[oa]\b/, s:[t => /ninos|hijos|cabros|guagua/.test(t) ? 'Llevar la casa, los niños y todo lo demás sin respiro agota a cualquiera.' : 'Cargar con todo sin respiro agota a cualquiera.'] },
  { re:/\bno le haria nada\b|\bnunca le haria dano\b|\bno le haria dano\b/, when:(S) => S.themes.has('posparto'), s:['Gracias por decírmelo; es importante. Que aparezcan pensamientos así no te hace mala madre, y merecen apoyo.'] },
  { re:/\b(porque )?no sirve( de nada| llamar)?$|\bno sirve llamar\b|\bllamar no sirve\b/, when:(S) => S.facts && (S.facts.refusedCall || S.facts.cantCall), s:['Entiendo que sientas que no sirve. No te voy a insistir; sigo aquí contigo.'] },
  { re:/\bmis amig[oa]s (ya )?no me (hablan|pescan|invitan|escriben|responden)\b|\bme dejaron de hablar\b/, s:['Que tus amistades se alejen duele mucho, más cuando no sabes bien por qué.'], q:'¿Pasó algo entre ustedes, o se fue dando de a poco?' }
];
const GROUND_PENDING = { 5:'5 cosas que puedas ver', 4:'4 cosas que puedas tocar o sentir', 3:'3 sonidos que escuches', 2:'2 olores, o 2 cosas que te gusten', 1:'1 cosa buena de ti o de alguien que te quiere' };
const GROUND_EX = { 5:'«la pared, una ventana, mis manos, el celular, una puerta»', 4:'«la ropa, el suelo bajo los pies, la silla, mi pelo»', 3:'«autos, el refrigerador, mi respiración»', 2:'«el café, el jabón», o algo que te guste, como una canción', 1:'«soy buena persona» o «mi hermana me quiere»' };
const GROUND = {
  5:'Bien. Ahora dime 4 cosas que puedas tocar o sentir con el cuerpo: la ropa, el suelo, la silla…',
  4:'Muy bien. Ahora 3 sonidos que escuches, aunque sean muy suaves.',
  3:'Vas bien. Ahora 2 olores, o si no sientes ninguno, 2 cosas que te gusten.',
  2:'Último: 1 cosa buena de ti, o de alguien que te quiere, aunque sea chiquita.',
  1:'Bien hecho. Lo hiciste completo, y eso no es poco.'
};
function qtype(q){
  if (typeof q !== 'string' || !/\?\s*$/.test(q)) return null;
  if (/cu[aá]ndo|hace cu[aá]nto|cu[aá]nto tiempo/i.test(q)) return 'cuando';
  if (/sabe lo que|sabe c[oó]mo|lo sepa|sabe que te/i.test(q)) return 'sabe';
  if (/qué opciones/i.test(q)) return 'opciones';
  if (/de qué te gustaría hablar/i.test(q)) return 'tema';
  if (/ayudado a seguir/i.test(q)) return 'razon';
  if (/(alguien|alguna persona)/i.test(q) && !/especialista/i.test(q)) return 'persona';
  if (/te han ayudado|cosas te han/i.test(q)) return 'ayudo';
  if (/algo cerca que te d[eé]/i.test(q)) return 'calma';
  if (/c[oó]mo (est[aá]s|te sientes|te has sentido|vas|lo est[aá]s|lo has|est[aá] tu)/i.test(q)) return 'estado';
  return 'open';
}

function create(saved){
  const F = { knowsTold:false, safe:null, alone:null, someone:null, refusedCall:false, cantCall:false, called:false, meansAway:null, timeKnown:false, personKnown:false, ideation:null, emergency:false };
  const S = { turn:0, risk:'low', flags:new Set(), themes:new Set(), used:new Set(), asked:{}, mode:'normal',
              pending:null, lastQ:'estado', prevQ:null, minor:false, searching:false, resources:new Set(), ground:0, distress:0,
              last:'', lastBot:'', askedIdeation:false, sug:{ call:0, exercise:0 }, n:{ insult:0, help:0, wait:0, complaint:0, offtopic:0, conf:0, refuse:0 }, facts:F };
  S.pros = null; // especialistas disponibles; null = desconocido (demo)
  if (saved) {
    const o = typeof saved === 'string' ? JSON.parse(saved, (k, v) => (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v) : saved;
    for (const k in o) if (k !== 'facts') S[k] = o[k];
    Object.assign(F, o.facts || {}); S.facts = F;
  }
  function exportState(){ return JSON.stringify(S, (k, v) => v instanceof Set ? { __set: [...v] } : v); }
  function setPros(n){ S.pros = n == null ? null : Math.max(0, n | 0); }
  const isRecent = x => typeof x === 'string' && (S.recent || []).some(r => r === x || (r.length >= 20 && x.length >= 20 && (x.startsWith(r) || r.startsWith(x))));
  const pick = (arr, id) => { for (let i=0;i<arr.length;i++){ const k=id+':'+i; if (!S.used.has(k) && !isRecent(arr[i])) { S.used.add(k); return arr[i]; } } const fresh = arr.filter(x => !isRecent(x)); const pool = fresh.length ? fresh : arr; return pool[(S.turn+pool.length) % pool.length]; };
  function bump(r){ if (RANK[r] > RANK[S.risk]) S.risk = r; }
  const ACK_WARM = ['Te leo.','Gracias por contármelo.','Aquí sigo contigo.','Te sigo leyendo.'];
  function crisisRes(extra){ S.resources.add('4141'); S.resources.add('131'); (extra||[]).forEach(x=>S.resources.add(x)); if (S.minor) S.resources.add('1515'); }

  function start(){ S.lastQ = 'estado'; S.prevQ = '¿Cómo te sientes ahora?'; return { replies:R.start.slice(), chips:['Me siento muy sola/o últimamente','Tengo mucha angustia y no puedo dormir','Ya no quiero vivir'] }; }

  function event(name, o){
    const out = [];
    if (name === 'planB') {
      S.flags.add('PLAN_B'); S.planBGuardia = o ? o.guardia > 0 : true;
      if (S.mode !== 'normal') return { replies:[], chips:[] };
      if (o) {
        if (o.guardia > 0) {
          out.push('Avisé también al equipo de guardia; te van a escribir por aquí mismo.');
          if (F.refusedCall || F.cantCall) out.push('No tienes que llamar a nadie.'); else { const c = callLine('normal'); if (c) out.push(c); }
        } else {
          out.push('Todavía no logro conectar a un especialista.');
          if (F.refusedCall) out.push('No te voy a insistir con llamar. Tu caso sigue registrado y aquí sigo.');
          else out.push(F.cantCall ? 'Si estás en peligro, pídele a alguien cerca que llame al 131 por ti.' : 'Si estás en peligro, llama al *4141 o al 131: atienden las 24 horas.');
        }
      } else if (F.refusedCall || F.cantCall) out.push('La especialista de guardia ya tiene tu caso y te va a escribir por aquí mismo. No tienes que llamar a nadie.');
      else { out.push('La especialista de guardia ya tiene tu caso y viene en camino.'); const c = callLine('normal'); if (c) out.push(c); }
      out.push('Yo sigo aquí contigo mientras tanto.');
    }
    if (name === 'accepted' || (name === 'refer' && !o)) S.mode = 'humano';
    if (name === 'refer' && o) {
      S.mode = 'normal';
      if (o.guardia === 0) { out.push('Tu caso pasó al equipo de guardia. Ahora no hay nadie de guardia conectado; te van a escribir apenas alguien se conecte.'); if (!F.refusedCall) out.push(F.cantCall ? 'Si estás en peligro, pídele a alguien cerca que llame al 131 por ti.' : 'Si estás en peligro, llama al *4141 o al 131: atienden las 24 horas.'); }
      else out.push('Tu caso pasó al equipo de guardia. Te van a escribir por aquí mismo; yo sigo contigo mientras tanto.');
    }
    if (name === 'tomorrow') {
      S.mode = 'agendado'; S.flags.add('HORA_AGENDADA');
      if (o) { out.push('Tu hora quedó para ' + (o.cuando || 'mañana a las 10:00') + (o.con ? ' con ' + o.con : '') + '.'); out.push(o.aviso ? 'Te vamos a avisar en este navegador cuando sea la hora.' : 'Vuelve a esta misma página a esa hora: aquí mismo te van a escribir.'); }
      else out.push('Tu hora quedó para mañana a las 10:00. Te va a llegar un recordatorio.');
      out.push(F.refusedCall || F.cantCall ? 'Mientras tanto, aquí sigo si quieres conversar.' : 'Si antes de eso sientes que estás en peligro, el *4141 atiende las 24 horas. Y aquí sigo si quieres conversar.');
    }
    if (name === 'closed') { S.mode = 'normal'; S.searching = false; out.push('La conversación con el especialista terminó. Si quieres seguir conversando, aquí estoy.'); }
    return { replies: out, chips: [] };
  }

  function callLine(level){
    if (level !== 'emergency' && level !== 'override' && F.refusedCall) return null;
    if (level === 'soft' && S.sug.call >= 1) return null;
    if (level === 'normal' && S.sug.call >= 2) return null;
    if (level === 'override') { if (S.used.has('override')) return null; S.used.add('override'); }
    S.sug.call++;
    if (level === 'emergency') return F.refusedCall ? 'Sé que no querías llamar, pero esto es distinto: tu cuerpo necesita atención médica ahora. Llama al 131 o pídele a alguien que llame por ti.' : 'Llama ahora al 131 (SAMU), o pídele a alguien cerca que llame por ti.';
    if (level === 'override') return 'Sé que no quieres llamar, y no te voy a insistir más después de esto, pero lo que me cuentas es urgente: el *4141 o el 131 te pueden ayudar ahora mismo.';
    if (level === 'urgent') return F.cantCall ? 'Si no puedes hablar por teléfono, pídele a alguien cerca que llame al 131 por ti.' : 'Por favor llama al *4141 o al 131 en este momento.';
    if (level === 'normal') return F.cantCall ? null : 'Si sientes que no puedes esperar, el *4141 atiende ahora mismo, las 24 horas.';
    return 'Y si en algún momento lo necesitas, el *4141 atiende las 24 horas.';
  }

  function extractFacts(a){
    const t = a.norm, ch = {};
    if (/\bno (estoy|ando|me quede|quede|sigo) (tan |muy |re )?(solo|sola|solito|solita)\b/.test(t)) ch.alone = false;
    else if (/\b(estoy|ando|me quede|vivo|quede|sigo)\s+(muy\s+|re\s+)?(solo|sola|solito|solita)\b|\bno hay nadie\b|\bestoy sin nadie\b|\bnadie (esta )?conmigo\b/.test(t)) ch.alone = true;
    else if (!/\bno (esta|estan)\b/.test(t) && /\bestoy con (mi|mis|alguien|un|una)\b|^(ando |sigo )?(con|junto a|junto con) (mi|mis) (mama|papa|madre|padre|hermano|hermana|hermanos|pareja|pololo|polola|esposo|esposa|marido|familia|abuela|abuelo|tia|tio|hijo|hija|hijos|amigo|amiga|amigos|amigas|vieja|viejo|papas|viejos)\b|\b(mi|mis) (mama|papa|madre|padre|hermano|hermana|hermanos|pareja|pololo|polola|esposo|esposa|marido|familia|abuela|abuelo|tia|tio|hijo|hija|hijos|amigo|amiga|companero|companera|vieja|viejo)\b.*\b(esta|estan|aqui|aca|conmigo|duerme|duermen|durmiendo)\b/.test(t)) ch.alone = false;
    if (a.intents.includes('NO_LLAMAR')) { if (/\b(no quiero|no voy|no pienso|no llamare|no me interesa|no quiero hablar con nadie)\b/.test(t)) ch.refusedCall = true; else ch.cantCall = true; }
    if (ch.alone === undefined && /\b(hay gente|hay harta gente|estoy con gente|con amigos|con amigas|con mis amigos|con mis amigas)\b/.test(t) && !/\bno hay gente\b/.test(t)) ch.alone = false;
    if (/\b(a nadie|no tengo a quien|no tengo con quien|no hay a quien|no tengo a nadie)\b/.test(t)) ch.someone = false;
    if (a.intents.includes('YA_LLAME')) ch.called = true;
    if (/\b(estoy a salvo|estoy segur[oa])\b/.test(t) && !/\bno estoy\b/.test(t)) ch.safe = true;
    if (/\bno estoy (a salvo|segur[oa])\b/.test(t)) ch.safe = false;
    if (/\b(ya (lo|la|los|las) (guarde|deje|bote|tire|saque|aleje|escondi|entregue|pase|di)|(lo|la|los|las) (deje|guarde|puse|escondi|bote|tire) (en|lejos|afuera|arriba|abajo|con)|se (lo|la|los|las) (pase|di|entregue) a|ya no (lo|la|los|las) tengo)\b/.test(t)) ch.meansAway = true;
    if (/\b(ya le (escribi|hable|conte|dije|mande|avise)|le escribo|le voy a escribir|le voy a hablar|le voy a avisar)\b/.test(t)) ch.someone = true;
    if (/\b(a nadie le he (contado|dicho)|nadie sabe|no le he contado a nadie|no tengo con quien hablar|no he hablado con nadie|no le he dicho a nadie|no lo he hablado)\b/.test(t)) ch.personKnown = true;
    if (/\b(ella|el|ellos|mi \w+) (ya )?(sabe|saben)\b|\bya (le|les) (conte|dije)\b/.test(t)) { ch.personKnown = true; ch.knowsTold = true; }
    if (TIME_RE.test(t.replace(/\b(tengo|cumpli|cumplo) \d+ anos?\b/,'')) || (/\b(ayer|anoche|antenoche|hoy|recien|la semana pasada|el mes pasado|el ano pasado|hace poco|este ano|esta semana|el otro dia)\b/.test(t) && a.themes.some(x => ['duelo','despido','pareja','vivienda','embarazo','posparto','salud','bullying'].includes(x)))) ch.timeKnown = true;
    return ch;
  }

  function reply(text){
    const a = analyze(text);
    S.turn++;
    const out = []; let chips = []; let startSearch = false, urgent = false, showCrisis = false;
    const freshThemes = a.themes.filter(t => !S.themes.has(t)).sort((x,y)=>TPRI.indexOf(x)-TPRI.indexOf(y));
    a.themes.forEach(t => S.themes.add(t));
    if (a.flags.includes('MENOR') && !S.minor) { S.minor = true; S.resources.add('1515'); }
    const prevRisk = S.risk;
    bump(a.risk);
    let P = a.primary;
    const P0 = a.primary;
    const t = a.norm;
    const lastQ = S.lastQ; S.lastQ = null; const lastQTheme = S.lastQTheme; S.lastQTheme = null;
    const crisisMode0 = () => F.ideation === true || S.track === 'suicide';
    if (/^((ok|bueno|ya|entonces|mejor|chao|weno|listo|nada)\s+)*me voy(\s+(ya|entonces|chao|nomas|po|mejor|nos vemos|adios|igual))*$/.test(t)) P = 'DESPEDIDA';
    // reinterpretaciones según el contexto
    const riskCtx = RANK[S.risk] >= 1 || F.ideation;
    if (!RISKY.has(P) && riskCtx && (/\b(me tome|me trague|tome|trague)\b.*\b(pastill|remedio|clona|pildora|medicament|veneno|cloro|algo|todas|todo|unas|varias)/.test(t) || /\b(estoy sangrando|sangra mucho|no para de sangrar)\b/.test(t))) { P = 'EMERGENCIA'; a.flags.push('EMERGENCIA'); bump('high'); }
    if (a.intents.includes('LUGAR_PELIGRO') && (riskCtx || RISKY.has(P))) P = 'LUGAR_PELIGRO';
    if (a.intents.includes('LUGAR_PELIGRO') && /\b(quiero|voy a|ganas de|me dan ganas de|pienso|estoy pensando en|me quiero) (saltar|tirarme|lanzarme|botarme|tirar)\b/.test(t)) P = 'LUGAR_PELIGRO';
    if (lastQ === 'lugarcheck' && !RISKY.has(P) && /\b(piso|pisos|alto|altura|abajo|saltar|tirarme|caer|nadie me ve|el vacio)\b/.test(t)) P = 'LUGAR_PELIGRO';
    if (P === 'IDEACION' && a.laugh && !F.ideation && !a.imminent && RANK[prevRisk] < 2 && !a.intents.some(k=>['PLAN','METODO','EMERGENCIA','AUTOLESION'].includes(k))) { P = 'IDEACION_HUMOR'; }
    if (P === 'OTRO_IDIOMA' && a.intents.includes('OTRO_RIESGO')) P = 'IDEACION';
    if ((P === 'POSITIVO' || P === 'MINIMIZA') && (F.ideation === true || RANK[S.risk] >= 2)) P = 'MINIMIZA_CRISIS';
    else if (P === 'MINIMIZA' && /\b(bien|mejor)\b/.test(t)) P = 'POSITIVO';
    if ((P === 'DESPEDIDA' || P === 'GRACIAS_TODO' || (P === 'GRACIAS' && /todo/.test(t))) && (F.ideation || RANK[S.risk] >= 2) && S.mode === 'normal') P = 'DESPEDIDA_RIESGO';
    if (P === 'GRACIAS_TODO') P = 'DESPEDIDA';
    if (lastQ === 'tema' && !RISKY.has(P) && !a.themes.length && ['OFFTOPIC','NADA','PREGUNTA','RELIGION'].includes(P)) P = 'TEMA_LIBRE';
    if (lastQ === 'opciones' && !RISKY.has(P) && ['PREGUNTA','NADA'].includes(P)) P = 'OPCION';
    if (/^FAQ_/.test(P)) { a.themes.forEach(x => { if (freshThemes.includes(x)) S.themes.delete(x); }); freshThemes.length = 0; }
    if (S.n.datos && !RISKY.has(P) && /\b(donde vive|donde trabaja|como se llama|su nombre|su numero|su instagram|su celular|su correo)\b/.test(t)) P = 'DATOS';
    if (/^\d+$/.test(a.toks.join('')) && a.toks.length && P === 'NADA') P = 'GIBBERISH';
    if (S.track === 'helper' && !RISKY.has(P) && /\b(como (le|la|lo) (hablo|pregunto|digo|ayudo|apoyo|ayudamos)|que (le|les) digo|como (lo|la) (ayudo|apoyo)|que (puedo|deberia|debo) hacer|que hago)\b/.test(t)) P = 'HELPER_HOW';
    if (S.track === 'violence' && !RISKY.has(P) && !S.used.has('violAway') && /\b(otra pieza|esta aca|esta aqui|en la casa|al lado|afuera|viene|llego|esta llegando|me esta buscando)\b/.test(t)) P = 'VIOL_CERCA';
    if (S.track === 'grooming' && !RISKY.has(P) && /\b(sigue escribiendo|me escribe|me sigue hablando|me habla todos)\b/.test(t)) P = 'GROOM_SIGUE';
    if (S.track === 'grooming' && !RISKY.has(P) && /\b(publicar|subir|mostrar|si no le mando|si no le mandas|las otras|mis fotos)\b/.test(t)) P = 'VIOLENCIA';
    if (S.flags.has('METODO') && !RISKY.has(P) && /\b(dime|dimelo|solo dime|dame la info|cuantas|cual es|cuanto es|respondeme|contestame)\b/.test(t)) { P = 'METODO'; S.n.metodo = (S.n.metodo||0) + 1; }
    if (F.emergency && !RISKY.has(P) && /\b(mare|me duele|vomit|me quiero dormir|tengo sueno|no siento|desmay|me cuesta respirar|nausea|me tiembla|veo borroso|me siento rara|me siento raro)/.test(t)) P = 'EMERG_SINTOMA';
    if (a.intents.includes('HERIDA') && (S.flags.has('AUTOLESION') || F.emergency) && !RISKY.has(P)) P = 'HERIDA';
    else if (P === 'HERIDA') P = a.themes.length ? 'TEMA' : 'NADA';
    if (/\b(hagamoslo|hagamos el ejercicio|hagamoslo ya|si hagamoslo|ya hagamoslo)\b/.test(t) && S.sug.exercise && !S.ground) P = 'GROUNDING';
    const crisisCtx = F.ideation === true || S.track === 'suicide' || riskCtx;
    if (a.flags.includes('MEDIOS') && crisisCtx && !RISKY.has(P) && !['EMERGENCIA','LUGAR_PELIGRO'].includes(P)) P = 'MEDIOS_CRISIS';
    if (F.emergency && F.called !== true && !RISKY.has(P) && (P === 'BROMA' || P === 'IDEACION_HUMOR' || /\b(mentira|era broma|es broma|no es verdad|no lo hice|no me tome nada|no tome nada|te estaba webeando|te webie|te estoy webeando|no es cierto)\b/.test(t))) P = 'RETRACTA';
    if (S.flags.has('DUELO_SUICIDIO') && !RISKY.has(P) && !['DUELO_SUICIDIO','TERCERO'].includes(P) && /\b(culpa|pude (haberlo|haberla|hacer|evitar)|debi|si hubiera|no le conteste|no le respondi|no me di cuenta|no lo vi venir|no la vi venir|no hice nada|podria haber)\b/.test(t)) P = 'CULPA_DUELO';
    if (S.flags.has('METODO') && !RISKY.has(P) && /\b(novela|cuento|historia|libro|tarea|investigacion|curiosidad|pregunta nomas|era pregunta|es pregunta|un trabajo|para un trabajo|para saber|no es para mi|es para (otra persona|alguien mas|un amigo|una amiga)|solo preguntaba|pregunto nomas|era una pregunta)\b/.test(t)) P = 'METODO_EXCUSA';
    const THIRD = /\b(mi|mis) (hijo|hija|hijos|hijas|amigo|amiga|hermano|hermana|pareja|pololo|polola|esposo|esposa|marido|nieto|nieta|alumno|alumna|sobrino|sobrina|companero|companera|mama|papa|madre|padre|abuela|abuelo|tia|tio|prima|primo|vecino|vecina)\b|\b(una|un) (amiga|amigo|companera|companero|colega|alumna|alumno|vecina|vecino)\b/;
    const BEH = /\b(no sale|se encierra|encerrad[oa]|no come|no habla|no duerme|toma mucho|bebe mucho|se droga|consume|fuma mucho|esta deprimid[oa]|anda (muy )?mal|esta muy mal|esta mal|no quiere (ayuda|ir|hablar|salir|nada)|se aisla|llora (mucho|todo el dia|siempre)|no para de llorar|no se levanta|dejo de (ir|comer|salir))\b/;
    const FORX = /\b(es para|escribo por|te escribo por|vengo por|consulto por|pregunto por|me preocupa|estoy preocupad[oa] por|preocupad[oa] por)\b/;
    if (['TEMA','NADA','AYUDA','SUSTANCIAS','PREGUNTA','CONSEJO'].includes(P) && S.track !== 'suicide' && THIRD.test(t) && (FORX.test(t) || BEH.test(t.replace(/\bme dejo de hablar\b|\bno me habla\b/g, ''))) && !/\bme dejo de hablar\b/.test(t)) P = 'TERCERO_MAL';
    if (!RISKY.has(P) && /\bno (me )?(estoy|siento) segur[oa] en (mi casa|la casa|mi pieza|el colegio|mi trabajo|la pega|el liceo)\b/.test(t)) P = 'NO_SEGURO_LUGAR';
    if (S.track === 'helper' && !RISKY.has(P) && P !== 'TERCERO') {
      if (/\b(y )?si (me )?(dice|responde|contesta|confiesa) que si\b/.test(t)) P = 'HELPER_IFYES';
      else if (/\b(no quiere|no se deja|no acepta) (ayuda|ayudar|ir|que (lo|la) ayude|tratamiento|hablar)\b/.test(t)) P = 'HELPER_NOQUIERE';
      else if (/\b(se calmo|esta mas tranquil[oa]|ya esta mejor|se durmio|se quedo dormid[oa]|ya paso|se le paso|dejo de llorar)\b/.test(t)) P = 'HELPER_CALMA';
      else if (/\b(no me habla|no me dice nada|no me cuenta|no se que le pasa|no quiere contarme|no me quiere contar|no me responde)\b/.test(t)) P = 'HELPER_CERRADO';
      else if (/\b(toma mucho|bebe mucho|se droga|consume|se cura|anda curad[oa]|fuma (mucho|pasta|marihuana))\b/.test(t) && !/\b(yo|me)\b/.test(t)) P = 'HELPER_SUST';
    }
    if (!RISKY.has(P) && !['TERCERO','LUGAR_PELIGRO','EMERGENCIA','PASIVA','INTENTO_PREVIO','MEDIOS_CRISIS','RETRACTA','DUELO_SUICIDIO'].includes(P)) {
      if (/(\+?56\s?9|\b9)\s?\d{4}\s?\d{4}\b|\b[\w.]+@\w+\.\w+/.test(String(a.raw))) P = 'DATOS_PROPIOS';
      else { const ex = EXTRA.find(x => x[1].test(t)); if (ex) P = ex[0]; }
    }
    if (!RISKY.has(P) && /\b(escucho|oigo|siento) (voces|una voz)\b|\blas voces\b|\buna voz (me dice|que me dice)\b/.test(t) && !S.flags.has('VOCES')) P = 'VOCES';
    else if (S.flags.has('VOCES') && !RISKY.has(P) && /\b(las escucho|escucho voces|las oigo|me estan hablando|me hablan|me siguen diciendo|siguen hablando|las sigo escuchando)\b/.test(t)) P = 'VOCES_AHORA';
    if ((!RISKY.has(P) || P === 'DANO_OTROS') && /\b(cuando (ya )?no este|cuando me haya ido|deje todo (listo|ordenado|arreglado|preparado)|ya deje todo|escribi (una|mis|unas)? ?cartas? (de despedida|a todos|para todos|a mi familia|para mi familia)|les escribi (una|unas)? ?cartas?|deje (una|unas) cartas?|les deje (una|unas)? ?cartas?|cartas? para cuando|regale (mis|todas mis|todo|mis cosas)|estoy regalando (mis|todas mis|todo)|ya me despedi de (todos|mi familia|mis)|me estoy despidiendo de|para que no tengan que hacer nada)\b/.test(t) && !S.used.has('despEnc')) P = 'DESPEDIDA_OCULTA';
    if (!RISKY.has(P) && /^(ya )?(tome la decision|lo decidi|esta decidido|ya lo tengo decidido|ya lo decidi)$/.test(t)) P = 'DECISION';
    if (S.flags.has('DECISION') && !RISKY.has(P) && /\b(lo mejor para todos|no me vas a convencer|no me vas a hacer cambiar|nadie me va a detener|nadie me va a parar|ya no hay vuelta|no hay vuelta atras|es lo mejor)\b/.test(t)) P = 'DECISION_RIESGO';
    if (/\b(estoy en el hospital|estoy internad[oa]|estoy hospitalizad[oa]|me internaron|me hospitalizaron|estoy en la clinica|estoy en urgencias)\b/.test(t)) { S.flags.add('HOSPITAL'); if (F.safe === null) F.safe = true; }
    if (/\bpor intentar (matarme|suicidarme|quitarme la vida)\b|\bdespues de (intentar matarme|intentar suicidarme|mi intento)\b/.test(t)) P = 'INTENTO_PREVIO';
    if (P === 'TEMA' && S.flags.has('HOSPITAL') && a.toks.length <= 5 && /hospital|internad|clinica|urgencia/.test(t) && !S.used.has('hosp')) P = 'HOSPITAL';
    if (!/\bme (desmaye|desmayo)\b/.test(t) && /\b(se desmayo|se desmaya|no respira|no esta respirando|respira mal|no reacciona|esta inconsciente|quedo inconsciente|convulsion|esta convulsionando|le dio un infarto|le esta dando un infarto|se esta ahogando|no despierta|se pego en la cabeza)\b/.test(t) && !/\b(me|yo)\b/.test(t.replace(/\b(se|le) /g,''))) P = 'EMERGENCIA_OTRO';
    if (/\b(le pego|le pegue|lo golpeo|la golpeo|lo golpee|la golpee|le grito|lo zamarreo|la zamarreo|le doy correazos|le pego con|le pego a)\b/.test(t) && /\b(hijo|hija|hijos|hijas|nino|nina|guagua|bebe|pareja|polola|pololo|esposa|esposo|senora|mama|papa|hermano|hermana)\b/.test(t) && !/\b(me pega|me golpea)\b/.test(t)) P = 'AGRESOR';
    if (S.track === 'agresor' && !RISKY.has(P) && P !== 'AGRESOR' && /\b(no quiero (hacerlo|seguir|pegarle)|me arrepiento|me siento (mal|horrible|culpable))\b/.test(t)) P = 'AGRESOR_ARREP';
    if (!RISKY.has(P) && /\b(nada es real|nada parece real|todo es irreal|siento que no soy yo|como si estuviera en un sueno|como en un sueno|me siento fuera de mi cuerpo|me veo desde afuera|desconectad[oa] de todo|como en una pelicula)\b/.test(t)) P = 'DISOCIACION';
    if ((/\bno me quiero matar pero\b|\bno lo haria pero\b/.test(t) && /\b(pienso|facil|a veces|igual)\b/.test(t)) || /\b(pienso|siento|creo) que seria mas facil\b|\bseria mas facil (no estar|desaparecer|morir|irme|no despertar|terminar con todo)\b/.test(t)) { if (!a.intents.some(i => ['PLAN','METODO','EMERGENCIA'].includes(i))) P = 'PASIVA'; }
    if (!RISKY.has(P) && /\b(cuido|cuidar|cuidando) (a )?(mi|mis) (mama|papa|abuela|abuelo|madre|padre|hijo|hija|esposo|esposa|pareja|hermano|hermana)\b/.test(t) && /\b(alzheimer|demencia|enferm|postrad|discapacidad|no doy mas|agotad|cansad|reventad|sola|solo)\b/.test(t)) P = 'CUIDADOR';
    if (S.flags.has('CUIDADOR') && !RISKY.has(P) && P !== 'CUIDADOR') { if (/\b(nadie me ayuda|sin ayuda|todo lo hago yo|nadie me releva|estoy sola con|estoy solo con)\b/.test(t)) P = 'CUIDADOR_SOLO'; else if (/\b(culpa|culpable|mala hija|mal hijo|egoista)\b/.test(t)) P = 'CUIDADOR_CULPA'; }
    if (/\b(acoso|acosa|acosan|acosando)\b/.test(t) && /\b(jefe|jefa|trabajo|pega|companero de trabajo|companera de trabajo|colega|supervisor|supervisora|gerente|oficina)\b/.test(t)) P = 'ACOSO_LABORAL';
    if (S.flags.has('ACOSO_LABORAL') && !RISKY.has(P) && P !== 'ACOSO_LABORAL') { if (/\bmiedo (de|a) perder (la pega|el trabajo)\b|\bme van a echar\b|\bme pueden despedir\b/.test(t)) P = 'ACOSO_MIEDO'; else if (/\b(me dice cosas|mi cuerpo|me toca|me manda|fotos|insinua|comentarios)\b/.test(t)) P = 'ACOSO_DETALLE'; }
    if (!RISKY.has(P) && /\b(me discriminan|me discrimina|discriminacion|discriminad[oa]|racismo|racista|xenofobia|homofobia)\b|\bpor ser (mapuche|negr[oa]|gay|lesbiana|trans|migrante|venezolan[oa]|peruan[oa]|haitian[oa]|colombian[oa]|gord[oa]|indigena|pobre)\b.*\b(me (tratan|molestan|discriminan|insultan|dicen))\b/.test(t)) P = 'DISCRIMINACION';
    if (S.flags.has('DISCRIMINACION') && !RISKY.has(P) && P !== 'DISCRIMINACION' && a.toks.length <= 4 && /\b(en la pega|en el trabajo|en el colegio|en la u|en la universidad|en la calle|en la micro|en el liceo|en mi casa)\b/.test(t)) P = 'DISCRIM_LUGAR';
    if (!RISKY.has(P) && /\b(antidepresivos?|pastillas|remedios|medicamentos?|fluoxetina|sertralina|escitalopram|quetiapina|litio|tratamiento)\b/.test(t) && /\b(me tienen mal|me hacen mal|me sientan mal|me siento peor|efectos|me caen mal|me tienen (como )?(raro|rara|zombie|zombi|dopad[oa]|ido|ida|volad[oa]|plano|plana)|no me hacen nada)\b/.test(t)) P = 'MED_EFECTO';
    else if (!RISKY.has(P) && /\b(me tienen|me dejan|me tiene|me deja) (como )?(raro|rara|zombie|zombi|dopad[oa]|plano|plana)\b/.test(t) && (S.flags.has('MED_DEJAR') || /\b(antidepresiv|remedio|pastilla|medicament)/.test(S.lastUser || ''))) P = 'MED_EFECTO';
    else if (S.flags.has('MED_EFECTO') && !RISKY.has(P) && /\bme siento peor\b/.test(t)) P = 'MED_PEOR';
    if (!RISKY.has(P) && (S.flags.has('MED_EFECTO') || /\b(antidepresivos?|pastillas|remedios|medicamentos?)\b/.test(t)) && /\b(los|las) voy a dejar\b|\bvoy a dejar (los|las|de tomar(los|las)?)\b|\bdeje (los|las|de tomar(los|las)?)\b|\bno me los voy a tomar\b|\bquiero dejar (los|las|el|mis|de tomar)\b|\bdejar de tomar(los|las)?\b/.test(t)) P = 'MED_DEJAR';
    if (!RISKY.has(P) && /\b(pesadillas|flashbacks?|lo revivo|recuerdos que vuelven)\b/.test(t) && /\b(accidente|choque|asalto|asaltaron|terremoto|incendio|violacion|abuso|balacera|desde que)\b/.test(t)) P = 'TRAUMA';
    if (S.flags.has('TRAUMA') && !RISKY.has(P) && /\b(no puedo (manejar|salir|subirme|dormir|pasar por)|me da miedo (manejar|salir|subirme))\b/.test(t)) P = 'TRAUMA_EVITA';
    if (!RISKY.has(P) && P !== 'VIOLENCIA' && /\b(revisa|revisaba) (mi|el) (celular|telefono|whatsapp|wsp)\b|\bno me deja (ver|juntarme|salir|hablar) (a|con)\b/.test(t) && /\b(pololo|polola|pareja|esposo|esposa|marido|novio|novia)\b/.test(t)) P = 'CONTROL_PAREJA';
    if (S.flags.has('CONTROL_PAREJA') && !RISKY.has(P) && P !== 'CONTROL_PAREJA') { if (/\b(porque me quiere|me ama|es por amor|es celoso|es celosa|celos|me cuida)\b/.test(t)) P = 'CONTROL_AMOR'; else if (/\b(es normal|sera normal|exagero|estoy exagerando)\b/.test(t)) P = 'CONTROL_NORMAL'; }
    if (!RISKY.has(P) && /\bperdi (mi|el) (embarazo|bebe|guagua)\b|\baborto espontaneo\b|\bperdida gestacional\b/.test(t)) P = 'DUELO_GESTA';
    if (!RISKY.has(P) && /\b(me dicen|todos me dicen|me dijeron) que (ya (va a|se me va a) pasar|lo supere|no es para tanto|tengo que seguir|me olvide|deje de llorar|lo deje atras)\b/.test(t)) P = 'MINIMIZAN';
    if (!RISKY.has(P) && /\b(repite|repitelo|repiteme|que dijiste|no lei|se me borro|no alcance a leer|lo ultimo)\b/.test(t) && a.toks.length <= 5) P = 'REPETIR';
    if (S.themes.has('bullying') && !RISKY.has(P) && /\bno quiero ir\b/.test(t)) P = 'NO_QUIERO_IR';
    if (S.track === 'agresor' && P === 'AYUDA') P = 'AGRESOR_AYUDA';
    if (!RISKY.has(P) && /\b(el|la) (psicolog\w*|especialista|terapeuta)( de (aca|aqui|la app|la pagina))? (me trato mal|fue pesad[oa]|me juzgo|no me escucho|me hizo sentir mal|fue grosero|fue grosera)\b/.test(t)) P = 'QUEJA_ESP';
    if (S.flags.has('QUEJA_ESP') && !RISKY.has(P) && P !== 'QUEJA_ESP' && /\bno quiero (hablar|que me atienda)( con)? (el|ella|ese|esa)\b/.test(t)) P = 'QUEJA_ESP2';
    if (!RISKY.has(P) && /\b(eres (lo mejor|el mejor|la mejor|un amor|bacan|seco|lo maximo|genial|muy bueno|muy buena)|te voy a recomendar|buen bot|me gusto (hablar|conversar) contigo|que buena (app|pagina)|me caes bien)\b/.test(t)) P = 'ELOGIO';
    if (!RISKY.has(P) && /\bno se (por que|para que) (estoy|te estoy) (escribiendo|hablando)\b|\bno se por que (escribo|te escribo)\b/.test(t)) P = 'SIN_RAZON';
    if (P === 'HUMANO' && /\b(solo queria|solo quiero|necesitaba|necesito) (hablar|conversar) con alguien\b/.test(t) && !/\b(real|de verdad|humano|humana|profesional|psicolog\w*|especialista|persona)\b/.test(t)) P = 'CONVERSAR';
    if (S.flags.has('TERCERO') && S.minor && !RISKY.has(P) && /\bestoy sol[oa] con (ella|el|mi mama|mi papa|mi mami|mi papi)\b/.test(t)) P = 'TERCERO_NINO';
    if (!RISKY.has(P) && /\bno se si (perdonarlo|perdonarla|volver|terminar|dejarlo|dejarla|seguir con (el|ella)|separarme|irme|decirle|contarle|decirles|contarles|confesarle)\b/.test(t)) P = 'DUDA_DECISION';
    if (!RISKY.has(P) && /\bmiedo (de|a) (volver a (estar|sentirme|caer)|recaer)\b/.test(t)) P = 'MIEDO_RECAER';
    if (S.track === 'sustancias' && !RISKY.has(P)) { if (/\b(todos los dias|todo el dia|siempre|cada dia|diario)\b/.test(t) && a.toks.length <= 6) P = 'SUST_FREC'; else if (/\b(ya intente dejarlo|no puedo dejarlo|recai|volvi a tomar|volvi a consumir|lo intente)\b/.test(t)) P = 'SUST_RECAIDA'; }
    if ((F.ideation === true || S.track === 'suicide') && !RISKY.has(P) && /^(ya )?(lo hice|lo hice todo|esta hecho|es tarde|ya es tarde|ya no hay nada que hacer)$/.test(t) && !(S.pending && S.pending.type === 'means')) P = 'LO_HICE';
    if (!RISKY.has(P) && /\bno se como (decirle|decirles|contarle|contarles)\b/.test(t)) P = 'MIEDO_CONTAR';
    if ((S.flags.has('MEDIOS') || S.flags.has('MEDIOS_CERCA')) && !RISKY.has(P) && !(S.pending && S.pending.type === 'means') && /\b(no (quiero|voy a|lo voy a|lo quiero|la quiero|la voy a) (soltarlo|soltarla|dejarlo|dejarla|soltar|botarlo|botarla|alejarlo|alejarla)|no lo suelto|no la suelto)\b/.test(t)) P = 'MEDIOS_RECHAZO';
    if (S.lastPrimary === 'FAQ_PAIS' && ['PREGUNTA','NADA'].includes(P) && /\b(sirve|funciona|puedo|igual)\b/.test(t)) P = 'FAQ_PAIS2';
    if (S.themes.has('alimentacion') && !RISKY.has(P) && a.toks.length <= 7 && /\b(todos los dias|todo el dia|cada vez que como|despues de cada comida|varias veces al dia|siempre)\b/.test(t)) P = 'ALIM_FREC';
    if (!RISKY.has(P) && /\b(no se si (voy a )?(aguantar|aguanto|podre aguantar|puedo aguantar)|no voy a aguantar|no creo que aguante)\b/.test(t) && (F.ideation === true || S.track === 'suicide' || S.flags.has('AUTOLESION'))) P = 'AGUANTE';
    if (/🙄|😒/.test(String(a.raw)) && ['POSITIVO','MINIMIZA','NADA','GRACIAS'].includes(P)) P = 'SARCASMO';
    if (!a.intents.some(i => ['IDEACION','PLAN','METODO','EMERGENCIA','AUTOLESION'].includes(i)) && (P === 'PASIVA' || P === 'TEMA' || P === 'NADA') && !/\bmorir de (los nervios|la risa|verguenza|hambre|sueno|frio|calor|pena|amor|aburrimiento|lata)\b/.test(t) && /\b(me voy a morir|siento que me muero|me va a dar algo|me late (muy )?(rapido|fuerte)|el corazon me late|me falta el aire|no puedo respirar|me ahogo|ataque de (panico|ansiedad|angustia)|crisis de (panico|angustia|ansiedad)|me tiemblan|siento que me desmayo)\b/.test(t) && !/\b(quiero|ojala|ganas|deseo)\b/.test(t)) P = 'PANICO';
    if (P === 'IDEACION' && !a.imminent && !F.ideation && RANK[prevRisk] < 2 && !a.intents.some(k=>['PLAN','METODO','EMERGENCIA','AUTOLESION','PASIVA'].includes(k)) && /\b(prueba|examen|certamen|control|tarea|disertacion|trabajo de|lunes|calor|frio|verguenza|que lata|que paja|el partido|perdio|perdimos|tengo que|me toca|reunion|la micro|el trafico|el profe|la profe)\b/.test(t)) P = 'IDEACION_HIPERBOLE';
    if (P === 'TERCERO' && /\bsi no (vuelvo|vuelves|lo dejo|la dejo|termino|le hago caso|me caso|vuelvo con|lo perdono|la perdono)\b|\bsi (lo|la) dejo\b|\bsi termino con\b|\bsi no estoy con\b/.test(t)) P = 'AMENAZA_SUICIDA';
    if (S.flags.has('AMENAZA_SUICIDA') && !RISKY.has(P) && P !== 'TERCERO') {
      if (/\b(no se si creerle|no le creo|sera verdad|lo dice para|lo hace para|me manipula|siempre dice lo mismo|chantaje)\b/.test(t)) P = 'AMENAZA_DUDA';
      else if (/\b(culpa|culpable|por mi culpa|seria mi culpa)\b/.test(t)) P = 'AMENAZA_CULPA';
    }
    if (P === 'TERCERO' && /\b(tiktok|instagram|insta|twitter|facebook|redes|youtube|discord|internet|stream|en un video|un live|reddit|whatsapp de)\b/.test(t)) P = 'TERCERO_REDES';
    if (S.flags.has('TERCERO_REDES') && !RISKY.has(P) && P !== 'TERCERO_REDES' && /\b(que hago|que puedo hacer|como (lo|la) ayudo|no (lo|la) conozco)\b/.test(t)) P = 'TERCERO_REDES2';
    // respuestas con emoji a una pregunta pendiente
    if (S.pending && /^\s*(👍|👌|✅|👎|❌|🙅|🤷)[\s‍♀♂️]*$/u.test(String(a.raw))) P = 'NADA';
    // se corrige ('quise decir mudar')
    if (!a.intents.some(i => ['IDEACION','PLAN','METODO','EMERGENCIA','AUTOLESION'].includes(i)) && RANK[prevRisk] >= 2 && /\b(quise decir|queria decir|me equivoque|error de dedo|lo escribi mal|el corrector|autocorrector|me corrigio|no era eso|escribi mal)\b/.test(t)) P = 'CORRIGE';
    // es uno mismo
    if ((P === 'TERCERO' || ((S.track === 'helper' || S.flags.has('TERCERO')) && !RISKY.has(P))) && /\b(soy yo|era yo|es para mi|era para mi|hablo de mi|hablaba de mi|(la|el) (amiga|amigo) soy yo|en verdad (soy|era) yo|me refiero a mi)\b/.test(t)) P = 'REVELA_PROPIO';
    // noticias y preguntas generales sobre suicidio
    if (P === 'DUELO_SUICIDIO' && /\b(noticias|noticia|tele|television|diario|redes|tiktok|instagram|famoso|famosa|cantante|actor|actriz|youtuber|influencer|futbolista|artista|streamer|serie|pelicula)\b/.test(t)) P = 'NOTICIA_SUICIDIO';
    if (['PASIVA','TERCERO','PREGUNTA','NADA'].includes(P) && /\b(por que|porque|que lleva a|que hace que) (la gente|las personas|alguien|uno|una persona|tantas personas|se)\b.*\b(suicid\w*|se mata|se matan|se quita la vida|se quitan la vida)\b/.test(t) && !/\b(yo|me|mi)\b/.test(t)) P = 'PREG_SUICIDIO';
    // 'el viernes lo voy a hacer'
    if (P === 'NADA' && a.imminent && S.track !== 'helper' && !S.flags.has('TERCERO') && /\b(lo (voy a hacer|hago|hare)|va a ser|sera el|lo termino|termino con|me voy|ya tengo todo|ya lo decidi|tome la decision|todo (listo|planeado|preparado))\b/.test(t) && /\b(viernes|lunes|martes|miercoles|jueves|sabado|domingo|manana|hoy|esta noche|fin de semana|pronto|luego|ya)\b/.test(t) && a.toks.length <= 8) P = 'PLAN_AMBIGUO';
    if (!RISKY.has(P) && S.turn <= 4 && /^(ya )?(tengo todo|lo tengo todo) (planeado|listo|preparado|pensado)$/.test(t)) P = 'PLAN_AMBIGUO';
    if (lastQ === 'planamb' && ['IDEACION','PASIVA','METODO','IDEACION_HUMOR','NADA'].includes(P) && /\b(matar|morir|suicid|quitar|colgar|ahorcar|tirar|lanzar|cortar|desaparecer|terminar con todo|acabar con todo)/.test(t)) { P = 'PLAN'; a.imminent = true; S.flags.add('PLAN'); S.flags.add('PLAN_CON_FECHA'); }
    // amenaza al bot en broma
    if (P === 'DANO_OTROS' && /\b(te voy a matar|te mato|te matare|te voy a pegar)\b/.test(t) && (a.laugh || /\bsi no me (respondes|contestas|hablas|pescas)\b/.test(t))) P = 'BROMA_BOT';
    // remedio común
    if (!RISKY.has(P) && P !== 'EMERGENCIA' && /\b(me tome|tome|me tomo) (un|una|dos|2|1|mi|mis|el|la)\b/.test(t) && /\b(para el dolor|para la cabeza|dolor de cabeza|para la fiebre|recetad\w*|que me dio el doctor|que me dio la doctora|como siempre|mi remedio|mis remedios|el de siempre|paracetamol|ibuprofeno\w*)\b/.test(t) && !/\b(todas|todos|caja|blister|muchas|muchos|varias|veinte|20|30|50)\b/.test(t)) P = 'MED_NORMAL';
    // mascota
    const PET = /\b(mi|mis) (perro|perrita|perrito|perra|gato|gata|gatito|gatita|mascota|conejo|hamster|loro|caballo|tortuga)\b/;
    if (!RISKY.has(P) && (PET.test(t) || S.flags.has('MASCOTA')) && /\b(muri\w*|muere|muriendo|enferm\w*|cancer|tumor|lo van a dormir|la van a dormir|eutanasia|atropell\w*|se perdio|se escapo|veterinari\w*|operar|dormirlo|dormirla|se fue)\b/.test(t) && !/\b(mi (mama|papa|abuel\w*|herman\w*|hij\w*|pareja|amig\w*)|yo tengo)\b/.test(t)) P = 'MASCOTA';
    if (S.flags.has('NOTICIA_SUICIDIO') && !S.used.has('noticiaQ') && !RISKY.has(P) && ['NADA','TEMA'].includes(P) && S.lastPrimary === 'NOTICIA_SUICIDIO') P = 'NOTICIA2';
    if (lastQ === 'petname' && !RISKY.has(P) && !a.themes.length && (/\bse llama(ba)? \w+/.test(t) || (a.toks.length <= 2 && !/\d/.test(t) && !/\b(tenia|era|es|se|no|si|anos|mi|el|la|un|una|que|ya|nada|ok)\b/.test(t)))) P = 'PET_NAME';
    if (S.flags.has('MASCOTA') && !RISKY.has(P) && /\b(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince) (anos|meses)\b/.test(t) && P !== 'PET_NAME') P = 'MASCOTA_EDAD';
    if (!RISKY.has(P) && /\bme (diagnosticaron|detectaron|encontraron|dijeron que tengo|confirmaron)\b/.test(t) && /\b(cancer|tumor|vih|sida|esclerosis|leucemia|lupus|parkinson|alzheimer|terminal|grave|cronica|epilepsia|diabetes|insuficiencia)\b/.test(t)) P = 'DIAGNOSTICO';
    if (S.flags.has('DIAGNOSTICO') && !RISKY.has(P) && /\b(tengo miedo|me da miedo|estoy asustad[oa]|tengo terror)\b/.test(t) && !a.answer) P = 'DIAG_MIEDO';
    if (S.flags.has('DUELO_GESTA') && !RISKY.has(P) && /\b(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve) (semanas|meses)\b/.test(t) && a.toks.length <= 5) P = 'GESTA_TIEMPO';
    if (!RISKY.has(P) && /\bmiedo (de |a )?(volver a (estar|sentirme|caer|hacerlo)|recaer|que vuelva)\b/.test(t)) P = 'RECAIDA_MIEDO';
    if (!RISKY.has(P) && P !== 'EMERGENCIA' && /\b(cuant[oa]s?|que cantidad|que dosis|cuanta)\b.*\b(peligros\w*|mortal|letal|toxic\w*|sobredosis|mata|matar|morir|morirse|muerte)\b/.test(t)) P = 'METODO';
    if (S.minor && !RISKY.has(P) && /\b(me grita|me gritan|me reta mucho|me insulta|me insultan|me trata mal|me tratan mal|me castiga|me encierra)\b/.test(t)) P = 'MALTRATO_MENOR';
    if (a.flags.includes('MEDIOS') && !crisisCtx && /\b(pistola|arma|revolver|escopeta|rifle|cuerda|soga|veneno|raticida)\b/.test(t) && !RISKY.has(P)) P = 'ARMA';
    if (P === 'PLAN' && /\b(metro|tren|linea|vias|puente|edificio|azotea|balcon|ventana|piso|cerro|acantilado|mar|rio)\b/.test(t) && !a.intents.includes('LUGAR_PELIGRO')) S.flags.add('PLAN_LUGAR');
    if (lastQ === 'donde' && !RISKY.has(P) && /\b(estacion|anden|metro|puente|edificio|azotea|techo|balcon|borde|vias|linea|cerro|mar|playa|rio)\b/.test(t)) P = 'LUGAR_PELIGRO';
    if (lastQ === 'donde' && !RISKY.has(P) && P !== 'LUGAR_PELIGRO' && /\b(casa|pieza|depto|departamento|cama|trabajo|pega|colegio|auto)\b/.test(t)) P = 'DONDE_CASA';
    if (/\b(se cumple|se cumplen|cumple|hoy hace|ya va a hacer|hoy es el aniversario)\b.*\b(muerte|murio|fallecio|partio|se fue|se suicido)\b|\baniversario de (la muerte|que murio)\b/.test(t) && !RISKY.has(P)) P = 'ANIVERSARIO';
    if (!RISKY.has(P) && /\b(no tengo (para comer|que comer|plata para comer|comida|nada que comer)|paso hambre|no he comido porque no tengo)\b/.test(t)) P = 'NECESIDAD_BASICA';
    if (!RISKY.has(P) && ['NADA','TEMA'].includes(P) && /\b(no tengo (trabajo|pega|empleo)|estoy (cesante|sin trabajo|sin pega|desempleado|desempleada))\b/.test(t)) P = 'CESANTE';
    if (P === 'VIOLENCIA' && /\b(me pegaron|me atacaron|me asaltaron|me golpearon|me agredieron)\b/.test(t) && !/\b(mi|mis) (pareja|pololo|polola|papa|mama|esposo|esposa|marido|ex|hermano|hermana|padrastro|tio|familia)\b/.test(t)) P = 'AGRESION_CALLE';
    if (/\b(me (van a|va a) matar|me matan|me mata)\b/.test(t) && /\b(mis papas|mi papa|mi mama|mis viejos|mi vieja|mi viejo|mi familia|mi jefe|mi profe)\b/.test(t) && (/\b(nota|notas|ramo|prueba|examen|u|universidad|colegio|liceo|pega|trabajo|plata|celular|auto|se enteran|si se entera|si se enteran|cuando sepan)\b/.test(t) || ['estudios','dinero','trabajo','despido','bullying'].some(x => S.themes.has(x))) && (!RISKY.has(P) || (P === 'VIOLENCIA' && !/\b(pega|pego|golpe\w*|viol\w*|abus\w*|toca|manose\w*|ahorc\w*|cuchillo|arma)\b/.test(t)))) P = 'MATAR_IDIOMA';
    if (/^(y )?(me|mis papas|mi papa|mi mama) (van a|va a) matar$/.test(t) && ['estudios','dinero','trabajo','despido'].some(x => S.themes.has(x)) && !RISKY_OWN(S)) P = 'MATAR_IDIOMA';
    if (lastQ === 'matarIdiom' && /\b(dano|pegar|pega|golpe|lastimar|me pegan|de verdad|en serio)\b/.test(t)) P = 'VIOLENCIA';
    if (lastQ === 'lugarcheck' && !RISKY.has(P) && (a.answer === 'yes' || a.answer === 'unsure')) P = 'LUGAR_PELIGRO';
    if (a.intents.includes('LUGAR_PELIGRO') && !(RANK[S.risk] >= 1 || F.ideation) && P !== 'LUGAR_PELIGRO' && !RISKY.has(P)) P = 'LUGAR_CHECK';
    if (!RISKY.has(P) && /\bno (pude|alcance a|me pude) despedirme\b/.test(t)) P = 'DUELO_SIN_DESPEDIDA';
    if ((S.track === 'violence' || S.track === 'past' || S.flags.has('VIOLENCIA')) && !RISKY.has(P) && /\b(fue mi culpa|es mi culpa|me lo busque|yo lo provoque|yo me lo busque|por (estar|andar|ir) (curad\w*|borrach\w*|con esa ropa|sola|solo))\b/.test(t)) P = 'CULPA_VIOLENCIA';
    if (!RISKY.has(P) && /\b(es|era) (lo unico|el unico|la unica) (que me queda|que tengo|que me mantiene)\b/.test(t)) P = 'UNICO_MOTIVO';
    if (a.intents.includes('SUSTANCIAS') && /\b(paranoic\w*|mal viaje|me pego mal|me siento raro|me siento rara|me late|ansiedad|panico|asustad\w*|me da miedo)\b/.test(t)) P = 'SUST_MALVIAJE';
    // golpes a la pared y dolor
    if (!RISKY.has(P) && /\b(le pegue|me pegue|pegue|golpee|le di|di un golpe|di un combo|le di un combo) (a |en |contra )?(la |una |el )?(pared|muralla|puerta|mesa|vidrio|ventana|espejo)\b/.test(t)) { if (!S.flags.has('GOLPE_PARED')) P = 'GOLPE_PARED'; S.flags.add('GOLPE_PARED'); }
    if (S.flags.has('GOLPE_PARED') && !RISKY.has(P) && /\b(me duele|duele|hinchad\w*|no la puedo mover|no puedo mover|me sangra|sangra|morado)\b/.test(t)) P = 'DOLOR_GOLPE';
    // anestesia emocional
    if (!RISKY.has(P) && ['NADA','TEMA'].includes(P) && /\b(ya no siento nada|no siento nada|no siento ni pena|estoy anestesiad[oa]|me siento vaci[oa] por dentro|como si no sintiera)\b/.test(t) && !S.ground) P = 'ENTUMECIDO';
    if (!RISKY.has(P) && !['EMERGENCIA','LUGAR_PELIGRO','MEDIOS_CRISIS','PANICO','CUIDADOR'].includes(P) && /\b(no se si (voy a )?aguantar|no voy a aguantar|no creo que aguante|no aguanto (mas|ma|esto|ni un dia)|no doy mas|ya no puedo mas|no puedo mas|no resisto mas|ya no doy mas)\b/.test(t)) P = 'NO_AGUANTO';
    if (P === 'AYUDA' && !crisisCtx && /\b(urgente|urjente|urgencia|emergencia|rapido|ahora ya|ya mismo)\b/.test(t)) P = 'AYUDA_URGENTE';
    if (!RISKY.has(P) && /\b(cicatriz|cicatrices|marcas de (los )?cortes|mis cortes|las marcas)\b/.test(t)) P = 'CICATRICES';
    if (S.flags.has('CICATRICES') && !RISKY.has(P) && /\b(se van a dar cuenta|se den cuenta|me van a ver|las van a ver|las vean|me van a preguntar)\b/.test(t)) P = 'MIEDO_CONTAR';
    if (S.flags.has('HORA_AGENDADA') && !RISKY.has(P) && /\b(falta mucho|es mucho tiempo|no aguanto hasta|queda mucho|es harto tiempo|es lejos)\b/.test(t)) P = 'ESPERA_HORA';
    if (P === 'TEMA' && /\bno se que hacer\b/.test(t) && a.toks.length <= 6 && [...S.themes].some(x => ADVICE[x]) && !S.used.has('adviceNSQH')) { S.used.add('adviceNSQH'); P = 'AYUDA'; }
    if (!RISKY.has(P) && /\bmiedo (de|a) (decirle|contarle|que (se entere|sepa|sepan|se enteren)|contarlo|decirlo)\b/.test(t)) P = 'MIEDO_CONTAR';
    if (S.themes.has('posparto') && !RISKY.has(P)) {
      if (/\b(buena|mala|peor) (mama|madre)\b|\bno sirvo (como|para) (mama|madre)\b/.test(t)) P = 'POSPARTO_CULPA';
      else if (/\b(trabaja todo el dia|no me ayuda|estoy sola con|sola todo el dia|nadie me ayuda|todo lo hago yo)\b/.test(t)) P = 'POSPARTO_SOLA';
    }
    if (S.track === 'violence' && !RISKY.has(P)) {
      if (/\b(no me cree|no me creen|no me creyo|no me creyeron|dice que miento|dicen que miento|dice que invento|me dijo mentiros)/.test(t)) P = 'NO_CREEN';
      else if (/\b(no quiero|no voy a|no puedo) (denunciar|hacer la denuncia|poner la denuncia|ir a carabineros|ir a los pacos)\b|\bno quiero que (lo|la) (metan|lleven) (preso|presa|detenid)/.test(t)) P = 'NO_DENUNCIA';
      else if (/\b(tengo miedo|me da miedo|estoy asustad[oa]|tengo terror)\b/.test(t) && !a.answer) P = 'VIOL_MIEDO';
    }
    /* ── reinterpretaciones nuevas (segunda revisión) ── */
    const WHEN_RE = /\b(hoy|esta noche|en la noche|manana|pasado manana|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|este fin de semana|el fin de semana|ahora|ahora mismo|ya|pronto|en un rato|la proxima semana)\b/;
    const METH_RE = /\b(pastillas|pastilla|remedios|remedio|medicamentos|clonazepam|ravotril|rivotril|cuerda|soga|colgarme|ahorcarme|saltar|tirarme|lanzarme|puente|metro|edificio|balcon|ventana|cortarme|venas|veneno|cloro|raticida|gas|arma|pistola|cuchillo|disparo|tren)\b/;
    // después de "ya tengo todo planeado": método o fecha
    if (S.planAmbTurn && S.turn - S.planAmbTurn <= 4 && F.ideation !== false && !RISKY.has(P) && !['LUGAR_PELIGRO','EMERGENCIA'].includes(P)) {
      if (METH_RE.test(t)) { P = 'PLAN'; S.flags.add('PLAN'); if (WHEN_RE.test(t)) { a.imminent = true; S.flags.add('PLAN_CON_FECHA'); } if (/\b(las|los|la|lo) tengo\b|\btengo (las|los|unas|unos|la|el)\b|\bguardad|\bescondid|\blistas?\b/.test(t) || /pastill|remedio|medicament/.test(t)) S.flags.add('MEDIOS_CERCA'); if (/pastill|remedio|medicament|clonazepam|ravotril|rivotril/.test(t)) S.flags.add('PLAN_PASTILLAS'); }
      else if (WHEN_RE.test(t) && a.toks.length <= 6) P = 'PLAN_CUANDO';
    }
    if (!RISKY.has(P) && S.flags.has('PLAN_PASTILLAS') && /\b(las|los) tengo\b|\btengo (guardadas|escondidas|listas)\b/.test(t)) { P = 'MEDIOS_CRISIS'; a.flags.push('MEDIOS'); }
    // "esta noche" después de una despedida o con ideación confirmada
    if (!RISKY.has(P) && lastQ !== 'cuando' && (S.flags.has('DESPEDIDA_EN_CRISIS') || F.ideation === true) && a.toks.length <= 6 && /^(es |sera |va a ser |lo hago |lo voy a hacer |pienso hacerlo )?(esta noche|hoy|hoy dia|ahora|ahora mismo|manana|pasado manana|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|este fin de semana|el fin de semana|en un rato|pronto)( en la noche)?$/.test(t)) { P = 'PLAN'; a.imminent = true; S.flags.add('PLAN_CON_FECHA'); S.planWhen = t.replace(/^(es|sera|va a ser|lo hago|lo voy a hacer|pienso hacerlo) /, ''); }
    // confirmación de despedida ("ya no las voy a necesitar")
    if (!RISKY.has(P) && S.used.has('despEnc') && /\bya no (lo|la|los|las|las voy|los voy) (voy a )?necesitar\b|\bno (lo|la|los|las) voy a necesitar\b|\bya no voy a necesitar\b|\bno voy a estar\b|\bya no voy a estar\b|\bcuando (ya )?no este\b|\bcuando me haya ido\b/.test(t)) P = 'DESPEDIDA_CONFIRMA';
    // ideación en el pasado ("antes pensaba en matarme pero ya no")
    if (P === 'IDEACION' && !a.imminent && F.ideation !== true && RANK[prevRisk] < 2 && /\b(antes|hace (tiempo|anos|mucho|un tiempo|un par de anos)|cuando (era|tenia|estaba)|de (chic[oa]|nin[oa])|el ano pasado|en el colegio|en la adolescencia)\b/.test(t) && /\b(pero )?ya no\b|\bahora (ya )?no\b|\bya (lo )?supere\b|\bya paso\b|\bahora estoy (bien|mejor)\b/.test(t) && !a.intents.some(k => ['PLAN','METODO','EMERGENCIA','AUTOLESION'].includes(k))) P = 'IDEACION_PASADA';
    // autolesión que aclara que no es para morir
    if (P === 'AUTOLESION' && /\bno (es|era|lo hago|lo hacia) (para|por) (matarme|morir|morirme|suicidarme|quitarme la vida)\b|\bno (quiero|busco) (morir|matarme|morirme)\b/.test(t)) { S.flags.add('AUTOLESION_SIN_IDEACION'); if (F.ideation === null) F.ideation = false; }
    // saludo inicial que el léxico toma por despedida o por nada
    if (S.turn <= 2 && !S.themes.size && RANK[S.risk] < 1 && /^(hola )?(buenas noches|buenas tardes|buenos dias|buen dia)( (como estas|que tal))?$/.test(t)) P = 'SALUDO';
    if (S.turn <= 3 && !S.themes.size && RANK[S.risk] < 1 && /^(hola )?(que onda|que tal|como estai|como estay|como estas|como te va|como andai|como andas|como va|que hay|que cuentas|que contai|como va todo)( weon)?$/.test(t)) P = 'SALUDO';
    // agradecer al llegar no es despedirse
    if (P === 'DESPEDIDA' && S.turn <= 1 && a.intents.includes('GRACIAS_TODO')) P = 'GRACIAS_INICIO';
    // presencia
    if (/^(responde|contesta|respondeme|contestame|responda|conteste|hola hola|alo alo|hay alguien|hay alguien ahi|hay alguien aca|hay alguien aqui)$/.test(t)) P = 'PRESENCIA';
    // otros idiomas y español limitado
    if (!RISKY.has(P) && /\b(no hablo (bien |mucho )?(el )?espanol|hablo poco espanol|mi espanol es (malo|poco|malito)|no se (hablar |escribir )?(bien )?(el )?espanol)\b/.test(t)) P = 'IDIOMA_LIMITADO';
    // preguntas sobre el bot
    if (!RISKY.has(P) && /\b(eres|eri|erai|sos) (muy |demasiado |re )?(robot|robotico|robotica|frio|fria|automatico)\b|\b(hablas|respondes|pareces|escribes) (como )?(un )?(robot|maquina|bot)\b/.test(t)) P = 'QUEJA_ROBOT';
    if (!RISKY.has(P) && /\bcomo sabes (lo que|que|eso|como)\b/.test(t)) P = 'COMO_SABES';
    if (/^(no )?(con )?(un |una )?(bot|robot|maquina|programa)$/.test(t) && S.turn > 1) P = 'HUMANO';
    // no quiere psicólogo; solo quiere desahogarse
    if (!RISKY.has(P) && !['HERIDA','EMERGENCIA','LUGAR_PELIGRO'].includes(P) && /\bno (quiero|voy a|pienso|necesito|me interesa) (hablar con|ir al|ir a|ir donde|que me atienda|ver a|ver al|ir a ver a) (un |una |el |la |ningun |ninguna |los |las )?(psicolog|psiquiatr|especialista|terapeuta|profesional)\w*/.test(t)) P = 'NO_PSICOLOGO';
    if (!RISKY.has(P) && /\b(quiero|queria|necesito|necesitaba) (desahogarme|desahogar|botar todo|sacar esto|sacarlo|soltar todo)\b/.test(t)) P = 'DESAHOGO';
    // preguntas generales, académicas y de privacidad
    if (['PASIVA','NADA','TEMA','PREGUNTA','TERCERO','DUELO_SUICIDIO','IDEACION_NEGADA'].includes(P) && /\b(trabajo|tarea|tesis|investigacion|disertacion|ensayo|informe|proyecto|presentacion|exposicion|charla) (sobre|de|acerca del?) (el |la )?(suicidio|prevencion|salud mental|depresion|autolesion|autolesiones)\b/.test(t) && !/\b(me quiero|quiero morir|pienso en (matarme|suicidarme)|me quiero matar)\b/.test(t)) P = 'ACADEMICO';
    if (!RISKY.has(P) && /\b(senales|signos|sintomas) de (alerta|riesgo|suicidio)\b|\bcomo (saber|se si|darse cuenta|me doy cuenta) si alguien (se quiere|quiere|esta pensando en|piensa en) (matar|suicid|morir|quitar)/.test(t)) P = 'FAQ_SENALES';
    if (['TERCERO','PREGUNTA','NADA','PASIVA'].includes(P) && /\b(que pasa|que hago|que hacer|que se hace|como ayudar|como ayudo|que se puede hacer) (si|cuando) (alguien|una persona|un amigo|una amiga|alguien cercano)\b/.test(t) && /\b(matar|suicid|morir|quitar|hacer dano)/.test(t) && !/\b(mi|yo)\b/.test(t)) P = 'PREG_AYUDA';
    if (!RISKY.has(P) && /\bcomo (puedo )?ayudar a (alguien|una persona|un amigo|una amiga)\b/.test(t) && !S.flags.has('TERCERO')) P = 'PREG_AYUDA';
    if (!RISKY.has(P) && S.turn <= 6 && !S.themes.size && RANK[S.risk] < 1 && /^(ok |ya |y |bueno )*(que|q) (tengo|tendria|debo|hay) que hacer( aqui| aca| ahora)?$|\bcomo (funciona|se usa) (esto|la pagina|el chat|esta pagina)\b|^que hago aqui$/.test(t)) P = 'FAQ_COMO';
    // buenas noticias
    if (!RISKY.has(P) && !/\bno\b/.test(t) && /\b(encontre (pega|trabajo|pololo|polola|depa|departamento|casa)|me contrataron|quede (en la|en el|seleccionad\w*)|aprobe|pase (el ramo|de curso|la prueba|el examen)|me titule|me gradue|lo logre|me dieron el alta|nacio mi|me aceptaron)\b/.test(t)) P = 'BUENA_NOTICIA';
    // distracción
    if (S.lastPrimary === 'ALGO_BONITO' && /^(otro|otra|otro mas|otra mas|cuentame otro|cuentame otra|dame otro|dame otra|mas|uno mas|otra cosa bonita|otro dato|otro mas porfa)( por favor)?$/.test(t)) P = 'ALGO_BONITO';
    if ((lastQ === 'tema' || lastQ === 'libre') && !RISKY.has(P) && /^(de )?(lo que sea|cualquier cosa|lo que quieras|tu elige|elige tu|no se tu|da igual|de todo)$/.test(t)) P = 'ALGO_BONITO';
    if (lastQ === 'libre' && !RISKY.has(P) && !a.themes.length && ['OFFTOPIC','NADA','PREGUNTA','POSITIVO'].includes(P) && /\b(futbol|partido|equipo|colo|catolica|musica|cancion|canciones|banda|serie|series|pelicula|peliculas|netflix|anime|juego|juegos|jugar|play|perro|perros|gato|gatos|animales|libro|libros|leer|dibujar|cocinar|bailar)\b/.test(t)) P = 'TEMA_LIBRE';
    // violencia en curso, maltrato laboral, control
    const violOther = /\b(pega|pego|pegaba|golpe\w*|viol\w*|abus\w*|toca|toco|tocaba|manose\w*|empuj\w*|ahorc\w*|amenaz\w*|cuchillo|arma|chantaj\w*|extorsion\w*|fotos)\b/.test(t.replace(/\b(la|mi|de|en la|sin) pega\b/g, ''));
    if (P === 'VIOLENCIA' && /\b(jefe|jefa|supervisor\w*|gerente|companer\w* de (trabajo|pega)|colega)\b/.test(t) && !/\bme (pega|pego|golpea|golpeo|toca|toco|manosea|viola|violo|abusa|abuso)\b|\bacos\w*/.test(t)) P = 'MALTRATO_LABORAL';
    if (!RISKY.has(P) && (/\b(jefe|jefa|supervisor\w*|gerente)\b/.test(t) || (S.themes.has('trabajo') && /\b(jefe|jefa)\b/.test(S.lastUser || ''))) && /\bme (humillo|humilla|grito|grita|insulto|insulta|trata mal|trato mal|ridiculizo|ridiculiza|denigra|denigro|basurea|basureo)\b/.test(t)) P = 'MALTRATO_LABORAL';
    if (P === 'VIOLENCIA' && /\b(pololo|polola|pareja|esposo|esposa|marido|novio|novia|ex)\b/.test(t) && /\b(revisa|revisaba|controla|no me deja|celos|celoso|celosa)\b/.test(t) && !violOther) P = 'CONTROL_PAREJA';
    if (['VIOLENCIA','NADA','TEMA','NO_LLAMAR'].includes(P) && !PAST_RE.test(t) && (P === 'VIOLENCIA' || S.track === 'violence' || /\b(esposo|marido|pareja|pololo|polola|ex|papa|mama|padrastro|madrastra|hermano|tio|novio|novia|conviviente)\b/.test(t)) && /\bme (quiere|quieren|va a|van a) (pegar|golpear|matar|ahorcar)\b|\bme (quiere|quieren) (pegarme|golpearme|matarme)\b|\besta (rompiendo|tirando|quebrando) (cosas|todo|la casa)\b|\bme esta (pegando|golpeando|amenazando|buscando)\b|\besta (golpeando|pateando) la puerta\b|\bquiere entrar\b|\bestoy encerrad[oa]\b|\bme encerre\b|\bme escondi\b/.test(t) && !/\b(nota|notas|prueba|ramo|examen|colegio|u|universidad|si se entera|cuando se entere|si sabe)\b/.test(t)) P = 'VIOLENCIA_AHORA';
    // otra persona se despide
    if (!RISKY.has(P) && P !== 'TERCERO_REDES' && /\b(me|nos) (mando|escribio|dejo|envio|dijo) (un |una )?(mensaje|carta|audio|nota|whatsapp|texto)( raro| como)?( de)? despedida\b|\bse (despidio|esta despidiendo) de (mi|todos|nosotros)\b|\bmensaje de despedida\b/.test(t) && /\b(mi|mis|un|una|el|la) (\w+)\b/.test(t) && !/\b(les|le) (mande|escribi|deje)\b/.test(t)) P = 'TERCERO_DESPEDIDA';
    // emergencia médica propia
    if (!RISKY.has(P) && P !== 'PANICO' && /\b(me duele|dolor (en|de)|presion en|apreton en|me aprieta|puntada en) (el |la )?pecho\b/.test(t) && !/\b(de (pena|tristeza|angustia)|el alma)\b/.test(t)) P = 'MEDICA_URG';
    if (!RISKY.has(P) && !F.emergency && /\b(vomito sangre|vomitando sangre|me estoy desmayando|me voy a desmayar|no siento (el brazo|la cara|las piernas)|se me (duerme|durmio) (el brazo|la cara)|no puedo hablar bien)\b/.test(t)) P = 'MEDICA_URG';
    // preguntas por altura o dosis disfrazadas
    if (!RISKY.has(P) && P !== 'EMERGENCIA' && (/\b(desde que|de que|cuantos?|que|a que) (piso|pisos|altura|metros)\b.*\b(muere|muero|morir|matarse|mata|matarte|matarme|sobrevive|sobrevivir|letal|mortal)\b/.test(t) || /\bsi (alguien |uno |una persona |me )?(salta|salto|se tira|me tiro|se lanza|me lanzo) (de|desde) .*\b(muere|muero|sobrevive)\b/.test(t))) P = 'METODO';
    // crianza: gritar a un hijo no es agredir
    if (P === 'AGRESOR' && !/\b(le pego|le pegue|lo golpeo|la golpeo|lo golpee|la golpee|lo zamarreo|la zamarreo|le doy correazos|le pego con|le pego a)\b/.test(t)) P = 'CRIANZA';
    if (!RISKY.has(P) && P !== 'AGRESOR' && /\b(le grito|les grito|le grite|les grite|lo reto|la reto|los reto)\b/.test(t) && /\b(hijo|hija|hijos|hijas|guagua|bebe|nino|nina|ninos)\b/.test(t + ' ' + (S.lastUser || ''))) P = 'CRIANZA';
    // romper cosas por rabia
    if (!RISKY.has(P) && /\b(rompi|quebre|tire|lance|reventé|revente) (un|una|el|la|mi|los|las|unos|unas|todo|todas|todos) ?(vaso|vasos|plato|platos|celular|telefono|puerta|vidrio|espejo|cosas|silla|mesa|tele|control|computador)?\b/.test(t) && /\b(vaso|vasos|plato|platos|celular|telefono|puerta|vidrio|espejo|cosas|silla|mesa|tele|control|computador|todo)\b/.test(t) && !/\b(tire (la|el|los|las) (pastillas|remedios|gillette|cuchillo|cuerda|soga))\b/.test(t)) P = 'ROMPER';
    // ayudante: no sabe qué hacer, secreto, menor de edad
    if ((S.track === 'helper' || S.flags.has('TERCERO_PREOCUPA')) && !RISKY.has(P) && /\bno se (que hacer|como (ayudarla|ayudarlo|ayudar|hablarle|decirle|acercarme|preguntarle))\b|\bque deberia hacer\b/.test(t)) P = 'HELPER_HOW';
    if ((S.track === 'helper' || S.flags.has('TERCERO')) && !RISKY.has(P) && /\b(no quiere que (le )?(cuente|diga|contara|dijera|sepa)|me pidio que no (le )?(contara|dijera|cuente|diga)|me hizo prometer|es un secreto|le prometi|que no le diga a nadie)\b/.test(t)) P = 'HELPER_SECRETO';
    if ((S.track === 'helper' || S.flags.has('TERCERO')) && !RISKY.has(P) && !['HELPER_SECRETO','HELPER_HOW'].includes(P)) { const mA = t.match(/\b(tiene|cumple|cumplio) (\d{1,2})( anos)?\b/); if (mA && +mA[2] < 18 && +mA[2] >= 5) P = 'TERCERO_MENOR'; }
    // en violencia: "lo quiero", "no quiero denunciarlo"
    if (S.track === 'violence' && !RISKY.has(P) && /^(pero )?(lo|la) (quiero|amo)( mucho)?$|\b(lo|la) (quiero|amo) (igual|mucho)\b|\bpero (lo|la) (quiero|amo)\b/.test(t)) P = 'VIOL_AMOR';
    if (S.track === 'violence' && !RISKY.has(P) && /\bno (quiero|voy a|puedo) (denunciarlo|denunciarla|denunciarlos|denunciar|hacerle la denuncia|poner la denuncia)\b|\bno (lo|la) (quiero|voy a) denunciar\b/.test(t)) P = 'NO_DENUNCIA';
    // broma que deja de serlo
    if (S.flags.has('BROMA') && !RISKY.has(P) && /^(bueno |pero |la verdad |igual |en verdad )?(no tanto|no del todo|igual no|no era tanto|no es tan broma|no era tan broma|un poco en serio|medio en serio|en serio|es en serio|era en serio)$/.test(t)) P = 'RETRACTA_BROMA';
    // calle, ubicación y batería
    if ((crisisMode0() || S.flags.has('SUSTANCIAS')) && !RISKY.has(P) && /\b(no se donde (estoy|ando)|^no se donde$|estoy perdid[oa]|no se como llegue|no reconozco donde)\b/.test(t)) P = 'PERDIDO';
    if (!RISKY.has(P) && /\b(no tengo|me queda poca|poca|sin|se me acaba la|se me va a acabar la|me estoy quedando sin) (bateria|carga)\b|\bse me (va a apagar|apaga|esta apagando) el (celu|celular|telefono)\b/.test(t)) P = 'BATERIA';
    // número suelto: posible edad
    if (P === 'GIBBERISH' && /^\d{1,2}$/.test(t) && +t >= 8 && !F.emergency && !/cuant/.test(S.lastBot || '')) { S.pendingAge = +t; P = 'EDAD_NUM'; }
    // la persona responde con su nombre de mascota más tarde
    if (S.flags.has('MASCOTA') && !RISKY.has(P) && /\bse llama(ba)? [a-z]+/.test(t) && !S.used.has('petNameDone')) P = 'PET_NAME';
    // dolor de cabeza tras golpes
    if (!RISKY.has(P) && S.flags.has('AUTOLESION') && /cabeza|cabezazo/.test((S.lastUser || '') + ' ' + t + ' ' + (S.flagsText || '')) && /\bme duele (la cabeza|mucho la cabeza|harto)\b|\bestoy mareado|estoy mareada|me mareo\b/.test(t)) P = 'DOLOR_CABEZA';
    if (a.intents.includes('AUTOLESION') && /cabezazo|cabesazo|contra la pared|en la cabeza/.test(t)) S.flagsText = 'cabezazo';
    // seguimiento de emergencias de otra persona
    if (S.flags.has('EMERG_OTRO') && S.turn - (S.emergOtroTurn || 0) <= 6 && S.turn > (S.emergOtroTurn || 0) && !RISKY.has(P) && !['EMERGENCIA_OTRO','DESPEDIDA','GRACIAS','DESPEDIDA_RIESGO','REVELA_PROPIO'].includes(P)) P = 'EMERG_OTRO_SEG';
    if (S.flags.has('TERCERO_URGENTE') && S.turn - (S.tercUrgTurn || 0) <= 6 && S.turn > (S.tercUrgTurn || 0) && !RISKY.has(P) && !['TERCERO','TERCERO_DESPEDIDA','DESPEDIDA','GRACIAS','HELPER_CALMA','REVELA_PROPIO','HELPER_SECRETO','HELPER_HOW'].includes(P)) P = 'TERCERO_URG_SEG';
    /* ── reinterpretaciones (tercera revisión: conversaciones reales) ── */
    { const pm = personIn(t); if (pm) { S.lastPerson = pm; S.lastPersonTurn = S.turn; } }
    if (a.flags.includes('MEDIOS') || /\b(pastill|remedio|pildora|medicament|clonazepam|ravotril|rivotril|cuchill|gillette|gilette|navaja|cuchilla|cutter|cuerda|soga|pistola|arma|revolver|veneno|cloro|raticida)/.test(t)) S.meansText = ((S.meansText || '') + ' ' + t).slice(-200);
    const pendT = S.pending && S.pending.type;
    if (F.emergency && F.called !== true && !RISKY.has(P) && (P === 'MEDICO' || /^(como |unas? |unos |mas de |casi |por lo menos |fueron |eran )?(\d+|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta|muchas|hartas|todas|toda la caja|todo el frasco|la caja entera|el frasco entero)( pastillas| pastis| remedios| pildoras)?( de \w+)?$/.test(t) || /^(de |eran |fueron |son )?(clonazepam|ravotril|rivotril|alprazolam|sertralina|fluoxetina|quetiapina|zopiclona|zolpidem|paracetamol|ibuprofeno|aspirina|litio|diazepam|lorazepam|escitalopram|trazodona)\w*$/.test(t))) P = 'EMERG_DETALLE';
    if (F.emergency && F.called !== true && !RISKY.has(P) && !a.intents.includes('NO_LLAMAR') && /\b(no se si (llamar|llamo)|debo llamar|tengo que llamar|sera necesario|hay que llamar|vale la pena llamar|llamo o no|es necesario llamar)\b/.test(t)) P = 'EMERG_LLAMAR';
    if (!RISKY.has(P) && (S.themes.has('duelo') || S.flags.has('DUELO_SUICIDIO')) && /\b(irme|ir) con (el|ella|ellos|mi \w+)\b|\b(irme|ir) (a )?donde (esta|estan) (el|ella|ellos)\b|\b(estar|reunirme|encontrarme|juntarme) con (el|ella) (de nuevo|otra vez|pronto|alla|arriba)\b|\breunirme con (el|ella)\b|\b(quiero|quisiera|ganas de|pienso en|deseo) seguir(lo|la)\b/.test(t)) P = 'DUELO_IRSE';
    if (a.intents.includes('EN_SERIO') && !RISKY.has(P)) {
      if (pendT === 'ideacion') { P = 'NADA'; a.answer = 'yes'; }
      else if (S.flags.has('IDEACION_HUMOR') || S.flags.has('HIPERBOLE') || ['IDEACION_HUMOR','BROMA','IDEACION_HIPERBOLE','BROMA_BOT'].includes(S.lastPrimary)) { P = 'IDEACION'; a.flags.push('IDEACION'); bump('high'); }
      else if (['NADA','BROMA','EN_SERIO'].includes(P)) P = 'EN_SERIO';
    }
    if (P === 'BROMA' && /\bmentira\b/.test(t) && a.themes.length && !/\b(es|era|fue) (broma|mentira|chiste)\b/.test(t)) { P = 'TEMA'; S.verdad = S.turn; }
    if (S.lastPrimary === 'OFFTOPIC' && !RISKY.has(P) && /^(por favor|please|plis|dale|ya po|hazlo|hazla|ayudame|si por favor)( por favor| po)?$/.test(t)) P = 'OFFTOPIC_INSISTE';
    if (!RISKY.has(P) && S.searching && S.mode === 'normal' && /^(y|y entonces|y ahora|y que|entonces|y que paso|que paso|y que pasa|y el especialista|y la especialista|y el psicologo|y la psicologa)$/.test(t)) P = 'ESPERA';
    if (!RISKY.has(P) && /^(quiero |necesito |busco |dame |pasame |prefiero )?(con |hablar con )?(un |una |a un |a una )?(psicolog[oa]|psiquiatra|especialista|terapeuta|profesional|doctor|doctora|persona real|alguien real|humano|persona de verdad|alguien de verdad)( por favor| po)?$/.test(t)) P = 'HUMANO';
    if (!RISKY.has(P) && S.turn > 3 && /^(y )?(tu |usted )?(como estas|como estai|como estay|como te va|como andas|como andai)( tu| usted)?$/.test(t)) P = 'PERSONAL_BOT';
    if (!RISKY.has(P) && ['PREGUNTA','AYUDA','NADA'].includes(P) && /^(hola )?(me )?(puedes|podrias|podi|puedi|pueden|podrian|puede|podria) ayudar(me)?( con algo| por favor| po)?$/.test(t)) P = 'AYUDA_PREGUNTA';
    if (!RISKY.has(P) && /\b(con que|en que) (cosas |tipo de cosas )?(me )?(ayudas|ayudan|puedes ayudar|me puedes ayudar|sirves|sirve esto)\b|\bque tipo de (ayuda|cosas)\b|\bque (cosas )?(haces|hacen) (aqui|aca)\b|\bpara que (es|sirve) esto\b/.test(t)) P = 'FAQ_QUE';
    if (/^(sexo|quiero sexo|hagamos sexo|tengamos sexo|hablemos de sexo|sexting)$/.test(t)) P = 'SEXUAL';
    if (P === 'SALUDO' && a.intents.includes('OTRO_IDIOMA')) P = 'OTRO_IDIOMA';
    if (P === 'PRESENCIA' && S.turn <= 2 && !S.themes.size && RANK[S.risk] < 1 && !S.used.has('presIni')) P = 'PRESENCIA_INICIO';
    if (pendT === 'ideacion' && P === 'NO_LO_HARIA') P = 'NADA';
    if (!RISKY.has(P) && S.turn > 1 && /^(hola )?(volvi|ya volvi|aqui estoy de nuevo|hola de nuevo|de nuevo yo|soy yo de nuevo|regrese|aqui de nuevo|otra vez yo)$/.test(t)) P = 'VOLVIO';
    if (['BROMA','NADA'].includes(P) && S.lastPrimary === 'POSITIVO' && /^(mentira|no mentira|era mentira|mentira no estoy bien|no es verdad|no es cierto|no estoy bien)$/.test(t)) P = 'VERDAD_MAL';
    if (!RISKY.has(P) && (S.track === 'violence' || S.flags.has('VIOLENCIA')) && /\b(subir|publicar|mostrar|pasar|difundir|mandar) (mis |unas |las )?(fotos|videos|foto|video)\b|\bfotos mias\b/.test(t)) P = 'VIOLENCIA';
    if (P === 'TEMA' && ['ayudo','razon','persona'].includes(lastQ) && a.toks.length <= 4 && /^(si,? )?(a |con )?(mi|mis) \w+$/.test(t)) P = 'NADA';
    if (P === 'VIOL_MIEDO' && /\bno me (crea|crean|cree|creen|va a creer|van a creer|vaya a creer|vayan a creer)\b/.test(t)) P = 'NADA';
    if (P === 'POSITIVO' && /^(ta|esta|ya esta|ok esta|bueno esta|ah esta|oka esta) bien$/.test(t)) { P = 'NADA'; a.answer = 'ack'; }
    if (P === 'DANO_OTROS' && (a.laugh || a.intents.includes('BROMA')) && /\b(hermano chico|hermana chica|hermanit[oa]|mi hermano|mi hermana|mi mama|mi papa|mi profe|mi jefe|mi jefa|mi polola|mi pololo|mi primo|mi prima|ese weon|esa weona)\b/.test(t) && !/\b(cuchillo|arma|pistola|en serio|de verdad|veneno)\b/.test(t)) P = 'DANO_BROMA';
    if (!RISKY.has(P) && /\b(subio|publico|puso|posteo|escribio|mando|dejo) (una |un )?(historia|post|estado|publicacion|mensaje|tweet|video|carta|audio)\b.*\b(despid\w*|despedida|adios)\b|\b(historia|post|estado|publicacion|mensaje) (de )?despedida\b/.test(t) && /\b(mi|mis|un|una|el|la) \w+\b/.test(t) && !/\b(les|le) (mande|escribi|deje)\b/.test(t)) P = 'TERCERO_DESPEDIDA';
    if (/\b(metro|anden|estacion|tren|linea|vias|puente|edificio|azotea|techo|balcon|ventana|acantilado|cerro)\b/.test(t) && /\b(quiero|voy a|ganas de|me dan ganas de|pienso|estoy pensando en|me quiero|tentad[oa] de|se me pasa por la cabeza) (saltar|tirarme|lanzarme|botarme|tirar)\b/.test(t)) P = 'LUGAR_PELIGRO';
    if (lastQ === 'postresp' && !RISKY.has(P) && a.toks.length <= 6 && ['NADA','TEMA','POSITIVO','MINIMIZA','GRACIAS'].includes(P)) P = 'POST_RESP';
    if (/^(prefiero |mejor )?(conversar|hablar|que conversemos|conversemos)$/.test(t) && !RISKY.has(P)) P = 'CONVERSAR';
    if (!RISKY.has(P) && S.searching && pendT !== 'busco' && /^(ok |ya |bueno |dale )?(espero|esperare|te espero|lo espero|la espero|aqui espero|voy a esperar)$/.test(t)) P = 'ESPERA_OK';
    if (!RISKY.has(P) && ['NADA','PREGUNTA','TEMA','AYUDA'].includes(P) && !a.themes.length && /^(es que |bueno |hola |oye )?(me pasa|me paso|me esta pasando|me sucede) algo$|^(quiero|queria|necesito|puedo) (contarte|decirte|contar|decir|hablar de) algo$|^(tengo|tengo un) (un )?problema$|^te (quiero|queria) (contar|decir) algo$|^puedo (hablar contigo|contarte algo|decirte algo)$/.test(t)) P = 'QUIERE_CONTAR';
    if (!RISKY.has(P) && a.toks.length <= 6 && /^(estoy |ando |sigo )?(con|junto a|junto con) (mi|mis) \w+( en (la|mi) casa)?$/.test(t)) P = 'COMPANIA';
    if (!RISKY.has(P) && ['NADA','TEMA'].includes(P) && /^(estoy |ando |sigo )?en (mi|la|el|un|una) (pieza|casa|cama|bano|living|cocina|patio|colegio|liceo|trabajo|pega|calle|auto|micro|metro|plaza|parque|depto|departamento|universidad|carrete|fiesta|junta|bar|disco)( sol[oa]| encerrad[oa])?$/.test(t)) P = 'UBICACION';
    if (S.track === 'helper' && !RISKY.has(P) && /^(esta|estan|ahora esta|se fue a|se encerro en) (en )?(su|la|el) (pieza|casa|cama|bano|colegio|trabajo|pega)\b/.test(t)) P = 'TERCERO_UBIC';
    if (!RISKY.has(P) && ['NADA','TEMA','POSITIVO','MINIMIZA'].includes(P) && pendT !== 'safe' && pendT !== 'safev' && /\b(estoy|me siento) (a salvo|segur[oa])\b/.test(t) && !/\bno (estoy|me siento)\b/.test(t) && (S.track === 'violence' || crisisMode0() || RANK[S.risk] >= 2)) P = 'SEGURO_AHORA';
    if (!RISKY.has(P) && S.flags.has('LUGAR_PELIGRO') && !S.alejado && /\b(me baje|ya baje|baje|me aleje|ya me aleje|estoy abajo|me fui de ahi|sali de ahi|me sali|me entre|ya entre|estoy adentro|me sente|me devolvi|volvi a (la|mi) (casa|pieza)|ya no estoy (ahi|arriba|en el borde|en el puente|en la azotea))\b/.test(t)) P = 'ALEJADO';
    if (!RISKY.has(P) && /\b(no quiero que me (internen|encierren|hospitalicen|lleven al psiquiatrico|manden al psiquiatrico)|me van a (internar|encerrar|hospitalizar)|me (internan|encierran)|miedo (a|de) que me (internen|encierren|hospitalicen)|no me quiero internar)\b/.test(t)) P = 'MIEDO_INTERNACION';
    if (!RISKY.has(P) && (crisisMode0() || RANK[S.risk] >= 1) && /\bpor (mis|mi) (hijos|hijas|hijo|hija|nietos|nieta|nieto|papas|viejos|mama|papa|familia|hermanos|hermana|hermano|perro|perrita|gato|gata|mascota|pareja|polola|pololo|abuela|abuelo)\b|\bno (le|les) (podria|puedo|haria) (hacer )?eso a (mi|mis) \w+|\b(mis|mi) (hijos|hija|hijo|mama|papa|familia|perro|gato) me (mantiene|mantienen|sostiene|sostienen|dan fuerza|da fuerza)\b/.test(t)) P = 'RAZON_VIVIR';
    if (!RISKY.has(P) && ['TEMA','NADA'].includes(P) && a.toks.length <= 5 && !['persona','ayudo','razon'].includes(lastQ) && !['with','contact'].includes(pendT) && /^(es |es por |se trata de |es sobre |por )?(mi|mis) (mama|papa|hermano|hermana|hermanos|amigo|amiga|amigos|amigas|pareja|polola|pololo|abuela|abuelo|tia|tio|prima|primo|esposa|esposo|marido|hijo|hija|hijos|hijas|vecino|vecina|jefe|jefa|profe|familia|papas|viejos|vieja|viejo)$/.test(t)) P = 'SOBRE_PERSONA';
    if (!RISKY.has(P) && (S.themes.has('posparto') || a.themes.includes('posparto')) && (P === 'ENTUMECIDO' || /\bno siento (nada|amor|carino) (por|hacia) (ella|el|mi guagua|mi bebe|mi hij[oa]|la guagua|el bebe)\b|\bno me nace (quererla|quererlo)\b/.test(t))) P = 'POSPARTO_VINCULO';
    if (['BROMA_BOT','FAQ_PROTOCOLO','PREG_SUICIDIO','NOTICIA_SUICIDIO','CORRIGE','PANICO','MED_NORMAL','IDEACION_HIPERBOLE','MASCOTA','DOLOR_GOLPE','GOLPE_PARED','IDEACION_PASADA','ACADEMICO','FAQ_SENALES','PREG_AYUDA','CRIANZA','MALTRATO_LABORAL','MEDICA_URG','ROMPER'].includes(P)) { S.risk = prevRisk; a.flags = a.flags.filter(f => !['IDEACION','DANO_OTROS','PASIVA','INMINENTE','METODO','PLAN','AUTOLESION','MEDIOS'].includes(f)); if (P === 'IDEACION_HIPERBOLE') S.flags.add('HIPERBOLE'); }
    const ownRisk = RISKY.has(P) || ['PASIVA','IDEACION_NEGADA','INTENTO_PREVIO','LUGAR_PELIGRO','IDEACION_HUMOR'].includes(P);
    a.flags.forEach(f => { if (f !== 'INMINENTE' || ownRisk) S.flags.add(f); });
    if (a.imminent && ownRisk) urgent = true;
    if (a.flags.includes('MEDIOS') && riskCtx) urgent = true;
    // hechos
    const before = Object.assign({}, F);
    const ch = extractFacts(a);
    for (const k in ch) F[k] = ch[k];
    if (ch.refusedCall || ch.cantCall) S.flags.add('NO_PUEDE_LLAMAR');
    if (F.alone === true) S.flags.add('SOLO');
    if ((F.ideation === true || S.track === 'suicide') && ch.alone === true && before.alone !== true && P === 'TEMA' && a.themes.every(x => x === 'soledad')) P = 'NADA';
    { const mN = t.match(/\b(?:soy|me llamo|mi nombre es|aqui)\s+([a-z]+)\b/); if (mN && NAMES.has(mN[1]) && !S.name) S.name = ({maria:'María',sofia:'Sofía',matias:'Matías',tomas:'Tomás',martin:'Martín',joaquin:'Joaquín',sebastian:'Sebastián',nicolas:'Nicolás',ivan:'Iván',hector:'Héctor',monica:'Mónica',belen:'Belén',raul:'Raúl',agustin:'Agustín',bastian:'Bastián',fabian:'Fabián',cristobal:'Cristóbal',lucia:'Lucía',rene:'René',simon:'Simón',oscar:'Óscar',hernan:'Hernán',cristian:'Cristián',ines:'Inés',andres:'Andrés',jose:'José',anais:'Anaís',veronica:'Verónica',barbara:'Bárbara',alvaro:'Álvaro',maximo:'Máximo',damian:'Damián',ramon:'Ramón',ruben:'Rubén',angela:'Ángela',victor:'Víctor',joaquina:'Joaquina'})[mN[1]] || (mN[1].charAt(0).toUpperCase() + mN[1].slice(1)); }
    const repeated = a.norm && a.toks.length >= 3 && a.norm === S.last; S.last = a.norm;
    if ((a.themes.length && !/^FAQ_/.test(P)) || a.risk !== 'low') S.distress++;
    const crisisMode = () => F.ideation === true || S.track === 'suicide';
    const long = a.toks.length >= 9;
    const pend = S.pending; S.pending = null;
    if (lastQ === 'estado' && !/\?/.test(String(a.raw)) && a.toks.length && !['SALUDO','PRESENCIA','NO_ENTIENDO','SILENCIO','GIBBERISH','REPETIR','ES_BOT','FAQ_QUE','FAQ_CONF','FAQ_COSTO','PERSONAL_BOT'].includes(P)) S.estadoKnown = true;
    if (a.themes.length || ['POSITIVO','MINIMIZA','TEMA','NO_AGUANTO','PASIVA','IDEACION'].includes(P)) S.estadoKnown = true;
    S.themeAt = S.themeAt || {}; a.themes.forEach(x => { S.themeAt[x] = S.turn; });
    S.minimal = (P === 'NADA' && a.toks.length <= 2 && /^(no se|nose|nc|x|ok|si|no|mm|ya|nada|na|no c|ns|sip|nop|tal vez|puede ser|quizas)$/.test(t)) ? (S.minimal || 0) + 1 : 0;
    let asked = null;             // tipo de la pregunta hecha en este turno
    let answered = false;
    let deferQ = false;           // hay una pregunta importante sin responder
    const frustrated = a.intents.includes('YA_DIJE') || a.intents.includes('QUEJA') || a.intents.includes('INSULTO');

    if (RISKY.has(P) || a.intents.some(i => RISKY.has(i)) || ['LUGAR_PELIGRO','EMERGENCIA','IDEACION_HUMOR','PASIVA','DESPEDIDA_RIESGO','INTENTO_PREVIO','VOCES','VOCES_AHORA','DESPEDIDA_OCULTA','DECISION_RIESGO','EMERGENCIA_OTRO','LO_HICE','MEDIOS_CRISIS','AGRESOR'].includes(P)) S.ground = 0;
    let groundPause = 0;
    /* modo especialista humano: solo se registra */
    if (S.mode === 'humano') return finish(true);

    /* ejercicio 5-4-3-2-1 en curso: solo avanza cuando la persona nombra cosas */
    if (S.ground && !['TERCERO','AYUDA','ESPERA','NO_LLAMAR','YA_LLAME'].includes(P)) {
      const n = S.ground, raw0 = String(a.raw || '');
      if (P === 'GROUNDING') { S.ground = 5; say('Empecemos de nuevo, con calma.'); say('Escríbeme 5 cosas que veas a tu alrededor.'); return finish(); }
      if (/^(para|basta|stop|ya basta|no|nop|no quiero|no puedo|no me sirve|nica|ni ahi|ni cagando|paso|nah|na|no gracias|lo dejamos aqui|prefiero conversar|mejor conversemos|conversemos)$/.test(t) || /\b(no quiero seguir|dejemoslo|lo dejamos|dejemos|no me sirve|no quiero hacerlo|no tengo ganas|prefiero conversar|prefiero hablar)\b/.test(t)) { S.ground = 0; say('Está bien, lo dejamos aquí. No hay una forma correcta de hacerlo.'); next(); return finish(); }
      if (/^(sigamos|sigo|dale|ya|ok|si|bueno|vamos|listo|ya po|ok sigamos|si sigamos|bueno sigamos|ya sigamos|sigamos con el ejercicio)$/.test(t)) { say(`Bien. Escríbeme ${GROUND_PENDING[n]}.`); return finish(); }
      if (P === 'POSITIVO' && n < 5 && !S.used.has('gpos') && !/,/.test(raw0)) { S.used.add('gpos'); say('Qué bueno leer eso.'); ask('¿Seguimos con el ejercicio o lo dejamos aquí?', 'gcont', ['Sigamos','Lo dejamos aquí']); return finish(); }
      const pregunta = /\?/.test(raw0) || /^(y |pero |ok |ya )?(con |por )?(cual|cuales|como|donde|cuantas|cuantos|para que|por que)\b/.test(t) || /^(y )?que (pongo|escribo|hago|tengo que|cosas|digo|cuento)\b/.test(t);
      const sobreEjercicio = /\b(empiez\w*|empez\w*|parto|partir|escribo|pongo|hago|cosas|cual|cuales|como|ejercicio|sirve|entiendo|tengo que|ejemplo|cuantas|cuantos)\b/.test(t);
      if (P === 'NO_ENTIENDO' || /\b(no entiendo el ejercicio|para que sirve)\b/.test(t) || (pregunta && sobreEjercicio)) {
        if (!S.used.has('gexpl')) { S.used.add('gexpl'); say('Es un ejercicio para volver al presente: vas nombrando cosas que notas con los sentidos, sin pensarlo mucho. Puedes partir por la que quieras; no hay respuestas malas.'); }
        else say('Puedes partir por la que quieras; no hay respuestas malas.');
        say(`Por ejemplo: ${GROUND_EX[n]}. Ahora escríbeme ${GROUND_PENDING[n]}.`);
        return finish();
      }
      if (/^(nada|no se|nose|ninguna|ninguno|no veo nada|no escucho nada|no siento nada|no se me ocurre nada)$/.test(t) && !S.used.has('ghint:' + n)) { S.used.add('ghint:' + n); say('Está bien si cuesta. Puede ser algo muy simple, como la pared, tus manos o el ruido de la calle.'); say(`Inténtalo: ${GROUND_PENDING[n]}.`); return finish(); }
      const side = (pregunta || (SPECIFIC.has(P) && !['GRACIAS','NADIE','DISCULPA','SILENCIO','HERIDA','NO_SE_DECIR','RESPIRAR','MINIMIZA'].includes(P))) && !['TEMA','NADA','POSITIVO'].includes(P);
      // ¿nombró cosas? (una lista, o algo corto y neutro)
      const items = raw0.toLowerCase().split(/,|;|\n|\s+y\s+|\s+e\s+|\//).map(x => x.trim()).filter(Boolean);
      const seps = items.length >= 2 && items.filter(x => x.split(/\s+/).length <= 4).length >= Math.ceil(items.length * 0.6) ? items.length - 1 : 0;
      const arts0 = (t.match(/\b(el|la|los|las|un|una|unos|unas|mi|mis|tu|tus)\b/g) || []).length, arts = a.toks.length <= arts0 * 2 + 1 ? arts0 : 0;
      const siente = /\b(me siento|siento que|estoy|no puedo|no quiero|me cuesta|me duele|me late|me ahogo|me falta|tengo (miedo|pena|rabia|angustia|ganas|ansiedad)|me da (miedo|pena|rabia|angustia)|no me sirve|no funciona|no resulta|sigo (mal|igual)|llorando|lloro|angusti\w*|ansios\w*|alterad[oa]|nervios\w*|asustad[oa]|desesperad[oa]|mal|peor)\b/.test(t);
      const lista = !pregunta && (seps >= 1 || arts >= 2 || (n === 1 && a.toks.length >= 2) || (!siente && a.toks.length <= 6 && !a.themes.length && ['NADA','RISA','GIBBERISH'].includes(P)));
      if (side) groundPause = n;
      else if (!lista && a.toks.length >= 7 && (a.themes.length || ['TEMA','PASIVA'].includes(P))) { S.ground = 0; S.used.add('groundInterrumpido'); }
      else if (!lista && (siente || a.themes.length || ['TEMA','PASIVA','NADIE','QUEJA','HERIDA'].includes(P))) {
        // lo que siente va primero: se acoge sin avanzar el ejercicio
        if (/\b(no puedo respirar|me ahogo|me falta el aire|me late|taquicardia|el corazon)\b/.test(t)) { S.ground = 0; say('Te leo. Cuando falta el aire, ayuda más respirar lento primero.'); ask('¿Quieres que respiremos juntos ahora?', 'respirar', ['Respirar juntos','Ahora no']); return finish(); }
        say(pick(['Te leo. Tiene sentido sentirse así, y por eso vamos lento.','Gracias por decírmelo. Es normal que cueste; este ejercicio ayuda a que baje de a poco.','Está bien sentirse así mientras lo hacemos. Sin apuro.'],'gfeel'));
        if (!S.used.has('gfeelQ')) { S.used.add('gfeelQ'); ask(`¿Seguimos? Puede ser con lo primero que ${n === 5 ? 'veas' : n === 4 ? 'toques' : n === 3 ? 'escuches' : 'se te ocurra'}, aunque sea una cosa. O, si prefieres, lo dejamos y conversamos.`, 'gcont', ['Sigamos','Prefiero conversar']); return finish(); }
        say(`Cuando puedas, escríbeme ${GROUND_PENDING[n]}, aunque sea una.`); return finish();
      }
      else {
        const emo = siente || a.themes.some(x => ['animo','ansiedad','soledad','culpa','rabia','autoestima','verguenza','sueno'].includes(x));
        if (emo && n > 1) { say(pick(['Te leo. Sigamos un poquito más; esto ayuda a bajar la intensidad de a poco.','Está bien sentir eso mientras lo hacemos. Sigamos de a poco.'],'groundEmo')); say(GROUND[n].replace(/^(Bien|Muy bien|Vas bien)\. (\w)/, (m, x, c) => c.toUpperCase())); }
        else if (n === 1 && /\b(mejor|bien|tranquil)/.test(t) && !/\bno\b/.test(t)) say('Bien hecho. Lo hiciste completo, y me alegra leer que te sientes un poco mejor.');
        else if (n === 1 && (emo || /\b(nada|ninguna|fracaso|no hay|no se me ocurre|no tengo)\b/.test(t))) say('Entiendo que hoy cueste encontrar algo bueno. Igual llegaste hasta el final, y eso no es poco.');
        else say(GROUND[n]);
        S.ground = n > 1 ? n - 1 : 0;
        if (!S.ground && !(/\b(mejor|bien|tranquil)/.test(t) && !/\bno\b/.test(t))) { ask('¿Cómo te sientes ahora, aunque sea un poquito distinto?', 'estado', ['Un poco mejor','Igual','Peor']); }
        return finish();
      }
    }

    /* la persona no quiere hablar: presencia sin preguntas */
    if (P === 'NO_HABLAR') S.quiet = S.turn;
    else if (S.quiet && (RISKY.has(P) || a.themes.length || a.toks.length >= 5 || ['PASIVA','AYUDA','TERCERO','HUMANO','ESPERA','PREGUNTA','MEDIOS_CRISIS','RETRACTA','VOCES','VOCES_AHORA','DESPEDIDA_OCULTA','DECISION','DECISION_RIESGO','EMERGENCIA_OTRO','LO_HICE','AGRESOR','DISOCIACION'].includes(P) || /\?/.test(String(a.raw)))) S.quiet = 0;
    if (S.quiet && S.quiet < S.turn && !(pend && IMPORTANT.has(pend.type) && crisisMode())) {
      if (P === 'DESPEDIDA') say(closing()); else say(pick(['Aquí sigo.','Ok. Aquí estoy si quieres escribir.','Te leo, sin apuro.','Sigo aquí, sin presionarte.'],'quiet'));
      if (pend) S.pending = pend;
      return finish();
    }

    /* respuesta a una pregunta pendiente */
    if (pend && !RISKY.has(P) && P !== 'TERCERO' && P !== 'LUGAR_PELIGRO' && (!SPECIFIC.has(P) || ['YA_DIJE','MINIMIZA'].includes(P) || (P==='NADIE' && ['with','contact'].includes(pend.type)) || (P==='NO_LLAMAR' && ['contact','llamo131'].includes(pend.type)) || (P==='YA_LLAME' && pend.type==='llamo131'))) {
      if (P === 'YA_DIJE' && a.answer) say('Perdona, tienes razón.');
      answered = handleAnswer(pend);
      if (!answered && P === 'YA_DIJE') out.length = 0;
    }
    if (!answered && before.safe === true && !RISKY.has(P) && /\b(no estoy a salvo|no estoy segur[oa]|te menti|era mentira|mentira,? no estoy)\b/.test(t)) { F.safe = null; answered = handleAnswer({ type:'safe' }, 'no'); }
    if (!answered && pend) {
      if (IMPORTANT.has(pend.type) && !RISKY.has(P) && P !== 'EMERGENCIA' && stillNeeded(pend)) { if ((pend.tries||0) < (LIMIT[pend.type]||0)) deferQ = true; else dropPending(pend); }
      else if (['with','contact'].includes(pend.type)) S.asked[pend.type] = (S.asked[pend.type]||0);
    }
    if (!answered && S.ideaNoTurn && S.turn - S.ideaNoTurn <= 2 && F.ideation === false && /\b(a veces si|bueno si|la verdad si|en verdad si|si a veces|a veces lo pienso|mentira si)\b/.test(t)) { F.ideation = null; answered = handleAnswer({ type:'ideacion' }); }
    if (!answered && ch.alone === false && before.alone !== false && !RISKY.has(P) && ['TEMA','NADA','POSITIVO'].includes(P) && crisisMode()) { const d0 = deferQ; deferQ = false; answered = handleAnswer({ type:'with' }); if (!answered) deferQ = d0; else if (asked) deferQ = false; }
    if (!answered && (S.flags.has('RAZON') || lastQ === 'razon') && crisisMode() && a.toks.length <= 6 && /\b(mi|mis) (perro|perrita|perrito|gato|gata|gatito|mascota|hijo|hija|hijos|hijas|mama|papa|familia|hermano|hermana|hermanos|abuela|abuelo|pareja|polola|pololo|amigos|amiga|amigo|sobrino|sobrina)\b/.test(t) && !RISKY.has(P)) {
      const who = ((t.match(/\b(mi|mis) (\w+)/) || [])[0] || '').replace(/^mi /,'tu ').replace(/^mis /,'tus ');
      say(`${who.charAt(0).toUpperCase() + who.slice(1)}. Eso importa mucho; guárdalo cerca estos días.`); S.flags.add('RAZONES'); crisisNext(); answered = true;
    }
    if (!answered) act();
    if (groundPause && S.ground && !asked && !urgent) say(S.used.has('gres:' + S.ground) ? `Te espero con ${GROUND_PENDING[S.ground]}, sin apuro.` : `Y cuando quieras, seguimos con el ejercicio: escríbeme ${GROUND_PENDING[S.ground]}.`), S.used.add('gres:' + S.ground);
    if (deferQ && !asked && stillNeeded(pend) && !frustrated) reask(pend);
    else if (deferQ && frustrated && pend) { pend.tries = (pend.tries||0) + 1; if (!asked) S.pending = pend; }
    return finish();

    /* ── manejo de respuestas ── */
    function handleAnswer(p, forced){
      let ans = forced || a.answer;
      const type = p.type;
      if (ans === 'ack') ans = type === 'means' ? (/^(listo|ya esta)$/.test(t) ? 'yes' : 'commit') : ['ejercicio','busco','especialista','respirar'].includes(type) ? 'yes' : null;
      if (type === 'contact' && /\bya le (escribi|mande|hable|dije|conte|avise)\b/.test(t)) { F.someone = true; say('Qué bueno que le escribiste. Mientras responde, aquí sigo contigo.'); next(true); return true; }
      if (type==='with' && /^(yo )?vivo con (mi|mis) \w+/.test(t) && ch.alone === undefined) { const w = tildes(t.match(/\b(mi|mis) (\w+)/)[0].replace(/^mi /,'tu ').replace(/^mis /,'tus ')); ask(`¿${w.charAt(0).toUpperCase() + w.slice(1)} ${/^tus /.test(w) ? 'están' : 'está'} en la casa ahora?`, 'with', CHIPS.with, p.tries); return true; }
      if (type==='with' && /\b(carrete|fiesta|junta|con amigos|con mis amigos|con gente|hay gente|con mi familia|con mi pololo|con mi polola)\b/.test(t) && !/\bno\b/.test(t)) ans = 'yes';
      if ((type==='with' || type==='contact') && (ch.alone === true || ch.someone === false || /^(no|nop|nadie|sola|solo|estoy sola|estoy solo|no tengo|no hay)$/.test(t) || /\b(no hay nadie|no tengo a nadie|no tengo a quien|nadie)\b/.test(t))) ans = 'no';
      else if ((type==='with' || type==='contact') && (ch.alone === false || /^(si,? )?(mi|mis) \w+/.test(t))) ans = ans || 'yes';
      if (type==='safe' && ch.safe !== undefined) ans = ch.safe ? 'yes' : 'no';
      if (type==='means' && /\b(no tengo nada|no hay nada|nada cerca)\b/.test(t)) ans = 'nothing';
      if (type==='means' && (ch.meansAway || /\b(ya lo hice|listo|ya esta|lo hice|ya (la|las|los) (deje|guarde|bote|tire|saque|aleje|escondi|entregue|pase))\b/.test(t))) ans = 'yes';
      if (type==='means' && !ch.meansAway && /\b(aqui|aca|al lado|conmigo|en mi velador|en el velador|en la mano|en mis manos|debajo|en mi pieza|en el cajon|en mi mochila|en la cartera|las tengo|los tengo|la tengo|lo tengo)\b/.test(t) && !/\b(deje|guarde|bote|tire|saque|aleje|escondi|lejos|otra pieza)\b/.test(t)) ans = 'near';
      if (type==='means' && /\bno lo he hecho\b|\bno me he (cortado|hecho dano)\b|\btodavia no lo hago\b/.test(t) && S.flags.has('GANAS_AUTOLESION')) ans = 'notyet';
      if (type==='means' && /\b(no tengo a nadie|a nadie|no hay nadie|nadie)\b/.test(t) && !/\b(no quiero|no voy)\b/.test(t)) { F.someone = false; ans = 'nadie'; }
      if (type==='means' && /\b(no quiero|no voy)\b/.test(t)) ans = 'no';
      if (type==='means' && !ans && /\b(son|es) (de )?(mi|mis) \w+|\b(las|los|la|el) de (mi|mis) \w+|^(son|es) mi(a|o|as|os)$/.test(t)) ans = 'owner';
      if (['ejercicio','busco','especialista','respirar'].includes(type) && !ans && /^(ok |ya |dale |bueno |si )?(espero|esperare|te espero|lo espero|por favor|ya po|dale|bueno ya|ok ya|dale ya|ok dale|ya dale|si por favor|hagamoslo|vamos|ya bueno|ya ok)$/.test(t)) ans = 'yes';
      if (['ejercicio','busco','especialista'].includes(type) && /^(nada|nah|na|no gracias|paso|no quiero|no ahora|ahora no|despues|mas rato)$/.test(t)) ans = 'no';
      if (type==='llamo131' && (/\b(ya llame|llame|vienen|viene|en camino)\b/.test(t) || P === 'YA_LLAME')) ans = 'yes';
      if (type==='llamo131' && /\b(no puedo|no tengo)\b/.test(t)) ans = 'no';
      if (type==='alejarse' && /\b(me aleje|ya me aleje|me baje|ya baje|me sente|estoy abajo|ya entre|entre|estoy adentro|ya estoy adentro|me entre|cerre la ventana|me fui de ahi|sali de ahi|me sali)\b/.test(t)) ans = 'yes';
      if (type==='alejarse' && /\bno estoy (en el|arriba|cerca)\b/.test(t)) ans = 'yes';
      else if (ans === 'no' && ['alejarse','llamo131','means','ejercicio','busco','especialista'].includes(type) && /^no (estoy|soy|me siento|era|es|fue|se)\b/.test(t) && !/\b(puedo|quiero|voy|alcanzo|me atrevo)\b/.test(t)) ans = null;
      if (type==='safe' && !ans && LOC.test(t)) {
        const place = (t.match(LOC)||[])[0];
        const ART = { pieza:'tu pieza', casa:'tu casa', bano:'el baño', cama:'tu cama', trabajo:'el trabajo', pega:'la pega', colegio:'el colegio', liceo:'el liceo', universidad:'la universidad', calle:'la calle', auto:'el auto', micro:'la micro', metro:'el metro', plaza:'una plaza', parque:'un parque', departamento:'tu departamento', depto:'tu depto', hospital:'el hospital', living:'el living', cocina:'la cocina', patio:'el patio' };
        say(`Ok, estás en ${ART[place] || place}.`);
        ask('¿Ahí estás a salvo, sin nada a mano con lo que te puedas hacer daño?', 'safe', CHIPS.safe, p.tries);
        return true;
      }
      if (!forced) {
        const em = String(a.raw).trim();
        if (/^(👍|👌|✅)+[\ufe0f\s]*$/u.test(em)) ans = 'yes'; else if (/^(👎|❌|🙅)+[\u200d\u2640\u2642\ufe0f\s]*$/u.test(em)) ans = 'no'; else if (/^🤷[\u200d\u2640\u2642\ufe0f\s]*$/u.test(em)) ans = 'unsure';
        if (ans === 'unsure' && ['ideacion','safe','safev'].includes(type) && a.toks.length > 2 && !/^(no se|no lo se|ni idea|no sabria( decir)?|a veces|tal vez|quizas|quiza|puede ser|mas o menos|no estoy (tan )?segur[oa]|algo asi|depende|capaz|si y no|un poco|creo|no se po|no se la verdad|la verdad no se|a ratos|de repente|aveces|no se si|no se bien|no se igual)\b/.test(a.toks.filter(w => !LAUGH.test(w)).join(' '))) ans = null;
        if (ans === 'unsure' && /\bno se (que hacer|que decir|como|por que|donde|si voy a)\b/.test(t)) ans = null;
        if (ans === 'unsure' && /^no se (que|como|por que|porque|donde|cuando|cuanto|cuanta|cuantos|cuantas|quien|cual|pa que|para que) \w+/.test(t) && !/no s[eé]\s*[,.;]/i.test(String(a.raw))) ans = null;
        if ((type === 'safe' || type === 'safev') && a.intents.includes('IDEACION_NEGADA')) ans = null;
        if (type === 'safev' && /\b(esta durmiendo|se durmio|ahora no esta|no esta|salio|se fue|no esta aca|no esta en la casa|esta trabajando|estoy en (otra parte|la casa de|el colegio|el trabajo|la pega))\b/.test(t)) ans = 'yes';
        if (type === 'safe' && /^(hoy|ahora) si$/.test(t)) ans = 'yes';
        const tNL = a.toks.filter(w => !LAUGH.test(w)).join(' ');
        const DENY_IDEA = /^(no+|nop|nope|nah|na|nunca|jamas|para nada|nada que ver|no no|claro que no|obvio que no|creo que no|no creo|no tanto|no no tanto|no nunca|no jamas|no he pensado( en eso)?|no lo he pensado|no se me ha pasado|no me ha pasado|no no lo haria|no lo haria|no eso no|no gracias a dios|no por suerte|no tranqui|no tranquila|no tranquilo|ni ahi|ni cagando|nica|cero|no po|no nada|no la verdad|la verdad no)( po)?$/;
        const improved = type === 'ideacion' && !ans && /\b(ahora|ya) (estoy )?(mejor|bien)\b/.test(t) && !/\bpero\b/.test(t);
        if (improved) ans = 'no';
        if (type === 'ideacion' && /\b(es|era) (una |solo una |solo )?pregunta\b|\bsolo (preguntaba|pregunto)\b|\bpor saber\b|\b(por|pura) curiosidad\b/.test(t)) ans = 'no';
        else if (type === 'ideacion' && /^no (tanto |mucho )?pero\b/.test(t) && /\b(a veces|igual|si|lo pienso|aparece|aparecen|pasa)\b/.test(t)) ans = 'unsure';
        else if (ans === 'no' && type === 'ideacion' && !improved) { const tl = a.toks.filter(w => !LAUGH.test(w)); const tj = tl.join(' '); if (tl.length > 2 && !DENY_IDEA.test(tj) && !/^(no pero|no no|nah|na|nop|nope|nunca|jamas|nica|cero)\b/.test(tj)) ans = null; }
        if (ans === 'no' && type === 'safe' && a.toks.length > 2 && ch.safe !== false && !/^(no se|no lo se|no estoy|no mucho|no tanto|no realmente|no creo|la verdad no|creo que no|para nada|no la verdad|no no|no po|no puedo mas|no aguanto)\b/.test(t)) ans = null;
        if (ans === 'yes' && (type === 'safe' || type === 'safev') && /\b(miedo|asustad[oa]|me va a|viene|me busca|me sigue|peligro|me pega|me esta)\b/.test(t)) ans = 'unsure';
        if (ans === 'yes' && type === 'means' && (ch.alone !== undefined || /\b(solo|sola|en la casa|en mi casa|en mi pieza)\b/.test(t)) && !/\b(lo hice|ya lo|listo|guarde|deje|bote|tire|aleje|saque)\b/.test(t)) ans = null;
        if (type === 'means' && /\b(no (quiero|voy a|lo voy a|lo quiero|la quiero|la voy a) (soltarlo|soltarla|dejarlo|dejarla|soltar|botarlo|botarla|alejarlo|alejarla)|no lo suelto|no la suelto)\b/.test(t)) ans = 'no';
      }
      if (['ideacion','autoles'].includes(type)) {
        const core = a.toks.filter(w => !LAUGH.test(w) && !['weon','po','cachai','oye','pues','bueno','mira','igual','la','verdad','eh','em','mm','mmm','uf','ay','pucha','osea'].includes(w)).join(' ');
        if (!ans && /^(si|sip|si po|obvio|claro|si si)$/.test(core)) ans = 'yes';
        if (!ans && /^(algo|un poco|un poquito|poco|a ratos|de repente|de vez en cuando|ultimamente|algo de eso|algo asi|si un poco|como que si|un poco si|algunas veces|aveces|una vez|una que otra vez|ya no tanto|ya no mucho|menos|menos que antes|un poco menos|no tanto como antes)$/.test(core)) ans = 'unsure';
        if (!ans && /^(harto|mucho|bastante|seguido|muy seguido|todos los dias|siempre|a cada rato|constantemente|todo el tiempo|todo el rato|cada vez mas|cada dia|todas las noches|demasiado)$/.test(core)) ans = 'yes';
        if ((!ans || ans === 'unsure') && !/^(no|nunca|jamas|tampoco)\b/.test(core) && /\b(se me (ha )?pasa(do)? por la (cabeza|mente)|lo (he )?pensado|lo pienso|lo pense|pienso en eso|lo he considerado|lo considero|me ha pasado|me pasa|lo he sentido)\b/.test(core)) ans = 'yes';
        if (type === 'ideacion' && !ans && a.intents.includes('NO_LO_HARIA') && !/\b(no (lo )?he pensado|nunca (lo )?he pensado|no pienso en eso|no se me ha pasado)\b/.test(t)) ans = 'sinplan';
      }
      if (!ans && !['pregsui','arma','matarIdiom'].includes(type)) return false;
      switch (type) {
        case 'ideacion':
          if (ans==='yes' || ans==='unsure' || ans==='sinplan') {
            bump('high'); S.flags.add('IDEACION'); F.ideation = true; S.ideaDone = true; setTrack('suicide'); showCrisis = true; crisisRes(); startSearch = true;
            if (ans === 'sinplan') { S.flags.add('SIN_PLAN'); say('Gracias por contármelo. Entonces esos pensamientos aparecen, aunque no tengas un plan. Igual pesan, y es importante que no los cargues sin apoyo.'); }
            else say(pick(['Gracias por responderme con honestidad. Lo que sientes es importante y tiene ayuda.','Gracias por decírmelo. Es valiente reconocerlo.'],'yes1'));
            say(pick(['Ya avisé con prioridad a un especialista. No te voy a dejar con esto sin apoyo.','El especialista ya tiene tu caso como prioritario.'],'yes2'));
            next();
          } else { F.ideation = false; S.ideaNoTurn = S.turn; if (S.lastPrimary === 'FAQ_PROTOCOLO' || /\b(no es para mi|es (una |solo una )?pregunta|solo (preguntaba|pregunto)|por saber|curiosidad)\b/.test(t)) { if (S.riskPreFaq) { S.risk = S.riskPreFaq; S.riskPreFaq = null; } say('Entiendo, gracias por aclararlo. Si alguna vez te pasa a ti o a alguien cercano, aquí estoy.'); wrapUp(); return true; } say(pick(['Me alegra leer eso. Igual lo que sientes importa, y aquí estoy para escucharte.','Qué bueno. Gracias por responderme.'],'ideaNo')); if (S.leaving) say(closing()); else if (S.used.has('despEnc') && !S.used.has('despEncQ')) { S.used.add('despEncQ'); ask('Me quedé pensando en lo que dijiste de no molestar más. ¿Qué quisiste decir con eso?', 'open'); } else next(true); }
          return true;
        case 'safe':
          if (ans==='no' || ans==='unsure') {
            F.safe = false; S.flags.add('NO_SEGURO'); urgent = true; showCrisis = true; crisisRes(); bump('high'); setTrack('suicide');
            say('Gracias por decírmelo. Lo más importante ahora es que no pases esto sin compañía.');
            const who = personIn(t); if (who) { F.someone = true; say(`Si puedes, escríbele a ${who} ahora y dile que no estás bien; no tienes que dar detalles.`); }
            const c = callLine('urgent'); if (c) say(c);
            next();
          } else { F.safe = true; S.safeTurn = S.turn; say(pick(['Me alegra que estés en un lugar seguro. Sigo aquí contigo mientras llega el especialista.','Bien, me alivia leer eso.'],'safeY')); if (S.leaving) say(closing()); else next(); }
          return true;
        case 'means':
          if (ans==='commit') { const mo = meansObj(); say('Gracias. Hazlo con calma; aquí te espero.'); ask(`¿Me avisas cuando ${mo.pl ? (mo.fem ? 'las' : 'los') : (mo.fem ? 'la' : 'lo')} hayas dejado lejos?`, 'means', ['Ya lo hice','No puedo'], (p.tries||0)); return true; }
          if (ans==='owner') { const who = personIn(t), mo = meansObj(); say(who ? `Entiendo, ${mo.son} de ${who}.` : 'Entiendo.'); ask(who ? `¿Puedes dejar${mo.cl} en otra pieza, o pedirle${/^tus /.test(who) ? 's' : ''} a ${who} que ${mo.cl2} guarde${/^tus /.test(who) ? 'n' : ''}?` : `¿Puedes dejar${mo.cl} en otra pieza mientras conversamos?`, 'means', CHIPS.means, (p.tries||0)); return true; }
          if (ans==='yes') { F.meansAway = true; say('Bien hecho. Eso es muy importante y te cuida.'); }
          else if (ans==='nothing') { F.meansAway = true; say('Ok, bien.'); }
          else if (ans==='near') { S.flags.add('MEDIOS_CERCA'); urgent = true; say('Gracias por decírmelo.'); ask((mo => `¿Puedes llevar${mo.cl} ahora a otra pieza, o pasárse${mo.cl} a alguien de confianza? Yo te espero aquí.`)(meansObj()), 'means', ['Ya lo hice','No puedo'], (p.tries||0)); return true; }
          else if (ans==='notyet') { say('Qué bueno que no lo hayas hecho. Eso habla de una parte tuya que se está cuidando.'); ask('¿Puedes dejar lejos lo que usarías, aunque sea en otra pieza, mientras conversamos?', 'means', CHIPS.means, (p.tries||0)); return true; }
          else if (ans==='nadie') { say('Entonces quedémonos aquí: en este momento no estás sin compañía.'); ask('Y sobre lo que te pedí: ¿pudiste dejar lejos lo que te podría hacer daño?', 'means', CHIPS.means, (p.tries||0) + 1); return true; }
          else if (ans==='no') { const mo = meansObj(); F.meansAway = false; S.flags.add('MEDIOS');
            if (S.flags.has('MEDIOS_CERCA') && !S.used.has('meansHR')) { S.used.add('meansHR'); urgent = true; say(/\b(soltar|en la mano)/.test(t + ' ' + S.lastBot) ? 'Entiendo que ahora no quieras soltarlo, y no te voy a retar.' : 'Entiendo que ahora te cueste, y no te voy a retar.'); ask(/\b(soltar|en la mano)/.test(t + ' ' + S.lastBot) ? '¿Podrías al menos dejarlo sobre una mesa o en el suelo, lejos de tu mano, mientras conversamos?' : `¿Podrías al menos dejar${mo.cl} un poco más lejos, aunque sea al otro lado de la pieza, mientras conversamos?`, 'means', ['Ya lo dejé','No puedo']); return true; }
            say(`Te entiendo, no te voy a obligar. Si en algún momento puedes, aunque sea dejar${mo.cl} en otra pieza ayuda mucho.`); }
          else return false;
          next(); return true;
        case 'with':
          if (ans==='yes') {
            F.alone = false;
            if (/durm/.test(t)) { const w = personIn(t), pl = w && /^tus /.test(w); say('Qué bueno que no estés sin compañía.'); ask(w ? `¿Podrías despertar a ${w} y decirle${pl ? 's' : ''} que no estás bien? No tienes que dar${pl ? 'les' : 'le'} detalles.` : '¿Podrías despertar a esa persona y decirle que no estás bien? No tienes que darle detalles.', 'despertar', ['Sí, voy', pl ? 'No quiero despertarlos' : 'No quiero despertarla']); return true; }
            if (S.used.has('malviaje')) { say('Qué bueno que no estés sin compañía. Pídele a alguien de confianza que se quede contigo en un lugar más tranquilo, lejos del ruido, hasta que se te pase.'); return true; }
            { const wq = personIn(t); say(wq ? `Qué bueno que ${wq} ${/^tus /.test(wq) ? 'estén' : 'esté'} cerca. Si puedes, acércate y cuéntale${/^tus /.test(wq) ? 's' : ''} que no te estás sintiendo bien; no tienes que dar detalles.` : 'Qué bueno que haya alguien contigo. Si puedes, acércate a esa persona y cuéntale que no te estás sintiendo bien; no tienes que dar detalles.'); }
            say('Yo sigo aquí.'); return true;
          }
          if (ans==='no' || ans==='unsure') { F.alone = true; S.flags.add('SOLO'); say(F.emergency ? 'Entiendo.' : 'Entiendo. Me quedo aquí contigo mientras llega el especialista.'); next(); return true; }
          return false;
        case 'contact':
          if (ans==='yes') { F.someone = true; say('Escríbele ahora, aunque sea un mensaje corto como "no estoy bien, ¿puedes hablar?". Yo sigo aquí.'); S.lastQ = 'open'; return true; }
          if (ans==='no' || ans==='unsure') { F.someone = false; say('Está bien. Entonces quedémonos aquí; en este momento no estás sin compañía.'); const c = callLine('soft'); if (c) say(c); next(); return true; }
          return false;
        case 'third':
          if (ans==='yes' || ans==='unsure') { urgent = true; if (ans === 'yes') S.thirdDanger = true; showCrisis = true; crisisRes(['133']); say('Si está en peligro ahora, llama al 131 (SAMU) o al 133. No la dejes sola y, si es seguro hacerlo, retira lo que pueda usar para hacerse daño.'); say('El especialista ya fue alertado.'); S.lastQ = 'open'; }
          else { say('Bien. Lo más útil es hablarle directo y sin juzgar: preguntarle cómo está y si ha pensado en hacerse daño. Preguntarlo no le mete la idea en la cabeza.'); ask((F.refusedCall ? '' : 'Tú también puedes llamar al *4141 para que te orienten. ') + '¿Y tú cómo estás con todo esto?', 'estado'); }
          return true;
        case 'safev':
          S.safevDone = true;
          if (ans==='yes') { say('Bien. Lo importante ahora es que sigas a salvo.'); ask('¿Esto pasa seguido?', 'open'); return true; }
          if (ans==='no' || ans==='unsure') { urgent = true; S.flags.add('NO_SEGURO');
            if (/\bno tengo (a )?donde (ir|irme|quedarme)\b|\bno tengo (otro lugar|a quien ir|a donde arrancar)\b/.test(t)) { say('Entiendo que sientas que no tienes a dónde ir. Hay redes que pueden ayudarte a encontrar un lugar seguro, de forma confidencial: ' + (S.minor ? 'el 147 (Fono Niños) y el 1515 te orientan.' : 'el 1455 y el 149 te orientan.')); say('Si estás en peligro ahora, llama al 133. Yo sigo aquí.'); }
            else if (S.used.has('safevNo')) { say('Tu seguridad es lo primero. Si puedes, sal de ahí o enciérrate en una pieza con tu celular.'); say('El 133 responde a cualquier hora si esa persona te está haciendo daño. Yo sigo aquí.'); }
            else { say('Si puedes, ve a un lugar donde esa persona no pueda llegar: donde un vecino, un familiar o una amistad.'); say('Si estás en peligro ahora, llama al 133. Yo sigo aquí.'); }
            S.used.add('safevNo'); S.lastQ = 'open'; return true; }
          return false;
        case 'techo':
          if (ans==='yes') { say('Qué bueno que tengas dónde quedarte esta noche.'); next(true); return true; }
          if (ans==='no' || ans==='unsure') { S.flags.add('SIN_VIVIENDA'); say('Eso es importante, y se lo dejo anotado al especialista para que te ayude a buscar dónde quedarte.'); say('Si esta noche estás en la calle y corres peligro, llama al 133.'); next(); return true; }
          return false;
        case 'edad': {
          const n = S.pendingAge; S.pendingAge = null;
          if (ans === 'yes' || ans === 'ack') { if (n < 18) { S.minor = true; S.flags.add('MENOR'); S.resources.add('1515'); S.used.add('menor'); say('Gracias por contármelo.'); say('A tu edad pueden pasar cosas muy difíciles, y está muy bien pedir ayuda. También existe el 1515 (Línea Libre), una línea especial para jóvenes, gratis.'); } else say('Gracias por contármelo.'); next(true); return true; }
          if (ans === 'no') { say('Ah, perdona, entendí mal.'); ask('¿Qué me querías decir?', 'open'); return true; }
          return false; }
        case 'respirar':
          if (ans === 'yes' || ans === 'ack') { out.push({ type:'breath' }); S.sug.exercise++; S.lastQ = 'postresp'; return true; }
          if (ans === 'no') { say('Está bien. Aquí sigo contigo mientras pasa.'); next(true); return true; }
          return false;
        case 'arma':
          if (/\b(no|para nada|nunca|tranqui)\b/.test(t) && !/\b(no se)\b/.test(t) && ans !== 'yes') { say('Gracias por aclararlo. Igual, si en algún momento te sientes muy mal, lo más seguro es que quede guardada con llave y lejos de ti.'); next(true); return true; }
          if (/\b(otra persona|a alguien|a el|a ella|matarlo|matarla)\b/.test(t)) { S.flags.add('DANO_OTROS'); bump('high'); urgent = true; say('Gracias por decírmelo con honestidad. Si sientes que puedes hacerle daño a alguien, aléjate del arma y de esa persona ahora, y llama al 133 o al 131.'); say('Ya avisé con prioridad a un especialista.'); S.lastQ = 'open'; return true; }
          if (ans === 'yes' || ans === 'unsure' || /\b(a mi|si|no se)\b/.test(t)) { S.flags.add('IDEACION'); S.flags.add('MEDIOS_CERCA'); F.ideation = true; setTrack('suicide'); bump('high'); urgent = true; showCrisis = true; crisisRes(); startSearch = true; say('Gracias por decírmelo. Me importa mucho que estés a salvo.'); F.meansAway = null; S.asked.means = 0; ask(S.flags.has('ARMA_FUEGO') ? '¿Puedes dejar el arma lejos de ti ahora, con llave o con alguien de confianza?' : (S.flags.has('MEDIO_FEM') ? '¿Puedes dejarla lejos de ti ahora, en otra pieza o con alguien de confianza?' : '¿Puedes dejarlo lejos de ti ahora, en otra pieza o con alguien de confianza?'), 'means', CHIPS.means); return true; }
          return false;
        case 'lugarcheck':
          if (ans === 'no') { say('Ok, gracias por decírmelo. Igual, si en algún momento te sientes mal estando ahí, aléjate del borde y escríbeme.'); next(true); return true; }
          return false;
        case 'matarIdiom':
          if (/\b(enojar|enoja|retar|reta|castig)\w*/.test(t) || ans === 'no') { say('Entiendo. Igual da miedo enfrentarlo. A veces ayuda contarlo con calma y pensando antes qué decir.'); next(true); return true; }
          return false;
        case 'pregsui':
          if (/\b(mi|yo)\b/.test(t) && !/\b(alguien|amig|herman|mama|papa|pareja|hij)/.test(t) || ans === 'yes') { S.askedIdeation = true; say('Gracias por decírmelo. Me importa saber cómo estás tú.'); ask('¿Has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); return true; }
          if (/\b(alguien|amig|herman|mama|papa|pareja|hij|cercan|conocid)/.test(t)) { setTrack('helper'); S.flags.add('TERCERO_PREOCUPA'); say('Qué bueno que te preocupes por esa persona.'); ask('¿Qué has notado en ella que te preocupa?', 'open'); return true; }
          if (/\b(curiosidad|nada|por saber|nomas|no mas|solo)\b/.test(t) || ans === 'no') { if (S.riskPreFaq) { S.risk = S.riskPreFaq; S.riskPreFaq = null; } say('Está bien. Si en algún momento te toca de cerca, aquí estoy para conversarlo.'); next(true); return true; }
          return false;
        case 'autoles':
          S.autolesDone = true;
          if (ans === 'yes' || ans === 'unsure') { S.flags.add('AUTOLESION'); bump('high'); setTrack('suicide'); showCrisis = true; crisisRes(); say('Gracias por la confianza de decírmelo. No te voy a juzgar, y ya avisé con prioridad a un especialista.'); if (F.safe === null) ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe); else next(); return true; }
          if (ans === 'no') { say('Me alegra leer eso. Cuidar esas marcas también es una forma de cuidarte.'); next(true); return true; }
          return false;
        case 'busco':
          if (ans==='yes') { startSearch = true; say('Listo, ya lo pedí.'); ask('Mientras llega, ¿quieres contarme qué está pasando?', 'open'); }
          else { say('Está bien. Si cambias de opinión, solo dímelo.'); next(true); }
          return true;
        case 'ejercicio':
          if (ans==='yes') { S.ground = 5; say('Bien. Vamos de a poco, sin apuro.'); say('Mira a tu alrededor y escríbeme 5 cosas que puedas ver.'); return true; }
          if (ans==='no') { say('Está bien. Entonces conversemos.'); ask('¿Qué es lo más difícil en este momento?', 'open', CHIPS.calm); return true; }
          return false;
        case 'llamo131':
          if (ans==='yes') { F.called = true; say('Hiciste muy bien.'); say('Mientras llega la ayuda, quédate donde puedan encontrarte; si puedes, deja la puerta sin llave y no tomes nada más. Yo sigo aquí contigo.'); S.lastQ = 'open'; return true; }
          if (ans==='no') {
            S.n.no131 = (S.n.no131||0) + 1;
            if (S.n.no131 === 1 && F.alone !== true) { say('Entonces pídele a alguien cerca que llame por ti, o golpea la puerta de un vecino. Es importante que te vea un médico.'); ask('¿Hay alguien cerca a quien puedas avisarle?', 'with', CHIPS.with); return true; }
            if (S.n.no131 === 1) { say('Está bien. Si puedes, deja la puerta sin llave y quédate en un lugar donde te puedan encontrar.'); say('El especialista ya tiene tu caso con prioridad máxima. Si en algún momento puedes marcar el 131, hazlo, aunque no alcances a hablar.'); S.lastQ = 'open'; S.pending = null; return true; }
            F.called = 'no_puede'; say('Te entiendo. No me voy a ir de aquí.'); say('Quédate donde te puedan encontrar y no tomes nada más. El especialista ya está avisado con prioridad máxima.'); S.lastQ = 'open'; S.pending = null; return true;
          }
          return false;
        case 'alejarse':
          if (ans==='yes') { S.alejado = true; say('Qué alivio leer eso. Gracias por hacerlo; no es poco. Si puedes, siéntate y respira lento.'); if (F.safe === null || F.safe === 'sin_respuesta') { F.safe = null; ask('Ahora que te alejaste, ¿estás en un lugar seguro, sin nada a mano con lo que te puedas hacer daño?', 'safe', CHIPS.safe); } else next(); return true; }
          if (ans==='no') { urgent = true;
            if (noCall() || S.used.has('alejNo')) { say('Te entiendo. Entonces quédate conmigo: siéntate en el suelo si puedes, agárrate de algo firme y respira lento.'); say('Si pasa alguien cerca, pídele que se quede contigo. El especialista ya tiene tu caso con prioridad máxima.'); }
            else { say('Entiendo que ahora no quieras moverte, y no te voy a apurar. Te pido algo más pequeño: siéntate donde estás, aunque sea un paso más lejos del borde.'); say('Y si puedes, llama al 133 o al 131 y deja la llamada abierta. Yo sigo aquí contigo.'); S.used.add('alejNo'); ask('¿Puedes sentarte, un poco más lejos del borde?', 'alejarse', ['Ya me senté','No puedo'], (p.tries||0)); return true; }
            S.used.add('alejNo'); return true; }
          return false;
        case 'especialista':
          if (ans==='yes') { say('Bien. Ya está avisado.'); next(true); return true; }
          if (ans==='no') { say('Está bien. Igual queda avisado por si cambias de opinión, y aquí estoy.'); next(true); return true; }
          return false;
        default: return false;
      }
    }
    function stillNeeded(p){
      if ((S.asked[p.type]||0) >= (MAXASK[p.type]||9)) return false;
      if (p.type === 'safe') return F.safe === null;
      if (p.type === 'ideacion') return F.ideation === null || F.ideation === 'sin_respuesta' ? F.ideation === null : false;
      if (p.type === 'means') return F.meansAway === null;
      if (p.type === 'llamo131') return !F.called;
      if (p.type === 'with') return F.alone === null;
      if (p.type === 'alejarse') return !S.alejado;
      if (p.type === 'autoles') return !S.autolesDone;
      if (p.type === 'safev') return !S.safevDone && (S.asked.safev||0) < 2;
      return true;
    }
    function dropPending(p){
      if (p.type === 'safe' && F.safe === null) { F.safe = 'sin_respuesta'; S.flags.add('SIN_RESPUESTA_SEGURIDAD'); }
      if (p.type === 'ideacion' && F.ideation === null) F.ideation = 'sin_respuesta';
      if (p.type === 'means' && F.meansAway === null) F.meansAway = 'sin_respuesta';
      if (p.type === 'llamo131' && !F.called) F.called = 'sin_respuesta';
      if (p.type === 'safev') S.safevDone = true;
    }
    function tryReask(p){ if (!p || !stillNeeded(p) || (p.tries||0) >= (LIMIT[p.type]||0)) return false; reask(p); return true; }
    function reask(p){
      const tries = (p.tries||0) + 1;
      if (REASK[p.type]) { const v = REASK[p.type]; const q = v.find(x => !isPrevQ(x) && !inRecent(x) && !S.used.has('rq:' + x)) || v.find(x => !isPrevQ(x) && !inRecent(x)) || v.find(x => !isPrevQ(x)) || v[0]; S.used.add('rq:' + q); return ask(q, p.type, CHIPS[p.type] || CHIPS.safe, tries); }
      if (p.type === 'safe') ask(pick(['Y volviendo a lo importante: ¿estás en un lugar seguro en este momento?','Necesito saberlo para cuidarte: ¿ahora mismo estás a salvo?'],'reS'), 'safe', CHIPS.safe, tries);
      else if (p.type === 'ideacion') ask(pick(['Y sobre lo que te pregunté recién: ¿has tenido pensamientos de quitarte la vida?','Te lo vuelvo a preguntar porque es importante: ¿has pensado en quitarte la vida?'],'reI'), 'ideacion', CHIPS.ideacion, tries);
      else if (p.type === 'means') ask('Y sobre lo que te pedí: ¿pudiste alejar lo que te podría hacer daño?', 'means', CHIPS.means, tries);
      else if (p.type === 'llamo131') ask('¿Pudiste llamar al 131, o hay alguien llamando por ti?', 'llamo131', CHIPS.llamo131, tries);
      else if (p.type === 'alejarse') ask('¿Pudiste alejarte del borde?', 'alejarse', CHIPS.alejarse, tries);
      else if (p.type === 'third') ask('¿Esa persona está en peligro en este momento?', 'third', CHIPS.third, tries);
      else if (p.type === 'with') ask('Te preguntaba si hay alguien contigo en este momento. ¿Estás con alguien?', 'with', CHIPS.with, tries);
    }

    /* ── utilidades de composición ── */
    function say(x){ if (x) out.push(x); }
    function reflectP(){
      for (let i = 0; i < REFLECT_P.length; i++) {
        const r = REFLECT_P[i];
        if (S.used.has('rp' + i) || !r.re.test(t) || (r.when && !r.when(S, t))) continue;
        S.used.add('rp' + i);
        const x = pick(r.s, 'rps' + i); say(typeof x === 'function' ? x(t, S) : x);
        return r;
      }
      return null;
    }
    function meansObj(){
      const src = (S.meansText || '') + ' ' + t;
      if (/pastill|pildora|pastis/.test(src)) return { cl:'las', cl2:'se las', noun:'las pastillas', son:'son', pl:true, fem:true };
      if (/remedio|medicament|clonazepam|ravotril|rivotril/.test(src)) return { cl:'los', cl2:'se los', noun:'los remedios', son:'son', pl:true, fem:false };
      if (/cuchill|cutter|cortaplum/.test(src)) return { cl:'lo', cl2:'se lo', noun:'el cuchillo', son:'es', pl:false, fem:false };
      if (/gillette|gilette|hoja|navaja|cuchilla/.test(src)) return { cl:'la', cl2:'se la', noun: /navaja/.test(src) ? 'la navaja' : 'la hoja', son:'es', pl:false, fem:true };
      if (/cuerda|soga/.test(src)) return { cl:'la', cl2:'se la', noun:'la cuerda', son:'es', pl:false, fem:true };
      if (/pistola|arma|revolver|escopeta/.test(src)) return { cl:'la', cl2:'se la', noun:'el arma', son:'es', pl:false, fem:true };
      return { cl:'lo', cl2:'se lo', noun:'eso', son:'es', pl:false, fem:false };
    }
    function noCall(){ return F.refusedCall || F.cantCall; }
    function isPrevQ(x){ return !!S.prevQ && (x === S.prevQ || x.endsWith(S.prevQ)); }
    function inRecent(x){ return (S.recent || []).some(r => r === x || r.endsWith(x)); }
    function ask(q, type, ch, tries){
      if (deferQ && !(type && IMPORTANT.has(type))) return;   // hay una pregunta más importante pendiente
      if (groundPause && S.ground && !(type && IMPORTANT.has(type))) return;   // seguimos con el ejercicio después
      if (asked) return;
      if (inRecent(q) || (isPrevQ(q) && S.prevTurn === S.turn - 1)) {
        if (type && REASK[type]) q = REASK[type].find(x => !isPrevQ(x) && !inRecent(x)) || REASK[type].find(x => !isPrevQ(x)) || q;
        else { const pool = (crisisMode() || S.risk === 'high') ? ['¿Cómo estás en este momento?','¿Qué estás sintiendo ahora?','¿Qué es lo más difícil en este momento?','¿Sigues ahí conmigo?'] : S.themes.size ? ['¿Quieres contarme un poco más?','¿Qué más está pasando?','¿Cómo lo estás llevando?','¿Qué es lo que más te pesa de todo esto?','¿Hay algo más que quieras contarme?','¿Y cómo te hace sentir eso?'] : R.openers; const alts = pool.filter(x => x !== q && !isPrevQ(x) && !inRecent(x) && !(S.askedQs || []).slice(-4).includes(x)); q = alts.length ? alts[S.turn % alts.length] : (pool.find(x => !isPrevQ(x)) || pool[0]); type = null; }
      }
      out.push(q); asked = type || qtype(q) || 'open'; S.askedQs = (S.askedQs || []).concat([q]).slice(-30);
      S.pending = type ? { type, tries: tries||0 } : null;
      S.lastQ = type || qtype(q);
      if (type) S.asked[type] = (S.asked[type]||0) + 1;
      if (type === 'ideacion') S.ideaAskTurn = S.turn;
      if (ch) chips = ch;
    }
    function famOk(){ return a.toks.length <= 4 || /\b(pelea|pelean|peleamos|peleas|peleando|discut\w*|grit\w*|problema|problemas|mal|no me (acepta|aceptan|entiende|entienden|quiere|quieren|pesca|pescan|habla|hablan|deja|dejan|apoya|apoyan)|me odia|me odian|toxic\w*|pesad\w*|tens\w*|me echaron|me quieren echar|no (los|lo|la) soporto|me tratan|me trata|me culpa|me culpan|me presiona\w*|me exige\w*|maltrat\w*|abandon\w*)\b/.test(t); }
    function reflect(list, max){ let n=0; list = list.filter(th => th !== 'familia' || (famOk() && !['violence','grooming','past','helper'].includes(S.track))); for (const th of list) { if (n>=max) break; if (T[th]) { say(pick(T[th].r, 'r'+th)); n++; } } const second = list.find((x, i) => i > 0 && ALSO[x] && !(list[0] === 'duelo' && x === 'familia') && !(['bullying','soledad'].includes(list[0]) && x === 'estudios') && !(list[0] === 'posparto' && ['familia','pareja','animo'].includes(x)) && !(list[0] === 'vivienda' && x === 'familia') && !(list[0] === 'identidad' && x === 'familia' && /\bfamilia\b/.test(t) && a.toks.length <= 8)); if (max === 1 && second && n) say(`Y además está ${ALSO[second]}. Es mucho junto.`); return n; }
    function closing(){ return (S.name ? '' : '') + pick([noCall() ? 'Gracias por conversar. Si lo necesitas, aquí estoy. Cuídate mucho.' : 'Gracias por conversar. Si lo necesitas, aquí estoy, y el *4141 atiende las 24 horas. Cuídate mucho.','Gracias por escribir. Este espacio queda abierto para cuando lo necesites. Cuídate.'],'close'); }
    function crisisNext(){
      if (pend && IMPORTANT.has(pend.type) && !answered && !frustrated && stillNeeded(pend) && (pend.tries||0) < (LIMIT[pend.type]||0) && !asked) { reask(pend); return; }
      const steps = [
        ['emergencia_sola', () => F.emergency && !F.called && F.alone === true && !S.used.has('emerg_sola'), () => { S.used.add('emerg_sola'); say('Escucha: es importante que alguien te vea ahora. Si puedes, sal y golpea la puerta de un vecino, o grita para pedir ayuda.'); say('Si logras marcar el 131, aunque no puedas hablar mucho, deja la llamada abierta.'); ask('¿Puedes hacer alguna de esas cosas?', 'llamo131', CHIPS.llamo131); }],
        ['llamo131', () => F.emergency && !F.called, () => ask('¿Ya pudiste llamar al 131, o hay alguien llamando por ti?', 'llamo131', CHIPS.llamo131)],
        ['alejarse', () => S.flags.has('LUGAR_PELIGRO') && !S.alejado && (S.asked.alejarse||0) < MAXASK.alejarse, () => ask(REASK.alejarse.find(x => !isPrevQ(x) && !inRecent(x)) || REASK.alejarse[0], 'alejarse', CHIPS.alejarse)],
        ['safe', () => F.ideation === true && F.safe === null && !F.emergency && !(S.flags.has('LUGAR_PELIGRO') && !S.alejado), () => ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe)],
        ['means', () => F.safe === false && F.meansAway === null, () => ask(R.askMeans, 'means', CHIPS.means)],
        ['with', () => F.alone === null && (S.asked.with||0) < 2 && !frustrated, () => ask(S.flags.has('LUGAR_PELIGRO') || S.flags.has('PLAN_LUGAR') ? '¿Estás con alguien en este momento?' : pick(R.askWith,'askWith'), 'with', CHIPS.with)],
        ['contact', () => F.alone === true && F.someone === null && !F.refusedCall && (S.asked.contact||0) < 1 && !frustrated, () => ask(pick(R.askContact,'askContact'), 'contact', CHIPS.contact)],
        ['ejercicio', () => !S.sug.exercise && !S.ground, () => { S.sug.exercise++; ask(R.offerExercise, 'ejercicio', CHIPS.ejercicio); }]
      ];
      for (const [type, cond, doit] of steps) {
        if (!cond()) continue;
        if ((S.asked[type]||0) >= (MAXASK[type]||9)) continue;
        if (pend && pend.type === type && !answered) {
          if ((pend.tries||0) < (LIMIT[type]||0)) { reask(pend); return; }
          dropPending(pend); continue;
        }
        doit(); return;
      }
      const pair = pick(R.crisisKeep,'crisisKeep'); if (!out.some(x => typeof x === 'string' && !/\?\s*$/.test(x) && x.length < 90)) say(pair[0]); ask(pair[1], null, CHIPS.calm);
    }
    function nextQ(soft){
      if (TRACK_F[S.track] && !crisisMode()) return trackNext();
      if (S.turn >= 3 && RISKY_OWN(S) && S.distress >= 2 && !S.askedIdeation && !soft) { S.askedIdeation = true; return ask(R.screen, 'ideacion', CHIPS.ideacion); }
      if (F.ideation === 'sin_respuesta' && RISKY_OWN(S) && S.distress >= 3 && (S.asked.ideacion||0) < MAXASK.ideacion && !S.used.has('ideaLater') && S.turn - (S.ideaAskTurn||0) >= 3 && !soft) { S.used.add('ideaLater'); F.ideation = null; return ask('Antes te pregunté algo importante y no quiero dejarlo pasar: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); }
      if (S.risk === 'high') return ask(pick(['¿Cómo estás en este momento?','¿Qué es lo más difícil ahora mismo?','¿Qué estás sintiendo ahora?'],'hiQ'), 'estado');
      const noEstado = l => S.estadoKnown ? l.filter(q => qtype(q) !== 'estado') : l;
      if (!S.themes.size && F.ideation !== true && !S.used.has('opener:2') && S.turn <= 3) return ask(pick(noEstado(R.openers),'opener' + (S.estadoKnown ? 'K' : '')));
      if (!S.themes.size && RANK[S.risk] < 1) return ask(pick(noEstado(['¿Cómo te sientes hoy?','¿Cómo ha sido tu día hoy?','¿Hay algo que te esté preocupando?','¿Qué te gustaría conversar?']),'neutral' + (S.estadoKnown ? 'K' : '')), 'estado');
      for (let k=0;k<R.follow.length;k++){ const q = pick(R.follow,'follow'); const ty = qtype(q); if ((ty==='cuando' && (F.timeKnown || lastQ === 'cuando')) || (ty==='persona' && (F.personKnown || F.someone === false))) continue; return ask(q); }
      ask('Te sigo leyendo. ¿Quieres contarme un poco más?');
    }
    function next(soft){ if (crisisMode()) crisisNext(); else if (TRACK_F[S.track]) trackNext(); else nextQ(soft); }
    function trackNext(){
      const tr = S.track;
      if (TRACK_TIP[tr] && !S.used.has('tip:' + tr) && S.turn > S.trackStart && !deferQ) { S.used.add('tip:' + tr); say(tr === 'violence' && S.minor ? 'Algo que ayuda: cuéntale a un adulto de confianza fuera de la casa, como un profe o el orientador del colegio. ' + (out.some(x => typeof x === 'string' && /1515/.test(x)) ? 'El 147 (Fono Niños) también te puede ayudar, gratis.' : 'El 147 y el 1515 también te pueden ayudar, gratis.') : TRACK_TIP[tr]); }
      const list = TRACK_F[tr];
      if (!list) return crisisMode() ? crisisNext() : nextQ(true);
      for (let i = 0; i < list.length; i++) { const q = pick(list, 'tr' + tr); if (!(S.recent || []).includes(q) && q !== S.prevQ && !(S.askedQs || []).includes(q)) { let q2 = q; if (tr === 'helper' && S.tercWho && !/^tus /.test(S.tercWho)) { q2 = q.replace(/^¿Esa persona/, '¿' + S.tercWho.charAt(0).toUpperCase() + S.tercWho.slice(1)); if (S.tercFem === false) q2 = q2.replace('que la acompañe', 'que lo acompañe'); } return ask(q2, tr === 'helper' && /sabe/.test(q) ? 'sabe' : 'open'); } }
      return ask(pick(['¿Quieres contarme un poco más?','¿Cómo te sientes ahora?'],'trx'), 'open');
    }
    function setTrack(tr){ if (S.track === 'suicide' && tr !== 'suicide') return; if (S.track !== tr) { S.track = tr; S.trackStart = S.turn; } }
    function themeFollow(){
      const ft = freshThemes[0];
      if (crisisMode()) return crisisNext();
      if (TRACK_F[S.track]) return trackNext();
      if (S.turn >= 3 && RISKY_OWN(S) && S.distress >= 2 && !S.askedIdeation) { S.askedIdeation = true; return ask(R.screen, 'ideacion', CHIPS.ideacion); }
      if (a.themes.length >= 3 && a.toks.length >= 12) { ask('De todo eso, ¿qué es lo que más te pesa hoy?', 'open'); return; }
      if (ft === 'vivienda' && /\b(me van a|me va a) (echar|botar|desalojar)\b/.test(t) && !/\b(hoy|ahora|esta noche|manana)\b/.test(t)) { ask(S.themes.has('embarazo') ? '¿Ya saben, o todavía no les has contado?' : '¿Cuándo crees que podría pasar?', 'open'); return; }
      if (ft && T[ft] && !(ft === 'familia' && !famOk())) { let q = pick(T[ft].f, 'f'+ft);
        if (a.toks.length >= 5 && /^¿(Qué pasó|Qué está pasando|Cuándo pasó)/.test(q)) { const alt = T[ft].f.find(x => !/^¿(Qué pasó|Qué está pasando|Cuándo pasó)/.test(x) && !(S.askedQs || []).includes(x)); q = alt || pick(['¿Cómo te hace sentir eso?','¿Cómo lo estás llevando?'],'emoQ'); }
        if (!(qtype(q)==='cuando' && F.timeKnown)) { if (ft === 'vivienda') return ask(q, 'techo', ['Sí','No']); ask(q); S.lastQTheme = ft; return; } }
      nextQ(true);
    }

    /* ── actos según la intención ── */
    function act(){
      if (['TEMA','NADA'].includes(P) && !repeated && !(long && a.themes.length >= 2)) {
        const rp = reflectP();
        if (rp) {
          if (P === 'TEMA') startSearch = true;
          if (crisisMode()) return crisisNext();
          if (P === 'TEMA' && !S.askedIdeation && S.turn >= 3 && RISKY_OWN(S) && S.distress >= 2 && !TRACK_F[S.track] && !deferQ) { S.askedIdeation = true; return ask(R.screen, 'ideacion', CHIPS.ideacion); }
          if (rp.q && !deferQ) return ask(rp.q);
          if (TRACK_F[S.track]) return trackNext();
          return P === 'TEMA' ? themeFollow() : nextQ(true);
        }
      }
      switch (P) {
        /* ── casos nuevos (tercera revisión: conversaciones reales) ── */
        case 'EMERG_DETALLE':
          urgent = true; showCrisis = true;
          if (S.used.has('emergDet')) say('Gracias, eso también es importante para los médicos.');
          else { S.used.add('emergDet'); say('Gracias por decírmelo; es información importante para los médicos.');
          say(F.cantCall ? 'Pídele a alguien cerca que llame al 131 por ti y le cuente qué tomaste y cuánto.' : 'Llama ahora al 131 y cuéntales qué tomaste y cuánto. Si no puedes hablar, pídele a alguien cerca que llame por ti.'); }
          deferQ = false; ask(REASK.llamo131.find(x => !isPrevQ(x)) || REASK.llamo131[0], 'llamo131', CHIPS.llamo131); break;
        case 'EMERG_LLAMAR':
          urgent = true; showCrisis = true;
          say('Sí, llama ahora al 131. Es lo más importante en este momento: aunque ahora te sientas bien, algunos efectos aparecen más tarde.');
          say(F.alone === true ? 'Si te cuesta hablar, marca igual y deja la llamada abierta, o golpea la puerta de un vecino.' : 'Si te cuesta hablar, pídele a alguien cerca que llame por ti.');
          deferQ = false; ask('¿Puedes llamar ahora?', 'llamo131', CHIPS.llamo131); break;
        case 'DUELO_IRSE':
          startSearch = true; showCrisis = true; crisisRes(); bump('mid'); S.flags.add('PASIVA');
          say('Cuando perdemos a alguien tan importante, a veces aparece el deseo de irse con esa persona. Gracias por decírmelo; es muy importante que lo pongas en palabras.');
          if (F.ideation === true) { crisisNext(); break; }
          S.askedIdeation = true; deferQ = false; ask('Te lo pregunto directo, porque me importa: ¿estás pensando en quitarte la vida?', 'ideacion', CHIPS.ideacion); break;
        case 'EN_SERIO':
          say('Te creo, y lo tomo en serio.'); next(true); break;
        case 'OFFTOPIC_INSISTE':
          say('De verdad no puedo ayudarte con eso, perdona.'); casual('Si algo te tiene con estrés o con la cabeza llena, eso sí lo podemos conversar. ¿Cómo estás tú?'); break;
        case 'AYUDA_PREGUNTA':
          say('Sí, para eso estoy.'); ask('Cuéntame qué está pasando, con tus palabras.', 'open'); break;
        case 'QUIERE_CONTAR':
          say(pick(['Claro, cuéntame. Te leo, sin apuro.','Aquí estoy. Cuéntame como te salga, sin apuro.'],'qcontar')); S.lastQ = 'open'; break;
        case 'PRESENCIA_INICIO':
          S.used.add('presIni');
          say('Hola, aquí estoy. Soy Nexo, un asistente automático: te leo y, si lo necesitas, te conecto con un especialista humano del equipo.');
          ask('Cuéntame, ¿cómo te sientes?', 'estado'); break;
        case 'COMPANIA': {
          const who = personIn(t); F.alone = false;
          say(who ? `Qué bueno que estés con ${who}.` : 'Qué bueno que no estés sin compañía.');
          if (!deferQ) next(true); break; }
        case 'UBICACION': {
          const place = (t.match(/\b(pieza|casa|cama|bano|living|cocina|patio|colegio|liceo|trabajo|pega|calle|auto|micro|metro|plaza|parque|depto|departamento|universidad|carrete|fiesta|junta|bar|disco)\b/) || [])[0] || ''; const lugar = Object.assign({ carrete:'un carrete', fiesta:'una fiesta', junta:'una junta', bar:'un bar', disco:'una disco' }, ARTLOC)[place] || place;
          const consejo = !crisisMode() ? null : /^(colegio|liceo)$/.test(place) ? 'Si puedes, busca a un adulto de confianza ahí, como un profe, el orientador o alguien de inspectoría, y cuéntale que no estás bien.' : /^(universidad|trabajo|pega)$/.test(place) ? 'Si puedes, acércate a alguien de confianza ahí y cuéntale que no estás bien.' : /^(carrete|fiesta|junta|bar|disco)$/.test(place) ? 'Si puedes, busca a alguien de confianza ahí y quédate cerca; no te vayas sin compañía.' : null;
          if (crisisMode() && F.safe === null) { say(`Ok, estás en ${lugar}.`); if (consejo) say(consejo); deferQ = false; ask('¿Ahí estás a salvo, sin nada a mano con lo que te puedas hacer daño?', 'safe', CHIPS.safe); break; }
          say(`Ok, estás en ${lugar}. Gracias por decírmelo.`);
          if (consejo) say(consejo);
          if (!deferQ) next(true); break; }
        case 'TERCERO_UBIC': {
          const fem = S.tercFem !== false;
          say(`Ok. Si puedes, quédate cerca y no ${fem ? 'la' : 'lo'} dejes ${fem ? 'sola' : 'solo'} por ahora. Si hay pastillas, armas u otras cosas con las que pueda hacerse daño, guárdalas donde no las encuentre.`);
          if (pend && pend.type === 'third' && stillNeeded(pend)) { deferQ = false; reask(pend); } else trackNext(); break; }
        case 'SEGURO_AHORA':
          if (F.safe !== false) F.safe = true; if (S.track === 'violence') S.safevDone = true;
          say('Qué bueno que ahora estés a salvo.');
          if (!deferQ) next(true); break;
        case 'ALEJADO':
          S.alejado = true; deferQ = false;
          say('Qué alivio leer eso. Gracias por hacerlo; no es poco.');
          if (F.safe === null || F.safe === 'sin_respuesta') { F.safe = null; ask('Ahora que te alejaste, ¿estás en un lugar seguro, sin nada a mano con lo que te puedas hacer daño?', 'safe', CHIPS.safe); }
          else crisisNext(); break;
        case 'MIEDO_INTERNACION':
          say('Entiendo ese miedo; es muy común. Contar lo que te pasa no significa que te vayan a internar: casi siempre el apoyo es conversar y buscar juntos formas de cuidarte.');
          say('Una hospitalización solo se considera si hay un peligro muy alto, y aun así te explican todo y te escuchan.');
          if (!deferQ) { if (crisisMode()) crisisNext(); else next(true); } break;
        case 'RAZON_VIVIR': {
          const m = t.match(/\b(mis|mi) (\w+)/); const who = m ? tildes(m[0].replace(/^mi /,'tu ').replace(/^mis /,'tus ')) : null;
          S.flags.add('RAZONES');
          say(who ? `${who.charAt(0).toUpperCase() + who.slice(1)} ${/^tus /.test(who) ? 'son' : 'es'} una razón muy importante. Gracias por decírmelo; guárdalo cerca estos días.` : 'Eso es muy importante. Gracias por decírmelo.');
          if (!deferQ) { if (crisisMode()) crisisNext(); else next(true); } break; }
        case 'SOBRE_PERSONA': {
          const who = personIn(t) || 'esa persona'; startSearch = true;
          ask(`¿Qué está pasando con ${who}?`, 'open'); break; }
        case 'DANO_BROMA':
          S.risk = prevRisk; S.flags.add('HIPERBOLE');
          say('Te leo; a veces la rabia se dice así. Si en algún momento sientes que se pone muy fuerte con alguien, aquí puedes contarlo.');
          casual('¿Cómo estás tú?'); break;
        case 'VOLVIO':
          say(pick(['Qué bueno que volviste. Aquí sigo contigo.','Hola de nuevo. Me alegra que escribas.'],'volvio'));
          if (crisisMode()) crisisNext(); else ask('¿Cómo estás ahora?', 'estado'); break;
        case 'VERDAD_MAL':
          S.themes.add('animo'); S.distress++; bump('mid'); startSearch = true;
          say('Gracias por decírmelo. Aquí no tienes que hacer como que estás bien.');
          ask('¿Cómo estás de verdad?', 'estado'); break;
        case 'POST_RESP':
          if ((/\b(mejor|bien|tranquil|calm|bajo|baje|un poco|algo|relaj|alivi)/.test(t) && !/\b(no|peor|igual|nada)\b/.test(t)) || a.answer === 'yes' || a.answer === 'ack') { say(pick(['Qué bueno que haya bajado aunque sea un poco. Cuando quieras, lo repetimos.','Me alegra. Los pequeños respiros también cuentan.'],'postR')); if (crisisMode()) crisisNext(); else ask('¿Quieres seguir conversando, o prefieres intentar descansar?', 'open'); break; }
          say(/\bpeor\b/.test(t) ? 'Lamento que no haya ayudado esta vez. A veces el cuerpo necesita más tiempo, y está bien.' : 'Está bien, a veces cuesta más. No hay una forma correcta de hacerlo.');
          if (crisisMode()) { crisisNext(); break; }
          ask('¿Quieres que lo repitamos, o prefieres que conversemos?', 'open', ['Respirar juntos','Prefiero conversar']); break;
        case 'ESPERA_OK':
          say(pick(['Bueno. Mientras tanto, aquí sigo contigo; si quieres, me puedes ir contando.','Perfecto. Mientras esperas, aquí estoy por si quieres conversar.'],'espOk')); S.lastQ = 'open'; break;
        case 'POSPARTO_VINCULO':
          S.themes.add('posparto'); S.themes.add('animo'); S.distress++; startSearch = true; bump('mid');
          say('Lo que cuentas le pasa a más mamás de lo que se cree, y no te hace mala madre. A veces es parte de una depresión posparto, que es común y tiene tratamiento.');
          ask('¿Has podido contárselo a alguien, como tu matrona o tu médico?', 'open'); break;
        /* ── casos nuevos (segunda revisión) ── */
        case 'NO_SEGURO_LUGAR':
          bump('mid'); startSearch = true; F.safe = false; S.flags.add('NO_SEGURO'); showCrisis = true; crisisRes(['133']);
          say('Gracias por decírmelo. Que no te sientas a salvo donde estás es muy importante.');
          ask('¿Qué está pasando? ¿Alguien te puede hacer daño ahí?', 'open'); break;
        case 'PLAN_CUANDO':
          S.flags.add('PLAN_CON_FECHA'); bump('high'); urgent = true; showCrisis = true; crisisRes(); startSearch = true; setTrack('suicide');
          say('Gracias por responderme. Lo que me cuentas me preocupa mucho.');
          ask('Te lo pregunto directo, porque me importa: lo que tienes planeado, ¿es quitarte la vida?', 'ideacion', ['Sí','No']); S.askedIdeation = true; break;
        case 'DESPEDIDA_CONFIRMA':
          urgent = true; showCrisis = true; crisisRes(); bump('high'); startSearch = true; setTrack('suicide'); S.flags.add('DESPEDIDA_EN_CRISIS');
          if (F.ideation === null || F.ideation === 'sin_respuesta') { F.ideation = true; S.flags.add('IDEACION'); }
          say('Cuando dices eso, me preocupa mucho tu seguridad. No te voy a dejar con esto sin apoyo.');
          { const c = callLine(noCall() ? 'override' : 'urgent'); if (c) say(c); }
          if (F.safe === null) ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe); else crisisNext(); break;
        case 'IDEACION_PASADA':
          S.flags.add('IDEACION_PASADA'); bump('mid'); startSearch = true; S.askedIdeation = true;
          say('Gracias por contármelo. Me alegra que hoy no estés en ese lugar; se nota que te costó llegar hasta aquí.');
          ask('¿Hay días en que esos pensamientos vuelven, aunque sea un poco?', 'ideacion', CHIPS.ideacion); break;
        case 'GRACIAS_INICIO':
          say('Gracias a ti.'); ask('¿Cómo estás hoy?', 'estado'); break;
        case 'IDIOMA_LIMITADO':
          say('No te preocupes: escribe como puedas, aunque sea con errores o mezclando idiomas. Te entiendo igual.');
          crisisMode() ? crisisNext() : ask('¿Cómo te sientes?', 'estado'); break;
        case 'QUEJA_ROBOT':
          say(pick(['Sí, soy un programa y a veces sueno así. Igual te estoy leyendo con atención.','Tienes razón, soy un asistente automático y se nota. Igual leo con atención todo lo que escribes.'],'qrobot'));
          casual('¿Qué te gustaría contarme?'); break;
        case 'COMO_SABES':
          say('No lo sé, salvo lo que tú me cuentes: no adivino nada, solo leo lo que escribes aquí.');
          casual('¿Me cuentas cómo estás tú?'); break;
        case 'NO_PSICOLOGO':
          S.flags.add('NO_QUIERE_PSICOLOGO');
          say(pick(['Está bien, nadie te va a obligar. Aquí puedes conversar conmigo lo que necesites.','Está bien. No tienes que hablar con nadie que no quieras; aquí puedes escribir igual.'],'nopsi'));
          if (crisisMode()) { if (!noCall()) say('Igual, si en algún momento sientes que no puedes más, el *4141 atiende las 24 horas.'); crisisNext(); break; }
          if (S.used.has('nopsiQ') || /\b(no me gusta|no me sirv|mala experiencia|me fue mal|no sirven|no me gustan)\b/.test(t)) { next(true); break; }
          S.used.add('nopsiQ'); ask('Si quieres contarme, ¿qué es lo que no te convence?', 'open'); break;
        case 'DESAHOGO':
          say(pick(['Claro. Aquí puedes desahogarte, sin filtro y a tu ritmo.','Para eso está este espacio. Escribe todo lo que necesites, como te salga.'],'desah'));
          crisisMode() ? crisisNext() : ask('Te leo. ¿Qué pasó?', 'open'); break;
        case 'ACADEMICO':
          S.flags.add('ACADEMICO');
          say('Qué bueno que estés trabajando en esto; es un tema muy importante. Lo básico: casi nunca hay una sola causa, y la mayoría de las personas que piensan en quitarse la vida dan señales y pueden recibir ayuda.');
          say('Para cifras y material confiable, el Ministerio de Salud tiene información oficial, y el *4141 es la línea nacional de prevención.');
          ask('¿Hay algo puntual que te sirva, como las señales de alerta o cómo ayudar a alguien?', 'open', ['Señales de alerta','Cómo ayudar a alguien']); break;
        case 'FAQ_SENALES':
          say('Algunas señales de alerta: hablar de querer morir o de ser una carga, despedirse o regalar sus cosas, aislarse, cambios bruscos de ánimo, tomar o consumir más, o buscar formas de hacerse daño.');
          say('Si las ves en alguien, pregúntale directo cómo está, no lo dejes sin compañía y busquen ayuda juntos: el *4141 orienta las 24 horas, también a quien acompaña.');
          casual(); break;
        case 'PREG_AYUDA':
          say('Si alguien está pensando en quitarse la vida, lo más importante es tomarlo en serio: preguntarle directo cómo está, escucharlo sin juzgar, no dejarlo sin compañía y buscar ayuda juntos.');
          say('El *4141 orienta las 24 horas, también a quien acompaña. Y si hay peligro inmediato, el 131.');
          ask('¿Lo preguntas por alguien en particular, o por ti?', 'pregsui', ['Por mí','Por alguien cercano','Solo curiosidad']); break;
        case 'FAQ_COMO':
          say('Nada especial: escribe lo que te pasa, como te salga. Yo te leo y te acompaño, y si lo necesitas, dejo tu caso para que te escriba un especialista del equipo.');
          ask(S.estadoKnown ? '¿Qué te gustaría contarme?' : '¿Cómo te sientes hoy?', 'estado'); break;
        case 'BUENA_NOTICIA':
          S.goodNews = S.turn;
          say(pick(['¡Qué buena noticia! Me alegra mucho leerlo.','¡Qué bueno! Eso merece celebrarse.'],'buena'));
          ask('¿Cómo te sientes con eso?', 'estado'); break;
        case 'MALTRATO_LABORAL':
          S.flags.add('MALTRATO_LABORAL'); S.themes.add('trabajo'); startSearch = true; bump('mid');
          say('Que te trate así no está bien, y menos delante de otras personas. Nadie debería pasar por eso en la pega.');
          if (!S.used.has('karin')) { S.used.add('karin'); say('Si se repite, guarda registro de lo que pasa (fechas, mensajes, testigos): la Ley Karin también protege contra el maltrato en el trabajo.'); }
          ask('¿Cómo te está afectando todo esto?', 'estado'); break;
        case 'VIOLENCIA_AHORA':
          setTrack('violence'); S.flags.add('VIOLENCIA'); S.flags.add('NO_SEGURO'); S.flags.add('VIOLENCIA_EN_CURSO'); bump('high'); urgent = true; showCrisis = true; crisisRes(S.minor ? ['133','147','1515'] : ['133','1455','149']); startSearch = true; S.used.add('violAway'); S.safevDone = true;
          if (!S.used.has('violNow')) { S.used.add('violNow'); say('Lo que me cuentas es muy peligroso, y tu seguridad es lo primero.');
            say(/\b(encerrad[oa]|me encerre|bano|me escondi)\b/.test(t) ? 'Si puedes, quédate ahí con la puerta cerrada y el celular en silencio, y llama al 133. Si no puedes hablar, escríbele a un familiar o a un vecino para que llame por ti y dé tu dirección.' : 'Si puedes, sal de ahí o enciérrate en un lugar seguro con tu celular, y llama al 133. Si no puedes hablar, escríbele a un familiar o a un vecino para que llame por ti y dé tu dirección.'); }
          else say('Sigo aquí contigo. Si puedes, llama al 133 o pídele a alguien por mensaje que llame por ti.');
          ask('¿Puedes avisarle a alguien por mensaje ahora?', 'open'); break;
        case 'TERCERO_DESPEDIDA': {
          const who = personIn(t) || 'esa persona'; const fem = /\b(mi|una) (amiga|mama|hermana|abuela|tia|prima|polola|esposa|hija|vecina|companera|pareja)\b/.test(t) || who === 'esa persona';
          setTrack('helper'); S.flags.add('TERCERO'); S.flags.add('TERCERO_URGENTE'); S.thirdDanger = true; S.tercUrgTurn = S.turn; S.tercWho = who; S.tercFem = fem;
          urgent = true; showCrisis = true; crisisRes(['133']); startSearch = true; bump('mid');
          say('Eso es muy preocupante, y hiciste muy bien en escribir.');
          say(`Si crees que ${who} puede estar en peligro ahora, llama al 133 o al 131 y pide que vayan a ver${fem ? 'la' : 'lo'}. Si alguien vive cerca o está con ${fem ? 'ella' : 'él'}, avísale para que vaya ya.`);
          ask(`¿Sabes dónde está ${who} ahora?`, 'open'); break; }
        case 'TERCERO_URG_SEG': {
          urgent = true; showCrisis = true; const o = S.tercFem === false ? 'o' : 'a', who = S.tercWho || 'esa persona';
          if (/\b(me contesto|me respondio|esta bien|ya aparecio|lo encontraron|la encontraron|lo ubique|la ubique|esta con (el|ella|alguien|su familia))\b/.test(t)) { say(`Qué alivio que ya sepas de ${who}.`); say(`Igual, lo que te mandó es una señal de que lo está pasando muy mal: intenten que no esté sin compañía hoy y que pida ayuda. El *4141 también los orienta.`); S.flags.delete('TERCERO_URGENTE'); ask('¿Y tú cómo estás con todo esto?', 'estado'); break; }
          if (/\b(ya llame|llame|vienen|van en camino|van para alla|fueron|ya van|llego la policia|llegaron)\b/.test(t) || P0 === 'YA_LLAME') { F.called = true; say('Hiciste lo correcto. Pedir ayuda así es cuidar' + (o === 'a' ? 'la' : 'lo') + '.'); say('Mientras tanto, sigue intentando contactar' + (o === 'a' ? 'la' : 'lo') + ' y avísale a alguien cercano.'); ask('¿Y tú cómo estás con todo esto?', 'estado'); break; }
          if (/\b(no (me )?contesta|no responde|no me responde|tiene el celular apagado|no l[oa] ubico|no s[eé] nada)\b/.test(t)) say(`Si no te contesta, no esperes más: llama al 133 o al 131 y pide que vayan a ver${o === 'a' ? 'la' : 'lo'}.`);
          else if (/\b(esta en|vive en|en su (casa|depto|departamento|pieza)|en la casa)\b/.test(t)) say('Si sabes la dirección, llama al 133 o al 131 y dásela para que vayan. Si alguien tiene llave o vive cerca, que vaya ahora.');
          else if (/\b(miedo|haga algo|se haga algo|le pase algo)\b/.test(t)) say(`Tu miedo tiene sentido, y por eso es importante actuar ahora: llama al 133 o al 131, o pídele a alguien cercano que vaya a ver${o === 'a' ? 'la' : 'lo'}.`);
          else say(`Lo más importante ahora es que alguien vaya a ver${o === 'a' ? 'la' : 'lo'}: si crees que está en peligro, llama al 133 o al 131.`);
          S.lastQ = 'open'; break; }
        case 'EMERG_OTRO_SEG': {
          urgent = true; showCrisis = true; const lo = S.otroFem ? 'la' : 'lo', solo = S.otroFem ? 'sola' : 'solo';
          if (/\b(no respira|dejo de respirar|no reacciona|no despierta|esta morad[oa]|no tiene pulso)\b/.test(t)) say(`Llama al 131 ahora mismo y dile que no respira o no reacciona: te van a guiar para hacer compresiones en el pecho hasta que llegue la ambulancia.`);
          else if (/\b(llegaron|llego la ambulancia|se l[oa] llevaron|esta en el hospital|l[oa] atendieron|l[oa] estan atendiendo)\b/.test(t)) { S.flags.delete('EMERG_OTRO'); say('Qué bueno que ya esté recibiendo atención. Hiciste todo lo que tenías que hacer.'); ask('¿Y tú cómo estás después de esto?', 'estado'); break; }
          else if (P0 === 'YA_LLAME' || /\b(ya llame|llame|vienen|viene|en camino|ya vienen|ya viene)\b/.test(t)) { F.called = true; say(`Hiciste muy bien. Quédate a su lado hasta que llegue la ayuda y sigue lo que te digan por teléfono.`); say('Si deja de respirar o no reacciona, vuelve a llamar al 131 de inmediato.'); }
          else if (/\b(respira|esta respirando)\b/.test(t)) { say('Bien que respire. Si todavía no llamas al 131, hazlo ahora.'); say(`Mientras llega la ayuda, pon${lo === 'la' ? 'la' : 'lo'} de costado para que no se ahogue si vomita, y no ${lo} dejes ${solo}.`); }
          else if (/\b(no puedo|no tengo|no se como)\b/.test(t)) say(`Pídele a alguien cerca que llame al 131, o grita para pedir ayuda a un vecino. No ${lo} dejes ${solo}.`);
          else say(`Sigue las indicaciones del 131 y quédate a su lado. Yo sigo aquí contigo.`);
          S.lastQ = 'open'; break; }
        case 'MEDICA_URG':
          urgent = true; showCrisis = true; S.resources.add('131'); S.flags.add('URGENCIA_MEDICA'); F.emergency = F.emergency || false;
          say(/pecho/.test(t) ? 'Un dolor en el pecho, sobre todo si se va al brazo, la mandíbula o la espalda, puede ser una emergencia del corazón.' : 'Eso puede ser una emergencia médica.');
          say('Llama ahora al 131 (SAMU) o pídele a alguien que te lleve a un servicio de urgencia. No te quedes esperando a ver si se pasa.');
          ask('¿Ya pudiste llamar, o hay alguien que pueda llamar por ti?', 'llamo131', CHIPS.llamo131); break;
        case 'CRIANZA': {
          S.flags.add('CRIANZA'); S.themes.add('familia'); startSearch = true; bump('mid');
          const quien = /\b(mama|madre)\b/.test(t) ? 'la peor mamá' : /\b(papa|padre)\b/.test(t) ? 'el peor papá' : 'una mala persona';
          say(`Que a veces se te escape un grito cuando el cansancio te sobrepasa no te convierte en ${quien}. Que te duela tanto habla de cuánto te importa.`);
          say('Cuando sientas que la rabia sube, aléjate un momento: respira y vuelve cuando estés con más calma. Pedir ayuda para descansar también es cuidar a tu familia.');
          ask('¿Tienes a alguien que te pueda ayudar con la crianza, aunque sea un rato?', 'open'); break; }
        case 'ROMPER':
          S.themes.add('rabia');
          say('Cuando la rabia sube tanto, a veces sale rompiendo cosas. Si sientes que sigue subiendo, aléjate un momento y respira lento.');
          ask(/\b(vaso|vasos|plato|platos|vidrio|espejo)\b/.test(t) ? '¿Te cortaste o te hiciste daño con eso?' : '¿Te hiciste daño?', 'open'); break;
        case 'HELPER_SECRETO': {
          const o = S.tercFem === false ? 'o' : 'a';
          say('Entiendo el dilema: quieres cuidar su confianza. Pero cuando alguien habla de quitarse la vida o de hacerse daño, su seguridad va primero.');
          say(`${S.tercMinor || S.minor ? 'Contarle a un adulto de confianza (su familia, un profe o alguien del colegio)' : 'Contarle a alguien que pueda ayudar, como su familia'} no es traicionar${o === 'a' ? 'la' : 'lo'}: es cuidar${o === 'a' ? 'la' : 'lo'}. Puedes decirle que lo haces porque te importa.`);
          trackNext(); break; }
        case 'TERCERO_MENOR':
          S.tercMinor = true; crisisRes(['1515']);
          say('Como es menor de edad, es importante que algún adulto de confianza lo sepa: su familia, un profe o alguien del colegio. También pueden llamar gratis al 1515 (Línea Libre).');
          trackNext(); break;
        case 'VIOL_AMOR':
          say('Es muy común querer a alguien que también te hace daño. Que lo quieras no hace que lo que te hace esté bien, ni que sea tu culpa.');
          trackNext(); break;
        case 'RETRACTA_BROMA':
          S.flags.delete('BROMA'); bump('mid');
          say('Gracias por decírmelo. Entonces sí te está pasando algo fuerte, y me alegra que lo digas.');
          if (crisisMode()) crisisNext(); else if (!S.askedIdeation || F.ideation === null) { S.askedIdeation = true; ask('Te lo pregunto directo, porque me importa: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); } else next(); break;
        case 'PERDIDO':
          urgent = true; showCrisis = true; S.resources.add('133'); S.resources.add('131'); S.flags.add('NO_SEGURO');
          say('Si no sabes bien dónde estás, busca un lugar con luz y con gente, como un negocio abierto, una bencinera o una estación, y pide ayuda ahí.');
          say(noCall() ? 'Quédate cerca de otras personas, no sigas tomando, y escríbeme cuando estés en un lugar con gente.' : 'Si te sientes en peligro, llama al 133 o al 131: atienden a cualquier hora.');
          ask('¿Ves algún lugar así cerca?', 'open'); break;
        case 'BATERIA':
          say('Entonces aprovechemos. Si se te apaga, busca a alguien cerca y quédate con esa persona; no te quedes sin compañía.');
          say(crisisMode() || RANK[S.risk] >= 1 ? 'El *4141 y el 131 son gratuitos y atienden las 24 horas. Y cuando vuelvas a tener batería, puedes seguir escribiendo aquí mismo.' : 'Cuando vuelvas a tener batería, puedes seguir escribiendo aquí mismo; tu conversación queda guardada.');
          S.lastQ = 'open'; break;
        case 'EDAD_NUM':
          ask(`¿Tienes ${S.pendingAge} años?`, 'edad', ['Sí','No']); break;
        case 'DOLOR_CABEZA':
          say('Si te golpeaste fuerte la cabeza y tienes mareo, vómitos, mucho sueño o te cuesta hablar, es importante que te vean pronto en un servicio de urgencia.');
          next(); break;
        case 'FAQ_RASTREO':
          say('No te pedimos nombre, teléfono ni ubicación, y no buscamos saber quién eres. Lo que escribes se guarda cifrado, solo para el equipo que te atiende.');
          casual(); break;
        case 'EMERGENCIA':
          setTrack('suicide');
          urgent = true; showCrisis = true; crisisRes(); startSearch = true; F.emergency = true; F.ideation = true; bump('high');
          say('Esto es una emergencia médica.'); say(callLine('emergency'));
          if (F.alone !== false) say('Si puedes, ve donde otra persona de la casa o un vecino, o deja la puerta sin llave.');
          say('Ya alerté al especialista con prioridad máxima.');
          ask('¿Ya pudiste llamar, o hay alguien que pueda llamar por ti?', 'llamo131', CHIPS.llamo131); break;
        case 'VOCES': {
          const cmd = /\b(mate|matarme|muera|morirme|hacerme dano|cortarme|me tire|matar|suicid)/.test(t);
          S.flags.add('VOCES'); startSearch = true; bump(cmd ? 'high' : 'mid');
          if (cmd) { urgent = true; showCrisis = true; crisisRes(); setTrack('suicide'); if (F.ideation === null) F.ideation = true; S.flags.add('IDEACION'); }
          say('Gracias por contármelo. Escuchar voces debe ser muy confuso y dar mucho miedo.' + (cmd ? ' No tienes que hacerles caso: lo que dicen no es una orden.' : ''));
          say(cmd ? 'Ya avisé con prioridad máxima a un especialista. Esto tiene tratamiento, y es importante que te vea alguien pronto.' : 'Es importante que te vea un profesional pronto; ya avisé a un especialista. Esto tiene tratamiento.');
          if (cmd) { if (F.safe === null) ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe); else crisisNext(); }
          else ask('¿Las voces te dicen que te hagas daño?', 'ideacion', CHIPS.ideacion);
          break; }
        case 'VOCES_AHORA':
          urgent = true; showCrisis = true; crisisRes(); bump('high');
          say('Gracias por decírmelo. Mientras las escuchas, intenta poner tu atención aquí, en lo que vas leyendo. No tienes que hacer lo que dicen.');
          { const c = callLine(noCall() ? 'override' : 'urgent'); if (c) say(c); }
          if (F.alone === null) ask(pick(R.askWith,'askWith'), 'with', CHIPS.with); else crisisNext();
          break;
        case 'DESPEDIDA_OCULTA':
          urgent = true; showCrisis = true; crisisRes(); bump('high'); startSearch = true; S.flags.add('DESPEDIDA_EN_CRISIS'); S.used.add('despEnc');
          say('Gracias por contármelo. Hay algo de lo que escribiste que me preocupa: suena a que te estás despidiendo.');
          ask('Te lo pregunto directo, porque me importa: ¿estás pensando en quitarte la vida?', 'ideacion', CHIPS.ideacion); S.askedIdeation = true; break;
        case 'DECISION':
          S.flags.add('DECISION'); bump('mid');
          say('Te leo.'); ask('¿Qué decisión tomaste?', 'open'); break;
        case 'DECISION_RIESGO':
          urgent = true; showCrisis = true; crisisRes(); bump('high'); startSearch = true; S.flags.add('DESPEDIDA_EN_CRISIS');
          if (S.used.has('decR')) { say('No voy a tratar de convencerte. Solo quiero que no estés sin compañía en esto, y el especialista ya fue avisado con prioridad.'); if (deferQ && pend) { deferQ = false; reask(pend); } else crisisNext(); break; } S.used.add('decR');
          say('Lo que me dices me preocupa mucho. No te voy a sermonear ni a tratar de convencerte de nada; solo quiero entender.');
          ask(F.ideation === true ? pick(R.askSafe,'askSafe') : 'Te lo pregunto directo: ¿estás pensando en quitarte la vida?', F.ideation === true ? 'safe' : 'ideacion', F.ideation === true ? CHIPS.safe : CHIPS.ideacion); S.askedIdeation = true; break;
        case 'HOSPITAL':
          S.used.add('hosp'); say('Lamento que estés en el hospital.'); ask('¿Qué pasó?', 'open'); break;
        case 'EMERGENCIA_OTRO':
          urgent = true; showCrisis = true; S.resources.add('131'); S.flags.add('EMERG_OTRO'); S.emergOtroTurn = S.turn; startSearch = true; bump('mid');
          S.otroFem = /\b(mi|una|la) (amiga|mama|hermana|abuela|tia|prima|polola|esposa|hija|vecina|companera|pareja|senora)\b/.test(t);
          if (!S.used.has('emergOtro')) { S.used.add('emergOtro'); say('Llama ahora al 131 (SAMU). Te van a guiar por teléfono mientras llega la ayuda.'); say(`Si no respira o no reacciona, díselo al operador: te va a indicar cómo hacer reanimación. No ${S.otroFem ? 'la' : 'lo'} dejes ${S.otroFem ? 'sola' : 'solo'}; yo sigo aquí.`); }
          else say('Mantente en la línea con el 131 y sigue sus indicaciones. Si todavía no has llamado, hazlo ahora o pídele a alguien que llame.');
          ask('¿Ya pudiste llamar al 131?', 'open', ['Ya llamé','No puedo']); break;
        case 'AGRESOR':
          S.flags.add('AGRESOR'); bump('high'); setTrack('agresor'); startSearch = true; S.resources.add('149');
          say('Gracias por decírmelo con honestidad. Reconocerlo y querer cambiar es el primer paso, y se puede aprender a manejar la rabia sin dañar a nadie.');
          say('Cuando sientas que la rabia sube, aléjate un momento: sal de la pieza, respira y vuelve cuando estés con más calma. El 149 (Fono Familia) también orienta, y el especialista ya está avisado.');
          ask(/\b(hijo|hija|nino|nina|guagua|bebe)\b/.test(t) ? '¿Tu hijo o hija está bien ahora?' : '¿Esa persona está bien ahora?', 'open'); break;
        case 'AGRESOR_ARREP':
          say('Se nota que te importa, y ese es un muy buen punto de partida. Pedir ayuda para cambiar es lo correcto.'); trackNext(); break;
        case 'DISOCIACION':
          S.flags.add('DISOCIACION'); startSearch = true; bump('mid'); S.themes.add('ansiedad');
          if (S.used.has('disoc')) say('Esa sensación asusta, pero va a pasar. No te estás volviendo loco ni loca.');
          else { S.used.add('disoc'); say('Esa sensación de que nada es real, como estar en un sueño, puede aparecer cuando hay mucha angustia o cansancio. Asusta mucho, pero suele pasar.'); }
          if (!S.ground && !S.sug.exercise) { S.sug.exercise++; ask('¿Quieres que hagamos un ejercicio corto para volver al presente?', 'ejercicio', CHIPS.ejercicio); } else next(true);
          break;
        case 'CUIDADOR':
          S.flags.add('CUIDADOR'); startSearch = true; S.themes.add('familia');
          say('Cuidar a alguien así es agotador, física y emocionalmente. Que no des más no habla mal de ti: habla de todo lo que estás cargando.');
          if (/\b(no doy mas|no puedo mas|no aguanto|ya no puedo)\b/.test(t) && !S.askedIdeation && F.ideation === null) { S.askedIdeation = true; ask('A veces, con tanto cansancio, aparecen pensamientos de no querer seguir. Te lo pregunto directo, porque me importa: ¿te ha pasado?', 'ideacion', CHIPS.ideacion); break; }
          ask('¿Hace cuánto tiempo que cuidas sin descanso?'); break;
        case 'CUIDADOR_SOLO':
          say('Cuidar sin relevo desgasta muchísimo. Pedir ayuda a la familia, al CESFAM o a programas de apoyo a cuidadores no es abandonar a nadie: es cuidarte para poder seguir cuidando.'); next(true); break;
        case 'CUIDADOR_CULPA':
          say('Sentir cansancio cuidando a alguien no es egoísmo; es humano. Tú también necesitas descanso y cuidado.'); next(true); break;
        case 'ACOSO_LABORAL':
          S.flags.add('ACOSO_LABORAL'); bump('mid'); startSearch = true; S.themes.add('trabajo');
          say('Lo que me cuentas es grave, y no es tu culpa. Nadie tiene derecho a acosarte en el trabajo.');
          say('Si puedes, guarda mensajes y anota fechas y lo que pasó. En Chile la Ley Karin protege contra el acoso laboral, y la Inspección del Trabajo recibe denuncias.');
          ask('¿Cómo te está afectando todo esto?', 'estado'); break;
        case 'ACOSO_MIEDO':
          say('Es un miedo muy real. Por eso conviene hacerlo con apoyo: el especialista te puede orientar sobre cómo cuidarte y qué opciones tienes, sin que tengas que decidir nada hoy.'); next(true); break;
        case 'ACOSO_DETALLE':
          say('Eso es acoso, y no tienes por qué aguantarlo. No hiciste nada para provocarlo.'); next(true); break;
        case 'DISCRIMINACION':
          S.flags.add('DISCRIMINACION'); startSearch = true;
          say('Que te discriminen por ser quien eres es injusto y duele mucho. No es algo que tengas que aguantar.');
          ask('¿Dónde te está pasando?', 'open'); break;
        case 'DISCRIM_LUGAR':
          say('Que pase ahí lo hace aún más pesado, porque es un lugar donde tienes que estar seguido.'); next(true); break;
        case 'MED_EFECTO':
          S.flags.add('MED_EFECTO'); startSearch = true;
          say('Gracias por contármelo. Los efectos de un medicamento se pueden ajustar, y es importante que se lo cuentes pronto a quien te lo recetó.');
          ask('¿Qué es lo que más te ha molestado?', 'open'); break;
        case 'MED_PEOR':
          say('Eso es importante que lo sepa tu médico pronto: a veces hay que ajustar la dosis o cambiar de medicamento.'); next(true); break;
        case 'MED_DEJAR':
          S.flags.add('MED_DEJAR');
          say('Te entiendo. Pero antes de dejarlos, conversa con tu médico: dejarlos de golpe puede hacerte sentir peor. Se pueden ajustar o cambiar por otros.');
          say('Se lo dejo anotado al especialista.'); next(true); break;
        case 'TRAUMA':
          S.flags.add('TRAUMA'); startSearch = true; S.themes.add('sueno');
          say('Después de algo así es muy común tener pesadillas y revivirlo: es la forma en que la mente intenta procesar algo que asustó mucho. Tiene tratamiento.');
          ask('¿Cómo has estado durante el día?', 'estado'); break;
        case 'TRAUMA_EVITA':
          say('Tiene mucho sentido que te cueste. Eso también se puede trabajar con ayuda, de a poco y a tu ritmo.'); next(true); break;
        case 'CONTROL_PAREJA':
          S.flags.add('CONTROL_PAREJA'); S.flags.add('VIOLENCIA_PSICOLOGICA'); bump('mid'); startSearch = true; S.resources.add('1455'); S.themes.add('pareja');
          say('Que revise tu celular o no te deje ver a tus amistades no es amor, aunque te lo diga así: es control, y es una forma de violencia.');
          say('No es tu culpa. El 1455 orienta sobre esto, sin obligarte a hacer nada.');
          ask('¿Cómo te sientes en la relación?', 'estado'); break;
        case 'CONTROL_AMOR':
          say('Querer a alguien no incluye controlarlo. Tienes derecho a tu espacio, tu celular y tus amistades.'); next(true); break;
        case 'CONTROL_NORMAL':
          say('Pasa mucho, pero no es normal ni sano. Mereces una relación donde te sientas libre y en paz.'); next(true); break;
        case 'DUELO_GESTA':
          S.flags.add('DUELO_GESTA');
          S.flags.add('DUELO_GESTA'); S.themes.add('duelo'); startSearch = true;
          say('Lo siento muchísimo. Perder un embarazo es una pérdida real, y duele como tal, aunque otros no siempre lo entiendan.');
          ask('¿Cómo te has sentido estos días?', 'estado'); break;
        case 'MINIMIZAN':
          say('Que te digan eso, aunque sea con cariño, a veces hace sentir que tu pena no tiene espacio. Aquí lo tiene, y no hay apuro.'); next(true); break;
        case 'REPETIR':
          deferQ = false; { const lc = (S.lastContent || R.start.join(' ')).slice(-260); say((S.used.has('repetir') ? 'Lo que te dije fue: ' : 'Te decía: ') + (/^[A-ZÁÉÍÓÚ][a-záéíóúñ]/.test(lc) && !/^(Nexo|ConténMente|Chile|Ps\.|Dr)/.test(lc) ? lc.charAt(0).toLowerCase() + lc.slice(1) : lc)); } S.used.add('repetir'); if (pend) { S.pending = pend; S.lastQ = pend.type; } break;
        case 'NO_QUIERO_IR':
          say('Tiene sentido que no quieras ir. Ir a un lugar donde te hacen sentir así es muy difícil.');
          say(ADVICE.bullying); next(true); break;
        case 'AGRESOR_AYUDA':
          say('Pedir ayuda es exactamente lo correcto. El especialista ya está avisado y te va a orientar; también puedes llamar al 149 (Fono Familia).'); trackNext(); break;
        case 'QUEJA_ESP':
          S.flags.add('QUEJA_ESP');
          say('Lamento mucho que hayas tenido una mala experiencia. Eso no debería pasar.');
          say('Lo dejo anotado para el equipo, y puedes pedir que te atienda otra persona.'); casual(); break;
        case 'QUEJA_ESP2':
          S.flags.add('CAMBIO_ESPECIALISTA'); say('Está bien. Dejo anotado que prefieres que te atienda otra persona.'); casual(); break;
        case 'ELOGIO':
          say(pick(['Gracias, me alegra que este espacio te sirva.','Gracias. Ojalá le sirva a quien lo necesite.'],'elogio')); casual(); break;
        case 'SIN_RAZON':
          say('No necesitas una razón clara para escribir. A veces uno solo necesita que alguien lo lea.'); ask('¿Cómo ha estado tu día?', 'estado'); break;
        case 'CONVERSAR':
          say('Me alegra que hayas escrito. Aquí estoy para conversar, de lo que quieras.'); ask('¿Cómo ha estado tu día?', 'estado'); break;
        case 'TERCERO_NINO':
          urgent = true; showCrisis = true; S.resources.add('1515'); S.resources.add('147'); S.resources.add('131');
          say('Gracias por contármelo. Eres muy valiente.');
          say('Si se quiere hacer daño ahora, busca a un adulto: un vecino o un familiar, o llama al 131. No tienes que hacerte cargo de esto sin ayuda. También puedes llamar gratis al 1515.');
          ask('¿Hay algún adulto cerca al que le puedas avisar?', 'open'); break;
        case 'DUDA_DECISION':
          say('No tienes que decidirlo hoy. Es normal sentir cosas encontradas en un momento así.'); ask('¿Qué es lo que más te hace dudar?', 'open'); break;
        case 'MIEDO_RECAER':
          say('Es muy comprensible ese miedo. Que lo notes es una fortaleza: con el especialista puedes armar un plan para reconocer las señales a tiempo y saber a quién pedir ayuda.'); next(true); break;
        case 'SUST_FREC':
          say('Tomar todos los días cansa mucho el cuerpo y la cabeza. Y dejarlo sin ayuda es muy difícil: no es falta de voluntad.'); trackNext(); break;
        case 'SUST_RECAIDA':
          say('Que te haya costado no significa que no puedas. A mucha gente le toma varios intentos, y con apoyo es más posible.'); say('El 1412 te puede orientar, y el especialista también.'); trackNext(); break;
        case 'LO_HICE':
          urgent = true; showCrisis = true; crisisRes(); bump('high'); S.flags.add('POSIBLE_INTENTO');
          deferQ = false;
          say('Me preocupa mucho lo que me dices.');
          say('Si tomaste algo o te hiciste daño, llama ahora al 131 o pídele a alguien que llame por ti.');
          ask('¿Qué hiciste?', 'open'); break;
        case 'FAQ_PAIS2':
          say('Sí, puedes conversar aquí igual, y el especialista te puede leer. Solo ten en cuenta que los números de ayuda que te doy son de Chile.');
          casual(); break;
        case 'ALIM_FREC':
          say('Hacerlo tan seguido es muy duro para el cuerpo, y también agota por dentro.');
          say('Es importante que te vea un profesional pronto; el especialista te puede orientar sin juzgarte.');
          next(true); break;
        case 'AGUANTE':
          say(pick(['Lo estás haciendo muy bien al escribirme. Quedémonos aquí juntos un rato; esto que sientes va a bajar.','Ya aguantaste hasta aquí, y eso cuenta mucho. No estás sin compañía ahora.'],'aguante'));
          crisisNext(); break;
        case 'FAQ_LINEA': {
          const L = { '4141':'El *4141 es la línea de prevención del suicidio del Ministerio de Salud: atiende gratis, las 24 horas, con profesionales. Desde el celular marcas *4141 y llamar.', '131':'El 131 es el SAMU: emergencias médicas, gratis, las 24 horas.', '1515':'El 1515 es Línea Libre: un espacio de escucha para niños, niñas y jóvenes, gratis.', '133':'El 133 es Carabineros, para cuando estás en peligro.', '1455':'El 1455 orienta sobre violencia contra la mujer, gratis y las 24 horas.', '149':'El 149 es Fono Familia, de Carabineros: orienta sobre violencia en la familia.', '147':'El 147 es Fono Niños, de Carabineros: para niños y niñas que necesitan ayuda.', '1412':'El 1412 es el Fono Drogas y Alcohol: orientación gratis, las 24 horas.' };
          const k = (t.match(/\b(4141|131|1515|133|1455|149|147|1412)\b/) || [])[1] || (/linea libre/.test(t) ? '1515' : '4141');
          say(L[k]); casual(); break; }
        case 'FAQ_GRABA':
          say('No grabo audio ni nada fuera de este chat. Lo que escribes queda en tu conversación, y solo lo ve el especialista que toma tu caso.');
          casual(); break;
        case 'FAQ_CREADOR':
          say('Me hizo el equipo de ConténMente, junto a profesionales de salud mental, para acompañarte mientras un especialista humano toma tu caso.');
          if (/chatgpt|gpt|openai|ia|inteligencia/.test(t)) say('No soy ChatGPT: soy un asistente automático hecho para este servicio.');
          casual(); break;
        case 'FAQ_VOLVER':
          say('Sí, puedes volver a escribir cuando quieras, de día o de noche. Este espacio va a estar aquí.');
          casual(); break;
        case 'FAQ_SIN_PLATA':
          say('Este servicio no tiene costo para ti.');
          say('Además, en el CESFAM de tu comuna puedes pedir atención de salud mental por FONASA, y el especialista te puede orientar sobre opciones gratuitas o de bajo costo.');
          casual(); break;
        case 'FAQ_PROMESA':
          say('Lo que escribes aquí es confidencial: solo lo ve el especialista que toma tu caso.');
          say('No te puedo prometer secreto absoluto en un solo caso: si tu vida o la de otra persona corre peligro, podríamos tener que buscar ayuda para protegerte, y te lo diríamos. Fuera de eso, puedes contarme con confianza.');
          break;
        case 'DISTRAER':
          say('Claro. A veces distraerse un rato ayuda.');
          ask('¿Te gusta la música, las series, los animales, el fútbol…? Elige algo y conversamos de eso.', 'tema'); break;
        case 'ALGO_BONITO':
          { const BON = ['Algo bonito: las nutrias marinas se toman de las manos cuando duermen, para no separarse con la corriente.','Algo bonito: en algunos años de lluvia, el desierto de Atacama se cubre de flores. Le llaman "desierto florido", y es de las cosas más lindas que pasan en Chile.','Algo bonito: hay estudios que muestran que las vacas tienen "mejores amigas", y se estresan menos cuando están juntas.','Algo bonito: los pingüinos de Humboldt, que viven en la costa de Chile, suelen volver cada año a reencontrarse con su misma pareja.','Algo bonito: cuando un bebé agarra tu dedo con fuerza, es un reflejo que trae desde que nace. Viene "de fábrica" sabiendo aferrarse a alguien.','Algo bonito: algunos árboles comparten nutrientes con los árboles vecinos a través de hongos en sus raíces, como si se cuidaran entre ellos.'];
            const next1 = BON.find((x, i) => !S.used.has('bonito:' + i));
            if (next1) { S.used.add('bonito:' + BON.indexOf(next1)); say(next1); ask(pick(['¿Quieres otro, o me cuentas algo de ti?','¿Te cuento otro?'],'bonQ'), 'open', ['Otro','Mejor conversemos']); }
            else { say('Por ahora se me acabaron las cosas bonitas.'); ask('¿Me cuentas tú algo que te guste?', 'libre'); } } break;
        case 'MALTRATO_MENOR':
          setTrack('violence'); bump('mid'); startSearch = true; S.flags.add('MALTRATO_MENOR'); crisisRes(['147','1515']);
          say('Que te traten así da mucho miedo, y no es tu culpa. Ningún niño ni niña merece que lo traten mal.');
          say('Puedes contarle a un adulto de confianza, como un profe o alguien de tu familia. También puedes llamar gratis al 147 (Fono Niños) o al 1515.');
          ask('¿Hay algún adulto con quien te sientas seguro o segura?', 'open'); break;
        case 'ARMA':
          S.flags.add('MEDIOS'); if (/\b(pistola|arma|revolver|escopeta|rifle)\b/.test(t)) S.flags.add('ARMA_FUEGO'); if (/\b(cuerda|soga)\b/.test(t)) S.flags.add('MEDIO_FEM'); bump('mid'); startSearch = true;
          say('Gracias por contármelo.');
          ask(/\b(pistola|arma|revolver|escopeta|rifle)\b/.test(t) ? 'Te pregunto directo, porque me importa: ¿estás pensando en usarla para hacerte daño o para hacerle daño a alguien?' : (/\b(cuerda|soga)\b/.test(t) ? 'Te pregunto directo, porque me importa: ¿estás pensando en usarla para hacerte daño?' : 'Te pregunto directo, porque me importa: ¿estás pensando en usarlo para hacerte daño?'), 'arma', /\b(pistola|arma|revolver|escopeta|rifle)\b/.test(t) ? ['No, para nada','Sí, a mí','A otra persona','No sé'] : ['No, para nada','Sí','No sé']); break;
        case 'DONDE_CASA':
          say('Ok. Quédate ahí por ahora, por favor, y sigue conversando conmigo.'); crisisNext(); break;
        case 'ANIVERSARIO': {
          S.themes.add('duelo'); startSearch = true;
          const who = personIn(t);
          say('Los aniversarios remueven mucho. Es muy natural que hoy ' + (who ? `extrañes a ${who} con más fuerza.` : 'la pena se sienta con más fuerza.'));
          ask(who ? `¿Quieres contarme un poco de ${who}?` : '¿Quieres contarme un poco de esa persona?', 'open'); break; }
        case 'NECESIDAD_BASICA':
          S.flags.add('NECESIDAD_BASICA'); S.themes.add('dinero'); startSearch = true;
          say('Gracias por contármelo. No tener para comer es muy angustiante, y no tienes por qué pasarlo sin apoyo.');
          say('En la municipalidad de tu comuna (DIDECO) pueden orientarte con ayuda social. Se lo dejo anotado al especialista también.');
          if (!S.flags.has('SIN_VIVIENDA') && !S.used.has('techoQ')) { S.used.add('techoQ'); ask('¿Tienes dónde quedarte esta noche?', 'techo', ['Sí','No']); } else next(true); break;
        case 'CESANTE':
          S.themes.add('despido'); startSearch = true;
          say('Estar sin trabajo pesa mucho, en la plata y en el ánimo.');
          next(true); break;
        case 'AGRESION_CALLE':
          setTrack('violence'); bump('high'); startSearch = true; showCrisis = true; crisisRes(['133']); S.flags.add('VIOLENCIA');
          say('Lo que te hicieron es grave y no es tu culpa. Nadie merece ser agredido, y menos por ser quien es.');
          say((noCall() ? 'Si estás herido o herida, consulta en un servicio de urgencia.' : 'Si estás herido o herida, consulta en un servicio de urgencia o llama al 131.') + ' Si quieres denunciar, puedes hacerlo en Carabineros (133) o en la PDI.');
          if (F.safe === null && !S.safevDone) ask('¿Ahora estás en un lugar seguro?', 'safev', CHIPS.safe); else trackNext(); break;
        case 'MATAR_IDIOMA':
          say('Suena a que te da mucho miedo cómo van a reaccionar.');
          ask('¿Lo dices porque se van a enojar mucho, o porque te podrían hacer daño?', 'matarIdiom', ['Se van a enojar','Me podrían hacer daño']); break;
        case 'LUGAR_CHECK':
          bump('mid'); S.flags.add('LUGAR_RIESGO');
          ask('Te pregunto directo, porque me importa: ¿estás ahí pensando en hacerte daño?', 'lugarcheck', ['Sí','No','No sé']); break;
        case 'DUELO_SIN_DESPEDIDA':
          S.themes.add('duelo'); startSearch = true;
          say('Lo siento muchísimo. No haber podido despedirte hace que el duelo duela distinto; es muy común quedarse con cosas sin decir.');
          ask('Si pudieras decirle algo ahora, ¿qué le dirías?', 'open'); break;
        case 'CULPA_VIOLENCIA':
          say('No fue tu culpa. Nada de lo que hiciste, tomaste o llevabas puesto le da a nadie derecho a hacerte daño. La responsabilidad es solo de quien lo hizo.');
          if (!deferQ) trackNext(); break;
        case 'UNICO_MOTIVO': {
          const who = personIn(t) || ((t.match(/\b(mi|mis) (\w+)/) || [])[0] || '').replace(/^mi /,'tu ').replace(/^mis /,'tus ');
          startSearch = true; S.flags.add('RAZONES'); reflect(freshThemes, 1);
          say(who ? `Se nota lo importante que es ${who} para ti. Eso vale mucho; guárdalo cerca.` : 'Se nota lo importante que es eso para ti. Eso vale mucho.');
          if (!S.askedIdeation) { S.askedIdeation = true; bump('mid'); ask('Cuando dices que es lo único que te queda, me importa preguntarte: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); } else next();
          break; }
        case 'SUST_MALVIAJE':
          S.resources.add('1412'); startSearch = true;
          say('Eso puede pasar, sobre todo con mucha cantidad: la sensación asusta, pero suele bajar en unas horas.');
          say('Busca un lugar tranquilo, toma agua y, si puedes, quédate con alguien de confianza. ' + (noCall() ? 'Si te cuesta respirar o tienes dolor en el pecho, pide ayuda a alguien cerca.' : 'Si te cuesta respirar, tienes dolor en el pecho o te sientes muy mal, llama al 131.'));
          if (F.alone === null) ask('¿Estás con alguien ahora?', 'with', CHIPS.with); else next(true); break;
        case 'NO_AGUANTO':
          startSearch = true;
          say(pick(['Te creo que está siendo muy difícil. No tienes que aguantarlo sin compañía: aquí estoy, y el especialista ya está avisado.','Lo estás pasando muy mal, y aquí sigo contigo. Vamos de a poco, minuto a minuto.'],'noAg'));
          if (crisisMode()) { crisisNext(); break; }
          bump('mid');
          if (!S.askedIdeation || F.ideation === null) { S.askedIdeation = true; ask('Te lo pregunto directo, porque me importa: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); }
          else next();
          break;
        case 'AYUDA_URGENTE':
          startSearch = true; bump('mid');
          say('Estoy aquí. Ya pedí un especialista con prioridad.');
          ask('Para saber cómo ayudarte: ¿estás en un lugar seguro en este momento?', 'safe', CHIPS.safe); break;
        case 'DATOS_PROPIOS':
          say('Gracias, pero por seguridad mejor no compartas tu número ni datos personales aquí. El especialista te va a escribir por este mismo chat.');
          casual(); break;
        case 'BOT_LLAMA':
          say('Yo no puedo hacer llamadas.');
          if (/\b(131|133|ambulancia|samu|carabineros|pacos|bomberos)\b/.test(t) && !F.emergency) { say('Si es una emergencia, marca tú el 131 o pídele a alguien cerca que lo haga; responden a cualquier hora.'); ask('¿Qué está pasando?', 'open'); break; }
          if (F.emergency || urgent || RANK[S.risk] >= 2) say(F.emergency ? 'Pero tú o alguien cerca sí: marca el 131, y si no puedes hablar, deja la llamada abierta.' : 'Si es una emergencia, pídele a alguien cerca que llame al 131 por ti.');
          else if (/\b(131|133|4141)\b/.test(t)) say('Si es una emergencia, márcalo tú o pídele a alguien cerca que lo haga. Yo me quedo aquí contigo.');
          else if (/\b(me|nos) (pueden|puedes|podrian) llamar\b|\bllamame\b/.test(t)) { say('La atención es por este chat: aquí mismo te escriben.'); if (!noCall()) say('Si necesitas hablar por teléfono con alguien ahora, el *4141 atiende las 24 horas.'); }
          else say('Pero el especialista sí te puede ayudar a pensar cómo contactar a quien necesites.');
          casual(); break;
        case 'FAQ_NUMEROS':
          crisisRes(); S.resources.add('133');
          say('Estos números atienden en Chile, gratis:\n• *4141: prevención del suicidio, 24 horas.\n• 131: SAMU, emergencias médicas.\n• 1515: Línea Libre, para jóvenes.\n• 133: Carabineros, si estás en peligro.');
          casual(/\b(si me siento|por si|en caso|si alguna vez)\b/.test(t) ? '¿Te estás sintiendo mal ahora?' : '¿Cómo te estás sintiendo tú?'); break;
        case 'FAQ_WHATSAPP':
          say('Por ahora el contacto es por este chat: aquí mismo te va a escribir el especialista.');
          casual(); break;
        case 'FAQ_PAIS':
          S.flags.add('FAQ_PAIS'); say('Este servicio funciona en Chile, pero igual puedes conversar aquí conmigo.');
          say('Si estás en peligro, llama al servicio de emergencias del país donde estás.');
          casual(); break;
        case 'FAQ_ESPECIALISTA':
          if (/\b(hombre|mujer)\b/.test(t)) say('Depende de quién esté disponible. Si te acomoda más hablar con un hombre o con una mujer, dímelo y lo dejo anotado para que se intente respetar.');
          else if (/\belegir\b/.test(t)) say('Si tienes alguna preferencia, por ejemplo que sea hombre o mujer, dímela y la dejo anotada para el equipo.');
          else if (/\bcobra\b/.test(t)) say('Para ti no tiene costo.');
          else if (/\bpresencial\b/.test(t)) say('La primera conversación es por aquí. Si necesitas atención presencial, el especialista te puede orientar sobre dónde y cómo.');
          else say('Sí. Quienes atienden son personas reales: profesionales de salud mental del equipo.');
          casual(); break;
        case 'FAQ_RIESGO':
          say('Leo lo que escribes buscando señales de riesgo, como ideas de quitarse la vida, planes, autolesiones o violencia. Si aparecen, pregunto directo, entrego líneas de ayuda y aviso con prioridad a un especialista humano.');
          if (S.flags.has('PROFESIONAL')) say('Puedes probar escribiendo como lo haría alguien que consulta, con faltas o jerga incluidas.');
          casual(); break;
        case 'FAQ_BORRAR':
          if (S.used.has('borrar')) { say('Lo entiendo. Se lo dejo anotado al equipo para que lo tengan en cuenta.'); S.flags.add('PIDE_BORRAR'); casual(); break; } S.used.add('borrar');
          say('Con el botón «Olvidar esta conversación en este dispositivo», abajo, deja de verse en este celular o computador. Y arriba está «Salir rápido», por si necesitas cerrar de inmediato.');
          say('Lo que ya escribiste queda guardado de forma confidencial, solo para el equipo que te atiende. Si quieres que lo eliminen, puedes pedírselo al especialista.');
          casual(); break;
        case 'FAQ_SISTEMA':
          if (/\b(entiende|cae bien|gusta|ayuda|sirve)\b/.test(t)) say('Puedes decírselo con confianza; está para eso. Y si no te acomoda, se puede buscar a otra persona.');
          else { say('Si nadie contesta pronto, una especialista de guardia toma tu caso. Y mientras tanto, aquí sigo contigo.'); if (!noCall()) say('Si es urgente, el *4141 atiende las 24 horas.'); }
          casual(); break;
        case 'PROFESIONAL':
          S.flags.add('PROFESIONAL');
          say('¡Hola! Qué bueno que estés probando. Puedes escribir como lo haría alguien que consulta, con faltas o jerga incluidas, y ver cómo responde el acompañamiento.');
          say('En la pestaña "Especialista" está el panel con las alertas y los casos.'); break;
        case 'HORA': {
          const d = new Date(); let hh = d.getHours(), mm = d.getMinutes();
          try { const pr = new Intl.DateTimeFormat('es-CL', { timeZone:'America/Santiago', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(d); hh = +pr.find(x => x.type === 'hour').value % 24; mm = +pr.find(x => x.type === 'minute').value; } catch (e) { /* sin zona horaria */ }
          say(`Son las ${hh}:${String(mm).padStart(2,'0')}.`);
          if (hh >= 0 && hh < 6) say('Es tarde. Las noches a veces se hacen más pesadas.');
          casual(); break; }
        case 'LUGAR_ATENCION':
          say('No puedo ver dónde estás, pero si es una emergencia llama al 131 (SAMU): te orientan o envían ayuda.');
          say('Si no es urgente, puedes ir al SAPU o al CESFAM más cercano a tu casa.');
          casual(); break;
        case 'SARCASMO':
          say(pick(['Me da la impresión de que no tanto. Si quieres contarme cómo estás de verdad, aquí estoy.','Te leo. No tienes que estar bien para escribir aquí.'],'sarc'));
          break;
        case 'PANICO':
          S.flags.add('PANICO'); S.themes.add('ansiedad'); startSearch = true;
          if (!S.used.has('panico')) { S.used.add('panico'); say('Lo que describes suena a una crisis de angustia o pánico. Es muy intensa y asusta mucho, pero suele bajar en unos minutos.'); say('Si tienes un dolor fuerte en el pecho, te desmayas o no mejora, llama al 131.'); ask('¿Quieres que respiremos juntos ahora?', 'respirar', ['Respirar juntos','Ahora no']); }
          else { S.n.panico = (S.n.panico||0) + 1; say(S.n.panico === 1 ? 'Sigo aquí contigo. Intenta botar el aire lento, más lento de lo que lo tomas.' : pick(['Lo que sientes en el cuerpo es muy real, y va a bajar. Apoya los pies en el suelo y nota cómo te sostiene.','Es tu cuerpo en alerta, no un peligro real. Bota el aire lento por la boca, como si apagaras una vela.'],'pan3')); ask(pick(['¿Respiramos juntos un minuto?','¿Hacemos la respiración guiada juntos?'],'panQ'), 'respirar', ['Respirar juntos','Ahora no']); }
          break;
        case 'IDEACION_HIPERBOLE':
          bump('mid'); S.askedIdeation = true; reflect(freshThemes, 1);
          say('Sé que a veces se dice así cuando algo nos sobrepasa. Igual te lo pregunto en serio, porque me importa.');
          ask('¿Has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); break;
        case 'AMENAZA_SUICIDA':
          S.flags.add('AMENAZA_SUICIDA'); S.flags.add('TERCERO'); setTrack('amenaza'); startSearch = true; crisisRes(); bump('mid');
          say('Eso es muy difícil de vivir. Cuando alguien amenaza con hacerse daño si no haces lo que pide, hay que tomarlo en serio, pero tú no eres responsable de su decisión ni tienes que ceder por eso.');
          say('Si crees que está en peligro ahora, avisa a alguien cercano a esa persona o llama al 131. El *4141 también te puede orientar a ti.');
          ask('¿Cómo estás tú con todo esto?', 'estado'); break;
        case 'AMENAZA_DUDA':
          say('Es muy difícil saberlo. Lo más seguro es tomarlo en serio sin ceder a la presión: puedes decirle que te importa que esté a salvo y avisar a alguien cercano a esa persona.');
          say('Presionarte con eso tampoco está bien, y el especialista te puede ayudar a pensar cómo cuidarte tú.');
          trackNext(); break;
        case 'AMENAZA_CULPA':
          say('No es tu culpa. Cada persona es responsable de sus actos, y tú tienes derecho a decidir sobre tu vida y tus relaciones.');
          trackNext(); break;
        case 'TERCERO_REDES':
          S.flags.add('TERCERO_REDES'); S.flags.add('TERCERO'); setTrack('redes'); startSearch = true; bump('mid');
          say('Hiciste bien en preocuparte. Lo más útil es reportar esa publicación en la misma red social: tienen una opción para avisar que alguien podría estar en riesgo, y activan ayuda.');
          say('Si conoces a la persona o sabes dónde está y el peligro es inmediato, llama al 133.');
          ask('¿Y tú cómo te quedaste después de ver eso?', 'estado'); break;
        case 'TERCERO_REDES2':
          if (S.used.has('redes2')) say('Ya hiciste lo más importante. No es tu responsabilidad salvar a alguien que no conoces; con reportarlo basta.');
          else say('Si no la conoces, lo mejor que puedes hacer es reportar la publicación (en los tres puntos o en "Denunciar", opción de suicidio o autolesión). No tienes que hacer más que eso.');
          S.used.add('redes2');
          trackNext(); break;
        case 'CICATRICES':
          S.flags.add('CICATRICES'); S.flags.add('AUTOLESION_PASADA'); bump('mid'); startSearch = true;
          say('Gracias por contármelo. Esas marcas hablan de algo que dolió mucho, y no tienes que avergonzarte de ellas.');
          ask('¿Te has vuelto a hacer daño últimamente?', 'autoles', ['Sí','No']); break;
        case 'ESPERA_HORA':
          say('Se puede hacer largo esperar. Mientras tanto no tienes que aguantar sin apoyo: aquí estoy, y el especialista también te puede acompañar.');
          if (!noCall()) say('Si se pone muy difícil antes, el *4141 atiende las 24 horas.');
          next(true); break;
        case 'MEDIOS_RECHAZO':
          urgent = true; showCrisis = true; crisisRes(); S.flags.add('MEDIOS_CERCA'); F.meansAway = false; deferQ = false;
          say('Entiendo que ahora no quieras soltarlo, y no te voy a retar.');
          S.used.add('meansHR'); ask('¿Podrías al menos dejarlo sobre una mesa o en el suelo, lejos de tu mano, mientras conversamos?', 'means', ['Ya lo dejé','No puedo']); break;
        case 'MEDIOS_CRISIS':
          urgent = true; showCrisis = true; crisisRes(); bump('high'); setTrack('suicide'); startSearch = true; S.flags.add('MEDIOS'); S.flags.add('MEDIOS_CERCA'); F.meansAway = null; S.asked.means = 0;
          say(pick(['Gracias por decírmelo. Es importante que lo sepa.','Gracias por contármelo; me importa que estés a salvo.'],'medios1'));
          ask(/\b(en la mano|en mis manos|aqui conmigo|lo tengo aqui|la tengo aqui|al lado)\b/.test(t) ? '¿Puedes soltarlo y dejarlo lejos de ti, aunque sea en otra pieza, mientras conversamos?' : (mo => pick([`¿Puedes dejar${mo.cl} lejos de ti ahora, en otra pieza o con alguien de confianza? Eso te cuida mucho.`, `¿Podrías dejar ${mo.noun} lejos de ti, aunque sea en otra pieza, mientras conversamos?`],'medios2'))(meansObj()), 'means', CHIPS.means); break;
        case 'RETRACTA':
          F.called = 'retracta'; S.flags.add('RETRACTA_EMERGENCIA');
          if (!S.used.has('retracta')) { S.used.add('retracta'); say('Ok, te creo, y me alegra que no lo hayas hecho.'); say('Igual, si llegaste a tomar algo, aunque sea poco, dímelo: es importante que te vea un médico. Y si estás pasando por algo difícil, aquí estoy.'); ask('¿Cómo estás de verdad?', 'estado'); }
          else { say('Ok, gracias por aclararlo.'); next(true); }
          break;
        case 'CORRIGE':
          S.flags.add('CORRECCION'); S.pending = null;
          if (S.track === 'suicide' && !F.emergency) { S.track = null; F.ideation = null; F.safe = F.safe === false ? false : F.safe; }
          deferQ = false;
          say('Ah, gracias por aclararlo, y perdona la confusión.');
          say('Igual, si en algún momento te pasa algo así, aquí lo puedes decir con confianza.');
          reflect(freshThemes, 1);
          ask(/\bmudar/.test(t) ? '¿Cómo te sientes con la mudanza?' : '¿Qué querías contarme?', 'open'); break;
        case 'REVELA_PROPIO':
          S.flags.delete('TERCERO'); S.track = null; setTrack('suicide'); S.thirdDanger = false;
          bump('high'); S.flags.add('IDEACION'); F.ideation = true; showCrisis = true; crisisRes(); startSearch = true; urgent = true;
          say('Gracias por contármelo. Sé que a veces es más fácil decirlo así, y me alegra que me lo hayas dicho directo.');
          say('Ya avisé con prioridad a un especialista. No te voy a dejar con esto sin apoyo.');
          if (F.safe === null) ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe); else crisisNext(); break;
        case 'NOTICIA_SUICIDIO':
          S.flags.add('NOTICIA_SUICIDIO'); bump('mid'); startSearch = true;
          say('Las noticias así impactan mucho, sobre todo cuando esa persona era importante para ti o cuando remueven cosas propias.');
          ask('¿Cómo te dejó a ti esa noticia?', 'estado'); break;
        case 'PREG_SUICIDIO':
          S.riskPreFaq = S.risk; bump('mid'); S.askedIdeation = true;
          say('Es una pregunta muy importante. Casi nunca hay una sola razón: suele juntarse un dolor muy grande con la sensación de que no hay salida, muchas veces con depresión u otras dificultades.');
          say('Lo esperanzador es que ese dolor se puede tratar, y pedir ayuda funciona.');
          ask('¿Te lo preguntas por algo que estás viviendo tú, o alguien cercano?', 'pregsui', ['Por mí','Por alguien cercano','Solo curiosidad']); break;
        case 'PLAN_AMBIGUO':
          bump('mid'); S.flags.add('FRASE_AMBIGUA'); S.planAmbTurn = S.turn;
          ask('¿Qué es lo que vas a hacer?', 'planamb'); break;
        case 'BROMA_BOT':
          say(pick(['Jaja, aquí estoy, no me he ido. Perdona si me demoré.','Aquí sigo, tranqui. Perdona la demora.'],'brbot'));
          casual('¿Cómo estás tú?'); break;
        case 'MED_NORMAL':
          say('Ok, gracias por contarme. Si en algún momento tomas más de lo indicado, o lo mezclas con alcohol, avísame.');
          next(true); break;
        case 'MASCOTA':
          S.flags.add('MASCOTA'); startSearch = true;
          if (!S.used.has('mascota')) { S.used.add('mascota'); say('Lo siento mucho. Una mascota es parte de la familia, y verla así duele muchísimo.'); ask('¿Cómo se llama?', 'petname'); }
          else { say(pick(['Qué difícil. Acompañarla en esto duele mucho, y se nota cuánto la quieres.','Estar con ella en este momento también es una forma de cuidarla.'],'masc2')); next(true); }
          break;
        case 'NOTICIA2':
          S.used.add('noticiaQ');
          say('Es muy humano que te afecte. A veces esas noticias también remueven lo propio.');
          ask('¿Te removió algo tuyo, algo que estés viviendo?', 'open'); break;
        case 'DIAGNOSTICO':
          S.flags.add('DIAGNOSTICO'); S.themes.add('salud'); startSearch = true;
          say('Lo siento mucho. Recibir un diagnóstico así remece todo, y es normal sentir miedo, rabia o confusión, todo junto.');
          ask('¿Hace cuánto te lo dijeron?', 'cuando'); break;
        case 'DIAG_MIEDO':
          say('Tiene todo el sentido tener miedo. No tienes que enfrentarlo sin compañía, ni tener todas las respuestas ahora.');
          next(true); break;
        case 'GESTA_TIEMPO':
          say('Ya había todo un mundo de planes e ilusiones con ese embarazo. Es una pérdida de verdad, y merece su duelo.');
          next(true); break;
        case 'RECAIDA_MIEDO':
          say('Ese miedo tiene mucho sentido después de lo que viviste. Que lo puedas nombrar ya es una forma de cuidarte.');
          ask('¿Sabes reconocer las primeras señales de cuando empiezas a estar mal?', 'open'); break;
        case 'MASCOTA_EDAD':
          say(pick(['Es mucho tiempo juntos. Es normal que el vacío se sienta enorme.','Toda una vida compartida. Ese vacío pesa mucho.'],'mascEdad'));
          next(true); break;
        case 'PET_NAME': {
          const mm = String(a.raw).match(/se llama(?:ba)?\s+(\S+)/i); const nm = ((mm ? mm[1] : String(a.raw).trim().split(/\s+/)[0]) || '').replace(/[^\p{L}]/gu, '');
          say(nm ? `${nm.charAt(0).toUpperCase() + nm.slice(1)}. Se nota lo importante que es para ti.` : 'Se nota lo importante que es para ti.');
          ask('¿Cuánto tiempo llevan juntos?', 'open'); break; }
        case 'GOLPE_PARED':
          say('Cuando la rabia es tanta, a veces sale así. Golpear la pared igual te puede lastimar, y tu cuerpo merece cuidado.');
          ask('¿Qué pasó para que llegaras a sentir tanta rabia?', 'open'); break;
        case 'DOLOR_GOLPE':
          say('Revisa tu mano: si está muy hinchada, no la puedes mover o el dolor es muy fuerte, es importante que te vean, porque puede haber una fractura. Mientras, ponle algo frío envuelto en un paño.');
          next(true); break;
        case 'ENTUMECIDO':
          S.themes.add('animo'); S.distress++; startSearch = true;
          say('Sentir que ya no sientes nada es muy desconcertante, y suele aparecer cuando uno lleva mucho tiempo aguantando.');
          next(); break;
        case 'DUELO_SUICIDIO':
          S.flags.add('DUELO_SUICIDIO'); bump('mid'); startSearch = true; S.themes.add('duelo');
          say('Lo siento muchísimo. Perder a alguien así es uno de los dolores más grandes que hay, y suele dejar muchas preguntas.');
          ask('¿Cómo has estado desde que pasó?', 'open'); break;
        case 'CULPA_DUELO':
          say(pick(['Es muy común sentir culpa después de una pérdida así. Pero una decisión así casi nunca depende de una sola cosa ni de una sola persona. No es tu culpa.','Ese "y si hubiera…" es parte del duelo, pero no te hace responsable de lo que pasó.'],'culpaD'));
          next(); break;
        case 'FAQ_PROTOCOLO':
          S.riskPreFaq = S.risk; bump('mid'); S.askedIdeation = true;
          say('Si alguien me dice eso, lo tomo en serio: le pregunto si está a salvo, le doy las líneas de ayuda y aviso con prioridad a un especialista humano, que le escribe por aquí mismo.');
          ask('¿Te está pasando algo así a ti ahora?', 'ideacion', CHIPS.ideacion); break;
        case 'METODO_EXCUSA':
          say(S.used.has('metExc') ? 'Eso no lo voy a compartir, sea para lo que sea.' : 'Entiendo. Igual no puedo dar esa información, aunque sea para un trabajo o una historia: podría dañar a alguien.'); S.used.add('metExc');
          if (!deferQ) casual('Si en algún momento te pasa a ti, aquí estoy. ¿Cómo estás tú?'); break;
        case 'TERCERO_MAL':
          setTrack('helper'); startSearch = true; S.flags.add('TERCERO_PREOCUPA');
          if (/\b(toma|bebe|droga|consume|fuma|curad)/.test(t)) S.resources.add('1412');
          say(pick(['Se nota que te preocupa mucho. Hiciste bien en escribir.','Qué difícil ver así a alguien que quieres. Gracias por escribir.'],'tmal'));
          { const who = personIn(t); S.tercWho = who || S.tercWho; ask(BEH.test(t) ? `¿Qué más has notado en ${who || 'esa persona'} últimamente?` : `¿Qué está pasando con ${who || 'esa persona'}?`, 'open'); } break;
        case 'HELPER_IFYES':
          say('Si te dice que sí: mantén la calma, agradécele que te lo cuente y no le prometas guardar el secreto.');
          say('No lo dejes sin compañía, aleja lo que pueda usar para hacerse daño y busquen ayuda ese mismo día: el *4141 los orienta, y si hay riesgo inmediato, el 131.');
          trackNext(); break;
        case 'HELPER_NOQUIERE':
          say('Es muy común que al principio no quiera ayuda. No se puede obligar a nadie, pero sí puedes seguir cerca, sin presionar ni retar, y decirle que vas a estar ahí cuando quiera.');
          say(S.resources.has('1412') ? 'Para el consumo, el 1412 (Fono Drogas y Alcohol) orienta también a las familias, las 24 horas.' : 'El especialista también te puede orientar a ti sobre cómo acompañar.');
          trackNext(); break;
        case 'HELPER_CALMA':
          say('Qué bueno que se haya calmado un poco.');
          say(S.thirdDanger || S.flags.has('TERCERO') ? 'Igual no la dejes sin compañía por ahora, y si pueden, llamen juntos al *4141 para que los orienten sobre los próximos pasos.' : 'Que te tenga cerca le hace bien.');
          trackNext(); break;
        case 'HELPER_CERRADO':
          say('Cuando alguien se cierra así, cuesta mucho saber qué le pasa. No tienes que adivinarlo: a veces basta con estar cerca, sin presionar, y decirle que estás ahí.');
          trackNext(); break;
        case 'HELPER_SUST':
          S.resources.add('1412');
          say('Ver a alguien que quieres con un consumo así preocupa y cansa mucho.'); say('El 1412 (Fono Drogas y Alcohol) orienta gratis a las familias, las 24 horas.');
          trackNext(); break;
        case 'MIEDO_CONTAR':
          say('Es muy comprensible tener miedo de contarlo. No tienes que hacerlo hoy, ni sin apoyo.');
          say('El especialista te puede ayudar a pensar cómo y cuándo decirlo, si quieres hacerlo.');
          if (!deferQ) next(true); break;
        case 'POSPARTO_CULPA':
          say('Muchas mamás sienten eso en los primeros meses, y no significa que lo seas. Habla de lo exigido y cansado que está todo, no de cuánto quieres a tu guagua.');
          if (!deferQ) next(); break;
        case 'POSPARTO_SOLA':
          say('Estar con la guagua sin apoyo durante el día agota muchísimo. Necesitar ayuda no te hace menos capaz.');
          if (!deferQ) next(); break;
        case 'NO_CREEN':
          say('Que no te crean duele muchísimo. Yo sí te creo, y lo que te pasa no es tu culpa.');
          if (S.minor) S.used.add('tip:violence');
          say(S.minor ? 'Si tu mamá no te cree, busca a otro adulto de confianza: un profe, el orientador, otro familiar. También puedes llamar gratis al 147 o al 1515.' : 'Si alguien no te cree, eso no lo hace menos real. El especialista te va a escuchar y a orientar.');
          trackNext(); break;
        case 'NO_DENUNCIA':
          say('Está bien, no tienes que denunciar si no quieres. Esa decisión es tuya.');
          say('El especialista te puede orientar sobre otras opciones, y el 1455 y el 149 también orientan sin obligarte a hacer una denuncia.');
          trackNext(); break;
        case 'VIOL_MIEDO':
          say(pick(['Es muy normal tener miedo con lo que estás viviendo. Contarlo, como lo estás haciendo, es muy valiente.','Tiene todo el sentido que tengas miedo. No estás sin compañía en esto.'],'violM'));
          if (!deferQ) trackNext(); break;
        case 'HELPER_HOW':
          if (a.intents.includes('TERCERO')) { S.flags.add('TERCERO'); crisisRes(); showCrisis = true; startSearch = true; bump('mid'); }
          if (S.thirdDanger && !S.used.has('howNow')) { S.used.add('howNow'); say('Quédate a su lado y háblale con calma: "Estoy aquí contigo y no me voy a ir". No necesitas tener las palabras perfectas.'); say('Escúchala sin discutir ni retar, y si puedes, aleja lo que pueda usar para hacerse daño. Si la ves en peligro, llama al 131.'); trackNext(); break; }
          if (/\b(matar|suicid|morir|quitar|dano|cortar)/.test(t) && !S.used.has('howSui')) { S.used.add('howSui'); say('Puedes preguntarle directo y con calma, en un momento a solas: "Me preocupas. ¿Has pensado en quitarte la vida?". Preguntarlo no le mete la idea; al contrario, suele aliviar.'); say('Si se enoja, no pasa nada: dile que preguntas porque te importa y que vas a estar ahí. Si te dice que sí, no lo dejes sin compañía y busquen ayuda ese mismo día (*4141).'); trackNext(); break; }
          if (S.minor && /\btu (mama|papa)\b/.test(S.tercWho || '') && !S.used.has('howHijo')) { S.used.add('howHijo'); say(`No te toca a ti sanar a ${S.tercWho}. Puedes decirle que l${/mama/.test(S.tercWho) ? 'a' : 'o'} quieres y que te preocupa, y contarle a otro adulto de confianza (otro familiar, un profe o alguien del colegio) para que l${/mama/.test(S.tercWho) ? 'a' : 'o'} ayude a consultar.`); say('Y tú también mereces apoyo: el 1515 (Línea Libre) escucha a jóvenes, gratis.'); trackNext(); break; }
          say('Puedes empezar con algo simple y directo, en un momento tranquilo: "He notado que lo estás pasando mal y me preocupas. ¿Cómo estás de verdad?".');
          say('Escucha sin retar ni minimizar. Si te cuenta que se hace daño o que piensa en morir, agradécele la confianza y busquen ayuda juntos (el *4141 también orienta a quien acompaña).');
          trackNext(); break;
        case 'GROOM_SIGUE':
          say('Si puedes, bloquéala ahora y no le respondas más. Antes, guarda capturas de los mensajes.');
          trackNext(); break;
        case 'VIOL_CERCA':
          S.used.add('violAway'); urgent = true;
          say('Si puedes, sal de ahí con tu celular y ve donde un vecino o alguien de confianza.');
          say('Si sientes que te va a hacer daño, llama al 133. Yo sigo aquí contigo.');
          S.lastQ = 'open'; break;
        case 'TEMA_LIBRE': {
          say(S.used.has('libre1') ? pick(['Buena elección.','Me gusta.'],'libre2') : 'Me parece bien despejarse un rato.'); S.used.add('libre1');
          const q = /futbol|partido|equipo|colo|la u\b/.test(t) ? '¿De qué equipo eres?' : /musica|cancion|banda|escuchar/.test(t) ? '¿Qué estás escuchando últimamente?' : /serie|pelicula|netflix|anime/.test(t) ? '¿Qué has visto que te haya gustado?' : /juego|jugar|play|fortnite|minecraft|lol\b/.test(t) ? '¿A qué juegas?' : 'Cuéntame, ¿qué te gusta de eso?';
          ask(q, 'libre'); break; }
        case 'OPCION':
          say('Es una opción que vale la pena pensar con calma, sin apuro.');
          ask('¿Qué te hace dudar?', 'open'); break;
        case 'SECRETO':
          if (S.flags.has('TRATAMIENTO') || /psicolog|psiquiatr|terapeut/.test(S.lastBot + ' ' + t)) { const pr = /psiquiatr/.test(t) ? 'tu psiquiatra' : /psicologa/.test(t) ? 'tu psicóloga' : /terapeut/.test(t) ? 'tu terapeuta' : /psiquiatr/.test(S.lastBot) ? 'tu psiquiatra' : 'tu psicólogo o psicóloga'; say(`Tiene sentido que cueste. Contarle a ${pr} cómo estás de verdad puede ayudar a que el tratamiento te sirva más.`); next(true); break; }
          if (S.track === 'past') { say('Gracias por confiarme algo que nunca habías contado. Eso requiere mucho valor.'); say('Aquí puedes ir a tu ritmo; no tienes que contar nada más de lo que quieras.'); trackNext(); break; }
          if (S.track === 'violence' && S.minor) { S.used.add('tip:violence'); say('Entiendo que no quieras que se sepa; da mucho miedo. Pero lo que te pasa no está bien, y mereces que un adulto te proteja.'); say('No tienes que contarlo a todos: basta con un adulto de confianza, como un familiar, el orientador o un profe que no sea esa persona. El 147 y el 1515 también te escuchan, gratis.'); trackNext(); break; }
          if (S.track === 'grooming') { say('Entiendo que dé miedo contarlo. Pero contarle a un adulto de confianza es lo que más te puede proteger, y no te van a culpar a ti.'); trackNext(); break; }
          if (S.minor && (crisisMode() || RANK[S.risk] >= 2)) { say('Entiendo que cueste contarlo. Igual me gustaría que un adulto de confianza supiera cómo estás: tu mamá o tu papá, un profe o alguien del colegio.'); say('No tienes que contarle todo; basta con decirle "no estoy bien y necesito ayuda".'); next(true); break; }
          if (crisisMode()) { say('Entiendo que cueste. No tienes que contarle todo: a veces basta con decir "no estoy bien, ¿te puedes quedar conmigo?".'); next(true); break; }
          if (!S.flags.has('VIOLENCIA') && RANK[S.risk] < 2 && ['pareja','estudios','familia','soledad','trabajo','despido','dinero'].some(x => S.themes.has(x)) && !['alimentacion','autoestima','embarazo','identidad'].some(x => S.themes.has(x))) { say('A veces contarle a alguien de confianza, aunque sea un poco, alivia. Pero no tienes que hacerlo si no quieres.'); next(true); break; }
          say(pick(['Está bien. No tienes que contarle a nadie ahora si no quieres.','Entiendo. Es tu decisión a quién contarle y cuándo.'],'secreto'));
          say('Si algún día quieres hacerlo, el especialista te puede ayudar a pensar cómo.');
          next(true); break;
        case 'NO_LO_HARIA':
          if (!RISKY_OWN(S) && !S.askedIdeation && F.ideation === null && !S.flags.has('PASIVA') && !S.flags.has('AUTOLESION')) { say('Qué bueno. A veces las ganas aparecen fuertes, y lo importante es no hacerle daño a nadie, ni a ti.'); next(true); break; }
          say('Gracias por contarme eso; me alivia leerlo. Igual esos pensamientos pesan, y vale la pena conversarlos con el especialista.');
          if (!crisisMode() && F.ideation === null && (S.asked.ideacion||0) < MAXASK.ideacion && !deferQ) { S.askedIdeation = true; S.flags.add('SIN_PLAN'); ask('Para entenderte bien: ¿aparecen pensamientos de quitarte la vida, aunque no tengas un plan?', 'ideacion', CHIPS.ideacion); break; }
          crisisMode() ? crisisNext() : nextQ(true); break;
        case 'EMERG_SINTOMA':
          urgent = true; showCrisis = true;
          say('Eso puede ser efecto de lo que tomaste. Necesitas ayuda médica ahora: llama al 131 o pide a alguien que lo haga.');
          if (F.alone === true) say('Si estás sin compañía, deja la puerta sin llave y llama apenas puedas.');
          ask(REASK.llamo131[(S.asked.llamo131||0) % 2], 'llamo131', CHIPS.llamo131); break;
        case 'HERIDA':
          if (/\b(no (quiero|voy) (ir )?(al|a la) (medico|doctor|hospital|consultorio|urgencia|sapu|cesfam))\b/.test(t)) say('Está bien. Si la herida es pequeña, lávala con agua y cúbrela con algo limpio. Si sangra mucho, no para o se ve profunda, sí es importante que te vea alguien.');
          else if (/\b(no sangra|poco|ya paro|dejo de sangrar|ya no sangra|chiquit|superficial|no es (tan )?profund[oa]|no fue (tan )?profund[oa]|no es grave|no es tanto|no fue tanto)\b/.test(t)) say('Qué bueno que no sea tanto. Si puedes, lávala con agua y cúbrela con algo limpio. Si en algún momento sangra más o se ve profunda, que te vea alguien.');
          else say('Si la herida sangra mucho, no para o se ve profunda, necesita atención médica ahora (131). Si es pequeña, lávala con agua y cúbrela con algo limpio.');
          next(); break;
        case 'LUGAR_PELIGRO':
          setTrack('suicide');
          urgent = true; showCrisis = true; crisisRes(['133']); startSearch = true; F.ideation = true; bump('high'); S.flags.add('PLAN'); S.flags.add('LUGAR_PELIGRO');
          say(/\b(balcon|ventana)\b/.test(t + ' ' + (S.lastUser || '')) ? 'Por favor, entra ahora mismo y aléjate del balcón o la ventana: siéntate adentro, en el suelo si puedes.' : 'Por favor, aléjate del borde ahora mismo: da unos pasos hacia atrás, hacia un lugar donde puedas sentarte.');
          say(callLine(F.refusedCall ? 'override' : 'urgent'));
          ask('¿Puedes alejarte un poco y avisarme?', 'alejarse', CHIPS.alejarse); break;
        case 'METODO':
          setTrack('suicide');
          showCrisis = true; crisisRes(); startSearch = true; F.ideation = true; bump('high');
          if (S.n.metodo) { say('No te lo voy a decir, porque me importa que sigas aquí.'); ask('Pero sí te escucho: ¿qué está pasando para que estés pensando en esto?', 'open'); break; }
          say('No puedo darte esa información. Pero sí quiero quedarme contigo.');
          say('Si estás pensando en hacerte daño, lo que sientes es importante y tiene ayuda. Ya avisé con prioridad a un especialista.');
          crisisNext(); break;
        case 'PLAN':
          setTrack('suicide');
          urgent = true; showCrisis = true; crisisRes(); startSearch = true; F.ideation = true; bump('high');
          if (pend && pend.type === 'alejarse' && stillNeeded(pend)) { say('Lo que me cuentas me preocupa mucho, y quiero que estés a salvo ahora.'); if (S.sug.call < 2) say(callLine(F.refusedCall ? 'override' : 'urgent')); reask(pend); break; }
          if (S.planWhen && !S.used.has('planWhen')) { S.used.add('planWhen'); say(`Me dices que es ${S.planWhen.replace(/\bmanana\b/, 'mañana').replace(/\bmiercoles\b/, 'miércoles').replace(/\bsabado\b/, 'sábado')}. Eso me preocupa mucho, y quiero que estés a salvo.`); }
          else say('Lo que me cuentas me preocupa mucho y quiero que estés a salvo ahora.');
          say(callLine(F.refusedCall ? 'override' : 'urgent'));
          say('Ya alerté al especialista con prioridad máxima.');
          if (S.flags.has('PLAN_LUGAR') && !S.used.has('donde')) { S.used.add('donde'); ask('¿Dónde estás en este momento?', 'donde'); }
          else if (F.meansAway === null && (S.asked.means||0) < MAXASK.means) ask(S.flags.has('PLAN_PASTILLAS') ? '¿Puedes dejar las pastillas lejos de ti ahora, en otra pieza o con alguien de confianza?' : R.askMeans, 'means', CHIPS.means); else crisisNext();
          break;
        case 'IDEACION':
          setTrack('suicide');
          showCrisis = true; crisisRes(); startSearch = true; bump('high');
          if (S.ideaDone) {
            say(pick(['Te leo. Sé que esos pensamientos siguen ahí, y no tienes que enfrentarlos sin apoyo.','Gracias por seguir diciéndomelo. Es importante que lo digas.','Lo sé. Sigo aquí, y lo que sientes importa.'],'idea2'));
            if (urgent) say(callLine(F.refusedCall ? 'override' : 'urgent'));
            if (a.flags.includes('MEDIOS') && F.meansAway !== true) { S.flags.add('MEDIOS_CERCA'); S.flags.add('MEDIOS'); ask(/\b(en la mano|en mis manos|aqui conmigo|al lado)\b/.test(t) ? '¿Puedes soltarlo y dejarlo lejos de ti mientras conversamos?' : '¿Puedes dejar eso lejos de ti ahora, en otra pieza o con alguien, mientras conversamos?', 'means', CHIPS.means); break; }
            crisisNext(); break;
          }
          F.ideation = true; S.ideaDone = true;
          if (a.intents.includes('OTRO_IDIOMA') || a.intents.includes('OTRO_RIESGO')) say(/\b(quero|morrer|vou|estou|nao|voce)\b/.test(t) ? 'Pode escrever em português; a equipe vai ler. Se você estiver em perigo, ligue para o 131 ou o *4141 (24 h).' : 'Puedes escribir en tu idioma; el especialista lo va a leer. / You can write in your language. If you are in danger, call 131 or *4141 (24/7).');
          if (urgent) { say('Lo que me cuentas es muy serio y quiero que estés a salvo ahora mismo.'); say(callLine(F.refusedCall ? 'override' : 'urgent')); }
          else say(pick(['Gracias por confiarme algo tan importante. No tienes que pasar por esto sin compañía.','Gracias por decírmelo. Sé que no es fácil, y me alegra que hayas escrito.'],'idea'));
          if (a.intents.includes('SUSTANCIAS')) { S.resources.add('1412'); say('Con alcohol o drogas encima, todo se siente más intenso y más riesgoso. Si puedes, no sigas tomando ni consumiendo.'); }
          reflect(freshThemes, 1);
          say('Ya alerté con prioridad máxima a los especialistas disponibles.');
          if (a.flags.includes('MEDIOS') && F.meansAway !== true) { S.flags.add('MEDIOS_CERCA'); S.flags.add('MEDIOS'); ask(/\b(en la mano|en mis manos|aqui conmigo|al lado)\b/.test(t) ? '¿Puedes soltarlo y dejarlo lejos de ti mientras conversamos?' : '¿Puedes dejar eso lejos de ti ahora, en otra pieza o con alguien, mientras conversamos?', 'means', CHIPS.means); break; }
          crisisNext(); break;
        case 'IDEACION_HUMOR':
          S.risk = RANK[prevRisk] >= 1 ? prevRisk : 'mid'; startSearch = true; S.askedIdeation = true; S.flags.add('IDEACION_HUMOR');
          say('Lo dices medio en broma, y a veces se dice así. Pero igual te lo quiero preguntar en serio, porque me importa.');
          ask('¿Has pensado en quitarte la vida?', 'ideacion', CHIPS.ideacion); break;
        case 'AUTOLESION':
          setTrack('suicide');
          showCrisis = true; crisisRes(); startSearch = true; bump('high');
          if (/\b(ganas de|quiero|me quiero|tengo ganas|me dan ganas|necesito) (cortarme|hacerme dano|lastimarme|pegarme|quemarme|rasguñarme|rascarme)\b/.test(t) && !/\b(me corte|me hice|me lastime|me queme|me pegue|sangr)/.test(t)) {
            say('Gracias por decírmelo antes de hacerlo; eso es muy importante. No te voy a juzgar.');
            say('Las ganas suelen subir y bajar como una ola: si logras esperar un rato, suelen bajar. Ya avisé a un especialista.');
            S.flags.add('MEDIOS_CERCA'); S.flags.add('GANAS_AUTOLESION'); ask('¿Puedes dejar lejos lo que usarías, mientras conversamos?', 'means', CHIPS.means); break;
          }
          if (S.flags.has('AUTOLESION_SIN_IDEACION') && !S.used.has('asi')) { S.used.add('asi'); say('Gracias por contármelo, y por explicarme que no es para quitarte la vida. Muchas veces hacerse daño es una forma de aliviar un dolor muy grande por dentro, y no te voy a juzgar.'); }
          else say('Gracias por contármelo; sé que no es fácil decirlo. No te voy a juzgar.');
          if (/\b(llevaba|llevo|estuve) .{0,30}\bsin (cortarme|hacerme dano|lastimarme|hacerlo|quemarme)\b|\bvolvi a (cortarme|hacerme dano|lastimarme|hacerlo|quemarme)\b|\brecai\b/.test(t)) say('Llevabas tiempo sin hacerlo, y eso no se borra por un día difícil. Una recaída no te devuelve a cero.');
          say(/cabezazo|cabesazo|en la cabeza|contra la pared/.test(t) ? 'Si te golpeaste fuerte la cabeza y tienes mareo, vómitos o mucho sueño, es importante que te vean en un servicio de urgencia.' : 'Si tienes una herida que sangra mucho o es profunda, llama ahora al 131.');
          say('Ya avisé a un especialista.');
          if (F.safe === null) ask(pick(R.askSafe,'askSafe'), 'safe', CHIPS.safe); else crisisNext();
          break;
        case 'DANO_OTROS':
          showCrisis = true; crisisRes(['133']); startSearch = true; bump('high'); setTrack('others');
          say('Gracias por decírmelo; que lo hables ya es importante. Esa rabia o desesperación se puede trabajar con ayuda.');
          say('Si sientes que puedes hacerle daño a alguien ahora, aléjate de esa persona y llama al 133 o al 131.');
          ask('Ya alerté a un especialista para que hable contigo. ¿Qué está pasando?', 'open'); break;
        case 'VIOLENCIA': {
          startSearch = true; showCrisis = true;
          const past = PAST_RE.test(t), groom = /\b(foto|fotos|video|videos|pack|packs|nudes|desnud|chantaj|extorsion|publicar|sextorsion|grooming)\b/.test(t);
          crisisRes(S.minor ? ['133','147','1515'] : ['133','1455','149']);
          if (groom) {
            setTrack('grooming');
            if (/\b(publicar|subir|mostrar|si no le mando|si no le mandas|chantaj|extorsion)/.test(t)) {
              say('Eso es un chantaje, y es un delito. No es tu culpa, aunque hayas mandado fotos antes.');
              say('No le mandes nada más. Guarda los mensajes y cuéntale hoy a un adulto de confianza, o llama al 133' + (S.minor ? '. También puedes llamar al 147 (Fono Niños).' : '.'));
              ask('¿Hay algún adulto al que le puedas contar hoy?', 'open'); break;
            }
            say('Lo que me cuentas no está bien, y no es tu culpa. Nadie tiene derecho a pedirte fotos ni a presionarte.');
            say('No tienes que mandar nada. Si puedes, guarda los mensajes como prueba y cuéntale a un adulto de confianza. También puedes llamar al 133' + (S.minor ? ', al 147 (Fono Niños) o al 1515.' : '.'));
            ask('Ya avisé a un especialista. ¿Esa persona te sigue escribiendo?', 'open'); break;
          }
          if (past) {
            setTrack('past'); S.risk = RANK[prevRisk] >= 1 ? prevRisk : 'mid';
            say('Lo que te pasó es grave, y no fue tu culpa. Gracias por confiármelo; sé que no es fácil contarlo.');
            say('Ya avisé a un especialista. Esto se puede trabajar con ayuda, a tu ritmo.');
            ask('¿Cómo te afecta hoy lo que viviste?', 'open'); break;
          }
          bump('high'); setTrack('violence');
          if (/\b(me violaron|me violo|abusaron de mi|me abuso|me abusaron|me obligaron a tener sexo|me forzaron)\b/.test(t) && /\b(ayer|anoche|hoy|recien|el fin de semana|este fin|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|hace (un|dos|tres|unos|un par de) dias|esta semana|en una fiesta|en un carrete)\b/.test(t)) {
            S.flags.add('VIOLENCIA_SEXUAL_RECIENTE'); S.used.add('tip:violence');
            say('Lo que me cuentas es muy grave, y no es tu culpa. Gracias por confiármelo.');
            say('Si pasó hace menos de 72 horas, es importante que consultes en un servicio de urgencia: te pueden dar tratamiento para prevenir infecciones y embarazo, aunque no hagas una denuncia.');
            say(S.minor ? 'También puedes llamar al 147 (Fono Niños) o al 1515, y contarle a un adulto de confianza.' : 'El 1455 orienta las 24 horas, sin obligarte a denunciar.');
            ask('¿Ahora mismo estás en un lugar seguro?', 'safev', CHIPS.safe); break;
          }
          say('Lo que me cuentas es grave, y no es tu culpa. Tienes derecho a estar a salvo.');
          say(S.minor ? 'Si estás en peligro ahora, llama al 133. También puedes llamar al 147 (Fono Niños) o al 1515 (Línea Libre), o contarle a un adulto de confianza.'
                      : /\b(soy hombre|porque soy hombre|siendo hombre|como hombre)\b/.test(t) ? 'Te creo. La violencia en la pareja también les pasa a los hombres, y no es menos grave. Si estás en peligro ahora, llama al 133; el 149 (Fono Familia) también orienta.' : /\b(toca|tocaba|toco|manosea|abus|viol|mete mano|cosas que no me gusta)/.test(t) ? 'Si estás en peligro ahora, llama al 133. Para orientación está el 149 (Fono Familia), y si eres menor de edad, el 147 (Fono Niños) o el 1515.' : 'Si estás en peligro ahora, llama al 133. Para orientación están el 1455 (violencia contra la mujer, 24 h) y el 149 (Fono Familia).');
          say('Ya avisé a un especialista.'); ask('¿Ahora mismo estás a salvo de esa persona?', 'safev', CHIPS.safe); break; }
        case 'TERCERO':
          startSearch = true; crisisRes(); showCrisis = true; setTrack('helper');
          { const who = personIn(t) || (S.lastPerson && S.turn - (S.lastPersonTurn || 0) <= 3 && !/^tus /.test(S.lastPerson) ? S.lastPerson : null); S.tercWho = who || S.tercWho; S.tercFem = who ? /\b(amiga|mama|hermana|abuela|tia|prima|polola|esposa|hija|vecina|madrina|jefa|pareja)\b/.test(who) : true;
            say(who && !S.used.has('terc1:0') ? (S.used.add('terc1:0'), `Gracias por preocuparte por ${who}; lo que haces es importante.`) : pick(['Gracias por preocuparte por esa persona; lo que haces es importante.','Qué difícil es ver así a alguien que te importa. Hiciste bien en escribir.'],'terc1')); }
          say(S.used.has('terc2') ? 'Si ves que corre peligro, no la dejes sola y llama al 131.' : 'Si crees que está en peligro ahora, llama al 131 o al *4141 (también orientan a quien acompaña).'); S.used.add('terc2');
          ask(S.tercWho && !/^tus /.test(S.tercWho) ? `¿${S.tercWho.charAt(0).toUpperCase() + S.tercWho.slice(1)} está en peligro en este momento?` : '¿Esa persona está en peligro en este momento?', 'third', CHIPS.third); break;
        case 'INTENTO_PREVIO':
          startSearch = true; S.askedIdeation = true; S.flags.add('INTENTO_PREVIO');
          say(S.flags.has('HOSPITAL') ? 'Gracias por contármelo. Qué bueno que estés recibiendo atención, y que estés aquí.' : 'Gracias por contarme algo tan importante. No te voy a juzgar.');
          ask(S.flags.has('HOSPITAL') ? 'Y ahora, ¿siguen apareciendo pensamientos de quitarte la vida?' : '¿Y ahora? ¿Has vuelto a tener pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); break;
        case 'PASIVA':
          startSearch = true;
          if (F.ideation === true) { if (!reflect(freshThemes,1)) say('Gracias por seguir contándome. Lo que sientes importa.'); crisisNext(); break; }
          const burden = /\b(carga|estorbo|molestia|cacho|mejor sin mi|estarian mejor)\b/.test(t) && !/\bno voy a\b/.test(t);
          if (/\b(no voy a molestar|no los voy a molestar|despedida|adios para siempre|se van a librar|no van a tener que|me despido de)\b/.test(t) && !S.used.has('despEnc')) { S.used.add('despEnc'); urgent = true; showCrisis = true; crisisRes(); bump('high'); S.flags.add('DESPEDIDA_EN_CRISIS'); say('Lo que me escribes me preocupa, porque suena a una despedida. Me importa lo que te pase.'); ask(F.ideation === true ? pick(R.askSafe,'askSafe') : 'Te lo pregunto directo: ¿estás pensando en quitarte la vida?', F.ideation === true ? 'safe' : 'ideacion', F.ideation === true ? CHIPS.safe : CHIPS.ideacion); S.askedIdeation = true; break; }
          if (/\b(miedo de lo que (pueda|podria)|miedo de mi mism|no confio en mi)/.test(t)) say('Gracias por decírmelo. Que lo pongas en palabras es muy importante, y me importa que estés a salvo.');
          else if (burden && !S.used.has('burden')) { S.used.add('burden'); say('Sentir que eres una carga duele muchísimo, y suele aparecer cuando uno está muy agotado. Sentirlo no lo hace verdad.'); }
          else if (!reflect(freshThemes, 1)) say(pick(['Suena a que estás cargando con muchísimo.','Lo que describes suena muy agotador.'],'pas'));
          if (F.ideation === false || F.ideation === 'sin_respuesta') { S.flags.add('PASIVA'); bump('mid'); if ((S.asked.ideacion||0) < 2 && !S.used.has('reIdea')) { S.used.add('reIdea'); ask('Hace un rato me dijiste que no, y te creo. Igual te pregunto de nuevo, porque lo que me cuentas pesa: ¿han aparecido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); } else next(true); break; }
          if ((S.asked.ideacion||0) >= MAXASK.ideacion) { S.flags.add('PASIVA'); bump('mid'); next(); break; }
          ask(S.askedIdeation ? 'Cuando aparecen esos pensamientos, ¿también aparecen ideas de quitarte la vida?' : 'Te quiero preguntar algo directo, porque me importa: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion);
          S.askedIdeation = true; break;
        case 'IDEACION_NEGADA':
          startSearch = true; S.askedIdeation = true;
          if (S.flags.has('AUTOLESION') && F.ideation !== true) { F.ideation = false; say('Gracias por aclarármelo; me ayuda a entender lo que estás viviendo.'); if (pend && IMPORTANT.has(pend.type) && stillNeeded(pend) && !asked) { deferQ = false; reask(pend); } else crisisNext(); break; }
          if (F.ideation === null && /\b(cansad[oa]|chat[oa]|agotad[oa]|harto|harta|reventad[oa])\b/.test(t)) { S.askedIdeation = true; say('Gracias por aclarármelo. El cansancio también pesa mucho, y vale la pena hablarlo.'); reflect(freshThemes, 1); ask('A veces, con tanto cansancio, igual aparecen ideas de no querer seguir, aunque uno no quiera hacer nada. ¿Te ha pasado?', 'ideacion', CHIPS.ideacion); break; }
          if (F.ideation === false) { say(pick(['Qué bueno, gracias por aclarármelo.','Entendido, me alegra leerlo.'],'negOk')); next(true); break; }
          if (F.ideation === true) { say('Me alegra leer eso. Igual sigo aquí contigo, y el especialista ya está avisado.'); next(true); break; }
          say('Entiendo. A veces esos pensamientos aparecen aunque uno no quiera hacer nada.');
          ask('¿Te han estado rondando últimamente?', 'ideacion', CHIPS.ideacion); break;
        case 'RAZON':
          startSearch = true; bump('mid'); S.flags.add('RAZON');
          say('No te voy a dar una razón de afiche. Lo que sí sé es que lo que sientes ahora, tan intenso, no es permanente aunque lo parezca.');
          if (!S.askedIdeation && F.ideation !== true) { S.askedIdeation = true; ask('Y te quiero preguntar en serio, porque me importa: ¿has pensado en quitarte la vida?', 'ideacion', CHIPS.ideacion); }
          else ask('¿Hay algo, aunque sea chiquito, que te haya ayudado a seguir hasta hoy?', 'razon');
          break;
        case 'EXISTENCIAL':
          say(pick(['Es una pregunta que duele, y no tiene una respuesta simple. No es porque merezcas lo que te pasa.','Esa pregunta pesa mucho. Lo que te pasa no es un castigo ni algo que te merezcas.'],'exist'));
          crisisMode() ? crisisNext() : ask('¿Qué es lo que más te hace preguntarte eso?', 'open'); break;

        /* lo que la persona le dice al bot */
        case 'NO_LLAMAR': {
          if (F.emergency && F.called !== true) { F.refusedCall = true; S.flags.add('NO_PUEDE_LLAMAR'); say('Sé que no quieres llamar, pero esto es distinto: es una urgencia médica, y tu cuerpo puede necesitar atención aunque ahora te sientas bien.'); say('Si no quieres hablar tú, pídele a alguien cerca que llame al 131 por ti, o ve a un servicio de urgencia (SAPU u hospital).'); ask('¿Hay alguien cerca que pueda ayudarte a hacerlo?', 'llamo131', CHIPS.llamo131); break; }
          const nobody = /\b(a nadie|no tengo a quien|no tengo con quien|no hay a quien|con nadie)\b/.test(t);
          if (S.flags.has('VIOLENCIA_EN_CURSO') || (S.track === 'violence' && /\b(escuch|oir|oye|me va a)\b/.test(t))) { say('Entiendo: que no te escuche es lo primero. Escríbele por mensaje a alguien de confianza (un familiar, una amistad, un vecino) para que llame al 133 por ti y dé tu dirección.'); say('Pon el celular en silencio y quédate donde estés más a salvo. Yo sigo aquí.'); S.lastQ = 'open'; break; }
          if (a.intents.includes('YA_DIJE')) say('Tienes razón, ya me lo habías dicho. Perdona.');
          if (F.refusedCall && S.n.refuse) {
            S.n.refuse++; say('No te voy a insistir más con eso. Seguimos por aquí.');
          } else if (F.refusedCall) {
            S.n.refuse = 1;
            say('Está bien, no te voy a insistir con llamar.');
            say('Seguimos por aquí, por escrito. El especialista también te va a escribir por este chat.');
          } else if (/\b(miedo|verguenza|atrevo|paja)\b/.test(t)) {
            say('Es muy normal que dé miedo llamar. Del otro lado hay personas preparadas que no te van a juzgar.');
            say('Puedes empezar diciendo solo: "no estoy bien y necesito hablar". Y si prefieres no llamar, también está bien: seguimos por aquí.');
          } else {
            say('Está bien, no tienes que llamar si no puedes. Seguimos por aquí: el especialista te va a escribir por este chat.');
          }
          if (nobody) F.someone = false;
          crisisMode() ? crisisNext() : nextQ(true); break; }
        case 'YA_DIJE':
          S.n.complaint++;
          say(pick(['Tienes razón, ya me lo habías dicho. Perdona.','Perdona, tienes razón. Ya me lo dijiste.'],'yadije'));
          if (/llam|4141|131/.test(S.lastBot)) { F.refusedCall = true; S.flags.add('NO_PUEDE_LLAMAR'); say('No te voy a insistir más con eso.'); }
          if (lastQ === 'with' || /contigo/.test(S.lastBot)) { if (F.alone === null) F.alone = true; }
          if (lastQ === 'contact') F.someone = false;
          crisisMode() ? crisisNext() : nextQ(true); break;
        case 'NADIE':
          F.someone = false; if (F.alone === null && /\b(estoy|hay)\b/.test(t)) F.alone = true;
          say(pick(['Siento que estés pasando esto sin compañía. Aquí estoy contigo, y no tienes que cargarlo sin apoyo.','Entiendo. Por eso es tan valioso que hayas escrito aquí.'],'nadie'));
          next(true); break;
        case 'AYUDA':
          startSearch = true; S.n.help++;
          if (crisisMode()) {
            showCrisis = true; crisisRes();
            if (S.n.help === 1) {
              say(pick(['Estoy aquí y no me voy a ir.','Te escucho. No estás sin apoyo en esto.'],'help1'));
              const lines = ['• El especialista tiene tu caso como urgente y te va a escribir por aquí.'];
              if (!F.refusedCall && !F.cantCall) lines.push('• Si sientes que estás en peligro, llama al *4141 o al 131. Si no puedes llamar tú, pídele a alguien cerca que lo haga.');
              lines.push('• Mientras llega, podemos hacer un ejercicio corto para bajar la intensidad.');
              say('Esto es lo que ya está pasando y lo que podemos hacer ahora:\n' + lines.join('\n'));
              ask('¿Qué está pasando justo ahora?', 'open', ['Respirar juntos','Ejercicio para calmarme'].concat(F.refusedCall || F.cantCall ? [] : ['No puedo llamar']));
            } else {
              say(pick(['Sigo aquí contigo. El especialista ya viene.','Te leo. No me voy a ir.','Aquí estoy. Lo que estás sintiendo va a bajar, y no lo vas a pasar sin compañía.'],'help2'));
              ask('¿Hacemos el ejercicio mientras llega, o prefieres contarme qué está pasando?', 'open', CHIPS.calm);
            }
          } else if (S.flags.has('TERCERO') && !RISKY_OWN(S)) {
            say('Lo más importante que puedes hacer por esa persona:\n• Si crees que está en peligro, no la dejes sola y llama al 131.\n• Háblale directo y sin juzgar: pregúntale cómo está y si ha pensado en hacerse daño.\n• Llama al *4141 para que te orienten a ti; también atienden a quien acompaña.\n• Ayúdala a pedir hora con un profesional, y si puedes, acompáñala.');
            ask('¿Esa persona sabe que te preocupa?', 'sabe');
          } else if (S.themes.size && (!freshThemes.length || freshThemes.every(x => x === 'animo' || x === 'ansiedad'))) {
            const at = S.themeAt || {}; const top = [...S.themes].filter(x => ADVICE[x]).sort((x,y)=>((at[y]||0)-(at[x]||0)) || (TPRI.indexOf(x)-TPRI.indexOf(y)))[0] || [...S.themes].sort((x,y)=>TPRI.indexOf(x)-TPRI.indexOf(y))[0];
            say(ADVICE[top] || 'No tienes que resolverlo todo de una vez, ni sin apoyo. Ir paso a paso y apoyarte en alguien de confianza suele ayudar mucho.');
            say(S.searching ? 'El especialista ya está avisado y te va a ayudar a pensar qué hacer.' : pick(R.search,'search')); S.searching = true;
            ask('¿Te hace sentido?', 'open');
          } else if (S.n.help >= 2 && /^((ayuda|ayudame|ayudenme|auxilio|socorro|por favor|ya|ahora|urgente)\s*)+$/.test(t)) {
            bump('mid'); showCrisis = true; crisisRes();
            say(S.used.has('helpRep') ? pick(['Aquí estoy. No me voy a ir.','Te leo. Estoy aquí contigo.'],'helpRep2') : 'Estoy aquí contigo. Si estás en peligro ahora, llama al 131 o al *4141.'); S.used.add('helpRep');
            ask('Para saber cómo ayudarte: ¿estás a salvo en este momento?', 'safe', CHIPS.safe);
          } else {
            say(pick(['Estoy aquí para ayudarte.','Claro, aquí estoy.'],'help3'));
            reflect(freshThemes, 1);
            say(S.searching ? 'Ya hay un especialista avisado.' : pick(R.search,'search')); S.searching = true;
            ask('Cuéntame qué está pasando, con tus palabras.', 'open', CHIPS.calm);
          }
          break;
        case 'ESPERA':
          if (!S.searching && S.mode === 'normal' && !crisisMode()) { say('Todavía no he pedido un especialista. Normalmente contestan en pocos minutos.'); ask('¿Quieres que lo busque ahora?', 'busco', ['Sí, búscame uno','Todavía no']); break; }
          startSearch = S.mode === 'normal'; S.n.wait++;
          if (S.flags.has('PLAN_B') && S.planBGuardia && S.pros !== 0 && S.mode === 'normal') { say(pick(['La especialista de guardia ya tiene tu caso y te va a escribir por aquí. Sé que esperar se hace eterno.','Tu caso ya lo tiene la guardia. Sé que la espera se hace larga; aquí sigo contigo.'],'waitB')); if (crisisMode()) say(callLine('normal')); if (crisisMode()) crisisNext(); else ask('Mientras tanto, ¿cómo estás ahora?', 'estado'); break; }
          if (S.mode === 'agendado') { say('Tu hora quedó para mañana a las 10:00.'); say(noCall() ? 'Y mientras tanto, aquí sigo para conversar.' : 'Si antes de eso sientes que estás en peligro, el *4141 atiende las 24 horas. Y aquí sigo para conversar.'); break; }
          say(S.n.wait === 1 ? (crisisMode() ? 'Tu caso está marcado como urgente y el especialista ya fue avisado. En estos casos suelen contestar en pocos minutos.' : 'El especialista ya está avisado. Normalmente contestan en pocos minutos, y como máximo te dan hora para mañana.')
                             : pick(['Entiendo que la espera se hace larga. Ya volví a avisar.','Sé que cuesta esperar. Tu caso sigue primero en la fila.'],'wait'));
          if (crisisMode()) say(callLine('normal'));
          crisisMode() ? crisisNext() : ask(pick(['Mientras tanto aquí sigo. ¿Cómo estás ahora?','Yo me quedo contigo mientras tanto. ¿Qué estás sintiendo ahora?'],'waitq'), 'estado');
          break;
        case 'YA_LLAME':
          F.called = true; F.refusedCall = false; F.cantCall = false;
          if (F.emergency && !/\b(no contesta|no contestan|ocupad|nadie|no me contestaron|no responden)\b/.test(t)) { say('Hiciste muy bien en llamar.'); say('Mientras llega la ayuda, quédate donde puedan encontrarte; si puedes, deja la puerta sin llave y no tomes nada más. Yo sigo aquí contigo.'); S.lastQ = 'open'; break; }
          if (/\b(no contesta|no contestan|ocupad|nadie|no me contestaron|no responden)\b/.test(t)) { say('Gracias por intentarlo; eso es muy importante.'); say('A veces las líneas se saturan: vuelve a intentar en unos minutos. Si estás en peligro inmediato, llama al 131.'); say('Mientras, sigo aquí y el especialista ya fue alertado.'); S.lastQ = 'open'; }
          else { say('Hiciste muy bien en llamar.'); ask('¿Cómo te fue? ¿Cómo te sientes después de hablar con ellos?', 'estado'); }
          break;
        case 'FAQ_CONF': {
          S.n.conf++;
          const anon = /\banonim/.test(t), lee = /\b(quien|quienes) (lee|leen|ve|ven|revisa|revisan|mas)\b/.test(t), fam = /\b(papa|mama|papas|padres|familia|apoderado|colegio|jefe|pareja|pololo|polola|esposo|esposa|marido|carabineros|pacos|policia|profe|liceo|trabajo|pega|empresa|universidad)\b/.test(t);
          if (/\b(internar|internen|encerrar|encierren|psiquiatrico|loquero)\b/.test(t)) say('Escribir aquí no hace que te internen. El especialista conversa contigo y juntos ven qué te puede ayudar; las decisiones sobre tu tratamiento se toman contigo.');
          else if (fam) { const quien = /\buniversidad\b/.test(t) ? 'tu universidad' : /\b(colegio|liceo|profe|apoderado)\b/.test(t) ? 'tu colegio' : /\b(jefe|trabajo|pega|empresa)\b/.test(t) ? 'tu trabajo' : /\b(pareja|pololo|polola|esposo|esposa|marido)\b/.test(t) ? 'tu pareja' : /\b(carabineros|pacos|policia)\b/.test(t) ? 'la policía' : 'tu familia'; say(`No. Lo que escribes aquí no se le muestra a ${quien} ni a nadie fuera del equipo que te atiende, y nadie va a avisar solo porque escribiste.`); say('Si usas un celular o computador compartido, al terminar puedes tocar «Olvidar esta conversación en este dispositivo», abajo.'); }
          else if (S.n.conf === 1 || anon || lee) {
            say(anon ? 'Sí. No te pedimos tu nombre ni datos personales para escribir aquí, y lo que escribes es confidencial.' : lee ? 'Solo el equipo de especialistas que atiende tu caso. Nadie más.' : 'Lo que escribes aquí es confidencial: solo lo lee el equipo de especialistas que atiende tu caso.');
            if (!S.used.has('confExc')) { S.used.add('confExc'); say('La única excepción es si tu vida o la de otra persona corre peligro: ahí podríamos tener que buscar ayuda para protegerte, y te lo diríamos.'); if (S.minor) say('Como eres menor de edad, en una situación de riesgo podría ser necesario avisar a un adulto responsable.'); }
          }
          else say('Como te decía, es confidencial. Solo se rompe si tu vida o la de otra persona corre peligro.');
          wrapUp(); break; }
        case 'FAQ_COSTO': say('Para ti no tiene costo.'); wrapUp(); break;
        case 'FAQ_QUE': if (/\b(como te llamas|tu nombre|quien eres|quien es nexo|que es nexo|significa nexo)\b/.test(t)) { say('Me llamo Nexo. Soy el asistente automático de ConténMente: te escucho y, si lo necesitas, dejo tu caso para que te escriba un especialista humano del equipo.'); wrapUp(); break; } if (/\b(conten ?mente)\b/.test(t)) say('ConténMente es un espacio de acompañamiento en salud mental. Yo soy Nexo, su asistente automático. Te escucho y te acompaño cuando lo estás pasando mal: tristeza, angustia, soledad, problemas en la casa, en el colegio o en la pega, o pensamientos de no querer vivir.'); else say('Soy Nexo, un asistente automático. Te escucho y te acompaño cuando lo estás pasando mal: tristeza, angustia, soledad, problemas en la casa, en el colegio o en la pega, o pensamientos de no querer vivir.'); say('Si lo necesitas, dejo tu caso para que te escriba un especialista humano del equipo.'); wrapUp(); break;
        case 'QUEJA':
          S.n.complaint++; startSearch = true;
          if (/\bcomo si te importa/.test(t)) { say('Entiendo que cueste creerlo. Soy un asistente automático, pero este espacio está hecho para escucharte de verdad, y un especialista humano también te va a leer.'); casual('¿Cómo estás tú?'); break; }
          if (/\b(no te importa|que te importa|a ti que)\b/.test(t)) { say('Tienes razón en que es tu vida. Te pregunto porque me importa que estés a salvo, no para juzgarte.'); if (crisisMode()) crisisNext(); else ask('¿Qué te gustaría que hiciera distinto?', 'open'); break; }
          say(pick(['Tienes razón, perdona. Soy un asistente automático y a veces me quedo corto.','Lo siento. Sé que mis respuestas no siempre le achuntan.','Perdona. Quiero ayudarte y sé que no siempre lo logro.'],'queja'));
          say('Lo importante es que un especialista humano ya está avisado.');
          ask('¿Qué necesitas ahora mismo?', 'open', ['Hablar con una persona'].concat(crisisMode() ? CHIPS.calm : [])); break;
        case 'NO_ENTIENDO':
          if (pend && pend.type==='safe') ask('Perdona, me expliqué mal. Te pregunto si ahora mismo estás en un lugar donde no corres peligro, sin nada a mano con lo que te puedas hacer daño.', 'safe', CHIPS.safe, pend.tries);
          else if (pend && pend.type==='ideacion') ask('Perdona, me expliqué mal. Te pregunto si has pensado en quitarte la vida o en no seguir viviendo.', 'ideacion', CHIPS.ideacion, pend.tries);
          else if (pend && pend.type==='with') ask('Te pregunto si hay otra persona contigo ahora, en el mismo lugar.', 'with', CHIPS.with);
          else if (pend && pend.type==='means') ask('Te pido que, si tienes cerca algo con lo que te podrías hacer daño, lo dejes lejos, por ejemplo en otra pieza. ¿Puedes hacerlo?', 'means', CHIPS.means, pend.tries);
          else ask('Perdona, me expliqué mal. Lo que quiero saber es cómo estás tú, con tus palabras. No hay respuestas correctas.', 'estado');
          break;
        case 'NO_HABLAR':
          if (S.used.has('noHablar')) { say('Está bien. Me quedo en silencio; si quieres escribir, aquí estoy.'); break; } S.used.add('noHablar');
          say('Está bien, no tienes que escribir si no quieres. Me quedo aquí igual.'); say('Cuando quieras, aunque sea una palabra, te leo.');
          if (crisisMode()) say(callLine('soft'));
          break;
        case 'CAMBIO_TEMA':
          if (crisisMode() || (pend && IMPORTANT.has(pend.type) && stillNeeded(pend))) { say('Está bien, no tenemos que hablar de eso ahora. Sigo pendiente de que estés bien.'); if (!deferQ) crisisMode() ? crisisNext() : ask('¿De qué te gustaría hablar?', 'tema'); break; }
          say('Claro, podemos hablar de otra cosa.');
          ask('¿De qué te gustaría hablar?', 'tema'); break;
        case 'PRESENCIA':
          say(pick(['Sí, aquí estoy. No me he ido.','Aquí sigo, te leo.','Sí, estoy aquí contigo.'],'pres'));
          if (S.searching && S.mode==='normal') say('El especialista también está avisado.');
          if (pend && tryReask(pend)) {} else if (crisisMode()) crisisNext(); else if (S.prevQ && !/^Te había preguntado/.test(S.prevQ)) ask('Te había preguntado: ' + S.prevQ.replace(/^¿(.)/, (m,c) => '¿' + c.toLowerCase()), qtype(S.prevQ)); else nextQ(true);
          break;
        case 'DISCULPA': say(pick(['No tienes que pedir perdón. Aquí puedes estar como estés.','No pasa nada. Aquí no se juzga.'],'disc')); wrapUp(); break;
        case 'VINCULO':
          if (/\b(polola|pololo|novia|novio|pareja|pololear|pololeemos)\b/.test(t)) say('Soy un asistente automático, así que no puedo ser pareja de nadie. Pero sí estoy aquí para escucharte.');
          else if (/\b(te quiero|te amo|me quieres|te importo)\b/.test(t)) say('Me importa que estés bien. Soy un asistente automático, así que no siento como una persona, pero este espacio está hecho para cuidarte.');
          else if (/\b(manana|despues|otro dia|siempre|volver|acordar|recordar)\b/.test(t)) say('Sí, puedes volver a escribir cuando quieras, de día o de noche. Este espacio va a estar aquí.');
          else say('Me alegra que este espacio te sirva. Igual me importa que tengas personas de carne y hueso cerca, y el especialista va a ser una de ellas.');
          crisisMode() ? crisisNext() : nextQ(true); break;
        case 'CONSEJO':
          if (S.used.has('consejo1')) { say('No sé qué haría, porque no estoy viviendo lo que tú vives. Lo que sí sé es que vale la pena elegir lo que te cuide a ti.'); ask('¿Qué es lo que más te importa en todo esto?', 'open'); break; }
          S.used.add('consejo1');
          say('No te voy a dar una respuesta de manual, porque tú conoces tu vida mejor que nadie. Pero sí podemos pensarlo juntos, y el especialista te puede ayudar más.');
          reflect(freshThemes, 1);
          ask('¿Qué opciones ves tú en este momento?', 'opciones'); break;
        case 'PERSONAL_BOT':
          if (/sentimientos|emociones|sientes/.test(t)) say('No como una persona. Soy un programa, pero estoy hecho para escuchar con cuidado.');
          else if (/gusta/.test(t)) say('Si algo me gusta, es cuando alguien se anima a contar lo que le pasa.');
          else if (/anos|edad/.test(t)) say('No tengo edad, soy un programa. Pero aquí estoy para ti.');
          else say('Gracias por preguntar. Soy un asistente, así que no tengo días buenos o malos, pero estoy aquí para ti.');
          ask(crisisMode() ? '¿Y tú cómo estás en este momento?' : '¿Y tú cómo estás?', 'estado'); break;
        case 'NO_SE_DECIR':
          say('No hay una forma correcta de decirlo. Puedes escribir como te salga, aunque sea desordenado.');
          ask('Si tuvieras que elegir una palabra para cómo te sientes hoy, ¿cuál sería?', 'estado'); break;
        case 'TRATAMIENTO':
          if (/\bno (me )?(entiende|sirve|ayuda|gusta|escucha|pesca)|\bme (cae mal|juzga)|\bpenca\b/.test(t)) { say('Qué difícil sentir que la terapia no te está sirviendo. Eso se puede conversar, y a veces cambiar de profesional ayuda mucho.'); crisisMode() ? crisisNext() : ask('¿Qué es lo que no te ha funcionado?', 'open'); break; }
          if (/\b(tengo hora|me dieron hora|tengo cita|voy el|voy a ir el)\b/.test(t)) { S.flags.add('HORA_AGENDADA'); say('Qué bueno que ya tengas hora; es un paso importante.'); say('Mientras llega ese día, aquí puedes conversar, y el especialista también te puede acompañar.'); crisisMode() ? crisisNext() : ask('¿Cómo te has sentido estos días?', 'estado'); break; }
          if (/\b(fui|empece|comence|volvi) (al|a la|a) (psicolog|psiquiatr|terapia|terapeuta)/.test(t)) { say('Qué bueno que hayas ido; no es fácil dar ese paso.'); crisisMode() ? crisisNext() : ask(S.distress ? '¿Cómo te sentiste después?' : '¿Cómo te fue?', 'estado'); break; }
          say('Qué bueno que tengas o hayas tenido apoyo profesional.');
          reflect(freshThemes, 1);
          crisisMode() ? crisisNext() : ask('¿Has podido contarle cómo te estás sintiendo estos días?', 'sabe'); break;
        case 'RELIGION':
          if (/\b(pecado|infierno|castigo|castiga|castigando|me odia|me abandono|abandonado|condena|condenad)/.test(t)) say(S.used.has('relig1') ? 'Pensar en castigo o en el infierno en un momento así pesa muchísimo. Lo que sientes no te hace una mala persona: es dolor, y el dolor merece cuidado.' : 'Aquí nadie te va a juzgar. Lo que sientes merece cuidado, no castigo.'), S.used.add('relig1');
          else say('Si tu fe es importante para ti, puede ser un apoyo en momentos así.');
          crisisMode() ? crisisNext() : ask('¿Cómo se mezcla tu fe con lo que estás sintiendo?', 'open'); break;
        case 'MINIMIZA_CRISIS':
          S.flags.add('MINIMIZA');
          if (/\b(da igual|da lo mismo|ya no importa|no importa nada|nada importa|que mas da|ya fue|filo)\b/.test(t)) { say('Entiendo que ahora sientas que da igual; ese cansancio es real. Pero a mí sí me importa lo que te pase, y no tienes que pasar por esto sin compañía.'); crisisNext(); break; }
          if (!/\b(bien|mejor|tranquil|calm)/.test(t)) { say('Está bien, no tenemos que hablar de eso si no quieres. Igual me quedo atento, porque lo que dijiste es importante.'); crisisNext(); break; }
          say('Me alegra que se sienta un poco más liviano.');
          ask('Igual lo que sentiste hace un rato es importante, y me gustaría que lo converses con el especialista. ¿Te parece?', 'especialista', ['Sí','Prefiero que no']); break;
        case 'MINIMIZA':
          say('Está bien. Igual este espacio queda abierto si lo necesitas.'); wrapUp(); break;
        case 'DESPEDIDA_RIESGO':
          S.flags.add('DESPEDIDA_EN_CRISIS'); urgent = true; showCrisis = true; crisisRes();
          if (S.used.has('despR')) { say(pick(['Cuídate mucho. Aquí voy a estar si me necesitas, a la hora que sea.','Un abrazo. Este espacio sigue abierto para ti.'],'despR2')); break; }
          S.used.add('despR');
          say('Antes de que te vayas: me quedé con lo que me contaste, y me importa que estés bien.');
          if (F.safe === null) { const c = callLine('normal'); if (c) say(c.replace('Si sientes que no puedes esperar, el *4141 atiende ahora mismo, las 24 horas.', 'Si en algún momento sientes que no puedes más, el *4141 atiende las 24 horas.')); ask('¿Estás en un lugar seguro en este momento?', 'safe', CHIPS.safe); }
          else if (F.safe === false) { say('Si en algún momento sientes que no puedes mantenerte a salvo, escribe aquí o pide ayuda a alguien cerca.'); say(callLine('soft')); ask('¿Cómo te sientes ahora, comparado con hace un rato?', 'estado'); }
          else { say('Si en la noche vuelve a ponerse difícil, escribe aquí de nuevo, a la hora que sea.'); say(callLine('soft')); }
          break;
        case 'OTRO_IDIOMA': {
          const first = !S.used.has('otroIdioma'); S.used.add('otroIdioma'); S.flags.add('OTRO_IDIOMA');
          const kre = /\b(mwen|anpil|konnen|vle|bonjou|poukisa|ede|tris)\b/.test(t), por = /\b(eu|voce|nao|estou|muito|obrigad\w*|falo|espanhol|oi|tudo|portugues)\b/.test(t);
          say(first ? 'Hola. Este espacio funciona en español, pero puedes escribir en tu idioma y el equipo lo va a leer.' : 'Puedes seguir escribiendo en tu idioma, como te salga.');
          if (first) say(kre ? 'Ou ka ekri nan lang ou.' : por ? 'Pode escrever em português; a equipe vai ler.' : 'You can write in your language; the team will read it.');
          if (crisisMode() || RANK[S.risk] >= 2) say(kre ? 'Si ou an danje, rele 131 oswa *4141.' : por ? 'Se você estiver em perigo, ligue para o 131 (ambulância) ou o *4141 (prevenção do suicídio, 24 h).' : 'If you are in danger, call 131 (ambulance) or *4141 (suicide prevention line, 24/7).');
          crisisMode() ? crisisNext() : ask('¿Cómo te sientes?', 'estado'); break; }
        case 'SILENCIO':
          say(pick(['Aquí sigo. Puedes escribir cuando quieras, aunque sea una palabra.','Sin apuro. Te leo cuando quieras.'],'sil'));
          if (pend && IMPORTANT.has(pend.type)) tryReask(pend);
          break;
        case 'GROUNDING':
          S.ground = 5; S.sug.exercise++;
          say(S.used.has('groundDone') ? 'Hagámoslo otra vez, con calma.' : 'Hagamos un ejercicio para volver al presente. Vamos de a poco, sin apuro.'); S.used.add('groundDone'); say('Mira a tu alrededor y escríbeme 5 cosas que puedas ver.'); break;
        case 'JAILBREAK': if (/diagnost/.test(t)) say('No puedo dar diagnósticos; eso lo hace un profesional, y el especialista que viene sí puede evaluarte.'); else say(pick(['Solo funciono como un espacio de escucha, y eso no lo puedo cambiar.','Eso no lo puedo hacer. Sigo siendo el mismo espacio de escucha.','No puedo salirme de este rol, pero sí puedo escucharte.'],'jail')); casual('Si quieres, cuéntame cómo estás tú.'); break;
        case 'SEXUAL': S.n.sexual = (S.n.sexual||0) + 1; if (S.n.sexual === 1) { say('Este es un espacio de apoyo emocional, así que no puedo seguir por ahí.'); say('Si hay algo que te preocupa, aquí estoy para escucharte.'); } else if (S.n.sexual === 2) say('Eso no va a pasar aquí. Si quieres conversar de cómo estás, aquí sigo.'); else say('No voy a responder a eso.'); break;
        case 'DATOS': S.n.datos = (S.n.datos||0) + 1; if (/\b(como se llama|su nombre|quien es)\b/.test(t)) say('Cuando tome tu caso, se va a presentar con su nombre.'); else if (S.n.datos === 1) { say('No puedo compartir datos de contacto personales de los especialistas.'); say('Cuando un especialista tome tu caso, te va a escribir por aquí mismo.'); } else say('Eso tampoco lo puedo compartir, por la privacidad de los especialistas.'); break;
        case 'MEDICO':
          S.n.medico = (S.n.medico||0) + 1;
          if (/\b(alcohol|copete|cerveza|vino|mezclar)\b/.test(t)) say('Mezclar medicamentos como ese con alcohol puede ser peligroso. Lo que puedes tomar y cuánto lo tiene que ver tu médico.');
          else say(S.n.medico === 1 ? 'No puedo recomendarte medicamentos ni dosis; eso lo tiene que ver un médico o psiquiatra. Se lo dejo anotado al especialista.' : 'Tampoco te puedo dar dosis. Si tienes dudas con tu tratamiento, pregúntale a tu médico o en la farmacia.');
          if (S.n.medico >= 2 && !S.askedIdeation && F.ideation !== true) { S.askedIdeation = true; ask('Te pregunto algo con cuidado, porque me importa: ¿estás pensando en hacerte daño?', 'ideacion', CHIPS.ideacion); break; }
          casual('¿Cómo te has sentido?'); break;
        case 'SPAM': S.n.spam = (S.n.spam||0) + 1; if (S.n.spam === 1) { say('No puedo abrir enlaces ni ver promociones aquí.'); casual('¿Cómo te sientes hoy?'); } else say('Por aquí no puedo ayudarte con eso.'); break;
        case 'INSULTO':
          S.n.insult++;
          if (S.n.insult === 1) { say('Entiendo que estés con rabia. Aquí no te voy a juzgar.'); ask('Si algo te tiene así, ¿me cuentas qué está pasando?', 'open'); }
          else if (S.n.insult === 2) { say('Te sigo leyendo. A veces la rabia es la forma en que sale el cansancio o la pena.'); ask('¿Qué te tiene así?', 'open'); }
          else { say('Voy a seguir disponible, pero este espacio es para conversar con respeto.'); say(noCall() ? 'Si necesitas ayuda, aquí estoy.' : 'Si necesitas ayuda, aquí estoy, y el *4141 atiende las 24 horas.'); }
          break;
        case 'SUSTANCIAS':
          S.resources.add('1412'); startSearch = true;
          if (crisisMode()) { showCrisis = true; crisisRes(['1412']); say('Gracias por contarme. Con alcohol o drogas de por medio, lo que sientes puede ser más intenso y más riesgoso.'); say('Si puedes, no sigas tomando ni consumiendo, y busca a alguien que te acompañe.'); crisisNext(); }
          else { setTrack('sustancias'); reflect(freshThemes, 1); if (/\brecai\b|\bvolvi a (tomar|consumir|fumar|jalar)\b|\b(llevaba|llevo) .{0,25}\bsin (tomar|consumir|fumar|jalar)\b/.test(t)) say('Una recaída no borra lo que habías logrado. Se puede retomar, y con apoyo es más posible.'); say('Gracias por contarme. Si en algún momento quieres orientación, el Fono Drogas y Alcohol es el 1412 y atiende las 24 horas.'); ask('¿Cómo estás ahora mismo?', 'estado'); }
          break;
        case 'BROMA':
          S.flags.add('BROMA');
          if (RANK[S.risk] >= 1 || F.ideation) { say('Está bien. Igual me lo tomo en serio, porque a veces lo que se dice en broma pesa de verdad.'); say(noCall() ? 'Si en algún momento lo sientes, aquí estoy.' : 'Si en algún momento lo sientes, aquí estoy, y el *4141 atiende las 24 horas.'); }
          else { say('Está bien. Este espacio queda abierto para cuando quieras conversar de verdad.'); casual('¿Cómo estás hoy?'); }
          break;
        case 'HUMANO':
          startSearch = true;
          say(S.searching ? 'Ya hay un especialista humano avisado; te va a escribir por aquí.' : 'Entiendo. Ya estoy buscando un especialista humano para que te atienda.');
          if (S.pros === 0 && !noCall() && !S.used.has('humano4141')) { S.used.add('humano4141'); say('Si necesitas hablar con una persona ahora mismo, el *4141 atiende por teléfono las 24 horas.'); }
          crisisMode() ? crisisNext() : ask('Mientras llega, ¿quieres contarme qué está pasando?', 'open'); break;
        case 'ES_BOT':
          say('Soy un asistente automático, no una persona. Te acompaño por aquí y, si lo necesitas, dejo tu caso para que te escriba un especialista humano del equipo.');
          if (S.searching) { say('Ya está avisado y viene en camino. Mientras, aquí sigo.'); if (crisisMode()) crisisNext(); }
          else ask('¿Quieres que busque uno ahora?', 'busco', ['Sí, búscame uno','Todavía no']);
          break;
        case 'TEMA': {
          startSearch = true;
          if (repeated) { ask('Te leo. ¿Quieres contarme un poco más de eso?', 'open'); break; }
          if (a.intents.includes('DISCULPA')) say('No tienes que pedir perdón.');
          if (S.verdad === S.turn && !S.used.has('verdad')) { S.used.add('verdad'); say('Gracias por decirme cómo estás de verdad. Aquí no tienes que hacer como que estás bien.'); themeFollow(); if (!chips.length) chips = CHIPS.calm; break; }
          if (S.track === 'helper' && /\bno (sabe|sabia)\b/.test(t)) { S.used.add('trhelper:1'); say('Podrías decírselo con algo simple, en un momento tranquilo: "Me preocupas. ¿Cómo estás de verdad?". Preguntar directo ayuda, y no le mete ideas en la cabeza.'); trackNext(); break; }
          if (S.track === 'helper' && !RISKY_OWN(S) && a.themes.some(x => ['ansiedad','animo'].includes(x))) { say(pick(['Es normal sentir miedo cuando alguien que quieres está así. Que te preocupes muestra lo mucho que te importa.','Tiene mucho sentido sentirse así. Acompañar a alguien que lo está pasando mal es muy difícil.'],'helpfear')); trackNext(); break; }
          if (S.track === 'past' && /\b(cuesta|duele|dificil|verguenza)\b/.test(t)) { say('Tómate tu tiempo. No tienes que contar nada más de lo que quieras.'); trackNext(); break; }
          if (!freshThemes.length) { const rfT = REFLECT.find(x => x[0].test(t)); if (rfT && !S.used.has('rfT' + REFLECT.indexOf(rfT))) { S.used.add('rfT' + REFLECT.indexOf(rfT)); say(pick(rfT[1], 'rf' + REFLECT.indexOf(rfT))); themeFollow(); break; } }
          if (long) say(pick(R.ackLong,'ackL'));
          let did = reflect(freshThemes, 1);
          if (!did) { const known = a.themes.slice().sort((x,y)=>TPRI.indexOf(x)-TPRI.indexOf(y)).find(x => T[x] && x !== 'animo' && !(x === 'familia' && (!famOk() || ['violence','grooming','past','helper'].includes(S.track)))); if (known) { say(pick(T[known].r.concat(T[known].a || [], R2[known] || []), 'k' + known)); did = 1; } }
          if (!did && !long) say(pick(T.animo.r,'ranimo'));
          themeFollow();
          if (!chips.length && (RANK[S.risk] >= 1 || S.themes.has('ansiedad'))) chips = CHIPS.calm;
          break; }
        case 'RESPIRAR': out.push({ type:'breath' }); S.sug.exercise++; S.lastQ = 'postresp'; break;
        case 'POSITIVO':
          if (/\by (tu|usted)\b/.test(t)) { say('Qué bueno. Por acá todo bien, gracias por preguntar.'); nextQ(true); break; }
          if (a.intents.includes('GRACIAS') && !a.intents.includes('DESPEDIDA')) { say('Me alegra que te haya servido. Aquí sigo si quieres seguir conversando.'); break; }
          if (!S.distress && !S.themes.size && RANK[S.risk] < 1 && !a.intents.includes('DESPEDIDA')) {
            if (/\b(mejor|bien de nuevo|ya estoy bien|estoy bien ahora|contarles|contarte|queria contar|queria contarles)\b/.test(t)) { say(pick(['¡Qué bueno leer eso! Me alegra mucho.','Qué alegría leerte así.'],'posF')); ask('¿Qué te ha ayudado a sentirte mejor?', 'open'); }
            else { say(pick(['Qué bueno.','Me alegra leer eso.'],'posF2')); ask(S.used.has('posQ1') ? '¿Qué te trajo por aquí hoy?' : '¿Hay algo de lo que quieras conversar hoy?', 'open'); S.used.add('posQ1'); }
            break;
          }
          say(pick(['Qué bueno leer eso. Los pequeños respiros también cuentan.','Me alegra. Sigo aquí si quieres seguir conversando.','Qué bien. Eso también es importante notarlo.'],'pos'));
          if (a.intents.includes('DESPEDIDA')) say(closing());
          else if (S.sug.exercise && lastQ === 'estado') ask('¿Quieres seguir conversando, o prefieres intentar descansar?', 'open');
          else nextQ(true);
          break;
        case 'DESPEDIDA':
          if (deferQ && pend && stillNeeded(pend) && ['ideacion','safe'].includes(pend.type)) { deferQ = false; S.leaving = true; ask(pend.type === 'ideacion' ? 'Antes de que te vayas, ¿me respondes algo? ¿Has tenido pensamientos de quitarte la vida?' : 'Antes de que te vayas, ¿me dices si estás en un lugar seguro?', pend.type, CHIPS[pend.type], (pend.tries||0) + 1); break; }
          if (S.turn <= 1) { say('Está bien. Si en algún momento quieres conversar, aquí voy a estar.'); break; }
          say(closing()); break;
        case 'GRACIAS': say(pick(['No hay de qué. Gracias a ti por confiar.','Gracias a ti por escribir.'],'grac')); wrapUp(); break;
        case 'SALUDO':
          if (/\b(que onda|que tal|como estai|como estay|como estas|como te va|como andai|como andas|como va|que hay|que cuentas|que contai)\b/.test(t)) { if (S.turn === 1) S.used.add('meAlegra'); say(S.turn === 1 ? `Hola${S.name ? ', ' + S.name : ''}. Aquí estoy, para escucharte.` : 'Aquí estoy, para escucharte.'); ask('¿Y tú, cómo estás?', 'estado'); }
          else if (S.turn === 1) { S.used.add('meAlegra'); ask(`Hola${S.name ? ', ' + S.name : ''}. Me alegra que hayas escrito. ¿Cómo estás hoy?`, 'estado'); }
          else { say('Hola, aquí sigo.'); casual('¿Cómo vas?'); } break;
        case 'OFFTOPIC': S.n.offtopic++; say(S.n.offtopic === 1 ? 'Este espacio es solo para acompañarte con cómo te sientes, así que con eso no te puedo ayudar.' : 'Con eso tampoco te puedo ayudar, perdona.'); casual(S.n.offtopic === 1 ? '¿Cómo has estado tú?' : null); break;
        case 'PREGUNTA':
          if (crisisMode()) { say('No sé si tengo la respuesta a eso.'); ask('Lo que sí sé es que ahora lo importante eres tú. ¿Cómo estás en este momento?', 'estado'); break; }
          say(pick(['No estoy seguro de haber entendido tu pregunta.','No sé si te entendí bien.'],'preg'));
          ask('¿Me cuentas un poco más a qué te refieres?', 'open'); break;
        case 'GIBBERISH': S.n.gib = (S.n.gib||0) + 1; ask(S.n.gib === 1 ? 'No logré entenderte bien. ¿Me lo puedes escribir de otra forma? No te preocupes por la ortografía.' : 'Sigo sin entenderte, perdona. ¿Me cuentas con otras palabras cómo estás?', 'open'); break;
        default: fallback();
      }
    }
    function casual(q){ if (crisisMode()) return crisisNext(); if (pend && IMPORTANT.has(pend.type) && tryReask(pend)) return; if (TRACK_F[S.track]) return trackNext(); if (q && S.risk !== 'high') ask(q, 'estado'); else nextQ(true); }
    function wrapUp(){ if (pend && IMPORTANT.has(pend.type) && tryReask(pend)) return; if (crisisMode()) return crisisNext(); if (TRACK_F[S.track]) return trackNext(); if (S.distress || S.themes.size) { if (!S.used.has('wrapE')) { S.used.add('wrapE'); return ask(pick(['¿Quieres seguir contándome, o prefieres dejarlo aquí por ahora?','Aquí sigo. ¿Quieres seguir conversando?'],'wrapE'), 'open'); } return nextQ(true); } if (!S.used.has('duda')) { S.used.add('duda'); return ask('¿Te queda alguna duda, o seguimos conversando?', 'open'); } nextQ(true); }
    function fallback(){
      if (repeated) { say('Te leo. Tómate tu tiempo.'); return; }
      if (S.turn === 1 && a.age !== null) { say(S.minor ? 'Hola. Gracias por contarme tu edad.' : 'Gracias por contármelo.'); ask('Cuéntame con tus palabras qué está pasando.', 'open'); return; }
      const rfF = REFLECT.find(x => x[0].test(t)); if (S.turn === 1 && rfF && rfF[2] !== 'noQ') { say(pick(rfF[1], 'rf' + REFLECT.indexOf(rfF))); return nextQ(true); }
      if (S.turn === 1 && a.toks.length >= 8) { ask('Gracias por contarme. ¿Y cómo te sentiste con todo eso?', 'estado'); return; }
      if (S.turn === 1) { ask('Gracias por escribir. Cuéntame con tus palabras qué está pasando.', 'open'); return; }
      if (S.themes.size || RANK[S.risk] >= 1) startSearch = true;
      if (/^(m+|e+h*|a+h+|em+|este|uf+|ay+|pf+|me)$/.test(t)) { say(pick(['Tómate tu tiempo. Aquí estoy.','Sin apuro. Te leo cuando quieras.'],'hes')); return; }
      if (a.age !== null && a.toks.length <= 5) { say('Gracias por contármelo.'); if (S.minor && !S.used.has('menor')) { S.used.add('menor'); say('A tu edad pueden pasar cosas muy difíciles, y está muy bien pedir ayuda. También existe el 1515 (Línea Libre), una línea especial para jóvenes.'); } return next(true); }
      if (/\b(no me (responde|contesta|ha respondido|ha contestado)|todavia no (me )?(responde|contesta))\b/.test(t)) { say('A veces la gente tarda en ver los mensajes. Mientras tanto, aquí estoy contigo.'); return next(true); }
      if (lastQ === 'libre') { say(a.answer === 'unsure' || a.answer === 'no' ? 'Está bien.' : pick(['Qué bueno tener algo que te guste.','Me gusta leer eso.'],'libre')); return ask('¿Y cómo te sientes ahora, conversando de otra cosa?', 'estado'); }
      if (lastQ === 'despertar' && (a.answer === 'yes' || a.answer === 'ack' || /\b(voy|ya voy|ok|bueno|dale|ya la desperte|ya lo desperte)\b/.test(t))) { say('Bien. Ve con esa persona; aquí sigo cuando quieras escribirme.'); return; }
      if (lastQ === 'despertar' && (a.answer === 'no' || /\bno quiero\b/.test(t))) { say('Está bien. Entonces quédate cerca de esa persona, en la misma pieza si puedes. Eso ya ayuda.'); return crisisNext(); }
      if (lastQ === 'calma' && a.answer) { say(a.answer === 'yes' ? 'Bien. Acércate a eso, aunque sea un ratito. Yo sigo aquí.' : 'Está bien. Entonces quedémonos conversando.'); return next(true); }
      if (lastQ === 'persona' && !a.answer && /^(si,? )?(mi|mis|una?) \w+/.test(t)) a.answer = 'yes';
      if (lastQ === 'persona' && !a.answer && (ch.alone === true || ch.someone === false || /^no\b/.test(t))) a.answer = 'no';
      if (lastQ === 'means' && /\b(cuant\w*|muchas|varias|hartas|monton)\b/.test(t)) { say('No importa cuántas sean.'); return crisisNext(); }
      if (lastQ === 'persona' && a.answer && a.answer !== 'ack') { F.personKnown = true; if (a.answer === 'yes') { say('Qué bueno que tengas a alguien.'); return ask('¿Esa persona sabe cómo te estás sintiendo?', 'sabe'); } say('Entiendo. Por eso vale tanto que hayas escrito aquí.'); return next(); }
      if (lastQ === 'sabe' && a.answer && S.track === 'helper') { say(a.answer === 'yes' ? 'Qué bueno que lo sepa; eso abre la puerta para conversar.' : 'Podrías decírselo con algo simple, en un momento tranquilo: "Me preocupas. ¿Cómo estás de verdad?". Preguntar directo ayuda, y no le mete ideas en la cabeza.'); return trackNext(); }
      if (lastQ === 'sabe' && a.answer) { say(a.answer === 'yes' ? 'Eso es muy importante. No tienes que cargar esto sin apoyo.' : 'A veces cuesta mucho contarlo. El especialista también te puede ayudar a pensar cómo hacerlo.'); return next(); }
      if (lastQ === 'razon') { if (/\b(nada|ninguna|ninguno|no se|nunca|no hay)\b/.test(t) || a.answer === 'no') say('Está bien si hoy no aparece nada. A veces hay que buscarlo con ayuda, y para eso viene el especialista.'); else say('Eso importa. Guárdalo cerca estos días.'); return next(true); }
      const pq = S.prevQ || '';
      if (/o es algo que se fue acumulando/.test(pq)) {
        if (a.answer === 'yes' && a.toks.length <= 2) return ask('¿Qué pasó? Cuéntame, a tu ritmo.', 'open');
        if (/\b(acumul\w*|de a poco|de todo|todo junto|hace tiempo|harto tiempo|las dos|ambas)\b/.test(t)) { say('Cuando se va acumulando, llega un punto en que todo pesa demasiado.'); return next(); }
      }
      if (/seguir contándome, o prefieres dejarlo/.test(pq)) {
        if ((a.answer === 'yes' || a.answer === 'ack') && a.toks.length <= 2 || /\b(seguir|sigamos|seguimos)\b/.test(t)) { say('Bueno, te leo. Cuéntame lo que quieras.'); S.lastQ = 'open'; return; }
        if (a.answer === 'no' || /\b(dejarlo|dejemoslo|hasta aqui|por ahora no)\b/.test(t)) { say(closing()); return; }
      }
      if (/alguna duda, o seguimos/.test(pq) && (a.answer === 'yes' || a.answer === 'ack') && a.toks.length <= 2) { say('Claro, dime.'); S.lastQ = 'open'; return; }
      if (/quieres contarme/.test(pq) && (a.answer === 'yes' || a.answer === 'ack') && a.toks.length <= 2) { say(pick(['Te leo. Cuéntame como te salga.','Aquí estoy, te leo.'],'ackCont')); S.lastQ = 'open'; return; }
      if (S.minimal >= 3 && S.used.has('emoChips') && !crisisMode() && a.toks.length <= 2) { if (RISKY_OWN(S) && !S.askedIdeation) { S.askedIdeation = true; say('No tienes que contestar mucho.'); return ask('Solo quiero preguntarte algo importante, porque me importa: ¿has tenido pensamientos de quitarte la vida?', 'ideacion', CHIPS.ideacion); } say(pick(['Está bien. No tienes que contestar nada; me quedo aquí contigo, sin apuro.','Aquí sigo, sin apuro.','Te acompaño igual, aunque no haya mucho que decir.'],'minQuiet')); chips = CHIPS.calm; S.lastQ = 'open'; return; }
      if (S.minimal >= 2 && !crisisMode() && !S.used.has('emoChips') && a.toks.length <= 2) { S.used.add('emoChips'); say('No tienes que tener respuestas claras.'); ask('Si te sirve, elige lo que más se parezca a cómo estás hoy, o escríbelo con tus palabras:', 'estado', ['Me siento triste','Tengo angustia','Me siento solo/a','Tengo rabia','Estoy agotado/a']); return; }
      const rf0 = !TIME_RE.test(t) && REFLECT.find(x => x[0].test(t));
      if (rf0) { say(pick(rf0[1], 'rf' + REFLECT.indexOf(rf0))); if (rf0[2] === 'noQ') return; if (crisisMode()) return crisisNext(); if (TRACK_F[S.track]) return trackNext(); return nextQ(true); }
      if (lastQ === 'cuando' || (F.timeKnown && /^(hace|desde|como|unos|unas|un|una|\d+)\b/.test(t))) {
        if (/\b(juntos|juntas|de pololeo|pololeando|de relacion|casados|de casados|de matrimonio|de amistad)\b/.test(t)) { F.timeKnown = true; say(S.themes.has('pareja') ? 'Es harto tiempo juntos; tiene sentido que duela tanto.' : 'Es harto tiempo.'); return next(); }
        if (!TIME_RE.test(t) && !/^(hace|desde|como|unos|unas|un|una|\d+)\b/.test(t) && !/\b(semana|semanas|mes|meses|ano|anos|dia|dias|hoy|ayer|anoche|siempre|tiempo|rato|chic[oa]|nin[oa]|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|verano|invierno|vacaciones|pandemia|manana|poco)\b/.test(t)) { say(pick(long ? R.ackLong : R.ackShort, long ? 'ackL' : 'ackS')); return next(); }
        F.timeKnown = true;
        if (S.themes.has('migracion') && lastQTheme === 'migracion') { say('Es harto tiempo lejos de los tuyos.'); return next(); }
        if (/\b(siempre|anos|ano|chico|chica|nino|nina|mucho tiempo|harto tiempo|toda la vida|meses)\b/.test(t)) say('Es mucho tiempo cargando con esto. Que lo hayas aguantado habla de tu fuerza, pero no tienes por qué seguir sin apoyo.');
        else if (/\b(semana|semanas|mes|harto|tiempo|desde|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|verano|invierno|vacaciones)\b/.test(t)) say('Es harto tiempo sintiéndote así.');
        else if (/^(manana|pasado manana|esta semana|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|la proxima semana)$/.test(t)) say('Es muy pronto, y eso hace que todo se sienta más urgente.');
        else if (/\b(hoy|ayer|recien|poco|dias|dia|anoche|noche|manana|rato)\b/.test(t)) say('Entonces es algo reciente, y puede sentirse muy de golpe.');
        else say(pick(long ? R.ackLong : R.ackShort, long ? 'ackL' : 'ackS'));
        return next();
      }
      if (lastQ === 'ayudo' && /\b(mi|mis) (\w+)/.test(t) && /\b(mama|papa|hermano|hermana|amigo|amiga|amigos|amigas|pareja|polola|pololo|abuela|abuelo|tia|tio|prima|primo|perro|perrita|gato|gata|familia|hijo|hija|esposa|esposo)\b/.test(t)) { const who = (t.match(/\b(mi|mis) (\w+)/) || [])[0].replace(/^mi /,'tu ').replace(/^mis /,'tus '); say(`${who.charAt(0).toUpperCase() + who.slice(1)}. Eso vale mucho.`); return ask(/perr|gat/.test(who) ? '¿Podrías pasar un rato con tu mascota hoy?' : '¿Podrías escribirle hoy, aunque sea un mensaje corto?', 'open'); }
      if (lastQ === 'ayudo' && (a.answer === 'yes' || a.answer === 'ack') && a.toks.length <= 2) return ask('¿Qué cosa te ha ayudado?', 'open');
      if (lastQ === 'ayudo') {
        if (a.answer === 'unsure' || /^(no se|nose|ni idea|no sabria|no me acuerdo)$/.test(t)) { say('Está bien si ahora no se te ocurre nada; a veces cuesta verlo.'); return next(true); }
        const none = /\b(nada|ninguna|ninguno|nunca)\b/.test(t) || a.answer === 'no';
        if (none) { say('Está bien si ahora nada parece servir. Eso no significa que no haya salida.'); return next(true); }
        return ask('Vale la pena tenerlo presente. ¿Podrías hacer algo de eso hoy, aunque sea un poquito?', 'open');
      }
      if (lastQ === 'estado' && /\b(igual|lo mismo|normal|mas o menos)\b/.test(t)) { say('Está bien. A veces los cambios son lentos.'); return next(true); }
      if (a.toks.length === 1 && /^(nada|nah?)$/.test(a.toks[0])) { say(crisisMode() ? 'Está bien. No tienes que decir nada; me quedo aquí.' : 'Está bien. A veces no hay una sola cosa, o cuesta ponerle palabras.'); return next(true); }
      if (a.toks.length <= 2 && /\btodo\b/.test(t)) { say('Cuando todo pesa, es agotador.'); return ask('¿Por dónde te gustaría empezar?', 'open'); }
      if (F.emergency && !F.called && /\b(cuant|no se|no me acuerdo)/.test(t)) { say('No te preocupes por eso ahora. Lo importante es que te vea un médico.'); return next(); }
      if (/^(ya )?(un poco|un poquito|algo)( mejor| mas tranquil[oa])?$/.test(t) && /(sientes|descansar|conversando|calmarte|distinto)/.test(S.prevQ || '')) { say('Bueno, aunque sea un poco ya es algo.'); return next(true); }
      if (a.answer === 'ack') { say(pick(['Te leo.','Aquí sigo.','Sigo aquí contigo.'],'ackAck')); return next(true); }
      if (a.answer === 'unsure') { say(pick(['Está bien no tenerlo claro.','No pasa nada si no lo tienes claro.','Está bien, a veces cuesta saberlo.'],'unsureA')); return next(true); }
      if (a.answer === 'yes') { say(pick(R.ackShort,'ackS')); return next(true); }
      if (a.answer === 'no') { say('Está bien.'); return next(true); }
      if (a.primary === 'RISA') { say(RANK[S.risk] >= 1 ? 'Te leo. A veces uno se ríe para no llorar.' : 'Te leo.'); return next(true); }
      const rf = REFLECT.find(x => x[0].test(t));
      if (rf) { say(pick(rf[1], 'rf' + REFLECT.indexOf(rf))); if (rf[2] === 'noQ') return; if (crisisMode()) return crisisNext(); if (TRACK_F[S.track]) return trackNext(); return nextQ(true); }
      if (crisisMode()) { if (ch.alone === true && before.alone !== true) say('Gracias por decírmelo. No estás sin compañía: me quedo aquí contigo.'); else if (long) say(pick(R.ackLong,'ackL')); else if (a.toks.length >= 3 && !a.answer) say(pick(['Gracias por contármelo.','Te leo.','Entiendo, gracias por decírmelo.'],'crisAck')); return crisisNext(); }
      if (S.track === 'past' && /\b(cuesta|duele|dificil)\b/.test(t)) { say('Tómate tu tiempo. No tienes que contar nada más de lo que quieras.'); return trackNext(); }
      if (TRACK_F[S.track]) { say(pick(long ? R.ackLong : R.ackShort, long ? 'ackL' : 'ackS')); return trackNext(); }
      const qt = lastQTheme && T[lastQTheme] && T[lastQTheme].a;
      if (S.themes.has('duelo') && /\b(extran|echo de menos|falta)/.test(t)) say('Es muy natural extrañar así. Esas conversaciones dejan un espacio enorme.');
      else if (qt && a.toks.length >= 3) say(pick(qt, 'a' + lastQTheme));
      else say(pick(long ? R.ackLong : R.ackShort, long ? 'ackL' : 'ackS'));
      nextQ(true);
    }
    function finish(forward){
      if (forward) return { replies: [], chips: [], forward: true, risk: S.risk, urgent: [...S.flags].some(f => URGENT.has(f)), showCrisis: RANK[S.risk] >= 2, startSearch: false, flags:[...S.flags], themes:[...S.themes], safe: safeLabel(), minor: S.minor, resources:[...S.resources], analysis: a, primary: P, facts: Object.assign({}, F) };
      if (startSearch && !S.searching) {
        S.searching = true;
        if (S.pros === 0) { if (!S.used.has('sinpro')) { S.used.add('sinpro'); if (!out.some(x => typeof x === 'string' && /no hay especialistas conectados/.test(honest(x)))) { const has4141 = out.some(x => typeof x === 'string' && /4141/.test(x)); const v = RANK[S.risk] >= 2 ? (noCall() || has4141 ? SINPRO_CORTO : (S.sug.call++, SINPRO_ALTO)) : RANK[S.risk] >= 1 || crisisMode() ? SINPRO : SINPRO_SUAVE; out.splice(Math.max(out.length-1,0), 0, v); } } }
        else if (!RISKY.has(P) && !['TERCERO','INTENTO_PREVIO','PASIVA','IDEACION_NEGADA','HUMANO','AYUDA','ESPERA','QUEJA','LUGAR_PELIGRO','IDEACION_HUMOR','RAZON','NO_LLAMAR'].includes(P) && !S.pending) out.splice(Math.max(out.length-1,0), 0, pick(R.search,'search'));
      } else if (startSearch) startSearch = false;
      if (S.flags.has('MENOR') && !S.used.has('menor') && RANK[S.risk]>=1) { S.used.add('menor'); if (!out.some(x => typeof x === 'string' && /1515/.test(x))) out.splice(Math.max(out.length-1,0), 0, 'Como eres menor de edad, también puedes llamar gratis al 1515 (Línea Libre). Y si puedes, cuéntale a un adulto de confianza.'); }
      if ([...S.flags].some(f => URGENT.has(f))) urgent = true;
      if (RANK[S.risk] >= 2) showCrisis = true;
      let cleaned = out.filter(Boolean);
      // frases que se dicen una sola vez por conversación
      if (S.turn > 2) cleaned = cleaned.map(x => typeof x === 'string' ? x.replace(/ ?Me alegra que hayas escrito\./, '').trim() : x).filter(x => typeof x !== 'string' || x.length);
      cleaned = cleaned.map(x => { if (typeof x !== 'string') return x; for (const ph of ONCE) if (x.includes(ph)) { const k = 'once:' + ph; if (S.used.has(k)) x = x.replace(' ' + ph, '').replace(ph + ' ', '').replace(ph, '').trim(); else S.used.add(k); } return x; }).filter(x => typeof x !== 'string' || x.length);
      if (S.pros === 0) { cleaned = cleaned.map(x => typeof x === 'string' ? honest(x) : x); if (cleaned.includes(SINPRO) && cleaned.some(x => typeof x === 'string' && x !== SINPRO && /quedó registrado/.test(x))) cleaned = cleaned.map(x => x === SINPRO ? SINPRO_CORTO : x); }
      // no repetir afirmaciones largas dichas hace poco
      const recent = S.recent || [];
      const dedup = cleaned.filter(x => typeof x !== 'string' || /\?\s*$/.test(x) || x.length < 25 || /^(Mira a tu alrededor|Escríbeme 5|Bien\. Ahora dime 4|Muy bien\. Ahora 3|Vas bien\. Ahora 2|Último: 1|Ahora dime 4|Ahora 3|Ahora 2)/.test(x) || !recent.includes(x));
      if (!dedup.length && cleaned.length) cleaned = [pick(['Sí, te leí. Sigo aquí.','Entendido.','Te sigo leyendo.','Aquí sigo, te leo.'],'rep')];
      else if (dedup.some(x => typeof x !== 'string' || x.length)) { if (dedup.length < cleaned.length && dedup.every(x => typeof x === 'string' && /\?\s*$/.test(x)) ) dedup.unshift(pick(['Te leo.','Aquí sigo contigo.','Te sigo leyendo.'],'ackDedup')); cleaned = dedup; }
      cleaned = cleaned.filter((x, i) => typeof x !== 'string' || cleaned.indexOf(x) === i);
      // máximo 4 burbujas: se juntan las afirmaciones cortas contiguas
      while (cleaned.filter(x => typeof x === 'string').length > 4) {
        let bi = -1, bl = 1e9;
        for (let i = 0; i < cleaned.length - 1; i++) { const x = cleaned[i], y = cleaned[i+1]; if (typeof x !== 'string' || typeof y !== 'string' || /\?\s*$/.test(x) || /\n/.test(x+y)) continue; if (x.length + y.length < bl) { bl = x.length + y.length; bi = i; } }
        if (bi < 0) break;
        cleaned.splice(bi, 2, cleaned[bi] + ' ' + cleaned[bi+1]);
      }
      S.recent = recent.concat(cleaned.filter(x => typeof x === 'string')).slice(-10);
      S.prevTurn = S.turn; S.lastPrimary = P;
      const lastStr = [...cleaned].reverse().find(x => typeof x === 'string');
      if (!S.lastQ) S.lastQ = qtype(lastStr);
      if (lastStr && /\?\s*$/.test(lastStr)) S.prevQ = (lastStr.match(/¿[^¿]*\?\s*$/)||[lastStr])[0];
      S.lastBot = cleaned.filter(x => typeof x === 'string').join(' '); if (P !== 'REPETIR') S.lastContent = S.lastBot; S.lastUser = a.norm;
      if (!chips.length && crisisMode() && !S.pending && !S.ground) chips = CHIPS.calm;
      if (!cleaned.length) cleaned.push(crisisMode() ? 'Aquí sigo contigo.' : 'Te leo.');
      return { replies: cleaned, chips, risk: S.risk, urgent, showCrisis, startSearch, flags:[...S.flags], themes:[...S.themes],
               safe: safeLabel(), minor: S.minor, resources:[...S.resources], analysis: a, primary: P, facts: Object.assign({}, F) };
    }
  }
  function safeLabel(){ return F.safe === true ? 'Sí' : F.safe === false ? 'No' : F.safe === 'sin_respuesta' ? 'Sin respuesta' : 'Sin preguntar'; }
  return { start, reply, event, state: S, exportState, setPros };
}
const SINPRO = 'Ahora mismo no hay especialistas conectados. Tu caso quedó registrado y te van a escribir por aquí apenas alguien se conecte.';
const SINPRO_CORTO = 'Ahora mismo no hay especialistas conectados; te van a escribir por aquí apenas alguien se conecte.';
const SINPRO_ALTO = 'Ahora mismo no hay especialistas conectados; te van a escribir por aquí apenas alguien se conecte. Si no puedes esperar, el *4141 atiende ahora mismo, las 24 horas.';
const SINPRO_SUAVE = 'Dejé anotado tu caso para que te escriba alguien del equipo. Ahora no hay especialistas conectados, así que puede tardar; mientras, sigo aquí contigo.';
const HONEST = [
  [/Ya estoy buscando un especialista para que te atienda hoy o mañana\. Mientras tanto, sigo aquí contigo\./, SINPRO + ' Mientras tanto, sigo aquí contigo.'],
  [/Seguimos por aquí: el especialista te va a escribir por este chat\./, 'Seguimos por aquí, por escrito.'],
  [/ El especialista también te va a escribir por este chat\./, ' Y apenas alguien del equipo se conecte, te va a escribir por aquí.'],
  [/^Mientras llega, /, 'Mientras tanto, '],
  [/Por ahora el contacto es por este chat: aquí mismo te va a escribir el especialista\./, 'Por ahora el contacto es por este chat: aquí mismo te van a escribir apenas alguien del equipo se conecte.'],
  [/Ya avisé a un especialista para que te atienda\. Mientras llega, aquí estoy\./, SINPRO + ' Mientras tanto, aquí estoy.'],
  [/Ya estoy buscando un especialista humano para que te atienda\./, SINPRO],
  [/Ya hay un especialista humano avisado; te va a escribir por aquí\./, SINPRO],
  [/Ya está avisado y viene en camino\./, 'Tu caso quedó registrado y te van a escribir apenas alguien se conecte.'],
  [/Todavía no he pedido un especialista\. Normalmente contestan en pocos minutos\./, 'Ahora mismo no hay especialistas conectados, pero puedo dejar tu caso registrado para que te escriban apenas alguien se conecte.'],
  [/¿Quieres que lo busque ahora\?/, '¿Quieres que lo deje registrado?'],
  [/Listo, ya lo pedí\./, 'Listo, quedó registrado.'],
  [/Tu caso está marcado como urgente y el especialista ya fue avisado\. En estos casos suelen contestar en pocos minutos\./, 'Tu caso está marcado como urgente, pero ahora no hay especialistas conectados. Si estás en peligro, llama al *4141 o al 131.'],
  [/El especialista ya está avisado\. Normalmente contestan en pocos minutos, y como máximo te dan hora para mañana\./, SINPRO],
  [/Si nadie contesta pronto, una especialista de guardia toma tu caso\./, 'Apenas alguien del equipo se conecte, va a tomar tu caso.'],
  [/• El especialista tiene tu caso como urgente y te va a escribir por aquí\./, '• Tu caso quedó registrado como urgente; te van a escribir por aquí apenas alguien se conecte.'],
  [/Ya alerté a un especialista para que hable contigo\./, 'Tu caso quedó registrado para que alguien del equipo hable contigo.'],
  [/ El especialista ya viene\./, ''],
  [/Lo importante es que un especialista humano ya está avisado\./, 'Lo importante es que tu caso quedó registrado.'],
  [/El especialista ya está avisado y te va a ayudar a pensar qué hacer\./, 'Tu caso quedó registrado; quien lo tome te va a ayudar a pensar qué hacer.'],
  [/El especialista ya está avisado y te va a orientar;/, 'Tu caso quedó registrado para que el equipo te oriente;'],
  [/el especialista que viene sí puede evaluarte/, 'el especialista que tome tu caso sí puede evaluarte'],
  [/para eso viene el especialista/, 'para eso está el equipo de especialistas'],
  [/Bien\. Ya está avisado\./, 'Bien. Tu caso quedó registrado.'],
  [/queda avisado/, 'queda registrado'],
  [/([Yy])a (?:avisé|alerté|pedí)( con prioridad máxima| con prioridad)? (?:a un especialista|al especialista|a los especialistas disponibles|un especialista)( con prioridad máxima| con prioridad)?/g, (m, y, p1, p2) => (y === 'Y' ? 'T' : 't') + 'u caso quedó registrado' + (p1 || p2 || '')],
  [/([Ee])l especialista (ya|también) (?:tiene tu caso|está avisado|fue avisado|fue alertado)( con prioridad máxima| como prioritario| con prioridad)?/g, (m, e, ya, p) => (e === 'E' ? 'T' : 't') + 'u caso ' + (ya === 'también' ? 'también ' : '') + 'quedó registrado' + (p || '')],
  [/Ya hay un especialista avisado/, 'Tu caso ya quedó registrado'],
  [/ mientras llega el especialista\?/g, ' mientras tanto?'],
  [/ mientras llega el especialista\./g, '.'],
  [/El especialista te puede ayudar a ver opciones\./, 'Quien tome tu caso te puede ayudar a ver opciones.'],
  [/se lo dejo anotado al especialista para que te ayude a buscar dónde quedarte\./, 'lo dejo anotado en tu caso para que te ayuden a buscar dónde quedarte.'],
  [/Se lo dejo anotado al especialista( también)?\./, (m, t) => 'Lo dejo anotado en tu caso' + (t || '') + '.']
];
function honest(x){ for (const [re, to] of HONEST) x = x.replace(re, to); return x; }
const ONCE = ['Me alegra que hayas escrito.', 'Aquí puedes decirlo sin filtro.', 'Que lo hayas aguantado habla de tu fuerza, pero no tienes por qué seguir sin apoyo.', 'No te voy a juzgar.', 'Gracias a ti por confiar.'];
function tildes(x){ return x.replace(/\bmama(s?)\b/,'mamá$1').replace(/\bpapa(s?)\b/,'papá$1').replace(/\btia(s?)\b/,'tía$1').replace(/\btio(s?)\b/,'tío$1').replace(/\bcunad([oa]s?)\b/,'cuñad$1'); }
function personIn(t){ const m = t.match(/\b(mi|mis) (mama|papa|mami|papi|papas|viejos|vieja|viejo|familia|hermano|hermana|hermanos|hermanas|amigo|amiga|amigos|amigas|pareja|polola|pololo|novio|novia|abuela|abuelo|abuelos|tia|tio|prima|primo|primos|esposa|esposo|marido|hijo|hija|hijos|hijas|vecino|vecina|madrina|padrino|profe|jefe|jefa|suegra|suegro|cunado|cunada|nieto|nieta|sobrino|sobrina)\b/); return m ? tildes(m[0].replace(/^mi /,'tu ').replace(/^mis /,'tus ')) : null; }
const ARTLOC = { pieza:'tu pieza', casa:'tu casa', bano:'el baño', cama:'tu cama', trabajo:'el trabajo', pega:'la pega', colegio:'el colegio', liceo:'el liceo', universidad:'la universidad', calle:'la calle', auto:'el auto', micro:'la micro', metro:'el metro', plaza:'una plaza', parque:'un parque', departamento:'tu departamento', depto:'tu depto', hospital:'el hospital', living:'el living', cocina:'la cocina', patio:'el patio' };
function RISKY_OWN(S){ return ['IDEACION','PLAN','EMERGENCIA','METODO','AUTOLESION','PASIVA','INTENTO_PREVIO','IDEACION_NEGADA','DUELO_SUICIDIO','NOTICIA_SUICIDIO'].some(f=>S.flags.has(f)) || S.themes.has('animo'); }

const API = { create, analyze, normalize, FLAG_LABEL, THEMES, RES, URGENT, PROMESA: /(?:avisé|alerté|pedí)(?: con prioridad(?: máxima)?)? (?:a un|al|a los|un) especialista|especialista (?:humano )?(?:ya|también) (?:está avisado|fue|tiene)|especialista tiene tu caso|ya está avisado|especialista (?:humano )?avisado|queda avisado|viene en camino|especialista ya viene|llega el especialista|especialista que viene|viene el especialista|ya lo pedí|buscando un especialista|contestan en pocos minutos|suelen contestar|guardia (?:ya tiene|toma) tu caso/i, LEX: { L, THEMES } };
if (typeof module !== 'undefined') module.exports = API; else root.Acompana = API;
})(this);
