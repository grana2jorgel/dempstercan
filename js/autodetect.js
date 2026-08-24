/**
 * autodetect.js — Detección automática de puntos, 100 % en el dispositivo.
 *
 * ============================ LEA ESTO ============================
 * Ningún conjunto de datos público de pose animal (AP-10K, APT-36K,
 * StanfordExtra, Animal-Pose, SuperAnimal-Quadruped) anota los reparos que la
 * goniometría canina necesita. Todos etiquetan "centros articulares" visuales,
 * no puntos óseos palpables. Faltan sistemáticamente: espina escapular,
 * tubérculo mayor, epicóndilos laterales, apófisis estiloides ulnar, tuber
 * sacrale, tuber ischiadicum, trocánter mayor, maléolo lateral y calcáneo.
 *
 * Por eso esta app funciona en tres niveles, y lo dice siempre en pantalla:
 *   1. RED NEURONAL (opcional): coloca los puntos que el modelo sí conoce.
 *   2. PLANTILLA: deduce el resto por semejanza a partir de los anteriores.
 *   3. CORRECCIÓN MANUAL: obligatoria. El fisioterapeuta palpa; la red no.
 *
 * El nivel 1 sólo se activa si existen ./models/modelo.json y ./vendor/ort/.
 * Sin ellos la app funciona igual, con los niveles 2 y 3. Consulte
 * tools/preparar_modelo.py para generar el modelo ONNX cuantizado.
 * =================================================================
 */

import { proyectarPlantilla } from './template.js';

let _ort = null;
let _sesion = null;
let _cfg = null;
let _estado = 'sin_comprobar';

export function estado() { return _estado; }
export function configuracion() { return _cfg; }

async function leerJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

/** Comprueba si hay modelo instalado, sin descargarlo. */
export async function comprobar() {
  try {
    _cfg = await leerJson('./models/modelo.json');
    _estado = 'disponible';
    return { disponible: true, cfg: _cfg };
  } catch (e) {
    _estado = 'no_instalado';
    return { disponible: false, motivo: 'No hay ningún modelo instalado en ./models/. La app usará plantilla + marcado manual.' };
  }
}

/** Carga ONNX Runtime Web y crea la sesión. Puede tardar en el primer uso. */
export async function inicializar(progreso = () => {}) {
  if (_sesion) return true;
  if (!_cfg) { const c = await comprobar(); if (!c.disponible) return false; }
  progreso('Cargando el motor de inferencia…');
  try {
    _ort = await import('../vendor/ort/ort.min.js').catch(() => import('../vendor/ort/ort.webgpu.min.js'));
    if (!_ort || !_ort.InferenceSession) _ort = globalThis.ort;
    if (!_ort) throw new Error('ONNX Runtime Web no encontrado en ./vendor/ort/');
    _ort.env.wasm.wasmPaths = './vendor/ort/';
    _ort.env.wasm.simd = true;
    _ort.env.wasm.numThreads = (self.crossOriginIsolated && navigator.hardwareConcurrency > 1)
      ? Math.min(4, navigator.hardwareConcurrency) : 1;
    progreso('Cargando el modelo…');
    _sesion = await _ort.InferenceSession.create('./models/' + _cfg.archivo, {
      executionProviders: ['wasm'], graphOptimizationLevel: 'all'
    });
    _estado = 'listo';
    return true;
  } catch (e) {
    _estado = 'error';
    console.warn('[autodetect]', e);
    return false;
  }
}

/** Recorta y normaliza la región del perro al tamaño de entrada del modelo. */
function preparar(fuente, bbox, cfg) {
  const [ , , H, W] = cfg.entrada;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });

  // Recorte con relleno del 25 % (padding=1.25), como en RTMPose.
  const cx = bbox.x + bbox.w / 2, cy = bbox.y + bbox.h / 2;
  const lado = Math.max(bbox.w / (W / Math.max(W, H)), bbox.h) * 1.25;
  const ancho = lado * (W / H), alto = lado;
  const sx = cx - ancho / 2, sy = cy - alto / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.drawImage(fuente, sx, sy, ancho, alto, 0, 0, W, H);

  const d = g.getImageData(0, 0, W, H).data;
  const media = cfg.media || [123.675, 116.28, 103.53];
  const desv = cfg.desv || [58.395, 57.12, 57.375];
  const bgr = (cfg.canales || 'RGB').toUpperCase() === 'BGR';
  const t = new Float32Array(3 * H * W);
  for (let i = 0, n = W * H; i < n; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    const v = bgr ? [b, gg, r] : [r, gg, b];
    for (let ch = 0; ch < 3; ch++) t[ch * n + i] = (v[ch] - media[ch]) / desv[ch];
  }
  return { tensor: t, sx, sy, ancho, alto, W, H };
}

/** Decodificación SimCC (RTMPose): dos vectores 1-D por keypoint. */
function decodificarSimcc(sx, sy, K, split) {
  const nx = sx.dims[sx.dims.length - 1], ny = sy.dims[sy.dims.length - 1];
  const dx = sx.data, dy = sy.data;
  const out = [];
  for (let k = 0; k < K; k++) {
    let ix = 0, vx = -Infinity, iy = 0, vy = -Infinity;
    for (let i = 0; i < nx; i++) { const v = dx[k * nx + i]; if (v > vx) { vx = v; ix = i; } }
    for (let i = 0; i < ny; i++) { const v = dy[k * ny + i]; if (v > vy) { vy = v; iy = i; } }
    // Refinamiento subpíxel por centroide ponderado en ±2 posiciones.
    const refina = (arr, base, n, idx) => {
      let num = 0, den = 0;
      for (let j = Math.max(0, idx - 2); j <= Math.min(n - 1, idx + 2); j++) {
        const w = Math.max(0, arr[base + j]); num += w * j; den += w;
      }
      return den > 0 ? num / den : idx;
    };
    const fx = refina(dx, k * nx, nx, ix) / split;
    const fy = refina(dy, k * ny, ny, iy) / split;
    out.push({ x: fx, y: fy, score: Math.min(vx, vy) });
  }
  return out;
}

/** Decodificación por mapas de calor, con locref opcional. */
function decodificarHeatmap(hm, locref, K, entradaW, entradaH) {
  // dims esperadas: [1, K, h, w] o [1, h, w, K]
  const d = hm.dims;
  let h, w, idx;
  if (d[1] === K) { h = d[2]; w = d[3]; idx = (k, y, x) => (k * h + y) * w + x; }
  else { h = d[1]; w = d[2]; idx = (k, y, x) => (y * w + x) * K + k; }
  const data = hm.data, out = [];
  const sxr = entradaW / w, syr = entradaH / h;
  for (let k = 0; k < K; k++) {
    let bx = 0, by = 0, bv = -Infinity;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = data[idx(k, y, x)]; if (v > bv) { bv = v; bx = x; by = y; }
    }
    let fx = bx, fy = by;
    if (locref) {
      const ld = locref.data;
      const li = locref.dims[1] === 2 * K
        ? (c) => ((2 * k + c) * h + by) * w + bx
        : (c) => ((by * w + bx) * 2 * K) + 2 * k + c;
      fx += ld[li(0)] / sxr; fy += ld[li(1)] / syr;
    } else {
      // Centroide ponderado 3x3 (mejor que el desplazamiento de 1/4 de píxel
      // cuando el mapa es ruidoso).
      let num = [0, 0], den = 0;
      for (let y = Math.max(0, by - 1); y <= Math.min(h - 1, by + 1); y++)
        for (let x = Math.max(0, bx - 1); x <= Math.min(w - 1, bx + 1); x++) {
          const v = Math.max(0, data[idx(k, y, x)]); num[0] += v * x; num[1] += v * y; den += v;
        }
      if (den > 0) { fx = num[0] / den; fy = num[1] / den; }
    }
    out.push({ x: (fx + 0.5) * sxr, y: (fy + 0.5) * syr, score: bv });
  }
  return out;
}

/**
 * Ejecuta la detección sobre una imagen y devuelve reparos en coordenadas de
 * la imagen original.
 * @param {ImageBitmap|HTMLImageElement|HTMLCanvasElement} fuente
 * @param {{x,y,w,h}} bbox  recuadro del perro en coordenadas de la imagen
 */
export async function detectar(fuente, bbox) {
  if (!_sesion) throw new Error('El modelo no está inicializado.');
  const cfg = _cfg;
  const prep = preparar(fuente, bbox, cfg);
  const nombreEntrada = cfg.entradaNombre || _sesion.inputNames[0];
  const tensor = new _ort.Tensor('float32', prep.tensor, cfg.entrada);
  const salida = await _sesion.run({ [nombreEntrada]: tensor });

  const K = cfg.keypoints.length;
  let kps;
  if ((cfg.tipo || 'simcc') === 'simcc') {
    const nx = cfg.salidaX || _sesion.outputNames[0];
    const ny = cfg.salidaY || _sesion.outputNames[1];
    kps = decodificarSimcc(salida[nx], salida[ny], K, cfg.splitRatio || 2.0);
  } else {
    const nh = cfg.salidaHeatmap || _sesion.outputNames[0];
    const nl = cfg.salidaLocref && salida[cfg.salidaLocref] ? cfg.salidaLocref : null;
    kps = decodificarHeatmap(salida[nh], nl ? salida[nl] : null, K, prep.W, prep.H);
  }

  // De coordenadas del recorte a coordenadas de la imagen original.
  const kx = prep.ancho / prep.W, ky = prep.alto / prep.H;
  const puntos = {}, confianza = {}, origen = {};
  const umbral = cfg.umbral ?? 0.2;
  for (const [reparo, nombreKp] of Object.entries(cfg.mapeo || {})) {
    const i = cfg.keypoints.indexOf(nombreKp);
    if (i < 0) continue;
    const kp = kps[i];
    if (!kp || kp.score < umbral) continue;
    puntos[reparo] = [prep.sx + kp.x * kx, prep.sy + kp.y * ky];
    confianza[reparo] = kp.score;
    origen[reparo] = 'red';
  }

  // Los reparos que la red no cubre se deducen por plantilla.
  const completo = proyectarPlantilla(puntos, { soloFaltantes: true }) || puntos;
  for (const k of Object.keys(completo)) if (!origen[k]) origen[k] = 'plantilla';

  return {
    puntos: completo, confianza, origen,
    aviso: 'Detección automática: los puntos marcados como "red" son centros articulares aproximados y los marcados como "plantilla" son una deducción geométrica. NINGUNO sustituye a la palpación. Corrija todos antes de firmar el informe.'
  };
}
