# Isabella's · Preview A del menú 2026

Vista previa local y aislada. No modifica la web oficial ni publica contenido. Iniciar desde la raíz del repositorio con `npm.cmd run serve:preview-a` y abrir `http://127.0.0.1:4174/`. Para revisar una dirección concreta: `?lang=es`, `?lang=en`, `?lang=de`, `?lang=ar` o `?lang=he`.

## Fuente del catálogo

El usuario confirmó como fuente de contenido el libro **«MENU 2026» de nueve páginas** publicado en [la web oficial de Isabella's](https://isabellascr.com/#menu), identificado como `df_option_3938` al revisarlo el 16 de octubre de 2026. Los originales descargados en `assets/menu-2026/` mantienen este orden:

1. `NEW-MENU-COVER-ISA-2026-A.webp` — portada.
2. `1-PRE.webp` — ensaladas y sopas.
3. `2-PRE.webp` — entradas.
4. `7-PRE.webp` — focaccia, carpaccios y strombolis.
5. `ALL-4-D.webp` — pastas y risotto.
6. `4-PRE.webp` — más pastas y repetición de focaccia/carpaccios.
7. `ALL-4-C.webp` — carnes.
8. `ALL-4-A.webp` — cocteles clásicos.
9. `ALL-4-B.webp` — café y cocteles con café.

La carta estructurada en `menu-data.js` tiene 55 platos únicos en ocho categorías. Las repeticiones entre páginas se muestran una sola vez. El libro antiguo «MENU» de 15 páginas aparece en la grabación de Jam, pero **no alimenta este preview**. La grabación sustenta los requisitos funcionales descritos en [`notes/analisis-menu-isabella-2026-10-16.md`](../notes/analisis-menu-isabella-2026-10-16.md).

Las ocho páginas interiores tienen una versión ilustrada sin tipografía en `assets/menu-art/`, creada mediante edición de imagen a partir de las páginas oficiales. Las nueve imágenes originales se conservan intactas en `assets/menu-2026/`. Al final del preview, el panel «Comparar las nueve páginas originales» permite abrir cada fuente en el mismo orden del libro público.

## Diseño de revista

El lector combina en cada pliego la ilustración de la carta **sin nombres de platos, descripciones ni precios** con los platos estructurados y traducidos. La hoja de lectura muestra nombres, descripciones, variantes y **precios visibles**. Cuando el original no indica un importe verificable, se muestra «Consultar precio» en lugar de inventarlo. Los 55 platos se distribuyen en **14 pliegos interactivos** para conservar un tamaño de letra legible; algunos pliegos repiten una ilustración porque contienen distintos platos de la misma página original. La portada oficial también se usa en el hero. El índice de categorías permite saltar al primer pliego de cada capítulo. Los botones, las flechas del teclado cuando el lector tiene el foco y el deslizamiento horizontal en móvil pasan al pliego anterior o siguiente.

El paso de página usa una animación 3D de hoja: en escritorio gira sobre el lomo y en móvil gira el pliego apilado. La dirección se invierte para árabe y hebreo. Si el visitante pulsa varias veces durante un giro, se conserva su último destino y se completa al terminar la hoja actual. Con la preferencia de movimiento reducido, el cambio es inmediato.

## Idioma y lectura

- En primera visita, se usa el primer idioma compatible de `navigator.languages`; si no hay ninguno, español.
- El selector manual guarda la preferencia en este navegador. Un parámetro `?lang=` compatible tiene prioridad durante esa visita.
- Español, inglés y alemán usan izquierda a derecha. Árabe y hebreo aplican `lang` y `dir="rtl"` al documento: el pliego invierte el orden de sus páginas, el índice y las flechas de avance. En móvil el arte va encima del contenido para mantener el texto legible. Los precios en colones y la numeración de páginas se aíslan de la dirección RTL.
- El buscador filtra nombres, descripciones y categorías en el idioma mostrado.
- En la central, cada texto nuevo o modificado se escribe una sola vez en español. Al guardar se generan y almacenan sus versiones en inglés, alemán, árabe y hebreo mediante modelos locales gratuitos; el visitante recibe la versión correspondiente sin esperar una traducción en cada visita.

## Revisión antes de publicar

Las descripciones se condensaron desde las páginas gráficas y las traducciones se redactaron para este prototipo. El restaurante debe verificar nombres, ingredientes, precios y redacción gastronómica de los cinco idiomas. Cinco productos del original no muestran precio legible: raviolis de salmón, casuela de lomito, espresso martini, carajillo y capuccino con Baileys; se mantienen sin importe en los datos y se señalan como pendientes en la hoja de lectura. La milanesa muestra los precios de pollo y carne junto a cada variante. Las ocho ilustraciones editadas son recursos de diseño para la vista previa; las páginas originales siguen disponibles para cotejar el contenido. No hay fotografías individuales de todos los platos en el libro; la portada original aporta la imagen del hero.

Esta versión usa datos locales para revisión visual y funcional. La [central local de administración](../README.md) permite editar la carta con contraseña y guardar los cambios en este equipo. No hay integración con WordPress ni publicación. La [investigación de gestión editorial](../notes/gestion-administrativa-menu-isabella-2026-10-16.html) comparó otras opciones; el usuario pidió posteriormente una página administrativa separada.

Ejecutar `npm.cmd run check:preview-a` para validar integridad de datos y archivos fuente.
