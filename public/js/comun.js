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
  return { $, esc, api, soportaAvisos, activarAvisos, hora, fecha };
})();
