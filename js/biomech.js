/**
 * biomech.js — Motor de cálculo. Funciones puras, sin DOM.
 *
 * Todo el análisis se hace en un sistema de referencia solidario con la BASE DE
 * SUSTENTACIÓN, no con la imagen: el eje s va del apoyo torácico al apoyo
 * pelviano (dirección caudal) y el eje h es perpendicular, positivo hacia
 * arriba. Así la foto no necesita estar perfectamente nivelada.
 *
 * Unidades: masa kg, longitud cm, fuerza N, momento N·cm.
 */

import { SEGMENTOS, PERFILES, ANGULOS_ESTACION, REFERENCIA_MORFOMETRICA } from './params.js';
import { ARTICULACIONES, PLANTILLA, longitudesPlantilla } from './landmarks.js';

export const G = 9.80665; // m/s²

/* ------------------------------------------------------------------ */
/* Utilidades vectoriales                                              */
/* ------------------------------------------------------------------ */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norm = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => { const n = norm(a); return n === 0 ? [0, 0] : [a[0] / n, a[1] / n]; };

export const vec = { sub, add, mul, dot, cross, norm, unit };

/** Generador congruencial lineal: Monte Carlo reproducible sin dependencias. */
function rng(semilla = 20260824) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
/** Box–Muller a partir de un uniforme. */
function gauss(u) {
  const a = Math.max(u(), 1e-12), b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/* ------------------------------------------------------------------ */
/* Sistema de referencia                                               */
/* ------------------------------------------------------------------ */

/**
 * Construye el marco de referencia a partir de los dos apoyos.
 * @param {Object} p  mapa id → [x, y] en píxeles de imagen (y hacia abajo)
 * @param {'apoyos'|'imagen'} referencia
 */
export function marcoReferencia(p, referencia = 'apoyos') {
  const A = p.metacarpo, B = p.metatarso;
  if (!A || !B) throw new Error('Faltan los puntos de apoyo (metacarpo y metatarso).');

  let ejeS;
  if (referencia === 'imagen') {
    // Suelo horizontal en la imagen; el sentido caudal lo marca el orden de apoyos.
    ejeS = B[0] >= A[0] ? [1, 0] : [-1, 0];
  } else {
    ejeS = unit(sub(B, A));
    if (norm(sub(B, A)) < 1e-6) throw new Error('Los dos apoyos coinciden: no se puede definir la base de sustentación.');
  }
  // Normal al suelo apuntando "hacia arriba" en la imagen (y de imagen crece hacia abajo).
  let ejeH = [ejeS[1], -ejeS[0]];
  if (ejeH[1] > 0) ejeH = mul(ejeH, -1);

  const origen = A;
  const inclinacionSuelo = Math.atan2(ejeS[1], ejeS[0]) * 180 / Math.PI;

  // h = componente a lo largo de ejeH, que ya apunta hacia arriba en la imagen.
  const aLocal = (q) => [dot(sub(q, origen), ejeS), dot(sub(q, origen), ejeH)];
  const aImagen = (l) => add(origen, add(mul(ejeS, l[0]), mul(ejeH, l[1])));

  return { origen, ejeS, ejeH, aLocal, aImagen, inclinacionSuelo, referencia };
}

/* ------------------------------------------------------------------ */
/* Escala                                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {{p1:[number,number], p2:[number,number], cm:number}|null} calib
 * @returns {{pxPorCm:number|null, calibrado:boolean}}
 */
export function escala(calib) {
  if (!calib || !calib.p1 || !calib.p2 || !(calib.cm > 0)) return { pxPorCm: null, calibrado: false };
  const px = norm(sub(calib.p2, calib.p1));
  if (px < 1) return { pxPorCm: null, calibrado: false };
  return { pxPorCm: px / calib.cm, calibrado: true };
}

/* ------------------------------------------------------------------ */
/* Ángulos articulares                                                 */
/* ------------------------------------------------------------------ */

/**
 * Ángulo con signo en el vértice, en grados dentro de [0, 360).
 * v1 = prox − vertice, v2 = dist − vertice. `orientacion` = +1 o −1 según el
 * perro mire a la izquierda o a la derecha de la imagen, para que el signo del
 * producto cruzado sea consistente.
 */
export function anguloArticular(prox, vertice, dist, orientacion = 1, permiteReflejo = false) {
  const v1 = sub(prox, vertice), v2 = sub(dist, vertice);
  if (norm(v1) < 1e-9 || norm(v2) < 1e-9) return null;
  let th = Math.atan2(orientacion * cross(v1, v2), dot(v1, v2)) * 180 / Math.PI;
  let abs = Math.abs(th);
  if (permiteReflejo && th < 0) abs = 360 - abs; // hiperextensión de carpo > 180°
  return abs;
}

/**
 * Determina hacia dónde mira el perro: −1 si la cabeza queda a la izquierda de
 * la imagen respecto a la grupa, +1 si a la derecha.
 */
export function orientacionSagital(p) {
  const craneal = p.occipucio || p.t1 || p.hombro;
  const caudal = p.sacro || p.isquion || p.trocanter;
  if (!craneal || !caudal) return 1;
  return craneal[0] <= caudal[0] ? 1 : -1;
}

export function calcularAngulos(p, marco) {
  const or = orientacionSagital(p);
  const salida = [];
  for (const a of ARTICULACIONES) {
    const P = p[a.prox], V = p[a.vertice], D = p[a.dist];
    if (!P || !V || !D) { salida.push({ ...a, valor: null, motivo: 'faltan reparos' }); continue; }
    const valor = anguloArticular(P, V, D, or, !!a.permiteReflejo);
    const ref = ANGULOS_ESTACION[a.id] || null;
    const item = { id: a.id, nombre: a.nombre, tren: a.tren, definicion: a.definicion, valor, referencia: ref };
    // Variante del ángulo coxofemoral usando la línea pélvica como brazo fijo.
    if (a.id === 'cadera' && p.sacro && p.isquion) {
      const dirPelvis = unit(sub(p.sacro, p.isquion));
      const proxVirtual = add(V, mul(dirPelvis, norm(sub(p.sacro, V)) || 1));
      item.variantePelvica = anguloArticular(proxVirtual, V, D, or, false);
      item.varianteNota = 'Brazo fijo paralelo a la línea tuber sacrale–tuber ischiadicum, trasladada al trocánter (protocolo goniométrico clásico).';
    }
    // Inclinación del segmento distal respecto a la vertical de gravedad.
    if (marco) {
      const lv = marco.aLocal(V), ld = marco.aLocal(D);
      item.inclinacionDistal = Math.atan2(ld[0] - lv[0], -(ld[1] - lv[1])) * 180 / Math.PI;
    }
    salida.push(item);
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Segmentos, masas y centro de masa                                   */
/* ------------------------------------------------------------------ */

/** Aplica un perfil de raza sobre la tabla base y renormaliza a masa total 1. */
export function tablaSegmentos(perfilId = 'morfometrico') {
  const perfil = PERFILES[perfilId] || PERFILES.morfometrico;
  const base = SEGMENTOS.map(s => {
    const aj = perfil.ajustes[s.id];
    if (!aj) return { ...s };
    return { ...s,
      masa: aj.masa ?? s.masa,
      sd: aj.sd ?? s.sd,
      com: aj.com ?? s.com,
      comSd: aj.comSd ?? s.comSd,
      ajustado: true, fuenteAjuste: perfil.fuente };
  });
  return { perfil, segmentos: base };
}

/** Longitudes de referencia (perro de Jones expresado en proporciones). */
const LONG_REF = longitudesPlantilla(PLANTILLA);

/**
 * Factor de adaptación morfométrica de cada segmento.
 *
 *   ratio_i = L_i(paciente) / L_i(referencia escalada a la misma alzada)
 *
 * Si además se mide el perímetro C_i con cinta, se multiplica por
 * (C_i / C_i,referencia)², con lo que la masa pasa a ser proporcional al
 * volumen real y no solo a la longitud.
 *
 * @param {Object} p        reparos
 * @param {Object} marco    marco de referencia
 * @param {Object} perimetros  { torax, abdomen, cuello, muslo, antebrazo } en cm
 * @param {number} pxPorCm  necesario solo para la corrección por perímetros
 */
export function factoresMorfometricos(p, marco, perimetros = {}, pxPorCm = null) {
  if (!marco) return null;
  // Normalizador de tamaño: altura de la cruz. Si no hay T1 marcado se usa la
  // base de sustentación, que siempre existe.
  let unidadPx = null, normalizador = null;
  if (p.t1) {
    unidadPx = marco.aLocal(p.t1)[1] / LONG_REF.alzada;
    normalizador = 'altura a la cruz';
  } else {
    unidadPx = Math.abs(marco.aLocal(p.metatarso)[0] - marco.aLocal(p.metacarpo)[0]) / 1.011;
    normalizador = 'base de sustentación';
  }
  if (!(unidadPx > 0)) return null;

  // Escala global respecto al perro de referencia (solo para perímetros).
  const alzadaCm = (p.t1 && pxPorCm) ? marco.aLocal(p.t1)[1] / pxPorCm : null;
  const s = alzadaCm ? alzadaCm / REFERENCIA_MORFOMETRICA.alturaCruzCm : null;

  const factores = {};
  for (const seg of SEGMENTOS) {
    const A = p[seg.prox], B = p[seg.dist];
    const Lref = LONG_REF[seg.id];
    if (!A || !B || !Lref) continue;
    const Lmed = norm(sub(B, A));
    const ratioLongitud = Lmed / (unidadPx * Lref);

    let ratioSeccion = 1, perimetroRefCm = null, perimetroCm = null;
    const C = Number(perimetros[seg.id]);
    if (s && Number.isFinite(C) && C > 0) {
      // Sección equivalente de la referencia, escalada al tamaño del paciente.
      const volumenRefCm3 = REFERENCIA_MORFOMETRICA.volumenSegmento(seg) * s ** 3;
      const LrefCm = Lref * (alzadaCm / LONG_REF.alzada);
      const areaRefCm2 = volumenRefCm3 / LrefCm;
      perimetroRefCm = 2 * Math.sqrt(Math.PI * areaRefCm2);
      perimetroCm = C;
      ratioSeccion = (C / perimetroRefCm) ** 2;
    }

    factores[seg.id] = {
      ratioLongitud, ratioSeccion, factor: ratioLongitud * ratioSeccion,
      longitudPx: Lmed, longitudRefPx: unidadPx * Lref,
      perimetroCm, perimetroRefCm
    };
  }
  return { factores, unidadPx, normalizador, alzadaCm, escalaRespectoReferencia: s };
}

/**
 * Calcula masas, centros de masa por segmento y centro de masa global.
 * @param {Object} p        reparos id → [x,y] px
 * @param {number} masaKg   masa corporal total
 * @param {Object} opts     { perfil, marco, perimetros, pxPorCm }
 */
export function centroDeMasa(p, masaKg, opts = {}) {
  const { segmentos, perfil } = tablaSegmentos(opts.perfil);
  const morfo = (perfil.modo === 'morfometrico' && opts.marco)
    ? factoresMorfometricos(p, opts.marco, opts.perimetros, opts.pxPorCm)
    : null;
  const usados = [];
  let sumaFraccion = 0;

  for (const s of segmentos) {
    const A = p[s.prox], B = p[s.dist];
    if (!A || !B) { if (!s.opcional) usados.push({ ...s, ausente: true }); continue; }
    const factor = s.par ? 2 : 1;
    const adapt = morfo && morfo.factores[s.id] ? morfo.factores[s.id].factor : 1;
    const frac = s.masa * factor * adapt;
    sumaFraccion += frac;
    usados.push({ ...s, factor, adaptacion: adapt, morfo: morfo ? morfo.factores[s.id] : null,
                  fraccionTotal: frac, A, B, ausente: false });
  }
  if (sumaFraccion <= 0) throw new Error('No hay segmentos calculables: faltan reparos.');

  // Renormalización: si falta la cola (u otro segmento opcional), el resto se
  // reparte proporcionalmente para que la suma siga siendo la masa corporal.
  const k = 1 / sumaFraccion;
  let mx = 0, my = 0, mtot = 0;
  const detalle = [];
  for (const s of usados) {
    if (s.ausente) { detalle.push({ id: s.id, nombre: s.nombre, ausente: true }); continue; }
    const fraccion = s.fraccionTotal * k;
    const masa = fraccion * masaKg;
    const com = add(s.A, mul(sub(s.B, s.A), s.com));
    mx += masa * com[0]; my += masa * com[1]; mtot += masa;
    detalle.push({
      id: s.id, nombre: s.nombre, par: s.par, factor: s.factor,
      fraccion, porcentaje: fraccion * 100, masa,
      fraccionTabla: s.masa * s.factor, porcentajeTabla: s.masa * s.factor * 100,
      adaptacion: s.adaptacion ?? 1, morfo: s.morfo || null,
      coefCom: s.com, prox: s.prox, dist: s.dist,
      longitudPx: norm(sub(s.B, s.A)), com, fuente: s.fuenteAjuste || s.fuente,
      nota: s.nota, ajustado: !!s.ajustado
    });
  }

  // Desviación morfométrica global: cuánto se aparta la conformación del
  // paciente de la del perro de referencia. Media cuadrática ponderada por
  // masa del logaritmo del factor de adaptación.
  let desviacion = null;
  if (morfo) {
    let num = 0, den = 0;
    for (const d of detalle) {
      if (d.ausente || !d.morfo) continue;
      const w = d.fraccion;
      num += w * Math.log(d.morfo.ratioLongitud) ** 2;
      den += w;
    }
    desviacion = den > 0 ? Math.sqrt(num / den) * 100 : null;
  }

  return {
    cdm: [mx / mtot, my / mtot],
    masaTotal: mtot,
    segmentos: detalle,
    renormalizacion: k,
    perfil: perfil.nombre,
    perfilFuente: perfil.fuente,
    modo: perfil.modo || 'tabla',
    morfometria: morfo ? { normalizador: morfo.normalizador, alzadaCm: morfo.alzadaCm,
                           escalaRespectoReferencia: morfo.escalaRespectoReferencia } : null,
    desviacionMorfometrica: desviacion
  };
}

/* ------------------------------------------------------------------ */
/* Estática: base de sustentación y reparto de carga                   */
/* ------------------------------------------------------------------ */

export function estatica(p, cdm, marco, masaKg, pxPorCm) {
  const lApoyoT = marco.aLocal(p.metacarpo);
  const lApoyoP = marco.aLocal(p.metatarso);
  const lCdm = marco.aLocal(cdm);
  const L = lApoyoP[0] - lApoyoT[0]; // base de sustentación en px (siempre > 0)

  const posRel = L !== 0 ? (lCdm[0] - lApoyoT[0]) / L : null; // 0 = sobre el apoyo torácico
  const fracToracica = posRel === null ? null : (1 - posRel);
  const pesoN = masaKg * G;

  const cm = (px) => (pxPorCm ? px / pxPorCm : null);

  const dentro = posRel !== null && posRel >= 0 && posRel <= 1;

  // Descenso del CdM por debajo de la cruz: es la magnitud directamente
  // comparable con Johnson et al. 2022 (9,48 ± 4,44 cm).
  const alturaCruz = p.t1 ? marco.aLocal(p.t1)[1] : null;
  const descensoPx = alturaCruz === null ? null : (alturaCruz - lCdm[1]);

  return {
    descensoCdmBajoCruzPx: descensoPx,
    descensoCdmBajoCruzCm: descensoPx === null ? null : cm(descensoPx),
    fraccionAlturaCruz: alturaCruz ? lCdm[1] / alturaCruz : null,
    baseSustentacionPx: L,
    baseSustentacionCm: cm(L),
    posicionRelativa: posRel,             // 0..1 desde el apoyo torácico
    porcentajeBase: posRel === null ? null : posRel * 100,
    dentroDeBase: dentro,
    alturaCdmPx: lCdm[1],
    alturaCdmCm: cm(lCdm[1]),
    distanciaCdmApoyoToracicoCm: cm(lCdm[0] - lApoyoT[0]),
    distanciaCdmApoyoPelvianoCm: cm(lApoyoP[0] - lCdm[0]),
    pesoN,
    cargaToracicaPct: fracToracica === null ? null : fracToracica * 100,
    cargaPelvianaPct: fracToracica === null ? null : (1 - fracToracica) * 100,
    cargaToracicaN: fracToracica === null ? null : fracToracica * pesoN,
    cargaPelvianaN: fracToracica === null ? null : (1 - fracToracica) * pesoN,
    cargaPorMiembroToracicoKg: fracToracica === null ? null : fracToracica * masaKg / 2,
    cargaPorMiembroPelvianoKg: fracToracica === null ? null : (1 - fracToracica) * masaKg / 2,
    inclinacionSuelo: marco.inclinacionSuelo
  };
}

/** Medidas morfométricas derivadas de los reparos. */
export function morfometria(p, marco, pxPorCm) {
  const cm = (px) => (pxPorCm ? px / pxPorCm : null);
  const alt = (id) => (p[id] ? marco.aLocal(p[id])[1] : null);
  const d = (a, b) => (p[a] && p[b] ? norm(sub(p[a], p[b])) : null);

  const alturaCruz = alt('t1');
  const out = {
    alturaCruzPx: alturaCruz, alturaCruzCm: cm(alturaCruz),
    alturaTrocanterPx: alt('trocanter'), alturaTrocanterCm: cm(alt('trocanter')),
    longitudTroncoPx: d('t1', 'sacro'), longitudTroncoCm: cm(d('t1', 'sacro')),
    longitudHumeroCm: cm(d('hombro', 'codo')),
    longitudAntebrazoCm: cm(d('codo', 'carpo')),
    longitudFemurCm: cm(d('trocanter', 'rodilla')),
    longitudTibiaCm: cm(d('rodilla', 'tarso')),
    longitudMetatarsoCm: cm(d('tarso', 'metatarso'))
  };
  out.indiceFormato = (out.longitudTroncoPx && alturaCruz) ? out.longitudTroncoPx / alturaCruz : null;
  return out;
}

/* ------------------------------------------------------------------ */
/* Momentos articulares externos                                       */
/* ------------------------------------------------------------------ */

const CADENA_DISTAL = {
  hombro:  ['brazo', 'antebrazo', 'mano'],
  codo:    ['antebrazo', 'mano'],
  carpo:   ['mano'],
  cadera:  ['muslo', 'pierna', 'pie'],
  rodilla: ['pierna', 'pie'],
  tarso:   ['pie']
};
const APOYO_DE = { hombro: 'metacarpo', codo: 'metacarpo', carpo: 'metacarpo',
                   cadera: 'metatarso', rodilla: 'metatarso', tarso: 'metatarso' };

/**
 * Determina si un momento externo positivo (antihorario en el marco local)
 * aumenta o disminuye el ángulo articular. Se obtiene rotando numéricamente el
 * segmento distal: no se asume nada.
 */
function sentidoAngular(p, art, orientacion) {
  const V = p[art.vertice], P = p[art.prox], D = p[art.dist];
  if (!V || !P || !D) return 0;
  const base = anguloArticular(P, V, D, orientacion, !!art.permiteReflejo);
  const e = 0.01; // rad, giro antihorario en coordenadas de imagen (y hacia abajo → invertir)
  const r = sub(D, V);
  const Dp = add(V, [r[0] * Math.cos(-e) - r[1] * Math.sin(-e), r[0] * Math.sin(-e) + r[1] * Math.cos(-e)]);
  const nuevo = anguloArticular(P, V, Dp, orientacion, !!art.permiteReflejo);
  if (base === null || nuevo === null) return 0;
  return Math.sign(nuevo - base);
}

/**
 * Momento externo estático en cada articulación de un miembro, por equilibrio
 * del sólido libre formado por todo lo distal a la articulación:
 *   M = F_suelo · (s_apoyo − s_art) − g · Σ m_k (s_k − s_art)
 */
export function momentos(p, marco, segmentosDetalle, cargas, pxPorCm) {
  const or = orientacionSagital(p);
  const segPorId = Object.fromEntries(segmentosDetalle.filter(s => !s.ausente).map(s => [s.id, s]));
  const out = [];

  for (const art of ARTICULACIONES) {
    const V = p[art.vertice];
    const apoyoId = APOYO_DE[art.id];
    const apoyo = p[apoyoId];
    if (!V || !apoyo) { out.push({ id: art.id, nombre: art.nombre, valor: null }); continue; }

    const F = art.tren === 'toracico' ? cargas.porMiembroToracicoN : cargas.porMiembroPelvianoN;
    if (F === null || F === undefined) { out.push({ id: art.id, nombre: art.nombre, valor: null }); continue; }

    const lV = marco.aLocal(V);
    const lApoyo = marco.aLocal(apoyo);
    const brazoSueloPx = lApoyo[0] - lV[0];

    const px2cm = pxPorCm ? 1 / pxPorCm : null;
    const brazoCm = px2cm ? brazoSueloPx * px2cm : null;

    // Momento de los pesos de los segmentos distales respecto a la articulación.
    let momentoPesos = 0, masaDistal = 0;
    for (const sid of CADENA_DISTAL[art.id]) {
      const s = segPorId[sid];
      if (!s) continue;
      const mUni = s.masa / (s.factor || 1); // masa de UN solo miembro
      masaDistal += mUni;
      if (px2cm) momentoPesos += mUni * G * ((marco.aLocal(s.com)[0] - lV[0]) * px2cm);
    }
    const momento = px2cm ? (F * brazoCm - momentoPesos) : null;

    const signo = sentidoAngular(p, art, or);
    const efecto = momento === null || signo === 0 ? null
      : (Math.sign(momento) * signo > 0 ? 'tiende a EXTENDER' : 'tiende a FLEXIONAR');

    out.push({
      id: art.id, nombre: art.nombre, tren: art.tren,
      fuerzaApoyoN: F,
      brazoPalancaCm: brazoCm,
      ladoGRF: brazoSueloPx === 0 ? 'sobre el eje'
             : (or * brazoSueloPx > 0 ? 'caudal al centro articular' : 'craneal al centro articular'),
      masaDistalKg: masaDistal,
      momentoNcm: momento,
      momentoNm: momento === null ? null : momento / 100,
      efecto,
      valor: momento
    });
  }
  return out;
}

/** Distancia horizontal de cada articulación a la línea de gravedad global. */
export function lineaDeGravedad(p, cdm, marco, pxPorCm) {
  const sC = marco.aLocal(cdm)[0];
  const px2cm = pxPorCm ? 1 / pxPorCm : null;
  const or = orientacionSagital(p);
  const res = [];
  for (const art of ARTICULACIONES) {
    const V = p[art.vertice];
    if (!V) continue;
    const d = marco.aLocal(V)[0] - sC;
    res.push({
      id: art.id, nombre: art.nombre, tren: art.tren,
      distanciaPx: d,
      distanciaCm: px2cm ? d * px2cm : null,
      lado: Math.abs(d) < 1e-6 ? 'sobre la línea' : (or * d > 0 ? 'caudal a la línea de gravedad' : 'craneal a la línea de gravedad')
    });
  }
  return res;
}

/* ------------------------------------------------------------------ */
/* Reparto medido (básculas / plataforma) e índices de simetría        */
/* ------------------------------------------------------------------ */

/**
 * @param {{tdi:number,tdd:number,tpi:number,tpd:number}} kg  cargas por miembro
 *        (torácico izq/der, pelviano izq/der) en kg o en % — se normaliza.
 */
export function repartoMedido(kg) {
  const v = ['tdi', 'tdd', 'tpi', 'tpd'].map(k => Number(kg[k]));
  if (v.some(x => !Number.isFinite(x) || x < 0)) return null;
  const total = v.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const [ti, td, pi, pd] = v.map(x => x / total * 100);
  const si = (a, b) => (a + b) === 0 ? null : Math.abs((b - a) / ((a + b) * 0.5) * 100);
  return {
    porMiembro: { toracicoIzq: ti, toracicoDer: td, pelvianoIzq: pi, pelvianoDer: pd },
    toracicoPct: ti + td,
    pelvianoPct: pi + pd,
    indiceSimetriaToracico: si(ti, td),
    indiceSimetriaPelviano: si(pi, pd),
    desviacionMaxima: Math.max(...[ti, td].map(x => Math.abs(x - (ti + td) / 2)),
                               ...[pi, pd].map(x => Math.abs(x - (pi + pd) / 2)))
  };
}

/* ------------------------------------------------------------------ */
/* Incertidumbre: Monte Carlo sobre las DE publicadas                  */
/* ------------------------------------------------------------------ */

export function incertidumbre(p, masaKg, marco, opts = {}) {
  const n = opts.n || 800;
  const { segmentos, perfil } = tablaSegmentos(opts.perfil);
  const morfo = (perfil.modo === 'morfometrico' && marco)
    ? factoresMorfometricos(p, marco, opts.perimetros, opts.pxPorCm) : null;
  const u = rng(opts.semilla || 20260824);
  const lT = marco.aLocal(p.metacarpo)[0], lP = marco.aLocal(p.metatarso)[0];
  const L = lP - lT;
  const muestras = [];

  for (let i = 0; i < n; i++) {
    let mx = 0, my = 0, mt = 0;
    for (const s of segmentos) {
      const A = p[s.prox], B = p[s.dist];
      if (!A || !B) continue;
      const factor = s.par ? 2 : 1;
      const adapt = morfo && morfo.factores[s.id] ? morfo.factores[s.id].factor : 1;
      const masa = Math.max(1e-6, (s.masa + (s.sd || 0) * gauss(u))) * factor * adapt;
      const c = s.comSd ? Math.min(0.98, Math.max(0.02, s.com + s.comSd * gauss(u))) : s.com;
      const com = add(A, mul(sub(B, A), c));
      mx += masa * com[0]; my += masa * com[1]; mt += masa;
    }
    const cdm = [mx / mt, my / mt];
    const pos = (marco.aLocal(cdm)[0] - lT) / L;
    muestras.push((1 - pos) * 100); // % de carga torácica
  }
  muestras.sort((a, b) => a - b);
  const q = (f) => muestras[Math.min(muestras.length - 1, Math.max(0, Math.round(f * (muestras.length - 1))))];
  const media = muestras.reduce((a, b) => a + b, 0) / muestras.length;
  const sd = Math.sqrt(muestras.reduce((a, b) => a + (b - media) ** 2, 0) / (muestras.length - 1));
  return { media, sd, ic95: [q(0.025), q(0.975)], n, nota: 'Propagación Monte Carlo de las desviaciones estándar publicadas de las fracciones de masa y de los coeficientes de centro de masa (Jones 2018). NO incluye el error de marcado de los reparos.' };
}

/* ------------------------------------------------------------------ */
/* Análisis completo                                                   */
/* ------------------------------------------------------------------ */

/**
 * @param {Object} caso
 *   { puntos, masaKg, calibracion, perfil, referencia, cargasMedidas }
 */
export function analizar(caso) {
  const p = caso.puntos || {};
  const faltan = ['metacarpo', 'metatarso'].filter(id => !p[id]);
  if (faltan.length) throw new Error('Faltan los apoyos: ' + faltan.join(', '));

  const marco = marcoReferencia(p, caso.referencia || 'apoyos');
  const { pxPorCm, calibrado } = escala(caso.calibracion);
  const masaKg = Number(caso.masaKg) > 0 ? Number(caso.masaKg) : null;

  const opcionesMasa = { perfil: caso.perfil, marco, perimetros: caso.perimetros || {}, pxPorCm };
  const cm = centroDeMasa(p, masaKg || 1, opcionesMasa);
  const est = estatica(p, cm.cdm, marco, masaKg || 1, pxPorCm);
  const morf = morfometria(p, marco, pxPorCm);
  const ang = calcularAngulos(p, marco);
  const lg = lineaDeGravedad(p, cm.cdm, marco, pxPorCm);
  const medido = caso.cargasMedidas ? repartoMedido(caso.cargasMedidas) : null;

  // Las cargas por miembro para los momentos salen de la medición real cuando
  // existe. Si se ha indicado qué lado se fotografió, se usa ESE miembro; si no,
  // la media de los dos, y se avisa.
  const lado = (caso.lado || '').toLowerCase();
  const ladoConocido = lado === 'izquierdo' || lado === 'derecho';
  let cargas, origenCargas;
  if (medido && masaKg) {
    const m = medido.porMiembro;
    const tor = ladoConocido ? (lado === 'izquierdo' ? m.toracicoIzq : m.toracicoDer)
                             : (m.toracicoIzq + m.toracicoDer) / 2;
    const pel = ladoConocido ? (lado === 'izquierdo' ? m.pelvianoIzq : m.pelvianoDer)
                             : (m.pelvianoIzq + m.pelvianoDer) / 2;
    cargas = { porMiembroToracicoN: tor / 100 * masaKg * G, porMiembroPelvianoN: pel / 100 * masaKg * G };
    origenCargas = ladoConocido
      ? `medición del miembro ${lado}`
      : 'media de los dos lados medidos (no se indicó qué lado se fotografió)';
  } else {
    cargas = {
      porMiembroToracicoN: (masaKg && est.cargaToracicaN !== null) ? est.cargaToracicaN / 2 : null,
      porMiembroPelvianoN: (masaKg && est.cargaPelvianaN !== null) ? est.cargaPelvianaN / 2 : null
    };
    origenCargas = 'estimación del modelo de segmentos, con simetría izquierda-derecha asumida';
  }
  const mom = (masaKg && calibrado) ? momentos(p, marco, cm.segmentos, cargas, pxPorCm) : [];
  const inc = incertidumbre(p, masaKg || 1, marco, opcionesMasa);

  const avisos = [];
  if (cm.modo === 'morfometrico') {
    if (cm.desviacionMorfometrica !== null && cm.desviacionMorfometrica > 18) {
      avisos.push(`La conformación de este perro se aparta un ${cm.desviacionMorfometrica.toFixed(0)} % de la del perro de referencia (Pastor Alemán de Jones 2018). El modelo morfométrico ha redistribuido las masas segmentarias en consecuencia; con la tabla fija el resultado habría sido claramente erróneo.`);
    }
    if (!Object.keys(caso.perimetros || {}).some(k => Number(caso.perimetros[k]) > 0)) {
      avisos.push('No se han introducido perímetros. El modelo adapta las masas por longitud de segmento, pero no distingue un perro obeso o muy musculado de uno delgado con las mismas longitudes. Medir con cinta el perímetro torácico y el abdominal mejora sustancialmente la estimación.');
    } else if (!calibrado) {
      avisos.push('Se han introducido perímetros pero falta la calibración de escala: sin ella no se pueden comparar con la sección de referencia y los perímetros se ignoran.');
    } else {
      // Un perímetro muy alejado del esperado casi siempre significa un error
      // de unidades, un perímetro tomado en otro punto, o una calibración mala.
      for (const s of cm.segmentos) {
        if (s.ausente || !s.morfo || !s.morfo.perimetroCm) continue;
        const r = s.morfo.perimetroCm / s.morfo.perimetroRefCm;
        if (r < 0.6 || r > 1.8) {
          avisos.push(`El perímetro introducido para «${s.nombre}» (${s.morfo.perimetroCm.toFixed(1)} cm) es ${r > 1 ? 'mucho mayor' : 'mucho menor'} que el esperado para un perro de esta alzada (${s.morfo.perimetroRefCm.toFixed(1)} cm). Compruebe que está en centímetros, que lo midió en el punto indicado y que la calibración de escala es correcta: la masa de ese segmento se multiplica por el cuadrado de esa relación.`);
        }
      }
    }
  } else {
    avisos.push('Perfil de tabla fija: las fracciones de masa se aplican tal cual se publicaron, sin adaptarlas a la conformación de este paciente. Válido solo si el perro es mesomorfo de talla grande. Para cualquier otra conformación use el perfil morfométrico.');
  }
  if (!calibrado) avisos.push('Sin calibración de escala: no se calculan longitudes en cm, fuerzas ni momentos articulares.');
  if (!masaKg) avisos.push('Sin masa corporal: las cargas se expresan solo en porcentaje.');
  if (Math.abs(marco.inclinacionSuelo) > 8 && caso.referencia !== 'imagen') {
    avisos.push(`La línea entre apoyos está inclinada ${marco.inclinacionSuelo.toFixed(1)}° respecto a la horizontal de la imagen. Se ha usado esa línea como suelo; compruebe que el perro está sobre superficie plana y que la cámara estaba perpendicular al plano sagital.`);
  }
  if (!est.dentroDeBase) avisos.push('La línea de gravedad cae FUERA de la base de sustentación torácico-pelviana. Revise el marcado de los apoyos antes de interpretar el reparto de carga.');
  if (!p.colaPunta) avisos.push('Cola no marcada: el segmento cola (0,80 % de la masa) se ha omitido y el resto se ha renormalizado.');
  if (!p.hocico) avisos.push('Hocico no marcado: el segmento cabeza (7,70 % de la masa) se ha omitido y el resto se ha renormalizado. La cabeza es el segmento con mayor influencia sobre el reparto torácico; márquela siempre que pueda.');
  if (medido && est.cargaToracicaPct !== null) {
    const dif = Math.abs(medido.toracicoPct - est.cargaToracicaPct);
    if (dif > 8) avisos.push(`El reparto medido (${medido.toracicoPct.toFixed(1)} % torácico) y el estimado por el modelo de segmentos (${est.cargaToracicaPct.toFixed(1)} %) difieren en ${dif.toFixed(1)} puntos. Prevalece el medido; la diferencia sugiere error de marcado, conformación fuera del rango del modelo, o que el perro no estaba cuadrado.`);
  }

  return {
    version: 2,
    fecha: caso.fecha || null,
    marco, pxPorCm, calibrado, masaKg,
    centroDeMasa: cm, estatica: est, morfometria: morf,
    angulos: ang, lineaGravedad: lg, momentos: mom, origenCargas,
    incertidumbre: inc, repartoMedido: medido, avisos
  };
}
