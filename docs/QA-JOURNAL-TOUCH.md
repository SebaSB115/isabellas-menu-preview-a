# Navegacion tactil de Journal V2

El lector paginado permite avanzar o retroceder con un deslizamiento horizontal sobre la pagina, incluidos los nombres de platos y las fotografias. Conserva los botones Anterior/Siguiente y el teclado. Un toque abre la ficha cuando esta habilitada; deslizar no la abre.

Tambien admite arrastrar con raton o lapiz. Reducir una ventana de escritorio al ancho de un movil no genera eventos tactiles: esta ruta se comprueba por separado con `maxTouchPoints=0`. El arrastre no debe abrir fichas ni iniciar el arrastre nativo de fotografias. Los clics normales mantienen su funcion.

Se excluyen los campos editables, los dialogos abiertos, los gestos verticales, los contactos multiples y los extremos de pantalla reservados al navegador. Los recursos del lector publicado incluyen una revision de contenido para evitar mezclar modulos antiguos y nuevos en cache.

## Verificacion reproducible

Desde la raiz del repositorio:

```sh
node scripts/check-journal-touch.mjs
node scripts/check-journal-touch.mjs --url https://sebasb115.github.io/isabellas-menu-preview-a/
```

La prueba usa entradas tactiles y de raton del navegador, no eventos TouchEvent sinteticos. Prepara datos exclusivamente en el almacenamiento del navegador de prueba para habilitar fichas; no escribe el catalogo del repositorio ni los datos del servidor.

Comprueba 320, 390, 768, 1024 y 1440 px, ES/EN, avance y retroceso, nombres, fotografias, fichas, indice, botones, teclado, cancelacion y multiples contactos. Recorre la carta completa y compara los identificadores para detectar productos perdidos o duplicados. Guarda capturas y un informe en el directorio temporal indicado al finalizar.

Validado localmente en Chrome con emulacion tactil: 55 productos, sin perdidas ni duplicados, sin desbordamiento horizontal. No equivale a una prueba fisica en Safari/iPhone, que queda pendiente.

El hosting sigue siendo una demostracion: datos e historial de PDF se guardan por navegador. No ofrece autenticacion real ni sincronizacion entre dispositivos.
