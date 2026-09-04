/**
 * report.js — Informe clínico imprimible (se convierte en PDF con la función
 * "Imprimir → Guardar como PDF" del propio dispositivo, sin librerías externas
 * y sin conexión).
 */

import { FUENTES, REPARTO_REFERENCIA, REPARTO_RANGO, ASIMETRIA_NORMAL, DMCI, LIMITACIONES, ANGULOS_ESTACION, CDM_REFERENCIA,
         EXAMEN_ESTATICO, CLAUDICACION, DISFUNCION, CADENAS_CINETICAS } from './params.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(1) + u;
const n2 = (v, u = '') => (v === null || v === undefined || Number.isNaN(v)) ? '—' : v.toFixed(2) + u;

function tabla(cabeceras, filas) {
  return `<table><thead><tr>${cabeceras.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${filas.map(f => `<tr>${f.map((c, i) => `<td${i === 0 ? ' class="izq"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function construirInforme({ caso, analisis: R, imagenDataUrl }) {
  const f = caso.ficha || {};
  const est = R.estatica, cm = R.centroDeMasa;
  const med = R.repartoMedido;

  const morfo = cm.modo === 'morfometrico';
  const filasSeg = cm.segmentos.filter(s => !s.ausente).map(s => {
    const fila = [
      esc(s.nombre) + (s.par ? ' <span class="mini">(×2)</span>' : '') + (s.ajustado ? ' <span class="mini">*</span>' : ''),
      n2(s.porcentaje, ' %')
    ];
    if (morfo) {
      fila.push(n2(s.porcentajeTabla, ' %'));
      fila.push(s.morfo ? '×' + n2(s.adaptacion) + (s.morfo.perimetroCm ? ' <span class="mini">(perímetro medido)</span>' : '') : '—');
    }
    fila.push(R.masaKg ? n2(s.masa, ' kg') : '—');
    fila.push(n2(s.coefCom * 100, ' %'));
    fila.push(R.pxPorCm ? n1(s.longitudPx / R.pxPorCm, ' cm') : '—');
    return fila;
  });
  const cabecerasSeg = morfo
    ? ['Segmento', '% masa aplicado', '% tabla fija', 'Adaptación', 'Masa', 'CdM (% desde proximal)', 'Longitud']
    : ['Segmento', '% masa corporal', 'Masa', 'CdM (% desde proximal)', 'Longitud'];

  const filasAng = R.angulos.map(a => {
    const ref = ANGULOS_ESTACION[a.id];
    return [
      esc(a.nombre),
      a.valor === null ? '—' : n1(a.valor, '°'),
      a.variantePelvica ? n1(a.variantePelvica, '°') : '—',
      ref ? `${n1(ref.media, '°')} ± ${n1(ref.sd)} <span class="mini">[${ref.fuente}]</span>` : '<span class="mini">sin referencia publicada en estación</span>'
    ];
  });

  const filasMom = R.momentos.map(m => [
    esc(m.nombre),
    n1(m.fuerzaApoyoN, ' N'),
    n1(m.brazoPalancaCm, ' cm'),
    n2(m.momentoNm, ' N·m'),
    esc(m.ladoGRF || '—') + (m.efecto ? ` · ${esc(m.efecto)}` : '')
  ]);

  const filasLG = R.lineaGravedad.map(l => [esc(l.nombre), n1(l.distanciaCm, ' cm'), esc(l.lado)]);

  const filasRefReparto = REPARTO_REFERENCIA.map(r => [
    esc(r.etiqueta), r.sd === null ? n1(r.toracico, ' %') : `${n1(r.toracico)} ± ${n1(r.sd)} %`,
    esc(r.metodo), `<span class="mini">${esc(r.fuente)}</span>`
  ]);

  const fuentesUsadas = ['J18', 'R08', 'J22', 'H20', 'L21', 'A24', 'G22', 'P22', 'ML14', 'S08'];

  // Examen zooquinético: solo se imprime lo que el explorador haya rellenado.
  const filasExamen = EXAMEN_ESTATICO
    .filter(it => f.examen && f.examen[it.id])
    .map(it => [esc(it.nombre), esc(f.examen[it.id])]);
  const filasDisfuncion = [
    f.claudicacion ? ['Grado de claudicación', esc(f.claudicacion)] : null,
    f.capacidad ? ['Incapacidad / discapacidad', esc(f.capacidad)] : null,
    f.locus ? ['Localización del locus dolenti', esc(f.locus)] : null,
    f.estructural ? ['Deficiencia estructural', esc(f.estructural)] : null,
    f.observaciones ? ['Observaciones', esc(f.observaciones)] : null
  ].filter(Boolean);
  const hayExamen = filasExamen.length || filasDisfuncion.length;

  const filasSim = R.simetriaMuscular ? R.simetriaMuscular.filas.map(s => [
    esc(s.nombre), n1(s.fotografiadoCm, ' cm'), n1(s.contralateralCm, ' cm'),
    `${n1(Math.abs(s.diferenciaCm), ' cm')} (${n1(s.diferenciaPct, ' %')})`,
    s.menor ? esc(s.menor) : 'iguales'
  ]) : [];

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de valoración funcional en estática — ${esc(f.paciente || 'paciente')}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font: 11px/1.5 ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #1c2126; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #c96a3f; color: #7a3f21; }
  h3 { font-size: 11.5px; margin: 12px 0 4px; color: #3f6f9e; }
  .sub { color: #5b6570; font-size: 10.5px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 10px; }
  th, td { border: 1px solid #d6dbe0; padding: 3px 5px; text-align: right; }
  th { background: #eef2f5; font-weight: 600; text-align: right; }
  th:first-child, td.izq { text-align: left; }
  .mini { color: #6b7480; font-size: 9px; }
  .ficha { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 10px; margin-bottom: 8px; }
  .ficha div { border-bottom: 1px dotted #c3cad1; padding-bottom: 2px; }
  .ficha b { color: #5b6570; font-weight: 600; display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .3px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 4px; }
  .kpi { border: 1px solid #d6dbe0; border-left: 3px solid #c96a3f; border-radius: 4px; padding: 6px 8px; }
  .kpi b { display: block; font-size: 9px; color: #5b6570; text-transform: uppercase; letter-spacing: .3px; }
  .kpi span { font-size: 16px; font-weight: 600; }
  .kpi em { font-style: normal; color: #6b7480; font-size: 9px; display: block; }
  figure { margin: 8px 0; text-align: center; page-break-inside: avoid; }
  figure img { max-width: 100%; border: 1px solid #d6dbe0; border-radius: 4px; }
  figcaption { font-size: 9px; color: #6b7480; margin-top: 3px; }
  .aviso { background: #fff6e6; border-left: 3px solid #d99a2b; padding: 6px 9px; margin: 6px 0; font-size: 10px; border-radius: 0 4px 4px 0; }
  .critico { background: #fdecee; border-left-color: #b03a48; }
  ol.lim { font-size: 9.5px; color: #3c454d; padding-left: 16px; }
  ol.lim li { margin-bottom: 3px; }
  .refs { font-size: 8.8px; color: #46505a; }
  .refs li { margin-bottom: 3px; }
  .firma { margin-top: 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 10px; }
  .firma div { border-top: 1px solid #1c2126; padding-top: 3px; }
  footer { margin-top: 14px; border-top: 1px solid #d6dbe0; padding-top: 5px; font-size: 8.5px; color: #6b7480; }
  @media print { .noprint { display: none; } }
</style></head><body>

<h1>Valoración funcional en estática — diagrama de Dempster canino</h1>
<div class="sub">Análisis biomecánico bidimensional en el plano sagital a partir de fotografía en estación.
Generado por DempsterCan · ${esc(new Date().toLocaleString('es-MX'))}</div>

<div class="ficha">
  <div><b>Paciente</b>${esc(f.paciente || '—')}</div>
  <div><b>Especie / raza</b>${esc(f.raza || '—')}</div>
  <div><b>Edad</b>${esc(f.edad || '—')}</div>
  <div><b>Sexo</b>${esc(f.sexo || '—')}</div>
  <div><b>Masa corporal</b>${R.masaKg ? n1(R.masaKg, ' kg') : '—'}</div>
  <div><b>Fecha de la toma</b>${esc(caso.fecha || '—')}</div>
  <div><b>Lado fotografiado</b>${esc(f.lado || '—')}</div>
  <div><b>Explorador</b>${esc(f.explorador || '—')}</div>
  <div><b>Actividad</b>${esc(f.actividad || '—')}</div>
  <div><b>Hábitat</b>${esc(f.habitat || '—')}</div>
  <div style="grid-column: 1 / -1"><b>Motivo / diagnóstico</b>${esc(f.motivo || '—')}</div>
  ${f.antecedentes ? `<div style="grid-column: 1 / -1"><b>Cirugías y antecedentes</b>${esc(f.antecedentes)}</div>` : ''}
</div>

${imagenDataUrl ? `<figure><img src="${imagenDataUrl}" alt="Diagrama"><figcaption>
Diagrama de Dempster: cadenas segmentarias, centros de masa parciales (área proporcional a la fracción de masa),
centro de masa global, líneas de gravedad vertical y horizontal cuya intersección marca el centro de gravedad,
base de sustentación y reparto de carga.</figcaption></figure>` : ''}

${hayExamen ? `<h2>0. Examen zooquinético en estática</h2>
${filasExamen.length ? tabla(['Ítem de inspección', 'Valoración'], filasExamen) : ''}
${filasDisfuncion.length ? tabla(['Clasificación de la disfunción', 'Registro'], filasDisfuncion) : ''}
<div class="aviso">Inspección clínica registrada por el explorador siguiendo la pauta de Sterin (2008).
La app <b>no puntúa ni interpreta</b> estos ítems: los recoge para que el seguimiento del paciente reúna en un mismo
documento la observación clínica y la medición biomecánica.
${f.claudicacion ? esc(CLAUDICACION.nota) : ''}</div>` : ''}

<h2>1. Resultado estático</h2>
<div class="kpis">
  <div class="kpi"><b>Carga torácica</b><span>${n1(med ? med.toracicoPct : est.cargaToracicaPct, ' %')}</span>
    <em>${med ? 'medida en báscula/plataforma' : `estimada · IC95 ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %`}</em></div>
  <div class="kpi"><b>Carga pelviana</b><span>${n1(med ? med.pelvianoPct : est.cargaPelvianaPct, ' %')}</span>
    <em>${R.masaKg ? n1(est.cargaPorMiembroPelvianoKg, ' kg') + ' por miembro' : ''}</em></div>
  <div class="kpi"><b>CdM en la base</b><span>${n1(est.porcentajeBase, ' %')}</span>
    <em>0 % = apoyo torácico · 100 % = apoyo pelviano</em></div>
  <div class="kpi"><b>CdM bajo la cruz</b><span>${n1(est.descensoCdmBajoCruzCm, ' cm')}</span>
    <em>${est.alturaCdmCm ? n1(est.alturaCdmCm, ' cm') + ' sobre el suelo' : 'sin calibrar'}</em></div>
</div>

${R.referenciaCodo && R.referenciaCodo.caudalCm !== null ? `<div class="aviso ${R.referenciaCodo.coherente ? '' : 'critico'}">
<b>Situación respecto al codo.</b> ${esc(R.referenciaCodo.nota)} En este paciente el centro de masa queda
${n1(Math.abs(R.referenciaCodo.caudalCm), ' cm')} ${R.referenciaCodo.esCaudal ? 'caudal' : 'craneal'} y
${n1(Math.abs(R.referenciaCodo.dorsalCm), ' cm')} ${R.referenciaCodo.esProximal ? 'proximal' : 'distal'} al codo.</div>` : ''}

${est.descensoCdmBajoCruzCm !== null && est.descensoCdmBajoCruzCm !== undefined ? `<div class="aviso">
<b>Comprobación de coherencia del modelo.</b> El centro de masa calculado por suma de segmentos queda
${n1(est.descensoCdmBajoCruzCm, ' cm')} por debajo de la cruz. Johnson et al. (2022) midieron
${n1(CDM_REFERENCIA.descensoBajoCruz.media, ' cm')} ± ${n1(CDM_REFERENCIA.descensoBajoCruz.sd)} en 31 perros de 6,5 a 60 kg
(41 % de la distancia dorso-ventral). ${esc(CDM_REFERENCIA.aviso)}</div>` : ''}

${tabla(['Magnitud', 'Valor'], [
  ['Base de sustentación torácico-pelviana', n1(est.baseSustentacionCm, ' cm')],
  ['Distancia del CdM al apoyo torácico', n1(est.distanciaCdmApoyoToracicoCm, ' cm')],
  ['Distancia del CdM al apoyo pelviano', n1(est.distanciaCdmApoyoPelvianoCm, ' cm')],
  ['Peso corporal', R.masaKg ? n1(est.pesoN, ' N') : '—'],
  ['Carga por miembro torácico', R.masaKg ? n1(est.cargaPorMiembroToracicoKg, ' kg') : '—'],
  ['Carga por miembro pelviano', R.masaKg ? n1(est.cargaPorMiembroPelvianoKg, ' kg') : '—'],
  ['Altura a la cruz', n1(R.morfometria.alturaCruzCm, ' cm')],
  ['Longitud dorsal T1–sacro', n1(R.morfometria.longitudTroncoCm, ' cm')],
  ['Índice de formato (tronco / alzada)', n2(R.morfometria.indiceFormato)],
  ['Inclinación de la línea de apoyos respecto a la horizontal de la imagen', n1(est.inclinacionSuelo, '°')]
])}

<h3>Contraste con los valores publicados de reparto de carga</h3>
${tabla(['Población / método', '% torácico', 'Dispositivo', 'Fuente'], filasRefReparto)}
<div class="aviso"><b>No interprete el 60 % como umbral de normalidad.</b> ${esc(REPARTO_RANGO.nota)}
Rango de medias publicadas: ${n1(REPARTO_RANGO.min)}–${n1(REPARTO_RANGO.max)} % torácico.
El método de medida cambia el resultado unos 5 puntos porcentuales (básculas 63 % frente a pasarela de presión 68 % en los mismos perros, Linder 2021).</div>

${med ? `<h3>Reparto medido por miembro</h3>
${tabla(['Miembro', '% del peso'], [
  ['Torácico izquierdo', n1(med.porMiembro.toracicoIzq, ' %')],
  ['Torácico derecho', n1(med.porMiembro.toracicoDer, ' %')],
  ['Pelviano izquierdo', n1(med.porMiembro.pelvianoIzq, ' %')],
  ['Pelviano derecho', n1(med.porMiembro.pelvianoDer, ' %')]
])}
${tabla(['Índice', 'Paciente', 'Normal en perros sanos (Linder 2021)'], [
  ['Índice de simetría torácico', n1(med.indiceSimetriaToracico), `${n1(ASIMETRIA_NORMAL.B4.toracico.media)} ± ${n1(ASIMETRIA_NORMAL.B4.toracico.sd)} % (4 básculas) · ${n1(ASIMETRIA_NORMAL.PSW.toracico.media)} ± ${n1(ASIMETRIA_NORMAL.PSW.toracico.sd)} % (pasarela)`],
  ['Índice de simetría pelviano', n1(med.indiceSimetriaPelviano), `${n1(ASIMETRIA_NORMAL.B4.pelviano.media)} ± ${n1(ASIMETRIA_NORMAL.B4.pelviano.sd)} % (4 básculas) · ${n1(ASIMETRIA_NORMAL.PSW.pelviano.media)} ± ${n1(ASIMETRIA_NORMAL.PSW.pelviano.sd)} % (pasarela)`]
])}
<div class="aviso">Fórmula del índice de simetría (Alves 2024): SI = |(D − I) / ((D + I) × 0,5)| × 100.
Diferencia mínima clínicamente importante para declarar mejoría: <b>${DMCI.indiceSimetria} puntos</b> de índice de simetría y
<b>${DMCI.desviacion}</b> de desviación. ${esc(DMCI.nota)}
En perros sanos la asimetría del tren anterior es 2–3 veces mayor que la del posterior: use umbrales distintos.</div>` : ''}

${filasSim.length ? `<h3>Simetría muscular por perímetro</h3>
${tabla(['Perímetro', `Lado ${esc(R.simetriaMuscular.filas[0].ladoFotografiado)} (fotografiado)`, `Lado ${esc(R.simetriaMuscular.filas[0].ladoContralateral)}`, 'Diferencia', 'Lado menor'], filasSim)}
<div class="aviso">Sterin (2008) recomienda medir el perímetro muscular para seguir la evolución del paciente.
${esc(R.simetriaMuscular.nota)}</div>` : ''}

<div class="aviso ${est.dentroDeBase ? '' : 'critico'}"><b>Equilibrio.</b> ${esc(CADENAS_CINETICAS.equilibrio)}
En la postura fotografiada el centro de gravedad cae <b>${est.dentroDeBase ? 'dentro' : 'FUERA'}</b> de la base de
sustentación torácico-pelviana, a ${n1(est.porcentajeBase, ' %')} de su longitud desde el apoyo torácico.</div>

<h2>2. Ángulos articulares en estación</h2>
${tabla(['Articulación', 'Medido', 'Variante pélvica', 'Referencia publicada en estación'], filasAng)}
<div class="aviso critico"><b>Los ángulos de esta app y los de la bibliografía no son intercambiables.</b>
Giansetto et al. (2022) midieron por radiografía usando <i>ejes mecánicos</i> (centro de la cabeza femoral → centro femorotibial;
eminencias intercondíleas → centro del astrágalo). Esta app mide sobre <i>marcadores cutáneos</i> (trocánter mayor → cóndilo femoral
lateral → maléolo lateral). Como el trocánter está caudal a la cabeza femoral, el ángulo femorotibial medido aquí es
sistemáticamente menor que el radiográfico. Por eso la app <b>no marca automáticamente ningún valor como patológico</b>.
El criterio recomendado por la propia literatura es comparar con el <b>miembro contralateral del mismo perro</b> y con
<b>mediciones previas del mismo paciente y protocolo</b>.</div>
<div class="aviso">Los rangos goniométricos clásicos (Jaegger 2002, Formenton 2019, Reusing 2020) son <b>rango pasivo en decúbito lateral con manipulación</b>.
No son medibles desde una foto de un perro de pie y no se usan aquí como criterio.</div>

<h2>3. Línea de gravedad</h2>
<p>Distancia horizontal desde la vertical que pasa por el centro de masa global hasta el centro de cada articulación.
Es el brazo de palanca del peso corporal respecto a cada articulación en la postura fotografiada.</p>
${tabla(['Articulación', 'Distancia horizontal', 'Posición'], filasLG)}

${filasMom.length ? `<h2>4. Momentos articulares externos estáticos</h2>
<p>Equilibrio del sólido libre formado por todo lo distal a cada articulación:
M = F<sub>suelo</sub> · (s<sub>apoyo</sub> − s<sub>articulación</sub>) − Σ m<sub>k</sub> · g · (s<sub>k</sub> − s<sub>articulación</sub>).
Cargas de apoyo empleadas: <b>${esc(R.origenCargas || '—')}</b>.</p>
${tabla(['Articulación', 'Fuerza de apoyo', 'Brazo de palanca', 'Momento externo', 'Sentido'], filasMom)}
<div class="aviso">El signo del efecto (flexionar / extender) se obtiene <b>geométricamente</b> a partir de la propia postura
marcada, no de una tabla de supuestos. Un brazo de palanca mayor implica mayor demanda sobre la musculatura antagonista.</div>` : ''}

<h2>${filasMom.length ? '5' : '4'}. Modelo segmentario aplicado</h2>
<p>Perfil: <b>${esc(cm.perfil)}</b>. Los porcentajes de masa y los coeficientes de centro de masa proceden de mediciones
en perros; <b>no se ha usado ningún valor humano de Dempster (1955)</b>.
Los segmentos pares se contabilizan dos veces con la misma posición sagital (simetría izquierda-derecha asumida).</p>
<div class="aviso"><b>Nomenclatura del diagrama.</b> ${esc(CADENAS_CINETICAS.descripcion)}
${esc(CADENAS_CINETICAS.ubm)} ${esc(CADENAS_CINETICAS.sfc)} (Sterin 2008).
Como esta valoración parte de una fotografía sagital, se ven las cadenas de un solo hemicuerpo: las dos restantes se
asumen simétricas. La comparación real entre lados exige básculas, perímetros bilaterales o una segunda fotografía.</div>
${morfo ? `<div class="aviso"><b>Adaptación a la conformación de este paciente.</b>
La masa de cada segmento se ha redistribuido en proporción a su volumen, m ∝ ρ · A · L, con la longitud L medida sobre la
fotografía${cm.segmentos.some(s => s.morfo && s.morfo.perimetroCm) ? ' y la sección A deducida de los perímetros medidos con cinta' : ' y la sección A tomada de la referencia escalada a la alzada del paciente'},
y el total se ha normalizado a la masa corporal real. La columna «% tabla fija» es lo que habría dado aplicar las
fracciones de Jones 2018 sin adaptar.
Desviación de conformación respecto al perro de referencia: <b>${n1(cm.desviacionMorfometrica, ' %')}</b>
(normalizador de tamaño: ${esc(cm.morfometria?.normalizador || '—')}).
Cuando las proporciones del paciente coinciden con las de la referencia, el modelo devuelve exactamente la tabla publicada.</div>` : `<div class="aviso critico">
<b>Perfil de tabla fija.</b> Las fracciones de masa se han aplicado tal como se publicaron, sin adaptarlas a la
conformación de este paciente. Solo es válido en perros mesomorfos de talla grande.</div>`}
${tabla(cabecerasSeg, filasSeg)}
${cm.renormalizacion !== 1 ? `<div class="aviso">Faltan segmentos opcionales sin marcar; el resto se ha renormalizado por un factor de ${n2(cm.renormalizacion)} para que la suma siga siendo la masa corporal.</div>` : ''}
<div class="aviso"><b>Incertidumbre del modelo.</b> ${esc(R.incertidumbre.nota)}
Carga torácica estimada: ${n1(R.incertidumbre.media, ' %')} ± ${n1(R.incertidumbre.sd)} (DE), IC 95 % ${n1(R.incertidumbre.ic95[0])}–${n1(R.incertidumbre.ic95[1])} %, con ${R.incertidumbre.n} simulaciones.</div>

${R.avisos.length ? `<h2>${filasMom.length ? '6' : '5'}. Avisos de esta medición</h2><ul class="lim">${R.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}

<h2>${filasMom.length ? (R.avisos.length ? '7' : '6') : (R.avisos.length ? '6' : '5')}. Limitaciones del método</h2>
<ol class="lim">${LIMITACIONES.map(l => `<li>${esc(l)}</li>`).join('')}</ol>

<h2>Referencias</h2>
<ol class="refs">${fuentesUsadas.map(k => {
  const f2 = FUENTES[k]; if (!f2) return '';
  return `<li>${esc(f2.cita)}${f2.doi ? ` doi:${esc(f2.doi)}` : ''}${f2.muestra ? ` <span class="mini">— ${esc(f2.muestra)}</span>` : ''}</li>`;
}).join('')}</ol>

<div class="firma">
  <div>Explorador: ${esc(f.explorador || '')}</div>
  <div>Fecha y firma</div>
</div>

<footer>DempsterCan · herramienta de apoyo a la valoración funcional. No sustituye al examen clínico, a la palpación de los
reparos anatómicos ni al criterio del médico veterinario. Los parámetros inerciales proceden de poblaciones concretas
(Pastor Alemán, Labrador Retriever) y su extrapolación a otras conformaciones no está validada.</footer>

<div class="noprint" style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px;font:inherit">Imprimir / Guardar como PDF</button></div>
</body></html>`;
}

export function abrirInforme(html) {
  const w = window.open('', '_blank');
  if (!w) {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'informe-dempster.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}
