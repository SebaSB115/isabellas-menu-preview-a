# Isabella’s Journal V2 · propuesta de lectura continua

Estado: **propuesta local aislada**. La ruta predeterminada `preview-a/entry.js` continúa abriendo `design-lab/journal.html`. No se ha publicado ni sustituido la carta actual.

## Acceso local

`http://127.0.0.1:4194/design-lab/journal-fluido.html?lang=es`

La propuesta usa `GET /api/menu` del mismo preview administrativo. La copia estática en `docs/design-lab/` usa el catálogo de demostración del navegador. Ninguna de las dos crea un catálogo paralelo. El PDF permanece independiente.

## Decisión de diseño

- Base visual existente: crema `#f4eadb`, burdeos `#482832`, tinta `#302622`, Fraunces para títulos latinos y Arial para lectura operativa y alfabetos RTL.
- Un documento continuo con capítulos de altura natural sustituye la paginación obligatoria **solo en esta propuesta**. El lector paginado anterior queda accesible como referencia.
- En móvil y tablet, un control de ancho completo muestra el capítulo activo y abre las ocho categorías en un índice con nombres completos. Sustituye la franja horizontal que cortaba los nombres; los saltos siguen siendo enlaces a fragmentos y el desplazamiento vertical permanece nativo.
- Las fotografías de categoría se presentan con el rótulo de referencia editorial. Las fotos vinculadas a un producto aparecen junto a su nombre y precio. No se generan imágenes ni datos nuevos.
- El inicio de capítulo combina número, título y fotografía si existe; los platos sin foto usan una lista tipográfica compacta. Solo una foto individual verificada activa el tercer patrón. Si una categoría y un producto usan el mismo archivo, se muestra la foto junto al producto y se evita repetirla en la apertura. Las categorías extensas con fotografía distribuyen los primeros dos platos junto a la apertura y continúan los demás sin cambiar su orden; desde 1024 px esa continuación usa dos columnas.
- Los títulos de platos bajaron de 22–24 px a 20–21 px; los precios conservan una columna estable de 14 px y las descripciones 15,5–16 px. Los separadores solo aparecen entre platos, con un color más tenue. Ningún plato tiene altura fija.
- Las alturas sticky medidas con `ResizeObserver` alimentan el margen de los fragmentos. Se eliminó la suma duplicada de `scroll-padding-top` y `scroll-margin-top`, que desplazaba los títulos demasiado abajo al abrir una categoría.
- En tablet el contenido usa el ancho completo; en escritorio aparece un índice lateral y las fotografías acompañan el listado.

## Datos y límites comprobados

El servidor local de prueba consultado tenía 8 categorías, 56 productos y 6 precios pendientes. El catálogo semilla versionado contiene 55 productos y 5 precios pendientes; la diferencia procede del dato local y no se modificó. Journal V2 ofrece español e inglés: detecta el idioma del navegador y usa inglés para cualquier navegador que no esté en español. La preferencia manual se conserva. Las traducciones históricas a alemán, árabe y hebreo permanecen en los datos y en los borradores anteriores, pero no se ofrecen en esta propuesta V2.

El archivo de PDF y la administración no se alteraron. Esta propuesta no incluye pedidos, carrito ni pagos.

### Origen comprobado de «plato especial»

- `data/menu.json` es el catálogo semilla local de 55 productos y no contiene `product-84242bf8`.
- El servidor de revisión V2 usa `data/revision-tabler-2026-10-26/menu.json`: versión 3, actualizada `2026-10-26T17:01:12.835Z`. La categoría `meats` contiene `product-84242bf8`, nombre y descripción «plato especial», precio ₡4.500 y traducciones `de`, `ar`, `he` vacías. La versión 2 de `menu.json.bak`, actualizada `2026-10-26T17:00:25.819Z`, ya contiene el mismo producto con fotografía y precio pendiente. Estos archivos no registran quién hizo el alta.
- Su foto proviene de `preview-a/assets/uploads/b86c2f0f-ed65-408f-9c98-fecdc5f24257-1600.webp`, creada localmente el 26/10/2026 alrededor de las 13:00. La imagen muestra una cachapa, incompatible con la ubicación en Carnes. No se cambió el registro ni se movió entre categorías.
- La propuesta de lectura omite **solo esa imagen exacta** para evitar atribuir una foto incorrecta; si se reemplaza la foto desde administración, el producto podrá volver a mostrarla. El nombre, precio, visibilidad y posición permanecen como llegan de la API. El restaurante debe confirmar si este producto corresponde a Isabella’s antes de publicar.

## Verificación

- `node scripts/check-journal-fluido.mjs`: 320, 390, 768, 1024 y 1440 px; enlaces directos y encabezado visible; detección del navegador, preferencia manual, español e inglés; orientación horizontal; teclado; toque emulado; reflow con espaciado de texto y zoom CSS simulado; axe WCAG 2.2 AA automatizado en ambos idiomas a 390 px.
- `node scripts/check-journal-fluido-fixture.mjs`: textos largos, foto y detalle, cierre Escape, restauración de foco y actualización del catálogo con datos temporales fuera del catálogo del usuario.
- `node scripts/capture-journal-editorial.mjs before|after`: capturas comparables de Ensaladas, Carnes y Cócteles a cinco anchuras en `../artifacts/isabella-editorial-refinement-2026-10-26/`.
- `npm.cmd run check:preview-a`, `npm.cmd run check:static` y `npm.cmd run check:v2`.
- Capturas y reportes en `../artifacts/isabella-journal-fluido-2026-10-26/`.

Pendiente de comprobación: pruebas manuales en Safari iOS, Chrome Android y con usuarios del restaurante. La prueba automática de accesibilidad no equivale a una certificación integral WCAG.

## Referencias de criterio

- Baymard Institute: [categorías principales visibles en navegación móvil](https://baymard.com/research-articles/main-navigation-product-categories).
- Nielsen Norman Group: [navegación móvil reconocible](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/) y [heurística de reconocimiento](https://www.nngroup.com/articles/recognition-and-recall/).
- W3C: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- web.dev: [imágenes adaptables y carga diferida](https://web.dev/learn/design/responsive-images).
