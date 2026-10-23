'use strict';
/* Recorte de imágenes antes de subirlas: arrastrar para encuadrar y deslizar para acercar. Devuelve un JPG. */
window.Recorte = (src, { ancho, alto, redondo = false, titulo = 'Ajusta la imagen' }) => new Promise(listo => {
  const img = new Image();
  img.onerror = () => listo(null);
  img.onload = () => {
    const d = document.createElement('dialog');
    d.className = 'recorte';
    d.innerHTML = `<h2>${titulo}</h2><p class="nota-suave">Arrastra para encuadrar y usa la barra para acercar.</p>
      <canvas class="lienzo"></canvas>
      <label class="zoom">Alejar<input type="range" min="1" max="3" step="0.01" value="1" aria-label="Acercar o alejar">Acercar</label>
      <div class="fila-btn"><button class="btn" type="button" data-r="ok">Usar esta imagen</button><button class="btn plain" type="button" data-r="no">Cancelar</button></div>`;
    document.body.append(d);
    const cv = d.querySelector('canvas'), ctx = cv.getContext('2d'), zoom = d.querySelector('input');
    const W = Math.min(560, window.innerWidth - 56), H = Math.round(W * alto / ancho), r = window.devicePixelRatio || 1;
    cv.width = W * r; cv.height = H * r; cv.style.height = H + 'px';
    const base = Math.max(W / img.width, H / img.height);
    let z = 1, x = (W - img.width * base) / 2, y = (H - img.height * base) / 2;
    const limitar = () => {
      const w = img.width * base * z, h = img.height * base * z;
      x = Math.min(0, Math.max(W - w, x)); y = Math.min(0, Math.max(H - h, y));
    };
    function dibujar() {
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, x, y, img.width * base * z, img.height * base * z);
      if (redondo) { // oscurece lo que queda fuera del círculo
        ctx.fillStyle = 'rgba(34,43,59,.55)';
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2, true); ctx.fill();
      }
    }
    zoom.addEventListener('input', () => {
      const nz = Number(zoom.value), cx = W / 2, cy = H / 2;
      x = cx - (cx - x) * nz / z; y = cy - (cy - y) * nz / z; z = nz; limitar(); dibujar();
    });
    let arrastre = null;
    cv.addEventListener('pointerdown', e => { arrastre = { px: e.clientX, py: e.clientY, x, y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!arrastre) return; x = arrastre.x + e.clientX - arrastre.px; y = arrastre.y + e.clientY - arrastre.py; limitar(); dibujar(); });
    cv.addEventListener('pointerup', () => { arrastre = null; });
    function cerrar(v) { d.close(); d.remove(); listo(v); }
    d.addEventListener('cancel', e => { e.preventDefault(); cerrar(null); });
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === 'no') return cerrar(null);
      const out = document.createElement('canvas'), k = ancho / W;
      out.width = ancho; out.height = alto;
      const o = out.getContext('2d');
      o.fillStyle = '#fff'; o.fillRect(0, 0, ancho, alto);
      o.imageSmoothingQuality = 'high';
      o.drawImage(img, x * k, y * k, img.width * base * z * k, img.height * base * z * k);
      cerrar(out.toDataURL('image/jpeg', 0.86));
    });
    d.showModal();
    dibujar();
  };
  img.src = src;
});
