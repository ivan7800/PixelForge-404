# PixelForge 404 v7.0.1 Final — QA Matrix

## Estado automatizado

| Comprobación | Estado |
|---|---|
| QA estático | PASS |
| JavaScript `node --check` | PASS |
| PSD v1 8-bit sintético | PASS |
| PSD v1 16-bit sintético | PASS |
| PSB v2 8-bit sintético | PASS |
| PSB v2 16-bit sintético | PASS |
| PSD con capa raster sintética | PASS |
| Neural Lite estructura | PASS |
| Crop tiled | PASS |
| Snapshot gigante rechazado | PASS |
| >1000 capas rechazadas | PASS |
| Manifest | PASS |
| Rutas/IDs/acciones | PASS |
| Recursos HTTP principales | PASS (200) |
| Bundle clásico sin `import`/`export` ESM | PASS |
| Restauración `PixelDocument` con private-brand válida | PASS |
| Chromium CDP: PNG/JPG/WebP 640×360 | PASS |
| Chromium CDP: 20 herramientas | PASS |
| Chromium CDP: 7 filtros | PASS |
| Chromium CDP: Undo/Redo | PASS |
| Chromium CDP: guardar/cargar `.p404` | PASS |
| Chromium CDP: exportar PNG | PASS |
| ZIP integrity | pendiente hasta empaquetado final |

## Navegadores/dispositivos

| Plataforma | Estado | Qué probar antes de certificar |
|---|---|---|
| Chrome Windows | No certificado físicamente | abrir/importar, pincel, capas, exportar, PWA, IndexedDB, RAW |
| Edge Windows | No certificado físicamente | mismos flujos + instalación PWA |
| Firefox Windows/macOS | Pendiente | Canvas, pointer, export WebP, teclado, PWA según soporte |
| Safari macOS | Pendiente | Canvas, IndexedDB, memoria, PWA, CSP/WASM |
| iPhone Safari | Pendiente | menú completo, inspector, touch targets, memoria, exportar, recuperación |
| iPad Safari + Pencil | Pendiente | presión, paneles, rotación/orientación, memoria |
| Android Chrome | Pendiente | PWA, touch, abrir/guardar, exportar, memoria |

## Checklist manual mínimo

1. Crear documento y dibujar con pincel/goma.
2. Importar JPG/PNG/WebP y un PSD real compatible.
3. Crear texto, forma, ajuste, grupo y Smart Layer.
4. Probar máscaras, transform, Warp y FX en documento moderado.
5. Guardar `.p404`, recargar página y volver a cargarlo.
6. Verificar autoguardado/restauración.
7. Abrir imagen >24 MP y comprobar modo tiled, pan/zoom y pincel/goma.
8. Confirmar que selección global/warp/máscara peligrosa se deshabilitan en tiled gigante.
9. Exportar PNG/JPEG/WebP y probar rechazo de exportación fuera del presupuesto.
10. En móvil: Nuevo, Abrir, Guardar, Cargar y Exportar deben permanecer accesibles mediante scroll horizontal de la barra superior.
11. Abrir/cerrar inspector móvil con botón, backdrop y Escape cuando proceda.
12. Navegar lista de capas con teclado; comprobar selección y botones con lector de pantalla.
13. Publicar por Actions y abrir RAW después de que el Service Worker controle la página.
14. Ejecutar `qa.html` en cada navegador objetivo y guardar resultados.

## Criterio de release

La v7.0 es **publicable**, pero no debe etiquetarse como “QA físico multiplataforma completo” hasta completar la tabla de dispositivos anterior con resultados reales.
