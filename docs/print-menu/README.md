# Menú impreso de Isabella’s

Diseño A4 horizontal basado en la referencia aprobada para papel: marfil, marco dorado fino, logotipo oficial centrado y dos columnas. La cabecera contiene solo la marca. No incluye portada separada, “A la mesa”, índice, fecha ni revisión visual. El pie conserva la información existente de moneda, impuestos y servicio en una sola línea; la numeración se alinea al margen. Las fechas y revisiones permanecen en el historial administrativo.

## Fuente y generación

- `layout.js` y `style.css`: proyección del catálogo y paginación medida en milímetros. Conserva el orden, visibilidad, ES/EN, descripciones, variantes, adicionales y precios pendientes. Repite categoría al continuar y divide textos u opciones excepcionalmente largos sin descartarlos.
- `definition.js`: PDF de navegador, con las mismas posiciones y saltos que la vista HTML. Textos y marco vectoriales; no captura la página como imagen.
- `scripts/print-menu.mjs`: PDF del servidor y vista previa autenticada. Reutiliza esta composición y conserva rutas, CSRF, permisos y archivos anteriores.
- `service.js`: adaptación reproducible de `preview-a/shared-print/engine.js`, sin cambiar el motor compartido ni los archivos de Boccantina. Se genera mediante `node scripts/sync-isabella-print.mjs`; `--check` comprueba su vigencia. El build administrativo la regenera y copia a `docs/print-menu`.
- `PRINT_DESIGN_VERSION` forma parte de la huella de cada edición. Los PDF históricos permanecen descargables, pero el diseño anterior no se reutiliza como edición actual.
- El QR opcional de la carta se mantiene al final del contenido cuando el catálogo tiene URL pública configurada.

## Recursos

El archivo oficial `../central/assets/isabella-logo-transparent.png` no se modifica, recorta ni recolorea. `assets/fraunces-print.ttf` es una instancia de peso 500 del Fraunces local, convertida con fontTools; licencia en `../assets/fonts/OFL-Fraunces.txt`. El texto operativo usa el Noto Sans ya incluido en el motor PDF, también OFL.

`assets/ivory-marble.png` es una textura nueva generada con la herramienta integrada de imágenes el 28/10/2026, sin marca ni texto. El SVG aplica una capa marfil para que las vetas no compitan con la lectura.

Prompt:

> Asset type: full-bleed texture for an elegant Italian restaurant's printed menu. Flat front-facing edge-to-edge horizontal ivory marble background, A4 landscape aspect ratio 297:210. Warm white / pale cream surface (#faf8ef), very faint natural champagne and beige marble veins, exceedingly low contrast and quiet areas for dense black printed text. No lighting effects, no vignette, no shadows, no perspective, no objects. No typography, no letters, no logos, no frame, no ornaments, no borders. A refined, almost-white natural marble paper surface only.

## Comprobaciones

`check:admin`, `check:preview-a`, `check:v2`, `check:static` y `node scripts/check-browser-print.mjs`. Ejecutar los checks que usan traducción de forma secuencial: comparten el modelo local de Stanza en Windows.

`node scripts/review-print-layout.mjs` usa el catálogo público del servidor local 4180 sin modificarlo, comprueba 320/390/768/1024/1440 px y crea capturas/PDF en `../artifacts/isabella-print-redesign-20261028`. Sus casos de 0/1/5 productos, descripciones largas y 20 variantes más adicional se construyen solo en memoria. Impresión física en papel pendiente de revisar con la impresora elegida.
