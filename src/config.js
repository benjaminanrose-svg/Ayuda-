'use strict';
/* Configuración desde variables de entorno. Solo DATABASE_URL es obligatoria; el resto tiene valores seguros por defecto. */
process.env.TZ = process.env.TZ || 'America/Santiago';

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(+v) ? +v : d);
const publico = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : '');

const config = {
  prod: process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT,
  puerto: num(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  pgSsl: process.env.PGSSL === 'true',
  appUrl: publico.replace(/\/$/, ''),
  dataKey: process.env.DATA_KEY || '',
  vapid: {
    publica: process.env.VAPID_PUBLIC_KEY || '',
    privada: process.env.VAPID_PRIVATE_KEY || '',
    contacto: process.env.VAPID_SUBJECT || 'mailto:contacto@redacompana.cl'
  },
  // segundos sin que nadie tome el caso antes de avisar a la guardia, por nivel de riesgo
  escalar: {
    high: num(process.env.ESCALAR_ALTO_SEG, 30),
    mid: num(process.env.ESCALAR_MEDIO_SEG, 180),
    low: num(process.env.ESCALAR_BAJO_SEG, 600)
  },
  // segundos que un mensaje urgente puede quedar sin respuesta del especialista antes de alertar a la guardia
  sinRespuestaSeg: num(process.env.SIN_RESPUESTA_SEG, 120),
  retencionDias: num(process.env.RETENCION_DIAS, 0),
  orgPorDefecto: process.env.ORG_POR_DEFECTO || 'general',
  sesionHoras: num(process.env.SESION_HORAS, 12),
  admin: {
    email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    clave: process.env.ADMIN_PASSWORD || '',
    nombre: process.env.ADMIN_NOMBRE || 'Administración'
  }
};

module.exports = config;
