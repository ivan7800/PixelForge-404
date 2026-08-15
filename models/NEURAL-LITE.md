# PixelForge Neural Lite v1

Modelo neuronal local incluido en PixelForge 404 v6 para segmentación de primer plano sin red, API ni runtime externo.

- Arquitectura: MLP 12 → 16 → 8 → 1 con ReLU + sigmoide.
- Entradas: RGB, diferencia respecto al color de borde, distancia de color, saturación, borde/luminancia, posición normalizada y prior central.
- Entrenamiento: escenas sintéticas generadas localmente.
- Validación interna sobre el mismo dominio sintético: IoU medio ≈ 0,991.
- Tamaño del modelo: ~8 KB JSON.

La cifra anterior **no es un benchmark sobre fotografías reales**. El modelo está pensado como fallback neuronal rápido y totalmente offline. Si `models/u2netp.onnx` y ONNX Runtime Web están instalados localmente, PixelForge prioriza ese backend HQ y vuelve automáticamente a Neural Lite si falla.
