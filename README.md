# PixelForge 404 v7.1 UX/A11Y

Editor gráfico web/PWA local-first preparado para GitHub Pages. Incluye capas raster, texto, shapes, grupos, Smart Layers 404, máscaras, ajustes, filtros, selecciones, Warp/Perspective, historial, proyecto `.p404`, PSD/PSB, soporte RAW mediante LibRaw-WASM, compositor tiled e IA neuronal local.

## v7.1 UX / A11Y

Esta release conserva el motor gráfico de v7.0.1 e incorpora una capa progresiva de experiencia, accesibilidad y móvil:

- inspector por pestañas (`Todo`, `Capas`, `Propiedades`, `Ajustes`, `Historial`);
- navegación de herramientas y capas por teclado;
- mejoras ARIA y live region;
- foco visible reforzado;
- touch targets de 44 px;
- inspector móvil con backdrop y Escape;
- soporte `prefers-reduced-motion` y `forced-colors`;
- sin `unsafe-inline`, sin CDN y sin backend.

La capa v7.1 se sirve mediante recursos locales (`css/pf-v7.1.css` y `js/pf-v7.1.js`) integrados en la PWA. El Service Worker v7.1 actualiza la caché y aplica la capa al documento publicado sin sustituir el núcleo gráfico.

## Abrir archivos

`Abrir` usa **inputs de archivo nativos**. No existe `fileInput.click()` ni un botón decorativo que dispare un input oculto mediante JavaScript. Hay tres puntos de entrada equivalentes: barra superior, bienvenida e inspector. La carga de proyectos `.p404` usa el mismo enfoque nativo.

Formatos principales: PNG, JPEG, WebP, GIF estático, SVG, PSD/PSB y RAW compatibles con LibRaw.

## Ejecutar

### GitHub Pages — recomendado
Publica la rama `main` mediante GitHub Pages. La PWA usa rutas relativas y está preparada para ejecutarse bajo `/PixelForge-404/`.

### Servidor local
```bash
python -m http.server 8080
```

Abre `http://localhost:8080/`.

## QA

```bash
python3 tools/qa-static.py
node tools/qa-node.mjs
```

La build v7.1 integrada fue validada antes de publicación con QA estático, pruebas Node del motor y QA específico de accesibilidad/UX. Los tests del motor incluyen PSD/PSB sintéticos 8/16-bit, Neural Lite, tiled crop, restauración de snapshots, límites de seguridad y regresiones del selector de archivos en iOS.

## Recuperar una instalación antigua

Si una URL publicada insiste en servir una versión anterior, abre una vez `RESET-PWA.html`. Borra exclusivamente Service Workers y cachés `pixelforge-404-*` del sitio y vuelve a `index.html`.

## Privacidad y seguridad

- Sin cuentas.
- Sin telemetría.
- Sin backend obligatorio.
- Edición local.
- CSP restrictiva.
- Sin scripts de CDN en tiempo de ejecución.

## Documentación

- `QA-MATRIX.md` — matriz general de pruebas.
- `V7.1-RELEASE-NOTES.md` — cambios de la release.
- `V7.1-BUILD-QA.md` — resultados de QA de la integración.
- `SECURITY.md` — seguridad.
- `THIRD-PARTY-NOTICES.md` — terceros/licencias.
