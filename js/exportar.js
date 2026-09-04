/**
 * exportar.js — Word (.docx) y ficha de resultados en imagen.
 *
 * Sin librerías y sin conexión. El .docx se construye a mano: un archivo .docx
 * es un ZIP con XML dentro (OOXML), así que aquí hay un escritor de ZIP mínimo
 * y el XML del documento. Se evita a propósito el truco de guardar HTML con
 * extensión .doc: Word para Android lo abre mal o no lo abre, y el objetivo es
 * poder mandar el informe desde el teléfono.
 */

/* ================================================================== */
/* Escritor de ZIP (método "store", sin compresión)                    */
/* ================================================================== */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const utf8 = (s) => new TextEncoder().encode(s);

/**
 * @param {Array<{nombre:string, datos:Uint8Array}>} archivos
 * @returns {Blob}
 */
export function crearZip(archivos) {
  const trozos = [];
  const central = [];
  let desplazamiento = 0;

  const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
  const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];

  for (const a of archivos) {
    const nombre = utf8(a.nombre);
    const crc = crc32(a.datos);
    const n = a.datos.length;

    const cabecera = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04,      // firma local
      20, 0, 0, 8,                  // versión 2.0, bandera UTF-8
      0, 0,                         // método 0 = almacenado
      0, 0, 0, 0,                   // hora y fecha (irrelevantes)
      ...u32(crc), ...u32(n), ...u32(n),
      ...u16(nombre.length), 0, 0
    ]);
    trozos.push(cabecera, nombre, a.datos);

    central.push(new Uint8Array([
      0x50, 0x4B, 0x01, 0x02,
      20, 0, 20, 0, 0, 8,
      0, 0, 0, 0, 0, 0,
      ...u32(crc), ...u32(n), ...u32(n),
      ...u16(nombre.length), 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0,
      ...u32(desplazamiento)
    ]), nombre);

    desplazamiento += cabecera.length + nombre.length + n;
  }

  const inicioCentral = desplazamiento;
  const tamCentral = central.reduce((a, c) => a + c.length, 0);
  const fin = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06, 0, 0, 0, 0,
    ...u16(archivos.length), ...u16(archivos.length),
    ...u32(tamCentral), ...u32(inicioCentral), 0, 0
  ]);

  return new Blob([...trozos, ...central, fin], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/* ================================================================== */
/* Utilidades de XML                                                   */
/* ================================================================== */

const x = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const n1 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(1) + u;
const n2 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(2) + u;

/** Párrafo. Tamaños en puntos; Word los quiere en medios puntos. */
function parrafo(texto, o = {}) {
  const pPr = [];
  if (o.espacioAntes || o.espacioDespues)
    pPr.push(`<w:spacing w:before="${(o.espacioAntes || 0) * 20}" w:after="${(o.espacioDespues ?? 6) * 20}"/>`);
  else pPr.push('<w:spacing w:after="120"/>');
  if (o.alineacion) pPr.push(`<w:jc w:val="${o.alineacion}"/>`);
  if (o.borde) pPr.push('<w:pBdr><w:bottom w:val="single" w:sz="12" w:color="C96A3F"/></w:pBdr>');

  const rPr = [];
  if (o.negrita) rPr.push('<w:b/>');
  if (o.cursiva) rPr.push('<w:i/>');
  if (o.tam) rPr.push(`<w:sz w:val="${o.tam * 2}"/><w:szCs w:val="${o.tam * 2}"/>`);
  if (o.color) rPr.push(`<w:color w:val="${o.color}"/>`);
  if (o.mayusculas) rPr.push('<w:caps/><w:spacing w:val="20"/>');

  const lineas = String(texto).split('\n');
  const runs = lineas.map((l, i) =>
    (i ? '<w:r><w:br/></w:r>' : '') +
    `<w:r>${rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${x(l)}</w:t></w:r>`
  ).join('');

  return `<w:p><w:pPr>${pPr.join('')}</w:pPr>${runs}</w:p>`;
}

function celda(texto, o = {}) {
  const ancho = o.ancho ? `<w:tcW w:w="${o.ancho}" w:type="pct"/>` : '';
  const sombra = o.fondo ? `<w:shd w:val="clear" w:fill="${o.fondo}"/>` : '';
  return `<w:tc><w:tcPr>${ancho}${sombra}<w:vAlign w:val="center"/></w:tcPr>` +
    parrafo(texto, { tam: o.tam || 9, negrita: o.negrita, alineacion: o.alineacion, espacioDespues: 2 }) +
    '</w:tc>';
}

function tabla(cabeceras, filas, anchos) {
  const bordes = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:color="D6DBE0"/>
    <w:left w:val="single" w:sz="4" w:color="D6DBE0"/>
    <w:bottom w:val="single" w:sz="4" w:color="D6DBE0"/>
    <w:right w:val="single" w:sz="4" w:color="D6DBE0"/>
    <w:insideH w:val="single" w:sz="4" w:color="D6DBE0"/>
    <w:insideV w:val="single" w:sz="4" w:color="D6DBE0"/>
  </w:tblBorders>`;
  const cab = cabeceras
    ? `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cabeceras.map((c, i) =>
        celda(c, { negrita: true, fondo: 'EEF2F5', ancho: anchos && anchos[i], tam: 8,
                   alineacion: i ? 'right' : 'left' })).join('')}</w:tr>`
    : '';
  const cuerpo = filas.map(f =>
    `<w:tr>${f.map((c, i) =>
      celda(c, { ancho: anchos && anchos[i], alineacion: i ? 'right' : 'left' })).join('')}</w:tr>`
  ).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${bordes}
    <w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/>
    <w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>
    </w:tblPr>${cab}${cuerpo}</w:tbl>` + parrafo('', { tam: 4, espacioDespues: 2 });
}

/** Imagen en línea. Word mide en EMU: 1 cm = 360 000 EMU. */
function imagen(idRel, anchoPx, altoPx, anchoCm = 16.5) {
  const cx = Math.round(anchoCm * 360000);
  const cy = Math.round(cx * (altoPx / anchoPx));
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:docPr id="1" name="Diagrama de Dempster"/>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr><pic:cNvPr id="0" name="diagrama.png"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${idRel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r></w:p>`;
}

/* ================================================================== */
/* Documento de Word                                                   */
/* ================================================================== */

/**
 * @param {Object} o { caso, analisis, imagenPng: {datos:Uint8Array, ancho, alto}|null,
 *                     referencias: {ANGULOS_ESTACION, REPARTO_REFERENCIA, LIMITACIONES, FUENTES, CDM_REFERENCIA} }
 * @returns {Blob} archivo .docx
 */
export function construirDocx(o) {
  const { caso, analisis: R, imagenPng, referencias: REF } = o;
  const f = caso.ficha || {};
  const est = R.estatica, cm = R.centroDeMasa, med = R.repartoMedido;
  const cuerpo = [];

  const H1 = (t) => parrafo(t, { tam: 16, negrita: true, espacioAntes: 0, espacioDespues: 2 });
  const H2 = (t) => parrafo(t, { tam: 12, negrita: true, color: '7A3F21', espacioAntes: 12, espacioDespues: 4, borde: true });
  const nota = (t) => parrafo(t, { tam: 8, color: '5B6570', espacioDespues: 8 });

  cuerpo.push(H1('Valoración funcional en estática — diagrama de Dempster canino'));
  cuerpo.push(parrafo('Análisis biomecánico bidimensional en el plano sagital a partir de fotografía en estación. Generado por DempsterCan el ' + new Date().toLocaleString('es-MX'),
    { tam: 8, color: '5B6570', espacioDespues: 10 }));

  /* --- ficha ---------------------------------------------------- */
  cuerpo.push(tabla(null, [
    ['Paciente', f.paciente || '—', 'Especie / raza', f.raza || '—'],
    ['Edad', f.edad || '—', 'Sexo', f.sexo || '—'],
    ['Masa corporal', R.masaKg ? n1(R.masaKg, ' kg') : '—', 'Fecha de la toma', caso.fecha || '—'],
    ['Lado fotografiado', f.lado || '—', 'Explorador', f.explorador || '—'],
    ['Actividad', f.actividad || '—', 'Hábitat', f.habitat || '—'],
    ['Motivo / diagnóstico', f.motivo || '—', 'Cirugías y antecedentes', f.antecedentes || '—']
  ], [22, 28, 22, 28]));

  /* --- examen zooquinético (solo lo que se haya rellenado) -------- */
  const filasExamen = (REF.EXAMEN_ESTATICO || [])
    .filter(it => f.examen && f.examen[it.id])
    .map(it => [it.nombre, f.examen[it.id]]);
  const filasDisfuncion = [
    f.claudicacion ? ['Grado de claudicación', f.claudicacion] : null,
    f.capacidad ? ['Incapacidad / discapacidad', f.capacidad] : null,
    f.locus ? ['Localización del locus dolenti', f.locus] : null,
    f.estructural ? ['Deficiencia estructural', f.estructural] : null,
    f.observaciones ? ['Observaciones', f.observaciones] : null
  ].filter(Boolean);
  if (filasExamen.length || filasDisfuncion.length) {
    cuerpo.push(H2('0. Examen zooquinético en estática'));
    if (filasExamen.length) cuerpo.push(tabla(['Ítem de inspección', 'Valoración'], filasExamen, [55, 45]));
    if (filasDisfuncion.length) cuerpo.push(tabla(['Clasificación de la disfunción', 'Registro'], filasDisfuncion, [40, 60]));
    cuerpo.push(nota('Inspección clínica registrada por el explorador siguiendo la pauta de Sterin (2008). La app no puntúa ni interpreta estos ítems: los recoge junto a la medición biomecánica.'
      + (f.claudicacion && REF.CLAUDICACION ? ' ' + REF.CLAUDICACION.nota : '')));
  }

  if (imagenPng) {
    cuerpo.push(imagen('rId10', imagenPng.ancho, imagenPng.alto));
    cuerpo.push(nota('Diagrama de Dempster: cadenas segmentarias, centros de masa parciales con área proporcional a la fracción de masa, centro de masa global, línea de gravedad, base de sustentación y reparto de carga.'));
  }

  /* --- resultado estático --------------------------------------- */
  cuerpo.push(H2('1. Resultado estático'));
  cuerpo.push(tabla(['Magnitud', 'Valor'], [
    ['Carga torácica', n1(med ? med.toracicoPct : est.cargaToracicaPct, ' %') + (med ? ' (medida)' : ` (IC 95 % ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %)`)],
    ['Carga pelviana', n1(med ? med.pelvianoPct : est.cargaPelvianaPct, ' %')],
    ['Carga por miembro torácico', R.masaKg ? n1(est.cargaPorMiembroToracicoKg, ' kg') : '—'],
    ['Carga por miembro pelviano', R.masaKg ? n1(est.cargaPorMiembroPelvianoKg, ' kg') : '—'],
    ['Centro de masa dentro de la base', n1(est.porcentajeBase, ' %') + ' desde el apoyo torácico'],
    ['Centro de masa por debajo de la cruz', n1(est.descensoCdmBajoCruzCm, ' cm')],
    ['Altura del centro de masa', n1(est.alturaCdmCm, ' cm')],
    ['Base de sustentación', n1(est.baseSustentacionCm, ' cm')],
    ['Altura a la cruz', n1(R.morfometria.alturaCruzCm, ' cm')],
    ['Longitud dorsal T1–sacro', n1(R.morfometria.longitudTroncoCm, ' cm')],
    ['Índice de formato (tronco / alzada)', n2(R.morfometria.indiceFormato)],
    ['Peso corporal', R.masaKg ? n1(est.pesoN, ' N') : '—']
  ], [55, 45]));

  if (REF.CDM_REFERENCIA && est.descensoCdmBajoCruzCm !== null && est.descensoCdmBajoCruzCm !== undefined) {
    const r = REF.CDM_REFERENCIA.descensoBajoCruz;
    cuerpo.push(nota(`Comprobación de coherencia del modelo: el centro de masa queda ${n1(est.descensoCdmBajoCruzCm, ' cm')} por debajo de la cruz. Johnson et al. (2022) midieron ${n1(r.media, ' cm')} ± ${n1(r.sd)} en 31 perros de 6,5 a 60 kg. ${REF.CDM_REFERENCIA.aviso}`));
  }

  cuerpo.push(parrafo('Contraste con los valores publicados', { tam: 10, negrita: true, espacioAntes: 8, espacioDespues: 4 }));
  cuerpo.push(tabla(['Población / método', '% torácico', 'Dispositivo'],
    REF.REPARTO_REFERENCIA.map(r => [r.etiqueta, r.sd === null ? n1(r.toracico, ' %') : `${n1(r.toracico)} ± ${n1(r.sd)} %`, r.metodo]),
    [45, 20, 35]));
  cuerpo.push(nota('No interprete el 60 % como umbral de normalidad: el rango de medias publicadas en perros sanos va del 59 al 69,4 % y el método de medida cambia el resultado unos 5 puntos porcentuales.'));

  if (med) {
    cuerpo.push(parrafo('Reparto medido por miembro', { tam: 10, negrita: true, espacioAntes: 8, espacioDespues: 4 }));
    cuerpo.push(tabla(['Miembro', '% del peso'], [
      ['Torácico izquierdo', n1(med.porMiembro.toracicoIzq, ' %')],
      ['Torácico derecho', n1(med.porMiembro.toracicoDer, ' %')],
      ['Pelviano izquierdo', n1(med.porMiembro.pelvianoIzq, ' %')],
      ['Pelviano derecho', n1(med.porMiembro.pelvianoDer, ' %')],
      ['Índice de simetría torácico', n1(med.indiceSimetriaToracico)],
      ['Índice de simetría pelviano', n1(med.indiceSimetriaPelviano)]
    ], [65, 35]));
    cuerpo.push(nota('En perros sanos la asimetría del tren anterior es 2–3 veces mayor que la del posterior (Linder 2021: 8,7 ± 7,5 % frente a 3,7 ± 2,9 % con cuatro básculas). Use umbrales distintos por tren. Mejoría clínicamente relevante: caída de al menos 10 puntos del índice de simetría (Alves 2024).'));
  }

  if (R.simetriaMuscular) {
    const s0 = R.simetriaMuscular.filas[0];
    cuerpo.push(parrafo('Simetría muscular por perímetro', { tam: 10, negrita: true, espacioAntes: 8, espacioDespues: 4 }));
    cuerpo.push(tabla(['Perímetro', `Lado ${s0.ladoFotografiado}`, `Lado ${s0.ladoContralateral}`, 'Diferencia'],
      R.simetriaMuscular.filas.map(s => [
        s.nombre, n1(s.fotografiadoCm, ' cm'), n1(s.contralateralCm, ' cm'),
        `${n1(Math.abs(s.diferenciaCm), ' cm')} (${n1(s.diferenciaPct, ' %')})` + (s.menor ? ` · menor: ${s.menor}` : '')
      ]), [30, 20, 20, 30]));
    cuerpo.push(nota('Sterin (2008) recomienda medir el perímetro muscular para seguir la evolución. ' + R.simetriaMuscular.nota));
  }

  if (REF.CADENAS_CINETICAS) {
    cuerpo.push(nota('Equilibrio: ' + REF.CADENAS_CINETICAS.equilibrio
      + ' En la postura fotografiada el centro de gravedad cae '
      + (est.dentroDeBase ? 'dentro' : 'FUERA') + ' de la base de sustentación torácico-pelviana (Sterin 2008).'));
  }

  /* --- ángulos --------------------------------------------------- */
  cuerpo.push(H2('2. Ángulos articulares en estación'));
  cuerpo.push(tabla(['Articulación', 'Medido', 'Referencia publicada'],
    R.angulos.map(a => {
      const ref = REF.ANGULOS_ESTACION[a.id];
      return [a.nombre, a.valor === null ? '—' : n1(a.valor, '°'),
              ref ? `${n1(ref.media, '°')} ± ${n1(ref.sd)}` : 'sin referencia en estación'];
    }), [40, 22, 38]));
  cuerpo.push(nota('Los ángulos de esta app y los de la bibliografía no son intercambiables. Giansetto et al. (2022) midieron por radiografía usando ejes mecánicos; esta app mide sobre marcadores cutáneos, y como el trocánter está caudal a la cabeza femoral el ángulo femorotibial sale sistemáticamente menor. Por eso no se marca ningún valor como patológico de forma automática. El criterio recomendado es comparar con el miembro contralateral del mismo perro y con mediciones previas del mismo paciente y protocolo.'));

  /* --- línea de gravedad ----------------------------------------- */
  if (R.lineaGravedad.some(l => l.distanciaCm !== null)) {
    cuerpo.push(H2('3. Línea de gravedad'));
    cuerpo.push(parrafo('Distancia horizontal desde la vertical que pasa por el centro de masa hasta el centro de cada articulación. Es el brazo de palanca del peso corporal en la postura fotografiada.', { tam: 9 }));
    cuerpo.push(tabla(['Articulación', 'Distancia', 'Posición'],
      R.lineaGravedad.map(l => [l.nombre, n1(l.distanciaCm, ' cm'), l.lado]), [35, 20, 45]));
  }

  /* --- momentos --------------------------------------------------- */
  if (R.momentos.length) {
    cuerpo.push(H2('4. Momentos articulares externos estáticos'));
    cuerpo.push(tabla(['Articulación', 'Fuerza', 'Brazo', 'Momento', 'Sentido'],
      R.momentos.map(m => [m.nombre, n1(m.fuerzaApoyoN, ' N'), n1(m.brazoPalancaCm, ' cm'),
                           n2(m.momentoNm, ' N·m'), m.efecto ? m.efecto.replace('tiende a ', '') : '—']),
      [30, 15, 15, 18, 22]));
    cuerpo.push(nota('Cargas de apoyo empleadas: ' + (R.origenCargas || '—') + '. El sentido se obtiene geométricamente de la propia postura marcada, no de una tabla de supuestos.'));
  }

  /* --- segmentos --------------------------------------------------- */
  const morfo = cm.modo === 'morfometrico';
  cuerpo.push(H2((R.momentos.length ? '5' : '4') + '. Modelo segmentario aplicado'));
  cuerpo.push(parrafo('Perfil: ' + cm.perfil + '. Los porcentajes de masa y los coeficientes de centro de masa proceden de mediciones en perros; no se ha usado ningún valor humano de Dempster (1955). Los segmentos pares se contabilizan dos veces con la misma posición sagital.', { tam: 9 }));
  cuerpo.push(tabla(
    morfo ? ['Segmento', '% aplicado', '% tabla fija', 'Masa', 'Longitud']
          : ['Segmento', '% masa', 'Masa', 'Longitud'],
    cm.segmentos.filter(s => !s.ausente).map(s => {
      const fila = [s.nombre + (s.par ? ' ×2' : ''), n2(s.porcentaje, ' %')];
      if (morfo) fila.push(n2(s.porcentajeTabla, ' %'));
      fila.push(R.masaKg ? n2(s.masa, ' kg') : '—');
      fila.push(R.pxPorCm ? n1(s.longitudPx / R.pxPorCm, ' cm') : '—');
      return fila;
    }),
    morfo ? [32, 17, 17, 17, 17] : [40, 20, 20, 20]));

  if (morfo && cm.desviacionMorfometrica !== null) {
    cuerpo.push(nota(`La masa de cada segmento se ha redistribuido en proporción a su volumen, con la longitud medida sobre la fotografía, y el total se ha normalizado a la masa corporal real. Desviación de conformación respecto al perro de referencia: ${n1(cm.desviacionMorfometrica, ' %')}. La columna «% tabla fija» es lo que habría dado aplicar las fracciones de Jones 2018 sin adaptar.`));
  }
  cuerpo.push(nota(R.incertidumbre.nota + ` Carga torácica estimada ${n1(R.incertidumbre.media, ' %')} ± ${n1(R.incertidumbre.sd)}, IC 95 % ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %.`));

  /* --- avisos y limitaciones --------------------------------------- */
  if (R.avisos.length) {
    cuerpo.push(H2('Avisos de esta medición'));
    R.avisos.forEach((a, i) => cuerpo.push(parrafo(`${i + 1}. ${a}`, { tam: 8, espacioDespues: 4 })));
  }

  cuerpo.push(H2('Limitaciones del método'));
  REF.LIMITACIONES.forEach((l, i) => cuerpo.push(parrafo(`${i + 1}. ${l}`, { tam: 8, espacioDespues: 4 })));

  cuerpo.push(H2('Referencias'));
  ['J18', 'R08', 'J22', 'H20', 'L21', 'A24', 'G22', 'P22', 'ML14', 'S08'].forEach((k, i) => {
    const fu = REF.FUENTES[k];
    if (fu) cuerpo.push(parrafo(`${i + 1}. ${fu.cita}${fu.doi ? ' doi:' + fu.doi : ''}`, { tam: 7, espacioDespues: 3 }));
  });

  cuerpo.push(parrafo('\n\n', { tam: 9 }));
  cuerpo.push(tabla(null, [[
    'Explorador: ' + (f.explorador || ''), 'Fecha y firma'
  ]], [50, 50]));

  cuerpo.push(parrafo('DempsterCan es una herramienta de apoyo a la valoración funcional. No es un producto sanitario certificado, no emite diagnósticos y no sustituye al examen clínico, a la palpación de los reparos anatómicos ni al criterio del médico veterinario.',
    { tam: 7, color: '6B7480', espacioAntes: 10 }));

  /* --- montaje del archivo ------------------------------------------ */
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<w:body>${cuerpo.join('')}
<w:sectPr>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="1134" w:right="1021" w:bottom="1134" w:left="1021" w:header="709" w:footer="709"/>
</w:sectPr>
</w:body></w:document>`;

  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relRaiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const relDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${imagenPng ? '<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagrama.png"/>' : ''}
</Relationships>`;

  const archivos = [
    { nombre: '[Content_Types].xml', datos: utf8(tipos) },
    { nombre: '_rels/.rels', datos: utf8(relRaiz) },
    { nombre: 'word/document.xml', datos: utf8(documento) },
    { nombre: 'word/_rels/document.xml.rels', datos: utf8(relDoc) }
  ];
  if (imagenPng) archivos.push({ nombre: 'word/media/diagrama.png', datos: imagenPng.datos });

  return crearZip(archivos);
}

/** Convierte un data URL en bytes. */
export function dataUrlABytes(url) {
  const base64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ================================================================== */
/* Ficha de resultados en imagen                                       */
/* ================================================================== */

const PAL = {
  fondo: '#ffffff', tinta: '#1c2126', tinta2: '#5b6570', tinta3: '#8b959f',
  linea: '#dde2e7', suave: '#f4f6f8',
  toracico: '#c96a3f', pelviano: '#4a8f6a', azul: '#3f6f9e', rojo: '#b03a48', ambar: '#d99a2b'
};

/**
 * Compone una imagen única con el diagrama y los resultados, pensada para
 * enviar por mensajería o pegar en la historia clínica.
 *
 * @param {Object} o { caso, analisis, lienzoDiagrama, referencias, ancho }
 * @returns {HTMLCanvasElement}
 */
export function fichaResultados(o) {
  const { caso, analisis: R, lienzoDiagrama: dia, referencias: REF } = o;
  const W = o.ancho || 1100;
  const M = 44;                       // margen
  const f = caso.ficha || {};
  const est = R.estatica, cm = R.centroDeMasa, med = R.repartoMedido;
  const morfo = cm.modo === 'morfometrico';

  // Primera pasada: medir la altura necesaria.
  const altoDiagrama = dia ? Math.round((W - M * 2) * (dia.height / dia.width)) : 0;
  const filasAng = R.angulos.length;
  const filasSeg = cm.segmentos.filter(s => !s.ausente).length;
  const filasMom = R.momentos.length;
  const alturaAvisos = R.avisos.reduce((a, t) => a + Math.ceil(t.length / 105) * 20 + 12, 0);

  const H = 150 + altoDiagrama + 30      // cabecera + diagrama
    + 130                                 // indicadores
    + 40 + filasAng * 30 + 60             // ángulos
    + (filasMom ? 40 + filasMom * 30 + 20 : 0)
    + 40 + filasSeg * 28 + 30             // segmentos
    + (R.avisos.length ? 36 + alturaAvisos : 0)
    + 90;                                 // pie

  const c = document.createElement('canvas');
  const escala = 2;
  c.width = W * escala; c.height = H * escala;
  const g = c.getContext('2d');
  g.scale(escala, escala);
  g.fillStyle = PAL.fondo; g.fillRect(0, 0, W, H);

  const fuente = (tam, peso = 400) =>
    `${peso} ${tam}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  let y = 0;

  /* --- cabecera ---------------------------------------------------- */
  g.fillStyle = PAL.tinta; g.fillRect(0, 0, W, 96);
  g.fillStyle = '#ffffff'; g.font = fuente(24, 700);
  g.fillText('Valoración funcional en estática', M, 42);
  g.font = fuente(13); g.fillStyle = 'rgba(255,255,255,.72)';
  g.fillText('Diagrama de Dempster canino · DempsterCan', M, 66);

  g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.font = fuente(17, 600);
  g.fillText(f.paciente || 'Paciente sin nombre', W - M, 40);
  g.font = fuente(12); g.fillStyle = 'rgba(255,255,255,.72)';
  const sub = [f.raza, R.masaKg ? n1(R.masaKg, ' kg') : null, caso.fecha,
               f.lado ? 'lado ' + f.lado.toLowerCase() : null].filter(Boolean).join(' · ');
  g.fillText(sub, W - M, 62);
  g.textAlign = 'left';
  y = 96 + 26;

  /* --- diagrama ------------------------------------------------------ */
  if (dia) {
    g.drawImage(dia, M, y, W - M * 2, altoDiagrama);
    g.strokeStyle = PAL.linea; g.lineWidth = 1;
    g.strokeRect(M + 0.5, y + 0.5, W - M * 2 - 1, altoDiagrama - 1);
    y += altoDiagrama + 26;
  }

  /* --- indicadores --------------------------------------------------- */
  const tPct = med ? med.toracicoPct : est.cargaToracicaPct;
  const pPct = med ? med.pelvianoPct : est.cargaPelvianaPct;
  const kpis = [
    { et: 'Carga torácica', v: n1(tPct, ' %'),
      s: med ? 'medida' : `IC95 ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %`, col: PAL.toracico },
    { et: 'Carga pelviana', v: n1(pPct, ' %'),
      s: R.masaKg ? n1(est.cargaPorMiembroPelvianoKg, ' kg') + ' por miembro' : '', col: PAL.pelviano },
    { et: 'CdM en la base', v: n1(est.porcentajeBase, ' %'), s: 'desde el apoyo torácico', col: PAL.azul },
    { et: 'CdM respecto al codo',
      v: R.referenciaCodo && R.referenciaCodo.caudalCm !== null
         ? n1(Math.abs(R.referenciaCodo.caudalCm), ' cm') + (R.referenciaCodo.esCaudal ? ' caudal' : ' craneal')
         : n1(est.descensoCdmBajoCruzCm, ' cm'),
      s: R.referenciaCodo && R.referenciaCodo.dorsalCm !== null
         ? n1(Math.abs(R.referenciaCodo.dorsalCm), ' cm') + (R.referenciaCodo.esProximal ? ' proximal' : ' distal')
         : 'sin calibrar', col: PAL.rojo }
  ];
  const anchoK = (W - M * 2 - 14 * 3) / 4;
  kpis.forEach((k, i) => {
    const bx = M + i * (anchoK + 14);
    g.strokeStyle = PAL.linea; g.lineWidth = 1;
    g.strokeRect(bx + 0.5, y + 0.5, anchoK - 1, 86);
    g.fillStyle = k.col; g.fillRect(bx, y, 3.5, 86);
    g.fillStyle = PAL.tinta2; g.font = fuente(10.5, 600);
    g.fillText(k.et.toUpperCase(), bx + 14, y + 22);
    g.fillStyle = PAL.tinta; g.font = fuente(27, 600);
    g.fillText(k.v, bx + 14, y + 55);
    g.fillStyle = PAL.tinta3; g.font = fuente(10.5);
    g.fillText(k.s, bx + 14, y + 74);
  });
  y += 98;

  // Barra de reparto
  g.fillStyle = PAL.toracico; g.fillRect(M, y, (W - M * 2) * tPct / 100, 9);
  g.fillStyle = PAL.pelviano; g.fillRect(M + (W - M * 2) * tPct / 100, y, (W - M * 2) * pPct / 100, 9);
  y += 34;

  /* --- utilidades de tabla -------------------------------------------- */
  function titulo(t) {
    g.fillStyle = PAL.tinta; g.font = fuente(13, 700);
    g.fillText(t, M, y + 14);
    g.strokeStyle = PAL.tinta; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(M, y + 24); g.lineTo(W - M, y + 24); g.stroke();
    y += 40;
  }
  function fila(cols, xs, o2 = {}) {
    const alto = o2.alto || 30;
    if (o2.cabecera) {
      g.fillStyle = PAL.tinta2; g.font = fuente(10.5, 600);
    } else {
      g.fillStyle = PAL.tinta; g.font = fuente(13);
    }
    cols.forEach((t, i) => {
      const alineaDerecha = i > 0;
      g.textAlign = alineaDerecha ? 'right' : 'left';
      g.fillText(String(t), alineaDerecha ? xs[i] : xs[i], y + alto * 0.66);
    });
    g.textAlign = 'left';
    if (!o2.cabecera) {
      g.strokeStyle = PAL.linea; g.lineWidth = 1;
      g.beginPath(); g.moveTo(M, y + alto); g.lineTo(W - M, y + alto); g.stroke();
    }
    y += alto;
  }

  /* --- ángulos --------------------------------------------------------- */
  const anchoT = W - M * 2;
  const colAng = [M, M + anchoT * 0.55, M + anchoT];
  titulo('Ángulos articulares en estación');
  fila(['ARTICULACIÓN', 'MEDIDO', 'REFERENCIA'], colAng, { cabecera: true, alto: 22 });
  for (const a of R.angulos) {
    const ref = REF.ANGULOS_ESTACION[a.id];
    fila([a.nombre, a.valor === null ? '—' : n1(a.valor, '°'),
          ref ? `${n1(ref.media, '°')} ± ${n1(ref.sd)}` : 'sin referencia'], colAng);
  }
  g.fillStyle = PAL.tinta2; g.font = fuente(11);
  y += 16;
  g.fillText('Referencias radiográficas con ejes mecánicos (Giansetto 2022); esta medición usa marcadores cutáneos. No son intercambiables.', M, y);
  y += 30;

  /* --- momentos --------------------------------------------------------- */
  if (filasMom) {
    const colM = [M, M + anchoT * 0.42, M + anchoT * 0.60, M + anchoT * 0.78, M + anchoT];
    titulo('Momentos articulares externos');
    fila(['ARTICULACIÓN', 'FUERZA', 'BRAZO', 'MOMENTO', 'SENTIDO'], colM, { cabecera: true, alto: 22 });
    for (const m of R.momentos) {
      fila([m.nombre, n1(m.fuerzaApoyoN, ' N'), n1(m.brazoPalancaCm, ' cm'),
            n2(m.momentoNm, ' N·m'), m.efecto ? m.efecto.replace('tiende a ', '') : '—'], colM);
    }
    y += 20;
  }

  /* --- segmentos --------------------------------------------------------- */
  const colS = morfo
    ? [M, M + anchoT * 0.40, M + anchoT * 0.58, M + anchoT * 0.78, M + anchoT]
    : [M, M + anchoT * 0.50, M + anchoT * 0.75, M + anchoT];
  titulo('Modelo segmentario — ' + cm.perfil);
  fila(morfo ? ['SEGMENTO', '% APLICADO', '% TABLA FIJA', 'MASA', 'LONGITUD']
             : ['SEGMENTO', '% MASA', 'MASA', 'LONGITUD'], colS, { cabecera: true, alto: 22 });
  for (const s of cm.segmentos) {
    if (s.ausente) continue;
    const cols = [s.nombre + (s.par ? ' ×2' : ''), n2(s.porcentaje, ' %')];
    if (morfo) cols.push(n2(s.porcentajeTabla, ' %'));
    cols.push(R.masaKg ? n2(s.masa, ' kg') : '—');
    cols.push(R.pxPorCm ? n1(s.longitudPx / R.pxPorCm, ' cm') : '—');
    fila(cols, colS, { alto: 28 });
  }
  y += 24;

  /* --- avisos ------------------------------------------------------------- */
  if (R.avisos.length) {
    titulo('Avisos de esta medición');
    g.font = fuente(11.5);
    for (const a of R.avisos) {
      const lineas = envolver(g, a, anchoT - 16);
      g.fillStyle = PAL.ambar; g.fillRect(M, y - 4, 3, lineas.length * 18 + 6);
      g.fillStyle = PAL.tinta2;
      lineas.forEach((l, i) => g.fillText(l, M + 12, y + 10 + i * 18));
      y += lineas.length * 18 + 12;
    }
  }

  /* --- pie ----------------------------------------------------------------- */
  y = H - 62;
  g.strokeStyle = PAL.linea; g.lineWidth = 1;
  g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
  g.fillStyle = PAL.tinta3; g.font = fuente(10.5);
  g.fillText('Herramienta de apoyo a la valoración funcional veterinaria. No sustituye al examen clínico, a la palpación de los reparos', M, y + 22);
  g.fillText('anatómicos ni al criterio del médico veterinario. Generado el ' + new Date().toLocaleString('es-MX') + '.', M, y + 40);

  return c;
}

function envolver(g, texto, ancho) {
  const palabras = String(texto).split(' ');
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (g.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/* ================================================================== */
/* Descarga y compartir                                                */
/* ================================================================== */

export function descargar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

/**
 * Comparte con la hoja del sistema si el dispositivo lo permite (Android),
 * y si no, descarga. Devuelve 'compartido' | 'descargado'.
 */
export async function compartirODescargar(blob, nombre, texto) {
  try {
    const archivo = new File([blob], nombre, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: nombre, text: texto || '' });
      return 'compartido';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelado';
  }
  descargar(blob, nombre);
  return 'descargado';
}
