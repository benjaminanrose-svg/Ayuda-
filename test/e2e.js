'use strict';
/* Prueba de punta a punta en navegador (persona en teléfono + especialista en escritorio).
   Requiere Playwright instalado. Uso: node test/e2e.js [carpeta-capturas] */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const OUT = process.argv[2] || path.join(os.tmpdir(), 'ra-capturas');
fs.mkdirSync(OUT, { recursive: true });
const PUERTO = 4100 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PUERTO}`;
const datos = path.join(os.tmpdir(), 'ra-e2e-' + Date.now());
const errores = [];
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'local.js')], { env: { ...process.env, PORT: String(PUERTO), DATOS_LOCALES: datos, PUERTO_BD: String(PUERTO + 1000), ESCALAR_ALTO_SEG: '600' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/salud')).ok) break; } catch { /* aún no */ } await espera(500); }
  const b = await chromium.launch();
  const vigilar = (p, quien) => { p.on('console', m => { if (m.type() === 'error') errores.push(`${quien}: ${m.text()}`); }); p.on('pageerror', e => errores.push(`${quien}: ${e.message}`)); };
  try {
    // administración: primer ingreso, cambio de clave y alta de una especialista
    const adm = await b.newPage({ viewport: { width: 1366, height: 768 } }); vigilar(adm, 'admin');
    await adm.goto(BASE + '/ingresar');
    await adm.fill('#correo', 'admin@local'); await adm.fill('#clave', 'clave-local-admin'); await adm.click('#f-ingreso button');
    await adm.fill('#nueva', 'clave-admin-nueva-1'); await adm.fill('#repetir', 'clave-admin-nueva-1'); await adm.click('#f-clave button');
    await adm.waitForURL('**/equipo'); await adm.goto(BASE + '/equipo#admin'); await adm.waitForSelector('#abrir-usuario'); await adm.click('#abrir-usuario');
    await adm.fill('#u-correo', 'camila@ejemplo.cl'); await adm.fill('#u-nombre', 'Camila Fuentes'); await adm.fill('#u-esp', 'Adultos, crisis'); await adm.check('#u-guardia', { force: true });
    await adm.click('#f-usuario button[type=submit]'); await adm.waitForSelector('#clave-temp:not([hidden]) code');
    const temporal = await adm.textContent('#clave-temp code');
    await adm.screenshot({ path: path.join(OUT, 'admin.png'), fullPage: true });

    // especialista: ingresa, crea su clave y queda disponible
    const esp = await b.newPage({ viewport: { width: 1366, height: 768 } }); vigilar(esp, 'especialista');
    await esp.goto(BASE + '/ingresar');
    await esp.fill('#correo', 'camila@ejemplo.cl'); await esp.fill('#clave', temporal); await esp.click('#f-ingreso button');
    await esp.fill('#nueva', 'clave-camila-segura'); await esp.fill('#repetir', 'clave-camila-segura'); await esp.click('#f-clave button');
    await esp.waitForURL('**/equipo'); await esp.check('#disponible', { force: true }); await espera(400);
    await esp.screenshot({ path: path.join(OUT, 'panel-vacio.png') });

    // persona en el teléfono
    const per = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); vigilar(per, 'persona');
    await per.goto(BASE + '/'); await espera(3500);
    await per.screenshot({ path: path.join(OUT, 'persona-inicio.png') });
    await per.fill('#input', 'me quiero matar'); await per.press('#input', 'Enter'); await espera(5000);
    await per.screenshot({ path: path.join(OUT, 'persona-riesgo.png') });

    // el caso llega al panel en vivo
    await esp.waitForSelector('#cola .item'); await esp.click('#cola .item'); await espera(500);
    await esp.screenshot({ path: path.join(OUT, 'panel-ficha.png') });
    await esp.click('[data-acc="tomar"]'); await esp.waitForSelector('#pro-in'); await espera(900);
    await esp.screenshot({ path: path.join(OUT, 'panel-tomado.png') });
    await esp.fill('#pro-in', 'Hola, soy Camila, psicóloga. Ya leí lo que conversaste. Estoy contigo. ¿Cómo estás ahora?'); await esp.press('#pro-in', 'Enter');
    await per.waitForSelector('.msg.pro'); await espera(600);
    await per.fill('#input', 'un poco mejor, gracias por venir'); await per.press('#input', 'Enter');
    await esp.waitForFunction(() => document.querySelector('#registro') && document.querySelector('#registro').textContent.includes('gracias por venir'));
    await espera(500);
    await per.screenshot({ path: path.join(OUT, 'persona-especialista.png') });
    await esp.screenshot({ path: path.join(OUT, 'panel-conversacion.png') });

    // más casos (riesgo alto y bajo) y vistas en el teléfono
    for (const t of ['mi papá me pega cuando toma', 'quiero hablar con un psicólogo']) {
      const p = await b.newPage({ viewport: { width: 390, height: 844 } }); vigilar(p, 'persona2');
      await p.goto(BASE + '/'); await espera(1500); await p.fill('#input', t); await p.press('#input', 'Enter'); await espera(2500); await p.close();
    }
    await esp.waitForFunction(() => document.querySelectorAll('#cola .item').length >= 2);
    await esp.screenshot({ path: path.join(OUT, 'panel-lista.png') });
    await esp.setViewportSize({ width: 390, height: 844 }); await esp.goto(BASE + '/equipo'); await esp.waitForSelector('#cola .item'); await espera(500);
    await esp.screenshot({ path: path.join(OUT, 'panel-movil-lista.png') });
    await esp.click('#menu-btn'); await espera(200);
    await esp.screenshot({ path: path.join(OUT, 'panel-movil-menu.png') });
    await esp.click('#menu-btn'); await esp.click('#cola .item'); await espera(500);
    await esp.screenshot({ path: path.join(OUT, 'panel-movil-caso.png'), fullPage: true });
    await adm.setViewportSize({ width: 390, height: 844 }); await adm.reload(); await adm.waitForSelector('.cifras'); await espera(300);
    await adm.screenshot({ path: path.join(OUT, 'admin-movil.png'), fullPage: true });
    const sinDesborde = await Promise.all([per, esp, adm].map(p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)));
    console.log('desborde horizontal (persona, especialista, admin):', sinDesborde.join(', '));
  } finally {
    await b.close();
    srv.kill('SIGTERM');
    await espera(2500);
    fs.rmSync(datos, { recursive: true, force: true });
  }
  console.log(errores.length ? 'ERRORES EN CONSOLA:\n' + errores.join('\n') : 'Sin errores en consola.');
  console.log('Capturas en', OUT);
  process.exit(errores.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
