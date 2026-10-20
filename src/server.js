/* Red Acompaña · servidor web. */
'use strict';
process.env.TZ = process.env.TZ || 'America/Santiago';
const path = require('path');
const express = require('express');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.get('/salud', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.redirect(302, '/demo/'));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', extensions: ['html'] }));
app.use((req, res) => res.status(404).type('text/plain').send('No encontrado'));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Red Acompaña escuchando en el puerto ${port}`));
