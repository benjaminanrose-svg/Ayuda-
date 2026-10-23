'use strict';
/* Utilidades compartidas: llamadas a la API, avisos del navegador y formato de fechas. */
window.RA = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[<&>"']/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  async function api(metodo, url, cuerpo) {
    const op = { method: metodo, credentials: 'same-origin', headers: {} };
    if (metodo !== 'GET') { op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(cuerpo || {}); }
    let r;
    try { r = await fetch(url, op); } catch { throw Object.assign(new Error('Sin conexión. Revisa tu internet e intenta de nuevo.'), { estado: 0 }); }
    let d = {};
    try { d = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok) {
      const reiniciando = [502, 503, 504].includes(r.status);
      const texto = d.error || (reiniciando ? 'El servicio se está reiniciando. Espera unos segundos y vuelve a intentar.' : `Ocurrió un error (código ${r.status}). Intenta de nuevo.`);
      throw Object.assign(new Error(texto), { estado: r.status, datos: d, reiniciando });
    }
    return d;
  }

  const soportaAvisos = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const llave = s => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };

  async function activarAvisos(urlGuardar) {
    if (!soportaAvisos()) throw new Error('Este navegador no permite avisos.');
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('No se dio permiso para los avisos.');
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const { clave } = await api('GET', '/api/push/clave');
    const s = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llave(clave) }));
    await api('POST', urlGuardar, { suscripcion: s.toJSON() });
  }

  const hora = f => new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fecha = f => new Date(f).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + hora(f);
  // credenciales del directorio: sello para los PDF y nombres de tipos
  const sello = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 40l-6 20 10-5 6 7 4-18zM42 40l6 20-10-5-6 7-4-18z" fill="#B8A2DA"/><circle cx="32" cy="28" r="20" fill="#8CC8BC"/><circle cx="32" cy="28" r="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M25 28l5 5 9-10" fill="none" stroke="#30486C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TIPO_DOC = { titulo: 'Título', diploma: 'Diploma', certificado: 'Certificado', otro: 'Documento' };
  const vistaDoc = d => `<span class="c-vista">${d.pdf ? sello : `<img src="${esc(d.url)}" alt="" loading="lazy">`}</span>`;
  return { $, esc, api, soportaAvisos, activarAvisos, hora, fecha, sello, TIPO_DOC, vistaDoc };
})();
