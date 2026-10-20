'use strict';
/* Puente con el motor de reglas: etiquetas para la ficha y líneas de ayuda. */
const E = require('../motor/engine.js');

const RANGO = { low: 0, mid: 1, high: 2 };
const NIVEL = { low: 'Baja', mid: 'Media', high: 'Alta' };
const OCULTAS = new Set(['MEDIO_FEM', 'FAQ_PAIS']);
const ORDEN_LINEAS = ['4141', '131', '133', '1515', '147', '1455', '149', '1412'];

const senales = flags => (flags || []).filter(f => !OCULTAS.has(f)).map(f => ({ texto: E.FLAG_LABEL[f] || f, urgente: E.URGENT.has(f) }));
const temas = ts => (ts || []).map(k => (E.THEMES[k] ? E.THEMES[k].label : k));
const lineas = recursos => ORDEN_LINEAS.filter(k => (recursos || []).includes(k) && E.RES[k]).map(k => ({ numero: E.RES[k][0], nombre: E.RES[k][1], enlace: E.RES[k][2] }));

module.exports = { E, RANGO, NIVEL, senales, temas, lineas };
