'use strict';
/* Ingreso al panel y cambio obligatorio de la clave temporal. */
(() => {
  const { $, api } = window.RA;
  let claveTemporal = '';
  const error = (sel, t) => { const e = $(sel); e.textContent = t || ''; e.hidden = !t; };
  const destino = rol => (rol === 'psicologo' || location.hash === '#perfil' ? '/mi-perfil' : '/equipo' + (/^#caso-\d+$|^#admin$/.test(location.hash) ? location.hash : ''));
  let rol = '';
  function pedirCambio(conActual) {
    $('#f-ingreso').hidden = true;
    $('#f-clave').hidden = false;
    $('#campo-actual').hidden = !conActual;
    (conActual ? $('#actual') : $('#nueva')).focus();
  }

  (async () => {
    try {
      const d = await api('GET', '/api/equipo/estado');
      if (d.sesion && d.debeCambiarClave) pedirCambio(true);
      else if (d.sesion) {
        // ya hay una sesión abierta: ofrecer seguir o entrar con otra cuenta (por ejemplo, la de administración)
        rol = d.rol;
        const f = $('#f-ingreso'), aviso = document.createElement('div');
        aviso.className = 'sesion-abierta';
        aviso.innerHTML = '<p>Ya ingresaste como <b></b>.</p><div class="fila-btn"><button class="btn" type="button" id="seguir">Continuar</button><button class="btn plain" type="button" id="otra">Ingresar con otra cuenta</button></div>';
        aviso.querySelector('b').textContent = d.correo;
        f.prepend(aviso);
        const ocultos = [...f.querySelectorAll('.campo-form, button[type=submit]')];
        ocultos.forEach(x => { x.hidden = true; });
        $('#seguir').onclick = () => location.replace(destino(rol));
        $('#otra').onclick = async () => { try { await api('POST', '/api/equipo/salir', {}); } catch { /* sin sesión */ } aviso.remove(); ocultos.forEach(x => { x.hidden = false; }); rol = ''; $('#correo').focus(); };
      }
      else $('#correo').focus();
    } catch { $('#correo').focus(); }
  })();

  $('#f-ingreso').addEventListener('submit', async e => {
    e.preventDefault();
    error('#err-ingreso');
    const b = e.submitter;
    if (b) b.disabled = true;
    try {
      const d = await api('POST', '/api/equipo/ingresar', { correo: $('#correo').value, clave: $('#clave').value });
      rol = d.usuario.rol;
      if (d.usuario.debeCambiarClave) { claveTemporal = $('#clave').value; pedirCambio(false); } else location.replace(destino(rol));
    } catch (x) { error('#err-ingreso', x.message); } finally { if (b) b.disabled = false; }
  });

  $('#f-clave').addEventListener('submit', async e => {
    e.preventDefault();
    error('#err-clave');
    const nueva = $('#nueva').value;
    if (nueva.length < 10) return error('#err-clave', 'La clave debe tener al menos 10 caracteres.');
    if (nueva !== $('#repetir').value) return error('#err-clave', 'Las dos claves no coinciden.');
    try {
      await api('POST', '/api/equipo/clave', { actual: claveTemporal || $('#actual').value, nueva });
      location.replace(destino(rol));
    } catch (x) { error('#err-clave', x.message); }
  });
})();
