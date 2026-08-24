# vendor/

Aquí va ONNX Runtime Web si desea activar la detección automática.
Copie **de un mismo paquete npm de `onnxruntime-web`**:

```
vendor/ort/ort.min.js
vendor/ort/ort-wasm-simd-threaded.wasm
vendor/ort/ort-wasm-simd-threaded.mjs
```

El bundle JS y los binarios `.wasm` deben venir de la misma versión: si se
mezclan, ORT Web falla al inicializar por desajuste de nombres minificados.

Nada más se descarga en tiempo de ejecución. La app no contacta con ningún CDN.
