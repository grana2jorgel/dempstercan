/**
 * render.js — Dibujo del diagrama de Dempster canino sobre canvas.
 * No calcula nada: recibe el resultado de biomech.analizar().
 */

import { REPAROS, REPAROS_POR_ID, CADENAS, ARTICULACIONES } from './landmarks.js';

export const PALETA = {
  axial:     '#3f6f9e',
  toracico:  '#c96a3f',
  pelviano:  '#4a8f6a',
  cdm:       '#b03a48',
  cdmSeg:    '#8a6bbf',
  gravedad:  '#b03a48',
  suelo:     '#5b6570',
  base:      '#d99a2b',
  angulo:    '#2f7f8f',
  acento:    '#c96a3f',
  texto:     '#1c2126',
  fondoTexto:'rgba(255,255,255,0.86)'
};

function lineaDiscontinua(ctx, a, b, patron = [7, 5]) {
  ctx.save(); ctx.setLineDash(patron);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.restore();
}

function etiqueta(ctx, texto, x, y, opts = {}) {
  const size = opts.size || 12;
  ctx.save();
  ctx.font = `${opts.bold ? '600 ' : ''}${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  const m = ctx.measureText(texto);
  const padX = 5, padY = 3, h = size + padY * 2;
  let bx = x, by = y - h / 2;
  if (opts.align === 'right') bx = x - m.width - padX * 2;
  else if (opts.align === 'center') bx = x - (m.width + padX * 2) / 2;
  ctx.fillStyle = opts.fondo || PALETA.fondoTexto;
  ctx.strokeStyle = opts.borde || 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  const r = 4, w = m.width + padX * 2;
  ctx.beginPath();
  ctx.moveTo(bx + r, by); ctx.arcTo(bx + w, by, bx + w, by + h, r);
  ctx.arcTo(bx + w, by + h, bx, by + h, r); ctx.arcTo(bx, by + h, bx, by, r);
  ctx.arcTo(bx, by, bx + w, by, r); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = opts.color || PALETA.texto;
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, bx + padX, by + h / 2 + 0.5);
  ctx.restore();
  return { x: bx, y: by, w, h };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} o  { imagen, puntos, analisis, opciones, ancho, alto }
 */
export function dibujar(ctx, o) {
  const { imagen, puntos: p, analisis: R } = o;
  const op = Object.assign({
    imagen: true, esqueleto: true, reparos: true, etiquetas: true,
    cdmSegmentos: true, cdmGlobal: true, gravedad: true, ejeHorizontal: true, base: true,
    angulos: true, cargas: true, cuadricula: false, opacidadImagen: 1, limpiar: true, fondo: '#ffffff'
  }, o.opciones || {});
  const W = o.ancho, H = o.alto;

  if (op.limpiar) { ctx.clearRect(0, 0, W, H); ctx.fillStyle = op.fondo; ctx.fillRect(0, 0, W, H); }

  if (imagen && op.imagen) {
    ctx.save(); ctx.globalAlpha = op.opacidadImagen;
    ctx.drawImage(imagen, 0, 0, W, H);
    ctx.restore();
  } else {
    ctx.fillStyle = '#f4f6f8'; ctx.fillRect(0, 0, W, H);
  }

  if (op.cuadricula) {
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  // Grosor de trazo. Si se pasa `escalaTrazo`, el dibujo mantiene un tamaño
  // constante en pantalla aunque se aplique zoom al lienzo.
  const esc = o.escalaTrazo || Math.max(1, Math.min(W, H) / 700);
  const marco = R && R.marco;

  /* ---- suelo y base de sustentación ------------------------------- */
  if (marco && op.base && p.metacarpo && p.metatarso) {
    const A = p.metacarpo, B = p.metatarso;
    const dir = marco.ejeS;
    const ext = 80 * esc;
    const a0 = [A[0] - dir[0] * ext, A[1] - dir[1] * ext];
    const b0 = [B[0] + dir[0] * ext, B[1] + dir[1] * ext];
    ctx.save();
    ctx.strokeStyle = PALETA.suelo; ctx.lineWidth = 2 * esc;
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); ctx.stroke();
    // Barra de base de sustentación, desplazada por debajo del suelo.
    const n = [-marco.ejeH[0], -marco.ejeH[1]];
    const off = 16 * esc;
    const a1 = [A[0] + n[0] * off, A[1] + n[1] * off];
    const b1 = [B[0] + n[0] * off, B[1] + n[1] * off];
    ctx.strokeStyle = PALETA.base; ctx.lineWidth = 5 * esc; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
    ctx.restore();
    if (op.etiquetas && R.estatica) {
      const mid = [(a1[0] + b1[0]) / 2 + n[0] * 14 * esc, (a1[1] + b1[1]) / 2 + n[1] * 14 * esc];
      const t = R.estatica.baseSustentacionCm
        ? `Base de sustentación ${R.estatica.baseSustentacionCm.toFixed(1)} cm`
        : 'Base de sustentación';
      etiqueta(ctx, t, mid[0], mid[1], { align: 'center', size: 12 * esc, color: '#8a6410' });
    }
  }

  /* ---- cadenas esqueléticas --------------------------------------- */
  if (op.esqueleto) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of CADENAS) {
      // Una cadena cerrada solo tiene sentido con todos sus vértices: si falta
      // uno se dibuja abierta, para no inventar un lado que no está marcado.
      const completos = c.puntos.every(id => p[id]);
      const pts = c.puntos.map(id => p[id]).filter(Boolean);
      if (pts.length < 2) continue;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (c.cerrada && completos && pts.length > 2) ctx.closePath();
      if (c.relleno && c.cerrada && completos && pts.length > 2) {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = PALETA[c.color];
        ctx.fill();
      }
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = PALETA[c.color]; ctx.lineWidth = 3 * esc;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- centros de masa segmentarios ------------------------------- */
  if (op.cdmSegmentos && R && R.centroDeMasa) {
    ctx.save();
    for (const s of R.centroDeMasa.segmentos) {
      if (s.ausente || !s.com) continue;
      const r = (3 + Math.sqrt(s.fraccion) * 22) * esc;
      ctx.beginPath(); ctx.arc(s.com[0], s.com[1], r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(138,107,191,0.30)'; ctx.fill();
      ctx.strokeStyle = PALETA.cdmSeg; ctx.lineWidth = 1.5 * esc; ctx.stroke();
      ctx.beginPath(); ctx.arc(s.com[0], s.com[1], 1.8 * esc, 0, Math.PI * 2);
      ctx.fillStyle = PALETA.cdmSeg; ctx.fill();
    }
    ctx.restore();
  }

  /* ---- ángulos ----------------------------------------------------- */
  if (op.angulos && R && R.angulos) {
    ctx.save();
    for (const a of R.angulos) {
      if (a.valor === null || a.valor === undefined) continue;
      const def = ARTICULACIONES.find(x => x.id === a.id);
      const V = p[def.vertice], P = p[def.prox], D = p[def.dist];
      if (!V || !P || !D) continue;
      const r = 26 * esc;
      const a1 = Math.atan2(P[1] - V[1], P[0] - V[0]);
      const a2 = Math.atan2(D[1] - V[1], D[0] - V[0]);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(V[0], V[1], r, a1, a1 + delta, delta < 0);
      ctx.strokeStyle = PALETA.angulo; ctx.lineWidth = 2 * esc; ctx.stroke();
      const mid = a1 + delta / 2;
      const lx = V[0] + Math.cos(mid) * (r + 20 * esc);
      const ly = V[1] + Math.sin(mid) * (r + 20 * esc);
      if (op.etiquetas) etiqueta(ctx, `${a.valor.toFixed(0)}°`, lx, ly, { align: 'center', size: 12 * esc, color: PALETA.angulo, bold: true });
    }
    ctx.restore();
  }

  /* ---- reparos ------------------------------------------------------ */
  if (op.reparos) {
    ctx.save();
    for (const r of REPAROS) {
      const q = p[r.id]; if (!q) continue;
      const color = r.grupo === 'toracico' ? PALETA.toracico : r.grupo === 'pelviano' ? PALETA.pelviano : PALETA.axial;
      ctx.beginPath(); ctx.arc(q[0], q[1], 5 * esc, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5 * esc; ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- línea de gravedad y centro de masa global -------------------- */
  if (R && R.centroDeMasa && (op.cdmGlobal || op.gravedad || op.ejeHorizontal)) {
    const C = R.centroDeMasa.cdm;
    // Eje horizontal del centro de gravedad. En el diagrama clásico de Dempster
    // aplicado al perro (Sterin 2008) el centro de gravedad se identifica como
    // la INTERSECCIÓN de dos líneas de puntos: la vertical (línea de gravedad)
    // y esta horizontal, paralela al suelo, que cruza el tronco a su altura.
    if (op.ejeHorizontal && marco) {
      const lat = marco.ejeS, largo = Math.max(W, H);
      ctx.save();
      ctx.strokeStyle = PALETA.gravedad; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.6 * esc;
      lineaDiscontinua(ctx,
        [C[0] + lat[0] * largo, C[1] + lat[1] * largo],
        [C[0] - lat[0] * largo, C[1] - lat[1] * largo], [7 * esc, 6 * esc]);
      ctx.restore();
    }
    if (op.gravedad && marco) {
      const up = marco.ejeH, largo = Math.max(W, H);
      ctx.save();
      ctx.strokeStyle = PALETA.gravedad; ctx.lineWidth = 2 * esc;
      lineaDiscontinua(ctx,
        [C[0] + up[0] * largo, C[1] + up[1] * largo],
        [C[0] - up[0] * largo, C[1] - up[1] * largo], [9 * esc, 6 * esc]);
      ctx.restore();
    }
    if (op.cdmGlobal) {
      ctx.save();
      const r = 11 * esc;
      // Símbolo estándar de centro de masa: círculo con cuadrantes alternos.
      ctx.beginPath(); ctx.arc(C[0], C[1], r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = PALETA.cdm; ctx.lineWidth = 2 * esc; ctx.stroke();
      ctx.fillStyle = PALETA.cdm;
      ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.arc(C[0], C[1], r, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.arc(C[0], C[1], r, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (op.etiquetas) etiqueta(ctx, 'CdM', C[0] + 16 * esc, C[1] - 14 * esc, { size: 12 * esc, color: PALETA.cdm, bold: true });
    }
  }

  /* ---- vectores de carga en los apoyos ------------------------------ */
  if (op.cargas && R && R.estatica && R.estatica.cargaToracicaPct !== null && marco) {
    const up = marco.ejeH;
    const medido = R.repartoMedido;
    const datos = [
      { punto: p.metacarpo, pct: medido ? medido.toracicoPct : R.estatica.cargaToracicaPct,
        kg: R.masaKg ? (medido ? medido.toracicoPct / 100 : R.estatica.cargaToracicaPct / 100) * R.masaKg : null,
        color: PALETA.toracico, txt: 'Torácicos', hacia: -1 },
      { punto: p.metatarso, pct: medido ? medido.pelvianoPct : R.estatica.cargaPelvianaPct,
        kg: R.masaKg ? (medido ? medido.pelvianoPct / 100 : R.estatica.cargaPelvianaPct / 100) * R.masaKg : null,
        color: PALETA.pelviano, txt: 'Pelvianos', hacia: 1 }
    ];
    const maxLargo = 120 * esc;
    ctx.save();
    for (const d of datos) {
      if (!d.punto) continue;
      const L = maxLargo * (d.pct / 100);
      const tip = [d.punto[0] + up[0] * L, d.punto[1] + up[1] * L];
      ctx.strokeStyle = d.color; ctx.lineWidth = 7 * esc; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(d.punto[0], d.punto[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.globalAlpha = 1;
      const t = d.kg !== null ? `${d.txt} ${d.pct.toFixed(1)} % · ${d.kg.toFixed(1)} kg` : `${d.txt} ${d.pct.toFixed(1)} %`;
      // La etiqueta se aparta del miembro hacia fuera de la base de
      // sustentación: encima del vector chocaba con el arco del ángulo distal.
      const fuera = 44 * esc * d.hacia;
      const lx = tip[0] + marco.ejeS[0] * fuera;
      const ly = tip[1] + marco.ejeS[1] * fuera - 10 * esc;
      if (op.etiquetas) etiqueta(ctx, t, lx, ly, {
        align: d.hacia < 0 ? 'right' : 'left', size: 12 * esc, color: d.color, bold: true
      });
    }
    ctx.restore();
  }

  /* ---- etiquetas de reparos ---------------------------------------- */
  if (op.reparos && op.etiquetas && op.nombresReparos) {
    for (const r of REPAROS) {
      const q = p[r.id]; if (!q) continue;
      etiqueta(ctx, r.corto, q[0] + 9 * esc, q[1] + 11 * esc, { size: 10.5 * esc });
    }
  }
}

/** Devuelve el id del reparo más cercano a (x,y) dentro de `radio` px. */
export function reparoCercano(puntos, x, y, radio = 22) {
  let mejor = null, dmin = radio * radio;
  for (const r of REPAROS) {
    const q = puntos[r.id]; if (!q) continue;
    const d = (q[0] - x) ** 2 + (q[1] - y) ** 2;
    if (d < dmin) { dmin = d; mejor = r.id; }
  }
  return mejor;
}

export { etiqueta, REPAROS_POR_ID };
