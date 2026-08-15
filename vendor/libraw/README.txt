PixelForge 404 — runtime LibRaw-WASM

En el repositorio fuente esta carpeta puede contener solo este aviso.

GitHub Pages: .github/workflows/pages.yml ejecuta tools/install-libraw.sh antes de subir el artefacto, fijando LibRaw-Wasm v1.6.0 y verificando SHA-256.

Local:
  Windows: powershell -ExecutionPolicy Bypass -File tools\install-libraw.ps1
  Linux/macOS: bash tools/install-libraw.sh

Archivos esperados después de instalar:
  index.js
  worker.js
  libraw.js
  libraw.wasm
