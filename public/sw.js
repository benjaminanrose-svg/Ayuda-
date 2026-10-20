/* Avisos del navegador de Red Acompaña. Nunca muestran el contenido de la conversación. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* aviso sin datos */ }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Red Acompaña', {
    body: d.cuerpo || '',
    tag: d.etiqueta || 'red-acompana',
    renotify: true,
    requireInteraction: !!d.urgente,
    icon: '/img/icono-192.png',
    badge: '/img/insignia.png',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin);
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    for (const w of ventanas) {
      if (new URL(w.url).pathname === destino.pathname) {
        if ('navigate' in w) w.navigate(destino.href);
        return w.focus();
      }
    }
    return self.clients.openWindow(destino.href);
  }));
});
