'use strict';
/* Perfil público de un psicólogo y formulario para pedir hora. */
(() => {
  const { $, api, esc, TIPO_DOC, vistaDoc } = window.RA;
  const MOD = { online: 'Atiende online', presencial: 'Atiende presencial', ambas: 'Atiende online y presencial' };
  const TIPO = { titulo: 'Título profesional', magister: 'Magíster', doctorado: 'Doctorado', diplomado: 'Diplomado', curso: 'Curso' };
  const slug = decodeURIComponent(location.pathname.split('/')[2] || '');
  const iniciales = n => n.replace(/^(Ps|Dr|Dra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  const sec = (t, html) => (html ? `<section class="p-sec"><h2>${t}</h2>${html}</section>` : '');

  function pintar(p, previa, revisor) {
    document.title = p.nombre + ' · ConténMente';
    const est = p.estudios.map(e => `<li><b>${esc(e.titulo)}</b><span>${esc([TIPO[e.tipo], e.institucion, e.anio].filter(Boolean).join(' · '))}</span></li>`).join('');
    const exp = p.experiencia.map(e => `<li><b>${esc(e.cargo)}</b><span>${esc([e.lugar, e.periodo].filter(Boolean).join(' · '))}</span></li>`).join('');
    const docs = p.documentos.map(d => `<li><a class="credencial" href="${esc(d.url)}" target="_blank" rel="noopener">${vistaDoc(d)}<b>${esc(d.nombre)}</b>
      <span>${TIPO_DOC[d.tipo]}${d.pdf ? ' · PDF' : ''}${revisor && !d.publico ? ' · <span class="privado">solo para revisión</span>' : ''}</span></a></li>`).join('');
    $('#perfil').innerHTML = `${previa ? '<p class="aviso-prev">Vista previa: este perfil todavía no está publicado.</p>' : ''}
      <div class="perfil">
        <article class="caja ficha-psi">
          <div class="portada"><img src="${esc(p.fondo)}" alt=""></div>
          <header class="p-cab"><span class="foto grande anillo">${p.foto ? `<img src="${esc(p.foto)}" alt="Foto de ${esc(p.nombre)}">` : esc(iniciales(p.nombre))}</span>
            <div class="p-nombre"><h1>${esc(p.nombre)}</h1><div class="t-meta">${esc([MOD[p.modalidad], p.comuna].filter(Boolean).join(' · '))}</div>
            ${p.precio ? `<div class="t-meta">Sesión: $${Number(p.precio).toLocaleString('es-CL')}</div>` : ''}
            ${p.verificado ? '<span class="verif">✓ Perfil revisado por ConténMente</span>' : ''}</div></header>
          <a class="btn pedir-salto" href="#pedir">Pedir hora</a>
          ${p.especialidades.length ? `<div class="chips">${p.especialidades.map(e => `<span>${esc(e)}</span>`).join('')}</div>` : ''}
          ${sec('Sobre mí', p.resumen ? `<p>${esc(p.resumen)}</p>` : '')}
          ${sec('Cómo trabajo', p.enfoque ? `<p>${esc(p.enfoque)}</p>` : '')}
          ${sec('Diplomas y certificados', docs ? `<ul class="credenciales">${docs}</ul>` : '')}
          ${sec('Formación', est ? `<ul class="lista-f">${est}</ul>` : '')}
          ${sec('Experiencia', exp ? `<ul class="lista-f">${exp}</ul>` : '')}
          ${sec('Registro profesional', p.registroSis ? `<p>N.º de registro en la Superintendencia de Salud: ${esc(p.registroSis)}</p>` : '')}
          ${p.linkedin ? `<p><a href="${esc(p.linkedin)}" target="_blank" rel="noopener noreferrer">Ver perfil en LinkedIn</a></p>` : ''}
        </article>
        <aside class="caja pedir" id="pedir"><h2>Agenda una hora</h2><div id="agendar"><p class="nota-suave">Buscando horas disponibles…</p></div></aside>
      </div>
      <a class="volver-dir" href="/">← Ver más psicólogos</a>`;
    if (previa) $('#agendar').innerHTML = '<p class="nota-suave">Cuando el perfil esté publicado, aquí los pacientes podrán elegir una hora.</p>';
    else cargarHoras(p);
  }

  /* ── agendar ── */
  const TZ = 'America/Santiago';
  const dia = t => new Date(t).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  const largo = t => new Date(t).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const hora = t => new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const clave = t => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });
  let sel = null;

  function formSolicitud() {
    $('#agendar').innerHTML = `<p class="nota-suave">Este profesional aún no publica horarios en línea. Déjale tus datos y te contactará para coordinar.</p>
      <form id="f-pedir" class="filas">
        <div class="campo-form"><label for="s-nombre">Tu nombre</label><input id="s-nombre" required maxlength="80" autocomplete="name"></div>
        <div class="campo-form"><label for="s-contacto">Teléfono o correo</label><input id="s-contacto" required maxlength="120"></div>
        <div class="campo-form"><label for="s-mensaje">Mensaje (opcional)</label><textarea id="s-mensaje" maxlength="1500" placeholder="Cuéntale brevemente qué buscas y tus horarios."></textarea></div>
        <p class="error" id="s-error" hidden></p>
        <button class="btn" type="submit">Enviar solicitud</button>
      </form>`;
    const f = $('#f-pedir');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = f.querySelector('button'), err = $('#s-error');
      b.disabled = true; err.hidden = true;
      try {
        await api('POST', `/api/directorio/perfiles/${encodeURIComponent(slug)}/solicitudes`, { nombre: $('#s-nombre').value, contacto: $('#s-contacto').value, mensaje: $('#s-mensaje').value });
        f.innerHTML = '<p class="ok">¡Listo! Tu solicitud fue enviada. Te contactarán pronto.</p><p class="nota-suave">Si estás en una emergencia, no esperes: toca el botón SOS.</p>';
      } catch (x) { err.textContent = x.message; err.hidden = false; b.disabled = false; }
    });
  }

  async function cargarHoras(p) {
    let d;
    try { d = await api('GET', `/api/directorio/perfiles/${encodeURIComponent(slug)}/horas`); } catch (e) { $('#agendar').innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
    if (!d.horas.length) return formSolicitud();
    const dias = new Map();
    d.horas.forEach(t => { const k = clave(t); if (!dias.has(k)) dias.set(k, []); dias.get(k).push(t); });
    const primero = [...dias.keys()][0];
    $('#agendar').innerHTML = `<p class="nota-suave">Sesiones de ${d.duracion} minutos. Elige un día y una hora.</p>
      <div class="dias" role="listbox" aria-label="Días disponibles">${[...dias.entries()].map(([k, hs]) => `<button type="button" role="option" data-dia="${esc(k)}" aria-selected="${k === primero}"><span>${esc(dia(hs[0]).replace('.', ''))}</span><small>${hs.length} ${hs.length === 1 ? 'hora' : 'horas'}</small></button>`).join('')}</div>
      <div class="horas" id="horas"></div>
      <form id="f-cita" class="filas" hidden>
        <p class="resumen-cita" id="resumen-cita"></p>
        ${d.modalidad === 'ambas' ? `<fieldset class="modalidad"><legend>¿Cómo prefieres la sesión?</legend><label class="casilla"><input type="radio" name="mod" value="online" checked><i></i>Online</label><label class="casilla"><input type="radio" name="mod" value="presencial"><i></i>Presencial${p.comuna ? ' en ' + esc(p.comuna) : ''}</label></fieldset>` : ''}
        <div class="campo-form"><label for="c-nombre">Tu nombre</label><input id="c-nombre" required maxlength="80" autocomplete="name"></div>
        <div class="campo-form"><label for="c-contacto">Teléfono o correo</label><input id="c-contacto" required maxlength="120"></div>
        <div class="campo-form"><label for="c-motivo">¿Qué te gustaría trabajar? (opcional)</label><textarea id="c-motivo" maxlength="1000"></textarea></div>
        <p class="error" id="c-error" hidden></p>
        <button class="btn" type="submit">Reservar hora</button>
      </form>`;
    const horas = k => { $('#horas').innerHTML = dias.get(k).map(t => `<button type="button" data-hora="${t}" aria-pressed="${t === sel}">${hora(t)}</button>`).join(''); };
    horas(primero);
    $('#agendar').onclick = e => {
      const bd = e.target.closest('[data-dia]'), bh = e.target.closest('[data-hora]');
      if (bd) { document.querySelectorAll('[data-dia]').forEach(b => b.setAttribute('aria-selected', String(b === bd))); horas(bd.dataset.dia); }
      if (bh) {
        sel = Number(bh.dataset.hora);
        document.querySelectorAll('[data-hora]').forEach(b => b.setAttribute('aria-pressed', String(b === bh)));
        $('#resumen-cita').textContent = `${largo(sel)}, ${hora(sel)} hrs.`;
        $('#f-cita').hidden = false; $('#c-nombre').focus();
      }
    };
    $('#f-cita').addEventListener('submit', async e => {
      e.preventDefault();
      const b = e.submitter, err = $('#c-error');
      b.disabled = true; err.hidden = true;
      const m = document.querySelector('input[name=mod]:checked');
      try {
        const r = await api('POST', `/api/directorio/perfiles/${encodeURIComponent(slug)}/citas`, { inicio: new Date(sel).toISOString(), modalidad: m ? m.value : '', nombre: $('#c-nombre').value, contacto: $('#c-contacto').value, motivo: $('#c-motivo').value });
        $('#agendar').innerHTML = `<div class="cita-ok"><b>¡Tu hora quedó reservada!</b><p>${esc(largo(sel))}, ${hora(sel)} hrs. con ${esc(p.nombre)}.</p>
          <a class="btn" href="${esc(r.enlace)}">Ver mi cita</a><a class="btn ghost" href="/api/directorio/citas/${esc(r.enlace.split('/').pop())}/calendario.ics">Agregar a mi calendario</a>
          <p class="nota-suave">Guarda el enlace de tu cita: con él puedes verla o cancelarla. Si estás en una emergencia, no esperes y toca el botón SOS.</p></div>`;
      } catch (x) {
        err.textContent = x.message; err.hidden = false; b.disabled = false;
        if (x.estado === 409) { sel = null; setTimeout(() => cargarHoras(p), 1500); }
      }
    });
  }
  (async () => {
    try { const d = await api('GET', '/api/directorio/perfiles/' + encodeURIComponent(slug)); pintar(d.perfil, d.vistaPrevia, d.revisor); }
    catch (e) { $('#perfil').innerHTML = `<div class="vacio-dir">${esc(e.message)}<br><a class="volver-dir" href="/">← Ver psicólogos</a></div>`; }
  })();
})();
