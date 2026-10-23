'use strict';
/* Página de la cita del paciente (enlace secreto): ver, entrar a la videollamada, agregar al calendario o cancelar. */
(() => {
  const { $, api, esc } = window.RA;
  const TZ = 'America/Santiago';
  const t = decodeURIComponent(location.pathname.split('/')[2] || '');
  const base = '/api/directorio/citas/' + encodeURIComponent(t);
  const largo = f => new Date(f).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const hora = f => new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const iniciales = n => n.replace(/^(Ps|Dr|Dra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();

  function pintar(c) {
    const pro = c.profesional, pasada = new Date(c.fin) < new Date(), pronto = new Date(c.inicio) - Date.now() < 15 * 60e3;
    const estado = c.estado === 'cancelada'
      ? `<div class="estado-perfil rechazado">Esta cita fue cancelada${c.canceladaPor === 'psicologo' ? ' por el profesional' : ''}.${c.motivoCancelacion ? ' Motivo: ' + esc(c.motivoCancelacion) : ''} <a href="/psicologos/${esc(pro.slug)}">Elegir otra hora</a></div>`
      : pasada ? '<div class="estado-perfil borrador">Esta cita ya pasó.</div>' : '<div class="estado-perfil publicado">Tu hora está confirmada.</div>';
    $('#cita').innerHTML = `<h1>Tu cita</h1>${estado}
      <section class="caja cita-caja">
        <div class="t-top"><span class="foto">${pro.foto ? `<img src="${esc(pro.foto)}" alt="">` : esc(iniciales(pro.nombre))}</span>
          <span><b>${esc(pro.nombre)}</b><a class="t-meta" href="/psicologos/${esc(pro.slug)}">Ver perfil</a></span></div>
        <p class="cita-fecha">${esc(largo(c.inicio))}<br><b>${hora(c.inicio)} a ${hora(c.fin)} hrs.</b></p>
        <p>${c.modalidad === 'online' ? 'Sesión online por videollamada.' : 'Sesión presencial' + (pro.comuna ? ' en ' + esc(pro.comuna) + '. El profesional te confirmará la dirección.' : '.')}</p>
        ${c.estado === 'confirmada' && !pasada ? `<div class="fila-btn">
          ${c.sala ? `<a class="btn" href="${esc(c.sala)}" target="_blank" rel="noopener noreferrer">${pronto ? 'Entrar a la videollamada' : 'Enlace de la videollamada'}</a>` : ''}
          <a class="btn ghost" href="${base}/calendario.ics">Agregar a mi calendario</a></div>
          ${c.sala ? '<p class="nota-suave">La videollamada se abre en el navegador, sin instalar nada. Entra unos minutos antes.</p>' : ''}` : ''}
      </section>
      ${c.estado === 'confirmada' && !pasada ? `<details class="agregar"><summary class="btn plain">No puedo asistir: cancelar mi hora</summary>
        <form id="f-cancelar" class="filas caja"><div class="campo-form"><label for="motivo">Motivo (opcional, lo verá el profesional)</label><input id="motivo" maxlength="300"></div>
        <button class="btn peligro" type="submit">Sí, cancelar mi hora</button></form></details>` : ''}
      <p class="nota-suave">Guarda esta página: es tu enlace personal para ver o cancelar tu cita. Si estás en una emergencia, no esperes: toca el botón SOS.</p>`;
  }
  async function cargar() {
    try { pintar((await api('GET', base)).cita); } catch (e) { $('#cita').innerHTML = `<div class="vacio-dir">${esc(e.message)}<br><a class="volver-dir" href="/">← Ver psicólogos</a></div>`; }
  }
  $('#cita').addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.submitter; b.disabled = true;
    try { await api('POST', base + '/cancelar', { motivo: $('#motivo').value }); cargar(); } catch (x) { b.disabled = false; window.alert(x.message); }
  });
  cargar();
})();
