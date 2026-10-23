'use strict';
/* Agenda: horario semanal → horas libres. Las fechas se calculan en la hora de Chile (TZ del proceso). */
const AGENDA_BASE = { bloques: [], duracion: 50, descanso: 10, anticipacion: 12, dias: 30 };
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const min = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const entre = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };

function normalizar(a) {
  a = a || {};
  const bloques = (Array.isArray(a.bloques) ? a.bloques : []).slice(0, 28)
    .map(b => ({ dia: Number(b && b.dia), desde: String(b && b.desde), hasta: String(b && b.hasta) }))
    .filter(b => Number.isInteger(b.dia) && b.dia >= 1 && b.dia <= 7 && HM.test(b.desde) && HM.test(b.hasta) && min(b.desde) < min(b.hasta))
    .sort((x, y) => x.dia - y.dia || min(x.desde) - min(y.desde));
  return {
    bloques,
    duracion: entre(a.duracion, 20, 180, AGENDA_BASE.duracion),
    descanso: entre(a.descanso, 0, 60, AGENDA_BASE.descanso),
    anticipacion: entre(a.anticipacion, 0, 168, AGENDA_BASE.anticipacion),
    dias: entre(a.dias, 1, 90, AGENDA_BASE.dias)
  };
}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ocupadas: lista de [inicioMs, finMs] de citas vigentes; bloqueos: Set de 'AAAA-MM-DD' */
function horasLibres(agenda, bloqueos, ocupadas, ahora = Date.now()) {
  const a = normalizar(agenda), dur = a.duracion * 60e3, paso = (a.duracion + a.descanso) * 60e3, desde = ahora + a.anticipacion * 3600e3;
  const hoy = new Date(ahora), out = [];
  for (let i = 0; i <= a.dias; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    if (bloqueos.has(ymd(d))) continue;
    const dia = d.getDay() || 7;
    for (const b of a.bloques) {
      if (b.dia !== dia) continue;
      const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min(b.hasta)).getTime();
      for (let t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min(b.desde)).getTime(); t + dur <= fin; t += paso) {
        if (t >= desde && !ocupadas.some(([x, y]) => t < y && t + dur > x)) out.push(t);
      }
    }
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

/* archivo de calendario (.ics) para agregar la cita al teléfono */
function ics({ id, inicio, fin, titulo, descripcion, lugar }) {
  const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const e = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ConténMente//Agenda//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:cita-${id}@contenmente`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`, `SUMMARY:${e(titulo)}`,
    `DESCRIPTION:${e(descripcion)}`, `LOCATION:${e(lugar)}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${e(titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

module.exports = { AGENDA_BASE, normalizar, horasLibres, ics, ymd };
