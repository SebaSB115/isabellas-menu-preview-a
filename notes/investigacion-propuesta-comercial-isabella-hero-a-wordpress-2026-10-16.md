# Isabella’s · investigación para propuesta comercial

**Proyecto:** carta digital Hero A / Preview A<br>
**Fecha:** 16 de octubre de 2026<br>
**Estado:** investigación y alcance propuesto; no constituye una implementación en WordPress ni una cotización cerrada.

## 1. Decisión recomendada

Desarrollar la **central de carta dentro del WordPress que ya utiliza isabellascr.com**, mediante un plugin específico para el menú. El restaurante iniciaría sesión con un usuario individual y un rol limitado a la carta. Desde ahí podría editar categorías, platos, descripciones en español, precios, variantes, orden, visibilidad e imágenes. El **Hero A** sería la experiencia pública de lectura: una revista responsive, con giro de páginas, ilustración a la izquierda y datos editables a la derecha.

Es la ruta más conveniente para esta propuesta porque aprovecha una instalación y un sistema de usuarios existentes. WordPress genera pantallas administrativas para tipos de contenido propios y recomienda definirlos en un plugin para que sobrevivan a cambios de tema. También permite roles y permisos específicos. Esto reduce el número de plataformas que el cliente debe aprender y administrar, aunque **el desarrollo, la integración y el mantenimiento siguen teniendo costo**. [WordPress: tipos de contenido](https://developer.wordpress.org/plugins/post-types/registering-custom-post-types/) · [WordPress: roles y capacidades](https://developer.wordpress.org/plugins/users/roles-and-capabilities/).

> **Punto de honestidad comercial:** elegir WordPress resuelve la base editorial y el acceso; **WordPress no traduce automáticamente los platos por sí solo**. La traducción, su infraestructura y la revisión de calidad se presupuestan como trabajo específico.

## 2. Qué existe y qué falta

| Estado observado o acordado | Implicación para la propuesta |
|---|---|
| La web oficial publica **MENU 2026** como libro de **9 páginas**. Ese libro es la fuente autorizada; el video de la reunión aportó requisitos, no el catálogo definitivo. | La carga inicial se coteja contra esas nueve páginas, no contra el menú antiguo. |
| Hero A ya tiene un **preview independiente** de revista: categorías, platos y precios editables en la página derecha; arte sin nombres ni precios en la izquierda; giro de hoja y diseño RTL. | Sirve para enseñar la dirección visual y funcional; aún hay que conectarlo a datos administrados por el cliente. |
| El catálogo de demostración tiene **8 categorías y 55 platos**; hay **5 precios** que requieren confirmación del restaurante por falta de legibilidad en la fuente. | La revisión y aprobación de contenido es una dependencia de la migración. No se deben inventar importes. |
| El [Hero A](https://sebasb115.github.io/isabellas-menu-preview-a/) y una [demo pública de la central](https://sebasb115.github.io/isabellas-menu-preview-a/admin/) están en GitHub Pages, con código en un [repositorio separado](https://github.com/SebaSB115/isabellas-menu-preview-a). También existe una central privada **local de prototipo**. | La demo pública permite probar formularios, categorías, precios e imágenes; guarda los cambios solo en el navegador de cada visitante, sin contraseña ni sincronización con la carta pública. El servidor privado local no está desplegado. Pages aloja archivos estáticos y no sustituye el backend administrativo. [GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). |
| No se ha validado acceso al panel privado, permisos de instalación, servidor, copias de seguridad ni entorno de pruebas del WordPress oficial. | La integración en producción queda condicionada a una auditoría técnica breve y al acceso autorizado. |

La investigación de la reunión se documentó previamente en el [análisis de requisitos](https://github.com/SebaSB115/isabellas-menu-preview-a/blob/main/notes/analisis-menu-isabella-2026-10-16.md). El pedido principal es **consulta de menú**, no pedidos, pagos ni reservas.

## 3. Cómo sería la solución propuesta

**Administración.** Un plugin propio crearía contenidos de *plato* y *categoría*. Cada plato pertenecería a una categoría y tendría un único nombre y una única descripción originales, escritos en español, además de precio en colones, variantes si corresponden, imagen opcional, posición y estado borrador/publicado. Cada categoría tendría nombre, orden e imagen artística para el lado izquierdo de la revista. El editor podría cargar o reemplazar esa imagen desde Medios; WordPress dispone de imágenes adaptables, pero el plugin debe definir recorte, proporción, vista previa y alternativas móviles para evitar que texto o figuras queden cortados. [WordPress: taxonomías](https://developer.wordpress.org/reference/functions/register_taxonomy/) · [WordPress: imágenes adaptables](https://developer.wordpress.org/apis/responsive-images/).

**Acceso.** La central viviría dentro del panel WordPress, con usuarios individuales y un rol **Gestor de carta** que solo vea y modifique estos contenidos. No hace falta una contraseña compartida adicional ni un segundo login paralelo. Las operaciones privadas deben comprobar permisos; si usan la API REST dentro de WordPress, la documentación oficial exige sesión, capacidades y *nonce*. El visitante solo recibiría datos publicados. [Roles](https://developer.wordpress.org/plugins/users/roles-and-capabilities/) · [Autenticación REST](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/) · [Permisos de endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/).

**Publicación.** El Hero A consultaría una salida estructurada del plugin, con versión y validación. Un cambio de precio se escribe una sola vez y se refleja en todos los idiomas; el precio no se traduce. La publicación requiere borradores, vista previa, historial de cambios y recuperación. El libro actual puede permanecer accesible hasta que el reemplazo sea aprobado; el alcance exacto de convivencia depende de la estructura del sitio.

**Idiomas.** El editor escribe **un nombre y una descripción en español**. Al guardar, un proceso genera y conserva traducciones para inglés, alemán, árabe y hebreo. El sitio muestra la versión del idioma elegido o detectado; los textos traducidos se sirven ya preparados, sin traducirlos en cada visita. Debe existir estado de revisión y posibilidad de corregir una traducción puntual, especialmente nombres gastronómicos. Ante un fallo del motor, se conserva la última versión aprobada o se deja el cambio en borrador; no se presenta español como si fuese texto traducido. Para árabe y hebreo se cambia dirección de lectura, orden de navegación y sentido del giro, y se aíslan números y precios. [W3C: dirección del texto](https://www.w3.org/International/questions/qa-html-dir.en.html).

**Motor de traducción.** El prototipo local ha explorado [Argos Translate](https://github.com/argosopentech/argos-translate), biblioteca abierta de traducción sin API de pago. Es una **opción a validar**, no una garantía de despliegue en el hosting WordPress: puede requerir un proceso Python separado, recursos de CPU/memoria y revisión de las licencias de los modelos concretos. Antes de prometer traducción automática sin cuotas, se debe ejecutar una prueba con el servidor real o un trabajador autogestionado y revisar calidad en los cinco idiomas. Si no es viable, la propuesta deberá presentar al cliente una alternativa explícita y su costo operativo antes de contratarla.

## 4. Opciones comparadas

| Opción | Ventaja | Límite relevante | Evaluación |
|---|---|---|---|
| **Plugin en el WordPress existente** | Reutiliza panel, usuarios, Medios y API; permite rol limitado a la carta; sin licencia CMS adicional obligatoria. | Requiere desarrollo y acceso al sitio; traducción es componente aparte. | **Recomendada**, condicionada a auditoría de hosting y permisos. |
| **Sanity Free** | Editor visual y API alojados; evita desarrollar parte de la infraestructura CMS. | Agrega otra plataforma. El plan gratuito ofrece Administrator y Viewer, pero no Editor; dar acceso a quien gestiona la carta exige revisar el alcance real del permiso. [Sanity: precios y roles](https://www.sanity.io/pricing). | Alternativa si no se autoriza tocar WordPress, preferiblemente en proyecto aislado. |
| **Firebase + panel propio** | Control completo del modelo y la interfaz. | Hay que construir administración, permisos y archivos. Cloud Storage requiere activar el plan Blaze de pago por uso, aunque algunos consumos puedan quedar en cuota sin cargo. [Firebase: Storage](https://firebase.google.com/docs/storage/faq-and-troubleshooting). | Menor ajuste a la preferencia de evitar servicios con facturación. |
| **Central Node local y demo en GitHub Pages** | Permiten demostrar el flujo de edición sin afectar la web oficial; la demo pública es accesible mediante URL. | El servidor local no está operado en producción; la demo de Pages almacena cambios únicamente en cada navegador. [GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). | Material de validación, no solución final de administración. |
| **Traducción automática solo en el navegador** | Puede mostrar varios idiomas rápidamente. | No entrega versiones editoriales almacenadas y revisables de cada plato; la calidad y el resultado dependen del servicio externo. | No recomendada como base del catálogo multilingüe. |

La comparación favorece a WordPress por **encaje con la infraestructura existente y control editorial**, no porque sea “gratis”: hosting, desarrollo, copias, soporte y traducción pueden generar costos.

## 5. Alcance sugerido para cotizar

1. **Descubrimiento técnico.** Revisar acceso autorizado a WordPress, tema/plugins, versión PHP, capacidad de instalar plugin, Medios, copias de seguridad, entorno de pruebas y ruta de publicación. Entregar viabilidad y plan de reversión.
2. **Modelo y central.** Crear plugin, formularios de platos/categorías, precio y variantes, gestión de imágenes, orden, borradores, permisos de Gestor de carta y validación de entradas.
3. **Contenido inicial.** Cotejar las nueve páginas oficiales, importar los 55 platos y ocho categorías del preview, pedir los cinco precios pendientes y obtener aprobación editorial antes de publicar.
4. **Multidioma.** Integrar y probar traducción al guardar, almacenamiento/revisión de versiones, cambio automático o manual de idioma y composición RTL. La viabilidad del motor sin servicio de pago es una **puerta de decisión** después de probar el hosting y las licencias.
5. **Experiencia pública.** Conectar Hero A al catálogo publicado; conservar revista, animación de hoja, arte adaptable, navegación por categoría, legibilidad móvil y accesibilidad básica. Medir rendimiento con imágenes reales.
6. **Salida controlada.** Probar permisos, altas/cambios/bajas, precios, idiomas, RTL, restauración y copias; capacitar a un editor; publicar solo tras aprobación y con reversión preparada.

### Criterios de aceptación que hacen la propuesta verificable

- Cambiar un precio una vez actualiza la carta pública en los cinco idiomas sin alterar el importe.
- Crear un plato exige únicamente nombre y descripción originales en español; las cuatro traducciones se generan y quedan identificadas para revisión antes de publicarse.
- Un Gestor de carta puede editar categorías, platos e imágenes, pero no usuarios, plugins ni otras secciones del sitio.
- Una imagen nueva se encuadra en escritorio y móvil sin necesidad de editar código; el editor puede comprobarla antes de publicar.
- Árabe y hebreo invierten lectura y navegación de la revista; números y precios siguen legibles.
- Un borrador no aparece al público; una versión anterior puede recuperarse; los cinco precios pendientes quedan confirmados por Isabella’s.

## 6. Condiciones comerciales y decisiones pendientes

**Presupuestar por bloques**, separando desarrollo inicial, infraestructura de traducción, revisión lingüística humana, carga de contenido y soporte posterior. Esto permite una oferta base sin suscripciones obligatorias y partidas opcionales transparentes. No conviene fijar precio ni plazo cerrado hasta conocer el hosting, los permisos, el material final y quién aprobará las traducciones.

**Dependencias del cliente:** acceso autorizado a un entorno de pruebas WordPress; responsable editorial; confirmación de cinco importes; derecho de uso de imágenes; aprobación de nombres y descripciones; definición de quién valida inglés, alemán, árabe y hebreo.

**Fuera del alcance base:** pedidos, pagos, reservas, SEO multilingüe de todo el sitio, fotografía nueva, licencias o API de traducción de pago, y mantenimiento indefinido. Si se requieren, se cotizan aparte.

**Siguiente decisión:** aprobar esta arquitectura para preparar una cotización con esfuerzo y cronograma después de la auditoría técnica. Hasta entonces, el [Hero A](https://sebasb115.github.io/isabellas-menu-preview-a/) y la [demo de la central](https://sebasb115.github.io/isabellas-menu-preview-a/admin/) muestran las vistas para revisión; **WordPress aún no está conectado**.
