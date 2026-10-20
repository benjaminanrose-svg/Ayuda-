'use strict';
/* Configuración desde variables de entorno (en Railway: pestaña Variables). Nunca escribir claves aquí. */
const env = process.env;
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const dominio = env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + env.RAILWAY_PUBLIC_DOMAIN : null;

module.exports = {
  puerto: num(env.PORT, 3000),
  produccion: env.NODE_ENV === 'production' || !!env.RAILWAY_PROJECT_ID,
  baseDatos: env.DATABASE_URL || '',
  claveDatos: env.CLAVE_DATOS || '',
  urlApp: (env.URL_APP || dominio || `http://localhost:${num(env.PORT, 3000)}`).replace(/\/$/, ''),
  adminCorreo: (env.ADMIN_CORREO || '').trim().toLowerCase(),
  adminClave: env.ADMIN_CLAVE || '',
  // segundos sin que nadie tome el caso antes de avisar a guardia (0 = no escalar)
  escalar: { high: num(env.ESCALAR_ALTO_SEG, 30), mid: num(env.ESCALAR_MEDIO_SEG, 180), low: num(env.ESCALAR_BAJO_SEG, 0) },
  sinRespuestaSeg: num(env.SIN_RESPUESTA_SEG, 120),
  retencionDias: num(env.RETENCION_DIAS, 0),
  orgPorDefecto: env.ORG_POR_DEFECTO || 'general',
  // salas de videollamada (Jitsi). Se puede cambiar por un servidor Jitsi propio.
  videoBase: (env.VIDEO_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '')
};
