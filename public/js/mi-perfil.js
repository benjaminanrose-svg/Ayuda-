'use strict';
/* Edición del perfil propio del psicólogo, envío a revisión y solicitudes de hora recibidas. */
(() => {
  const { $, api, esc, fecha, soportaAvisos, activarAvisos, TIPO_DOC, vistaDoc, COLORES, ATIENDE, IDIOMAS, PAGOS } = window.RA;
  const DISENOS = [['calma', 'Calma'], ['lavanda', 'Lavanda'], ['brotes', 'Brotes'], ['noche', 'Noche'], ['trama', 'Trama'], ['aurora', 'Aurora']];
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
  let p = null, esp = [], diseno = 'calma', color = 'menta', tieneHorario = false;
  const opciones = (grupo, lista, elegidas) => `<div class="esp-opc" data-grupo="${grupo}">${lista.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${elegidas.includes(v)}">${t}</button>`).join('')}</div>`;
  const marcadas = grupo => [...document.querySelectorAll(`[data-grupo="${grupo}"] [aria-pressed="true"]`)].map(b => b.dataset.v);
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
  const docsHtml = docs => docs.map(d => `<div class="doc-ed">${vistaDoc(d)}<div><b>${esc(d.nombre)}</b><span class="t-meta">${TIPO_DOC[d.tipo]}${d.pdf ? ' · PDF' : ''} · <a href="${esc(d.url)}" target="_blank" rel="noopener">Abrir</a></span>
      <label class="casilla"><input type="checkbox" data-doc-publico="${d.id}"${d.publico ? ' checked' : ''}><i></i>Mostrar en mi perfil</label></div>
      <button type="button" class="quitar" data-doc-quitar="${d.id}" aria-label="Quitar ${esc(d.nombre)}">×</button></div>`).join('') || '<p class="nota-suave">Aún no has subido documentos.</p>';
  const chipsEsp = () => [...new Set([...SUGERIDAS, ...esp])].map(x => `<button type="button" aria-pressed="${esp.includes(x)}">${esc(x)}</button>`).join('');

  // estado del perfil y lista de lo que falta antes de enviarlo a revisión
  function pintarPasos() {
    const v = $('#f-perfil') ? datos() : p; // lo que está escrito en pantalla, aunque aún no se guarde
    const pasos = [
      ['Foto de perfil', !!p.foto, false, 's-vista'],
      ['Resumen de 80 letras o más', v.resumen.trim().length >= 80, true, 's-sobre'],
      ['Especialidades', v.especialidades.length > 0, true, 's-esp'],
      ['Estudios', v.estudios.length > 0, true, 's-est'],
      ['N.º de registro en la Superintendencia', !!v.registroSis.trim(), true, 's-datos'],
      ['Diplomas o certificados', p.documentos.length > 0, false, 's-docs'],
      ['A quién atiendes', v.atiende.length > 0, false, 's-practico'],
      ['Horario de atención', tieneHorario, false, 'agenda']
    ];
    const listos = pasos.filter(x => x[1]).length, faltan = pasos.filter(x => x[2] && !x[1]).length;
    const caja = $('#pasos');
    caja.className = 'estado-perfil ' + p.estado;
    caja.innerHTML = `<span>${ESTADO[p.estado]}</span>${p.notaRevision ? `<span>Comentario de revisión: ${esc(p.notaRevision)}</span>` : ''}
      ${p.estado === 'publicado' ? '' : `<div class="progreso"><div class="progreso-cab"><b>Tu perfil está ${Math.round(listos / pasos.length * 100)}% completo</b><span>${listos} de ${pasos.length}</span></div>
        <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="${pasos.length}" aria-valuenow="${listos}"><i style-w="${listos / pasos.length}"></i></div>
        <ul class="pasos-lista">${pasos.map(([t, ok, oblig, ancla]) => `<li class="${ok ? 'ok' : ''}"><a href="#${ancla}">${ok ? '✓' : '○'} ${t}${oblig && !ok ? ' <em>obligatorio</em>' : ''}</a></li>`).join('')}</ul></div>`}
      <span class="fila-btn">${p.estado === 'publicado' ? `<a class="btn ghost" href="/psicologos/${esc(p.slug)}" target="_blank">Ver mi perfil público</a>` : `<a class="btn ghost" href="/psicologos/${esc(p.slug)}" target="_blank">Vista previa</a>${p.estado === 'pendiente' ? '' : `<button class="btn" type="button" id="enviar"${faltan ? ' disabled' : ''}>Enviar a revisión</button>`}`}</span>
      ${faltan && p.estado !== 'pendiente' && p.estado !== 'publicado' ? `<span class="nota-suave">Completa lo obligatorio para poder enviarlo.</span>` : ''}`;
    const i = caja.querySelector('[style-w]');
    if (i) i.style.width = (Number(i.getAttribute('style-w')) * 100) + '%';
  }

  function pintar(rol, nuevas) {
    esp = p.especialidades.slice();
    diseno = p.fondoDiseno || 'calma';
    color = p.color || 'menta';
    const panel = rol !== 'psicologo' ? '<a class="btn ghost" href="/equipo">Ir al panel de casos</a>' : '';
    $('#mp').innerHTML = `<header class="adm-top"><div><h1>Mi perfil profesional</h1><p class="sub">Lo que completes aquí es lo que verán los pacientes.</p></div>
        <div class="fila-btn">${panel}<button class="btn plain" type="button" id="mi-clave" aria-expanded="false">Cambiar mi clave</button><button class="btn plain" type="button" id="salir">Salir</button></div></header>
      <form class="caja" id="f-mi-clave" hidden>
        <h2 class="sec-t">Cambiar mi clave</h2>
        <div class="rejilla">
          <div class="campo-form"><label for="mc-actual">Clave actual</label><input id="mc-actual" type="password" autocomplete="current-password" required></div>
          <div class="campo-form"><label for="mc-nueva">Clave nueva (mínimo 10 caracteres)</label><input id="mc-nueva" type="password" autocomplete="new-password" minlength="10" required></div>
          <div class="campo-form"><label for="mc-repetir">Repite la clave nueva</label><input id="mc-repetir" type="password" autocomplete="new-password" minlength="10" required></div>
        </div>
        <div class="fila-btn"><button class="btn" type="submit">Guardar clave</button><button class="btn plain" type="button" id="mc-cancelar">Cancelar</button></div>
      </form>
      <div class="estado-perfil ${p.estado}" id="pasos"></div>
      <nav class="pestanas" aria-label="Secciones"><a href="#perfil" id="p-perfil">Mi perfil</a><a href="#agenda" id="p-agenda">Agenda y citas</a></nav>
      <div id="tab-perfil">
      <section class="caja" id="sec-sol"><h2 class="sec-t">Mensajes de pacientes${nuevas ? ` <span class="nivel urgente">${nuevas} nuevas</span>` : ''}</h2><div id="solicitudes" class="filas"><p class="nota-suave">Cargando…</p></div>
        ${soportaAvisos() ? '<button class="btn plain" type="button" id="avisos">Avisarme en este navegador cuando llegue una</button>' : ''}</section>
      <form class="caja" id="f-perfil">
        <h2 class="sec-t" id="s-vista">Cómo se ve tu perfil</h2>
        <div class="vista-ed acento ac-${esc(color)}" id="vista-ed">
          <div class="portada"><img id="portada-img" src="${esc(p.fondo)}" alt=""></div>
          <button type="button" class="btn-sobre" id="cambiar-fondo">Subir imagen de fondo</button>
          <div class="p-cab"><button type="button" class="foto-boton" id="cambiar-foto" aria-label="Cambiar foto"><span class="foto grande anillo" id="foto-prev">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : 'Foto'}</span><span class="lapiz" aria-hidden="true">✎</span></button>
            <div class="p-nombre"><b class="t-cuerpo">${esc(p.nombre)}</b><span class="lema" id="lema-prev"${p.lema ? '' : ' hidden'}>${esc(p.lema)}</span><span class="t-meta">Toca la foto o el fondo para cambiarlos</span></div></div>
        </div>
        <input id="m-foto" type="file" accept="image/*" class="sr" tabindex="-1"><input id="m-fondo" type="file" accept="image/*" class="sr" tabindex="-1">
        <div class="campo-form"><span class="rotulo">O elige uno de nuestros fondos</span>
          <div class="disenos" id="disenos">${DISENOS.map(([v, t]) => `<button type="button" data-diseno="${v}" aria-pressed="${!p.fondoPropio && diseno === v}" aria-label="Fondo ${t}"><img src="/img/fondos/${v}.svg" alt=""></button>`).join('')}</div>
          ${p.fondoPropio ? '<button class="btn plain" type="button" id="quitar-fondo">Quitar mi imagen de fondo</button>' : ''}${p.foto ? '<button class="btn plain" type="button" id="quitar-foto">Quitar mi foto</button>' : ''}</div>
        <div class="campo-form"><span class="rotulo">Color de tu perfil</span>
          <div class="colores" id="colores">${COLORES.map(([v, t]) => `<button type="button" data-color="${v}" aria-pressed="${color === v}"><i class="ac-${v}"></i>${t}</button>`).join('')}</div></div>
        <div class="campo-form"><label for="m-lema">Frase bajo tu nombre (opcional)</label><input id="m-lema" maxlength="90" value="${esc(p.lema)}" placeholder="Ej: Acompaño a adolescentes y familias en momentos difíciles"><small>Hasta 90 letras. Aparece en tu perfil y en tu tarjeta del directorio.</small></div>
        <h2 class="sec-t" id="s-datos">Datos básicos</h2>
        <div class="rejilla">
          <div class="campo-form"><label for="m-titulo">Título</label><input id="m-titulo" maxlength="12" value="${esc(p.titulo)}" placeholder="Ps."></div>
          <div class="campo-form"><label for="m-nombre">Nombre y apellido</label><input id="m-nombre" required maxlength="80" value="${esc(p.nombreSolo)}"></div>
          <div class="campo-form"><label for="m-sis">N.º registro Superintendencia de Salud</label><input id="m-sis" maxlength="20" value="${esc(p.registroSis)}"><small>Lo usamos para verificar tu título. <a href="https://rnpi.superdesalud.gob.cl/" target="_blank" rel="noopener">Buscar mi registro</a></small></div>
          <div class="campo-form"><label for="m-mod">Modalidad</label><select id="m-mod">${[['online', 'Online'], ['presencial', 'Presencial'], ['ambas', 'Online y presencial']].map(([v, t]) => `<option value="${v}"${p.modalidad === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="campo-form"><label for="m-comuna">Comuna (si atiendes presencial)</label><input id="m-comuna" maxlength="60" value="${esc(p.comuna)}"></div>
          <div class="campo-form"><label for="m-precio">Valor por sesión (CLP, opcional)</label><input id="m-precio" inputmode="numeric" maxlength="8" value="${p.precio == null ? '' : p.precio}" placeholder="35000"></div>
        </div>
        <h2 class="sec-t" id="s-sobre">Sobre mí</h2>
        <div class="campo-form"><label for="m-resumen">Resumen (lo primero que leen los pacientes)</label><textarea id="m-resumen" maxlength="1500" rows="5" placeholder="Quién eres, a quiénes atiendes y cómo puedes ayudar.">${esc(p.resumen)}</textarea></div>
        <div class="campo-form"><label for="m-enfoque">Cómo trabajo (enfoque, opcional)</label><textarea id="m-enfoque" maxlength="800" rows="3" placeholder="Ej: terapia cognitivo-conductual, sistémica…">${esc(p.enfoque)}</textarea></div>
        <h2 class="sec-t" id="s-esp">Especialidades</h2>
        <div class="esp-opc" id="esp">${chipsEsp()}</div>
        <div class="fila-btn"><label class="sr" for="m-otra">Otra especialidad</label><input id="m-otra" class="entrada" maxlength="40" placeholder="Agregar otra especialidad"><button class="btn ghost" type="button" id="agregar-esp">Agregar</button></div>
        <h2 class="sec-t" id="s-practico">A quién atiendes y cómo</h2>
        <p class="nota-suave">Ayuda a los pacientes a saber rápido si eres para ellos. Toca todas las que correspondan.</p>
        <div class="campo-form"><span class="rotulo">Atiendo a</span>${opciones('atiende', ATIENDE, p.atiende)}</div>
        <div class="campo-form"><span class="rotulo">Idiomas</span>${opciones('idiomas', IDIOMAS, p.idiomas)}</div>
        <div class="campo-form"><span class="rotulo">Pagos y reembolsos</span>${opciones('pagos', PAGOS, p.pagos)}</div>
        <div class="campo-form"><label for="m-primera">La primera sesión (opcional)</label><textarea id="m-primera" maxlength="300" rows="2" placeholder="Ej: La primera sesión es para conocernos y ver juntos qué necesitas. Si no te acomoda, no seguimos.">${esc(p.primeraSesion)}</textarea></div>
        <h2 class="sec-t" id="s-est">Estudios, diplomados y cursos</h2>
        <div class="filas" id="estudios">${(p.estudios.length ? p.estudios : [{ tipo: 'titulo' }]).map(filaEst).join('')}</div>
        <button class="btn plain" type="button" id="mas-est">+ Agregar estudio</button>
        <h2 class="sec-t" id="s-docs">Diplomas y certificados</h2>
        <p class="nota-suave">Sube tu título, diplomas o certificados (PDF o foto, hasta 4 MB). Nos sirven para verificar tu perfil; tú decides cuáles se muestran a los pacientes.</p>
        <div class="docs-ed" id="docs">${docsHtml(p.documentos)}</div>
        <div class="subir-doc">
          <div class="campo-form"><label for="d-tipo">Tipo</label><select id="d-tipo">${Object.entries(TIPO_DOC).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
          <div class="campo-form"><label for="d-nombre">¿Qué documento es?</label><input id="d-nombre" maxlength="120" placeholder="Ej: Diplomado en Intervención en Crisis, PUC"></div>
          <div class="fila-btn"><label class="btn ghost" for="d-archivo">Elegir archivo y subir</label><input id="d-archivo" type="file" accept="application/pdf,image/jpeg,image/png" class="sr"></div>
          <label class="casilla"><input type="checkbox" id="d-publico" checked><i></i>Mostrar en mi perfil</label>
        </div>
        <h2 class="sec-t" id="s-exp">Experiencia</h2>
        <div class="filas" id="experiencia">${(p.experiencia.length ? p.experiencia : [{}]).map(filaExp).join('')}</div>
        <button class="btn plain" type="button" id="mas-exp">+ Agregar experiencia</button>
        <h2 class="sec-t" id="s-link">LinkedIn (opcional)</h2>
        <div class="campo-form"><label for="m-linkedin">Enlace a tu perfil</label><input id="m-linkedin" maxlength="200" value="${esc(p.linkedin)}" placeholder="https://www.linkedin.com/in/…"></div>
        <div class="barra-guardar"><button class="btn" type="submit">Guardar cambios</button><span class="nota-suave" id="guardado"></span></div>
      </form></div>
      <div id="tab-agenda" hidden></div>`;
    cargarSolicitudes();
    pintarPasos();
    pestana();
  }

  const datos = () => ({
    titulo: $('#m-titulo').value, nombre: $('#m-nombre').value, registroSis: $('#m-sis').value, modalidad: $('#m-mod').value, comuna: $('#m-comuna').value,
    precio: $('#m-precio').value.replace(/\D/g, ''), fondoDiseno: diseno, color, lema: $('#m-lema').value,
    atiende: marcadas('atiende'), idiomas: marcadas('idiomas'), pagos: marcadas('pagos'), primeraSesion: $('#m-primera').value, resumen: $('#m-resumen').value, enfoque: $('#m-enfoque').value, especialidades: esp, linkedin: $('#m-linkedin').value,
    estudios: [...document.querySelectorAll('#estudios .fila-ed')].map(f => { const [t, a, b, c] = f.querySelectorAll('select,input'); return { tipo: t.value, titulo: a.value, institucion: b.value, anio: c.value }; }).filter(e => e.titulo || e.institucion),
    experiencia: [...document.querySelectorAll('#experiencia .fila-ed')].map(f => { const [a, b, c] = f.querySelectorAll('input'); return { cargo: a.value, lugar: b.value, periodo: c.value }; }).filter(e => e.cargo || e.lugar)
  });
  async function guardar(silencioso) {
    const d = await api('PUT', '/api/directorio/mio', datos());
    p = { ...d.perfil, documentos: p.documentos };
    pintarPasos();
    if (!silencioso) aviso(d.volvioARevision ? 'Guardado. Como cambiaste tu nombre o registro, el perfil vuelve a revisión.' : 'Cambios guardados.');
    $('#guardado').textContent = 'Guardado ' + fecha(new Date());
    if (d.volvioARevision) iniciar();
  }

  async function cargarSolicitudes() {
    try {
      const { solicitudes } = await api('GET', '/api/directorio/mio/solicitudes');
      $('#solicitudes').innerHTML = solicitudes.map(s => `<div class="solicitud${s.leida ? '' : ' nueva'}"><b>${esc(s.nombre)}</b><span class="t-meta">${esc(s.contacto)} · ${esc(fecha(s.creadaEn))}</span>${s.mensaje ? `<p>${esc(s.mensaje)}</p>` : ''}
        ${s.leida ? '' : `<button class="btn plain" type="button" data-leida="${s.id}">Marcar como vista</button>`}</div>`).join('')
        || `<p class="nota-suave">${p.estado === 'publicado' ? 'Aún no tienes mensajes.' : 'Cuando tu perfil esté publicado, aquí verás los mensajes de pacientes que te escriban sin reservar hora.'}</p>`;
    } catch (e) { $('#solicitudes').innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }

  const leer = archivo => new Promise((ok, mal) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = () => mal(new Error('No se pudo leer el archivo.')); l.readAsDataURL(archivo); });
  // las fotos de documentos se achican a 2000 px para que pesen poco y se lean bien
  function achicarDoc(src) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => { const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.88)); };
      img.onerror = () => mal(new Error('No se pudo leer esa imagen.'));
      img.src = src;
    });
  }
  async function recargarDocs() { const d = await api('GET', '/api/directorio/mio'); p.documentos = d.perfil.documentos; $('#docs').innerHTML = docsHtml(p.documentos); pintarPasos(); }

  $('#mp').addEventListener('click', async e => {
    const t = e.target;
    const op = t.closest('[data-grupo] button');
    if (op) { op.setAttribute('aria-pressed', String(op.getAttribute('aria-pressed') !== 'true')); return; }
    const co = t.closest('[data-color]');
    if (co) {
      color = co.dataset.color;
      document.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b === co)));
      $('#vista-ed').className = 'vista-ed acento ac-' + color;
      return;
    }
    if (t.closest('#esp button')) { const v = t.textContent; esp = esp.includes(v) ? esp.filter(x => x !== v) : [...esp, v]; t.setAttribute('aria-pressed', String(esp.includes(v))); return; }
    if (t.id === 'agregar-esp') { const v = $('#m-otra').value.trim(); if (v && !esp.includes(v)) { esp.push(v); $('#esp').innerHTML = chipsEsp(); } $('#m-otra').value = ''; return; }
    if (t.id === 'mas-est') return $('#estudios').insertAdjacentHTML('beforeend', filaEst({ tipo: 'diplomado' }));
    if (t.id === 'mas-exp') return $('#experiencia').insertAdjacentHTML('beforeend', filaExp());
    if (t.closest('#cambiar-foto')) return $('#m-foto').click();
    if (t.id === 'cambiar-fondo') return $('#m-fondo').click();
    const sw = t.closest('[data-diseno]');
    if (sw) {
      diseno = sw.dataset.diseno;
      document.querySelectorAll('[data-diseno]').forEach(b => b.setAttribute('aria-pressed', String(b === sw)));
      if (!p.fondoPropio) $('#portada-img').src = `/img/fondos/${diseno}.svg`;
      else aviso('Quita tu imagen de fondo para usar este diseño.');
      return;
    }
    if (t.classList.contains('quitar') && t.closest('.fila-ed')) return t.closest('.fila-ed').remove();
    try {
      if (t.id === 'salir') { await api('POST', '/api/equipo/salir', {}); return location.replace('/'); }
      if (t.id === 'mi-clave' || t.id === 'mc-cancelar') { const f = $('#f-mi-clave'); f.hidden = !f.hidden; $('#mi-clave').setAttribute('aria-expanded', String(!f.hidden)); if (!f.hidden) $('#mc-actual').focus(); return; }
      if (t.id === 'enviar') { t.disabled = true; await guardar(true); await api('POST', '/api/directorio/mio/enviar', {}); aviso('¡Enviado! Revisaremos tu perfil pronto.'); return iniciar(); }
      if (t.id === 'quitar-foto') { await guardar(true); await api('DELETE', '/api/directorio/mio/foto'); return iniciar(); }
      if (t.id === 'quitar-fondo') { await guardar(true); await api('DELETE', '/api/directorio/mio/fondo'); return iniciar(); }
      if (t.dataset.docQuitar) { await api('DELETE', '/api/directorio/mio/documentos/' + t.dataset.docQuitar); return recargarDocs(); }
      if (t.id === 'avisos') { await activarAvisos('/api/equipo/push'); t.remove(); return aviso('Listo: te avisaremos en este navegador.'); }
      if (t.dataset.leida) { await api('POST', `/api/directorio/mio/solicitudes/${t.dataset.leida}/leida`, {}); return cargarSolicitudes(); }
    } catch (x) { aviso(x.message); if (t.id === 'enviar') t.disabled = false; }
  });
  $('#mp').addEventListener('change', async e => {
    const t = e.target;
    try {
      if (t.dataset.docPublico) { await api('PATCH', '/api/directorio/mio/documentos/' + t.dataset.docPublico, { publico: t.checked }); return aviso(t.checked ? 'Se mostrará en tu perfil.' : 'Queda solo para la revisión.'); }
      const f = t.files && t.files[0];
      if (!f) return;
      t.value = '';
      if (t.id === 'm-foto' || t.id === 'm-fondo') {
        const foto = t.id === 'm-foto';
        const imagen = await window.Recorte(await leer(f), foto ? { ancho: 600, alto: 600, redondo: true, titulo: 'Ajusta tu foto' } : { ancho: 1500, alto: 500, titulo: 'Ajusta tu fondo' });
        if (!imagen) return;
        await api('POST', '/api/directorio/mio/' + (foto ? 'foto' : 'fondo'), { imagen });
        if (foto) { $('#foto-prev').innerHTML = `<img src="${imagen}" alt="">`; p.foto = imagen; pintarPasos(); } else { $('#portada-img').src = imagen; p.fondoPropio = true; }
        return aviso(foto ? 'Foto guardada.' : 'Fondo guardado.');
      }
      if (t.id === 'd-archivo') {
        const nombre = $('#d-nombre').value.trim();
        if (!nombre) { $('#d-nombre').focus(); return aviso('Primero escribe qué documento es.'); }
        if (f.size > 12e6) return aviso('El archivo es demasiado grande.');
        const pdf = f.type === 'application/pdf';
        if (pdf && f.size > 4.4e6) return aviso('El PDF pesa más de 4 MB. Prueba sacándole una foto o con un PDF más liviano.');
        aviso('Subiendo…');
        const archivo = pdf ? await leer(f) : await achicarDoc(await leer(f));
        await api('POST', '/api/directorio/mio/documentos', { tipo: $('#d-tipo').value, nombre, archivo, publico: $('#d-publico').checked });
        $('#d-nombre').value = '';
        await recargarDocs();
        return aviso('Documento subido.');
      }
    } catch (x) { aviso(x.message); }
  });
  $('#mp').addEventListener('submit', async e => {
    if (e.target.id === 'f-mi-clave') {
      e.preventDefault();
      const b = e.submitter, nueva = $('#mc-nueva').value;
      if (nueva !== $('#mc-repetir').value) return aviso('Las dos claves nuevas no coinciden.');
      if (b) b.disabled = true;
      try { await api('POST', '/api/equipo/clave', { actual: $('#mc-actual').value, nueva }); e.target.reset(); e.target.hidden = true; $('#mi-clave').setAttribute('aria-expanded', 'false'); aviso('Tu clave quedó cambiada.'); }
      catch (x) { aviso(x.message); } finally { if (b) b.disabled = false; }
      return;
    }
    if (e.target.id !== 'f-perfil') return;
    e.preventDefault();
    const b = e.submitter; if (b) b.disabled = true;
    try { await guardar(false); } catch (x) { aviso(x.message); } finally { if (b) b.disabled = false; }
  });

  // pestañas: #perfil (por defecto) y #agenda
  function pestana() {
    const ag = location.hash === '#agenda';
    if (!$('#tab-agenda')) return;
    $('#tab-perfil').hidden = ag; $('#tab-agenda').hidden = !ag;
    $('#p-perfil').setAttribute('aria-current', String(!ag)); $('#p-agenda').setAttribute('aria-current', String(ag));
    if (ag) window.MiAgenda.cargar($('#tab-agenda'), aviso);
  }
  window.addEventListener('hashchange', pestana);
  // el avance se actualiza mientras escribe
  let espera = null;
  const refrescarPasos = () => { clearTimeout(espera); espera = setTimeout(() => { if (p && $('#pasos') && $('#f-perfil')) pintarPasos(); }, 250); };
  $('#mp').addEventListener('input', e => {
    if (e.target.id === 'm-lema') { const l = $('#lema-prev'); l.textContent = e.target.value; l.hidden = !e.target.value.trim(); }
    if (e.target.closest('#f-perfil')) refrescarPasos();
  });
  $('#mp').addEventListener('click', e => { if (e.target.closest('#f-perfil')) refrescarPasos(); });
  window.addEventListener('horario', e => { tieneHorario = e.detail; if (p && $('#pasos')) pintarPasos(); });

  async function iniciar() {
    try { const d = await api('GET', '/api/directorio/mio'); p = d.perfil; tieneHorario = d.tieneHorario; pintar(d.rol, d.solicitudesNuevas); }
    catch (e) {
      if (e.estado === 401) return location.replace('/registro');
      if (e.datos && e.datos.cambiarClave) return location.replace('/ingresar#perfil');
      $('#mp').innerHTML = `<p class="error">${esc(e.message)}</p>`;
    }
  }
  iniciar();
})();
