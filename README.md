# Isabella's Costa Rica · Preview A de la carta

Prototipo independiente de la web oficial. Combina las nueve páginas del menú 2026 de Isabella's con una carta de revista interactiva: ilustración sin texto a un lado y platos con precios al otro. Incluye búsqueda, navegación por categorías, animación de hoja, diseño adaptable y cinco idiomas. Árabe y hebreo usan lectura de derecha a izquierda.

## Ver el avance

La vista publicada mediante GitHub Pages contiene **solo la carta de consulta**. Los cambios de la central local no se publican automáticamente en Pages ni en `isabellascr.com`.

Para ejecutarla y editarla en Windows:

```powershell
npm.cmd ci
npm.cmd run admin:setup
npm.cmd run translate:setup
npm.cmd run serve:preview-a
```

El servidor mostrará las direcciones de la carta y de `/admin/`. La contraseña se configura localmente y no está en este repositorio. `translate:setup` descarga una vez modelos gratuitos de Argos Translate para traducir al guardar desde español a inglés, alemán, árabe y hebreo. Las traducciones quedan almacenadas; cambiar precios o imágenes no las regenera. En otro equipo se debe repetir la configuración local.

La central permite crear y editar productos, precios, descripciones, variantes, adicionales, categorías y fondos adaptables. El administrador escribe los textos una sola vez en español. Si la traducción falla, el cambio no se guarda. Los datos editados se guardan en `data/menu.json`, fuera de Git.

## Comprobaciones

```powershell
npm.cmd run check:preview-a
npm.cmd run check:admin
```

La segunda comprobación requiere haber ejecutado `npm.cmd run translate:setup`. Usa una base de prueba temporal y no cambia la carta guardada.

## Alcance

La carpeta `docs/` contiene la versión pública estática para GitHub Pages. `preview-a/` contiene el código de la carta y la central local; `scripts/` contiene el servidor y las comprobaciones. La central local necesita un servidor Node y no funciona en GitHub Pages. Este prototipo no está conectado a WordPress ni a la web oficial. Antes de publicar contenido real se deben revisar nombres, ingredientes, precios y traducciones culinarias.

Fuente visual y de contenido: [menú oficial de Isabella's](https://isabellascr.com/#menu). Ver [detalle del Preview A](preview-a/README.md) y [análisis de la reunión](notes/analisis-menu-isabella-2026-10-16.md).
