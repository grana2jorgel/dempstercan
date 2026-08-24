# Tablas de referencia

Todos los valores que usa DempsterCan, con su fuente. Es el mismo contenido que
`js/params.js`, en formato legible. **Ningún número de este documento es una
extrapolación del humano**; donde no hay dato canino publicado, se dice.

---

## 1. Parámetros segmentarios caninos

**Fuente:** Jones OY, Raschke SU, Riches PE. *Inertial properties of the German
Shepherd Dog*. PLOS ONE 2018;13(10):e0206037.
**Muestra:** n = 6 Pastor Alemán macho, 36,8 kg (34,3–39,4). Disección
cadavérica, 17 segmentos, medición directa de masa y volumen + péndulo simple.

| Segmento | Fracción de masa | DE | CdM desde proximal | DE | Densidad (kg/m³) |
|---|---|---|---|---|---|
| Cabeza | 0,0770 | 0,0039 | 0,3165 | 0,0081 | 1004,18 |
| Cuello | 0,0661 | 0,0068 | 0,5627 | 0,0122 | 970,01 |
| Tórax | 0,3806 | 0,0101 | 0,5368 | 0,0110 | 1083,39 |
| Abdomen | 0,2415 | 0,0153 | 0,4677 | 0,0047 | 963,89 |
| Cola | 0,0080 | 0,0005 | 0,3128 | 0,0158 | 900,63 |
| Brazo (húmero) † | 0,0240 | 0,0013 | 0,4183 | 0,0183 | 974,37 |
| Antebrazo † | 0,0138 | 0,0005 | 0,3941 | 0,0055 | 977,54 |
| Mano † | 0,0072 | 0,0002 | 0,4848 | 0,0089 | 934,02 |
| Muslo (fémur) † | 0,0451 | 0,0028 | 0,4463 | 0,0115 | 939,78 |
| Pierna (tibia) † | 0,0150 | 0,0006 | 0,3659 | 0,0113 | 1010,60 |
| Pie (metatarso) † | 0,0082 | 0,0002 | 0,5140 | 0,0044 | 1013,58 |

† valor **por miembro**. Verificación de cierre: 0,7732 + 2·0,0450 + 2·0,0683 =
**0,9998** ≈ 1.

### Extremos de segmento (sin esto el coeficiente no significa nada)

| Segmento | Proximal (0,0) | Distal (1,0) |
|---|---|---|
| Cabeza | inion (protuberancia occipital) | prostion (borde alveolar incisivo) |
| Cuello | atlas/axis | C7/T1 |
| Tórax | C7/T1 | T13/L1 |
| Abdomen | T13/L1 | base de la cola |
| Brazo | articulación glenohumeral | epicóndilo lateral del húmero |
| Antebrazo | epicóndilo lateral del húmero | articulación carpiana |
| Mano | mitad del carpo | 3.ª falange distal |
| Muslo | trocánter mayor | cóndilo femoral |
| Pierna | cóndilo femoral | maléolo lateral |
| Pie | **tuberosidad calcánea** | 3.ª falange distal |

> El CdM del pie está referido al **calcáneo**, no al tarso proximal. Por eso
> DempsterCan pide marcar el calcáneo como reparo propio.

### Perfil alternativo: miembro pelviano de Labrador

**Fuente:** Ragetly CA et al. *Am J Vet Res* 2008;69(9):1188–1196. n = 14
Labrador sanos + 10 con rotura de ligamento cruzado craneal. TC.

| Segmento | Sano | Con rotura de LCC | CdM desde proximal (sano) |
|---|---|---|---|
| Muslo | 6,05 ± 0,50 % | **5,48 ± 0,34 %** | 42 ± 5 % |
| Pierna | 1,41 ± 0,16 % | 1,36 ± 0,09 % | 31 ± 2 % |
| Pie | 0,70 ± 0,09 % | 0,70 ± 0,09 % | no publicado |

El muslo del miembro con rotura pesa **~9 % menos**: la atrofia altera los
parámetros inerciales. Hay un perfil específico en la app para ese caso.

### Uso de estos valores en la app

El perfil **morfométrico** (por defecto) no aplica estas fracciones tal cual:
las redistribuye según las longitudes de segmento medidas en la fotografía del
paciente, usando las densidades de la tabla, y normaliza el total a la masa
corporal real. Cuando las proporciones del paciente coinciden con las de la
referencia devuelve exactamente esta tabla. El perfil de **tabla fija** aplica
los valores sin adaptar y solo es válido en mesomorfos de talla grande.

Los volúmenes se derivan de V = m/ρ. El volumen tabulado de la cabeza
(1000 cm³) es incompatible con su propia fracción de masa y densidad, que dan
2822 cm³; los otros diez segmentos cuadran con menos del 3 % de error.

### Huecos declarados

- **Escápula:** no existe masa ni CdM escapular canino aislado. Jones et al. la
  incluyeron en el tórax por imposibilidad de separación limpia. **No se
  sustituye por el valor humano**: el perro carece de clavícula funcional.
  Nielsen et al. (Am J Vet Res 2003;64(5):609–617) sí la modelaron; conseguir
  ese artículo es la principal vía de mejora del modelo.
- **Cabeza:** parámetro raza-dependiente. Amit et al. (2009) hallaron 9,2 % en
  mestizos frente a 7,70 % en Pastor Alemán, con el CdM 10 % más rostral.
- No hay datos inerciales de razas condrodistróficas ni de perros < 10 kg.

---

## 2. Centro de masa global

**Fuente:** Johnson TA et al. *PLOS ONE* 2022;17(4):e0267361. n = 31,
25,6 ± 13,2 kg (6,5–60 kg). Tabla de reacción + plataforma de fuerza.

| Plano | Resultado |
|---|---|
| Dorso-ventral | CdM a **9,48 ± 4,44 cm** por debajo de la cruz = 41 % de la distancia dorso-ventral |
| Rostro-caudal | 48 % de la distancia cuello ventral → isquion (≈ apófisis xifoides) |
| Medio-lateral | 59 % de la anchura torácica desde el lado derecho |

Regresión publicada:
`distancia CdM3D → collar (cm) = −15,50713 + 0,75962 · (distancia collar → isquion)`, R² = 0,78.

> **Se midió en DECÚBITO**, no en estación. DempsterCan calcula el CdM por suma
> de segmentos y usa estos valores solo como comprobación de coherencia.

---

## 3. Reparto de carga estático

| Población / método | % torácico | Dispositivo | Fuente |
|---|---|---|---|
| Valor clásico de texto | 60,0 | — | Millis & Levine 2014 |
| Razas pequeñas (n=25) | 63 ± 3 | 2 básculas de baño | Linder 2021 |
| Razas pequeñas (n=25) | 68 ± 4 | pasarela de presión | Linder 2021 |
| Pastor Alemán (n=12) | 62,4 ± 2,4 | Tekscan + Qualisys | Humphries 2020 |
| Labrador Retriever (n=12) | 69,4 ± 5,0 | Tekscan + Qualisys | Humphries 2020 |

**Rango de medias publicadas: 59–69,4 %.** La diferencia entre razas es
significativa (p < 0,001) y el dispositivo cambia el resultado ~5 puntos en los
mismos perros. No existe ecuación publicada que prediga el reparto a partir de
la longitud del tronco o de un índice de conformación.

### Asimetría izquierda-derecha en perros SANOS (Linder 2021)

| Método | Tren torácico | Tren pelviano |
|---|---|---|
| 4 básculas de baño | 8,7 ± 7,5 % | 3,7 ± 2,9 % |
| 4 básculas de cocina | 8,6 ± 6,3 % | 4,3 ± 3,6 % |
| Pasarela de presión | 12,8 ± 9,1 % | 6,0 ± 5,2 % |

La asimetría normal del tren anterior es 2–3 veces la del posterior. Un umbral
único del 5 % produciría falsos positivos en masa.

### Índices de plataforma (Alves 2024, n=80 con artrosis)

`SI = |(D − I) / ((D + I) · 0,5)| · 100`

| Medida | Basal | +15 días | DMCI |
|---|---|---|---|
| Índice de simetría | 28,1 ± 27,5 | 13,9 ± 13,1 | **−10** |
| Desviación | 3,5 ± 3,0 | 1,7 ± 1,6 | **−1** |

Cambios menores que la diferencia mínima clínicamente importante están dentro
del ruido de medida.

---

## 4. Ángulos articulares en estación

**Fuente:** Giansetto T et al. *Vet Sci* 2022;9(11):644. n = 21, radiografía
mediolateral en estación, **ejes mecánicos**.

| Ángulo | Media ± DE | Rango |
|---|---|---|
| Femorotibial | 145,3 ± 7,9° | 129,5–156,6° |
| Tibiotarsiano | 134,0 ± 9,1° | 122,5–147,7° |

Definiciones: eje mecánico femoral = centro de la cabeza femoral → centro
femorotibial; eje tibial = eminencias intercondíleas → centro del astrágalo;
eje tarsiano = paralelo a los metatarsianos por el centro del astrágalo.

> Conclusión de los autores: el valor clásico de 135° usado en planificación de
> TTA es **demasiado bajo**.

**No hay referencia publicada en estación para hombro, codo, carpo ni cadera**
que sea utilizable con marcadores cutáneos. Humphries 2020 publicó ángulos en
estación para las seis articulaciones, pero como desviación respecto a la
posición recta y sin declarar el convenio de signos.

---

## 5. Goniometría PASIVA (contexto documental, no criterio de imagen)

Rango pasivo en decúbito lateral con manipulación. **No es medible desde una
foto de un perro de pie.**

### Bulldog Francés, n=20 (Formenton 2019)

| Articulación | Flexión | Extensión | ROM |
|---|---|---|---|
| Hombro | 51 ± 8° | 160 ± 19° | 109 ± 24° |
| Codo | 51 ± 13° | 174 ± 11° | 123 ± 18° |
| Carpo | 32 ± 7° | 204 ± 8° | 172 ± 10° |
| Cadera | 58 ± 10° | 181 ± 7° | 123 ± 14° |
| Rodilla | 58 ± 8° | 172 ± 8° | 114 ± 12° |
| Tarso | 40 ± 6° | 188 ± 7° | 149 ± 8° |

### No condrodistróficos por tamaño (Reusing 2020)

| Movimiento | Miniatura | Pequeño | Mediano | Grande | Gigante |
|---|---|---|---|---|---|
| Hombro flexión | 37 ± 11 | 59 ± 11 | 62 ± 10 | 70 ± 10 | 58 ± 4 |
| Hombro extensión | 151 ± 5 | 140 ± 9 | 137 ± 8 | 126 ± 12 | 158 ± 7 |
| Codo flexión | 17 ± 3 | 31 ± 7 | 28 ± 3 | 36 ± 8 | 29 ± 5 |
| Codo extensión | 142 ± 7 | 151 ± 11 | 140 ± 8 | 146 ± 22 | 154 ± 9 |
| Carpo flexión | 29 ± 2 | 40 ± 9 | 33 ± 6 | 47 ± 13 | 44 ± 9 |
| Carpo extensión | 189 ± 2 | 187 ± 6 | 185 ± 5 | 184 ± 4 | 182 ± 5 |
| Cadera flexión | 47 ± 13 | 55 ± 12 | 56 ± 11 | 57 ± 11 | 68 ± 10 |
| Cadera extensión | 151 ± 6 | 129 ± 17 | 135 ± 9 | 120 ± 15 | 149 ± 10 |
| Rodilla flexión | 37 ± 5 | 34 ± 7 | 30 ± 7 | 42 ± 14 | 49 ± 8 |
| Rodilla extensión | 151 ± 9 | 130 ± 12 | 142 ± 8 | 146 ± 14 | 156 ± 9 |
| Tarso flexión | 29 ± 6 | 37 ± 10 | 33 ± 6 | 48 ± 12 | 50 ± 14 |
| Tarso extensión | 156 ± 21 | 168 ± 25 | 162 ± 9 | 175 ± 17 | 161 ± 9 |

Los perros condrodistróficos tienen mayor extensión de cadera y tarso que los
no condrodistróficos del mismo tamaño.

> La tabla clásica de Jaegger et al. (2002, Labrador) circula ampliamente en
> apuntes de rehabilitación, pero el artículo está tras muro de pago y su
> resumen no contiene los valores. No se reproduce aquí sin haberla verificado.

---

## 6. Reparos anatómicos

**Fuente:** Pálya Z et al. *PLOS ONE* 2022;17(3):e0264299 — set de 25
marcadores reflectantes de 9 mm, el estándar en cinemática canina.

**Miembro torácico:** aspecto dorsal de la espina escapular · tubérculo mayor
del húmero · epicóndilo lateral del húmero · apófisis estiloides ulnar ·
aspecto distolateral del 5.º metacarpiano.

**Miembro pelviano:** cresta ilíaca · trocánter mayor · cóndilo femoral lateral
· maléolo lateral de la fíbula · aspecto distolateral del 5.º metatarsiano.

**Axiales:** protuberancia occipital · apófisis espinosa de T1 · de T13 · de L7
· ápice sacro.

Añadidos por DempsterCan desde Brown NP et al. (*Front Bioeng Biotechnol*
2020;8:150): **tuberosidad calcánea** (extremo proximal del segmento pie en
Jones 2018) y **tuberosidad isquiática** (brazo fijo del ángulo coxofemoral).

> El **acromion** no aparece en los sets cinemáticos caninos estándar. Se usa la
> espina escapular dorsal en su lugar.

> **Artefacto de tejido blando:** el desplazamiento piel-hueso es máximo en la
> región proximal del miembro (escápula, cadera, muslo). Los marcadores sobre
> escápula y trocánter mayor son los menos fiables de todo el set
> (*BMC Vet Res* 2018;14:389).

---

## 7. Conjuntos de datos de pose animal

| Dataset | Keypoints | Licencia | Cubre carpo | Cubre tarso | Cubre reparos óseos |
|---|---|---|---|---|---|
| AP-10K | 17 | no comercial | **no** | **no** | no |
| APT-36K | 17 | MIT | **no** | **no** | no |
| Animal-Pose (Cao 2019) | 20 | no especificada | parcial | parcial | no |
| StanfordExtra | 24 | MIT (anotaciones) | sí | sí | no |
| SuperAnimal-Quadruped | 39 | Modified MIT, **no comercial** | probable | probable | no |

Ninguno anota espina escapular, tubérculo mayor, epicóndilos, apófisis
estiloides, tuber sacrale, tuber ischiadicum, trocánter, maléolo ni calcáneo.
Todos etiquetan centros articulares visuales.

Rendimiento medido (MMPose, Snapdragon 865, ncnn FP16): RTMPose-t 9,0 ms,
RTMPose-m 26,4 ms. Penalización navegador vs. nativo en CPU móvil: **×15,8**
(*ACM TOSEM* 2024, doi:10.1145/3688843); SIMD + multihilo la reducen un 63 %.
Para foto fija, RTMPose-t/s int8 en ONNX Runtime Web es viable (~150–600 ms);
HRNet-w32 y cualquier ViT no lo son.
