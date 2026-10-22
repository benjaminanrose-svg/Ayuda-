# NOTAS · ConténMente (bot: Nexo)

Antes se llamaba «Red Acompaña» (bot «Acompaña»). Marca nueva desde 2026-10-20: logo cerebro + corazón + manos; colores menta #8CC8BC, lavanda #B8A2DA, azul pizarra #30486C, azul mano #486C90, chispa amarilla #F0C090.

Leer esto primero. Ir directo al archivo y la línea indicados, sin buscar.

## Cómo está armado
- **Servidor** Node + Express 5 + Postgres. Tiempo real por SSE (`/api/.../stream`). Avisos push (Web Push).
- **Motor** de reglas (sin IA generativa) corre en el servidor; su estado por conversación se guarda cifrado.
- **Páginas**: `/` chat de la persona · `/o/:slug` chat por organización · `/ingresar` · `/equipo` panel (y `#admin`) · `/privacidad` · `/demo/`.

## Mapa de archivos (líneas clave)
- `package.json` — comandos: `start`, `local` (con Postgres incluido), `test`, `build:demo`.
- Producción: https://departamentobienestar.up.railway.app (Railway, proyecto «sweet-trust», servicio «Ayuda-», rama `main`). Repo: github.com/benjaminanrose-svg/Ayuda-. Remoto: `https://github.com/benjaminanrose-svg/Ayuda-` (la dirección antigua `ayuda-` también funciona: GitHub redirige). Tras el incidente de Railway del 21-oct hay que reconectar GitHub en Railway (Account Settings) para que vuelva el auto deploy. Si un push no se publica: en Railway, Ctrl+K → «Deploy latest commit» («Redeploy» repite la versión vieja).
- `railway.json` — arranque `npm start`, salud `/salud`. `.node-version` — Node 22.
- `migraciones/001_inicial.sql` — tablas: organizaciones, usuarios, sesiones, conversaciones, casos, mensajes, suscripciones, auditoria, ajustes · `002_marca.sql` renombra la organización por defecto a ConténMente.
- `src/server.js` — L12 modo configuración (faltan variables) · L24 arranque (migra, avisos, admin inicial) · L40 trabajos cada 5 s.
- `src/config.js` — todas las variables de entorno y sus valores por defecto · L21 `videoBase` (salas Jitsi; variable opcional `VIDEO_BASE_URL`).
- `src/app.js` — L13 rutas y páginas · L23 `/api` (JSON + mismo origen) · manejo de errores al final.
- `src/http.js` — cookies, `falla()`, límites de uso, `mismoOrigen` (CSRF), cabeceras de seguridad y CSP.
- `src/cifrado.js` — cifrado AES-256-GCM de textos, claves scrypt, fichas de sesión, clave temporal.
- `src/sesion.js` — L21 ingresar · L36 `usuarioDeSesion` · L45 middleware `sesion` · L63 cambiar clave · L77 admin inicial.
- `src/servicio.js` (lógica central) — L21 líneas de ayuda · L29 texto de fecha · L86 `resumenCaso` (ficha) · L108 `estadoPersona` · L137 `nuevaConversacion` · L149 historia · L163 `mensajePersona` · L225 lista · L233 detalle · L246 `tomar` · L261 `agendar` · L282 `derivar` · L298 `cerrar` · L312 mensaje del especialista · L337 `videollamada` · L340 `escalar` (a guardia) · L358 `sinRespuesta` · L376 recordatorios · L386 limpieza.
- `src/rutas-persona.js` — L26 `/inicio` · L36 `/mensajes` · L53 `/stream` · L59 `/push` · L66 `/olvidar`.
- `src/rutas-equipo.js` — L18 ingresar · L23 estado · L30 yo · L31 clave · L34 disponible · L40–L46 casos y acciones · L48 videollamada · L50 stream · L51 push.
- `src/rutas-admin.js` — L21/L25/L39 usuarios · L58 nueva clave · L67/L72/L82 organizaciones · L91 métricas.
- `src/tiempo-real.js` — conexiones SSE en memoria (una sola instancia). `src/avisos.js` — Web Push y llaves VAPID.
- `public/index.html` + `public/js/persona.js` + `public/css/persona.css` — chat. persona.js: L9 `ultimo` (id más alto recibido: al reconectar no repite la bienvenida) · L19 `nodo` (dibuja cada mensaje; nombre del bot «Nexo»; tarjeta de videollamada) · L132 `sincronizar` · L50 ritmo de mensajes · L92 estado/pasos · L105 líneas de ayuda · L120 tiempo real · L135 enviar · L168 inicio.
- `public/equipo.html` + `public/js/equipo.js` + `public/css/equipo.css` — panel. equipo.js: L20 `lapso`/L29 `tiempo` (espera en palabras) · L37 `deQue` (de qué se trata el caso) · L72 tarjeta de la lista · L80 lista · L98 ficha del caso · L135 conversación · L146 abrir caso (en el teléfono oculta la lista) · L176 actualizar en vivo · L213 tiempo real · L231 botones de acción · L293 menú del encabezado y «Volver a la lista» · L307 fila de usuario · L326 editar nombre/título · L337 administración (4 cifras, formularios plegados) · L419 rutas · L430 inicio. equipo.css: al final, vista de teléfono (menú, tarjetas).
- `public/ingresar.html` + `public/js/ingresar.js` — ingreso y cambio de clave. `public/privacidad.html` — borrador legal.
- `public/css/base.css` — sistema visual compartido; L1–L14 colores de la marca (tokens). `public/img/` — logo (`logo-64/128/256.png`), favicon (`favicon-32.png`), íconos (`icono-180/192/512.png`), insignia de avisos (`insignia.png`). `public/css/fuentes.css` + `public/fuentes/` — fuentes propias (licencia OFL).
- `public/sw.js` — avisos del navegador. `public/js/comun.js` — llamadas a la API y activar avisos.
- `motor/engine.js` — L186 `L` léxico (EMERGENCIA, IDEACION…) · L76 `BRAND_W` (nombres de marca sin corregir) · L567 `analyze` · L679 `R` textos (L680 saludo de Nexo) · L846 `REFLECT_P` (reflejos específicos) · L933 `GROUND_EX` (ejemplos 5-4-3-2-1) · L955 `create(saved)` · L966 `exportState()` · L976 `event(name, o)` · L1313 reinterpretaciones · L1390 ejercicio 5-4-3-2-1 (lee el contenido antes de avanzar) · L1467 `handleAnswer` · L1727 `crisisNext` · L1785 `act` · L2985 `fallback` · L3062 `finish()` aviso honesto · `SINPRO`/`HONEST` · `API` (incluye `PROMESA`).
- `motor/` pruebas: `run.js` (313 frases de `cases.js`), `sim.js` (conversaciones; `SC=scenarios3.js node sim.js`, `PROS=0` sin especialistas), `scenarios.js`…`scenarios4.js` (≈150 conversaciones reales), `fuzz.js`, `prueba-servidor.js` (estado y honestidad).
- `test/api.test.js` — 7 pruebas (la 4 incluye videollamada y editar nombre) de la API con Postgres real · `test/e2e.js` — navegador (requiere Playwright).
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
- 2026-10-20 · Railway: auto deploy activado (rama main); cada push a GitHub se publica solo.
- 2026-10-20 · Botón «Videollamada»: crea sala privada (Jitsi) y envía el enlace a la persona · `src/servicio.js` L337, `src/rutas-equipo.js` L48, `public/js/equipo.js` L229, `public/js/persona.js` L25, `public/css/persona.css` (.msg.video).
- 2026-10-20 · Administración: editar título, nombre y especialidad de cada usuario · `public/js/equipo.js` L300 y envío del formulario (`data-editar`).
- 2026-10-20 · Bot pulido con ~90 conversaciones nuevas: detecta sobredosis, «no es broma», «esta noche me mato», metro/puente, despedidas en redes; menos falsas alarmas; reflejos específicos; respuestas cortas y «no sé» repetido · `motor/engine.js` (L1313 reinterpretaciones, L846 `REFLECT_P`, L1467 `handleAnswer`), `motor/cases.js`, `motor/scenarios3.js`, `motor/scenarios4.js`.
- 2026-10-20 · Arreglo: al volver tras mucho rato la conversación ya no se reinicia ni repite la bienvenida · `public/js/persona.js` L9 `ultimo`, `sincronizar`.
- 2026-10-20 · Ejercicio 5-4-3-2-1 (aviso de Feña): solo avanza cuando la persona nombra cosas; si pregunta, explica con ejemplos; si escribe cómo se siente, lo acoge · `motor/engine.js` L1390, L933.
- 2026-10-20 · Nueva marca: ConténMente (plataforma) y Nexo (bot); logo, favicon, íconos y colores · `public/css/base.css` L1–L14, `public/*.html`, `public/img/`, `public/js/persona.js`, `public/js/equipo.js`, `src/servicio.js` (avisos y sala `ContenMente-`), `src/server.js`, `public/sw.js`, `motor/engine.js` (saludo, FAQ), `migraciones/002_marca.sql`, `demo/index.src.html`.
- 2026-10-20 · Railway no tomó solo el push 82a8c2f; publicado con «Deploy latest commit». Remoto git actualizado a la dirección nueva del repo · `NOTAS.md` (Producción).
- 2026-10-21 · Panel más simple: tarjetas con gravedad en color, de qué se trata y espera en palabras; ficha sin casillas/firma/copia; menú en el teléfono; lista y caso por separado en el teléfono; Administración con 4 cifras, formularios plegados y tarjetas · `public/js/equipo.js` (L20–L135, L293, L307–L419), `public/css/equipo.css`, `public/equipo.html` (menú), `test/e2e.js` (capturas de teléfono).
- 2026-10-22 · Los push no se publicaban por la caída y el incidente de seguridad de Railway (21-oct: despliegues en pausa y tokens de GitHub reiniciados), no por la dirección del repo. Pendiente: reconectar GitHub en Railway y cambiar claves (CLAVE_DATOS y contraseña de Postgres) · `NOTAS.md` (Producción).
