<div align="center">

<img src="icons/icon-192.png" width="96" alt="DempsterCan">

# DempsterCan

**Diagrama de Dempster canino — valoración funcional en estática**

Una foto lateral del perro de pie → centro de masa, línea de gravedad, base de
sustentación, reparto de carga torácico:pelviano, ángulos articulares y momentos
articulares externos, con un informe clínico imprimible.

Funciona **sin conexión**. Corre en el navegador del teléfono o como **APK de
Android**. Nada sale del dispositivo.

</div>

---

## Qué hace exactamente

| | |
|---|---|
| **Fotografía** | Cámara integrada con guías de encuadre, silueta de la conformación elegida y aviso de inclinación del teléfono. También admite subir fotos de la galería, con corrección de orientación EXIF. |
| **Modelo segmentario** | 11 segmentos con las fracciones de masa y los coeficientes de centro de masa **medidos en perros** (Jones et al. 2018; Ragetly et al. 2008). |
| **Adaptación a la raza** | El perfil morfométrico **redistribuye las masas según las longitudes de segmento medidas en la foto** y, opcionalmente, los perímetros con cinta. Sirve para cualquier conformación canina, no solo para el mesomorfo grande. |
| **Centro de masa global** | Suma ponderada de los centros de masa parciales. Validado contra Johnson et al. 2022. |
| **Estática** | Base de sustentación, posición del CdM dentro de ella, línea de gravedad y reparto de carga por equilibrio de momentos. |
| **Ángulos** | Escápulo-humeral, codo, carpo, coxofemoral, femorotibial y tarso, con signo (el carpo puede superar los 180°). |
| **Momentos externos** | Equilibrio del sólido libre distal a cada articulación, con el peso de los segmentos distales incluido. |
| **Incertidumbre** | Monte Carlo sobre las desviaciones estándar publicadas → IC 95 % del reparto de carga. |
| **Reparto medido** | Si tiene básculas o plataforma de presión, entra la medición real y se calculan los índices de simetría de Alves et al. 2024. |
| **Exportar** | Cuatro salidas desde un mismo botón: **ficha de resultados en imagen** (diagrama + todas las tablas, para mensajería o historia clínica), **documento de Word (.docx)** editable con el diagrama incrustado, PNG solo del diagrama, e informe imprimible → PDF. En el teléfono abre la hoja de compartir de Android. |
| **Historial** | Casos en IndexedDB, exportables a JSON. Solo en el dispositivo. |

---

## Instalar

> Guía paso a paso, con capturas de los menús y solución de problemas:
> **[docs/INSTALAR.md](docs/INSTALAR.md)**.

### En el teléfono, como app (recomendado)

**Opción A — APK.** Descargue el `.apk` de la pestaña *Releases* y ábralo en el
teléfono. Android pedirá permiso para instalar desde orígenes desconocidos
(*Ajustes → Aplicaciones → Acceso especial → Instalar apps desconocidas*). No
necesita conexión después.

**Opción B — desde el navegador.** Abra la URL de GitHub Pages en Chrome y use
*«Añadir a pantalla de inicio»*. A partir de ahí funciona igual que una app
instalada y sigue funcionando en modo avión: el service worker guarda todo.

### En el ordenador, para desarrollar

```bash
git clone https://github.com/USUARIO/dempstercan.git
cd dempstercan
npm test              # 57 pruebas: motor de cálculo y exportación
python3 -m http.server 8080
# abra http://localhost:8080
```

No hay compilación ni bundler. Son módulos ES nativos, se editan y se recargan.

> **Abrir `index.html` con doble clic no funciona.** Los módulos ES no se cargan
> por `file://` por política de origen del navegador: verá una pantalla en
> blanco. Hace falta servirlo por HTTP, aunque sea el servidor de una línea de
> arriba. En el APK y en GitHub Pages esto no aplica.

### Generar el APK usted mismo

```bash
npm install
npm run android:apk
# android/app/build/outputs/apk/debug/app-debug.apk
```

Requiere Java 21 y el SDK de Android. El *workflow* `.github/workflows/apk.yml`
lo hace solo en cada push, sin instalar nada en su máquina.

---

## Cómo se usa en la clínica

1. **La foto.** Pulse **Tomar foto con la cámara** y encuadre al perro sobre la
   línea de suelo naranja. La pantalla muestra la silueta de la conformación
   elegida para ayudarle a encuadrar, una rejilla de tercios y un nivel que se
   pone rojo si el teléfono está inclinado más de 3°, que es el error que más
   falsea los ángulos. Perro en estación cuadrada, sobre superficie plana,
   cámara **perpendicular al plano sagital** y a la altura del tórax. Ponga en
   el encuadre una regla o cinta métrica **en el mismo plano que el perro**: sin
   ella no habrá centímetros, ni newtons, ni momentos.
   También puede pulsar **Subir desde galería** si ya tiene la foto hecha.
2. **Conformación y plantilla.** Elija el tipo más parecido —toy, pequeño,
   mesomorfo, gigante, condrodistrófico, molosoide o lebrel— y dibuje un
   recuadro alrededor del perro; aparecen los 18 reparos en una posición de
   partida razonable. Un Chihuahua va en **toy**, no en condrodistrófico: sus
   huesos largos son normales, solo que pequeños.
3. **Corregir arrastrando.** Este es el paso que importa. Toque cada reparo de
   la lista, lea la guía anatómica y colóquelo donde lo ha **palpado**. La lupa
   circular aparece mientras arrastra para afinar al píxel.
4. **Datos.** Masa corporal, calibración de escala (dos toques sobre la regla +
   la distancia real), las cargas por miembro si tiene básculas y, si quiere
   afinar el reparto de masa, los perímetros torácico y abdominal con cinta.
   Indique también qué lado fotografió: con cargas medidas, los momentos se
   calculan con **ese** miembro.
5. **Resultados** y **Informe**. El informe se imprime o se guarda como PDF con
   la función del propio teléfono.

Los dos reparos imprescindibles son **metacarpo** y **metatarso**, marcados en
el punto de contacto con el suelo: definen la base de sustentación.

---

## Los 18 reparos

Siguen el set de marcadores de Pálya et al. 2022, el estándar en cinemática
canina, más el calcáneo y la tuberosidad isquiática (Brown et al. 2020), que
hacen falta para el segmento «pie» de Jones 2018 y para el ángulo coxofemoral.

**Axiales** · punta del hocico · protuberancia occipital · T1 (cruz) · T13 ·
L7 · ápice sacro · punta de la cola
**Torácicos** · espina escapular (borde dorsal) · tubérculo mayor del húmero ·
epicóndilo lateral del húmero · apófisis estiloides ulnar · 5.º metacarpiano
distolateral
**Pelvianos** · tuberosidad isquiática · trocánter mayor · cóndilo femoral
lateral · maléolo lateral · tuberosidad calcánea · 5.º metatarsiano
distolateral

---

## Lo que esta app **no** hace, y por qué

Esto no es letra pequeña: es el diseño.

### No usa ningún coeficiente humano de Dempster (1955)

Existe tabla canina completa. Las diferencias con el humano son sistemáticas y
grandes: los segmentos distales del perro tienen el centro de masa **más
proximal** (adaptación cursorial). En la pierna la diferencia es de 0,067 —
0,366 en el perro frente a 0,433 en el humano. Usar el coeficiente humano sería
un error de bulto.

La única excepción es la **escápula**: no existe masa ni centro de masa
escapular canino publicado de forma aislada (Jones et al. no lograron separarla
limpiamente del tórax). La app **declara ese hueco** en vez de rellenarlo con
el valor humano — el perro carece de clavícula funcional y la biomecánica no es
homóloga.

### Sirve para la mayoría de conformaciones caninas, no solo para el perro de la tabla

Este era el punto débil de la primera versión y ahora es el núcleo del diseño.

Las fracciones de masa publicadas vienen de seis Pastores Alemanes de 36,8 kg.
Aplicarlas tal cual a un Teckel es un error de conformación: su tronco es casi
el doble de largo respecto a su alzada y sus extremidades son mucho más cortas.
Darle el 38 % de la masa al tórax y el 4,5 % a cada muslo sería sencillamente
falso.

Pero la foto **ya contiene** la longitud real de cada segmento del paciente. El
perfil morfométrico la usa: reparte la masa en proporción al volumen de cada
segmento, con las densidades segmentarias publicadas,

```
m_i  ∝  ρ_i · A_i · L_i(medida)
```

y normaliza el total a la masa corporal real, que es un dato medido en la
báscula, no una estimación. Sin perímetros, la sección `A_i` se toma de la
referencia escalada a la alzada del paciente, y todo se reduce a

```
m_i  ∝  m_i(Jones) · [ L_i(paciente) / L_i(referencia a igual alzada) ]
```

Dos propiedades hacen que esto sea defendible:

- **Cuando las proporciones del paciente coinciden con las de la referencia,
  devuelve exactamente la tabla de Jones.** Está comprobado en las pruebas con
  tolerancia 1e-9. No es un modelo distinto: es el mismo, con la conformación
  como parámetro.
- **No necesita calibración.** Solo intervienen relaciones entre longitudes, así
  que la escala en píxeles se cancela.

Lo que produce en la práctica, con un perro de 20 kg de cada tipo:

| Conformación | Tórax | Carga torácica | Desviación |
|---|---|---|---|
| Mesomorfo (= referencia) | 38,1 % | 58,9 % | 0 % |
| Toy (Chihuahua, Yorkshire) | 40,4 % | 55,9 % | 12 % |
| Pequeño (Jack Russell, Beagle) | 39,1 % | 57,4 % | 5 % |
| Condrodistrófico | 43,8 % | 55,8 % | 48 % |
| Molosoide | 44,3 % | 52,5 % | 22 % |
| Lebrel | 33,5 % | 63,0 % | 13 % |
| Gigante | 36,2 % | 61,1 % | 10 % |

El Teckel gana masa troncal y pierde masa apendicular; el Galgo hace lo
contrario. La app informa siempre de la **desviación de conformación** respecto
al perro de referencia, y muestra en el informe una columna con lo que habría
dado la tabla fija, para que se vea el tamaño de la corrección.

Si además se miden con cinta el perímetro torácico y el abdominal, la masa pasa
a repartirse por volumen real y no solo por longitud. Es la corrección que
distingue a un perro obeso de uno delgado con las mismas medidas lineales, y la
que más importa en braquicéfalos, perros muy musculados y atrofias. Un perímetro
incoherente con la alzada se avisa en vez de aplicarse en silencio.

### No marca ningún ángulo como patológico

Las referencias de ángulos en estación (Giansetto et al. 2022) se midieron por
**radiografía con ejes mecánicos**: centro de la cabeza femoral → centro
femorotibial. Esta app mide sobre **marcadores cutáneos**: trocánter mayor →
cóndilo femoral lateral → maléolo lateral. Como el trocánter está caudal a la
cabeza femoral, el ángulo femorotibial medido aquí sale sistemáticamente menor
que el radiográfico, de forma reproducible pero no intercambiable.

La app muestra la referencia, explica la diferencia y **no dispara ninguna
alarma automática**. El criterio que la propia literatura recomienda es
comparar con el **miembro contralateral del mismo perro** y con **mediciones
previas del mismo paciente y protocolo**.

Los rangos goniométricos clásicos (Jaegger 2002, Formenton 2019, Reusing 2020)
son **rango pasivo en decúbito lateral con manipulación del operador**. Una foto
de un perro de pie no puede medir eso, y aquí no se usan como criterio.

### No trata el 60:40 como umbral de normalidad

El rango de medias publicadas en perros sanos es **59–69,4 %** de carga
torácica. La diferencia entre dos razas grandes sanas llega a 7 puntos
(Labrador 69,4 ± 5,0 % frente a Pastor Alemán 62,4 ± 2,4 %, p < 0,001), y el
**dispositivo de medida** cambia el resultado otros 5 puntos (63 % con básculas
frente a 68 % con pasarela de presión, en los mismos perros). Por eso la app
registra el dispositivo junto al valor.

Lo mismo con la asimetría izquierda-derecha: en perros **sanos** llega a
8,7 ± 7,5 % en el tren anterior y solo 3,7 ± 2,9 % en el posterior. Un umbral
único del 5 % generaría falsos positivos en masa. La app usa umbrales
distintos por tren.

### La «detección automática» es un punto de partida, no una medición

Ningún conjunto de datos público de pose animal (AP-10K, APT-36K,
StanfordExtra, Animal-Pose, SuperAnimal-Quadruped) anota los reparos que la
goniometría canina necesita. Todos etiquetan centros articulares **visuales**,
pensados para reconocimiento de acción y reconstrucción 3D. Faltan
sistemáticamente: espina escapular, tubérculo mayor, epicóndilos laterales,
apófisis estiloides ulnar, tuber sacrale, tuber ischiadicum, trocánter mayor,
maléolo lateral y calcáneo. AP-10K ni siquiera tiene carpo ni tarso.

Por eso la app trabaja en tres niveles y lo dice en pantalla:

1. **Red neuronal** (opcional, si instala un modelo): coloca los puntos que el
   modelo sí conoce.
2. **Plantilla**: deduce el resto por ajuste de semejanza.
3. **Corrección manual**: obligatoria. El fisioterapeuta palpa; la red mira
   píxeles.

Ver [`models/README.md`](models/README.md) y
[`tools/preparar_modelo.py`](tools/preparar_modelo.py) para instalar un modelo
ONNX cuantizado que corra dentro del navegador sin conexión. **No se distribuye
ningún peso** en este repositorio por licencias.

### Otras limitaciones que el informe declara siempre

- Lo que el modelo morfométrico **no** puede adaptar es la densidad de cada
  segmento ni el coeficiente de centro de masa, que se siguen tomando de
  Pastores Alemanes y Labradores. Son propiedades del tejido y de la forma del
  segmento, mucho menos dependientes de la raza que las fracciones de masa, pero
  no están validadas fuera de esas poblaciones.
- El modelo trata cada segmento como un sólido de sección uniforme. Un tórax
  real es más profundo en su parte caudal y un muslo no es un cilindro. Los
  perímetros medidos con cinta reducen ese error donde más pesa.
- La atrofia muscular altera los parámetros: el muslo con rotura de ligamento
  cruzado pesa un 9 % menos (Ragetly 2008). Hay un perfil específico para eso.
- El desplazamiento piel-hueso es máximo en escápula, cadera y muslo: los
  reparos proximales son los menos fiables.
- Es un análisis **bidimensional en el plano sagital**. Asume simetría
  izquierda-derecha salvo que introduzca cargas medidas por miembro.

---

## Validación del motor de cálculo

`npm test` ejecuta 57 pruebas. Además de las de consistencia interna
(equilibrio de momentos, invarianza a escala, rotación y espejo, cierre de la
tabla de masas), hay tres de **validación externa** contra mediciones publicadas
que el modelo no conoce:

| Comprobación | Modelo | Publicado |
|---|---|---|
| Descenso del CdM bajo la cruz | 8,3 cm (perro de 75 cm de alzada) | 9,48 ± 4,44 cm — Johnson et al. 2022, n = 31 |
| Posición longitudinal del CdM | ~50 % cuello→isquion | 48 % — Johnson et al. 2022 |
| Reparto torácico de la plantilla | 58,9 % | 59–69,4 % — rango de medias publicadas |
| Morfométrico sobre la referencia | idéntico a Jones (1e-15 %) | tabla publicada |

Que el CdM calculado por suma de segmentos de Jones (Pastor Alemán, disección)
caiga donde lo midió Johnson con tabla de reacción en 31 perros heterogéneos es
la mejor comprobación disponible de que la cadena de cálculo es correcta.

---

## Arquitectura

```
index.html            una sola pantalla, cuatro pestañas
css/app.css           tema claro y oscuro, diseño para pulgar
js/params.js          TODOS los números publicados, con su fuente. Sin inventos.
js/landmarks.js       reparos, cadenas, ángulos y generador de plantillas por conformación
js/biomech.js         motor de cálculo — funciones puras, sin DOM, testeable
js/render.js          dibujo del diagrama en canvas
js/template.js        ajuste de semejanza por mínimos cuadrados (Umeyama 2D)
js/camara.js          captura con guías de encuadre, silueta y nivel
js/autodetect.js      ONNX Runtime Web: SimCC y heatmaps, con subpíxel
js/store.js           IndexedDB
js/report.js          informe imprimible
js/exportar.js        .docx sin librerías (escritor de ZIP + OOXML) y ficha en imagen
sw.js                 service worker: funcionamiento sin conexión
test/                 57 pruebas, node:test, sin dependencias
tools/preparar_modelo.py   descarga, exporta y cuantiza el modelo ONNX
tools/parche-android.mjs   declara el permiso de cámara en el APK
```

`js/params.js` es deliberadamente el archivo más documentado del repositorio:
cada constante lleva la cita completa, el tamaño de muestra y, cuando el dato no
existe, un `null` explícito con la explicación. Si mañana se publica la masa
escapular canina, se cambia ahí y en ningún otro sitio.

---

## Fuentes

1. Jones OY, Raschke SU, Riches PE. *Inertial properties of the German Shepherd Dog*. PLOS ONE. 2018;13(10):e0206037. [doi:10.1371/journal.pone.0206037](https://doi.org/10.1371/journal.pone.0206037)
2. Ragetly CA, Griffon DJ, Thomas JE, et al. *Noninvasive determination of body segment parameters of the hind limb in Labrador Retrievers with and without cranial cruciate ligament disease*. Am J Vet Res. 2008;69(9):1188–1196. [doi:10.2460/ajvr.69.9.1188](https://doi.org/10.2460/ajvr.69.9.1188)
3. Johnson TA, Gordon-Evans WJ, Lascelles BDX, Conzemius MG. *Determination of the center of mass in a heterogeneous population of dogs*. PLOS ONE. 2022;17(4):e0267361. [doi:10.1371/journal.pone.0267361](https://doi.org/10.1371/journal.pone.0267361)
4. Humphries A, Shaheen AF, Gómez Álvarez CB. *Biomechanical comparison of standing posture and during trot between German shepherd and Labrador retriever dogs*. PLOS ONE. 2020;15(10):e0239832. [doi:10.1371/journal.pone.0239832](https://doi.org/10.1371/journal.pone.0239832)
5. Linder JE, Thomovsky S, Bowditch J, et al. *Development of a simple method to measure static body weight distribution in neurologically and orthopedically normal mature small breed dogs*. BMC Vet Res. 2021;17:88. [doi:10.1186/s12917-021-02808-x](https://doi.org/10.1186/s12917-021-02808-x)
6. Alves JC, Santos A, Lavrador C, Carreira LM. *Minimal clinically important differences for a weight distribution platform in dogs with osteoarthritis*. Animals. 2024;14(1):128. [doi:10.3390/ani14010128](https://doi.org/10.3390/ani14010128)
7. Giansetto T, Picavet PP, Lefebvre M, Balligand M. *Determination of the Stifle Angle at Standing Position in Dogs*. Vet Sci. 2022;9(11):644. [doi:10.3390/vetsci9110644](https://doi.org/10.3390/vetsci9110644)
8. Pálya Z, Rácz K, Nagymáté G, Kiss RM. *Development of a detailed canine gait analysis method for evaluating harnesses: A pilot study*. PLOS ONE. 2022;17(3):e0264299. [doi:10.1371/journal.pone.0264299](https://doi.org/10.1371/journal.pone.0264299)
9. Brown NP, Bertocci GE, States GJR, et al. *Development of a canine rigid body musculoskeletal computer model to evaluate gait*. Front Bioeng Biotechnol. 2020;8:150. [doi:10.3389/fbioe.2020.00150](https://doi.org/10.3389/fbioe.2020.00150)
10. Formenton MR, de Lima LG, Vassalo FG, et al. *Goniometric Assessment in French Bulldogs*. Front Vet Sci. 2019;6:424. [doi:10.3389/fvets.2019.00424](https://doi.org/10.3389/fvets.2019.00424)
11. Reusing M, Brocardo M, Weber S, Villanova Jr J. *Goniometric Evaluation and Passive Range of Joint Motion in Chondrodystrophic and Non-Chondrodystrophic Dogs of Different Sizes*. VCOT Open. 2020;3:e66–e71. [doi:10.1055/s-0040-1713825](https://doi.org/10.1055/s-0040-1713825)
12. Millis D, Levine D. *Canine Rehabilitation and Physical Therapy*, 2.ª ed. Saunders Elsevier; 2014.

Referencias que convendría conseguir y que ampliarían el modelo, hoy tras muro
de pago: Nielsen et al. (Am J Vet Res 2003;64(5):609–617), única vía conocida a
la **masa escapular**; Amit et al. (Vet J 2009;182(1):94–99), validación
multirraza por RMN; y Milgram et al. (VCOT 2004;17(2):82–90), ángulos
articulares radiográficos en estación. Están citadas en `js/params.js` con su
DOI, listas para incorporarse.

---

## Licencia

MIT, con un aviso adicional sobre uso clínico. Véase [LICENSE](LICENSE).

Herramienta de apoyo a la valoración funcional veterinaria. No es un producto
sanitario certificado, no emite diagnósticos y no sustituye al examen clínico ni
al criterio del médico veterinario.
