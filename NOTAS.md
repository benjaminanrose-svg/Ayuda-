# NOTAS · Red Acompaña

Leer esto primero. Ir directo al archivo y la línea indicados, sin buscar.

## Cómo está armado
- **Servidor** Node + Express 5 + Postgres. Tiempo real por SSE (`/api/.../stream`). Avisos push (Web Push).
- **Motor** de reglas (sin IA generativa) corre en el servidor; su estado por conversación se guarda cifrado.
- **Páginas**: `/` chat de la persona · `/o/:slug` chat por organización · `/ingresar` · `/equipo` panel (y `#admin`) · `/privacidad` · `/demo/`.

## Mapa de archivos (líneas clave)
- `package.json` — comandos: `start`, `local` (con Postgres incluido), `test`, `build:demo`.
- `railway.json` — arranque `npm start`, salud `/salud`. `.node-version` — Node 22.
- `migraciones/001_inicial.sql` — tablas: organizaciones, usuarios, sesiones, conversaciones, casos, mensajes, suscripciones, auditoria, ajustes.
- `src/server.js` — L12 modo configuración (faltan variables) · L24 arranque (migra, avisos, admin inicial) · L40 trabajos cada 5 s.
- `src/config.js` — todas las variables de entorno y sus valores por defecto.
- `src/app.js` — L13 rutas y páginas · L23 `/api` (JSON + mismo origen) · manejo de errores al final.
- `src/http.js` — cookies, `falla()`, límites de uso, `mismoOrigen` (CSRF), cabeceras de seguridad y CSP.
- `src/cifrado.js` — cifrado AES-256-GCM de textos, claves scrypt, fichas de sesión, clave temporal.
- `src/sesion.js` — L21 ingresar · L36 `usuarioDeSesion` · L45 middleware `sesion` · L63 cambiar clave · L77 admin inicial.
- `src/servicio.js` (lógica central) — L21 líneas de ayuda · L29 texto de fecha · L86 `resumenCaso` (ficha) · L108 `estadoPersona` · L137 `nuevaConversacion` · L149 historia · L163 `mensajePersona` · L225 lista · L233 detalle · L246 `tomar` · L261 `agendar` · L282 `derivar` · L298 `cerrar` · L312 mensaje del especialista · L337 `escalar` (a guardia) · L355 `sinRespuesta` · L373 recordatorios · L383 limpieza.
- `src/rutas-persona.js` — L26 `/inicio` · L36 `/mensajes` · L53 `/stream` · L59 `/push` · L66 `/olvidar`.
- `src/rutas-equipo.js` — L18 ingresar · L23 estado · L30 yo · L31 clave · L34 disponible · L40–L46 casos y acciones · L48 stream · L49 push.
- `src/rutas-admin.js` — L21/L25/L39 usuarios · L58 nueva clave · L67/L72/L82 organizaciones · L91 métricas.
- `src/tiempo-real.js` — conexiones SSE en memoria (una sola instancia). `src/avisos.js` — Web Push y llaves VAPID.
- `public/index.html` + `public/js/persona.js` + `public/css/persona.css` — chat. persona.js: L40 ritmo de mensajes · L82 estado/pasos · L95 líneas de ayuda · L110 tiempo real · L125 enviar · L152 inicio.
- `public/equipo.html` + `public/js/equipo.js` + `public/css/equipo.css` — panel. equipo.js: L51 lista · L75 ficha · L127 abrir caso · L155 actualizar en vivo · L192 tiempo real · L287 administración · L366 inicio.
- `public/ingresar.html` + `public/js/ingresar.js` — ingreso y cambio de clave. `public/privacidad.html` — borrador legal.
- `public/css/base.css` — sistema visual compartido. `public/css/fuentes.css` + `public/fuentes/` — fuentes propias (licencia OFL).
- `public/sw.js` — avisos del navegador. `public/js/comun.js` — llamadas a la API y activar avisos.
- `motor/engine.js` — L823 `create(saved)` · L828 `S.pros` · L834 `exportState()` · L842 `event(name, o)` · `finish()` aviso honesto · `SINPRO`/`HONEST` · `API` (incluye `PROMESA`).
- `motor/` pruebas: `run.js` (303 frases), `sim.js` (conversaciones), `fuzz.js`, `prueba-servidor.js` (estado y honestidad).
- `test/api.test.js` — 7 pruebas de la API con Postgres real · `test/e2e.js` — navegador (requiere Playwright).
- `scripts/local.js` — correr en tu computador. `demo/` — fuente de la demo (`npm run build:demo` → `public/demo/`).
- `docs/DESIGN.md` (sistema visual) · `docs/PRODUCT.md` (producto). `README.md` — guía de Railway.

## Reglas
- Nunca subir claves ni secretos: van en las variables de Railway.
- Sin nombre del modelo en commits, PR ni código.

## Bitácora
- 2026-10-20 · Motor adaptado para servidor: estado guardado, modo honesto, eventos con opciones · `motor/engine.js` L823–L880, `finish()`, `HONEST`.
- 2026-10-20 · Primera versión desplegable (servidor + demo) · commit 117eaa8.
- 2026-10-20 · Creado NOTAS.md.
- 2026-10-20 · Producto completo: servidor con Postgres, cifrado, sesiones, casos, guardia, agenda, avisos push · `src/*`, `migraciones/001_inicial.sql`.
- 2026-10-20 · Chat de la persona, panel del especialista, administración, ingreso, privacidad · `public/*`.
- 2026-10-20 · Pruebas: API (7/7 con Postgres real) y navegador sin errores · `test/api.test.js`, `test/e2e.js`.
- 2026-10-20 · Guía de despliegue en Railway · `README.md`.
- 2026-10-20 · Chat: si el servidor se reinicia (502/503/504) avisa claro y reintenta una vez · `public/js/comun.js` (api), `public/js/persona.js` (enviar).
