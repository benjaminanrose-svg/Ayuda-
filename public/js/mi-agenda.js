'use strict';
/* Agenda del psicólogo: horario semanal, días bloqueados y citas reservadas. */
window.MiAgenda = (() => {
  const { $, api, esc } = window.RA;
  const TZ = 'America/Santiago';
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const fecha = f => new Date(f).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const hora = f => new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const opciones = (vals, actual, f) => vals.map(v => `<option value="${v}"${v === actual ? ' selected' : ''}>${f(v)}</option>`).join('');
  let caja = null, aviso = null, bloqueos = [];

  const rango = (b = { desde: '09:00', hasta: '13:00' }) => `<span class="rango"><input type="time" value="${esc(b.desde)}" aria-label="Desde" step="900"> a <input type="time" value="${esc(b.hasta)}" aria-label="Hasta" step="900"><button type="button" class="quitar" data-quitar-rango aria-label="Quitar horario">×</button></span>`;
  const chipsBloqueos = () => bloqueos.map(f => `<span class="bloqueo">${esc(new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }))}<button type="button" data-quitar-bloqueo="${f}" aria-label="Quitar">×</button></span>`).join('') || '<span class="nota-suave">Ninguno.</span>';

  function cita(c) {
    const pasada = new Date(c.inicio) < new Date(), estado = c.estado === 'cancelada' ? `Cancelada${c.canceladaPor === 'paciente' ? ' por el paciente' : ''}${c.motivoCancelacion ? ': ' + esc(c.motivoCancelacion) : ''}` : c.estado === 'realizada' ? 'Realizada' : '';
    return `<div class="cita-ed ${c.estado}"><div class="cita-hora"><b>${hora(c.inicio)}</b><span>${esc(fecha(c.inicio))}</span></div>
      <div><b>${esc(c.nombre)}</b><span class="t-meta">${esc(c.contacto)} · ${c.modalidad === 'online' ? 'Online' : 'Presencial'}</span>${c.motivo ? `<p>${esc(c.motivo)}</p>` : ''}${estado ? `<span class="t-meta">${estado}</span>` : ''}
      ${c.estado === 'confirmada' ? `<div class="fila-btn">${c.sala ? `<a class="btn" href="${esc(c.sala)}" target="_blank" rel="noopener noreferrer">Abrir videollamada</a>` : ''}${pasada ? `<button class="btn ghost" type="button" data-cita="${c.id}" data-acc="realizada">Marcar realizada</button>` : `<button class="btn plain" type="button" data-cita="${c.id}" data-acc="cancelar">Cancelar cita</button>`}</div>` : ''}</div></div>`;
  }

  function pintar(d) {
    bloqueos = d.bloqueos.slice();
    const a = d.agenda, prox = d.citas.filter(c => new Date(c.fin) > new Date() || c.estado === 'confirmada');
    caja.innerHTML = `<section class="caja"><h2 class="rotulo">Próximas citas</h2>
        <div class="filas">${prox.map(cita).join('') || '<p class="nota-suave">Aún no tienes citas. Cuando un paciente reserve, aparecerá aquí y te avisaremos.</p>'}</div></section>
      <form class="caja" id="f-agenda">
        <h2 class="rotulo">Mi horario semanal</h2>
        <p class="nota-suave">Marca los horarios en que atiendes. Los pacientes verán las horas libres y reservarán solos. ${d.publicado ? '' : 'Se mostrarán cuando tu perfil esté publicado.'}</p>
        <div class="semana">${DIAS.map((n, i) => `<div class="dia-ed" data-dia="${i + 1}"><b>${n}</b><div class="rangos">${a.bloques.filter(b => b.dia === i + 1).map(rango).join('')}</div><button type="button" class="btn plain" data-agregar-rango>+ Horario</button></div>`).join('')}</div>
        <div class="rejilla">
          <div class="campo-form"><label for="a-dur">Duración de cada sesión</label><select id="a-dur">${opciones([30, 45, 50, 60, 90], a.duracion, v => v + ' minutos')}</select></div>
          <div class="campo-form"><label for="a-desc">Descanso entre sesiones</label><select id="a-desc">${opciones([0, 5, 10, 15, 30], a.descanso, v => v ? v + ' minutos' : 'Sin descanso')}</select></div>
          <div class="campo-form"><label for="a-ant">Reservar con al menos</label><select id="a-ant">${opciones([2, 6, 12, 24, 48], a.anticipacion, v => v + ' horas de anticipación')}</select></div>
          <div class="campo-form"><label for="a-dias">Mostrar horas para los próximos</label><select id="a-dias">${opciones([7, 14, 30, 60], a.dias, v => v + ' días')}</select></div>
        </div>
        <h2 class="rotulo">Días sin atención</h2>
        <p class="nota-suave">Vacaciones, feriados o días libres: ese día no se podrá reservar.</p>
        <div class="fila-btn"><label class="sr" for="a-bloq">Fecha</label><input type="date" id="a-bloq" class="entrada"><button type="button" class="btn ghost" id="agregar-bloqueo">Agregar día</button></div>
        <div class="bloqueos" id="bloqueos">${chipsBloqueos()}</div>
        <div class="barra-guardar"><button class="btn" type="submit">Guardar horario</button><span class="nota-suave" id="libres">${d.libres ? `Tienes ${d.libres} horas disponibles para reservar.` : 'Todavía no hay horas disponibles para reservar.'}</span></div>
      </form>`;
  }

  async function cargar(contenedor, fnAviso) {
    caja = contenedor; aviso = fnAviso;
    if (!caja.dataset.listo) {
      caja.dataset.listo = '1';
      caja.addEventListener('click', clic);
      caja.addEventListener('submit', guardar);
    }
    try { pintar(await api('GET', '/api/directorio/mio/agenda')); } catch (e) { caja.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }

  async function clic(e) {
    const t = e.target;
    if (t.hasAttribute('data-agregar-rango')) { const rs = t.parentElement.querySelector('.rangos'), ult = rs.querySelectorAll('input'); rs.insertAdjacentHTML('beforeend', rango(ult.length ? { desde: '15:00', hasta: '19:00' } : undefined)); return; }
    if (t.hasAttribute('data-quitar-rango')) return t.closest('.rango').remove();
    if (t.id === 'agregar-bloqueo') { const v = $('#a-bloq').value; if (v && !bloqueos.includes(v)) { bloqueos.push(v); bloqueos.sort(); $('#bloqueos').innerHTML = chipsBloqueos(); } return; }
    if (t.dataset.quitarBloqueo) { bloqueos = bloqueos.filter(f => f !== t.dataset.quitarBloqueo); $('#bloqueos').innerHTML = chipsBloqueos(); return; }
    if (t.dataset.cita) {
      let motivo = '';
      if (t.dataset.acc === 'cancelar') { motivo = window.prompt('¿Por qué cancelas? El paciente lo verá en su enlace de la cita.'); if (motivo === null) return; }
      t.disabled = true;
      try { await api('POST', `/api/directorio/mio/citas/${t.dataset.cita}/${t.dataset.acc}`, { motivo }); aviso(t.dataset.acc === 'cancelar' ? 'Cita cancelada. Avísale también al paciente por su contacto.' : 'Cita marcada como realizada.'); cargar(caja, aviso); }
      catch (x) { aviso(x.message); t.disabled = false; }
    }
  }

  async function guardar(e) {
    if (e.target.id !== 'f-agenda') return;
    e.preventDefault();
    const bloques = [];
    caja.querySelectorAll('.dia-ed').forEach(d => d.querySelectorAll('.rango').forEach(r => { const [x, y] = r.querySelectorAll('input'); if (x.value && y.value) bloques.push({ dia: +d.dataset.dia, desde: x.value, hasta: y.value }); }));
    const malos = bloques.filter(b => b.desde >= b.hasta).length;
    if (malos) return aviso('Revisa los horarios: la hora de término debe ser después de la de inicio.');
    const b = e.submitter; if (b) b.disabled = true;
    try {
      const r = await api('PUT', '/api/directorio/mio/agenda', { agenda: { bloques, duracion: +$('#a-dur').value, descanso: +$('#a-desc').value, anticipacion: +$('#a-ant').value, dias: +$('#a-dias').value }, bloqueos });
      $('#libres').textContent = r.libres ? `Guardado. Tienes ${r.libres} horas disponibles para reservar.` : 'Guardado. Todavía no hay horas disponibles: agrega horarios en algún día.';
      aviso('Horario guardado.');
    } catch (x) { aviso(x.message); } finally { if (b) b.disabled = false; }
  }
  return { cargar };
})();
