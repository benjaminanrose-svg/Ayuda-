# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Persona en malestar emocional o en riesgo suicida en Chile (adolescentes y adultos) que escribe a cualquier hora, a menudo con faltas, jerga chilena o mensajes muy cortos. Necesita sentirse escuchada de inmediato y llegar a un especialista.
- Especialista registrado en la red (psicólogos y profesionales de salud mental) que recibe alertas, toma casos ahora o agenda para el día siguiente.
- Audiencia de la presentación del MVP: colegios y universidades, empresas (bienestar laboral), salud pública y municipios, e inversionistas o concursos de emprendimiento.

## Product Purpose

ConténMente (a través de su bot, Nexo) conversa con la persona apenas escribe, detecta señales de riesgo y alerta a los especialistas registrados, que la atienden en el momento o le dan hora para el día siguiente. Mientras llega el especialista, el bot acompaña: pregunta por la seguridad, entrega líneas de ayuda y propone ejercicios de calma. Éxito: que nadie quede sin respuesta ni sin derivación.

## Positioning

Motor de reglas sin IA generativa: corre en el navegador, con costo de operación cercano a cero, respuestas predecibles y auditables, y nunca entrega información sobre métodos. Entiende faltas de ortografía, jerga chilena, emojis y contexto de la conversación. Modelo de negocio B2B.

## Operating Context

- La demo se presenta principalmente con proyector en una reunión: sala con luz, pantalla grande, público mirando de lejos.
- La demo debe mostrar en vivo: la conversación de la persona, el panel del especialista con la alerta y la derivación (ahora o mañana), y el laboratorio de pruebas.
- Líneas de ayuda verificadas para Chile: *4141 (prevención del suicidio, Minsal), 131 (SAMU), 133 (Carabineros), 1515 (Línea Libre), 1455 (violencia contra la mujer), 149 (Fono Familia), 147 (Fono Niños), 1412 (Fono Drogas y Alcohol), Salud Responde 600 360 7777.

## Capabilities and Constraints

- Archivo HTML único publicado como artifact; motor de reglas + diccionario de corrección incrustados; sin servidor.
- Prototipo con datos de ejemplo: especialistas, horarios y estadísticas del panel son ficticios y deben verse marcados como ejemplo.
- Todo el contenido clínico debe validarlo un profesional (la socia del proyecto, diplomada en prevención del suicidio) antes de usarse con personas reales.

## Brand Commitments

- Marca definida (2026-10-20): plataforma "ConténMente", bot "Nexo". Logo: cerebro con corazón sostenido por dos manos. Colores: menta #8CC8BC, lavanda #B8A2DA, azul pizarra #30486C, azul mano #486C90, chispa amarilla #F0C090. Antes se llamaba "Red Acompaña" (bot "Acompaña").

## Evidence on Hand

- Pruebas reales del motor: 303 frases de prueba clasificadas como se espera; unas 190 conversaciones guiadas y 15.000 conversaciones aleatorias revisadas sin errores de coherencia.
- No hay clientes, testimonios, pilotos ni métricas de impacto: no inventarlos.

## Product Principles

1. Responder siempre y de inmediato; nunca dejar a la persona sin respuesta.
2. Nunca insistir ni presionar: respetar cuando la persona no quiere llamar o no quiere hablar.
3. Seguridad antes que conversación: preguntar directo por el riesgo y derivar.
4. Transparencia: es un asistente automático, no una persona; lo clínico lo valida un profesional.

## Accessibility & Inclusion

- Lectura fácil para personas en crisis: frases cortas, alto contraste, tipografía muy legible.
- Debe leerse bien proyectado a distancia.
