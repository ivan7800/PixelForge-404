# Security policy

PixelForge 404 procesa imágenes y proyectos localmente en el navegador. No incluye telemetría, cuentas ni subida de documentos a un servidor.

## Límites y archivos no confiables

- Los proyectos `.p404` se validan antes de reconstruir canvases y tienen límites de dimensiones, píxeles y número de capas.
- El importador PSD/PSB limita tamaño de archivo, dimensiones globales y tamaño de capas para reducir riesgos de agotamiento de memoria.
- Las exportaciones aplican un presupuesto de píxeles distinto para escritorio y dispositivos táctiles/móviles.
- En documentos gigantes se desactivan operaciones globales que requerirían buffers del tamaño completo.

## Dependencias vendorizadas

El despliegue de GitHub Pages instala LibRaw-WASM mediante `tools/install-libraw.sh`, fijado a una versión concreta y con SHA-256 comprobados. No se cargan scripts desde CDN en tiempo de ejecución.

## Reportar un problema

No publiques archivos privados o imágenes sensibles en un issue. Describe el comportamiento, navegador, versión, pasos de reproducción y, si hace falta, usa un archivo de prueba sin información personal.


## Release final v7.0.0

El núcleo portable está embebido en `index.html` y autorizado mediante hashes SHA-256 en la CSP. Esto evita `unsafe-inline` y elimina la dependencia de scripts externos para el arranque.
