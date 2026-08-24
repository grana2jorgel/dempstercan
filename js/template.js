/**
 * template.js — Prealineamiento por plantilla canina.
 *
 * Con 2 o más reparos marcados por el usuario se ajusta una transformación de
 * semejanza (escala + rotación + traslación) por mínimos cuadrados, y se
 * proyecta la plantilla completa. El resultado es una POSICIÓN DE PARTIDA que
 * el usuario corrige arrastrando: nunca sustituye a la palpación.
 */

import { PLANTILLA, generarPlantilla } from './landmarks.js';

const plantillaDe = (conf) => (conf ? (generarPlantilla(conf) || PLANTILLA) : PLANTILLA);

/**
 * Semejanza 2D por mínimos cuadrados (solución cerrada, tipo Umeyama).
 * @param {Array<[number,number]>} origen  puntos de la plantilla
 * @param {Array<[number,number]>} destino puntos marcados en la imagen
 */
export function ajusteSemejanza(origen, destino) {
  const n = origen.length;
  if (n < 2 || destino.length !== n) return null;
  const mx = origen.reduce((a, q) => a + q[0], 0) / n;
  const my = origen.reduce((a, q) => a + q[1], 0) / n;
  const nx = destino.reduce((a, q) => a + q[0], 0) / n;
  const ny = destino.reduce((a, q) => a + q[1], 0) / n;

  let sxx = 0, sxy = 0, varO = 0;
  for (let i = 0; i < n; i++) {
    const ax = origen[i][0] - mx, ay = origen[i][1] - my;
    const bx = destino[i][0] - nx, by = destino[i][1] - ny;
    sxx += ax * bx + ay * by;   // parte "coseno"
    sxy += ax * by - ay * bx;   // parte "seno"
    varO += ax * ax + ay * ay;
  }
  if (varO < 1e-9) return null;
  const a = sxx / varO, b = sxy / varO;   // a = s·cosθ, b = s·senθ
  const escala = Math.hypot(a, b);
  if (escala < 1e-9) return null;
  return {
    a, b, escala, rotacion: Math.atan2(b, a),
    tx: nx - (a * mx - b * my),
    ty: ny - (b * mx + a * my),
    aplicar([x, y]) { return [this.a * x - this.b * y + this.tx, this.b * x + this.a * y + this.ty]; }
  };
}

/**
 * Proyecta la plantilla sobre la imagen a partir de los reparos ya marcados.
 * @param {Object} marcados  id → [x,y]
 * @param {Object} opts      { espejo:boolean, soloFaltantes:boolean }
 * @returns {Object|null}    id → [x,y] para todos los reparos de la plantilla
 */
export function proyectarPlantilla(marcados, opts = {}) {
  const espejo = !!opts.espejo;
  const base = {};
  for (const [k, [x, y]] of Object.entries(plantillaDe(opts.conformacion).puntos)) base[k] = [espejo ? -x : x, y];

  const comunes = Object.keys(base).filter(k => marcados[k]);
  if (comunes.length < 2) return null;

  const T = ajusteSemejanza(comunes.map(k => base[k]), comunes.map(k => marcados[k]));
  if (!T) return null;

  const salida = {};
  for (const k of Object.keys(base)) {
    if (opts.soloFaltantes && marcados[k]) { salida[k] = marcados[k]; continue; }
    salida[k] = T.aplicar(base[k]);
  }
  return salida;
}

/**
 * Coloca la plantilla completa dentro de un rectángulo (por ejemplo el recuadro
 * que el usuario dibuja alrededor del perro). Útil como primer golpe cuando no
 * hay ningún reparo marcado todavía.
 */
export function plantillaEnRecuadro(x0, y0, x1, y1, espejo = false, conformacion = null) {
  const pts = Object.entries(plantillaDe(conformacion).puntos);
  const xs = pts.map(([, q]) => (espejo ? -q[0] : q[0]));
  const ys = pts.map(([, q]) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rx = Math.min(x0, x1), ry = Math.min(y0, y1);
  const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
  if (rw < 8 || rh < 8) return null;
  const s = Math.min(rw / (maxX - minX), rh / (maxY - minY));
  const offX = rx + (rw - (maxX - minX) * s) / 2;
  const offY = ry + (rh - (maxY - minY) * s) / 2;
  const out = {};
  for (const [k, q] of pts) {
    const x = espejo ? -q[0] : q[0];
    out[k] = [offX + (x - minX) * s, offY + (q[1] - minY) * s];
  }
  return out;
}

/**
 * Refina el prealineamiento manteniendo fijos los reparos ya corregidos por el
 * usuario y reajustando el resto: cada corrección mejora los puntos vecinos.
 */
export function refinar(marcados, bloqueados, opts = {}) {
  const proyectado = proyectarPlantilla(marcados, { espejo: opts.espejo, conformacion: opts.conformacion });
  if (!proyectado) return marcados;
  const salida = { ...proyectado };
  for (const k of bloqueados) if (marcados[k]) salida[k] = marcados[k];
  return salida;
}
