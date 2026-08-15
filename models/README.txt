PixelForge 404 v6 incluye `pixelforge-neural-lite.json`, por lo que “Seleccionar sujeto IA” funciona offline sin descargar nada.

Backend HQ opcional:
- models/u2netp.onnx
- vendor/onnxruntime/ort.min.js + WASM de la misma versión
- vendor/onnxruntime/ort.webgpu.min.js opcional

El adaptador HQ espera entrada NCHW [1,3,320,320] y usa la primera salida como mapa de saliencia. Si el backend HQ no existe o falla, PixelForge vuelve automáticamente a Neural Lite.
