/* Arma la demo de presentación en public/demo/index.html con el motor actual. */
const fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p);
let h = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8');
h = h.replace('/*@DICT*/', () => 'var ACOMPANA_DICT=' + fs.readFileSync(R('motor/dict.json'), 'utf8') + ';')
     .replace('/*@ENGINE*/', () => fs.readFileSync(R('motor/engine.js'), 'utf8'))
     .replace('/*@CASES*/', () => fs.readFileSync(R('motor/cases.js'), 'utf8'));
fs.mkdirSync(R('public/demo'), { recursive: true });
fs.writeFileSync(R('public/demo/index.html'), '<!doctype html>\n<html lang="es">\n<head>\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<style>[hidden]{display:none!important}</style>\n' + h.replace(/<\/style>\n/, '</style>\n</head>\n<body>\n') + '\n</body>\n</html>\n');
console.log('demo lista', (h.length / 1024 | 0) + ' KB');
