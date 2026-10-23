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
        <aside class="caja pedir" id="pedir">
          <h2>Pedir hora</h2>
          <p class="nota-suave">Déjale tus datos y te contactará para coordinar la hora. Solo lo ve este profesional.</p>
          <form id="f-pedir" class="filas">
            <div class="campo-form"><label for="s-nombre">Tu nombre</label><input id="s-nombre" required maxlength="80" autocomplete="name"></div>
            <div class="campo-form"><label for="s-contacto">Teléfono o correo</label><input id="s-contacto" required maxlength="120"></div>
            <div class="campo-form"><label for="s-mensaje">Mensaje (opcional)</label><textarea id="s-mensaje" maxlength="1500" placeholder="Cuéntale brevemente qué buscas y tus horarios."></textarea></div>
            <p class="error" id="s-error" hidden></p>
            <button class="btn" type="submit"${previa ? ' disabled' : ''}>Enviar solicitud</button>
          </form>
        </aside>
      </div>
      <a class="volver-dir" href="/">← Ver más psicólogos</a>`;
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
  (async () => {
    try { const d = await api('GET', '/api/directorio/perfiles/' + encodeURIComponent(slug)); pintar(d.perfil, d.vistaPrevia, d.revisor); }
    catch (e) { $('#perfil').innerHTML = `<div class="vacio-dir">${esc(e.message)}<br><a class="volver-dir" href="/">← Ver psicólogos</a></div>`; }
  })();
})();
