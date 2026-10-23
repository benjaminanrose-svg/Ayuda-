'use strict';
/* Directorio público: lista de psicólogos publicados con búsqueda y filtros (en el navegador). */
(() => {
  const { $, api, esc } = window.RA;
  const MOD = { online: 'Online', presencial: 'Presencial', ambas: 'Online y presencial' };
  const sinTilde = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iniciales = n => n.replace(/^(Ps|Dr|Dra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  const precio = n => (n ? '$' + Number(n).toLocaleString('es-CL') + ' la sesión' : '');
  let todos = [];

  const meta = p => [MOD[p.modalidad], p.comuna, precio(p.precio)].filter(Boolean).map(esc).join(' · ');
  const tarjeta = p => `<li><a class="tarjeta" href="/psicologos/${esc(p.slug)}">
    <span class="foto">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : esc(iniciales(p.nombre))}</span>
    <span class="t-cuerpo"><b>${esc(p.nombre)}</b><span class="t-meta">${meta(p)}</span><span class="t-res">${esc(p.resumen)}</span>
    <span class="chips">${p.especialidades.slice(0, 4).map(e => `<span>${esc(e)}</span>`).join('')}</span></span></a></li>`;

  function pintar() {
    const q = sinTilde($('#q').value.trim()), esp = $('#f-esp').value, mod = $('#f-mod').value;
    const r = todos.filter(p => (!esp || p.especialidades.includes(esp))
      && (!mod || p.modalidad === mod || p.modalidad === 'ambas')
      && (!q || sinTilde([p.nombre, p.comuna, p.resumen, ...p.especialidades].join(' ')).includes(q)));
    $('#lista').innerHTML = r.map(tarjeta).join('') || `<li class="vacio-dir">${todos.length ? 'No encontramos psicólogos con esos filtros. Prueba quitando alguno.' : 'Muy pronto verás aquí a los primeros psicólogos. Si eres psicólogo, crea tu perfil más abajo.'}</li>`;
    $('#contador').textContent = todos.length ? (r.length === 1 ? '1 psicólogo' : r.length + ' psicólogos') : '';
  }
  (async () => {
    try { todos = (await api('GET', '/api/directorio/perfiles')).perfiles; } catch (e) { $('#contador').textContent = e.message; }
    const esps = [...new Set(todos.flatMap(p => p.especialidades))].sort((a, b) => a.localeCompare(b, 'es'));
    $('#f-esp').insertAdjacentHTML('beforeend', esps.map(e => `<option>${esc(e)}</option>`).join(''));
    pintar();
  })();
  ['#q', '#f-esp', '#f-mod'].forEach(s => $(s).addEventListener('input', pintar));
  $('#buscar').addEventListener('submit', e => e.preventDefault());
})();
