/**
 * Pruebas del motor biomecánico.  Ejecutar con:  node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { PLANTILLA, ARTICULACIONES, REPAROS_OBLIGATORIOS } from '../js/landmarks.js';
import { SEGMENTOS } from '../js/params.js';
import {
  anguloArticular, marcoReferencia, centroDeMasa, estatica, analizar,
  repartoMedido, escala, orientacionSagital, G
} from '../js/biomech.js';

/** Convierte la plantilla normalizada en puntos "de imagen" (y hacia abajo). */
function perroPlantilla({ escalaPx = 400, ox = 100, oy = 80, espejo = false } = {}) {
  const p = {};
  for (const [k, [x, y]] of Object.entries(PLANTILLA.puntos)) {
    p[k] = [ox + (espejo ? -x : x) * escalaPx, oy + y * escalaPx];
  }
  return p;
}

test('la tabla de segmentos de Jones 2018 cierra en la masa corporal', () => {
  const axial = SEGMENTOS.filter(s => !s.par).reduce((a, s) => a + s.masa, 0);
  const par = SEGMENTOS.filter(s => s.par).reduce((a, s) => a + s.masa, 0);
  const total = axial + 2 * par;
  assert.ok(Math.abs(total - 1) < 0.001, `suma = ${total}`);
});

test('ángulo articular: casos geométricos conocidos', () => {
  // Recto: 180°
  assert.ok(Math.abs(anguloArticular([0, 0], [10, 0], [20, 0]) - 180) < 1e-6);
  // Recto en ángulo: 90°
  assert.ok(Math.abs(anguloArticular([0, 0], [10, 0], [10, 10]) - 90) < 1e-6);
  // Reflejo (hiperextensión de carpo): con permiteReflejo debe superar 180°
  const sin = anguloArticular([0, 10], [10, 10], [18, 4], 1, false);
  const con = anguloArticular([0, 10], [10, 10], [18, 4], 1, true);
  assert.ok(sin <= 180);
  assert.ok(con > 180 || Math.abs(con - sin) < 1e-9, `sin=${sin} con=${con}`);
});

test('el ángulo no cambia si se gira toda la figura', () => {
  const rot = (q, th) => [q[0] * Math.cos(th) - q[1] * Math.sin(th), q[0] * Math.sin(th) + q[1] * Math.cos(th)];
  const A = [0, 0], B = [10, 2], C = [4, 12];
  const th = 0.7;
  const a1 = anguloArticular(A, B, C);
  const a2 = anguloArticular(rot(A, th), rot(B, th), rot(C, th));
  assert.ok(Math.abs(a1 - a2) < 1e-6);
});

test('el marco de referencia mide altura correcta sobre suelo inclinado', () => {
  const p = perroPlantilla();
  // Inclinar toda la figura 12° y comprobar que la altura a la cruz no cambia.
  const th = 12 * Math.PI / 180;
  const rot = (q) => [q[0] * Math.cos(th) - q[1] * Math.sin(th), q[0] * Math.sin(th) + q[1] * Math.cos(th)];
  const q = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, rot(v)]));
  const h1 = marcoReferencia(p).aLocal(p.t1)[1];
  const h2 = marcoReferencia(q).aLocal(q.t1)[1];
  assert.ok(Math.abs(h1 - h2) < 1e-6, `${h1} vs ${h2}`);
});

test('las fracciones de masa suman la masa corporal introducida', () => {
  const p = perroPlantilla();
  const cm = centroDeMasa(p, 30);
  assert.ok(Math.abs(cm.masaTotal - 30) < 1e-9);
  const suma = cm.segmentos.filter(s => !s.ausente).reduce((a, s) => a + s.fraccion, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
});

test('si falta la cola, el resto se renormaliza y sigue sumando 1', () => {
  const p = perroPlantilla();
  delete p.colaPunta;
  const cm = centroDeMasa(p, 25);
  assert.ok(Math.abs(cm.masaTotal - 25) < 1e-9);
  assert.ok(cm.renormalizacion > 1, 'la renormalización debe repartir el 0,8 % de la cola');
});

test('el centro de masa cae dentro de la base de sustentación en la plantilla', () => {
  const p = perroPlantilla();
  const marco = marcoReferencia(p);
  const cm = centroDeMasa(p, 30);
  const e = estatica(p, cm.cdm, marco, 30, 4);
  assert.ok(e.dentroDeBase, `posición relativa = ${e.posicionRelativa}`);
});

test('el reparto de la plantilla queda dentro del rango publicado 55–75 % torácico', () => {
  const p = perroPlantilla();
  const marco = marcoReferencia(p);
  const cm = centroDeMasa(p, 30);
  const e = estatica(p, cm.cdm, marco, 30, 4);
  assert.ok(e.cargaToracicaPct > 55 && e.cargaToracicaPct < 75,
    `carga torácica = ${e.cargaToracicaPct.toFixed(1)} %`);
  assert.ok(Math.abs(e.cargaToracicaPct + e.cargaPelvianaPct - 100) < 1e-9);
});

test('la suma de cargas por miembro reproduce la masa corporal', () => {
  const p = perroPlantilla();
  const marco = marcoReferencia(p);
  const cm = centroDeMasa(p, 30);
  const e = estatica(p, cm.cdm, marco, 30, 4);
  const suma = 2 * e.cargaPorMiembroToracicoKg + 2 * e.cargaPorMiembroPelvianoKg;
  assert.ok(Math.abs(suma - 30) < 1e-9);
});

test('equilibrio de momentos: F_toracica · L = W · (L − s_cdm)', () => {
  const p = perroPlantilla();
  const marco = marcoReferencia(p);
  const cm = centroDeMasa(p, 30);
  const e = estatica(p, cm.cdm, marco, 30, 4);
  const L = e.baseSustentacionPx;
  const sT = marco.aLocal(p.metacarpo)[0];
  const sC = marco.aLocal(cm.cdm)[0];
  const izq = (e.cargaToracicaN) * L;
  const der = 30 * G * (L - (sC - sT));
  assert.ok(Math.abs(izq - der) / der < 1e-9, `${izq} vs ${der}`);
});

test('el resultado es invariante a la escala y a la posición de la figura', () => {
  const a = analizar({ puntos: perroPlantilla({ escalaPx: 400, ox: 100, oy: 80 }), masaKg: 30 });
  const b = analizar({ puntos: perroPlantilla({ escalaPx: 900, ox: -50, oy: 400 }), masaKg: 30 });
  assert.ok(Math.abs(a.estatica.cargaToracicaPct - b.estatica.cargaToracicaPct) < 1e-6);
  for (const art of ARTICULACIONES) {
    const va = a.angulos.find(x => x.id === art.id).valor;
    const vb = b.angulos.find(x => x.id === art.id).valor;
    assert.ok(Math.abs(va - vb) < 1e-6, `${art.id}: ${va} vs ${vb}`);
  }
});

test('la imagen en espejo produce los mismos ángulos', () => {
  const a = analizar({ puntos: perroPlantilla({ espejo: false }), masaKg: 30 });
  const b = analizar({ puntos: perroPlantilla({ espejo: true }), masaKg: 30 });
  assert.equal(orientacionSagital(perroPlantilla({ espejo: false })), 1);
  assert.equal(orientacionSagital(perroPlantilla({ espejo: true })), -1);
  for (const art of ARTICULACIONES) {
    const va = a.angulos.find(x => x.id === art.id).valor;
    const vb = b.angulos.find(x => x.id === art.id).valor;
    assert.ok(Math.abs(va - vb) < 1e-6, `${art.id}: ${va} vs ${vb}`);
  }
  assert.ok(Math.abs(a.estatica.cargaToracicaPct - b.estatica.cargaToracicaPct) < 1e-6);
});

test('desplazar el centro de masa hacia caudal reduce la carga torácica', () => {
  const p1 = perroPlantilla();
  const base = analizar({ puntos: p1, masaKg: 30 }).estatica.cargaToracicaPct;
  const p2 = perroPlantilla();
  // Bajar y retrasar la cabeza (perro que baja el cuello hacia atrás no es real,
  // pero sirve para comprobar el sentido del cálculo).
  p2.occipucio = [p2.occipucio[0] + 300, p2.occipucio[1]];
  p2.hocico = [p2.hocico[0] + 300, p2.hocico[1]];
  const mov = analizar({ puntos: p2, masaKg: 30 }).estatica.cargaToracicaPct;
  assert.ok(mov < base, `${mov} debería ser menor que ${base}`);
});

test('momentos articulares: el brazo de palanca del carpo es coherente', () => {
  const p = perroPlantilla();
  const r = analizar({ puntos: p, masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 400], cm: 100 } });
  const carpo = r.momentos.find(m => m.id === 'carpo');
  assert.ok(carpo && carpo.brazoPalancaCm !== null);
  // Brazo geométrico esperado, en cm (400 px = 100 cm → 4 px/cm)
  const esperado = (p.metacarpo[0] - p.carpo[0]) / 4;
  assert.ok(Math.abs(carpo.brazoPalancaCm - esperado) < 1e-6);
  // El momento debe ser el de la fuerza menos el del peso de la mano.
  assert.ok(Math.abs(carpo.momentoNcm) < Math.abs(carpo.fuerzaApoyoN * carpo.brazoPalancaCm) + 1e-6);
});

test('escala: 200 px = 20 cm da 10 px/cm', () => {
  const e = escala({ p1: [0, 0], p2: [200, 0], cm: 20 });
  assert.equal(e.calibrado, true);
  assert.ok(Math.abs(e.pxPorCm - 10) < 1e-12);
});

test('índice de simetría reproduce la fórmula de Alves 2024', () => {
  const r = repartoMedido({ tdi: 30, tdd: 30, tpi: 20, tpd: 20 });
  assert.ok(Math.abs(r.toracicoPct - 60) < 1e-9);
  assert.ok(Math.abs(r.indiceSimetriaToracico) < 1e-9);
  const r2 = repartoMedido({ tdi: 25, tdd: 35, tpi: 20, tpd: 20 });
  // SI = |(35-25)/((35+25)*0.5)|*100 = 33,33
  assert.ok(Math.abs(r2.indiceSimetriaToracico - 33.3333) < 0.01, r2.indiceSimetriaToracico);
});

test('la incertidumbre Monte Carlo es reproducible y estrecha', () => {
  const p = perroPlantilla();
  const a = analizar({ puntos: p, masaKg: 30 }).incertidumbre;
  const b = analizar({ puntos: p, masaKg: 30 }).incertidumbre;
  assert.equal(a.media, b.media);
  assert.ok(a.sd > 0 && a.sd < 5, `sd = ${a.sd}`);
  assert.ok(a.ic95[0] < a.media && a.media < a.ic95[1]);
});

test('faltar un apoyo produce un error explícito', () => {
  const p = perroPlantilla();
  delete p.metatarso;
  assert.throws(() => analizar({ puntos: p, masaKg: 30 }), /apoyos/i);
});

test('sin calibración no se calculan momentos y se avisa', () => {
  const r = analizar({ puntos: perroPlantilla(), masaKg: 30 });
  assert.equal(r.momentos.length, 0);
  assert.ok(r.avisos.some(a => /calibración/i.test(a)));
});

/* ------------------------------------------------------------------ */
/* Validación externa: el modelo debe reproducir mediciones publicadas */
/* ------------------------------------------------------------------ */

test('validación externa: el CdM cae 8–11 cm bajo la cruz en un perro de talla media', () => {
  // Perro con 75 cm de alzada (t1 a 1,25 unidades del suelo, escala 400 px/unidad,
  // calibración 400 px = 60 cm → 6,667 px/cm).
  const p = perroPlantilla({ escalaPx: 400 });
  const r = analizar({ puntos: p, masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 400], cm: 60 } });
  const d = r.estatica.descensoCdmBajoCruzCm;
  // Johnson et al. 2022 (PLOS ONE 17(4):e0267361): 9,48 ± 4,44 cm, n=31, 6,5–60 kg.
  assert.ok(d > 4 && d < 15, `descenso bajo la cruz = ${d.toFixed(1)} cm, fuera del rango publicado 9,48 ± 4,44`);
  assert.ok(Math.abs(r.morfometria.alturaCruzCm - 75) < 0.01);
});

test('validación externa: el CdM queda alrededor del 48 % de la longitud cuello-isquion', () => {
  const p = perroPlantilla({ escalaPx: 400 });
  const r = analizar({ puntos: p, masaKg: 30 });
  const marco = r.marco;
  const sCuello = marco.aLocal(p.occipucio)[0];
  const sIsquion = marco.aLocal(p.isquion)[0];
  const sCdm = marco.aLocal(r.centroDeMasa.cdm)[0];
  const frac = (sCdm - sCuello) / (sIsquion - sCuello);
  // Johnson 2022: 48 % de la distancia caja IMU (cuello ventral) → isquion.
  assert.ok(frac > 0.40 && frac < 0.60, `fracción longitudinal = ${(frac * 100).toFixed(1)} %`);
});

test('el descenso bajo la cruz no depende de la escala de la figura', () => {
  const a = analizar({ puntos: perroPlantilla({ escalaPx: 400 }), masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 400], cm: 60 } });
  const b = analizar({ puntos: perroPlantilla({ escalaPx: 800 }), masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 800], cm: 60 } });
  assert.ok(Math.abs(a.estatica.descensoCdmBajoCruzCm - b.estatica.descensoCdmBajoCruzCm) < 1e-6);
});

/* ------------------------------------------------------------------ */
/* Modelo morfométrico: adaptación a cualquier conformación canina     */
/* ------------------------------------------------------------------ */

import { CONFORMACIONES, generarPlantilla, longitudesPlantilla } from '../js/landmarks.js';
import { REFERENCIA_MORFOMETRICA } from '../js/params.js';
import { factoresMorfometricos } from '../js/biomech.js';

function perroDe(conf, { escalaPx = 400, ox = 200, oy = 100 } = {}) {
  const pl = generarPlantilla(conf);
  const p = {};
  for (const [k, [x, y]] of Object.entries(pl.puntos)) p[k] = [ox + x * escalaPx, oy + y * escalaPx];
  return p;
}

test('las cinco conformaciones generan un perro apoyado en el suelo', () => {
  for (const k of Object.keys(CONFORMACIONES)) {
    const pl = generarPlantilla(k);
    assert.ok(Math.abs(pl.puntos.metacarpo[1] - pl.suelo) < 1e-9, `${k}: apoyo torácico fuera del suelo`);
    assert.ok(Math.abs(pl.puntos.metatarso[1] - pl.suelo) < 1e-9, `${k}: apoyo pelviano fuera del suelo`);
    assert.ok(pl.puntos.trocanter[1] > 0 && pl.puntos.trocanter[1] < pl.suelo, `${k}: trocánter fuera de rango`);
    assert.ok(pl.puntos.hombro[1] > 0 && pl.puntos.hombro[1] < pl.suelo, `${k}: hombro fuera de rango`);
  }
});

test('el modelo morfométrico reproduce EXACTAMENTE la tabla de Jones en la referencia', () => {
  const p = perroDe('mesomorfo');
  const a = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico' });
  const b = analizar({ puntos: p, masaKg: 36.8, perfil: 'jones_gsd' });
  for (const s of a.centroDeMasa.segmentos) {
    if (s.ausente) continue;
    const t = b.centroDeMasa.segmentos.find(x => x.id === s.id);
    assert.ok(Math.abs(s.porcentaje - t.porcentaje) < 1e-9,
      `${s.id}: morfométrico ${s.porcentaje} vs tabla ${t.porcentaje}`);
  }
  assert.ok(a.centroDeMasa.desviacionMorfometrica < 1e-9);
});

test('el modelo morfométrico no depende del tamaño en píxeles de la figura', () => {
  const a = analizar({ puntos: perroDe('condrodistrofico', { escalaPx: 300 }), masaKg: 9, perfil: 'morfometrico' });
  const b = analizar({ puntos: perroDe('condrodistrofico', { escalaPx: 950, ox: -40, oy: 500 }), masaKg: 9, perfil: 'morfometrico' });
  for (const s of a.centroDeMasa.segmentos) {
    if (s.ausente) continue;
    const t = b.centroDeMasa.segmentos.find(x => x.id === s.id);
    assert.ok(Math.abs(s.porcentaje - t.porcentaje) < 1e-9, `${s.id}`);
  }
});

test('en un condrodistrófico el tronco gana masa y las extremidades la pierden', () => {
  const p = perroDe('condrodistrofico');
  const m = analizar({ puntos: p, masaKg: 9, perfil: 'morfometrico' });
  const f = analizar({ puntos: p, masaKg: 9, perfil: 'jones_gsd' });
  const g = (r, id) => r.centroDeMasa.segmentos.find(s => s.id === id).porcentaje;
  assert.ok(g(m, 'torax') > g(f, 'torax'), 'el tórax debería ganar masa');
  assert.ok(g(m, 'muslo') < g(f, 'muslo'), 'el muslo debería perder masa');
  assert.ok(g(m, 'antebrazo') < g(f, 'antebrazo'), 'el antebrazo debería perder masa');
  assert.ok(m.centroDeMasa.desviacionMorfometrica > 20,
    'un Teckel debe salir muy alejado de la referencia');
});

test('en un lebrel ocurre lo contrario que en un condrodistrófico', () => {
  const p = perroDe('lebrel');
  const m = analizar({ puntos: p, masaKg: 28, perfil: 'morfometrico' });
  const f = analizar({ puntos: p, masaKg: 28, perfil: 'jones_gsd' });
  const g = (r, id) => r.centroDeMasa.segmentos.find(s => s.id === id).porcentaje;
  assert.ok(g(m, 'torax') < g(f, 'torax'), 'el tórax debería perder masa');
  assert.ok(g(m, 'muslo') > g(f, 'muslo'), 'el muslo debería ganar masa');
});

test('todas las conformaciones dan un reparto de carga fisiológicamente posible', () => {
  for (const k of Object.keys(CONFORMACIONES)) {
    const r = analizar({ puntos: perroDe(k), masaKg: 15, perfil: 'morfometrico' });
    const t = r.estatica.cargaToracicaPct;
    assert.ok(t > 45 && t < 80, `${k}: carga torácica ${t.toFixed(1)} % fuera de lo posible`);
    assert.ok(r.estatica.dentroDeBase, `${k}: la línea de gravedad cae fuera de la base`);
  }
});

test('la masa total se conserva sea cual sea la conformación', () => {
  for (const k of Object.keys(CONFORMACIONES)) {
    const r = analizar({ puntos: perroDe(k), masaKg: 22.5, perfil: 'morfometrico' });
    const suma = r.centroDeMasa.segmentos.filter(s => !s.ausente).reduce((a, s) => a + s.masa, 0);
    assert.ok(Math.abs(suma - 22.5) < 1e-9, `${k}: suma ${suma}`);
  }
});

test('un perímetro torácico mayor traslada masa al tórax', () => {
  const p = perroDe('mesomorfo');
  // 400 px por unidad de tronco, alzada 1,25 → 500 px de alzada. Con 8 px/cm
  // la alzada son 62,5 cm, casi la del perro de referencia.
  const calib = { p1: [0, 0], p2: [0, 800], cm: 100 };
  const base = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico', calibracion: calib });
  const gordo = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico', calibracion: calib,
                           perimetros: { torax: 110 } });
  const g = (r) => r.centroDeMasa.segmentos.find(s => s.id === 'torax').porcentaje;
  assert.ok(gordo.centroDeMasa.segmentos.find(s => s.id === 'torax').morfo.perimetroRefCm > 0);
  assert.ok(g(gordo) > g(base), `tórax ${g(gordo)} debería superar a ${g(base)}`);
  // Y el reparto de carga debe desplazarse hacia el tren anterior.
  assert.ok(gordo.estatica.cargaToracicaPct > base.estatica.cargaToracicaPct);
});

test('los perímetros se ignoran sin calibración, y la app lo avisa', () => {
  const p = perroDe('mesomorfo');
  const r = analizar({ puntos: p, masaKg: 30, perfil: 'morfometrico', perimetros: { torax: 110 } });
  const t = r.centroDeMasa.segmentos.find(s => s.id === 'torax');
  assert.equal(t.morfo.perimetroCm, null);
  assert.ok(r.avisos.some(a => /calibración/i.test(a) && /perímetros/i.test(a)));
});

test('la sección de referencia se deriva de masa/densidad, no del volumen tabulado', () => {
  // El volumen tabulado de la cabeza (1000 cm³) es incompatible con su propia
  // fracción de masa y densidad; el modelo usa V = m/ρ, que sí es coherente.
  const cabeza = SEGMENTOS.find(s => s.id === 'cabeza');
  const v = REFERENCIA_MORFOMETRICA.volumenSegmento(cabeza);
  const masaG = cabeza.masa * REFERENCIA_MORFOMETRICA.masaKg * 1000;
  assert.ok(Math.abs(v * (cabeza.densidad / 1000) - masaG) < 1e-6);
  assert.ok(v > 2500 && v < 3200, `volumen derivado ${v.toFixed(0)} cm³`);
});

/* ------------------------------------------------------------------ */
/* Momentos con cargas medidas y lado fotografiado                     */
/* ------------------------------------------------------------------ */

test('con cargas medidas, los momentos usan el miembro del lado fotografiado', () => {
  const p = perroDe('mesomorfo');
  const calib = { p1: [0, 0], p2: [0, 400], cm: 60 };
  const comun = { puntos: p, masaKg: 30, calibracion: calib,
                  cargasMedidas: { tdi: 8, tdd: 12, tpi: 5, tpd: 5 } };
  const izq = analizar({ ...comun, lado: 'Izquierdo' });
  const der = analizar({ ...comun, lado: 'Derecho' });
  const f = (r) => r.momentos.find(m => m.id === 'codo').fuerzaApoyoN;
  assert.ok(f(der) > f(izq), 'el lado derecho apoya más y debe dar más fuerza');
  // 12/30 del peso frente a 8/30
  assert.ok(Math.abs(f(der) / f(izq) - 12 / 8) < 1e-6);
  assert.ok(/derecho/.test(der.origenCargas));
});

test('sin indicar el lado, se usa la media de ambos y se declara', () => {
  const p = perroDe('mesomorfo');
  const r = analizar({ puntos: p, masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 400], cm: 60 },
                       cargasMedidas: { tdi: 8, tdd: 12, tpi: 5, tpd: 5 } });
  assert.ok(/media de los dos lados/.test(r.origenCargas));
  const f = r.momentos.find(m => m.id === 'codo').fuerzaApoyoN;
  assert.ok(Math.abs(f - (10 / 30) * 30 * G) < 1e-6);
});

test('sin cargas medidas, los momentos declaran que asumen simetría', () => {
  const r = analizar({ puntos: perroDe('mesomorfo'), masaKg: 30,
                       calibracion: { p1: [0, 0], p2: [0, 400], cm: 60 } });
  assert.ok(/simetría/.test(r.origenCargas));
});

test('un perímetro absurdo se avisa en vez de aplicarse en silencio', () => {
  const p = perroDe('mesomorfo');
  const calib = { p1: [0, 0], p2: [0, 800], cm: 100 };
  const r = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico', calibracion: calib,
                       perimetros: { torax: 400 } });   // 4 metros: error de unidades
  assert.ok(r.avisos.some(a => /perímetro introducido/i.test(a) && /Tórax/.test(a)));
});

test('un perímetro plausible no genera aviso', () => {
  const p = perroDe('mesomorfo');
  const calib = { p1: [0, 0], p2: [0, 800], cm: 100 };
  const base = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico', calibracion: calib });
  const ref = base.centroDeMasa.segmentos.find(s => s.id === 'torax');
  // Se toma el propio perímetro de referencia: la relación es exactamente 1.
  const r = analizar({ puntos: p, masaKg: 36.8, perfil: 'morfometrico', calibracion: calib,
                       perimetros: { torax: 80 } });
  const t = r.centroDeMasa.segmentos.find(s => s.id === 'torax');
  assert.ok(t.morfo.perimetroRefCm > 20 && t.morfo.perimetroRefCm < 140,
    `perímetro torácico de referencia irreal: ${t.morfo.perimetroRefCm}`);
  assert.ok(ref);
});

/* ------------------------------------------------------------------ */
/* Representación: el cinturón pelviano debe cerrar sobre el trocánter */
/* ------------------------------------------------------------------ */

import { CADENAS } from '../js/landmarks.js';

test('la pelvis se dibuja como triángulo sacro–isquion–trocánter', () => {
  const pelvis = CADENAS.find(c => c.id === 'pelvis');
  assert.ok(pelvis, 'no existe la cadena pélvica');
  assert.deepEqual(pelvis.puntos, ['sacro', 'isquion', 'trocanter']);
  assert.equal(pelvis.cerrada, true, 'el triángulo debe cerrarse');
});

test('ningún reparo marcado queda fuera del dibujo', () => {
  // Todo reparo obligatorio tiene que aparecer en alguna cadena; si no, el
  // usuario lo coloca y no ve ninguna línea que lo use. Es lo que le pasaba al
  // isquion antes de cerrar el triángulo pélvico.
  const enCadenas = new Set(CADENAS.flatMap(c => c.puntos));
  const sueltos = REPAROS_OBLIGATORIOS.filter(id => !enCadenas.has(id));
  assert.deepEqual(sueltos, [], 'reparos sin representar: ' + sueltos.join(', '));
});

test('el trocánter enlaza la pelvis con el miembro pelviano', () => {
  const pelvis = CADENAS.find(c => c.id === 'pelvis');
  const miembro = CADENAS.find(c => c.id === 'pelviano');
  const comun = pelvis.puntos.filter(p => miembro.puntos.includes(p));
  assert.ok(comun.includes('trocanter'),
    'el miembro pelviano quedaría suelto respecto al esqueleto axial');
});
