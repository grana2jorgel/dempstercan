/**
 * landmarks.js — Reparos anatómicos, cadena esquelética, definición de ángulos
 * y plantilla canina normalizada para el prealineamiento.
 *
 * El set de reparos sigue a Pálya et al. 2022 (PLOS ONE 17(3):e0264299), que es
 * el set de marcadores cutáneos validado en cinemática canina, ampliado con la
 * tuberosidad calcánea y la tuberosidad isquiática (Brown et al. 2020) porque
 * ambos son necesarios: el calcáneo define el extremo proximal del segmento
 * "pie" en Jones 2018, y el isquion define el brazo fijo del ángulo coxofemoral.
 */

export const REPAROS = [
  { id: 'hocico',          nombre: 'Punta del hocico',              corto: 'Hocico',      grupo: 'axial',    opcional: true,
    guia: 'Borde alveolar de los incisivos superiores (prostion). Extremo distal del segmento cabeza en Jones 2018.' },
  { id: 'occipucio',       nombre: 'Protuberancia occipital',       corto: 'Occipucio',   grupo: 'axial',
    guia: 'Cresta occipital externa, palpable en la parte más alta y caudal del cráneo. Extremo proximal del segmento cabeza.' },
  { id: 't1',              nombre: 'Apófisis espinosa de T1 (cruz)',corto: 'T1 / cruz',   grupo: 'axial',
    guia: 'Punto más alto de la cruz. Frontera cuello/tórax.' },
  { id: 'escapulaDorsal',  nombre: 'Espina escapular, borde dorsal',corto: 'Escápula',    grupo: 'toracico',
    guia: 'Extremo dorsal de la espina de la escápula. Brazo fijo del ángulo del hombro. AVISO: es el reparo con mayor artefacto de tejido blando.' },
  { id: 't13',             nombre: 'Apófisis espinosa de T13',      corto: 'T13',         grupo: 'axial',
    guia: 'Última vértebra torácica, a la altura de la última costilla. Frontera tórax/abdomen.' },
  { id: 'l7',              nombre: 'Apófisis espinosa de L7',       corto: 'L7',          grupo: 'axial',    opcional: true,
    guia: 'Unión lumbosacra. Solo se usa para dibujar la línea dorsal; no interviene en el cálculo de masas.' },
  { id: 'sacro',           nombre: 'Ápice sacro / base de la cola', corto: 'Sacro',       grupo: 'axial',
    guia: 'Tuberosidad sacra del ilion. Extremo distal del abdomen y proximal de la cola.' },
  { id: 'isquion',         nombre: 'Tuberosidad isquiática',        corto: 'Isquion',     grupo: 'pelviano',
    guia: 'Punto más caudal de la pelvis. Junto con el sacro define el brazo fijo del ángulo coxofemoral.' },
  { id: 'colaPunta',       nombre: 'Punta de la cola',              corto: 'Cola',        grupo: 'axial',    opcional: true,
    guia: 'Si no se marca, el segmento cola (0,80 % de la masa) se omite y el resto se renormaliza.' },

  { id: 'hombro',          nombre: 'Tubérculo mayor del húmero',    corto: 'Hombro',      grupo: 'toracico',
    guia: 'Punto de inserción del infraespinoso. Centro aproximado de la articulación escápulo-humeral.' },
  { id: 'codo',            nombre: 'Epicóndilo lateral del húmero', corto: 'Codo',        grupo: 'toracico',
    guia: 'Prominencia ósea lateral del codo. Extremo distal del húmero y proximal del antebrazo.' },
  { id: 'carpo',           nombre: 'Apófisis estiloides ulnar',     corto: 'Carpo',       grupo: 'toracico',
    guia: 'Prominencia lateral distal del antebrazo, inmediatamente proximal al carpo.' },
  { id: 'metacarpo',       nombre: '5º metacarpiano distolateral',  corto: 'Metacarpo',   grupo: 'toracico', apoyo: 'toracico',
    guia: 'Márquelo en el punto de CONTACTO CON EL SUELO. Define el apoyo torácico y la base de sustentación.' },

  { id: 'trocanter',       nombre: 'Trocánter mayor del fémur',     corto: 'Trocánter',   grupo: 'pelviano',
    guia: 'Prominencia lateral de la cadera. AVISO: está caudal a la cabeza femoral, por lo que el ángulo coxofemoral medido aquí no equivale al radiográfico.' },
  { id: 'rodilla',         nombre: 'Cóndilo femoral lateral',       corto: 'Rodilla',     grupo: 'pelviano',
    guia: 'Prominencia lateral de la rodilla, caudal a la patela.' },
  { id: 'tarso',           nombre: 'Maléolo lateral de la fíbula',  corto: 'Tarso',       grupo: 'pelviano',
    guia: 'Prominencia lateral del corvejón. Extremo distal de la tibia.' },
  { id: 'calcaneo',        nombre: 'Tuberosidad calcánea',          corto: 'Calcáneo',    grupo: 'pelviano',
    guia: 'Punta del corvejón. Extremo proximal del segmento pie según Jones 2018.' },
  { id: 'metatarso',       nombre: '5º metatarsiano distolateral',  corto: 'Metatarso',   grupo: 'pelviano', apoyo: 'pelviano',
    guia: 'Márquelo en el punto de CONTACTO CON EL SUELO. Define el apoyo pelviano y la base de sustentación.' }
];

export const REPAROS_POR_ID = Object.fromEntries(REPAROS.map(r => [r.id, r]));
export const REPAROS_OBLIGATORIOS = REPAROS.filter(r => !r.opcional).map(r => r.id);

/** Cadena esquelética para el dibujo. */
export const CADENAS = [
  { id: 'axial',    color: 'axial',    puntos: ['hocico', 'occipucio', 't1', 't13', 'l7', 'sacro', 'colaPunta'] },
  { id: 'pelvis',   color: 'axial',    puntos: ['sacro', 'isquion'] },
  { id: 'toracico', color: 'toracico', puntos: ['escapulaDorsal', 'hombro', 'codo', 'carpo', 'metacarpo'] },
  { id: 'pelviano', color: 'pelviano', puntos: ['trocanter', 'rodilla', 'tarso', 'metatarso'] },
  { id: 'calcaneo', color: 'pelviano', puntos: ['calcaneo', 'tarso'] }
];

/**
 * Definición de los ángulos articulares medibles sobre la imagen.
 *
 * `vertice` es el punto de la articulación; `prox` y `dist` son los extremos de
 * los dos brazos. El ángulo se calcula como el ángulo entre los vectores
 * (prox − vertice) y (dist − vertice), con signo por producto cruzado para
 * poder representar valores por encima de 180° (carpo en hiperextensión).
 *
 * `lado` indica de qué lado de la articulación se lee el ángulo, deducido de la
 * magnitud de los valores publicados. `reflejo: true` significa que el valor
 * clínico es 360° − θ cuando θ se lee por el lado contrario.
 */
export const ARTICULACIONES = [
  { id: 'hombro',  nombre: 'Escápulo-humeral', vertice: 'hombro',    prox: 'escapulaDorsal', dist: 'codo',      tren: 'toracico', lado: 'craneal',
    definicion: 'Ángulo entre la espina de la escápula y el eje del húmero, con vértice en el tubérculo mayor. Protocolo de Jaegger 2002 / Formenton 2019 trasladado a coordenadas de imagen.' },
  { id: 'codo',    nombre: 'Codo',             vertice: 'codo',      prox: 'hombro',         dist: 'carpo',     tren: 'toracico', lado: 'craneal',
    definicion: 'Ángulo entre el eje del húmero y el eje del antebrazo, con vértice en el epicóndilo lateral.' },
  { id: 'carpo',   nombre: 'Carpo',            vertice: 'carpo',     prox: 'codo',           dist: 'metacarpo', tren: 'toracico', lado: 'palmar', permiteReflejo: true,
    definicion: 'Ángulo entre el eje del antebrazo y el eje de los metacarpianos. En hiperextensión supera los 180°, por eso se calcula con signo.' },
  { id: 'cadera',  nombre: 'Coxofemoral',      vertice: 'trocanter', prox: 'sacro',          dist: 'rodilla',   tren: 'pelviano', lado: 'craneal',
    definicion: 'Ángulo sacro–trocánter–rodilla. APROXIMACIÓN DE IMAGEN: el protocolo goniométrico usa la línea tuber sacrale–tuber ischiadicum como brazo fijo, no el radio sacro→trocánter. Se reporta también la variante con la línea pélvica.' },
  { id: 'rodilla', nombre: 'Femorotibial',     vertice: 'rodilla',   prox: 'trocanter',      dist: 'tarso',     tren: 'pelviano', lado: 'craneal',
    definicion: 'Ángulo entre el eje femoral (trocánter→cóndilo) y el eje tibial (cóndilo→maléolo).' },
  { id: 'tarso',   nombre: 'Tarso (corvejón)', vertice: 'tarso',     prox: 'rodilla',        dist: 'metatarso', tren: 'pelviano', lado: 'craneal',
    definicion: 'Ángulo entre el eje tibial y el eje de los metatarsianos, con vértice en el maléolo lateral.' }
];

/**
 * Plantilla canina normalizada, vista lateral, perro mesomorfo en estación
 * cuadrada. Sistema de coordenadas: origen en T1 (cruz), x positivo hacia
 * CAUDAL, y positivo hacia VENTRAL, unidad = longitud dorsal T1→sacro.
 * El suelo queda en y = 1,25.
 *
 * Es únicamente una posición de partida arrastrable: no impone ninguna
 * conformación al cálculo. Se ajusta por transformación de semejanza a los
 * puntos ancla que marque el usuario.
 */

const rad = (g) => g * Math.PI / 180;

/**
 * Parámetros de conformación. `alzada` es la altura a la cruz expresada en
 * longitudes dorsales T1→sacro: es el parámetro que más separa unas razas de
 * otras (un Teckel tiene 0,72; un Galgo, 1,45).
 *
 * Las longitudes de los segmentos de miembro se expresan como fracción de la
 * alzada, y los ángulos en grados respecto a la vertical. La altura del
 * trocánter y del hombro NO se fijan a mano: se deducen exigiendo que la cadena
 * llegue exactamente al suelo, de modo que cualquier combinación de parámetros
 * produce siempre un perro apoyado.
 *
 * Estos valores describen conformaciones típicas y sirven SOLO para el
 * prealineamiento. No entran en ningún cálculo: la app mide sobre los reparos
 * que el usuario coloca.
 */
export const CONFORMACIONES = {
  mesomorfo: {
    nombre: 'Mesomorfo (Labrador, Pastor Alemán, mestizo de talla media)',
    alzada: 1.25,
    cuello: 0.689, anguloCuello: 25.8, cabeza: 0.4205, anguloCabeza: 25.3,
    fem: 0.30, tib: 0.30, meta: 0.20, aFem: 30, aTib: 30, aMeta: 16,
    hum: 0.30, rad: 0.33, mc: 0.15, aHum: 20, aRad: 10, aMc: 5,
    dorso: { t13: [0.550, 0.030], l7: [0.880, 0.020], sacro: [1.000, 0.020], isquion: [1.240, 0.140] },
    cola: [1.600, 0.500]
  },
  condrodistrofico: {
    nombre: 'Condrodistrófico (Teckel, Basset, Corgi, Bulldog Francés)',
    alzada: 0.72,
    cuello: 0.500, anguloCuello: 30, cabeza: 0.360, anguloCabeza: 20,
    fem: 0.32, tib: 0.32, meta: 0.22, aFem: 35, aTib: 35, aMeta: 18,
    hum: 0.32, rad: 0.34, mc: 0.17, aHum: 25, aRad: 15, aMc: 8,
    dorso: { t13: [0.560, 0.030], l7: [0.880, 0.030], sacro: [1.000, 0.030], isquion: [1.230, 0.150] },
    cola: [1.520, 0.420]
  },
  lebrel: {
    nombre: 'Lebrel / tipo cursorial (Galgo, Whippet, Saluki, Borzoi)',
    alzada: 1.45,
    cuello: 0.800, anguloCuello: 32, cabeza: 0.520, anguloCabeza: 18,
    fem: 0.32, tib: 0.33, meta: 0.22, aFem: 40, aTib: 38, aMeta: 12,
    hum: 0.30, rad: 0.35, mc: 0.14, aHum: 22, aRad: 10, aMc: 4,
    // Lomo arqueado y grupa inclinada, típicos del lebrel.
    dorso: { t13: [0.520, 0.000], l7: [0.860, -0.060], sacro: [1.000, 0.000], isquion: [1.220, 0.180] },
    cola: [1.560, 0.620]
  },
  molosoide: {
    nombre: 'Molosoide / braquicéfalo (Bóxer, Bulldog, Mastín, Carlino)',
    alzada: 1.00,
    cuello: 0.420, anguloCuello: 22, cabeza: 0.240, anguloCabeza: 35,
    fem: 0.30, tib: 0.28, meta: 0.18, aFem: 25, aTib: 25, aMeta: 12,
    hum: 0.30, rad: 0.30, mc: 0.14, aHum: 28, aRad: 18, aMc: 8,
    dorso: { t13: [0.570, 0.020], l7: [0.890, 0.030], sacro: [1.000, 0.040], isquion: [1.230, 0.160] },
    cola: [1.380, 0.400]
  },
  gigante: {
    nombre: 'Gigante / longilíneo (Gran Danés, Mastín, Lobero irlandés)',
    alzada: 1.42,
    cuello: 0.720, anguloCuello: 28, cabeza: 0.500, anguloCabeza: 22,
    fem: 0.31, tib: 0.30, meta: 0.19, aFem: 26, aTib: 26, aMeta: 12,
    hum: 0.30, rad: 0.34, mc: 0.15, aHum: 18, aRad: 8, aMc: 4,
    dorso: { t13: [0.550, 0.020], l7: [0.880, 0.020], sacro: [1.000, 0.020], isquion: [1.250, 0.150] },
    cola: [1.620, 0.560]
  }
};

/**
 * Construye una plantilla completa a partir de los parámetros de conformación.
 * Origen en T1, x hacia caudal, y hacia ventral, unidad = longitud T1→sacro.
 */
export function generarPlantilla(conf) {
  const c = typeof conf === 'string' ? CONFORMACIONES[conf] : conf;
  if (!c) return null;
  const H = c.alzada;                 // altura a la cruz, en unidades de tronco
  const suelo = H;

  // --- miembro pelviano: la cadena debe llegar al suelo -------------------
  const Lf = c.fem * H, Lt = c.tib * H, Lm = c.meta * H;
  const caidaP = Lf * Math.cos(rad(c.aFem)) + Lt * Math.cos(rad(c.aTib)) + Lm * Math.cos(rad(c.aMeta));
  const trocanter = [1.020, suelo - caidaP];
  const rodilla = [trocanter[0] - Lf * Math.sin(rad(c.aFem)), trocanter[1] + Lf * Math.cos(rad(c.aFem))];
  const tarso = [rodilla[0] + Lt * Math.sin(rad(c.aTib)), rodilla[1] + Lt * Math.cos(rad(c.aTib))];
  const metatarso = [tarso[0] - Lm * Math.sin(rad(c.aMeta)), tarso[1] + Lm * Math.cos(rad(c.aMeta))];
  // Tuberosidad calcánea: caudo-dorsal al maléolo, a ~0,30 de la longitud del metatarso.
  const calcaneo = [tarso[0] + 0.30 * Lm * Math.sin(rad(65)), tarso[1] - 0.30 * Lm * Math.cos(rad(65))];

  // --- miembro torácico ---------------------------------------------------
  const Lh = c.hum * H, Lr = c.rad * H, Lc = c.mc * H;
  const caidaT = Lh * Math.cos(rad(c.aHum)) + Lr * Math.cos(rad(c.aRad)) + Lc * Math.cos(rad(c.aMc));
  const hombro = [-0.100, suelo - caidaT];
  const codo = [hombro[0] + Lh * Math.sin(rad(c.aHum)), hombro[1] + Lh * Math.cos(rad(c.aHum))];
  const carpo = [codo[0] - Lr * Math.sin(rad(c.aRad)), codo[1] + Lr * Math.cos(rad(c.aRad))];
  const metacarpo = [carpo[0] - Lc * Math.sin(rad(c.aMc)), carpo[1] + Lc * Math.cos(rad(c.aMc))];

  // --- axial ---------------------------------------------------------------
  const occipucio = [-c.cuello * Math.cos(rad(c.anguloCuello)), -c.cuello * Math.sin(rad(c.anguloCuello))];
  const hocico = [occipucio[0] - c.cabeza * Math.cos(rad(c.anguloCabeza)),
                  occipucio[1] + c.cabeza * Math.sin(rad(c.anguloCabeza))];

  return {
    conformacion: c.nombre,
    alzada: H,
    suelo,
    puntos: {
      hocico, occipucio,
      t1: [0, 0],
      escapulaDorsal: [0.060, 0.020],
      t13: c.dorso.t13, l7: c.dorso.l7, sacro: c.dorso.sacro, isquion: c.dorso.isquion,
      colaPunta: c.cola,
      hombro, codo, carpo, metacarpo,
      trocanter, rodilla, tarso, calcaneo, metatarso
    },
    anclas: ['t1', 'sacro']
  };
}

/** Plantilla por defecto: perro mesomorfo. Se conserva el nombre por compatibilidad. */
export const PLANTILLA = generarPlantilla('mesomorfo');

/**
 * Longitudes de segmento de la plantilla mesomorfa, en unidades de tronco.
 * Son las longitudes de REFERENCIA del modelo morfométrico: el perro de Jones
 * et al. 2018 expresado en proporciones. Se calculan aquí una sola vez para no
 * duplicar la geometría en dos sitios.
 */
export function longitudesPlantilla(plantilla = PLANTILLA) {
  const p = plantilla.puntos;
  const d = (a, b) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
  return {
    cabeza: d('occipucio', 'hocico'),
    cuello: d('occipucio', 't1'),
    torax: d('t1', 't13'),
    abdomen: d('t13', 'sacro'),
    cola: d('sacro', 'colaPunta'),
    brazo: d('hombro', 'codo'),
    antebrazo: d('codo', 'carpo'),
    mano: d('carpo', 'metacarpo'),
    muslo: d('trocanter', 'rodilla'),
    pierna: d('rodilla', 'tarso'),
    pie: d('calcaneo', 'metatarso'),
    /** Normalizador de tamaño: altura de la cruz sobre el suelo. */
    alzada: plantilla.alzada
  };
}

/** Orden sugerido de marcado manual: de proximal a distal, tren por tren. */
export const ORDEN_MARCADO = [
  't1', 'sacro', 'occipucio', 'hocico', 't13', 'l7', 'isquion', 'colaPunta',
  'escapulaDorsal', 'hombro', 'codo', 'carpo', 'metacarpo',
  'trocanter', 'rodilla', 'tarso', 'calcaneo', 'metatarso'
];
