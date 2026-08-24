# Modelos de detección automática

Esta carpeta está **vacía a propósito**. DempsterCan funciona perfectamente sin
ningún modelo: usa plantilla + marcado manual, que es lo que exige la
goniometría canina de todos modos.

Si quiere activar la detección automática:

```bash
pip install onnx onnxruntime pillow numpy
python3 tools/preparar_modelo.py rtmpose-ap10k --salida models/
```

Eso deja aquí `pose.onnx` y `modelo.json`. Además hay que copiar ONNX Runtime
Web a `vendor/ort/` (el script explica cómo al terminar).

**No se distribuye ningún peso de red neuronal en este repositorio** por
motivos de licencia: AP-10K es de uso no comercial y los pesos de
SuperAnimal-Quadruped son "Modified MIT" restringidos a uso académico.

## Por qué la detección automática nunca es suficiente

Ningún conjunto de datos público de pose animal anota los reparos óseos
palpables que necesita la goniometría canina. Todos anotan centros articulares
visuales, pensados para reconocimiento de acción y reconstrucción 3D.

| Reparo necesario | AP-10K | StanfordExtra | SuperAnimal |
|---|---|---|---|
| Espina escapular | no | no | no |
| Tubérculo mayor del húmero | aprox. | no | no |
| Epicóndilo lateral del húmero | aprox. | aprox. | aprox. |
| Apófisis estiloides ulnar (carpo) | **no** | sí | probable |
| Tuber sacrale / tuber ischiadicum | no | no | no |
| Trocánter mayor | aprox. | no | aprox. |
| Cóndilo femoral lateral | aprox. | aprox. | aprox. |
| Maléolo lateral (tarso) | **no** | sí | probable |
| Tuberosidad calcánea | no | no | no |

La solución de fondo es hacer *fine-tuning* con su propio esquema de reparos:
300–800 imágenes de perros en estación en vista lateral estricta, partiendo de
SuperAnimal-Quadruped como inicialización. Con ese punto de partida unos
cientos de imágenes suelen bastar.
