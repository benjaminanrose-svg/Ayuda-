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
    await per.goto(BASE + '/conversar'); await espera(3500);
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
      await p.goto(BASE + '/conversar'); await espera(1500); await p.fill('#input', t); await p.press('#input', 'Enter'); await espera(2500); await p.close();
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
    // directorio: una psicóloga se registra, completa su perfil con foto y lo envía; administración lo aprueba
    const psi = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); vigilar(psi, 'psicologa');
    await psi.goto(BASE + '/registro');
    await psi.screenshot({ path: path.join(OUT, 'registro-movil.png') });
    await psi.fill('#r-nombre', 'Javiera Soto'); await psi.fill('#r-correo', 'javiera@ejemplo.cl'); await psi.fill('#r-clave', 'clave-javiera-1'); await psi.fill('#r-repetir', 'clave-javiera-1');
    await psi.check('#r-acepto', { force: true }); await psi.click('#f-registro button[type=submit]');
    await psi.waitForSelector('#f-perfil');
    await psi.screenshot({ path: path.join(OUT, 'mi-perfil-inicio.png') });
    await psi.fill('#m-sis', '123456'); await psi.selectOption('#m-mod', 'ambas'); await psi.fill('#m-comuna', 'Melipilla'); await psi.fill('#m-precio', '30000');
    await psi.fill('#m-resumen', 'Psicóloga clínica. Acompaño a adolescentes y adultos que viven ansiedad, ánimo bajo o duelos, con un espacio cercano y sin juicios.');
    await psi.click('#esp button:has-text("Ansiedad")'); await psi.click('#esp button:has-text("Duelo")'); await psi.click('#esp button:has-text("Adolescentes")');
    const est = await psi.$$('#estudios .fila-ed input'); await est[0].fill('Psicóloga'); await est[1].fill('Universidad de Chile'); await est[2].fill('2018');
    await psi.click('#mas-est'); const est2 = await psi.$$('#estudios .fila-ed:nth-child(2) input'); await est2[0].fill('Diplomado en Intervención en Crisis'); await est2[1].fill('PUC'); await est2[2].fill('2021');
    const ex = await psi.$$('#experiencia .fila-ed input'); await ex[0].fill('Psicóloga clínica'); await ex[1].fill('CESFAM Melipilla'); await ex[2].fill('2019 – hoy');
    await psi.setInputFiles('#m-foto', path.join(__dirname, '..', 'public', 'img', 'icono-512.png')); await psi.waitForSelector('dialog.recorte[open]');
    await psi.screenshot({ path: path.join(OUT, 'recorte-foto.png') }); await psi.click('[data-r="ok"]'); await psi.waitForSelector('#foto-prev img');
    await psi.click('[data-diseno="lavanda"]');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
    await psi.selectOption('#d-tipo', 'titulo'); await psi.fill('#d-nombre', 'Título de Psicóloga, Universidad de Chile');
    await psi.setInputFiles('#d-archivo', { name: 'titulo.pdf', mimeType: 'application/pdf', buffer: pdf }); await psi.waitForSelector('.doc-ed');
    await psi.selectOption('#d-tipo', 'diploma'); await psi.fill('#d-nombre', 'Diplomado en Intervención en Crisis');
    await psi.setInputFiles('#d-archivo', path.join(__dirname, '..', 'public', 'img', 'icono-512.png')); await psi.waitForFunction(() => document.querySelectorAll('.doc-ed').length === 2);
    await psi.click('#enviar'); await psi.waitForSelector('.estado-perfil.pendiente');
    await psi.click('#p-agenda'); await psi.waitForSelector('#f-agenda');
    for (let d = 1; d <= 7; d++) await psi.click(`.dia-ed[data-dia="${d}"] [data-agregar-rango]`);
    await psi.click('.dia-ed[data-dia="2"] [data-agregar-rango]');
    await psi.click('#f-agenda button[type=submit]'); await psi.waitForFunction(() => /Guardado/.test(document.querySelector('#libres').textContent));
    await psi.screenshot({ path: path.join(OUT, 'mi-agenda.png'), fullPage: true });
    await psi.click('#p-perfil');
    await psi.screenshot({ path: path.join(OUT, 'mi-perfil.png'), fullPage: true });
    await adm.reload(); await adm.waitForSelector('[data-acc="perfil-aprobar"]'); await adm.click('[data-acc="perfil-aprobar"]'); await espera(800);
    const pub = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); vigilar(pub, 'publico');
    await pub.goto(BASE + '/'); await pub.waitForSelector('.tarjeta'); await espera(300);
    await pub.screenshot({ path: path.join(OUT, 'directorio-movil.png'), fullPage: true });
    await pub.click('.tarjeta'); await pub.waitForSelector('[data-hora]'); await espera(300);
    await pub.screenshot({ path: path.join(OUT, 'perfil-movil.png'), fullPage: true });
    await pub.click('[data-hora]'); await pub.fill('#c-nombre', 'Ana'); await pub.fill('#c-contacto', '+56 9 1234 5678'); await pub.fill('#c-motivo', 'Me cuesta dormir por la ansiedad');
    await pub.screenshot({ path: path.join(OUT, 'agendar-movil.png'), fullPage: true });
    await pub.click('#f-cita button[type=submit]'); await pub.waitForSelector('.cita-ok');
    await pub.screenshot({ path: path.join(OUT, 'agendado-movil.png') });
    await pub.click('.cita-ok .btn'); await pub.waitForSelector('.cita-fecha'); await espera(200);
    await pub.screenshot({ path: path.join(OUT, 'cita-movil.png'), fullPage: true });
    await pub.goto(BASE + '/privacidad'); await pub.waitForSelector('.legal'); await pub.screenshot({ path: path.join(OUT, 'privacidad-movil.png'), fullPage: true }); await pub.goBack(); await pub.waitForSelector('.cita-fecha');
    await pub.click('.sos-btn'); await espera(200);
    await pub.screenshot({ path: path.join(OUT, 'sos-movil.png') });
    const dsk = await b.newPage({ viewport: { width: 1366, height: 768 } }); vigilar(dsk, 'publico-escritorio');
    await dsk.goto(BASE + '/'); await dsk.waitForSelector('.tarjeta'); await dsk.screenshot({ path: path.join(OUT, 'directorio.png'), fullPage: true });
    await dsk.click('.tarjeta'); await dsk.waitForSelector('.credencial'); await espera(400); await dsk.screenshot({ path: path.join(OUT, 'perfil.png'), fullPage: true });
    await psi.goto(BASE + '/mi-perfil#agenda'); await psi.waitForSelector('.cita-ed'); await psi.screenshot({ path: path.join(OUT, 'mi-agenda-cita.png') });
    const sinDesborde = await Promise.all([per, esp, adm, psi, pub].map(p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)));
    console.log('desborde horizontal (persona, especialista, admin, psicóloga, público):', sinDesborde.join(', '));
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
