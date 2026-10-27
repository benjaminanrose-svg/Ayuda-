'use strict';
/* Directorio público: lista de psicólogos publicados con búsqueda y filtros (en el navegador). */
(() => {
  const { $, api, esc, ATIENDE, nombres } = window.RA;
  const MOD = { online: 'Online', presencial: 'Presencial', ambas: 'Online y presencial' };
  const sinTilde = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iniciales = n => n.replace(/^(Ps|Dr|Dra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  const precio = n => (n ? '$' + Number(n).toLocaleString('es-CL') + ' la sesión' : '');
  let todos = [];
  const TZ = 'America/Santiago';
  function cuando(t) {
    const d = new Date(t), dia = x => new Date(x).toLocaleDateString('en-CA', { timeZone: TZ }), h = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
    if (dia(d) === dia(Date.now())) return 'hoy ' + h;
    if (dia(d) === dia(Date.now() + 864e5)) return 'mañana ' + h;
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '') + ', ' + h;
  }

  const meta = p => [MOD[p.modalidad], p.comuna, precio(p.precio)].filter(Boolean).map(esc).join(' · ');
  const tarjeta = p => `<li><a class="tarjeta acento ac-${esc(p.color || 'menta')}" href="/psicologos/${esc(p.slug)}">
    <span class="t-fondo"><img src="${esc(p.fondo)}" alt="" loading="lazy"></span>
    <span class="t-top"><span class="foto">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : esc(iniciales(p.nombre))}</span>
      <span><b>${esc(p.nombre)}</b>${p.lema ? `<span class="lema">${esc(p.lema)}</span>` : ''}<span class="t-meta">${meta(p)}</span></span></span>
    <span class="t-res">${esc(p.resumen)}</span>
    <span class="chips">${p.especialidades.slice(0, 4).map(e => `<span>${esc(e)}</span>`).join('')}</span>
    ${p.proxima ? `<span class="t-prox">Próxima hora: ${esc(cuando(p.proxima))}</span>` : ''}
    ${p.documentos ? `<span class="t-doc">✓ ${p.documentos === 1 ? '1 diploma o certificado' : p.documentos + ' diplomas y certificados'} a la vista</span>` : ''}</a></li>`;

  function pintar() {
    const q = sinTilde($('#q').value.trim()), esp = $('#f-esp').value, mod = $('#f-mod').value, para = $('#f-para').value;
    const r = todos.filter(p => (!esp || p.especialidades.includes(esp))
      && (!para || (p.atiende || []).includes(para))
      && (!mod || p.modalidad === mod || p.modalidad === 'ambas')
      && (!q || sinTilde([p.nombre, p.comuna, p.resumen, p.lema, ...p.especialidades, ...nombres(ATIENDE, p.atiende)].join(' ')).includes(q)));
    $('#lista').innerHTML = r.map(tarjeta).join('') || `<li class="vacio-dir"><img src="/img/ilustraciones/relaxing-at-home.svg" alt=""><b>${todos.length ? 'No encontramos psicólogos con esos filtros' : 'Muy pronto verás aquí a los primeros psicólogos'}</b><span>${todos.length ? 'Prueba con otra palabra o quita algún filtro.' : 'Estamos revisando los primeros perfiles. Si eres psicólogo, puedes crear el tuyo hoy.'}</span></li>`;
    $('#contador').textContent = todos.length ? (r.length === 1 ? '1 psicólogo' : r.length + ' psicólogos') : '';
  }
  (async () => {
    try { todos = (await api('GET', '/api/directorio/perfiles')).perfiles; } catch (e) { $('#contador').textContent = e.message; }
    const esps = [...new Set(todos.flatMap(p => p.especialidades))].sort((a, b) => a.localeCompare(b, 'es'));
    $('#f-esp').insertAdjacentHTML('beforeend', esps.map(e => `<option>${esc(e)}</option>`).join(''));
    pintar();
  })();
  ['#q', '#f-esp', '#f-mod', '#f-para'].forEach(s => $(s).addEventListener('input', pintar));
  $('#buscar').addEventListener('submit', e => { e.preventDefault(); pintar(); $('#psicologos').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
})();
