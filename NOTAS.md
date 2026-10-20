# NOTAS · Red Acompaña

Leer esto primero. Ir directo al archivo y línea indicados.

## Mapa de archivos
- `package.json` — dependencias y comandos: `start`, `test`, `build:demo`.
- `railway.json` — Railway: arranque `npm start`, salud en `/salud`.
- `.node-version` — Node 22.
- `src/server.js` — servidor web. L3 zona horaria Chile · L11 `/salud` · L12 `/` → demo · L13 archivos públicos · L17 puerto.
- `public/demo/index.html` — demo generada. No editar a mano: `npm run build:demo`.
- `demo/index.src.html` — fuente de la demo (diseño ficha de derivación) · `demo/build.js` la arma con el motor.
- `motor/engine.js` — motor de reglas, sin IA generativa (2459 líneas).
  - L823 `create(saved)`: restaura el estado guardado · L828 `S.pros` (especialistas disponibles) · L834 `exportState()`.
  - L842 `event(name, o)`: planB, accepted, refer, tomorrow, closed (con `o` = producción, sin `o` = demo).
  - L2379 `finish()`: aviso honesto cuando no hay especialistas.
  - L2419 `SINPRO` y L2421 `HONEST`: textos honestos sin especialistas.
  - L2457 `API` (incluye `PROMESA`, detector de promesas falsas para pruebas).
- `motor/dict.json` — diccionario de faltas de ortografía.
- `motor/cases.js` — 303 frases de prueba y 13 conversaciones de la demo.
- `motor/scenarios.js` — 219 conversaciones guiadas.
- Pruebas: `motor/run.js` (frases), `motor/sim.js` (conversaciones), `motor/fuzz.js`, `motor/prueba-servidor.js` (estado y honestidad).

## Reglas
- Nunca subir claves ni secretos: van en las variables de Railway.
- Sin nombre del modelo en commits, PR ni código.

## Bitácora
- 2026-10-20 · Motor adaptado para servidor: estado guardado, modo honesto, eventos con opciones · `motor/engine.js` L823–L870, L2379, L2419–L2452.
- 2026-10-20 · Primera versión desplegable (servidor + demo) · `src/server.js`, `railway.json`, `package.json` · commit 117eaa8.
- 2026-10-20 · Creado NOTAS.md.
