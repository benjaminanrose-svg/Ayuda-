'use strict';
/* Edición del perfil propio del psicólogo, envío a revisión y solicitudes de hora recibidas. */
(() => {
  const { $, api, esc, fecha, soportaAvisos, activarAvisos } = window.RA;
  const SUGERIDAS = ['Ansiedad', 'Depresión', 'Adolescentes', 'Infanto-juvenil', 'Adultos', 'Adulto mayor', 'Pareja', 'Familia', 'Duelo', 'Trauma',
    'Crisis y prevención del suicidio', 'Autoestima', 'Estrés laboral', 'Adicciones', 'Trastornos alimentarios', 'Diversidad sexual y de género',
    'Neurodivergencia (TEA, TDAH)', 'Perinatal y posparto'];
  const TIPOS = [['titulo', 'Título'], ['magister', 'Magíster'], ['doctorado', 'Doctorado'], ['diplomado', 'Diplomado'], ['curso', 'Curso']];
  const ESTADO = {
    borrador: 'Tu perfil aún no es visible. Complétalo y envíalo a revisión.',
    pendiente: 'Tu perfil está en revisión. Te avisaremos cuando esté publicado.',
    publicado: 'Tu perfil está publicado en el directorio.',
    rechazado: 'Tu perfil necesita cambios antes de publicarse.'
  };
  let p = null, esp = [];
  function aviso(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 5000); }

  const filaEst = (e = {}) => `<div class="fila-ed"><select aria-label="Tipo">${TIPOS.map(([v, t]) => `<option value="${v}"${e.tipo === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
    <input aria-label="Título o nombre del programa" placeholder="Ej: Psicólogo, Diplomado en Trauma" value="${esc(e.titulo)}" maxlength="120">
    <input aria-label="Institución" placeholder="Universidad o institución" value="${esc(e.institucion)}" maxlength="120">
    <input aria-label="Año" placeholder="Año" value="${esc(e.anio)}" maxlength="4" inputmode="numeric">
    <button type="button" class="quitar" aria-label="Quitar">×</button></div>`;
  const filaExp = (e = {}) => `<div class="fila-ed exp"><input aria-label="Cargo" placeholder="Cargo, ej: Psicóloga clínica" value="${esc(e.cargo)}" maxlength="100">
    <input aria-label="Lugar" placeholder="Lugar, ej: CESFAM, consulta particular" value="${esc(e.lugar)}" maxlength="120">
    <input aria-label="Período" placeholder="2019 – hoy" value="${esc(e.periodo)}" maxlength="40">
    <button type="button" class="quitar" aria-label="Quitar">×</button></div>`;
  const chipsEsp = () => [...new Set([...SUGERIDAS, ...esp])].map(x => `<button type="button" aria-pressed="${esp.includes(x)}">${esc(x)}</button>`).join('');

  function pintar(rol, nuevas) {
    esp = p.especialidades.slice();
    const panel = rol !== 'psicologo' ? '<a class="btn ghost" href="/equipo">Ir al panel de casos</a>' : '';
    $('#mp').innerHTML = `<header class="adm-top"><div><h1>Mi perfil profesional</h1><p class="sub">Lo que completes aquí es lo que verán los pacientes.</p></div>
        <div class="fila-btn">${panel}<button class="btn plain" type="button" id="salir">Salir</button></div></header>
      <div class="estado-perfil ${p.estado}"><span>${ESTADO[p.estado]}</span>${p.notaRevision ? `<span>Comentario de revisión: ${esc(p.notaRevision)}</span>` : ''}
        <span class="fila-btn">${p.estado === 'publicado' ? `<a class="btn ghost" href="/psicologos/${esc(p.slug)}" target="_blank">Ver mi perfil público</a>` : `<a class="btn ghost" href="/psicologos/${esc(p.slug)}" target="_blank">Vista previa</a>${p.estado === 'pendiente' ? '' : '<button class="btn" type="button" id="enviar">Enviar a revisión</button>'}`}</span></div>
      <section class="caja" id="sec-sol"><h2 class="rotulo">Solicitudes de hora${nuevas ? ` <span class="nivel urgente">${nuevas} nuevas</span>` : ''}</h2><div id="solicitudes" class="filas"><p class="nota-suave">Cargando…</p></div>
        ${soportaAvisos() ? '<button class="btn plain" type="button" id="avisos">Avisarme en este navegador cuando llegue una</button>' : ''}</section>
      <form class="caja" id="f-perfil">
        <h2 class="rotulo">Datos básicos</h2>
        <div class="rejilla">
          <div class="campo-form"><label for="m-titulo">Título</label><input id="m-titulo" maxlength="12" value="${esc(p.titulo)}" placeholder="Ps."></div>
          <div class="campo-form"><label for="m-nombre">Nombre y apellido</label><input id="m-nombre" required maxlength="80" value="${esc(p.nombreSolo)}"></div>
          <div class="campo-form"><label for="m-sis">N.º registro Superintendencia de Salud</label><input id="m-sis" maxlength="20" value="${esc(p.registroSis)}"><small>Lo usamos para verificar tu título. <a href="https://rnpi.superdesalud.gob.cl/" target="_blank" rel="noopener">Buscar mi registro</a></small></div>
          <div class="campo-form"><label for="m-mod">Modalidad</label><select id="m-mod">${[['online', 'Online'], ['presencial', 'Presencial'], ['ambas', 'Online y presencial']].map(([v, t]) => `<option value="${v}"${p.modalidad === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="campo-form"><label for="m-comuna">Comuna (si atiendes presencial)</label><input id="m-comuna" maxlength="60" value="${esc(p.comuna)}"></div>
          <div class="campo-form"><label for="m-precio">Valor por sesión (CLP, opcional)</label><input id="m-precio" inputmode="numeric" maxlength="8" value="${p.precio == null ? '' : p.precio}" placeholder="35000"></div>
        </div>
        <h2 class="rotulo">Foto</h2>
        <div class="foto-fila"><span class="foto grande" id="foto-prev">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : 'Foto'}</span>
          <label class="btn ghost" for="m-foto">Elegir foto</label><input id="m-foto" type="file" accept="image/*" class="sr">${p.foto ? '<button class="btn plain" type="button" id="quitar-foto">Quitar</button>' : ''}</div>
        <h2 class="rotulo">Sobre mí</h2>
        <div class="campo-form"><label for="m-resumen">Resumen (lo primero que leen los pacientes)</label><textarea id="m-resumen" maxlength="1500" rows="5" placeholder="Quién eres, a quiénes atiendes y cómo puedes ayudar.">${esc(p.resumen)}</textarea></div>
        <div class="campo-form"><label for="m-enfoque">Cómo trabajo (enfoque, opcional)</label><textarea id="m-enfoque" maxlength="800" rows="3" placeholder="Ej: terapia cognitivo-conductual, sistémica…">${esc(p.enfoque)}</textarea></div>
        <h2 class="rotulo">Especialidades</h2>
        <div class="esp-opc" id="esp">${chipsEsp()}</div>
        <div class="fila-btn"><label class="sr" for="m-otra">Otra especialidad</label><input id="m-otra" class="entrada" maxlength="40" placeholder="Agregar otra especialidad"><button class="btn ghost" type="button" id="agregar-esp">Agregar</button></div>
        <h2 class="rotulo">Estudios, diplomados y cursos</h2>
        <div class="filas" id="estudios">${(p.estudios.length ? p.estudios : [{ tipo: 'titulo' }]).map(filaEst).join('')}</div>
        <button class="btn plain" type="button" id="mas-est">+ Agregar estudio</button>
        <h2 class="rotulo">Experiencia</h2>
        <div class="filas" id="experiencia">${(p.experiencia.length ? p.experiencia : [{}]).map(filaExp).join('')}</div>
        <button class="btn plain" type="button" id="mas-exp">+ Agregar experiencia</button>
        <h2 class="rotulo">LinkedIn (opcional)</h2>
        <div class="campo-form"><label for="m-linkedin">Enlace a tu perfil</label><input id="m-linkedin" maxlength="200" value="${esc(p.linkedin)}" placeholder="https://www.linkedin.com/in/…"></div>
        <div class="barra-guardar"><button class="btn" type="submit">Guardar cambios</button><span class="nota-suave" id="guardado"></span></div>
      </form>`;
    cargarSolicitudes();
  }

  const datos = () => ({
    titulo: $('#m-titulo').value, nombre: $('#m-nombre').value, registroSis: $('#m-sis').value, modalidad: $('#m-mod').value, comuna: $('#m-comuna').value,
    precio: $('#m-precio').value.replace(/\D/g, ''), resumen: $('#m-resumen').value, enfoque: $('#m-enfoque').value, especialidades: esp, linkedin: $('#m-linkedin').value,
    estudios: [...document.querySelectorAll('#estudios .fila-ed')].map(f => { const [t, a, b, c] = f.querySelectorAll('select,input'); return { tipo: t.value, titulo: a.value, institucion: b.value, anio: c.value }; }).filter(e => e.titulo || e.institucion),
    experiencia: [...document.querySelectorAll('#experiencia .fila-ed')].map(f => { const [a, b, c] = f.querySelectorAll('input'); return { cargo: a.value, lugar: b.value, periodo: c.value }; }).filter(e => e.cargo || e.lugar)
  });
  async function guardar(silencioso) {
    const d = await api('PUT', '/api/directorio/mio', datos());
    p = d.perfil;
    if (!silencioso) aviso(d.volvioARevision ? 'Guardado. Como cambiaste tu nombre o registro, el perfil vuelve a revisión.' : 'Cambios guardados.');
    $('#guardado').textContent = 'Guardado ' + fecha(new Date());
    if (d.volvioARevision) iniciar();
  }

  async function cargarSolicitudes() {
    try {
      const { solicitudes } = await api('GET', '/api/directorio/mio/solicitudes');
      $('#solicitudes').innerHTML = solicitudes.map(s => `<div class="solicitud${s.leida ? '' : ' nueva'}"><b>${esc(s.nombre)}</b><span class="t-meta">${esc(s.contacto)} · ${esc(fecha(s.creadaEn))}</span>${s.mensaje ? `<p>${esc(s.mensaje)}</p>` : ''}
        ${s.leida ? '' : `<button class="btn plain" type="button" data-leida="${s.id}">Marcar como vista</button>`}</div>`).join('')
        || `<p class="nota-suave">${p.estado === 'publicado' ? 'Aún no tienes solicitudes.' : 'Cuando tu perfil esté publicado, aquí verás las solicitudes de hora de los pacientes.'}</p>`;
    } catch (e) { $('#solicitudes').innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }

  // reduce la foto a 480 px y la guarda como JPG
  function achicar(archivo) {
    return new Promise((ok, mal) => {
      const img = new Image(), lector = new FileReader();
      img.onload = () => {
        const lado = Math.min(img.width, img.height), t = Math.min(480, lado), c = document.createElement('canvas');
        c.width = c.height = t;
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, t, t);
        ok(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = lector.onerror = () => mal(new Error('No se pudo leer esa imagen. Prueba con una foto JPG o PNG.'));
      lector.onload = () => { img.src = lector.result; };
      lector.readAsDataURL(archivo);
    });
  }

  $('#mp').addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('#esp button')) { const v = t.textContent; esp = esp.includes(v) ? esp.filter(x => x !== v) : [...esp, v]; t.setAttribute('aria-pressed', String(esp.includes(v))); return; }
    if (t.id === 'agregar-esp') { const v = $('#m-otra').value.trim(); if (v && !esp.includes(v)) { esp.push(v); $('#esp').innerHTML = chipsEsp(); } $('#m-otra').value = ''; return; }
    if (t.id === 'mas-est') return $('#estudios').insertAdjacentHTML('beforeend', filaEst({ tipo: 'diplomado' }));
    if (t.id === 'mas-exp') return $('#experiencia').insertAdjacentHTML('beforeend', filaExp());
    if (t.classList.contains('quitar')) return t.closest('.fila-ed').remove();
    try {
      if (t.id === 'salir') { await api('POST', '/api/equipo/salir', {}); return location.replace('/'); }
      if (t.id === 'enviar') { t.disabled = true; await guardar(true); await api('POST', '/api/directorio/mio/enviar', {}); aviso('¡Enviado! Revisaremos tu perfil pronto.'); return iniciar(); }
      if (t.id === 'quitar-foto') { await api('DELETE', '/api/directorio/mio/foto'); return iniciar(); }
      if (t.id === 'avisos') { await activarAvisos('/api/equipo/push'); t.remove(); return aviso('Listo: te avisaremos en este navegador.'); }
      if (t.dataset.leida) { await api('POST', `/api/directorio/mio/solicitudes/${t.dataset.leida}/leida`, {}); return cargarSolicitudes(); }
    } catch (x) { aviso(x.message); if (t.id === 'enviar') t.disabled = false; }
  });
  $('#mp').addEventListener('change', async e => {
    if (e.target.id !== 'm-foto' || !e.target.files[0]) return;
    try {
      const imagen = await achicar(e.target.files[0]);
      await api('POST', '/api/directorio/mio/foto', { imagen });
      $('#foto-prev').innerHTML = `<img src="${imagen}" alt="">`; // sin recargar, para no perder lo que no se ha guardado
      aviso('Foto guardada.');
    }
    catch (x) { aviso(x.message); }
  });
  $('#mp').addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.submitter; if (b) b.disabled = true;
    try { await guardar(false); } catch (x) { aviso(x.message); } finally { if (b) b.disabled = false; }
  });

  async function iniciar() {
    try { const d = await api('GET', '/api/directorio/mio'); p = d.perfil; pintar(d.rol, d.solicitudesNuevas); }
    catch (e) {
      if (e.estado === 401) return location.replace('/registro');
      if (e.datos && e.datos.cambiarClave) return location.replace('/ingresar#perfil');
      $('#mp').innerHTML = `<p class="error">${esc(e.message)}</p>`;
    }
  }
  iniciar();
})();
