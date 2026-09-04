/**
 * app.js — Interfaz. Orquesta marcado, cálculo, dibujo, historial e informe.
 */

import { REPAROS, REPAROS_POR_ID, REPAROS_OBLIGATORIOS, ORDEN_MARCADO, CONFORMACIONES, generarPlantilla } from './landmarks.js';
import { PERFILES, PERIMETROS, ANGULOS_ESTACION, REPARTO_RANGO, REPARTO_REFERENCIA, ASIMETRIA_NORMAL, DMCI, FUENTES, CDM_REFERENCIA, LIMITACIONES,
         EXAMEN_ESTATICO, VALORACION_ITEM, CLAUDICACION, DISFUNCION, CADENAS_CINETICAS } from './params.js';
import { analizar } from './biomech.js';
import { dibujar, reparoCercano, PALETA } from './render.js';
import { proyectarPlantilla, plantillaEnRecuadro } from './template.js';
import * as auto from './autodetect.js';
import * as store from './store.js';
import * as camara from './camara.js';
import { construirInforme, abrirInforme } from './report.js';
import { construirDocx, fichaResultados, dataUrlABytes, compartirODescargar } from './exportar.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const LIENZO_VIRTUAL = { w: 1400, h: 1000 };

/* =================================================================== */
/* Estado                                                              */
/* =================================================================== */

const S = {
  caso: nuevoCaso(),
  imagen: null,          // HTMLImageElement
  vista: { escala: 1, tx: 0, ty: 0 },
  activo: ORDEN_MARCADO[0],
  espejo: false,
  modo: 'marcar',        // 'marcar' | 'calibrar' | 'recuadro'
  calibTemp: [],
  recuadro: null,
  analisis: null,
  capas: {
    imagen: true, esqueleto: true, reparos: true, etiquetas: true, nombresReparos: false,
    cdmSegmentos: true, cdmGlobal: true, gravedad: true, ejeHorizontal: true, base: true, angulos: true,
    cargas: true, cuadricula: false, opacidadImagen: 1
  },
  arrastrando: null,
  gesto: null
};

function nuevoCaso() {
  return {
    id: store.nuevoId(),
    fecha: new Date().toISOString().slice(0, 10),
    ficha: {}, masaKg: null, calibracion: null, perfil: 'morfometrico',
    referencia: 'apoyos', cargasMedidas: null, dispositivo: '',
    conformacion: 'mesomorfo', perimetros: {},
    puntos: {}, imagen: null, imagenTam: null, guardado: false
  };
}

/* =================================================================== */
/* Lienzo: transformación de vista                                     */
/* =================================================================== */

const lienzo = $('#lienzo');
const ctx = lienzo.getContext('2d');
const lupa = $('#lupa');
const lupaCtx = lupa.getContext('2d');

function tamImagen() {
  if (S.imagen) return { w: S.imagen.naturalWidth, h: S.imagen.naturalHeight };
  if (S.caso.imagenTam) return S.caso.imagenTam;
  return LIENZO_VIRTUAL;
}

function ajustarLienzo() {
  const r = $('#lienzoWrap').getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  lienzo.width = Math.max(1, Math.round(r.width * dpr));
  lienzo.height = Math.max(1, Math.round(r.height * dpr));
  lienzo.style.width = r.width + 'px';
  lienzo.style.height = r.height + 'px';
  lienzo.dpr = dpr;
  pintar();
}

function encajar() {
  const t = tamImagen();
  const w = lienzo.width, h = lienzo.height;
  const s = Math.min(w / t.w, h / t.h) * 0.92;
  S.vista = { escala: s, tx: (w - t.w * s) / 2, ty: (h - t.h * s) / 2 };
  pintar();
}

const aImagen = (px, py) => [(px - S.vista.tx) / S.vista.escala, (py - S.vista.ty) / S.vista.escala];
const aPantalla = (x, y) => [x * S.vista.escala + S.vista.tx, y * S.vista.escala + S.vista.ty];

function eventoAPixel(e) {
  const r = lienzo.getBoundingClientRect();
  const dpr = lienzo.dpr || 1;
  return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
}

/* =================================================================== */
/* Cálculo y pintado                                                   */
/* =================================================================== */

function recalcular() {
  S.analisis = null;
  const p = S.caso.puntos;
  if (p.metacarpo && p.metatarso) {
    try {
      S.analisis = analizar({
        puntos: p, masaKg: S.caso.masaKg, calibracion: S.caso.calibracion,
        perfil: S.caso.perfil, referencia: S.caso.referencia,
        cargasMedidas: S.caso.cargasMedidas, perimetros: S.caso.perimetros,
        conformacion: S.caso.conformacion, lado: S.caso.ficha.lado, fecha: S.caso.fecha
      });
    } catch (e) { console.warn(e); }
  }
  pintarResultados();
  actualizarEstado();
}

function pintar() {
  const t = tamImagen();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--fondo') || '#eef1f4';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  ctx.save();
  ctx.translate(S.vista.tx, S.vista.ty);
  ctx.scale(S.vista.escala, S.vista.escala);

  // Lienzo de trabajo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, t.w, t.h);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1 / S.vista.escala;
  ctx.strokeRect(0, 0, t.w, t.h);

  dibujar(ctx, {
    imagen: S.imagen, puntos: S.caso.puntos, analisis: S.analisis,
    ancho: t.w, alto: t.h,
    escalaTrazo: Math.max(0.6, 1 / S.vista.escala),
    opciones: { ...S.capas, limpiar: false }
  });

  // Calibración en curso
  if (S.calibTemp.length) {
    ctx.save();
    ctx.strokeStyle = PALETA.base; ctx.fillStyle = PALETA.base;
    ctx.lineWidth = 2 / S.vista.escala;
    for (const q of S.calibTemp) { ctx.beginPath(); ctx.arc(q[0], q[1], 6 / S.vista.escala, 0, Math.PI * 2); ctx.stroke(); }
    if (S.calibTemp.length === 2) {
      ctx.beginPath(); ctx.moveTo(...S.calibTemp[0]); ctx.lineTo(...S.calibTemp[1]); ctx.stroke();
    }
    ctx.restore();
  } else if (S.caso.calibracion && S.capas.etiquetas) {
    const c = S.caso.calibracion;
    ctx.save();
    ctx.strokeStyle = PALETA.base; ctx.lineWidth = 2 / S.vista.escala; ctx.setLineDash([6 / S.vista.escala, 4 / S.vista.escala]);
    ctx.beginPath(); ctx.moveTo(...c.p1); ctx.lineTo(...c.p2); ctx.stroke();
    ctx.restore();
  }

  if (S.recuadro) {
    ctx.save();
    ctx.strokeStyle = PALETA.acento || '#c96a3f'; ctx.setLineDash([8 / S.vista.escala, 5 / S.vista.escala]);
    ctx.lineWidth = 2 / S.vista.escala;
    const r = S.recuadro;
    ctx.strokeRect(Math.min(r.x0, r.x1), Math.min(r.y0, r.y1), Math.abs(r.x1 - r.x0), Math.abs(r.y1 - r.y0));
    ctx.restore();
  }

  ctx.restore();
}

function mostrarLupa(px, py) {
  const t = tamImagen();
  const [ix, iy] = aImagen(px, py);
  const Z = 3.2, L = lupa.width;
  lupa.hidden = false;
  lupaCtx.setTransform(1, 0, 0, 1, 0, 0);
  lupaCtx.clearRect(0, 0, L, L);
  lupaCtx.save();
  lupaCtx.beginPath(); lupaCtx.arc(L / 2, L / 2, L / 2 - 2, 0, Math.PI * 2); lupaCtx.clip();
  lupaCtx.fillStyle = '#fff'; lupaCtx.fillRect(0, 0, L, L);
  const esc = S.vista.escala * Z;
  lupaCtx.translate(L / 2 - ix * esc, L / 2 - iy * esc);
  lupaCtx.scale(esc, esc);
  if (S.imagen && S.capas.imagen) lupaCtx.drawImage(S.imagen, 0, 0, t.w, t.h);
  dibujar(lupaCtx, {
    imagen: null, puntos: S.caso.puntos, analisis: S.analisis, ancho: t.w, alto: t.h,
    escalaTrazo: Math.max(0.5, 1 / esc),
    opciones: { ...S.capas, imagen: false, limpiar: false, etiquetas: false, cargas: false, angulos: false }
  });
  lupaCtx.restore();
  lupaCtx.strokeStyle = '#b03a48'; lupaCtx.lineWidth = 1;
  lupaCtx.beginPath(); lupaCtx.moveTo(L / 2 - 12, L / 2); lupaCtx.lineTo(L / 2 + 12, L / 2);
  lupaCtx.moveTo(L / 2, L / 2 - 12); lupaCtx.lineTo(L / 2, L / 2 + 12); lupaCtx.stroke();
  // Colocar la lupa en la esquina opuesta al dedo.
  const r = lienzo.getBoundingClientRect(), dpr = lienzo.dpr || 1;
  lupa.style.left = (px / dpr > r.width / 2) ? '10px' : (r.width - L - 10) + 'px';
}

/* =================================================================== */
/* Interacción con puntero                                             */
/* =================================================================== */

const punteros = new Map();

lienzo.addEventListener('pointerdown', (e) => {
  lienzo.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, eventoAPixel(e));
  if (punteros.size === 2) {
    const [a, b] = Array.from(punteros.values());
    S.gesto = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]), c0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v0: { ...S.vista } };
    S.arrastrando = null; lupa.hidden = true;
    return;
  }
  const [px, py] = punteros.get(e.pointerId);
  const [ix, iy] = aImagen(px, py);

  if (S.modo === 'calibrar') { return; }
  if (S.modo === 'recuadro') { S.recuadro = { x0: ix, y0: iy, x1: ix, y1: iy }; return; }

  const cerca = reparoCercano(S.caso.puntos, ix, iy, 26 / S.vista.escala);
  if (cerca) {
    S.arrastrando = cerca;
    seleccionar(cerca);
    mostrarLupa(px, py);
  } else {
    S.arrastrando = { pan: true, x: px, y: py, v0: { ...S.vista }, movido: false };
  }
});

lienzo.addEventListener('pointermove', (e) => {
  if (!punteros.has(e.pointerId)) return;
  punteros.set(e.pointerId, eventoAPixel(e));

  if (S.gesto && punteros.size === 2) {
    const [a, b] = Array.from(punteros.values());
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const k = Math.max(0.05, Math.min(40, S.gesto.v0.escala * (d / S.gesto.d0)));
    const f = k / S.gesto.v0.escala;
    S.vista.escala = k;
    S.vista.tx = c[0] - (S.gesto.c0[0] - S.gesto.v0.tx) * f;
    S.vista.ty = c[1] - (S.gesto.c0[1] - S.gesto.v0.ty) * f;
    pintar();
    return;
  }

  const [px, py] = punteros.get(e.pointerId);
  const [ix, iy] = aImagen(px, py);

  if (S.modo === 'recuadro' && S.recuadro) { S.recuadro.x1 = ix; S.recuadro.y1 = iy; pintar(); return; }

  if (typeof S.arrastrando === 'string') {
    S.caso.puntos[S.arrastrando] = [ix, iy];
    S.caso.guardado = false;
    recalcular(); pintar(); mostrarLupa(px, py);
  } else if (S.arrastrando && S.arrastrando.pan) {
    const dx = px - S.arrastrando.x, dy = py - S.arrastrando.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) S.arrastrando.movido = true;
    S.vista.tx = S.arrastrando.v0.tx + dx;
    S.vista.ty = S.arrastrando.v0.ty + dy;
    pintar();
  }
});

function finPuntero(e) {
  const info = punteros.get(e.pointerId);
  punteros.delete(e.pointerId);
  if (punteros.size < 2) S.gesto = null;
  lupa.hidden = true;

  if (!info) { S.arrastrando = null; return; }
  const [px, py] = info;
  const [ix, iy] = aImagen(px, py);

  if (S.modo === 'calibrar') {
    S.calibTemp.push([ix, iy]);
    if (S.calibTemp.length === 2) {
      S.caso.calibracion = { p1: S.calibTemp[0], p2: S.calibTemp[1], cm: Number($('#fCalCm').value) || null };
      S.modo = 'marcar'; S.calibTemp = [];
      if (!S.caso.calibracion.cm) brindis('Escriba ahora la distancia real en centímetros.');
      pintarCalibracion(); recalcular();
    }
    pintar(); S.arrastrando = null; return;
  }

  if (S.modo === 'recuadro' && S.recuadro) {
    let r = S.recuadro;
    let porToque = false;
    // Un toque simple, sin arrastrar, deja un recuadro de tamaño cero. Antes la
    // app no hacía nada y salía del modo en silencio, que es la peor respuesta
    // posible: el usuario se queda sin saber si pulsó mal. Ahora se coloca la
    // plantilla centrada en el punto tocado, ocupando la mayor parte de la
    // imagen, y ya se ajusta arrastrando los puntos.
    if (Math.abs(r.x1 - r.x0) < 12 || Math.abs(r.y1 - r.y0) < 12) {
      const t = tamImagen();
      const ancho = t.w * 0.80, alto = t.h * 0.62;
      const cx = Math.min(Math.max(r.x0, ancho / 2), t.w - ancho / 2);
      const cy = Math.min(Math.max(r.y0, alto / 2), t.h - alto / 2);
      r = { x0: cx - ancho / 2, y0: cy - alto / 2, x1: cx + ancho / 2, y1: cy + alto / 2 };
      porToque = true;
    }
    const pts = plantillaEnRecuadro(r.x0, r.y0, r.x1, r.y1, S.espejo, S.caso.conformacion);
    S.recuadro = null; S.modo = 'marcar';
    if (pts) {
      S.caso.puntos = pts; S.caso.guardado = false;
      brindis(porToque
        ? 'Plantilla colocada a ojo. Arrastre cada punto hasta el reparo palpado.'
        : 'Plantilla colocada. Arrastre cada punto hasta el reparo palpado.');
    } else {
      brindis('No se pudo colocar la plantilla. Inténtelo de nuevo.');
    }
    pintarLista(); recalcular(); pintar(); S.arrastrando = null; return;
  }

  if (S.arrastrando && S.arrastrando.pan && !S.arrastrando.movido && S.activo) {
    // Toque en zona libre: coloca el reparo activo.
    S.caso.puntos[S.activo] = [ix, iy];
    S.caso.guardado = false;
    siguienteReparo();
    pintarLista(); recalcular(); pintar();
  }
  S.arrastrando = null;
}
lienzo.addEventListener('pointerup', finPuntero);
lienzo.addEventListener('pointercancel', finPuntero);

lienzo.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [px, py] = eventoAPixel(e);
  const f = Math.exp(-e.deltaY * 0.0016);
  const k = Math.max(0.05, Math.min(40, S.vista.escala * f));
  const r = k / S.vista.escala;
  S.vista.tx = px - (px - S.vista.tx) * r;
  S.vista.ty = py - (py - S.vista.ty) * r;
  S.vista.escala = k;
  pintar();
}, { passive: false });

function zoom(f) {
  const cx = lienzo.width / 2, cy = lienzo.height / 2;
  const k = Math.max(0.05, Math.min(40, S.vista.escala * f));
  const r = k / S.vista.escala;
  S.vista.tx = cx - (cx - S.vista.tx) * r;
  S.vista.ty = cy - (cy - S.vista.ty) * r;
  S.vista.escala = k; pintar();
}

/* =================================================================== */
/* Lista de reparos                                                    */
/* =================================================================== */

function seleccionar(id) { S.activo = id; pintarLista(); }

function siguienteReparo() {
  const i = ORDEN_MARCADO.indexOf(S.activo);
  for (let k = 1; k <= ORDEN_MARCADO.length; k++) {
    const cand = ORDEN_MARCADO[(i + k) % ORDEN_MARCADO.length];
    if (!S.caso.puntos[cand]) { S.activo = cand; return; }
  }
  S.activo = ORDEN_MARCADO[(i + 1) % ORDEN_MARCADO.length];
}

function pintarLista() {
  const ul = $('#listaReparos');
  ul.innerHTML = '';
  for (const id of ORDEN_MARCADO) {
    const r = REPAROS_POR_ID[id];
    const li = document.createElement('li');
    li.className = `g-${r.grupo}` + (S.caso.puntos[id] ? ' puesto' : '') + (S.activo === id ? ' sel' : '');
    li.innerHTML = `<span class="punto"></span><span class="nom">${r.corto}</span>
      <span class="marca">${S.caso.puntos[id] ? '✓' : (r.opcional ? 'opcional' : '')}</span>`;
    li.onclick = () => seleccionar(id);
    ul.appendChild(li);
  }
  const r = REPAROS_POR_ID[S.activo];
  $('#reparoActivo').innerHTML = r
    ? `<div class="activo-nombre">${r.nombre}</div><div class="activo-guia">${r.guia}</div>`
    : '';
  const puestos = REPAROS_OBLIGATORIOS.filter(id => S.caso.puntos[id]).length;
  $('#contadorReparos').textContent = `${puestos}/${REPAROS_OBLIGATORIOS.length} obligatorios`;
}

/* =================================================================== */
/* Resultados                                                          */
/* =================================================================== */

const n1 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(1) + u;
const n2 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(2) + u;

function pintarResultados() {
  const c = $('#resultados');
  const R = S.analisis;
  if (!R) {
    const faltan = REPAROS_OBLIGATORIOS.filter(id => !S.caso.puntos[id]).map(id => REPAROS_POR_ID[id].corto);
    c.innerHTML = `<div class="nota">Para calcular hacen falta al menos los dos apoyos (metacarpo y metatarso).
      ${faltan.length ? `<br><br>Reparos obligatorios pendientes: <b>${faltan.join(', ')}</b>.` : ''}</div>`;
    return;
  }
  const e = R.estatica, med = R.repartoMedido;
  const tPct = med ? med.toracicoPct : e.cargaToracicaPct;
  const pPct = med ? med.pelvianoPct : e.cargaPelvianaPct;

  let html = `<div class="kpis">
    <div class="kpi"><b>Carga torácica</b><span>${n1(tPct, ' %')}</span>
      <em>${med ? 'medida' : `IC95 ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %`}</em></div>
    <div class="kpi verde"><b>Carga pelviana</b><span>${n1(pPct, ' %')}</span>
      <em>${R.masaKg ? n1(e.cargaPorMiembroPelvianoKg, ' kg') + ' / miembro' : '—'}</em></div>
    <div class="kpi azul"><b>CdM en la base</b><span>${n1(e.porcentajeBase, ' %')}</span><em>desde el apoyo torácico</em></div>
    <div class="kpi rojo"><b>CdM bajo la cruz</b><span>${n1(e.descensoCdmBajoCruzCm, ' cm')}</span>
      <em>${e.alturaCdmCm ? n1(e.alturaCdmCm, ' cm') + ' sobre el suelo' : 'sin calibrar'}</em></div>
  </div>
  <div class="barrita">
    <i style="width:${tPct}%;background:${PALETA.toracico}"></i>
    <i style="width:${pPct}%;background:${PALETA.pelviano}"></i>
  </div>`;

  if (e.descensoCdmBajoCruzCm !== null && e.descensoCdmBajoCruzCm !== undefined) {
    const d = e.descensoCdmBajoCruzCm, r = CDM_REFERENCIA.descensoBajoCruz;
    const dentro = Math.abs(d - r.media) <= 2 * r.sd;
    html += `<div class="nota ${dentro ? 'ok' : ''}">Comprobación de coherencia del modelo: el centro de masa queda
      <b>${n1(d, ' cm')}</b> por debajo de la cruz. Johnson et al. (2022) midieron ${n1(r.media, ' cm')} ± ${n1(r.sd)}
      en 31 perros de 6,5 a 60 kg. ${CDM_REFERENCIA.aviso}</div>`;
  }

  if (R.referenciaCodo && R.referenciaCodo.caudalCm !== null) {
    const c = R.referenciaCodo;
    html += `<div class="nota ${c.coherente ? 'ok' : 'critica'}">Respecto al <b>codo</b>, el centro de masa queda
      <b>${n1(Math.abs(c.caudalCm), ' cm')} ${c.esCaudal ? 'caudal' : 'CRANEAL'}</b> y
      <b>${n1(Math.abs(c.dorsalCm), ' cm')} ${c.esProximal ? 'proximal' : 'DISTAL'}</b>.
      La regla clínica clásica lo sitúa proximal y caudal al codo, hacia la apófisis xifoides.
      Es una comprobación del marcado, no un criterio de normalidad.</div>`;
  }

  html += `<div class="nota">Rango de medias publicadas en perros sanos: <b>${n1(REPARTO_RANGO.min)}–${n1(REPARTO_RANGO.max)} %</b> torácico
    (Labrador 69,4 ± 5,0 %; Pastor Alemán 62,4 ± 2,4 %; razas pequeñas 63 ± 3 % con básculas y 68 ± 4 % con pasarela).
    No use el 60 % como umbral único de normalidad.</div>`;

  html += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--tinta-2)">Ángulos en estación</h3>
  <table class="res"><thead><tr><th>Articulación</th><th>Medido</th><th>Referencia</th></tr></thead><tbody>`;
  for (const a of R.angulos) {
    const ref = ANGULOS_ESTACION[a.id];
    html += `<tr><td>${a.nombre}</td><td>${a.valor === null ? '—' : n1(a.valor, '°')}</td>
      <td>${ref ? `${n1(ref.media, '°')} ± ${n1(ref.sd)}` : '<span style="color:var(--tinta-3)">sin ref.</span>'}</td></tr>`;
  }
  html += `</tbody></table>
  <div class="nota critica">Las referencias son <b>radiográficas con ejes mecánicos</b> (Giansetto 2022); esta app mide sobre
    <b>marcadores cutáneos</b>. No son intercambiables y por eso no se marca nada como patológico de forma automática.
    Compare con el miembro contralateral y con mediciones previas del mismo paciente.</div>`;

  if (R.momentos.length) {
    html += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--tinta-2)">Momentos externos</h3>
    <table class="res"><thead><tr><th>Articulación</th><th>Brazo</th><th>Momento</th><th>Sentido</th></tr></thead><tbody>`;
    for (const m of R.momentos) {
      html += `<tr><td>${m.nombre}</td><td>${n1(m.brazoPalancaCm, ' cm')}</td><td>${n2(m.momentoNm, ' N·m')}</td>
        <td style="font-size:11px">${m.efecto ? m.efecto.replace('tiende a ', '') : '—'}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  if (med) {
    const dev = ASIMETRIA_NORMAL[S.caso.dispositivo] || ASIMETRIA_NORMAL.B4;
    html += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--tinta-2)">Simetría medida</h3>
    <table class="res"><thead><tr><th>Índice</th><th>Paciente</th><th>Sano (${dev.etiqueta})</th></tr></thead><tbody>
      <tr><td>Torácico</td><td>${n1(med.indiceSimetriaToracico)}</td><td>${n1(dev.toracico.media)} ± ${n1(dev.toracico.sd)}</td></tr>
      <tr><td>Pelviano</td><td>${n1(med.indiceSimetriaPelviano)}</td><td>${n1(dev.pelviano.media)} ± ${n1(dev.pelviano.sd)}</td></tr>
    </tbody></table>
    <div class="nota">Mejoría clínicamente relevante: caída de al menos ${Math.abs(DMCI.indiceSimetria)} puntos del índice de simetría (Alves 2024).</div>`;
  }

  if (R.simetriaMuscular) {
    html += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--tinta-2)">Simetría muscular (perímetros)</h3>
    <table class="res"><thead><tr><th>Perímetro</th><th>Fotografiado</th><th>Contralateral</th><th>Diferencia</th></tr></thead><tbody>`;
    for (const s of R.simetriaMuscular.filas) {
      html += `<tr><td>${s.nombre.replace('Perímetro del ', '')}</td><td>${n1(s.fotografiadoCm, ' cm')}</td>
        <td>${n1(s.contralateralCm, ' cm')}</td>
        <td>${n1(Math.abs(s.diferenciaCm), ' cm')} (${n1(s.diferenciaPct, ' %')})${s.menor ? '<br><span style="font-size:11px;color:var(--tinta-3)">menor: ' + s.menor + '</span>' : ''}</td></tr>`;
    }
    html += `</tbody></table><div class="nota">${R.simetriaMuscular.nota}</div>`;
  }

  html += `<div class="nota ${e.dentroDeBase ? 'ok' : 'critica'}">Equilibrio: ${CADENAS_CINETICAS.equilibrio}
    En esta postura el centro de gravedad cae <b>${e.dentroDeBase ? 'dentro' : 'FUERA'}</b> de la base de sustentación
    torácico-pelviana (Sterin 2008).</div>`;

  const morfo = R.centroDeMasa.modo === 'morfometrico';
  html += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--tinta-2)">Segmentos</h3>
  <table class="res"><thead><tr><th>Segmento</th><th>% masa</th>${morfo ? '<th>Tabla fija</th>' : ''}<th>Masa</th><th>Long.</th></tr></thead><tbody>`;
  for (const s of R.centroDeMasa.segmentos) {
    if (s.ausente) continue;
    const adapt = morfo && s.adaptacion ? s.adaptacion : 1;
    const color = Math.abs(adapt - 1) < 0.08 ? 'var(--tinta-3)' : (adapt > 1 ? PALETA.toracico : PALETA.acento2 || PALETA.pelviano);
    html += `<tr><td>${s.nombre}${s.par ? ' ×2' : ''}</td><td>${n2(s.porcentaje, ' %')}</td>
      ${morfo ? `<td style="color:${color}">${n2(s.porcentajeTabla, ' %')}</td>` : ''}
      <td>${R.masaKg ? n2(s.masa, ' kg') : '—'}</td>
      <td>${R.pxPorCm ? n1(s.longitudPx / R.pxPorCm, ' cm') : '—'}</td></tr>`;
  }
  html += `</tbody></table>`;
  if (morfo && R.centroDeMasa.desviacionMorfometrica !== null) {
    const d = R.centroDeMasa.desviacionMorfometrica;
    html += `<div class="nota ${d < 10 ? 'ok' : ''}">Desviación de conformación respecto al perro de referencia: <b>${n1(d, ' %')}</b>.
      La columna «tabla fija» muestra lo que habría dado aplicar las fracciones de Jones 2018 sin adaptar.
      Normalizador de tamaño: ${R.centroDeMasa.morfometria?.normalizador || '—'}.</div>`;
  }
  if (R.momentos.length) {
    html += `<div class="nota">Cargas usadas para los momentos: ${R.origenCargas}.</div>`;
  }

  for (const a of R.avisos) html += `<div class="nota">${a}</div>`;
  html += `<div class="nota ok">Modelo: <b>${R.centroDeMasa.perfil}</b>. Sin ningún valor extrapolado del humano.
    ${FUENTES[R.centroDeMasa.perfilFuente] ? FUENTES[R.centroDeMasa.perfilFuente].muestra : ''}</div>`;

  c.innerHTML = html;
}

function actualizarEstado() {
  const p = S.caso.puntos;
  let t;
  if (S.modo === 'calibrar') t = `Toque los dos extremos del objeto de referencia (${S.calibTemp.length}/2)`;
  else if (S.modo === 'recuadro') t = 'Arrastre un recuadro alrededor del perro';
  else if (!p.metacarpo || !p.metatarso) t = 'Marque los dos apoyos (metacarpo y metatarso) para empezar a calcular';
  else if (S.analisis) {
    const e = S.analisis.estatica;
    t = `Torácicos ${n1(S.analisis.repartoMedido ? S.analisis.repartoMedido.toracicoPct : e.cargaToracicaPct, ' %')} · pelvianos ${n1(S.analisis.repartoMedido ? S.analisis.repartoMedido.pelvianoPct : e.cargaPelvianaPct, ' %')}`;
  } else t = 'Continúe marcando reparos';
  $('#pastillaEstado').textContent = t;
  $('#tituloCaso').textContent = (S.caso.ficha.paciente || 'Caso sin nombre') +
    (S.caso.fecha ? ' · ' + S.caso.fecha : '') + (S.caso.guardado ? '' : ' •');
}

/* =================================================================== */
/* Formularios                                                         */
/* =================================================================== */

function leerFormulario() {
  const f = S.caso.ficha;
  f.paciente = $('#fPaciente').value.trim();
  f.raza = $('#fRaza').value.trim();
  f.edad = $('#fEdad').value.trim();
  f.sexo = $('#fSexo').value;
  f.lado = $('#fLado').value;
  f.explorador = $('#fExplorador').value.trim();
  f.motivo = $('#fMotivo').value.trim();
  f.actividad = $('#fActividad').value;
  f.habitat = $('#fHabitat').value;
  f.antecedentes = $('#fAntecedentes').value.trim();
  f.examen = {};
  for (const it of EXAMEN_ESTATICO) f.examen[it.id] = $('#ex-' + it.id).value;
  f.claudicacion = $('#fClaudicacion').value;
  f.capacidad = $('#fCapacidad').value;
  f.locus = $('#fLocus').value.trim();
  f.estructural = $('#fEstructural').value.trim();
  f.observaciones = $('#fObservaciones').value.trim();
  S.caso.fecha = $('#fFecha').value || S.caso.fecha;
  S.caso.masaKg = Number($('#fMasa').value) > 0 ? Number($('#fMasa').value) : null;
  S.caso.perfil = $('#fPerfil').value;
  S.caso.referencia = $('#fReferencia').value;
  S.caso.dispositivo = $('#fDispositivo').value;
  if (S.caso.calibracion) S.caso.calibracion.cm = Number($('#fCalCm').value) || null;

  S.caso.conformacion = $('#fConformacion').value || 'mesomorfo';
  S.caso.perimetros = {};
  for (const per of PERIMETROS) {
    for (const id of per.contralateral ? [per.id, per.id + '_contra'] : [per.id]) {
      const n = Number($('#per-' + id).value);
      if (Number.isFinite(n) && n > 0) S.caso.perimetros[id] = n;
    }
  }

  const v = ['fTdi', 'fTdd', 'fTpi', 'fTpd'].map(id => Number($('#' + id).value));
  S.caso.cargasMedidas = v.every(x => Number.isFinite(x) && x > 0)
    ? { tdi: v[0], tdd: v[1], tpi: v[2], tpd: v[3] } : null;
  S.caso.guardado = false;
  pintarCalibracion();
  recalcular(); pintar();
}

function escribirFormulario() {
  const f = S.caso.ficha || {};
  $('#fPaciente').value = f.paciente || ''; $('#fRaza').value = f.raza || '';
  $('#fEdad').value = f.edad || ''; $('#fSexo').value = f.sexo || '';
  $('#fLado').value = f.lado || ''; $('#fExplorador').value = f.explorador || '';
  $('#fMotivo').value = f.motivo || ''; $('#fFecha').value = S.caso.fecha || '';
  $('#fActividad').value = f.actividad || ''; $('#fHabitat').value = f.habitat || '';
  $('#fAntecedentes').value = f.antecedentes || '';
  for (const it of EXAMEN_ESTATICO) $('#ex-' + it.id).value = f.examen?.[it.id] || '';
  $('#fClaudicacion').value = f.claudicacion || '';
  $('#fCapacidad').value = f.capacidad || '';
  $('#fLocus').value = f.locus || ''; $('#fEstructural').value = f.estructural || '';
  $('#fObservaciones').value = f.observaciones || '';
  $('#fMasa').value = S.caso.masaKg ?? '';
  $('#fPerfil').value = S.caso.perfil || 'jones_gsd';
  $('#fReferencia').value = S.caso.referencia || 'apoyos';
  $('#fDispositivo').value = S.caso.dispositivo || '';
  $('#fConformacion').value = S.caso.conformacion || 'mesomorfo';
  $('#fCalCm').value = S.caso.calibracion?.cm ?? '';
  for (const per of PERIMETROS) {
    for (const id of per.contralateral ? [per.id, per.id + '_contra'] : [per.id]) {
      $('#per-' + id).value = S.caso.perimetros?.[id] ?? '';
    }
  }
  const cm = S.caso.cargasMedidas || {};
  $('#fTdi').value = cm.tdi ?? ''; $('#fTdd').value = cm.tdd ?? '';
  $('#fTpi').value = cm.tpi ?? ''; $('#fTpd').value = cm.tpd ?? '';
  notaPerfil();
  pintarCalibracion();
}

function notaPerfil() {
  const p = PERFILES[$('#fPerfil').value];
  $('#perfilNota').textContent = p ? `${p.descripcion} — ${FUENTES[p.fuente]?.muestra || ''}` : '';
}

function pintarCalibracion() {
  const c = S.caso.calibracion;
  const el = $('#estadoCalibracion');
  if (!c || !c.cm) { el.textContent = c ? 'Puntos marcados; falta la distancia real en cm.' : 'Sin calibrar.'; return; }
  const px = Math.hypot(c.p2[0] - c.p1[0], c.p2[1] - c.p1[1]);
  el.textContent = `Calibrado: ${(px / c.cm).toFixed(2)} px/cm (${px.toFixed(0)} px = ${c.cm} cm).`;
}

/* =================================================================== */
/* Foto, plantilla, detección                                          */
/* =================================================================== */

function cargarImagenDesdeDataUrl(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function reducir(file, maxLado = 2000) {
  // `imageOrientation: 'from-image'` aplica la rotación EXIF. Sin esto, las
  // fotos hechas con el teléfono en vertical llegan giradas 90°, y con ellas
  // todos los ángulos y la línea de gravedad saldrían mal.
  let bitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { bitmap = await createImageBitmap(file); }
  const k = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * k), h = Math.round(bitmap.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return c.toDataURL('image/jpeg', 0.85);
}

$('#inputFoto').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    await aplicarImagen(await reducir(f));
    brindis('Foto cargada. Coloque la plantilla o marque los reparos.');
  } catch (err) { brindis('No se pudo leer la imagen.'); console.warn(err); }
  e.target.value = '';
});

async function aplicarImagen(url) {
  S.caso.imagen = url;
  S.imagen = await cargarImagenDesdeDataUrl(url);
  S.caso.imagenTam = { w: S.imagen.naturalWidth, h: S.imagen.naturalHeight };
  S.caso.guardado = false;
  // recalcular() ANTES de encajar(): encajar() ya pinta, y si el análisis
  // todavía no existe el lienzo sale con el esqueleto pelado, sin centro de
  // masa ni ejes, hasta que el usuario toca algo. Se veía al reabrir un caso.
  recalcular(); encajar();
}

function abrirCamara() {
  if (!camara.disponible()) { brindis('Este dispositivo no permite abrir la cámara desde el navegador. Use "Subir desde galería".'); $('#inputFoto').click(); return; }
  camara.abrir({
    conformacion: S.caso.conformacion || 'mesomorfo',
    alCapturar: async (url) => { await aplicarImagen(url); brindis('Foto tomada. Coloque la plantilla y corrija los reparos.'); },
    alFallar: (motivo) => {
      brindis(motivo === 'permiso'
        ? 'Sin permiso de cámara. Actívelo en los ajustes del navegador, o suba la foto desde la galería.'
        : 'No se pudo abrir la cámara. Suba la foto desde la galería.');
      $('#inputFoto').click();
    }
  });
}

$('#btnFoto').onclick = abrirCamara;
$('#btnCamara').onclick = abrirCamara;
$('#btnGaleria').onclick = () => $('#inputFoto').click();

$('#btnPlantilla').onclick = () => {
  const marcados = Object.keys(S.caso.puntos).length;
  if (marcados >= 2) {
    const pts = proyectarPlantilla(S.caso.puntos, { espejo: S.espejo, soloFaltantes: true, conformacion: S.caso.conformacion });
    if (pts) {
      S.caso.puntos = pts; S.caso.guardado = false;
      pintarLista(); recalcular(); pintar();
      brindis('Plantilla ajustada a los reparos ya marcados. Corrija los demás.');
      return;
    }
  }
  S.modo = 'recuadro'; S.recuadro = null;
  brindis('Arrastre un recuadro alrededor del perro.');
  actualizarEstado();
};

$('#btnEspejo').onclick = () => {
  S.espejo = !S.espejo;
  brindis(S.espejo ? 'Plantilla orientada hacia la derecha.' : 'Plantilla orientada hacia la izquierda.');
};

async function comprobarModelo() {
  const r = await auto.comprobar();
  const el = $('#estadoAuto');
  if (r.disponible) {
    el.innerHTML = `Modelo instalado: <b>${r.cfg.nombre || r.cfg.archivo}</b>. La red coloca ${Object.keys(r.cfg.mapeo || {}).length} reparos aproximados; el resto se deduce por plantilla. <b>Todos deben corregirse a mano.</b>`;
  } else {
    el.innerHTML = `<b>La detección por red neuronal no está instalada</b>, y la app funciona igual sin ella:
      use <b>Colocar plantilla</b> y corrija los puntos arrastrando.
      <br><br>No es un fallo. Ningún conjunto de datos público de pose animal anota los reparos óseos que exige
      la goniometría canina —faltan escápula, epicóndilos, trocánter, maléolo y calcáneo—, así que una red
      solo daría un punto de partida aproximado, nunca una medición. Para instalarla de todos modos, consulte
      <code>tools/preparar_modelo.py</code> en el repositorio.`;
    const b = $('#btnAuto');
    b.disabled = true;
    b.textContent = 'Detección automática · no instalada';
    b.title = 'Requiere instalar un modelo ONNX. Vea tools/preparar_modelo.py.';
  }
}

$('#btnAuto').onclick = async () => {
  $('#btnAuto').disabled = true;
  const ok = await auto.inicializar(m => $('#estadoAuto').textContent = m);
  if (!ok) { $('#estadoAuto').textContent = 'No se pudo inicializar el modelo. Use la plantilla y el marcado manual.'; return; }
  try {
    const t = tamImagen();
    const fuente = S.imagen || lienzo;
    const r = await auto.detectar(fuente, { x: 0, y: 0, w: t.w, h: t.h });
    S.caso.puntos = r.puntos; S.caso.guardado = false;
    pintarLista(); recalcular(); pintar();
    brindis('Detección terminada. Corrija todos los puntos antes de firmar.');
    $('#estadoAuto').textContent = r.aviso;
  } catch (e) {
    console.warn(e);
    $('#estadoAuto').textContent = 'Error durante la detección: ' + e.message;
  } finally { $('#btnAuto').disabled = false; }
};

$('#btnCalibrar').onclick = () => { S.modo = 'calibrar'; S.calibTemp = []; actualizarEstado(); brindis('Toque los dos extremos del objeto de longitud conocida.'); };

$('#btnLimpiar').onclick = () => {
  if (!confirm('¿Borrar todos los reparos marcados de este caso?')) return;
  S.caso.puntos = {}; S.caso.guardado = false;
  S.activo = ORDEN_MARCADO[0];
  pintarLista(); recalcular(); pintar();
};

$('#btnAnterior').onclick = () => {
  const i = ORDEN_MARCADO.indexOf(S.activo);
  seleccionar(ORDEN_MARCADO[(i - 1 + ORDEN_MARCADO.length) % ORDEN_MARCADO.length]);
};
$('#btnSiguiente').onclick = () => {
  const i = ORDEN_MARCADO.indexOf(S.activo);
  seleccionar(ORDEN_MARCADO[(i + 1) % ORDEN_MARCADO.length]);
};

/* =================================================================== */
/* Capas                                                               */
/* =================================================================== */

const CAPAS_UI = [
  ['imagen', 'Fotografía'], ['esqueleto', 'Cadenas segmentarias'], ['reparos', 'Reparos'],
  ['nombresReparos', 'Nombres de los reparos'], ['cdmSegmentos', 'Centros de masa parciales'],
  ['cdmGlobal', 'Centro de masa global'], ['gravedad', 'Línea de gravedad (vertical)'],
  ['ejeHorizontal', 'Eje horizontal del CdG'],
  ['base', 'Base de sustentación'], ['angulos', 'Ángulos'], ['cargas', 'Vectores de carga'],
  ['etiquetas', 'Etiquetas numéricas'], ['cuadricula', 'Cuadrícula']
];

function pintarCapas() {
  const ul = $('#listaCapas'); ul.innerHTML = '';
  for (const [k, nombre] of CAPAS_UI) {
    const li = document.createElement('li');
    const id = 'capa-' + k;
    li.innerHTML = `<input type="checkbox" id="${id}" ${S.capas[k] ? 'checked' : ''}><label for="${id}" style="font-size:13.5px;color:var(--tinta)">${nombre}</label>`;
    li.querySelector('input').onchange = (e) => { S.capas[k] = e.target.checked; pintar(); };
    ul.appendChild(li);
  }
}
$('#fOpacidad').oninput = (e) => { S.capas.opacidadImagen = e.target.value / 100; pintar(); };

/* =================================================================== */
/* Casos                                                               */
/* =================================================================== */

async function pintarCasos() {
  const ul = $('#listaCasos'); ul.innerHTML = '';
  const casos = await store.listar();
  if (!casos.length) { ul.innerHTML = '<li style="color:var(--tinta-2)">Todavía no hay casos guardados.</li>'; return; }
  for (const c of casos) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="info"><strong>${c.ficha?.paciente || 'Sin nombre'}</strong>
      <small>${c.fecha || ''} · ${c.ficha?.raza || ''} ${c.masaKg ? '· ' + c.masaKg + ' kg' : ''}</small></div>
      <button class="icono" title="Borrar">🗑</button>`;
    li.querySelector('.info').onclick = () => abrirCaso(c.id);
    li.querySelector('button').onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`¿Borrar el caso de ${c.ficha?.paciente || 'sin nombre'}?`)) { await store.borrar(c.id); pintarCasos(); }
    };
    ul.appendChild(li);
  }
}

async function abrirCaso(id) {
  const c = await store.obtener(id);
  if (!c) return;
  S.caso = { ...nuevoCaso(), ...c, guardado: true };
  S.imagen = c.imagen ? await cargarImagenDesdeDataUrl(c.imagen).catch(() => null) : null;
  S.activo = ORDEN_MARCADO.find(k => !S.caso.puntos[k]) || ORDEN_MARCADO[0];
  escribirFormulario(); pintarLista(); recalcular(); encajar();
  $('#cajon').hidden = true;
  brindis('Caso abierto.');
}

$('#btnGuardar').onclick = async () => {
  leerFormulario();
  if (!S.caso.ficha.paciente) {
    const nombre = prompt('Nombre del paciente para guardar el caso:');
    if (!nombre) return;
    S.caso.ficha.paciente = nombre; $('#fPaciente').value = nombre;
  }
  await store.guardar({ ...S.caso, guardado: undefined });
  S.caso.guardado = true;
  actualizarEstado(); pintarCasos();
  brindis('Caso guardado en este dispositivo.');
};

$('#btnNuevo').onclick = () => {
  if (!S.caso.guardado && Object.keys(S.caso.puntos).length && !confirm('El caso actual tiene cambios sin guardar. ¿Continuar?')) return;
  S.caso = nuevoCaso(); S.imagen = null; S.activo = ORDEN_MARCADO[0];
  escribirFormulario(); pintarLista(); recalcular(); encajar();
  $('#cajon').hidden = true;
};

$('#btnMenu').onclick = () => { $('#cajon').hidden = false; pintarCasos(); };
$$('[data-cerrar]').forEach(el => el.onclick = () => $('#cajon').hidden = true);

$('#btnExportarJson').onclick = async () => {
  const txt = await store.exportarTodo();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
  a.download = `dempstercan-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$('#btnImportar').onclick = () => $('#inputJson').click();
$('#inputJson').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const n = await store.importar(await f.text()); brindis(`${n} casos importados.`); pintarCasos(); }
  catch (err) { brindis('Archivo no válido.'); }
  e.target.value = '';
};

/* =================================================================== */
/* Exportar imagen e informe                                           */
/* =================================================================== */

function lienzoDiagrama(escalaSalida = 2) {
  const t = tamImagen();
  const c = document.createElement('canvas');
  c.width = Math.round(t.w * escalaSalida); c.height = Math.round(t.h * escalaSalida);
  const g = c.getContext('2d');
  g.scale(escalaSalida, escalaSalida);
  dibujar(g, {
    imagen: S.imagen, puntos: S.caso.puntos, analisis: S.analisis,
    ancho: t.w, alto: t.h, opciones: { ...S.capas, limpiar: true }
  });
  return c;
}

const REFERENCIAS_EXPORT = { ANGULOS_ESTACION, REPARTO_REFERENCIA, LIMITACIONES, FUENTES, CDM_REFERENCIA,
                             EXAMEN_ESTATICO, CLAUDICACION, DISFUNCION, CADENAS_CINETICAS };

const nombreArchivo = (ext) =>
  `dempstercan-${(S.caso.ficha.paciente || 'caso').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_')}-${S.caso.fecha || 'sin-fecha'}.${ext}`;

function aBlob(lienzo, tipo = 'image/png', calidad) {
  return new Promise(res => lienzo.toBlob(res, tipo, calidad));
}

$('#btnExportar').onclick = () => {
  leerFormulario();
  if (!S.analisis) { brindis('Marque al menos los dos apoyos antes de exportar.'); return; }
  $('#hojaExportar').hidden = false;
};
$$('[data-cerrar-hoja]').forEach(el => el.onclick = () => $('#hojaExportar').hidden = true);

$$('[data-exportar]').forEach(boton => boton.onclick = async () => {
  const que = boton.dataset.exportar;
  $('#hojaExportar').hidden = true;
  if (!S.analisis) { brindis('No hay resultados que exportar todavía.'); return; }

  try {
    if (que === 'diagrama') {
      const blob = await aBlob(lienzoDiagrama(2));
      const r = await compartirODescargar(blob, nombreArchivo('png'), 'Diagrama de Dempster');
      if (r !== 'cancelado') brindis(r === 'compartido' ? 'Diagrama compartido.' : 'Diagrama descargado.');
      return;
    }

    if (que === 'ficha') {
      brindis('Componiendo la ficha…');
      const ficha = fichaResultados({
        caso: S.caso, analisis: S.analisis,
        lienzoDiagrama: lienzoDiagrama(1.5),
        referencias: REFERENCIAS_EXPORT
      });
      const blob = await aBlob(ficha);
      const r = await compartirODescargar(blob, nombreArchivo('png'), 'Ficha de resultados');
      if (r !== 'cancelado') brindis(r === 'compartido' ? 'Ficha compartida.' : 'Ficha descargada.');
      return;
    }

    if (que === 'word') {
      brindis('Generando el documento…');
      const lienzoDia = lienzoDiagrama(1.5);
      const url = lienzoDia.toDataURL('image/png');
      const blob = construirDocx({
        caso: S.caso, analisis: S.analisis,
        imagenPng: { datos: dataUrlABytes(url), ancho: lienzoDia.width, alto: lienzoDia.height },
        referencias: REFERENCIAS_EXPORT
      });
      const r = await compartirODescargar(blob, nombreArchivo('docx'), 'Informe de valoración funcional');
      if (r !== 'cancelado') brindis(r === 'compartido' ? 'Documento compartido.' : 'Documento descargado. Ábralo con Word.');
      return;
    }

    if (que === 'pdf') {
      const img = lienzoDiagrama(1.6).toDataURL('image/jpeg', 0.88);
      const html = construirInforme({ caso: S.caso, analisis: S.analisis, imagenDataUrl: img });
      if (!abrirInforme(html)) brindis('El navegador bloqueó la ventana; se ha descargado el informe como archivo.');
    }
  } catch (e) {
    console.warn(e);
    brindis('No se pudo generar el archivo: ' + e.message);
  }
});

/* =================================================================== */
/* Varios                                                              */
/* =================================================================== */

let brindisTimer;
function brindis(t) {
  const el = $('#brindis');
  el.textContent = t; el.hidden = false;
  clearTimeout(brindisTimer);
  brindisTimer = setTimeout(() => el.hidden = true, 3600);
}

$$('.pes').forEach(b => b.onclick = () => {
  $$('.pes').forEach(x => x.classList.remove('activa'));
  $$('.tab').forEach(x => x.classList.remove('activa'));
  b.classList.add('activa');
  $('#tab-' + b.dataset.tab).classList.add('activa');
});

$('#btnZoomMas').onclick = () => zoom(1.3);
$('#btnZoomMenos').onclick = () => zoom(1 / 1.3);
$('#btnEncajar').onclick = encajar;

['fPaciente', 'fRaza', 'fEdad', 'fSexo', 'fLado', 'fExplorador', 'fMotivo', 'fFecha',
 'fMasa', 'fPerfil', 'fReferencia', 'fDispositivo', 'fCalCm', 'fConformacion',
 'fTdi', 'fTdd', 'fTpi', 'fTpd'].forEach(id => {
  const el = $('#' + id);
  el.addEventListener('change', leerFormulario);
  el.addEventListener('input', () => { if (el.type === 'number' || el.type === 'text') leerFormulario(); });
});
$('#fPerfil').addEventListener('change', notaPerfil);
$('#fConformacion').addEventListener('change', () => {
  leerFormulario();
  brindis('Conformación cambiada. Vuelva a colocar la plantilla si quiere aplicarla.');
});

window.addEventListener('resize', ajustarLienzo);
window.addEventListener('beforeunload', (e) => {
  if (!S.caso.guardado && Object.keys(S.caso.puntos).length) { e.preventDefault(); e.returnValue = ''; }
});

/* =================================================================== */
/* Arranque                                                            */
/* =================================================================== */

function inicio() {
  const sel = $('#fPerfil');
  for (const [k, p] of Object.entries(PERFILES)) {
    const o = document.createElement('option'); o.value = k; o.textContent = p.nombre; sel.appendChild(o);
  }
  const selC = $('#fConformacion');
  for (const [k, c] of Object.entries(CONFORMACIONES)) {
    const o = document.createElement('option'); o.value = k; o.textContent = c.nombre; selC.appendChild(o);
  }
  const rej = $('#rejillaPerimetros');
  for (const per of PERIMETROS) {
    // Los perímetros musculares se piden en los dos lados: la diferencia entre
    // ellos es la medida de atrofia que recomienda Sterin (2008). El del lado
    // fotografiado es además el que alimenta el modelo morfométrico.
    const campos = per.contralateral
      ? [{ id: per.id, et: per.nombre + ' · lado fotografiado' },
         { id: per.id + '_contra', et: per.nombre + ' · contralateral' }]
      : [{ id: per.id, et: per.nombre }];
    for (const c of campos) {
      const l = document.createElement('label');
      l.innerHTML = `${c.et}<input id="per-${c.id}" type="number" step="0.1" min="0" inputmode="decimal" title="${per.guia}">`;
      rej.appendChild(l);
      l.querySelector('input').addEventListener('input', leerFormulario);
    }
  }

  const rejEx = $('#rejillaExamen');
  for (const it of EXAMEN_ESTATICO) {
    const l = document.createElement('label');
    l.innerHTML = `${it.nombre}<select id="ex-${it.id}">${
      VALORACION_ITEM.map(v => `<option value="${v}">${v}</option>`).join('')}</select>`;
    rejEx.appendChild(l);
    l.querySelector('select').addEventListener('change', leerFormulario);
  }
  $('#fClaudicacion').innerHTML = CLAUDICACION.grados
    .map(g => `<option value="${g}">${g}</option>`).join('');
  $('#fCapacidad').innerHTML = (DISFUNCION.campos.find(c => c.id === 'capacidad').opciones || [])
    .map(g => `<option value="${g}">${g}</option>`).join('');
  $('#notaClaudicacion').textContent = CLAUDICACION.nota;
  $('#acercaDe').innerHTML = `DempsterCan calcula el centro de masa, el reparto de carga estático, los ángulos
    articulares y los momentos externos de un perro en estación a partir de una fotografía lateral, aplicando los
    parámetros segmentarios caninos publicados. <b>No usa ningún coeficiente humano de Dempster (1955)</b>: existe tabla
    canina completa (Jones et al. 2018) para todos los segmentos salvo la escápula, que la app declara como no disponible
    en vez de rellenarla. Funciona sin conexión y guarda todo en este dispositivo.
    <br><br>Herramienta de apoyo: no sustituye al examen clínico ni a la palpación.`;

  escribirFormulario();
  pintarLista();
  pintarCapas();
  ajustarLienzo();
  encajar();
  recalcular();
  comprobarModelo();
  pintarCasos();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

inicio();
