'use strict';
/* Menú de cuenta en la cabecera pública. Sin sesión: «Soy psicólogo» (crear perfil o ingresar).
   Con sesión: «Mi cuenta» (editar perfil, ver perfil público, agenda, panel, salir). Sin JavaScript queda el enlace simple. */
(() => {
  const ancla = document.getElementById('cuenta');
  if (!ancla) return;
  const enlace = (href, t) => `<a href="${href}">${t}</a>`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const iniciales = n => String(n || '').replace(/^(Ps|Dr|Dra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  function menu(boton, items) {
    const d = document.createElement('details');
    d.className = 'cuenta';
    d.innerHTML = `${boton}<div class="cuenta-lista">${items}</div>`;
    ancla.replaceWith(d);
  }
  fetch('/api/equipo/estado', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({})).then(s => {
    if (!s.sesion) return menu('<summary class="btn-banda">Soy psicólogo</summary>', enlace('/registro', 'Crear mi perfil gratis') + enlace('/ingresar', 'Ya tengo cuenta: ingresar'));
    const psi = s.rol === 'psicologo' || !!s.slug;
    // con sesión: la foto de perfil (o las iniciales) arriba a la derecha abre el menú
    menu(`<summary class="avatar-btn" aria-label="Mi cuenta"><span class="avatar">${s.foto ? `<img src="${esc(s.foto)}" alt="">` : esc(iniciales(s.nombre))}</span></summary>`,
      `<div class="cuenta-quien"><b>${esc(s.nombre)}</b><span>${esc(s.correo)}</span></div>` + (psi ? enlace('/mi-perfil', 'Editar mi perfil') + (s.slug ? enlace('/psicologos/' + encodeURIComponent(s.slug), 'Ver mi perfil público') : '') + enlace('/mi-perfil#agenda', 'Mi agenda y citas') : '')
      + (s.rol !== 'psicologo' ? enlace('/equipo', 'Panel de casos') + (s.rol === 'admin' ? enlace('/equipo#admin', 'Administración') : '') : '')
      + '<button type="button" data-salir>Salir</button>');
    // en la portada, «Crear mi perfil» pasa a «Ir a mi perfil»
    const cta = document.querySelector('.cta-psi a[href="/registro"]');
    if (cta && psi) { cta.textContent = 'Ir a mi perfil'; cta.href = '/mi-perfil'; }
  });
  document.addEventListener('click', async e => {
    const abierto = document.querySelector('details.cuenta[open]');
    if (abierto && !abierto.contains(e.target)) abierto.open = false;
    if (e.target.closest('[data-salir]')) {
      await fetch('/api/equipo/salir', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      location.replace('/');
    }
  });
  document.addEventListener('keydown', e => {
    const abierto = document.querySelector('details.cuenta[open]');
    if (e.key === 'Escape' && abierto) { abierto.open = false; abierto.querySelector('summary').focus(); }
  });
})();
