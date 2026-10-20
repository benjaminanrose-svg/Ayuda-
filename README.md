# Red Acompaña

Acompañamiento y derivación en salud mental: un bot por reglas (sin IA generativa) escucha a la persona, detecta señales de riesgo y conecta con especialistas registrados, que atienden en el momento o agendan para el día siguiente.

> Estado: en construcción. Esta primera versión publica la demo de presentación en `/demo/`. El producto completo (chat de la persona, panel del especialista, base de datos y avisos) llega en los siguientes commits.

## Correr localmente

```bash
npm install
npm start          # http://localhost:3000
npm test           # pruebas del motor
```

## Railway

El servicio usa `npm start` y el chequeo de salud en `/salud` (ver `railway.json`).
