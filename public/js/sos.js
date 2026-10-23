'use strict';
/* Botón SOS: siempre visible en las páginas públicas; abre ayuda inmediata y la conversación con Nexo. */
(() => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sos-btn'; b.textContent = 'SOS';
  b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'SOS: ayuda inmediata');
  const p = document.createElement('div');
  p.className = 'sos-panel'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Ayuda inmediata');
  p.innerHTML = `<b>¿Necesitas ayuda ahora?</b>
    <p>Si estás pasando por un momento muy difícil, no tienes que enfrentarlo solo/a.</p>
    <a class="btn" href="/conversar">Hablar ahora con Nexo</a>
    <div class="nums"><a href="tel:*4141"><b>*4141</b>Prevención del suicidio</a><a href="tel:131"><b>131</b>SAMU</a></div>
    <p class="nota-suave">Nexo es un asistente automático: te escucha y, si lo necesitas, avisa a un especialista. Las llamadas son gratis, las 24 horas.</p>
    <button type="button" class="enlace">Cerrar</button>`;
  const abrir = v => { p.hidden = !v; b.setAttribute('aria-expanded', String(v)); if (v) p.querySelector('.btn').focus(); };
  b.addEventListener('click', () => abrir(p.hidden));
  p.querySelector('.enlace').addEventListener('click', () => { abrir(false); b.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) { abrir(false); b.focus(); } });
  document.body.append(p, b);
})();
