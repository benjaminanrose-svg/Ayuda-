'use strict';
/* Registro de psicólogos para el directorio. */
(() => {
  const { $, api } = window.RA;
  const err = t => { $('#r-error').textContent = t || ''; $('#r-error').hidden = !t; };
  $('#f-registro').addEventListener('submit', async e => {
    e.preventDefault();
    err();
    if ($('#r-clave').value !== $('#r-repetir').value) return err('Las dos claves no coinciden.');
    const b = e.submitter; if (b) b.disabled = true;
    try {
      await api('POST', '/api/directorio/registro', { titulo: $('#r-titulo').value, nombre: $('#r-nombre').value, correo: $('#r-correo').value, clave: $('#r-clave').value });
      location.replace('/mi-perfil');
    } catch (x) { err(x.message); if (b) b.disabled = false; }
  });
})();
