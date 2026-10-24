# Exploración visual aislada de la carta

Rutas locales con `npm.cmd run serve:preview-a`:

- `/design-lab/il-libro.html`: pliego de dos páginas en escritorio y lectura vertical en móvil.
- `/design-lab/journal.html`: revista con fotografía editorial de referencia y páginas de contenido. Las categorías largas se reparten en páginas navegables; `?category=pasta&page=1` abre la segunda página de Pastas.

Isabella’s Journal es la carta predeterminada del preview local en `/`. La carta anterior queda disponible como `/borrador-1.html`, en espera. Il Libro conserva su ruta de exploración. Las tres vistas consultan `/api/menu`, el mismo catálogo que guarda la Central local, y usan `menu-data.js` como respaldo sin servidor. Journal vuelve a consultar los datos al recuperar el foco. Conservan las ocho categorías iniciales, cinco idiomas, precios y variantes; no incluyen pedidos ni pagos. `?category=salads` muestra una categoría breve; `?category=pasta`, una extensa. `?lang=ar` y `?lang=he` activan RTL.

Las fotografías de Journal son referencias conceptuales; no se presentan como fotos verificadas de platos de Isabella’s. Sus fuentes y licencias están en [photo-credits.html](./photo-credits.html). Las ilustraciones y portada proceden de los recursos existentes de la carta.

Journal usa la imagen de categoría que guarda la Central (`category.art.src`) cuando existe. Si más adelante se incorpora `category.editorialPhoto.src`, esa foto tendrá prioridad; de momento las categorías sin imagen editada muestran las referencias locales. La paginación mide las filas renderizadas con el idioma y ancho actuales; los platos se mantienen completos y en el orden del catálogo aunque cambien los textos, precios, variantes o la cantidad de productos.

El cambio de diseño predeterminado se limita al servidor de preview local; la demo estática en `docs/` y la web oficial permanecen independientes. El catálogo local sigue guardado en `data/menu.json`.
