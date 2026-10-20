# ConténMente

Acompañamiento y derivación en salud mental. Nexo, un bot por reglas (sin IA generativa) conversa con la persona, detecta señales de riesgo y la conecta con especialistas de la red, que la atienden en el momento, le dan hora o derivan a guardia.

- **Chat de la persona:** `/` (o `/o/nombre-organizacion` para cada colegio, empresa o municipio).
- **Panel del especialista:** `/equipo` (ingreso en `/ingresar`).
- **Demo de presentación:** `/demo/`.

## Subirlo a Railway (paso a paso)

1. **Base de datos.** En tu proyecto de Railway: **New → Database → Add PostgreSQL**.
2. **Variables.** Abre el servicio de la app (el que está conectado a este repositorio) → pestaña **Variables** → agrega:

   | Variable | Qué poner |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway lo completa solo) |
   | `CLAVE_DATOS` | Una frase secreta larga, de 32 caracteres o más. Cifra las conversaciones: **guárdala y no la cambies nunca**. |
   | `ADMIN_CORREO` | Tu correo, para la primera cuenta de administración. |
   | `ADMIN_CLAVE` | Una clave temporal de 10 caracteres o más. Te pedirá cambiarla al entrar. |

3. **Dominio.** En el servicio: **Settings → Networking → Generate Domain**.
4. **Desplegar.** Railway despliega solo con cada cambio en el repositorio. Para revisar, abre `https://TU-DOMINIO/salud`: debe decir `{"ok":true}`. Si falta una variable, la página principal te dice cuál.
5. **Primer ingreso.** Entra a `https://TU-DOMINIO/ingresar` con `ADMIN_CORREO` y `ADMIN_CLAVE`, crea tu clave nueva y, si quieres, borra `ADMIN_CLAVE` de Railway.
6. **Equipo.** En **Administración** agrega a cada especialista. El sistema muestra una clave temporal; entrégasela en persona. Cada especialista entra, crea su clave, marca **Disponible** y toca **Activar avisos**.
7. **Organizaciones.** En **Administración → Organizaciones** crea una por cliente. Cada una recibe su propio enlace para sus personas.

### Variables opcionales

| Variable | Por defecto | Para qué |
|---|---|---|
| `ESCALAR_ALTO_SEG` | 30 | Segundos antes de avisar a guardia si nadie toma un caso de riesgo alto. |
| `ESCALAR_MEDIO_SEG` | 180 | Lo mismo para riesgo medio. |
| `ESCALAR_BAJO_SEG` | 0 | Lo mismo para riesgo bajo (0 = no se avisa a guardia). |
| `SIN_RESPUESTA_SEG` | 120 | Aviso a guardia si un mensaje urgente queda sin respuesta del especialista. |
| `RETENCION_DIAS` | 0 | Borrar conversaciones sin actividad después de N días (0 = no borrar). Definir con asesoría legal. |
| `ORG_POR_DEFECTO` | general | Organización del chat en `/`. |
| `URL_APP` | dominio de Railway | Dirección pública, si usas un dominio propio. |

## Cómo funciona

- La persona escribe sin dar datos personales. Una cookie identifica su conversación en ese dispositivo.
- Si el motor detecta riesgo o la persona pide ayuda, se crea una **ficha de derivación** (con folio) y se avisa a los especialistas **Disponibles**: en el panel, con sonido, y con aviso del navegador aunque tengan el panel cerrado.
- Si no hay nadie disponible, el bot **lo dice con honestidad** y entrega líneas de ayuda. Nunca promete un especialista que no existe.
- El primer especialista que toma el caso queda a cargo (nadie más puede tomarlo). Puede conversar, agendar una hora, derivar a guardia o cerrar.
- Si nadie toma un caso urgente a tiempo, se avisa al equipo de **guardia**. Si un mensaje urgente queda sin respuesta, también.
- Seguridad: mensajes y estado del bot cifrados en la base (AES-256-GCM), claves con scrypt, sesiones en cookies httpOnly, protección CSRF, límites de uso, CSP estricta y auditoría de acciones.

## Antes de usarlo con personas reales

- [ ] Tu socia (profesional de salud mental) valida todos los textos del bot (`motor/engine.js`).
- [ ] Hay turnos de guardia definidos, para que siempre haya alguien disponible.
- [ ] Un abogado revisa y completa el aviso de privacidad (`public/privacidad.html`) y define cuánto tiempo se guardan los datos.
- [ ] Se activan los respaldos automáticos de la base de datos en Railway.
- [ ] Se prueba el flujo completo en teléfonos reales (Android e iPhone). En iPhone, los avisos del navegador funcionan solo si la persona agrega la página a la pantalla de inicio.

## Para desarrolladores

```bash
npm install
npm run local     # http://localhost:3000 con un Postgres incluido (admin@local / clave-local-admin)
npm test          # motor (303 frases + simulaciones) y API con Postgres real
node test/e2e.js  # prueba en navegador (requiere Playwright)
```

Mapa del código y bitácora de cambios: ver `NOTAS.md`.
