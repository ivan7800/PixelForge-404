# PixelForge 404 v7.0.0 Final

Editor gráfico web/PWA local-first preparado para GitHub Pages. Incluye capas raster, texto, shapes, grupos, Smart Layers 404, máscaras, ajustes, filtros, selecciones, Warp/Perspective, historial, proyecto `.p404`, PSD/PSB, soporte RAW mediante LibRaw-WASM durante el despliegue, compositor tiled e IA neuronal local.

## Abrir archivos

`Abrir` usa **inputs de archivo nativos**. No existe `fileInput.click()` ni un botón decorativo que dispare un input oculto mediante JavaScript. Hay tres puntos de entrada equivalentes: barra superior, bienvenida e inspector. La carga de proyectos `.p404` usa el mismo enfoque nativo.

Formatos principales: PNG, JPEG, WebP, GIF estático, SVG, PSD/PSB y RAW compatibles con LibRaw.

## Ejecutar

### GitHub Pages — recomendado
1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
3. Haz `push` a `main`.
4. El workflow `.github/workflows/pages.yml` ejecuta QA, instala el runtime RAW verificado y despliega.

### Servidor local
```bash
python -m http.server 8080
```
Abre `http://localhost:8080/`.

### Doble clic en index.html
El núcleo principal está embebido en `index.html`, por lo que edición básica e importación de formatos de navegador no dependen de ES Modules externos. PWA, Service Worker y RAW profesional requieren HTTP/HTTPS.

## QA
```bash
python3 tools/qa-static.py
node tools/qa-node.mjs
```

Los tests cubren integridad DOM, handlers, CSP, PWA, PSD/PSB sintéticos 8/16-bit, restauración de snapshots, límites de seguridad y regresiones del selector de archivos.

## Recuperar una instalación antigua
Si una URL publicada insiste en servir una versión anterior, abre una vez `RESET-PWA.html`. Borra exclusivamente Service Workers y cachés `pixelforge-404-*` del sitio y vuelve a `index.html`.

## Privacidad
- Sin cuentas.
- Sin telemetría.
- Sin backend obligatorio.
- Edición local.
- CSP restrictiva.

## Documentación
- `FINAL-REPORT.md` — estado de la release.
- `AUDIT-REPORT.md` — auditoría técnica.
- `QA-MATRIX.md` — matriz de pruebas físicas pendientes/completadas.
- `SECURITY.md` — seguridad.
- `THIRD-PARTY-NOTICES.md` — terceros/licencias.
- `CHANGELOG.md` — historial.

## Publicación por Git
```bash
git init
git add .
git commit -m "Release PixelForge 404 v7.0.0"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/PixelForge-404.git
git push -u origin main
```
