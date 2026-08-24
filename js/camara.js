/**
 * camara.js — Captura de fotografía dentro de la app.
 *
 * Todo ocurre en el dispositivo: el flujo de vídeo nunca sale del navegador y
 * la foto se queda en el caso, en IndexedDB.
 *
 * La cámara no es solo un botón de disparo: la calidad de la medición depende
 * casi por completo de cómo se tome la foto. Por eso la vista de captura
 * incluye guías de encuadre, silueta de la conformación elegida y un indicador
 * de inclinación lateral del teléfono, que es el error más frecuente y el que
 * más falsea los ángulos.
 */

import { generarPlantilla } from './landmarks.js';

let stream = null;
let raf = 0;
let camaraActual = 'environment';
let inclinacion = null;
let escuchandoOrientacion = false;

const el = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- */
/* Inclinación del dispositivo                                       */
/* ---------------------------------------------------------------- */

function alOrientar(e) {
  const angPantalla = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  // Con el teléfono en vertical, el alabeo es gamma; en apaisado, beta.
  let r = (Math.abs(angPantalla) === 90) ? (e.beta ?? 0) : (e.gamma ?? 0);
  // En apaisado el valor útil es la desviación respecto a 0.
  inclinacion = Number.isFinite(r) ? r : null;
}

async function activarOrientacion() {
  if (escuchandoOrientacion) return;
  try {
    // iOS exige permiso explícito; en Android no existe esta función.
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') return;
    }
    window.addEventListener('deviceorientation', alOrientar, true);
    escuchandoOrientacion = true;
  } catch { /* sin sensor: se sigue sin indicador de nivel */ }
}

/* ---------------------------------------------------------------- */
/* Guías de encuadre                                                 */
/* ---------------------------------------------------------------- */

function dibujarGuias(conformacion, opciones) {
  const video = el('video'), lienzo = el('guias');
  if (!video || !lienzo) return;
  const r = video.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (lienzo.width !== Math.round(r.width * dpr) || lienzo.height !== Math.round(r.height * dpr)) {
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
  }
  const g = lienzo.getContext('2d');
  g.clearRect(0, 0, lienzo.width, lienzo.height);

  // El vídeo se muestra con object-fit: contain, así que casi nunca ocupa todo
  // el elemento: hay bandas negras. Las guías deben caer sobre la IMAGEN, no
  // sobre el hueco, o el encuadre que sugieren sería falso.
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const k = Math.min(lienzo.width / vw, lienzo.height / vh);
  const dw = vw * k, dh = vh * k;
  const dx = (lienzo.width - dw) / 2, dy = (lienzo.height - dh) / 2;
  const W = dw, H = dh;
  const X = (u) => dx + u, Y = (v) => dy + v;

  // Oscurecer las bandas para que se vea dónde acaba el encuadre real.
  if (dy > 1 || dx > 1) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    if (dy > 1) { g.fillRect(0, 0, lienzo.width, dy); g.fillRect(0, dy + dh, lienzo.width, dy + 1); }
    if (dx > 1) { g.fillRect(0, 0, dx, lienzo.height); g.fillRect(dx + dw, 0, dx + 1, lienzo.height); }
  }

  if (opciones.rejilla) {
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1 * dpr;
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(X(W * i / 3), Y(0)); g.lineTo(X(W * i / 3), Y(H)); g.stroke();
      g.beginPath(); g.moveTo(X(0), Y(H * i / 3)); g.lineTo(X(W), Y(H * i / 3)); g.stroke();
    }
  }

  // Línea de suelo sugerida, al 82 % de la altura del encuadre.
  const ySuelo = Y(H * 0.82);
  g.strokeStyle = 'rgba(217,154,43,0.85)'; g.lineWidth = 2 * dpr;
  g.setLineDash([10 * dpr, 7 * dpr]);
  g.beginPath(); g.moveTo(X(0), ySuelo); g.lineTo(X(W), ySuelo); g.stroke();
  g.setLineDash([]);

  if (opciones.silueta) {
    const pl = generarPlantilla(conformacion);
    if (pl) {
      const pts = Object.values(pl.puntos);
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const anchoUtil = W * 0.80, altoUtil = H * 0.58;
      const s = Math.min(anchoUtil / (maxX - minX), altoUtil / (maxY - minY));
      // Se alinea el suelo de la plantilla con la línea de suelo sugerida.
      const offX = X((W - (maxX - minX) * s) / 2) - minX * s;
      const offY = ySuelo - pl.suelo * s;
      const P = (id) => { const q = pl.puntos[id]; return [offX + q[0] * s, offY + q[1] * s]; };
      const cadenas = [
        ['hocico', 'occipucio', 't1', 't13', 'l7', 'sacro', 'colaPunta'],
        ['sacro', 'isquion'],
        ['escapulaDorsal', 'hombro', 'codo', 'carpo', 'metacarpo'],
        ['trocanter', 'rodilla', 'tarso', 'metatarso']
      ];
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3 * dpr;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const c of cadenas) {
        g.beginPath();
        c.forEach((id, i) => { const q = P(id); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
        g.stroke();
      }
    }
  }

  // Indicador de nivel: una línea que se inclina con el teléfono.
  if (inclinacion !== null) {
    const desv = Math.max(-25, Math.min(25, inclinacion));
    const ok = Math.abs(desv) <= 3;
    const cx = X(W / 2), cy = Y(H * 0.5), largo = W * 0.22;
    const a = desv * Math.PI / 180;
    g.strokeStyle = ok ? 'rgba(120,220,150,0.95)' : 'rgba(255,150,150,0.95)';
    g.lineWidth = 3 * dpr;
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * largo, cy - Math.sin(a) * largo);
    g.lineTo(cx + Math.cos(a) * largo, cy + Math.sin(a) * largo);
    g.stroke();
    g.fillStyle = g.strokeStyle;
    g.beginPath(); g.arc(cx, cy, 4 * dpr, 0, Math.PI * 2); g.fill();
  }
}

/* ---------------------------------------------------------------- */
/* Apertura y cierre                                                 */
/* ---------------------------------------------------------------- */

export function disponible() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * @param {Object} o { conformacion, alCapturar(dataUrl), alFallar(motivo) }
 */
export async function abrir(o) {
  const caja = el('camara');
  if (!disponible()) { o.alFallar && o.alFallar('sin-api'); return false; }
  caja.hidden = false;

  const opciones = { rejilla: el('camRejilla').checked, silueta: el('camSilueta').checked };
  el('camRejilla').onchange = (e) => opciones.rejilla = e.target.checked;
  el('camSilueta').onchange = (e) => opciones.silueta = e.target.checked;

  const info = el('camInfo');
  info.textContent = 'Pidiendo acceso a la cámara…';

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: camaraActual }, width: { ideal: 2560 }, height: { ideal: 1440 } },
      audio: false
    });
  } catch (e) {
    caja.hidden = true;
    const motivo = (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) ? 'permiso' : 'error';
    o.alFallar && o.alFallar(motivo, e);
    return false;
  }

  const video = el('video');
  video.srcObject = stream;
  await video.play().catch(() => {});
  activarOrientacion();

  const pista = stream.getVideoTracks()[0];
  const ajustes = pista ? pista.getSettings() : {};
  const res = (ajustes.width && ajustes.height) ? `${ajustes.width}×${ajustes.height}` : '';

  const bucle = () => {
    dibujarGuias(o.conformacion, opciones);
    if (inclinacion !== null && Math.abs(inclinacion) > 3) {
      info.classList.add('alerta');
      info.innerHTML = `Nivele el teléfono: <b>${Math.abs(inclinacion).toFixed(0)}° de inclinación</b><br>Perro de perfil, cámara a la altura del tórax`;
    } else {
      info.classList.remove('alerta');
      info.innerHTML = `Encuadre al perro sobre la línea de suelo${res ? ` · ${res}` : ''}<br>Cámara perpendicular al costado, incluya la regla`;
    }
    raf = requestAnimationFrame(bucle);
  };
  bucle();

  el('camCerrar').onclick = () => { cerrar(); o.alCancelar && o.alCancelar(); };
  el('camCambiar').onclick = async () => {
    camaraActual = camaraActual === 'environment' ? 'user' : 'environment';
    cerrar(); await abrir(o);
  };
  el('camDisparar').onclick = () => {
    const url = capturar();
    cerrar();
    if (url) o.alCapturar && o.alCapturar(url);
  };
  return true;
}

/** Congela el fotograma actual y lo devuelve como JPEG. */
export function capturar(maxLado = 2000) {
  const video = el('video');
  if (!video || !video.videoWidth) return null;
  const k = Math.min(1, maxLado / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * k), h = Math.round(video.videoHeight * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // La cámara frontal se muestra en espejo; se corrige para no invertir el perro.
  if (camaraActual === 'user') { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(video, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.9);
}

export function cerrar() {
  cancelAnimationFrame(raf); raf = 0;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  const v = el('video'); if (v) v.srcObject = null;
  const caja = el('camara'); if (caja) caja.hidden = true;
}
