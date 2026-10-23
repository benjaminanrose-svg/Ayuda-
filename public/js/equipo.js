'use strict';
/* Panel del especialista: cola de fichas, atención en vivo, agenda, derivación, cierre y administración. */
(() => {
  const { $, api, esc, soportaAvisos, activarAvisos, hora, fecha } = window.RA;
  const NIVEL = { low: 'Riesgo bajo', mid: 'Riesgo medio', high: 'Riesgo alto' };
  const RANGO = { high: 0, mid: 1, low: 2 };
  const LIMITE = { high: 30, mid: 180, low: 600 };
  const RAPIDAS = ['Estoy aquí contigo.', '¿Estás en un lugar seguro ahora?', 'Armemos juntos un plan para esta noche.', '¿Te parece si seguimos por videollamada?'];
  const ENVIAR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const casos = new Map();
  const sinLeer = new Set();
  let yo = null, sel = null, registro = null, formulario = null, audio = null;

  const enCola = k => k.estado === 'esperando' || k.estado === 'guardia';
  const mio = k => k.tomadoPor === yo.id && (k.estado === 'en_atencion' || k.estado === 'agendado');
  const desde = k => (enCola(k) ? k.creadoEn : k.tomadoEn);
  const tarde = k => enCola(k) && (Date.now() - new Date(k.creadoEn)) / 1000 > LIMITE[k.riesgo];
  const nombre = u => [u.titulo, u.nombre].filter(Boolean).join(' ');
  // tiempo en palabras: «5 min», «2 h 10 min», «1 día»
  function lapso(f) {
    const m = Math.max(0, Math.floor((Date.now() - new Date(f)) / 60000));
    if (m < 1) return '';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h' + (h < 3 && m % 60 ? ' ' + (m % 60) + ' min' : '');
    const d = Math.floor(h / 24);
    return d + (d === 1 ? ' día' : ' días');
  }
  function tiempo(k) {
    if (k.estado === 'agendado') return '';
    const l = lapso(desde(k));
    if (enCola(k)) return l ? 'Esperando ' + l : 'Recién llegado';
    return l ? 'En atención ' + l : 'Recién tomado';
  }
  const nivelHtml = k => (k.urgente && enCola(k) ? '<span class="nivel urgente">Urgente</span>' : `<span class="nivel ${k.riesgo}">${NIVEL[k.riesgo]}</span>`);
  // de qué se trata: señales (urgentes primero) y temas; si no hay, el mensaje clave
  function deQue(k) {
    const s = k.senales.slice().sort((a, b) => b.urgente - a.urgente).map(x => x.texto);
    const partes = [...new Set([...s.slice(0, 2), ...k.temas.slice(0, 2)])].slice(0, 3);
    if (partes.length) return esc(partes.join(' · '));
    const t = String(k.extracto[0] || '').trim();
    return t ? `«${esc(t)}»` : 'Sin detalles aún';
  }
  function aviso(t) {
    const el = $('#toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.hidden = true; }, 5000);
  }
  function sonar(fuerte) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      (fuerte ? [0, 0.18, 0.36, 0.54] : [0, 0.18]).forEach((d, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = i % 2 ? 660 : 880;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
        o.connect(g).connect(audio.destination);
        o.start(t + d);
        o.stop(t + d + 0.18);
      });
    } catch { /* sin audio */ }
  }
  document.addEventListener('pointerdown', () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* nada */ } }, { once: true });

  /* ── lista ── */
  const orden = (a, b) => b.urgente - a.urgente || RANGO[a.riesgo] - RANGO[b.riesgo] || new Date(a.creadoEn) - new Date(b.creadoEn);
  let variasOrgs = false;
  function item(k) {
    const etq = nivelHtml(k) + (k.estado === 'guardia' ? '<span class="chip">En guardia</span>' : '') + (sinLeer.has(k.id) ? '<span class="punto">Nuevo</span>' : '');
    const pie = ['N.º ' + k.folio, variasOrgs && k.organizacion ? esc(k.organizacion) : '', k.estado === 'agendado' ? 'Hora: ' + esc(fecha(k.agendadoPara)) : ''].filter(Boolean).join(' · ');
    return `<li><a class="item ${k.urgente && enCola(k) ? 'high' : k.riesgo}${sel === k.id ? ' sel' : ''}" href="#caso-${k.id}">
      <span class="item-a">${etq}<span class="t${tarde(k) ? ' late' : ''}" data-t="${k.id}">${tiempo(k)}</span></span>
      <span class="item-b">${deQue(k)}</span>
      <span class="item-c">${pie}</span></a></li>`;
  }
  function pintarLista() {
    const todos = [...casos.values()];
    variasOrgs = new Set(todos.map(k => k.organizacion)).size > 1;
    const cola = todos.filter(enCola).sort(orden);
    const mios = todos.filter(mio).sort((a, b) => new Date(a.tomadoEn) - new Date(b.tomadoEn));
    $('#cola').innerHTML = cola.map(item).join('') || '<li class="vacio">No hay casos en espera.</li>';
    $('#mios').innerHTML = mios.map(item).join('') || '<li class="vacio">No tienes casos abiertos.</li>';
    $('#n-cola').textContent = cola.length || '';
    $('#n-mios').textContent = mios.length || '';
    document.title = (cola.length ? `(${cola.length}) ` : '') + 'Panel · ConténMente';
  }

  /* ── ficha ── */
  function manana10() { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; }
  const local = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const formAgendar = () => `<div class="form-linea"><div class="campo-form"><label for="ag-fecha">Fecha y hora</label><input type="datetime-local" id="ag-fecha" value="${local(manana10())}" min="${local(new Date())}"></div>
    <div class="fila-btn"><button class="btn" data-acc="agendar-ok">Confirmar hora</button><button class="btn plain" data-acc="cancelar">Cancelar</button></div></div>`;

  function fichaHtml(k) {
    const tomada = !!k.tomadoPor && !enCola(k);
    const etq = nivelHtml(k) + (k.estado === 'guardia' ? '<span class="chip">En guardia</span>' : '') + (k.menor ? '<span class="chip">Posible menor de edad</span>' : '');
    const quien = ['Persona anónima', k.mensajes + (k.mensajes === 1 ? ' mensaje' : ' mensajes'), k.organizacion ? esc(k.organizacion) : ''].filter(Boolean).join(' · ');
    let deriv = '';
    if (enCola(k) && formulario === 'agendar') deriv = formAgendar();
    else if (enCola(k)) {
      const alto = k.riesgo === 'high';
      deriv = '<div class="fila-btn"><button class="btn" data-acc="tomar">Atender ahora</button>'
        + (alto ? '' : '<button class="btn ghost" data-acc="agendar">Agendar hora</button>')
        + (k.estado === 'esperando' ? '<button class="btn plain" data-acc="derivar">Derivar a guardia</button>' : '') + '</div>'
        + (k.estado === 'guardia' ? '<p class="nota-suave">Ya se avisó a guardia.</p>' : '')
        + (alto ? '<p class="nota-suave">Riesgo alto: atiéndelo ahora o derívalo a guardia. No se agenda para después.</p>' : '');
    }
    const estado = tomada ? `<p class="estado-caso">${k.estado === 'agendado' ? 'Agendado para ' + esc(fecha(k.agendadoPara)) : 'En atención desde ' + esc(fecha(k.tomadoEn))}${k.tomadoPorNombre ? ' · ' + esc(k.tomadoPorNombre) : ''}</p>` : '';
    const escribio = k.extracto.filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('');
    return `<article class="ficha ${k.riesgo}" aria-label="Caso N.º ${k.folio}">
      <a class="volver" href="#">← Volver a la lista</a>
      <header class="f-top"><div class="f-etq">${etq}${enCola(k) ? `<span class="t${tarde(k) ? ' late' : ''}" data-f="${k.id}">${tiempo(k)}</span>` : ''}</div>
        <h2>Caso N.º ${k.folio}</h2><p class="sub">${quien}</p></header>
      ${estado}
      <dl class="datos">
        ${k.senales.length ? `<div class="dato ancho"><dt>Señales</dt><dd class="tags">${k.senales.map(x => `<span class="tag flag${x.urgente ? ' u' : ''}">${esc(x.texto)}</span>`).join('')}</dd></div>` : ''}
        <div class="dato"><dt>¿Está en un lugar seguro?</dt><dd>${esc(k.seguro)}</dd></div>
        <div class="dato"><dt>Temas</dt><dd>${esc(k.temas.join(', ') || 'Aún no aparecen')}</dd></div>
      </dl>
      <section class="escribio"><h3>Lo que escribió</h3>${escribio ? `<ul>${escribio}</ul>` : '<p class="nota-suave">Sin mensajes.</p>'}</section>
      ${deriv ? `<div class="deriv">${deriv}</div>` : ''}
    </article>`;
  }

  function accionesHtml() {
    if (formulario === 'agendar') return formAgendar();
    if (formulario === 'cerrar') return `<div class="form-linea"><div class="campo-form"><label for="nota">Nota de cierre (opcional, solo la ve el equipo)</label><textarea id="nota" maxlength="4000"></textarea></div>
      <div class="fila-btn"><button class="btn" data-acc="cerrar-ok">Cerrar caso</button><button class="btn plain" data-acc="cancelar">Cancelar</button></div></div>`;
    return '<button class="btn" data-acc="video">Videollamada</button><button class="btn ghost" data-acc="agendar">Agendar seguimiento</button><button class="btn plain" data-acc="derivar">Derivar a guardia</button><button class="btn peligro" data-acc="cerrar">Cerrar caso</button>';
  }
  function lineaRegistro(m) {
    const quien = { persona: 'Persona', bot: 'Nexo', especialista: m.nombre || 'Especialista', sistema: '' }[m.autor];
    const texto = m.tipo === 'respiracion' ? '[Ejercicio de respiración]' : m.texto;
    const cuerpo = m.tipo === 'videollamada' && /^https:\/\//.test(m.texto) ? `Invitación a videollamada · <a href="${esc(m.texto)}" target="_blank" rel="noopener noreferrer">Abrir sala</a>` : esc(texto);
    return `<li class="${m.autor}"><time>${hora(m.hora)}</time><div>${quien ? `<span class="q">${esc(quien)}</span>` : ''}${m.autor === 'persona' && m.riesgo === 'high' ? '<span class="urg">Urgente</span>' : ''}${cuerpo}</div></li>`;
  }
  const vacioHtml = (titulo, texto) => `<div class="vacio-hoja"><a class="volver" href="#">← Volver a la lista</a><b>${esc(titulo)}</b>${esc(texto)}</div>`;
  const abajoRegistro = () => { const r = $('#registro'); if (r) r.scrollTop = r.scrollHeight; };
  function pintarFicha() { const k = casos.get(sel), box = $('#ficha-box'); if (k && box) box.innerHTML = fichaHtml(k); }
  function refrescarFormularios() { pintarFicha(); const a = $('#acciones-caso'); if (a) a.innerHTML = accionesHtml(); }

  async function abrir(id) {
    sel = id;
    document.body.classList.add('viendo-caso');
    if (matchMedia('(max-width: 820px)').matches) scrollTo(0, 0);
    formulario = null;
    registro = null;
    sinLeer.delete(id);
    pintarLista();
    const k = casos.get(id), hoja = $('#hoja');
    if (!k) { hoja.innerHTML = vacioHtml('Este caso ya no está en tu lista.', 'Puede que otro especialista lo haya tomado o que se haya cerrado.'); return; }
    hoja.innerHTML = `<div class="hoja-in${mio(k) ? '' : ' sola'}"><div id="ficha-box"></div>${mio(k) ? `<section class="registro-sec" aria-label="Conversación con la persona">
        <h3>Conversación con la persona</h3><ol class="registro" id="registro"></ol>
        <div class="rotulo">Respuestas rápidas</div><div class="quick" id="rapidas">${RAPIDAS.map(t => `<button type="button">${esc(t)}</button>`).join('')}</div>
        <form class="compose" id="pro-compose"><label class="sr" for="pro-in">Mensaje para la persona</label><input class="entrada" id="pro-in" maxlength="2000" autocomplete="off" placeholder="Escribe a la persona…"><button class="send" type="submit" aria-label="Enviar">${ENVIAR}</button></form>
        <div class="acciones-caso" id="acciones-caso"></div></section>` : ''}</div>`;
    pintarFicha();
    if (mio(k)) { $('#acciones-caso').innerHTML = accionesHtml(); await cargarRegistro(id); }
  }
  async function cargarRegistro(id) {
    try {
      const d = await api('GET', '/api/equipo/casos/' + id);
      if (sel !== id) return;
      casos.set(id, d.caso);
      registro = d.registro || [];
      $('#registro').innerHTML = registro.map(lineaRegistro).join('');
      abajoRegistro();
      pintarFicha();
    } catch (e) { aviso(e.message); }
  }

  function actualizarCaso(r, propio) {
    const antes = casos.get(r.id);
    const visible = enCola(r) || mio(r);
    if (visible) casos.set(r.id, r); else casos.delete(r.id);
    if (!antes && enCola(r) && !propio && yo.disponible) sonar(r.riesgo === 'high');
    pintarLista();
    if (sel !== r.id) return;
    if (!visible) {
      sel = null;
      $('#hoja').innerHTML = r.estado === 'cerrado' ? vacioHtml('Caso cerrado.', 'Elige otro caso de la lista.') : vacioHtml('Otro especialista tomó este caso.', 'Elige otro caso de la lista.');
      history.replaceState(null, '', '#');
    } else if (!antes || mio(antes) !== mio(r)) abrir(r.id);
    else pintarFicha();
  }
  function recibirMensaje(d) {
    const m = d.mensaje;
    if (sel === d.casoId && registro) {
      if (!registro.some(x => x.id === m.id)) { registro.push(m); $('#registro').insertAdjacentHTML('beforeend', lineaRegistro(m)); abajoRegistro(); }
    } else if (m.autor === 'persona') { sinLeer.add(d.casoId); pintarLista(); }
    if (m.autor === 'persona') sonar(!!d.urgente);
  }
  function alerta(d) {
    const el = $('#alerta');
    el.innerHTML = `<span>${esc(d.texto)}</span><a href="#caso-${d.casoId}">Ver caso N.º ${esc(d.folio)}</a><button class="enlace" type="button" id="cerrar-alerta">Ocultar</button>`;
    el.hidden = false;
    sonar(true);
  }

  async function recargar() {
    try {
      const d = await api('GET', '/api/equipo/casos');
      casos.clear();
      d.casos.forEach(k => casos.set(k.id, k));
      pintarLista();
      if (sel && casos.has(sel)) { if (mio(casos.get(sel)) && registro) cargarRegistro(sel); else pintarFicha(); }
    } catch (e) { if (e.estado === 401) location.replace('/ingresar'); else aviso(e.message); }
  }
  function conectar() {
    const f = new EventSource('/api/equipo/stream');
    let primera = true;
    f.addEventListener('open', () => { $('#desconectado').hidden = true; if (!primera) recargar(); primera = false; });
    f.addEventListener('error', () => { $('#desconectado').hidden = false; });
    f.addEventListener('caso', e => actualizarCaso(JSON.parse(e.data)));
    f.addEventListener('mensaje', e => recibirMensaje(JSON.parse(e.data)));
    f.addEventListener('alerta', e => alerta(JSON.parse(e.data)));
  }
  function tic() {
    document.querySelectorAll('[data-t],[data-f]').forEach(el => {
      const k = casos.get(+(el.dataset.t || el.dataset.f));
      if (!k) return;
      el.textContent = tiempo(k);
      el.classList.toggle('late', tarde(k));
    });
  }

  /* ── acciones del caso ── */
  $('#hoja').addEventListener('click', async e => {
    if (e.target.closest('#rapidas') && e.target.tagName === 'BUTTON') { const i = $('#pro-in'); i.value = e.target.textContent; i.focus(); return; }
    const b = e.target.closest('[data-acc]');
    if (!b || b.disabled) return;
    const acc = b.dataset.acc, id = sel;
    if (acc === 'agendar' || acc === 'cerrar') { formulario = acc; refrescarFormularios(); return; }
    if (acc === 'cancelar') { formulario = null; refrescarFormularios(); return; }
    b.disabled = true;
    let ventana = null;
    try {
      let r;
      if (acc === 'video') {
        ventana = window.open('about:blank', '_blank');
        const d = await api('POST', `/api/equipo/casos/${id}/videollamada`, {});
        recibirMensaje({ casoId: id, mensaje: d.mensaje });
        if (ventana) { ventana.opener = null; ventana.location.href = d.mensaje.texto; }
        aviso('Invitación enviada. La sala se abrió en otra pestaña.');
        b.disabled = false;
        return;
      }
      if (acc === 'tomar') r = await api('POST', `/api/equipo/casos/${id}/tomar`, {});
      if (acc === 'derivar') r = await api('POST', `/api/equipo/casos/${id}/derivar`, {});
      if (acc === 'agendar-ok') {
        const v = $('#ag-fecha').value;
        if (!v) throw new Error('Elige la fecha y la hora.');
        r = await api('POST', `/api/equipo/casos/${id}/agendar`, { para: new Date(v).toISOString() });
      }
      if (acc === 'cerrar-ok') r = await api('POST', `/api/equipo/casos/${id}/cerrar`, { nota: $('#nota').value });
      formulario = null;
      if (r && r.caso) actualizarCaso(r.caso, true);
      if (acc === 'derivar') aviso('Caso derivado a guardia.');
    } catch (err) {
      if (ventana) ventana.close();
      aviso(err.message);
      b.disabled = false;
      if (err.estado === 409) recargar();
    }
  });
  $('#hoja').addEventListener('submit', async e => {
    if (e.target.id !== 'pro-compose') return;
    e.preventDefault();
    const inp = $('#pro-in'), t = inp.value.trim(), id = sel;
    if (!t) return;
    inp.disabled = true;
    try {
      const d = await api('POST', `/api/equipo/casos/${id}/mensajes`, { texto: t });
      inp.value = '';
      recibirMensaje({ casoId: id, mensaje: d.mensaje });
    } catch (err) { aviso(err.message); } finally { inp.disabled = false; inp.focus(); }
  });
  $('#alerta').addEventListener('click', e => { if (e.target.id === 'cerrar-alerta' || e.target.tagName === 'A') $('#alerta').hidden = true; });

  /* ── cuenta ── */
  $('#disponible').addEventListener('change', async e => {
    try { const d = await api('POST', '/api/equipo/disponible', { disponible: e.target.checked }); yo.disponible = d.disponible; aviso(d.disponible ? 'Quedaste disponible: te llegarán los casos nuevos.' : 'Quedaste como no disponible.'); }
    catch (err) { e.target.checked = !e.target.checked; aviso(err.message); }
  });
  $('#avisos').addEventListener('click', async () => {
    try { await activarAvisos('/api/equipo/push'); $('#avisos').hidden = true; aviso('Avisos activados en este navegador.'); }
    catch (err) { aviso(err.message); }
  });
  /* menú del encabezado (en el teléfono) y volver a la lista */
  const menuBtn = $('#menu-btn'), menu = $('#menu');
  const cerrarMenu = () => { menu.classList.remove('abierto'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); menuBtn.setAttribute('aria-expanded', String(menu.classList.toggle('abierto'))); });
  document.addEventListener('click', e => {
    if (!e.target.closest('#menu') || e.target.closest('a,button')) cerrarMenu();
    if (e.target.closest('.volver')) { e.preventDefault(); document.body.classList.remove('viendo-caso'); if (location.hash) location.hash = ''; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
  $('#salir').addEventListener('click', async () => { try { await api('POST', '/api/equipo/salir', {}); } finally { location.replace('/ingresar'); } });

  /* ── administración ── */
  const dur = s => (s < 60 ? s + ' s' : s < 5400 ? Math.round(s / 60) + ' min' : Math.round(s / 3600) + ' h');
  const cifra = (n, t, x) => `<div class="cifra"><b>${n}</b><span>${t}</span>${x ? `<small>${esc(x)}</small>` : ''}</div>`;
  function filaUsuario(u) {
    const estado = u.activo ? (u.disponible ? 'Disponible ahora' : 'No disponible') : 'Cuenta desactivada';
    return `<tr><td data-l="Persona"><b>${esc(nombre(u))}</b><span class="sub bloque">${esc(u.correo)}${u.especialidad ? ' · ' + esc(u.especialidad) : ''}</span></td>
      <td data-l="Rol">${{ admin: 'Administración', especialista: 'Especialista', psicologo: 'Solo directorio' }[u.rol] || u.rol}<span class="sub bloque">${estado}${u.debeCambiarClave ? ' · con clave temporal' : ''}${u.ultimoAcceso ? '' : ' · nunca ha ingresado'}</span></td>
      <td data-l="Guardia"><label class="casilla"><input type="checkbox" data-u="${u.id}" data-campo="guardia"${u.guardia ? ' checked' : ''}><i></i><span class="sr">De guardia</span></label></td>
      <td class="acc"><button class="btn plain" data-u="${u.id}" data-acc="editar">Editar</button> <button class="btn plain" data-u="${u.id}" data-n="${esc(nombre(u))}" data-acc="clave">Nueva clave</button>${u.id === yo.id ? '' : ` <button class="btn plain" data-u="${u.id}" data-acc="${u.activo ? 'desactivar' : 'activar'}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}</td></tr>`;
  }
  function filaPerfil(x) {
    const est = { pendiente: 'Por revisar', publicado: 'Publicado', rechazado: 'Rechazado', borrador: 'Sin enviar' }[x.estado];
    return `<tr><td data-l="Psicólogo"><b>${esc(x.nombre)}</b><span class="sub bloque">${esc(x.correo)} · ${est}${x.especialidades.length ? ' · ' + esc(x.especialidades.slice(0, 3).join(', ')) : ''}</span>${x.notaRevision ? `<span class="sub bloque">Nota: ${esc(x.notaRevision)}</span>` : ''}</td>
      <td data-l="Registro">${esc(x.registroSis || '—')}</td>
      <td class="acc"><a class="btn plain" href="/psicologos/${esc(x.slug)}" target="_blank" rel="noopener">Vista previa</a>${x.estado !== 'publicado' ? ` <button class="btn" data-p="${x.id}" data-acc="perfil-aprobar">Aprobar</button>` : ` <button class="btn plain" data-p="${x.id}" data-acc="perfil-ocultar">Ocultar</button>`}${x.estado === 'pendiente' ? ` <button class="btn plain" data-p="${x.id}" data-acc="perfil-rechazar">Pedir cambios</button>` : ''}</td></tr>`;
  }
  function filaOrg(o) {
    const enlace = location.origin + (o.slug === 'general' ? '/conversar' : '/o/' + o.slug);
    return `<tr><td data-l="Organización"><b>${esc(o.nombre)}</b><span class="sub bloque">${o.activa ? 'Activa' : 'Desactivada'} · ${o.casos_30} ${o.casos_30 === 1 ? 'caso' : 'casos'} en 30 días</span></td>
      <td data-l="Enlace"><a href="${esc(enlace)}" target="_blank" rel="noopener">${esc(enlace)}</a></td>
      <td class="acc"><button class="btn plain" data-o="${o.id}" data-acc="${o.activa ? 'org-off' : 'org-on'}">${o.activa ? 'Desactivar' : 'Activar'}</button></td></tr>`;
  }
  function mostrarClave(n, clave) {
    const el = $('#clave-temp');
    el.innerHTML = `Clave temporal de <b>${esc(n)}</b>: <code>${esc(clave)}</code>. Entrégala en persona o por un canal seguro; al ingresar se le pedirá cambiarla. No se vuelve a mostrar.`;
    el.hidden = false;
  }
  let usuariosAdmin = [];
  function editarFila(id) {
    const u = usuariosAdmin.find(x => x.id === +id);
    const fila = document.querySelector(`button[data-acc="editar"][data-u="${id}"]`);
    if (!u || !fila) return;
    fila.closest('tr').outerHTML = `<tr><td colspan="4"><form class="form-fila" data-editar="${u.id}">
      <div class="campo-form"><label for="e-titulo">Título</label><input id="e-titulo" maxlength="12" value="${esc(u.titulo)}" placeholder="Ps., Dr., Dra."></div>
      <div class="campo-form"><label for="e-nombre">Nombre y apellido</label><input id="e-nombre" required maxlength="80" value="${esc(u.nombre)}"></div>
      <div class="campo-form"><label for="e-esp">Especialidad</label><input id="e-esp" maxlength="80" value="${esc(u.especialidad)}"></div>
      <div class="fila-btn"><button class="btn" type="submit">Guardar</button><button class="btn plain" type="button" data-acc="cancelar-edicion">Cancelar</button></div></form></td></tr>`;
    $('#e-nombre').focus();
  }
  async function verAdmin(despues) {
    const box = $('#vista-admin');
    try {
      const [u, o, m, pf] = await Promise.all([api('GET', '/api/admin/usuarios'), api('GET', '/api/admin/organizaciones'), api('GET', '/api/admin/metricas'), api('GET', '/api/admin/perfiles')]);
      const pend = pf.perfiles.filter(x => x.estado === 'pendiente'), borr = pf.perfiles.filter(x => x.estado === 'borrador'), resto = pf.perfiles.filter(x => !['pendiente', 'borrador'].includes(x.estado));
      usuariosAdmin = u.usuarios;
      box.innerHTML = `<div class="hoja-blanca">
        <header class="adm-top"><div><h1>Administración</h1><p class="sub">Tu equipo, las organizaciones y un resumen del uso.</p></div><a class="btn plain" href="#">Volver a los casos</a></header>
        <div class="cifras">
          ${cifra(m.hoy, 'Casos hoy', m.mes + ' en los últimos 30 días')}
          ${cifra(m.en_espera, 'En espera ahora', m.mediana_seg == null ? '' : 'Suelen atenderse en ' + dur(m.mediana_seg))}
          ${cifra(m.alto, 'Riesgo alto', 'En los últimos 30 días')}
          ${cifra(m.disponibles, 'Disponibles ahora', m.guardia + ' de guardia')}
        </div>
        <section class="adm-sec"><h2>Perfiles del directorio${pend.length ? ` <span class="nivel urgente">${pend.length} por revisar</span>` : ''}</h2>
          <p class="sub">Revisa cada perfil antes de publicarlo: abre la vista previa y busca su número de registro en la <a href="https://rnpi.superdesalud.gob.cl/" target="_blank" rel="noopener">Superintendencia de Salud</a>.</p>
          ${pend.length ? `<div class="tabla-marco"><table class="tabla"><thead><tr><th>Psicólogo</th><th>Registro</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>${pend.map(filaPerfil).join('')}</tbody></table></div>` : '<p class="nota-suave">No hay perfiles esperando revisión.</p>'}
          ${borr.length ? `<details class="agregar"><summary class="btn ghost">Aún no enviados a revisión (${borr.length})</summary><p class="nota-suave">Estos psicólogos crearon su cuenta pero no han enviado su perfil. Puedes ver cómo va o publicarlo igual.</p><div class="tabla-marco"><table class="tabla"><tbody>${borr.map(filaPerfil).join('')}</tbody></table></div></details>` : ''}
          ${resto.length ? `<details class="agregar"><summary class="btn ghost">Ver publicados y rechazados (${resto.length})</summary><div class="tabla-marco"><table class="tabla"><tbody>${resto.map(filaPerfil).join('')}</tbody></table></div></details>` : ''}
        </section>
        <section class="adm-sec"><h2>Equipo</h2>
          <div class="tabla-marco"><table class="tabla"><thead><tr><th>Persona</th><th>Rol y estado</th><th>Guardia</th><th><span class="sr">Acciones</span></th></tr></thead>
          <tbody>${u.usuarios.map(filaUsuario).join('')}</tbody></table></div>
          <div class="clave-temp" id="clave-temp" role="status" hidden></div>
          <details class="agregar"><summary class="btn ghost" id="abrir-usuario">+ Agregar persona al equipo</summary>
          <form class="form-fila" id="f-usuario">
            <div class="campo-form"><label for="u-correo">Correo</label><input id="u-correo" type="email" required maxlength="254"></div>
            <div class="campo-form"><label for="u-titulo">Título</label><input id="u-titulo" value="Ps." maxlength="12"></div>
            <div class="campo-form"><label for="u-nombre">Nombre y apellido</label><input id="u-nombre" required maxlength="80"></div>
            <div class="campo-form"><label for="u-esp">Especialidad</label><input id="u-esp" maxlength="80" placeholder="Adultos, crisis"></div>
            <div class="campo-form"><label for="u-rol">Rol</label><select id="u-rol"><option value="especialista">Especialista (panel de casos)</option><option value="admin">Administración</option></select></div>
            <label class="casilla"><input type="checkbox" id="u-guardia"><i></i>De guardia</label>
            <button class="btn" type="submit">Agregar al equipo</button>
          </form></details>
        </section>
        <section class="adm-sec"><h2>Organizaciones</h2>
          <p class="sub">Cada organización (colegio, empresa, municipio) tiene su propio enlace para que sus personas escriban.</p>
          <div class="tabla-marco"><table class="tabla"><thead><tr><th>Organización</th><th>Enlace para sus personas</th><th><span class="sr">Acciones</span></th></tr></thead>
          <tbody>${o.organizaciones.map(filaOrg).join('')}</tbody></table></div>
          <details class="agregar"><summary class="btn ghost">+ Agregar organización</summary>
          <form class="form-fila" id="f-org">
            <div class="campo-form"><label for="o-nombre">Nombre</label><input id="o-nombre" required maxlength="100" placeholder="Colegio Ejemplo"></div>
            <div class="campo-form"><label for="o-slug">Identificador del enlace</label><input id="o-slug" required maxlength="40" pattern="[a-z0-9\\-]{2,40}" placeholder="colegio-ejemplo"></div>
            <button class="btn" type="submit">Agregar organización</button>
          </form></details>
        </section></div>`;
      if (despues) despues();
    } catch (e) { box.innerHTML = `<div class="hoja-blanca"><p class="error">${esc(e.message)}</p></div>`; }
  }
  $('#vista-admin').addEventListener('change', async e => {
    const c = e.target.closest('[data-campo]');
    if (!c) return;
    try { await api('PATCH', '/api/admin/usuarios/' + c.dataset.u, { [c.dataset.campo]: c.checked }); aviso('Guardado.'); }
    catch (err) { c.checked = !c.checked; aviso(err.message); }
  });
  $('#vista-admin').addEventListener('click', async e => {
    const b = e.target.closest('button[data-acc]');
    if (!b) return;
    if (b.dataset.acc === 'editar') return editarFila(b.dataset.u);
    if (b.dataset.acc === 'cancelar-edicion') return verAdmin();
    b.disabled = true;
    try {
      const acc = b.dataset.acc;
      if (acc === 'clave') { const d = await api('POST', `/api/admin/usuarios/${b.dataset.u}/clave`, {}); return verAdmin(() => mostrarClave(b.dataset.n, d.claveTemporal)); }
      if (acc === 'desactivar' || acc === 'activar') await api('PATCH', '/api/admin/usuarios/' + b.dataset.u, { activo: acc === 'activar' });
      if (acc.startsWith('perfil-')) {
        const a = acc.slice(7);
        let nota = '';
        if (a === 'rechazar') { nota = window.prompt('¿Qué debe corregir? (se lo mostraremos al psicólogo)') || ''; if (!nota.trim()) { b.disabled = false; return; } }
        await api('POST', `/api/admin/perfiles/${b.dataset.p}/${a}`, { nota });
        aviso({ aprobar: 'Perfil publicado.', rechazar: 'Le pedimos cambios.', ocultar: 'Perfil ocultado del directorio.' }[a]);
      }
      if (acc === 'org-off' || acc === 'org-on') await api('PATCH', '/api/admin/organizaciones/' + b.dataset.o, { activa: acc === 'org-on' });
      verAdmin();
    } catch (err) { aviso(err.message); b.disabled = false; }
  });
  $('#vista-admin').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, b = f.querySelector('button[type=submit]');
    b.disabled = true;
    try {
      if (f.dataset.editar) {
        const d = await api('PATCH', '/api/admin/usuarios/' + f.dataset.editar, { titulo: $('#e-titulo').value, nombre: $('#e-nombre').value, especialidad: $('#e-esp').value });
        if (d.usuario.id === yo.id) { Object.assign(yo, d.usuario); $('#yo').textContent = nombre(yo); }
        aviso('Datos guardados.');
        return verAdmin();
      }
      if (f.id === 'f-usuario') {
        const d = await api('POST', '/api/admin/usuarios', { correo: $('#u-correo').value, titulo: $('#u-titulo').value, nombre: $('#u-nombre').value, especialidad: $('#u-esp').value, rol: $('#u-rol').value, guardia: $('#u-guardia').checked });
        verAdmin(() => mostrarClave(nombre(d.usuario), d.claveTemporal));
      }
      if (f.id === 'f-org') { await api('POST', '/api/admin/organizaciones', { nombre: $('#o-nombre').value, slug: $('#o-slug').value }); verAdmin(); aviso('Organización agregada.'); }
    } catch (err) { aviso(err.message); b.disabled = false; }
  });

  /* ── navegación ── */
  function ruta() {
    const h = location.hash;
    if (h === '#admin' && yo.rol === 'admin') { $('#vista-casos').hidden = true; $('#vista-admin').hidden = false; verAdmin(); return; }
    $('#vista-admin').hidden = true;
    $('#vista-casos').hidden = false;
    const m = h.match(/^#caso-(\d+)$/);
    if (m) return abrir(+m[1]);
    document.body.classList.remove('viendo-caso');
    if (!sel) $('#hoja').innerHTML = vacioHtml('Elige un caso de la lista.', yo.disponible ? 'Cuando llegue uno nuevo, suena un aviso y aparece arriba en “En espera”.' : 'Marca “Disponible” arriba para recibir casos nuevos.');
  }

  async function iniciar() {
    try {
      const d = await api('GET', '/api/equipo/yo');
      yo = d.usuario;
      if (yo.debeCambiarClave) return location.replace('/ingresar');
      if (yo.rol === 'psicologo') return location.replace('/mi-perfil');
    } catch (e) {
      if (e.estado === 401) return location.replace('/ingresar' + location.hash);
      return aviso(e.message);
    }
    $('#yo').textContent = nombre(yo);
    $('#disponible').checked = !!yo.disponible;
    $('#ir-admin').hidden = yo.rol !== 'admin';
    if (soportaAvisos()) {
      if (Notification.permission === 'granted') activarAvisos('/api/equipo/push').catch(() => {});
      else $('#avisos').hidden = Notification.permission === 'denied';
    }
    await recargar();
    conectar();
    setInterval(tic, 1000);
    window.addEventListener('hashchange', ruta);
    ruta();
  }
  iniciar();
})();
