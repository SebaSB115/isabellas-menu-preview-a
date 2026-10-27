# Carta unica de Isabella V2

La implementacion vigente es journal-fluido.html, journal-fluido.js y journal-fluido.css. Mantiene la composicion aprobada: listado y fotografia de categoria, indice lateral en escritorio y selector de categorias en movil. Se lee mediante desplazamiento vertical, sin botones de paginacion. Las fotografias individuales aparecen exclusivamente en las fichas de platos.

La raiz /, Ver carta de administracion y las rutas antiguas abren esta misma implementacion. journal.html, il-libro.html y /borrador-1.html son redirecciones de compatibilidad; no contienen formatos alternativos. No restaurar los lectores retirados al generar el hosting.

ES/EN conserva deteccion del navegador y preferencia manual mediante journal-language.js. El catalogo local procede de /api/menu. El build publico adapta esa lectura a admin/demo-store.js, que comparte datos solo dentro del mismo navegador. El menu impreso mantiene su propia composicion y generacion PDF.

Las fotografias de muestra no representan imagenes oficiales verificadas. Los recursos y datos existentes se conservan. Las imagenes asignadas desde administracion tienen prioridad sobre las referencias.

## Comprobaciones

- npm run build:pages-journal
- npm run check:preview-a
- npm run check:admin
- npm run check:v2
- npm run check:static
- node scripts/check-current-menu.mjs
- node scripts/check-current-menu.mjs --url https://sebasb115.github.io/isabellas-menu-preview-a/

La ultima prueba valida siete entradas, Ver carta desde administracion, los 55 productos iniciales, imagenes, fichas, cierre y recuperacion de lectura, ES/EN y ausencia de desbordamientos a 320, 390, 768, 1024 y 1440 px. Guarda capturas e informe en una carpeta temporal. Las pruebas en Chrome no equivalen a comprobaciones en un iPhone fisico.
