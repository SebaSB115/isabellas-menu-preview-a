# Menú de Isabella's: análisis de la grabación y preview A

**Actualización de gestión editorial (16/10/2026):** la recomendación inicial limitada a Sanity y Firebase se amplió a ocho opciones en el [informe de administración del menú](gestion-administrativa-menu-isabella-2026-10-16.html). La recomendación vigente es un plugin propio sobre el WordPress existente, sujeto a confirmar acceso técnico y entorno de pruebas; Sanity Free en un proyecto exclusivo del menú queda como alternativa.

Fecha de revisión: 16 de octubre de 2026. Fuente principal: [grabación de Jam](https://jam.dev/c/cbb6ce28-4240-498e-a2a3-8dbb6b72b830), 2:49. Se revisó la transcripción de Jam y se contrastó con una transcripción local del audio. Se procesaron todos los fotogramas para detectar cambios de escena y se extrajeron 169 muestras a intervalos de un segundo para inspección visual. Los intervalos siguientes agrupan las pantallas consecutivas que muestran el mismo estado.

## Qué muestra la grabación

| Tiempo | Evidencia visual | Explicación oral y alcance |
| --- | --- | --- |
| 0:00–0:03 | Portada del libro digital «Isabella's Menú». | Presenta el menú actual como referencia. |
| 0:03–0:25 | Pasa las páginas del libro: entradas, ensaladas y sopas, pastas y risotto, carnes, pizzas, postres y bebidas. Hay nombres, descripciones y precios en colones integrados en las páginas. | Pide un repositorio y preparación del trabajo; indica que se debe mejorar el diseño. |
| 0:25–1:11 | Deja abierta la doble página de cócteles y cafés. | Define la primera versión: menú de consulta, sin pedidos; detección del idioma del navegador; menciona español, inglés, alemán, árabe y hebreo. |
| 1:11–1:19 | Retrocede por el libro hasta entradas y ensaladas. | Pide también selección manual de idioma y contempla lectura de derecha a izquierda para árabe y hebreo. |
| 1:19–2:00 | Permanece en la doble página de entradas, ensaladas y sopas. | Solicita una experiencia más amigable y documentar el patrón de un menú digital de visualización. |
| 2:00–2:29 | Abre `sanity.io/pricing`, el sitio de Sanity y su documentación. | Solicita comparar Sanity con un administrador propio sobre Firebase para que el cliente edite precios, platos, nombres, descripciones e imágenes. |
| 2:29–2:49 | Regresa al menú de Isabella's. | Reitera que el cliente debe administrar su contenido y pide un análisis detallado para la propuesta comercial. |

La transcripción automática no permite recuperar con seguridad una expresión al inicio sobre el tipo de rediseño ni una referencia técnica alrededor de 1:20. No se convierten esas expresiones ambiguas en requisitos. Sí son inequívocos el alcance de consulta, los idiomas, la lectura RTL y la necesidad de gestión editorial.

### Audio revisado por bloques

| Tiempo | Contenido comprensible del audio |
| --- | --- |
| 0:00–0:22 | Identifica el menú de Isabella's y solicita preparar un repositorio con las herramientas de trabajo. Una expresión sobre el tipo de rediseño no se entiende con seguridad. |
| 0:22–0:35 | Pide mejorar el diseño y aclara que la primera versión no incorpora pedidos. |
| 0:35–0:59 | Solicita mostrar el menú según el idioma del navegador; cita inglés, alemán, árabe y hebreo. |
| 0:59–1:18 | Advierte que árabe y hebreo leen de derecha a izquierda y solicita también elección manual del idioma. |
| 1:18–1:42 | Pide un menú más fácil de consultar y documentar cómo debe funcionar uno de visualización. La referencia técnica intermedia es ambigua. |
| 1:42–2:02 | Plantea que el cliente edite precios, agregue platos y cambie nombre, descripción e imagen. |
| 2:02–2:31 | Explica que conoce Sanity como gestor de contenido y pregunta si cubre las necesidades del cliente. |
| 2:31–2:49 | Compara esa opción con desarrollar otra aplicación administrativa sobre Firebase y solicita un análisis detallado para cotizar. |

## Regla funcional para la primera versión

1. El visitante entra a un menú digital adaptable a móvil y escritorio y consulta categorías, platos, descripciones, fotos y precios. No hay carrito, pago ni envío de pedidos.
2. En la primera visita se elige el primer idioma compatible entre las preferencias del navegador; si ninguno coincide, se muestra español. El selector manual prevalece sobre la detección automática y guarda la elección.
3. El alcance mencionado en el audio comprende español, inglés, alemán, árabe y hebreo. Se deben traducir tanto la interfaz como los datos del menú. La detección del navegador por sí sola no traduce el contenido.
4. En árabe y hebreo se establece `lang` y `dir="rtl"` en el documento y se adapta el diseño, la navegación y el texto mixto. El precio y los números deben seguir siendo legibles.
5. El cliente puede crear y modificar categorías y platos; editar nombre, descripción, precio, imagen, orden de aparición y visibilidad. El contenido publicado se consulta en el menú público. Se recomienda vista previa de cambios y validación de traducciones antes de publicar.

La navegación por categorías, una ficha legible por plato, buen contraste, controles táctiles y carga eficiente de imágenes son propuestas de diseño para cumplir la petición de un menú más amigable. El audio no especifica buscador, filtros, alérgenos, reservas ni pedidos; cada uno requeriría definición aparte.

## Estado actual comprobado

- La página pública [isabellascr.com/#menu](https://isabellascr.com/#menu) usa WordPress y el visor de libro `dflip`. Al momento de la revisión expone dos libros: «MENU», con **15 imágenes JPG** (`2026/05`), y «MENU 2026», con **9 imágenes WebP** (`2026/06`). La grabación muestra el primero, de 15 páginas. **El usuario precisó que el libro de nueve páginas «MENU 2026» publicado en la web es la fuente autorizada para este trabajo.** La grabación aporta requisitos de funcionamiento, no el catálogo de platos para la vista previa.
- En ese visor los nombres, descripciones y precios se presentan dentro de las imágenes de las páginas. Para que el cliente cambie un precio sin rehacer una página gráfica, hay que construir un catálogo estructurado y revisar manualmente la extracción de los datos. Esto aplica con ambos CMS.
- El repositorio local `isabellas-preview` contiene una copia visual de la web y un preview A separado en `preview-a/`. El preview se basa exclusivamente en las nueve imágenes del libro «MENU 2026» y un catálogo local estructurado. Su diseño combina ocho ilustraciones editadas sin nombres ni precios con contenido traducido en 14 pliegos navegables. La hoja de lectura muestra platos y precios visibles; cinco importes que faltan en la fuente se señalan como pendientes. Las nueve páginas originales se conservan para cotejo. Al pasar de página se anima una hoja 3D; el libro y su giro se invierten para árabe y hebreo. No tiene base de datos, credenciales, CMS conectado ni remoto Git configurado.
- Los nombres, descripciones y precios del preview se transcribieron de las nueve páginas oficiales. Cuando la imagen no muestra un precio legible, el dato queda sin precio; se requiere una revisión del restaurante para completar y aprobar el catálogo. Las traducciones del preview también requieren revisión gastronómica por hablantes competentes antes de publicar.

## Sanity frente a Firebase para este alcance

| Criterio | Sanity Studio | Firebase con administrador propio |
| --- | --- | --- |
| Edición de platos e imágenes | Proporciona formularios de contenido, campos de imagen, borradores y publicación; hay que modelar categorías, platos y validaciones. | Firestore y Storage guardan datos y archivos; hay que construir los formularios, carga de imágenes, validaciones y publicación. La consola Firebase permite editar documentos, pero es una herramienta técnica, no un panel editorial para el restaurante. |
| Traducciones | Permite modelar campos o documentos por idioma; las traducciones se redactan/revisan aparte. Para platos con precio e imagen compartidos convienen campos localizados dentro de un mismo documento. | Se debe diseñar el mismo modelo multidioma y toda su interfaz editorial. Firebase tampoco traduce por sí mismo. |
| Permisos | El plan Free actual incluye roles de administrador y lector; el rol Editor aparece en Growth. Si el cliente necesita editar sin administración global, presupuestar Growth u otra configuración contractual validada. | Auth y reglas permiten permisos a medida, pero exigen implementación y mantenimiento propios. |
| Coste y operación | Free figura a USD 0 con límites y datos públicos; Growth figura desde USD 15 por puesto/mes, con límites y posibles cargos adicionales. Incluye alojamiento del Studio. | Firestore tiene cuota sin coste y después cobra por uso. Cloud Storage figura bajo Blaze en la tabla actual. También se presupuestan hosting del panel, mantenimiento, seguridad y evolución de la aplicación. |
| Ajuste a esta versión | Encaja con edición de catálogo y publicación de contenido. Reduce desarrollo del panel. | Tiene sentido si se confirma una futura aplicación operativa con flujos, roles o reglas de negocio que justifican un panel hecho a medida. |

**Recomendación actualizada:** preparar la propuesta base con un **plugin propio de menú dentro del WordPress existente**, sin licencias de CMS de pago, y conectar después el frontend de revista. Si no se permite instalar ese plugin, evaluar un proyecto Sanity Free dedicado al menú, aclarando que Free solo ofrece roles Administrator y Viewer. Firebase exige construir el administrador completo y Cloud Storage requiere activar facturación Blaze; no es la opción preferida bajo el requisito de evitar funciones de pago. El razonamiento y las demás alternativas están en el [informe ampliado](gestion-administrativa-menu-isabella-2026-10-16.html). Esta decisión no implica publicar ni conectar el sitio actual todavía.

La elección del CMS no resuelve por sí misma la traducción, la dirección RTL ni la migración desde páginas gráficas. Esos trabajos deben figurar como partidas separadas en la propuesta.

## Partidas para la propuesta comercial

1. Revisión y aprobación del catálogo de «MENU 2026»: verificar la transcripción de platos, variantes de precio, categorías e imágenes, y completar precios no publicados o ilegibles.
2. Modelo editorial y carga de datos: categorías, platos, nombres y descripciones localizados, precio en CRC, fotos, orden, visibilidad y validaciones.
3. Traducción y revisión gastronómica de los cinco idiomas; definir quién provee y aprueba cada traducción.
4. Diseño y desarrollo del menú responsivo, selector de idioma, fallback y soporte RTL; pruebas en móvil y escritorio.
5. Desarrollo y configuración del administrador del menú en WordPress, rol editorial limitado, vista previa, manual breve y formación del cliente; presupuestar Sanity Free solo como alternativa condicionada.
6. Integración con la web existente, dominio/ruta, QA de contenido y despliegue como fase autorizada aparte.

Variables de precio aún abiertas: aprobación del catálogo transcrito, fotos individuales de platos, cantidad de editores, quién aporta y aprueba traducciones, ruta de publicación, profundidad de integración con WordPress y si se requieren funcionalidades adicionales. No es fiable cerrar una cotización sin esas decisiones.

## Fuentes técnicas consultadas

- [Planes, roles y cuotas de Sanity](https://www.sanity.io/pricing)
- [Localización de contenido en Sanity](https://www.sanity.io/docs/studio/localization)
- [Imágenes en Sanity Studio](https://www.sanity.io/docs/studio/image-type)
- [Precios de Firebase](https://firebase.google.com/pricing)
- [Qué permite la consola de Firestore](https://firebase.google.com/docs/firestore/using-console)
- [Preferencias de idioma del navegador](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages)
- [Dirección de lectura en HTML](https://www.w3.org/International/questions/qa-html-dir.en.html)
