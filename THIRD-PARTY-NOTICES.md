# Third-party notices

## LibRaw-Wasm

PixelForge contiene un adaptador y scripts de instalación para `ybouane/LibRaw-Wasm`, fijados a la release **v1.6.0**. El repositorio fuente de PixelForge no necesita almacenar el binario para funcionar como editor general; el workflow de GitHub Pages lo descarga durante el despliegue y verifica SHA-256 antes de incorporarlo al artefacto publicado.

La distribución y uso de LibRaw-Wasm y de las bibliotecas que integra están sujetos a los avisos/licencias de sus respectivos proyectos. Antes de redistribuir una build comercial empaquetada, conserva y revisa esos avisos upstream.

## ONNX Runtime Web / U²-NetP

La integración HQ es opcional. PixelForge no afirma incluir ONNX Runtime ni U²-NetP si no están físicamente presentes en `vendor/onnxruntime/` y `models/u2netp.onnx`.

## PixelForge Neural Lite

El modelo `models/pixelforge-neural-lite.json` y el código de inferencia `js/neural-ai.js` forman parte de PixelForge 404.
