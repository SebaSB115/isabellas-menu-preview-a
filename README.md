# Isabella's Costa Rica · Preview A de la carta

**[Implementación V2 del 26 de octubre: Tabler, carta y menú impreso](notes/isabella-v2-tabler.html)**. Entrega local, sin publicar: administración con Tabler Core gratuito, Journal ES/EN, fotografía y detalle opcionales, avisos, QR e historial de PDFs. Fuente administrativa en `preview-a/admin`; la demo se regenera con `build:pages-admin` y `build:pages-journal`. Verificación: `check:admin`, `check:preview-a`, `check:admin-ui`, `check:v2` y `check:static`.

**[Estado de la entrega del 23 de octubre de 2026](ESTADO_2026-10-23.md)**: alcance, comprobaciones y límites del preview.

**Carta única vigente (27/10/2026):** Journal continuo, con índice lateral en escritorio y categorías desplegables en móvil, en `design-lab/journal-fluido.html`. La raíz local y pública abre esta carta. Las antiguas rutas Journal paginado, Il Libro y Borrador 1 solo redirigen a ella; sus lectores se retiraron de V2. La Central local comparte `/api/menu`; la demo pública comparte los cambios entre administración y carta únicamente en el mismo navegador. Validación: `node scripts/check-current-menu.mjs`; añadir `--url https://sebasb115.github.io/isabellas-menu-preview-a/` para comprobar el hosting.

Demostración independiente de la web oficial. Los datos conservan las nueve páginas originales y las traducciones históricas. La carta vigente utiliza únicamente ES/EN, detecta el idioma del navegador y permite cambiarlo manualmente. Los diseños anteriores se conservan en el historial de Git, sin opción para abrirlos en la carta.

**Iteración visual (20/10/2026):** portada de libro, índice de capítulos en escritorio y tipografía Fraunces de código abierto. El lector ajusta la ilustración y los platos para mostrar hoja y controles en una pantalla; al cambiar de página no desplaza el documento. La [dirección visual de ambas cartas](notes/direccion-visual-dos-cartas-2026-10-20.md) explica el criterio de marca y UX.

## Ver el avance

**[Abrir la vista navegable del Preview A](https://sebasb115.github.io/isabellas-menu-preview-a/)**

**[Abrir la demostración pública de la central](https://sebasb115.github.io/isabellas-menu-preview-a/admin/)**

**Impresión de la demo (28 de octubre):** Menú impreso permite vista previa, impresión, generación y descarga de PDF A4 horizontal en español e inglés, con el logotipo oficial y composición marfil y dorada en dos columnas. El historial de la demo se guarda en este navegador y detecta cambios del catálogo y del diseño; no necesita el servidor de la laptop. La composición y la adaptación reproducible del motor se documentan en [print-menu](preview-a/print-menu/README.md). Ejecuta `node scripts/sync-isabella-print.mjs --check` y `node scripts/check-browser-print.mjs`. El motor compartido y Boccantina conservan sus archivos independientes.

**[Elegir restaurante en la central compartida](https://sebasb115.github.io/isabellas-menu-preview-a/central/)**: entrada de demostración de la versión 2 para Isabella's y Boccantina. Cada restaurante conserva sus propias vistas y datos. Boccantina permite probar productos, categorías y disponibilidad; la demo pública no incluye autenticación privada real ni Firebase.

La central publicada en GitHub Pages empieza en un **login de demostración** (`demo-isabella` / `vista2026`). Es una pantalla de acceso visual, no autenticación real ni control de permisos del servidor: los archivos estáticos siguen siendo públicos. Permite probar la edición y ver el resultado en Journal dentro del mismo navegador; esos cambios no llegan a otros visitantes ni a `isabellascr.com`. La contraseña y el servidor privado local no se publican. El editor y la carta estáticos se generan con `npm.cmd run build:pages-admin` y `npm.cmd run build:pages-journal`.

### Acceso privado local por restaurante

En la rama `version/2-simple`, inicia `npm.cmd run serve:preview-a` aquí (puerto 4180) y `npm.cmd run serve:v2` en `../boccantina-preview` (puerto 4175). Abre **http://127.0.0.1:4180/central/** y elige Isabella's o Boccantina. La opción de Boccantina abre el login de V2; cada restaurante conserva su propia sesión.

Para revisión desde otro equipo, el selector V2 de demostración se publica en <https://sebasb115.github.io/boccantina-preview/central/>. La página pública de Isabella's se genera desde `version/2-simple/docs` y Boccantina publica `version/2-simple/docs-v2`. Ambas abren sus logins de demostración. Ninguna de esas pantallas está conectada al servidor privado ni a los datos de producción.

El usuario propietario de Isabella's se configura con `npm.cmd run admin:setup`. Boccantina conserva su cuenta propietaria independiente, configurada desde su propio repositorio. Las contraseñas se guardan como hash fuera de Git. Este acceso es **local de preview**; GitHub Pages no ejecuta los servidores ni protege sus demos estáticas. Para acceso privado desde Internet harán falta backend alojado, HTTPS y almacenamiento persistente.

### Usuarios y permisos en la central local

La ruta de datos puede fijarse en `data/local-preview.json` (fuera de Git) con `{"dataDir":"ruta/relativa/al/repositorio"}`. El servidor y `admin:setup` usan esa misma carpeta al reiniciar. `ISABELLA_DATA_DIR` tiene prioridad para entornos explícitos y pruebas aisladas; sin configuración se conserva `data/`. Este archivo solo selecciona la ubicación: no copia ni reinicia cuentas, catálogos o ediciones.

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
