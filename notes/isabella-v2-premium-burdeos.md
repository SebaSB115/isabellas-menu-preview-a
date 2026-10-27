# Isabella’s V2 · Carta gastronómica

Propuesta local de lectura continua. Conserva la carta y sus fichas informativas, sin pedidos ni pagos. La selección de idiomas existente sigue siendo ES/EN, con detección inicial del navegador y elección manual.

## Composición

- Escritorio y tablet: platos y precios en la columna izquierda; fotografía vertical 3:4 de la categoría a la derecha.
- Móvil: título, fotografía horizontal acotada y listado de platos en una columna.
- Las categorías largas crecen según sus productos. Su fotografía permanece visible al desplazarse en escritorio.
- La fotografía de producto aparece únicamente dentro de la ficha individual.

## Fotografías de muestra

Las ocho imágenes en `preview-a/design-lab/assets/reference-v2/` son generadas para evaluar el diseño. Representan platos existentes de cada categoría, pero no son fotos oficiales del restaurante ni de un plato individual. Sus etiquetas visibles lo indican. Se guardan versiones WebP de 720 y aproximadamente 1086 px.

Una fotografía propia cargada en **Administración → Categorías → Fotografía de la carta V2** sustituye la muestra de esa categoría. El editor permite revisar formatos de escritorio y móvil y ajustar el punto focal. Los archivos se procesan mediante la carga existente y la relación se guarda en `editorialPhoto`. El campo `art` del borrador anterior se conserva independiente.

## Verificación

- `npm.cmd run check:preview-a`
- `npm.cmd run check:admin`
- `npm.cmd run check:v2`
- `npm.cmd run check:static`
- `node scripts/check-journal-fluido.mjs`
- `node scripts/check-journal-dish-detail.mjs`
- `node scripts/qa-premium-burdeos.mjs`
- `node scripts/qa-premium-burdeos-admin.mjs`

Las capturas están en `../artifacts/isabella-v2-premium-burdeos/`. La prueba administrativa usa datos temporales aislados y no modifica el catálogo local. Esta versión no se ha publicado.
