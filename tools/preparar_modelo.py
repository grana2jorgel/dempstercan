#!/usr/bin/env python3
"""
preparar_modelo.py — Prepara un modelo de estimación de pose canina en formato
ONNX cuantizado (int8) para que DempsterCan lo ejecute dentro del navegador,
sin conexión, con ONNX Runtime Web.

    python3 tools/preparar_modelo.py rtmpose-ap10k --salida models/

--------------------------------------------------------------------------
LEA ESTO ANTES DE EMPEZAR
--------------------------------------------------------------------------
Ningún conjunto de datos público de pose animal anota los reparos óseos que
exige la goniometría canina. Todos etiquetan "centros articulares" visuales.
Faltan sistemáticamente: espina escapular, tubérculo mayor del húmero,
epicóndilos laterales, apófisis estiloides ulnar, tuber sacrale, tuber
ischiadicum, trocánter mayor, maléolo lateral y tuberosidad calcánea.

Cobertura real por conjunto de datos:

  AP-10K / APT-36K (17 kp)  hombro, codo, cadera, rodilla, pata (aprox.)
                            NO tiene carpo ni tarso.
  StanfordExtra (24 kp)     3 puntos por miembro: da carpo y tarso correctos.
                            NO tiene hombro ni cadera.
  SuperAnimal-Quadruped     39 kp, 3 puntos por miembro ("thai", "knee", "paw").
    (39 kp)                 La correspondencia anatómica de "thai" en el
                            miembro torácico NO está documentada: verifíquela
                            usted etiquetando 20–30 imágenes antes de confiar.

Conclusión: la detección automática es SIEMPRE un punto de partida. La app lo
declara en pantalla y exige corrección manual. Si quiere detección realmente
útil, la vía correcta es hacer fine-tuning con SU PROPIO esquema de reparos
goniométricos (300–800 imágenes de perros en estación, vista lateral estricta),
partiendo de SuperAnimal-Quadruped como inicialización.

--------------------------------------------------------------------------
LICENCIAS — compruébelas antes de distribuir nada
--------------------------------------------------------------------------
  RTMPose (OpenMMLab)          Apache-2.0            uso comercial permitido
  ViTPose / ViTPose+           Apache-2.0            uso comercial permitido
  AP-10K (dataset)             uso NO comercial
  APT-36K (dataset)            MIT
  StanfordExtra (anotaciones)  MIT; imágenes base (Stanford Dogs) solo investigación
  SuperAnimal-Quadruped        pesos "Modified MIT": ACADÉMICO / NO COMERCIAL
  Ultralytics YOLO-pose        AGPL-3.0 o licencia comercial de pago

El caso más delicado es SuperAnimal: el código de DeepLabCut es LGPL-3.0 pero
los PESOS son no comerciales. Para una app clínica de pago hay que contactar
con EPFL TTO. DempsterCan no distribuye ningún peso.

--------------------------------------------------------------------------
RENDIMIENTO ESPERABLE (foto fija, no vídeo)
--------------------------------------------------------------------------
Medidas publicadas (MMPose, Snapdragon 865, ncnn FP16): RTMPose-t 9,0 ms,
RTMPose-m 26,4 ms. La penalización de ejecutar en navegador frente a nativo en
CPU móvil es de ~15,8x (arXiv 2402.05981 / ACM TOSEM 2024), y SIMD + hilos la
reducen un 63 %. En un Android de gama media, dentro de una PWA:

  RTMPose-t 256x192 int8   ~3-4 MB    ~150-400 ms por foto
  RTMPose-m AP-10K int8    ~14 MB     ~450-1300 ms por foto
  HRNet-w32 (SuperAnimal)  ~29 MB     4-15 s  -> inviable
  ViTPose (cualquiera)                atención mal soportada en WASM -> inviable

Para una app de medición sobre foto fija, 300-600 ms es perfectamente aceptable.
"""

import argparse
import json
import os
import sys
import urllib.request
import zipfile

# --------------------------------------------------------------------------
# Modelos preconfigurados
# --------------------------------------------------------------------------

MODELOS = {
    'rtmpose-ap10k': {
        'descripcion': 'RTMPose-m entrenado en AP-10K (17 keypoints de cuadrúpedo). '
                       'ONNX oficial publicado por OpenMMLab, licencia Apache-2.0.',
        'url': 'https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/'
               'rtmpose-m_simcc-ap10k_pt-aic-coco_210e-256x256-7a041aa1_20230206.zip',
        'tipo': 'simcc',
        'entrada': [1, 3, 256, 256],
        'media': [123.675, 116.28, 103.53],
        'desv': [58.395, 57.12, 57.375],
        'canales': 'BGR',      # verifíquelo con Netron; mmdeploy suele usar BGR
        'splitRatio': 2.0,
        'keypoints': [
            'L_Eye', 'R_Eye', 'Nose', 'Neck', 'Root of Tail',
            'L_Shoulder', 'L_Elbow', 'L_F_Paw',
            'R_Shoulder', 'R_Elbow', 'R_F_Paw',
            'L_Hip', 'L_Knee', 'L_B_Paw',
            'R_Hip', 'R_Knee', 'R_B_Paw'
        ],
        # Correspondencia HONESTA: solo lo que el modelo puede dar de verdad.
        # El lado izquierdo/derecho se resuelve en la app según el lado
        # fotografiado; aquí se usa el izquierdo por defecto.
        'mapeo': {
            'occipucio': 'Nose',
            't1': 'Neck',
            'sacro': 'Root of Tail',
            'hombro': 'L_Shoulder',
            'codo': 'L_Elbow',
            'metacarpo': 'L_F_Paw',
            'trocanter': 'L_Hip',
            'rodilla': 'L_Knee',
            'metatarso': 'L_B_Paw'
        },
        'noCubre': ['escapulaDorsal', 'carpo', 'tarso', 'calcaneo', 'isquion',
                    't13', 'l7', 'hocico', 'colaPunta'],
        'umbral': 0.25
    }
}


def descargar(url, destino):
    print(f'Descargando {url}')
    urllib.request.urlretrieve(url, destino)
    print(f'  -> {destino} ({os.path.getsize(destino) / 1e6:.1f} MB)')


def cuantizar(entrada, salida, calibracion=None):
    """Cuantización int8 según la documentación oficial de ONNX Runtime.

    QDQ + S8S8 es el formato recomendado para CPU/ARM. ARM no sufre el problema
    de saturación de AVX2/AVX512, así que no hace falta `reduce_range`.
    """
    try:
        from onnxruntime.quantization import (quantize_dynamic, quantize_static, QuantType,
                                              QuantFormat, CalibrationMethod, CalibrationDataReader)
        from onnxruntime.quantization.shape_inference import quant_pre_process
    except ImportError:
        print('Falta onnxruntime. Instale:  pip install onnxruntime onnx')
        sys.exit(1)

    prep = entrada.replace('.onnx', '.prep.onnx')
    print('Preproceso (inferencia simbólica de shapes)…')
    quant_pre_process(entrada, prep)

    if calibracion:
        import numpy as np
        from PIL import Image
        cfg_media = np.array([123.675, 116.28, 103.53], dtype=np.float32)
        cfg_desv = np.array([58.395, 57.12, 57.375], dtype=np.float32)

        class Lector(CalibrationDataReader):
            def __init__(self, carpeta, n=200):
                archivos = [os.path.join(carpeta, f) for f in sorted(os.listdir(carpeta))
                            if f.lower().endswith(('.jpg', '.jpeg', '.png'))][:n]
                if not archivos:
                    raise SystemExit(f'No hay imágenes en {carpeta}')
                tensores = []
                for a in archivos:
                    im = Image.open(a).convert('RGB').resize((256, 256))
                    x = (np.asarray(im, dtype=np.float32) - cfg_media) / cfg_desv
                    tensores.append(x.transpose(2, 0, 1)[None].astype(np.float32))
                self.it = iter([{'input': t} for t in tensores])
                print(f'  calibración con {len(tensores)} imágenes reales de perro')

            def get_next(self):
                return next(self.it, None)

        print('Cuantización ESTÁTICA int8 (QDQ, per-channel)…')
        quantize_static(prep, salida, Lector(calibracion),
                        quant_format=QuantFormat.QDQ,
                        activation_type=QuantType.QInt8,
                        weight_type=QuantType.QInt8,
                        per_channel=True,
                        calibrate_method=CalibrationMethod.MinMax)
    else:
        print('Cuantización DINÁMICA int8 (sin imágenes de calibración).')
        print('AVISO: para una CNN la cuantización estática es claramente mejor.')
        print('       Pase --calibracion CARPETA con 100-300 fotos de perros recortadas.')
        quantize_dynamic(prep, salida, weight_type=QuantType.QInt8)

    os.remove(prep)
    print(f'  -> {salida} ({os.path.getsize(salida) / 1e6:.1f} MB)')


def verificar(modelo_onnx, cfg):
    """Comprueba que el modelo carga y que las salidas tienen la forma esperada."""
    try:
        import numpy as np
        import onnxruntime as ort
    except ImportError:
        print('Instale onnxruntime para verificar.')
        return
    s = ort.InferenceSession(modelo_onnx, providers=['CPUExecutionProvider'])
    entrada = s.get_inputs()[0]
    print(f'Entrada: {entrada.name} {entrada.shape}')
    x = np.random.randn(*cfg['entrada']).astype(np.float32)
    salidas = s.run(None, {entrada.name: x})
    for o, v in zip(s.get_outputs(), salidas):
        print(f'Salida:  {o.name} {v.shape}')
    K = len(cfg['keypoints'])
    if cfg['tipo'] == 'simcc' and len(salidas) >= 2:
        assert salidas[0].shape[1] == K, f'simcc_x tiene {salidas[0].shape[1]} canales, se esperaban {K}'
        print(f'OK: {K} keypoints, decodificación SimCC.')
    print('Recuerde anotar en models/modelo.json los nombres reales de entrada y salidas.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('modelo', choices=sorted(MODELOS), help='modelo preconfigurado')
    ap.add_argument('--salida', default='models', help='carpeta de destino (por defecto: models)')
    ap.add_argument('--calibracion', help='carpeta con 100-300 fotos de perros ya recortadas, para int8 estático')
    ap.add_argument('--sin-cuantizar', action='store_true', help='conservar fp32 (archivo 4x mayor)')
    args = ap.parse_args()

    cfg = MODELOS[args.modelo]
    os.makedirs(args.salida, exist_ok=True)
    tmp = os.path.join(args.salida, '_descarga.zip')
    descargar(cfg['url'], tmp)

    with zipfile.ZipFile(tmp) as z:
        nombres = [n for n in z.namelist() if n.endswith('.onnx')]
        if not nombres:
            raise SystemExit('El paquete no contiene ningún .onnx')
        crudo = os.path.join(args.salida, 'pose_fp32.onnx')
        with z.open(nombres[0]) as src, open(crudo, 'wb') as dst:
            dst.write(src.read())
    os.remove(tmp)
    print(f'Extraído: {nombres[0]}')

    final = os.path.join(args.salida, 'pose.onnx')
    if args.sin_cuantizar:
        os.replace(crudo, final)
    else:
        cuantizar(crudo, final, args.calibracion)
        os.remove(crudo)

    verificar(final, cfg)

    manifiesto = {
        'nombre': args.modelo,
        'descripcion': cfg['descripcion'],
        'archivo': 'pose.onnx',
        'tipo': cfg['tipo'],
        'entrada': cfg['entrada'],
        'media': cfg['media'],
        'desv': cfg['desv'],
        'canales': cfg['canales'],
        'splitRatio': cfg.get('splitRatio', 2.0),
        'keypoints': cfg['keypoints'],
        'mapeo': cfg['mapeo'],
        'noCubre': cfg['noCubre'],
        'umbral': cfg['umbral'],
        'aviso': ('Los puntos detectados son centros articulares visuales, no reparos óseos '
                  'palpables. Los reparos no cubiertos se deducen por plantilla. '
                  'Corrija SIEMPRE todos los puntos a mano antes de firmar un informe.')
    }
    ruta = os.path.join(args.salida, 'modelo.json')
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(manifiesto, f, ensure_ascii=False, indent=2)
    print(f'Manifiesto escrito en {ruta}')

    print("""
FALTA UN PASO: ONNX Runtime Web.

  npm pack onnxruntime-web            # o descargue el paquete
  # copie a vendor/ort/ estos archivos DEL MISMO PAQUETE:
  #   ort.min.js
  #   ort-wasm-simd-threaded.wasm
  #   ort-wasm-simd-threaded.mjs
  #
  # El bundle JS y los .wasm DEBEN venir de la misma versión, o ORT Web falla
  # al inicializar por desajuste de nombres minificados.

Después añada esos archivos a la lista NUCLEO de sw.js para que se precarguen
y la detección funcione también sin conexión.

Para multihilo (-63 % de latencia) el servidor debe enviar:
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
GitHub Pages NO permite añadir cabeceras: allí funcionará en un solo hilo.
En la app Android empaquetada con Capacitor sí se pueden configurar.
""")


if __name__ == '__main__':
    main()
