/**
 * params.js — Parámetros biomecánicos caninos publicados.
 *
 * REGLA DEL PROYECTO: aquí NO entra ningún número inventado ni extrapolado del
 * humano. Cada valor lleva su fuente. Si no existe dato canino publicado, el
 * campo vale null y la app lo declara como "no disponible".
 *
 * Fuentes principales:
 *  [J18] Jones OY, Raschke SU, Riches PE. Inertial properties of the German
 *        Shepherd Dog. PLOS ONE 2018;13(10):e0206037. doi:10.1371/journal.pone.0206037
 *        n = 6 Pastor Alemán macho, 36,8 kg. Disección + péndulo. 17 segmentos.
 *  [R08] Ragetly CA et al. Noninvasive determination of body segment parameters
 *        of the hind limb in Labrador Retrievers... Am J Vet Res 2008;69(9):1188-96.
 *        doi:10.2460/ajvr.69.9.1188  n = 14 Labrador sanos. TC.
 *  [H20] Humphries A, Shaheen AF, Gómez Álvarez CB. PLOS ONE 2020;15(10):e0239832.
 *  [L21] Linder JE et al. BMC Vet Res 2021;17:88. doi:10.1186/s12917-021-02808-x
 *  [A24] Alves JC et al. Animals 2024;14(1):128. doi:10.3390/ani14010128
 *  [G22] Giansetto T et al. Vet Sci 2022;9(11):644. doi:10.3390/vetsci9110644
 *  [ML14] Millis D, Levine D. Canine Rehabilitation and Physical Therapy, 2ª ed. 2014.
 */

export const FUENTES = {
  J18: {
    cita: 'Jones OY, Raschke SU, Riches PE. Inertial properties of the German Shepherd Dog. PLOS ONE. 2018;13(10):e0206037.',
    doi: '10.1371/journal.pone.0206037',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0206037',
    muestra: 'n=6 Pastor Alemán macho, 36,8 kg (34,3–39,4). Disección cadavérica.'
  },
  R08: {
    cita: 'Ragetly CA, Griffon DJ, Thomas JE, et al. Noninvasive determination of body segment parameters of the hind limb in Labrador Retrievers with and without cranial cruciate ligament disease. Am J Vet Res. 2008;69(9):1188–1196.',
    doi: '10.2460/ajvr.69.9.1188',
    url: 'https://doi.org/10.2460/ajvr.69.9.1188',
    muestra: 'n=14 Labrador Retriever sanos + 10 con rotura de LCC. TC.'
  },
  H20: {
    cita: 'Humphries A, Shaheen AF, Gómez Álvarez CB. Biomechanical comparison of standing posture and during trot between German shepherd and Labrador retriever dogs. PLOS ONE. 2020;15(10):e0239832.',
    doi: '10.1371/journal.pone.0239832',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0239832',
    muestra: 'n=12 Pastor Alemán + 12 Labrador. Qualisys 8 cámaras + pasarela Tekscan.'
  },
  L21: {
    cita: 'Linder JE, Thomovsky S, Bowditch J, et al. Development of a simple method to measure static body weight distribution in neurologically and orthopedically normal mature small breed dogs. BMC Vet Res. 2021;17:88.',
    doi: '10.1186/s12917-021-02808-x',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7937222/',
    muestra: 'n=25 perros de raza pequeña sanos, 11,5 ± 3,6 kg.'
  },
  A24: {
    cita: 'Alves JC, Santos A, Lavrador C, Carreira LM. Minimal clinically important differences for a weight distribution platform in dogs with osteoarthritis. Animals. 2024;14(1):128.',
    doi: '10.3390/ani14010128',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10778445/',
    muestra: 'n=80 perros con artrosis. Companion Stance Analyser.'
  },
  G22: {
    cita: 'Giansetto T, Picavet PP, Lefebvre M, Balligand M. Determination of the Stifle Angle at Standing Position in Dogs. Vet Sci. 2022;9(11):644.',
    doi: '10.3390/vetsci9110644',
    url: 'https://www.mdpi.com/2306-7381/9/11/644',
    muestra: 'n=21 perros en estación. Radiografía mediolateral. EJES MECÁNICOS, no marcadores cutáneos.'
  },
  J22: {
    cita: 'Johnson TA, Gordon-Evans WJ, Lascelles BDX, Conzemius MG. Determination of the center of mass in a heterogeneous population of dogs. PLOS ONE. 2022;17(4):e0267361.',
    doi: '10.1371/journal.pone.0267361',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0267361',
    muestra: 'n=31 perros sanos, 25,6 ± 13,2 kg (6,5–60 kg). Tabla de reacción. MEDIDO EN DECÚBITO, no en estación.'
  },
  P22: {
    cita: 'Pálya Z, Rácz K, Nagymáté G, Kiss RM. Development of a detailed canine gait analysis method for evaluating harnesses: A pilot study. PLOS ONE. 2022;17(3):e0264299.',
    doi: '10.1371/journal.pone.0264299',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0264299',
    muestra: 'Set de 25 marcadores cutáneos — base de los reparos usados por esta app.'
  },
  ML14: {
    cita: 'Millis D, Levine D. Canine Rehabilitation and Physical Therapy, 2ª ed. Saunders Elsevier; 2014.',
    doi: null,
    url: null,
    muestra: 'Texto de referencia. Valor clásico de reparto 60:40 (30/30/20/20).'
  },
  F19: {
    cita: 'Formenton MR, de Lima LG, Vassalo FG, et al. Goniometric Assessment in French Bulldogs. Front Vet Sci. 2019;6:424.',
    doi: '10.3389/fvets.2019.00424',
    url: 'https://www.frontiersin.org/articles/10.3389/fvets.2019.00424/full',
    muestra: 'n=20 Bulldog Francés. Goniometría PASIVA en decúbito.'
  },
  RE20: {
    cita: 'Reusing M, Brocardo M, Weber S, Villanova Jr J. Goniometric Evaluation and Passive Range of Joint Motion in Chondrodystrophic and Non-Chondrodystrophic Dogs of Different Sizes. VCOT Open. 2020;3:e66–e71.',
    doi: '10.1055/s-0040-1713825',
    url: 'https://www.thieme-connect.com/products/ejournals/pdf/10.1055/s-0040-1713825.pdf',
    muestra: 'Goniometría PASIVA por tamaño corporal y condrodistrofia.'
  },
  S08: {
    cita: 'Sterin GM. Diagnóstico zookinésico en pequeños animales. Información Veterinaria. Septiembre 2008:13–16.',
    doi: null,
    url: null,
    muestra: 'Artículo de revisión clínica. NO aporta ningún dato numérico: define la ESTRUCTURA del examen zooquinético y del diagrama de Dempster aplicado al perro (5 cadenas cinéticas, UBM, SFC) y la definición operativa de equilibrio. De aquí no sale ninguna constante de esta app.'
  }
};

/**
 * TABLA 1 — Fracciones de masa segmentaria y coeficiente de centro de masa.
 *
 * masa      : fracción de la masa corporal total. En los segmentos de miembro
 *             el valor es POR MIEMBRO (unilateral); la app lo cuenta x2.
 * com       : posición del CdM como fracción de la longitud del segmento,
 *             medida DESDE EL EXTREMO PROXIMAL.
 * densidad  : kg/m3 (informativo).
 * prox/dist : claves de los reparos que definen el eje del segmento en la app.
 *
 * Verificación de cierre: 0,7732 (axial) + 2·0,0450 + 2·0,0683 = 0,9998.
 */
export const SEGMENTOS = [
  { id: 'cabeza',    nombre: 'Cabeza',            masa: 0.0770, sd: 0.0039, com: 0.3165, comSd: 0.0081, densidad: 1004.18, par: false, prox: 'occipucio',  dist: 'hocico',     fuente: 'J18',
    nota: 'Extremos originales: inion → prostion. Parámetro RAZA-DEPENDIENTE: Amit 2009 halló 9,2 % en mestizos frente a 7,70 % en Pastor Alemán, y el CdM 10 % más rostral.' },
  { id: 'cuello',    nombre: 'Cuello',            masa: 0.0661, sd: 0.0068, com: 0.5627, comSd: 0.0122, densidad: 970.01,  par: false, prox: 'occipucio',  dist: 't1',         fuente: 'J18',
    nota: 'Extremos originales: atlas/axis → C7/T1. La app usa el occipucio como sustituto del atlas.' },
  { id: 'torax',     nombre: 'Tórax',             masa: 0.3806, sd: 0.0101, com: 0.5368, comSd: 0.0110, densidad: 1083.39, par: false, prox: 't1',         dist: 't13',        fuente: 'J18',
    nota: 'INCLUYE AMBAS ESCÁPULAS: Jones et al. no lograron separarlas limpiamente. No existe masa escapular canina publicada de forma aislada.' },
  { id: 'abdomen',   nombre: 'Abdomen',           masa: 0.2415, sd: 0.0153, com: 0.4677, comSd: 0.0047, densidad: 963.89,  par: false, prox: 't13',        dist: 'sacro',      fuente: 'J18',
    nota: 'Extremos originales: T13/L1 → base de la cola.' },
  { id: 'cola',      nombre: 'Cola',              masa: 0.0080, sd: 0.0005, com: 0.3128, comSd: 0.0158, densidad: 900.63,  par: false, prox: 'sacro',      dist: 'colaPunta',  fuente: 'J18', opcional: true,
    nota: 'Si no se marca la punta de la cola el segmento se omite y el resto se renormaliza.' },

  { id: 'brazo',     nombre: 'Brazo (húmero)',    masa: 0.0240, sd: 0.0013, com: 0.4183, comSd: 0.0183, densidad: 974.37,  par: true,  prox: 'hombro',     dist: 'codo',       fuente: 'J18' },
  { id: 'antebrazo', nombre: 'Antebrazo',         masa: 0.0138, sd: 0.0005, com: 0.3941, comSd: 0.0055, densidad: 977.54,  par: true,  prox: 'codo',       dist: 'carpo',      fuente: 'J18' },
  { id: 'mano',      nombre: 'Mano (metacarpo)',  masa: 0.0072, sd: 0.0002, com: 0.4848, comSd: 0.0089, densidad: 934.02,  par: true,  prox: 'carpo',      dist: 'metacarpo',  fuente: 'J18',
    nota: 'Extremos originales: mitad del carpo → 3ª falange distal. La app usa estiloides ulnar → apoyo del metacarpo.' },
  { id: 'muslo',     nombre: 'Muslo (fémur)',     masa: 0.0451, sd: 0.0028, com: 0.4463, comSd: 0.0115, densidad: 939.78,  par: true,  prox: 'trocanter',  dist: 'rodilla',    fuente: 'J18',
    nota: 'Ragetly 2008 halló 6,05 ± 0,50 % en Labrador (frente a 4,51 % en Pastor Alemán) y CdM a 42 ± 5 %. La atrofia por rotura de LCC baja la masa a 5,48 %.' },
  { id: 'pierna',    nombre: 'Pierna (tibia)',    masa: 0.0150, sd: 0.0006, com: 0.3659, comSd: 0.0113, densidad: 1010.60, par: true,  prox: 'rodilla',    dist: 'tarso',      fuente: 'J18',
    nota: 'Ragetly 2008 en Labrador: 1,41 ± 0,16 %, CdM 31 ± 2 %.' },
  { id: 'pie',       nombre: 'Pie (metatarso)',   masa: 0.0082, sd: 0.0002, com: 0.5140, comSd: 0.0044, densidad: 1013.58, par: true,  prox: 'calcaneo',   dist: 'metatarso',  fuente: 'J18',
    nota: 'Extremo proximal original: tuberosidad calcánea. Ragetly 2008 en Labrador: 0,70 ± 0,09 %.' }
];

/**
 * REFERENCIA DEL MODELO MORFOMÉTRICO
 * ---------------------------------------------------------------------------
 * El problema de aplicar la tabla de Jones tal cual: sus 6 perros eran Pastores
 * Alemanes de 36,8 kg. Un Teckel tiene el tronco un 90 % más largo respecto a
 * su alzada, y las extremidades mucho más cortas. Darle el 38,06 % de masa al
 * tórax y el 4,51 % a cada muslo es un error de conformación, no de medida.
 *
 * La solución que aplica esta app: como la foto YA da la longitud real de cada
 * segmento del paciente, la masa se redistribuye en proporción al volumen
 * medido, usando las densidades segmentarias publicadas:
 *
 *     m_i  ∝  ρ_i · A_i · L_i(medida)
 *
 * donde A_i es la sección transversal equivalente. Si no se miden perímetros,
 * A_i se toma de la referencia escalada al tamaño del paciente, con lo que
 *
 *     m_i  ∝  m_i(Jones) · [ L_i(paciente) / L_i(referencia a igual alzada) ]
 *
 * y todo se normaliza a la masa corporal REAL del paciente, que es un dato
 * medido, no estimado. Cuando las proporciones del paciente coinciden con las
 * de la referencia, el modelo devuelve exactamente la tabla de Jones.
 *
 * NOTA SOBRE LOS VOLÚMENES PUBLICADOS: la tabla de Jones et al. incluye
 * volúmenes por segmento, pero el de la cabeza (1000 cm³) es incompatible con
 * su propia fracción de masa y su densidad (0,0770 × 36,8 kg ÷ 1,00418 g/cm³ =
 * 2822 cm³); los otros diez segmentos sí cuadran con un error inferior al 3 %.
 * Para no arrastrar esa incoherencia, la app NO usa los volúmenes tabulados:
 * los deriva de V = m/ρ, que es exacto por definición.
 */
export const REFERENCIA_MORFOMETRICA = {
  fuente: 'J18',
  masaKg: 36.8,
  alturaCruzCm: 62,
  notaAltura: 'La altura a la cruz de los perros de Jones et al. no está publicada. Se asume 62 cm, propia de un Pastor Alemán macho de 36,8 kg (estándar racial 60–65 cm). Este valor SOLO interviene en la corrección opcional por perímetros medidos; el modelo base no depende de él.',
  volumenSegmento(seg) { return (seg.masa * 36.8 * 1000) / (seg.densidad / 1000); } // cm³
};

/**
 * Perímetros medibles con cinta métrica en la clínica. Son opcionales: si se
 * introducen, sustituyen a la sección transversal estimada y el modelo pasa de
 * ser proporcional a longitud a serlo a volumen real. Es la corrección que más
 * importa en perros obesos, braquicéfalos, muy musculados o con atrofia.
 */
export const PERIMETROS = [
  { id: 'torax',     nombre: 'Perímetro torácico',  guia: 'Justo detrás del codo, con el perro de pie y al final de una espiración normal.' },
  // NO se ofrece perímetro craneal. Se probó y hay que descartarlo: el modelo
  // trata cada segmento como un sólido de sección uniforme, y la cabeza es el
  // que más se estrecha hacia el hocico. Medir el cráneo por su parte más
  // ancha y aplicar esa sección a toda la longitud del segmento daba un 18 %
  // de masa craneal en un Chihuahua, cuando Amit et al. (2009) midieron 9,2 %
  // en mestizos. El sesgo no es del dato del usuario sino de la hipótesis
  // geométrica, así que la app avisa del asunto en vez de fingir que lo corrige.
  { id: 'abdomen',   nombre: 'Perímetro abdominal', guia: 'En el punto más estrecho, delante de las alas del ilion.' },
  { id: 'cuello',    nombre: 'Perímetro del cuello',guia: 'En el tercio medio del cuello, sin comprimir.' },
  { id: 'muslo',     nombre: 'Perímetro del muslo', contralateral: true,
    guia: 'En el punto de mayor masa muscular, con el miembro en apoyo. Mídalo en los DOS lados a la misma altura: la diferencia entre ellos es la medida de atrofia que recomienda Sterin (2008) para seguir la evolución.' },
  { id: 'antebrazo', nombre: 'Perímetro del antebrazo', contralateral: true,
    guia: 'En el tercio proximal, en el vientre de los flexores del carpo. También bilateral.' }
];

/**
 * ESTRUCTURA DEL DIAGRAMA DE DEMPSTER APLICADO AL PERRO — Sterin 2008.
 *
 * Este bloque no contiene ni una sola cifra: es vocabulario y estructura. Se
 * incorpora porque es la descripción del diagrama que se usa en la clínica de
 * rehabilitación veterinaria en español, y conviene que lo que la app dibuja y
 * lo que el informe nombra coincidan con lo que el clínico espera leer.
 */
export const CADENAS_CINETICAS = {
  n: 5,
  descripcion: 'El diagrama de Dempster canino se compone de 5 cadenas cinéticas: los dos miembros torácicos, los dos miembros pelvianos y el raquis. La intersección de las líneas de puntos vertical y horizontal marca el centro de gravedad.',
  lista: [
    { id: 'toracicaIzq', nombre: 'Miembro torácico izquierdo', tipo: 'ejecución' },
    { id: 'toracicaDer', nombre: 'Miembro torácico derecho',   tipo: 'ejecución' },
    { id: 'pelvianaIzq', nombre: 'Miembro pelviano izquierdo', tipo: 'ejecución' },
    { id: 'pelvianaDer', nombre: 'Miembro pelviano derecho',   tipo: 'ejecución' },
    { id: 'raquis',      nombre: 'Raquis',                     tipo: 'asociación' }
  ],
  ubm: 'Unidad biomecánica (UBM): cada articulación de los miembros, entendida como la suma de sus componentes osteoarticular, neuromuscular y angiovegetativo. Las cadenas de los miembros son cadenas de EJECUCIÓN formadas por UBM sucesivas.',
  sfc: 'Segmento cinético funcional (SFC): dos vértebras contiguas y su articulación intervertebral. El raquis es una cadena de ASOCIACIÓN formada por SFC sucesivos.',
  equilibrio: 'Equilibrio: capacidad de mantener el centro de gravedad del cuerpo por encima de la superficie de apoyo; en estación, dentro de la base de sustentación.',
  fuente: 'S08'
};

/**
 * EXAMEN ZOOQUINÉTICO EN ESTÁTICA — ítems de inspección (Sterin 2008).
 *
 * ATENCIÓN a lo que SÍ y lo que NO viene del artículo. El artículo enumera los
 * ítems que hay que observar en estática; NO publica una escala de graduación
 * para ninguno de ellos. Por eso cada ítem se ofrece con una valoración
 * mínima (normal / alterado / no valorado) más una nota libre, en vez de
 * inventar grados que nadie ha validado. Lo que el explorador escriba en la
 * nota es lo que acaba en el informe.
 */
export const EXAMEN_ESTATICO = [
  { id: 'postura',      nombre: 'Postura' },
  { id: 'actitud',      nombre: 'Actitud' },
  { id: 'aplomos',      nombre: 'Aplomos' },
  { id: 'desarrollo',   nombre: 'Desarrollo muscular' },
  { id: 'tono',         nombre: 'Tono y trofismo muscular' },
  { id: 'estabilidad',  nombre: 'Estabilidad' }
];

export const VALORACION_ITEM = ['', 'Normal', 'Alterado', 'No valorado'];

/**
 * Grado de claudicación.
 *
 * Sterin (2008) cita claudicaciones «de 1º a 4º grado» pero NO publica los
 * descriptores de cada grado, y estos varían entre autores y entre escalas.
 * La app registra el grado y deja que el explorador anote el criterio usado;
 * no impone descriptores que el artículo no da.
 */
export const CLAUDICACION = {
  grados: ['', '0 — ausente', '1', '2', '3', '4'],
  fuente: 'S08',
  nota: 'La escala de 1 a 4 grados se cita en Sterin (2008), que no publica los descriptores de cada grado. Anote junto al grado la escala que utiliza, para que la comparación con revisiones posteriores sea válida.'
};

/**
 * Clasificación de la disfunción (Sterin 2008). Definiciones del propio artículo.
 */
export const DISFUNCION = {
  fuente: 'S08',
  campos: [
    { id: 'locus', nombre: 'Localización del locus dolenti',
      ayuda: 'Punto de dolor. La limitación de actividades suele asociarse al dolor, que muchas veces no se manifiesta de forma audible; localizarlo permite explicar la disfunción locomotora y sus consecuencias biomecánicas.' },
    { id: 'capacidad', nombre: 'Incapacidad / discapacidad', opciones: ['', 'Ninguna', 'Discapacidad', 'Incapacidad'],
      ayuda: 'Incapacidad: falta absoluta o total de potencia para la actividad cotidiana, con pérdida completa de la función. Discapacidad: dificultad, imperfección o desorden parcial para mantener la potencia necesaria.' },
    { id: 'estructural', nombre: 'Deficiencia estructural',
      ayuda: 'Qué estructura concreta (músculo, hueso, articulación, nervio) muestra la deficiencia que da resultado a la disfunción del conjunto.' }
  ]
};

/** Perfiles alternativos de masa segmentaria por raza, donde existe dato publicado. */
export const PERFILES = {
  morfometrico: {
    nombre: 'Morfométrico adaptado al paciente (recomendado)',
    descripcion: 'Redistribuye las masas de Jones 2018 según las longitudes de segmento medidas en la foto y, si se introducen, los perímetros medidos con cinta. Es el único perfil apto para conformaciones distintas del mesomorfo grande. Reproduce exactamente a Jones cuando las proporciones coinciden con la referencia.',
    fuente: 'J18',
    modo: 'morfometrico',
    ajustes: {}
  },
  jones_gsd: {
    nombre: 'Tabla fija — Pastor Alemán (Jones 2018)',
    descripcion: 'Fracciones de masa tal cual se publicaron, sin adaptar a la conformación del paciente. Válido solo para perros mesomorfos de talla grande. Suma 1,000.',
    fuente: 'J18',
    ajustes: {}
  },
  ragetly_lab: {
    nombre: 'Tabla fija — Labrador (Jones 2018 + Ragetly 2008 en miembro pelviano)',
    descripcion: 'Sustituye muslo, pierna y pie por los valores medidos por TC en Labrador. El resto se renormaliza.',
    fuente: 'R08',
    ajustes: {
      muslo:  { masa: 0.0605, sd: 0.0050, com: 0.42, comSd: 0.05 },
      pierna: { masa: 0.0141, sd: 0.0016, com: 0.31, comSd: 0.02 },
      pie:    { masa: 0.0070, sd: 0.0009, com: null, comSd: null }
    }
  },
  ragetly_lab_lcc: {
    nombre: 'Tabla fija — Labrador con rotura de LCC (Ragetly 2008)',
    descripcion: 'Muslo del miembro afectado con atrofia documentada (5,48 % frente a 6,05 %). Úselo solo para el lado afectado.',
    fuente: 'R08',
    ajustes: {
      muslo:  { masa: 0.0548, sd: 0.0034, com: 0.42, comSd: 0.05 },
      pierna: { masa: 0.0136, sd: 0.0009, com: 0.28, comSd: 0.01 },
      pie:    { masa: 0.0070, sd: 0.0009, com: null, comSd: null }
    }
  }
};

/**
 * TABLA 2 — Reparto de carga estático torácico:pelviano en perros sanos.
 * Advertencia clave: el valor depende de la raza (p<0,001) y del dispositivo
 * de medida (básculas 63 % vs pasarela 68 % en los mismos perros).
 */
export const REPARTO_REFERENCIA = [
  { id: 'clasico',  etiqueta: 'Valor clásico de texto (60:40)',        toracico: 60.0, sd: null, fuente: 'ML14', metodo: '—' },
  { id: 'linder_b2',etiqueta: 'Razas pequeñas, 2 básculas',            toracico: 63.0, sd: 3.0,  fuente: 'L21',  metodo: '2 básculas de baño (B2)' },
  { id: 'linder_psw',etiqueta:'Razas pequeñas, pasarela de presión',   toracico: 68.0, sd: 4.0,  fuente: 'L21',  metodo: 'Pasarela de presión (PSW)' },
  { id: 'h20_gsd',  etiqueta: 'Pastor Alemán',                          toracico: 62.4, sd: 2.4,  fuente: 'H20',  metodo: 'Tekscan + Qualisys' },
  { id: 'h20_lab',  etiqueta: 'Labrador Retriever',                     toracico: 69.4, sd: 5.0,  fuente: 'H20',  metodo: 'Tekscan + Qualisys' }
];

/**
 * Posición del centro de masa global. Johnson et al. (2022) midieron el CdM
 * situado 9,48 ± 4,44 cm por debajo de la cruz, es decir al 41 % de la
 * distancia dorso-ventral, y al 48 % de la longitud cuello ventral–isquion
 * (aproximadamente la apófisis xifoides).
 *
 * AVISO: esas medidas se tomaron en DECÚBITO (esternal y lateral derecho) sobre
 * una tabla de reacción, no en estación. Sirven como comprobación de orden de
 * magnitud del modelo segmentario, no como criterio de normalidad postural.
 */
export const CDM_REFERENCIA = {
  descensoBajoCruz: { media: 9.48, sd: 4.44, unidad: 'cm', fuente: 'J22' },
  fraccionDorsoVentral: { media: 0.41, fuente: 'J22' },
  fraccionLongitudinal: { media: 0.48, fuente: 'J22', nota: 'desde el cuello ventral hacia el isquion; corresponde aproximadamente a la apófisis xifoides.' },
  aviso: 'Medido en decúbito, no en estación. Úselo como comprobación de coherencia del modelo, no como umbral clínico.'
};

/** Rango global publicado, para el aviso de la app. */
export const REPARTO_RANGO = { min: 59.0, max: 69.4, nota: 'Rango de las medias publicadas en perros sanos. No use 60 % como umbral único de normalidad.' };

/**
 * TABLA 3 — Asimetría izquierda-derecha en perros SANOS (Linder 2021).
 * Es 2-3 veces mayor en el tren anterior. Umbrales distintos por tren.
 */
export const ASIMETRIA_NORMAL = {
  B4:  { etiqueta: '4 básculas de baño',      toracico: { media: 8.7,  sd: 7.5 }, pelviano: { media: 3.7, sd: 2.9 }, fuente: 'L21' },
  K4:  { etiqueta: '4 básculas de cocina',    toracico: { media: 8.6,  sd: 6.3 }, pelviano: { media: 4.3, sd: 3.6 }, fuente: 'L21' },
  PSW: { etiqueta: 'Pasarela de presión',     toracico: { media: 12.8, sd: 9.1 }, pelviano: { media: 6.0, sd: 5.2 }, fuente: 'L21' }
};

/** Diferencias mínimas clínicamente importantes (Alves 2024). */
export const DMCI = {
  indiceSimetria: -10,
  desviacion: -1,
  fuente: 'A24',
  nota: 'Una mejora menor de 10 puntos en el índice de simetría está dentro del ruido de medida.'
};

/**
 * TABLA 4 — Ángulos articulares EN ESTACIÓN con referencia publicada.
 *
 * ¡LEA ESTO! Giansetto 2022 midió por RADIOGRAFÍA usando EJES MECÁNICOS
 * (centro de la cabeza femoral → centro femorotibial; eminencias intercondíleas
 * → centro del astrágalo). Esta app mide sobre MARCADORES CUTÁNEOS
 * (trocánter mayor → cóndilo femoral lateral → maléolo lateral). Los dos
 * valores NO son intercambiables: el marcador del trocánter está caudal a la
 * cabeza femoral, lo que sesga sistemáticamente el ángulo.
 *
 * Por eso `comparable: false` en todas las articulaciones: la app MUESTRA la
 * referencia pero NO marca automáticamente como patológico. El criterio
 * primario recomendado por la propia literatura es la comparación con el
 * miembro contralateral del mismo perro y con la medición previa.
 */
export const ANGULOS_ESTACION = {
  rodilla: { media: 145.3, sd: 7.9, min: 129.5, max: 156.6, fuente: 'G22', comparable: false,
             nota: 'Radiografía, ejes mecánicos, n=21. El valor clásico de 135° usado en planificación de TTA es demasiado bajo.' },
  tarso:   { media: 134.0, sd: 9.1, min: 122.5, max: 147.7, fuente: 'G22', comparable: false,
             nota: 'Radiografía, eje tibial mecánico y eje tarsiano paralelo a metatarsianos, n=21.' },
  hombro:  null,
  codo:    null,
  carpo:   null,
  cadera:  null
};

/**
 * TABLA 5 — Goniometría PASIVA de referencia (decúbito lateral, manipulación).
 * NO es medible desde una foto de un perro de pie. Se incluye solo como
 * contexto documental para el informe, nunca como criterio de la imagen.
 */
export const GONIOMETRIA_PASIVA = {
  aviso: 'Valores de rango pasivo (PROM) medidos en decúbito lateral con manipulación del operador. NO son comparables con los ángulos medidos por esta app sobre una foto en estación.',
  tablas: [
    { poblacion: 'Bulldog Francés (n=20)', fuente: 'F19', datos: {
        hombro: { flex: [51, 8],  ext: [160, 19] }, codo:   { flex: [51, 13], ext: [174, 11] },
        carpo:  { flex: [32, 7],  ext: [204, 8]  }, cadera: { flex: [58, 10], ext: [181, 7]  },
        rodilla:{ flex: [58, 8],  ext: [172, 8]  }, tarso:  { flex: [40, 6],  ext: [188, 7]  } } },
    { poblacion: 'No condrodistrófico, tamaño mediano', fuente: 'RE20', datos: {
        hombro: { flex: [62, 10], ext: [137, 8]  }, codo:   { flex: [28, 3],  ext: [140, 8]  },
        carpo:  { flex: [33, 6],  ext: [185, 5]  }, cadera: { flex: [56, 11], ext: [135, 9]  },
        rodilla:{ flex: [30, 7],  ext: [142, 8]  }, tarso:  { flex: [33, 6],  ext: [162, 9]  } } },
    { poblacion: 'No condrodistrófico, tamaño grande', fuente: 'RE20', datos: {
        hombro: { flex: [70, 10], ext: [126, 12] }, codo:   { flex: [36, 8],  ext: [146, 22] },
        carpo:  { flex: [47, 13], ext: [184, 4]  }, cadera: { flex: [57, 11], ext: [120, 15] },
        rodilla:{ flex: [42, 14], ext: [146, 14] }, tarso:  { flex: [48, 12], ext: [175, 17] } } },
    { poblacion: 'Condrodistrófico, tamaño pequeño', fuente: 'RE20', datos: {
        hombro: { flex: [59, 13], ext: [139, 13] }, codo:   { flex: [31, 8],  ext: [153, 30] },
        carpo:  { flex: [44, 5],  ext: [193, 7]  }, cadera: { flex: [52, 19], ext: [156, 25] },
        rodilla:{ flex: [41, 9],  ext: [135, 15] }, tarso:  { flex: [49, 11], ext: [178, 18] } } }
  ]
};

/** Huecos declarados de la literatura — la app los muestra en el informe. */
export const LIMITACIONES = [
  'No existe masa ni centro de masa de la ESCÁPULA como segmento aislado en la literatura canina. Jones et al. (2018) la incluyeron dentro del tórax. Esta app NO sustituye ese hueco con el valor humano de Dempster, porque el perro carece de clavícula funcional y la biomecánica no es homóloga.',
  'Los parámetros inerciales proceden de 6 Pastores Alemanes macho de 36,8 kg y 14 Labradores. El perfil morfométrico adapta el REPARTO de masa a las longitudes de segmento medidas en el paciente y, si se introducen, a los perímetros; lo que no puede adaptar es la DENSIDAD de cada segmento ni el coeficiente de centro de masa, que se siguen tomando de esas poblaciones. Ambos son propiedades del tejido y de la forma del segmento, mucho menos dependientes de la raza que las fracciones de masa, pero no están validados fuera de ellas.',
  'No hay datos inerciales publicados de razas condrodistróficas ni de perros de menos de 10 kg. En esas conformaciones el modelo morfométrico es una interpolación geométrica razonada, no una medición: cuanto mayor sea la desviación de conformación que informa la app, mayor es la extrapolación.',
  'El modelo asume que cada segmento es un sólido de sección uniforme a lo largo de su eje. Es una simplificación: un tórax real es más profundo en su parte caudal, y un muslo no es un cilindro. Introducir perímetros medidos con cinta reduce ese error donde más pesa.',
  'El centro de masa global de Johnson et al. (2022) se midió en DECÚBITO, no en estación. Esta app calcula el CdM en estación por suma de segmentos, no a partir de esa ecuación.',
  'No existe ecuación publicada que prediga el reparto torácico:pelviano a partir de la longitud del tronco o de un índice de conformación. El efecto raza está demostrado; la función que lo describe, no.',
  'La goniometría de referencia (Jaegger 2002, Formenton 2019, Reusing 2020) es rango PASIVO en decúbito. Una foto en estación no puede medir eso. Sterin (2008) añade que esa goniometría clínica debe ser además BILATERAL y realizada entre dos personas: la app no la sustituye, la complementa con la postura real en carga.',
  'El diagrama de Dempster canino se compone de CINCO cadenas cinéticas (dos torácicas, dos pelvianas y el raquis, Sterin 2008). Una fotografía sagital solo muestra una de cada par, así que la app mide un hemicuerpo y asume simetría izquierda-derecha para los segmentos pares. Todo lo que sea comparación entre lados tiene que entrar por otra vía: el reparto de carga medido con básculas, los perímetros musculares de los dos lados, o una segunda fotografía del lado contrario.',
  'Los ángulos en estación de Giansetto (2022) se midieron por radiografía con ejes mecánicos. Los ángulos de esta app usan marcadores cutáneos y no son numéricamente intercambiables con ellos.',
  'El desplazamiento piel-hueso (artefacto de tejido blando) es máximo en escápula, cadera y muslo. Los reparos proximales son los menos fiables.',
  'La atrofia muscular altera los parámetros inerciales: el muslo con rotura de LCC pesa ~9 % menos (Ragetly 2008). En un paciente con atrofia crónica, el modelo del perro sano introduce error sistemático.'
];

export function fuenteTexto(clave) {
  const f = FUENTES[clave];
  if (!f) return clave;
  return f.cita + (f.doi ? ` doi:${f.doi}` : '');
}
