'use strict';
/* Chat de la persona: muestra la conversación con ritmo de escritura, recibe en vivo al especialista y ofrece avisos. */
(() => {
  const { $, api, esc, soportaAvisos, activarAvisos } = window.RA;
  const slug = (location.pathname.match(/^\/o\/([a-z0-9-]{2,40})\/?$/) || [])[1] || '';
  const log = $('#log');
  const vistos = new Set();
  let cola = [], actual = null, reloj = null, fuente = null, paso = 'escuchando', especialista = null, enviando = false;

  const abajo = () => { log.scrollTop = log.scrollHeight; };
  function presencia(t) {
    $('#presencia').textContent = t || ({ escuchando: 'Te escuchamos', buscando: 'Buscando especialista', con_especialista: especialista ? especialista + ' está contigo' : 'Con especialista', agendado: 'Hora agendada' })[paso];
  }

  function nodo(m) {
    if (m.id) { if (vistos.has(m.id)) return; vistos.add(m.id); }
    if (m.tipo === 'respiracion') return respirar();
    const d = document.createElement('div');
    if (m.autor === 'sistema') {
      d.className = 'msg sys' + (m.tipo === 'alerta' ? ' alert' : '');
      d.textContent = m.texto;
    } else {
      d.className = 'msg ' + ({ persona: 'user', bot: 'bot', especialista: 'pro' })[m.autor];
      if (m.autor !== 'persona') { const w = document.createElement('span'); w.className = 'who'; w.textContent = m.autor === 'especialista' ? m.nombre || 'Especialista' : 'Acompaña'; d.append(w); }
      d.append(document.createTextNode(m.texto));
    }
    log.append(d);
    abajo();
  }

  function opciones(lista) {
    const q = $('#quick');
    q.innerHTML = '';
    (lista || []).forEach(t => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; q.append(b); });
    abajo();
  }

  /* cola con ritmo: los mensajes del bot aparecen de a uno, con "escribiendo…" */
  function decir(m) { cola.push(m); bombear(); }
  function bombear() {
    if (actual || !cola.length) return;
    const m = cola.shift();
    if (m.chips) { opciones(m.chips); return bombear(); }
    if (m.autor !== 'bot' || m.tipo === 'respiracion' || (m.id && vistos.has(m.id))) { nodo(m); return bombear(); }
    actual = m;
    const t = document.createElement('div');
    t.className = 'typing';
    t.setAttribute('aria-hidden', 'true');
    t.innerHTML = '<span></span><span></span><span></span>';
    log.append(t);
    abajo();
    presencia('Escribiendo…');
    reloj = setTimeout(() => { t.remove(); actual = null; nodo(m); presencia(); bombear(); }, Math.min(450 + m.texto.length * 14, 1800));
  }
  function vaciar() {
    clearTimeout(reloj);
    document.querySelectorAll('.typing').forEach(t => t.remove());
    const resto = (actual ? [actual] : []).concat(cola.splice(0));
    actual = null;
    resto.forEach(m => { if (!m.chips) nodo(m); });
    presencia();
  }

  function respirar() {
    const w = document.createElement('div');
    w.className = 'breath';
    w.innerHTML = '<div class="ring"></div><div class="lbl">Sigue el círculo. Prepárate…</div>';
    log.append(w);
    abajo();
    const r = w.querySelector('.ring'), l = w.querySelector('.lbl');
    let n = 0;
    const ciclo = () => {
      if (n++ >= 3) { l.textContent = 'Bien hecho.'; decir({ autor: 'bot', texto: '¿Cómo te sientes ahora, aunque sea un poquito distinto?' }); cola.push({ chips: ['Un poco mejor', 'Igual', 'Peor'] }); bombear(); return; }
      r.className = 'ring grow'; l.textContent = 'Inhala… 4';
      setTimeout(() => { r.className = 'ring hold'; l.textContent = 'Sostén… 4'; }, 4000);
      setTimeout(() => { r.className = 'ring shrink'; l.textContent = 'Exhala… 6'; }, 8000);
      setTimeout(ciclo, 14000);
    };
    setTimeout(ciclo, 900);
  }

  function estado(c) {
    if (!c) return;
    paso = c.paso || 'escuchando';
    especialista = c.especialista || null;
    const n = { escuchando: 1, buscando: 2, agendado: 2, con_especialista: 3 }[paso] || 1;
    [1, 2, 3].forEach(i => { $('#s' + i).className = 'step' + (i < n ? ' done' : i === n ? ' active' : ''); });
    const f = $('#folio');
    f.hidden = !c.folio;
    f.textContent = c.folio ? 'N.º ' + c.folio : '';
    presencia();
    if (paso === 'buscando' || paso === 'agendado') ofrecerAvisos();
  }

  function crisis(c, mostrar) {
    const box = $('#crisis');
    if (!c || (!mostrar && box.hidden)) return;
    box.hidden = false;
    $('#crisis-head').innerHTML = c.suave ? 'Estas líneas atienden gratis, por si en algún momento las necesitas.' : '<strong>Si estás en peligro ahora, llama de inmediato.</strong> Son gratuitas.';
    $('#nums').innerHTML = c.recursos.map(r => `<a href="${esc(r.enlace)}"><b>${esc(r.numero)}</b>${esc(r.nombre)}</a>`).join('');
  }

  function ofrecerAvisos() {
    let no = false;
    try { no = localStorage.getItem('ra_sin_avisos') === '1'; } catch { /* sin almacenamiento */ }
    if (!soportaAvisos() || Notification.permission !== 'default' || no) return;
    $('#oferta').hidden = false;
  }

  function conectar() {
    if (fuente || !('EventSource' in window)) return;
    fuente = new EventSource('/api/persona/stream');
    let primera = true;
    fuente.addEventListener('open', () => { if (!primera) sincronizar(); primera = false; });
    fuente.addEventListener('mensaje', e => decir(JSON.parse(e.data)));
    fuente.addEventListener('estado', e => estado(JSON.parse(e.data)));
  }
  async function sincronizar() {
    try {
      const d = await api('GET', '/api/persona/inicio');
      if (d.conversacion) { d.mensajes.forEach(m => { if (!vistos.has(m.id)) decir(m); }); estado(d.caso); }
    } catch { /* reintenta en la próxima reconexión */ }
  }

  async function enviar(t) {
    t = t.trim();
    if (!t || enviando) return;
    vaciar();
    nodo({ autor: 'persona', texto: t });
    opciones([]);
    $('#input').value = '';
    enviando = true;
    $('#enviar').disabled = true;
    try {
      const d = await api('POST', '/api/persona/mensajes', { texto: t, org: slug });
      if (d.miMensaje) vistos.add(d.miMensaje);
      d.mensajes.forEach(decir);
      if (d.chips && d.chips.length) cola.push({ chips: d.chips });
      bombear();
      crisis(d.crisis, d.mostrarCrisis);
      estado(d.caso);
      conectar();
    } catch (e) {
      nodo({ autor: 'sistema', tipo: 'alerta', texto: e.message });
      if (!$('#input').value) $('#input').value = t;
    } finally {
      enviando = false;
      $('#enviar').disabled = false;
    }
  }

  async function iniciar() {
    try {
      const d = await api('GET', '/api/persona/inicio' + (slug ? '?org=' + slug : ''));
      if (d.conversacion) d.mensajes.forEach(nodo); else d.mensajes.forEach(decir);
      if (d.chips && d.chips.length) cola.push({ chips: d.chips });
      bombear();
      crisis(d.crisis, d.mostrarCrisis);
      estado(d.caso);
      if (d.conversacion) conectar();
    } catch (e) {
      nodo({ autor: 'sistema', tipo: 'alerta', texto: 'No pude conectarme. Revisa tu internet y recarga la página. Si estás en peligro, llama al *4141 o al 131.' });
    }
  }

  $('#compose').addEventListener('submit', e => { e.preventDefault(); enviar($('#input').value); });
  $('#quick').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') enviar(e.target.textContent); });
  $('#salir').addEventListener('click', () => { try { sessionStorage.clear(); } catch { /* nada */ } location.replace('https://www.google.cl/'); });
  $('#activar').addEventListener('click', async () => {
    $('#oferta').hidden = true;
    try { await activarAvisos('/api/persona/push'); nodo({ autor: 'sistema', texto: 'Listo: te avisaremos en este navegador.' }); }
    catch (e) { nodo({ autor: 'sistema', texto: e.message }); }
  });
  $('#no-avisos').addEventListener('click', () => { $('#oferta').hidden = true; try { localStorage.setItem('ra_sin_avisos', '1'); } catch { /* nada */ } });
  let confirmar = false;
  $('#olvidar').addEventListener('click', async () => {
    if (!confirmar) { confirmar = true; $('#olvidar').textContent = 'Toca otra vez para olvidarla'; setTimeout(() => { confirmar = false; $('#olvidar').textContent = 'Olvidar esta conversación en este dispositivo'; }, 5000); return; }
    try { await api('POST', '/api/persona/olvidar', {}); } finally { location.reload(); }
  });
  iniciar();
})();
