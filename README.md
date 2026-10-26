# Isabella's Costa Rica · Preview A de la carta

**[Estado de la entrega del 23 de octubre de 2026](ESTADO_2026-10-23.md)**: alcance, comprobaciones y límites del preview.

**Diseño predeterminado:** Isabella’s Journal en el preview local y en la demo pública de GitHub Pages. La carta editorial anterior sigue accesible como `borrador-1.html` (Borrador 1). La Central privada local y Journal comparten el catálogo de `/api/menu`; la demo pública comparte sus cambios solo entre el editor y Journal del mismo navegador mediante almacenamiento local.

Prototipo independiente de la web oficial. Combina las nueve páginas del menú 2026 de Isabella's con una carta de revista interactiva: ilustración sin texto a un lado y platos con precios al otro. Incluye búsqueda, navegación por categorías, animación de hoja, diseño adaptable y cinco idiomas. Árabe y hebreo usan lectura de derecha a izquierda.

**Iteración visual (20/10/2026):** portada de libro, índice de capítulos en escritorio y tipografía Fraunces de código abierto. El lector ajusta la ilustración y los platos para mostrar hoja y controles en una pantalla; al cambiar de página no desplaza el documento. La [dirección visual de ambas cartas](notes/direccion-visual-dos-cartas-2026-10-20.md) explica el criterio de marca y UX.

## Ver el avance

**[Abrir la vista navegable del Preview A](https://sebasb115.github.io/isabellas-menu-preview-a/)**

**[Abrir la demostración pública de la central](https://sebasb115.github.io/isabellas-menu-preview-a/admin/)**

**[Elegir restaurante en la central compartida](https://sebasb115.github.io/isabellas-menu-preview-a/central/)**: entrada de demostración para Isabella's y Boccantina. Cada restaurante conserva sus propias vistas y datos; Boccantina aún tiene un editor de extras, no un editor general de productos. La versión publicada no incluye la nueva gestión privada de usuarios ni Firebase.

La central publicada en GitHub Pages empieza en un **login de demostración** (`demo-isabella` / `vista2026`). Es una pantalla de acceso visual, no autenticación real ni control de permisos del servidor: los archivos estáticos siguen siendo públicos. Permite probar la edición y ver el resultado en Journal dentro del mismo navegador; esos cambios no llegan a otros visitantes ni a `isabellascr.com`. La contraseña y el servidor privado local no se publican. El editor y la carta estáticos se generan con `npm.cmd run build:pages-admin` y `npm.cmd run build:pages-journal`.

### Acceso privado local por restaurante

En la rama `version/2-simple`, inicia `npm.cmd run serve:preview-a` aquí (puerto 4180) y `npm.cmd run serve:v2` en `../boccantina-preview` (puerto 4175). Abre **http://127.0.0.1:4180/central/** y elige Isabella's o Boccantina. La opción de Boccantina abre el login de V2; cada restaurante conserva su propia sesión.

Para revisión desde otro equipo, el selector V2 de demostración se publica desde el repositorio hermano en <https://sebasb115.github.io/boccantina-preview/central/>. Isabella's abre su demo pública existente y Boccantina abre su demo V2. Ninguna de esas pantallas está conectada al servidor privado ni a los datos de producción.

El usuario propietario de Isabella's se configura con `npm.cmd run admin:setup`. Boccantina conserva su cuenta propietaria independiente, configurada desde su propio repositorio. Las contraseñas se guardan como hash fuera de Git. Este acceso es **local de preview**; GitHub Pages no ejecuta los servidores ni protege sus demos estáticas. Para acceso privado desde Internet harán falta backend alojado, HTTPS y almacenamiento persistente.

### Usuarios y permisos en la central local

La cuenta propietaria de Isabella's abre **Administración** desde el menú de su central de carta. Allí crea usuarios de Isabella's y les asigna `Productos` o `Categorías e imágenes`. La sesión y la API comprueban los permisos antes de permitir operaciones; desactivar una cuenta revoca su siguiente acceso.

Los usuarios locales de Isabella's se guardan en `data/central-users.json`, fuera de Git. Para cambiar la ubicación, usa `ISABELLA_USERS_FILE`. La demo pública de GitHub Pages mantiene su comportamiento independiente y no muestra cuentas privadas.

## Investigación para la propuesta comercial

**[Leer el informe de Hero A y la central WordPress](https://sebasb115.github.io/isabellas-menu-preview-a/investigacion/)** · [Descargar PDF](https://sebasb115.github.io/isabellas-menu-preview-a/investigacion/informe.pdf) · [Abrir fuente editable](notes/investigacion-propuesta-comercial-isabella-hero-a-wordpress-2026-10-16.md)

El informe resume la grabación y el alcance acordado, compara WordPress con otras opciones, explica la recomendación, separa la traducción automática como trabajo propio y enumera las partidas y decisiones necesarias para cotizar. Es investigación para revisión comercial: **la integración con WordPress todavía no está implementada**. El [análisis detallado de la reunión](notes/analisis-menu-isabella-2026-10-16.md) conserva la evidencia funcional.

**Cambio de alcance (20 de octubre de 2026):** el informe anterior conserva la propuesta histórica. Alejandro recomendó después Node + Firebase para la administración de datos de ambos restaurantes. El selector compartido de este repositorio organiza las demos actuales y no implementa aún esa arquitectura.

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

La carpeta `docs/` contiene la carta estática y una demostración pública de la central para GitHub Pages. `preview-a/` contiene el código de la carta y la central privada local; `scripts/` contiene el servidor y las comprobaciones. La central privada necesita un servidor Node y no funciona en GitHub Pages. Este prototipo no está conectado a WordPress ni a la web oficial. Antes de publicar contenido real se deben revisar nombres, ingredientes, precios y traducciones culinarias.

El selector compartido vive en `preview-a/central/` y se publica en `docs/central/` con `npm.cmd run build:central`. En el servidor local se abre en `/central/`; la administración de Isabella's allí conserva su inicio de sesión local. En GitHub Pages, cada restaurante abre directamente su login de demostración. Las antiguas URLs intermedias redirigen a esos accesos.

Fuente visual y de contenido: [menú oficial de Isabella's](https://isabellascr.com/#menu). Ver [detalle del Preview A](preview-a/README.md) y [análisis de la reunión](notes/analisis-menu-isabella-2026-10-16.md).
