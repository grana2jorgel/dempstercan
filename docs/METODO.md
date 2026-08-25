# Método de cálculo

Documento de referencia del motor (`js/biomech.js`). Todo lo que aquí se
describe está implementado con funciones puras y cubierto por `test/`.

---

## 1. Sistema de referencia

El análisis **no** se hace en coordenadas de la imagen, sino en un marco
solidario con la base de sustentación. Así una foto ligeramente inclinada no
falsea las alturas ni los brazos de palanca.

Sean `A` el apoyo torácico (5.º metacarpiano en contacto con el suelo) y `B` el
apoyo pelviano (5.º metatarsiano):

```
ês = (B − A) / ‖B − A‖          eje caudal, a lo largo del suelo
êh ⊥ ês, orientado hacia arriba  eje vertical (gravedad)
origen = A
```

Cualquier punto `q` de la imagen pasa a coordenadas locales `(s, h)`:

```
s = (q − A) · ês        distancia a lo largo del suelo, desde el apoyo torácico
h = (q − A) · êh        altura sobre el suelo
```

La app avisa si la línea entre apoyos supera los 8° respecto a la horizontal de
la imagen. Existe la opción de usar la horizontal de la imagen como suelo, para
cuando se sabe que la cámara estaba a nivel.

**Orientación sagital.** El signo del producto cruzado se invierte según el
perro mire a la izquierda o a la derecha. Se resuelve comparando la posición
del occipucio con la del sacro, y se aplica como factor `±1` a todos los
ángulos. Comprobado en `test/`: la imagen en espejo da exactamente los mismos
ángulos.

## 2. Escala

Dos puntos marcados sobre un objeto de longitud conocida `d` cm, separados
`p` píxeles:

```
px_por_cm = p / d
```

Sin calibración la app sigue dando ángulos y porcentajes, pero declara
explícitamente que no hay centímetros, newtons ni momentos.

## 3. Ángulos articulares

Para una articulación con vértice `V`, extremo proximal `P` y distal `D`:

```
v₁ = P − V          v₂ = D − V
θ = atan2( σ · (v₁ × v₂), v₁ · v₂ ) · 180/π        con σ = orientación sagital
```

`atan2` devuelve el ángulo **con signo** en (−180°, 180°]. Esto es
imprescindible: con `acos(v₁·v₂ / ‖v₁‖‖v₂‖)` nunca se podría representar un
carpo en hiperextensión, que en la bibliografía llega a 196–204°. Cuando la
articulación admite ángulo reflejo (solo el carpo) y θ es negativo, se devuelve
`360 − |θ|`.

Definición de cada ángulo, trasladando a coordenadas de imagen los protocolos
goniométricos de Jaegger 2002 y Formenton 2019:

| Articulación | Proximal | Vértice | Distal |
|---|---|---|---|
| Escápulo-humeral | espina escapular dorsal | tubérculo mayor | epicóndilo lateral del húmero |
| Codo | tubérculo mayor | epicóndilo lateral del húmero | apófisis estiloides ulnar |
| Carpo | epicóndilo lateral del húmero | apófisis estiloides ulnar | 5.º metacarpiano |
| Coxofemoral | ápice sacro | trocánter mayor | cóndilo femoral lateral |
| Femorotibial | trocánter mayor | cóndilo femoral lateral | maléolo lateral |
| Tarso | cóndilo femoral lateral | maléolo lateral | 5.º metatarsiano |

Para la cadera se calcula además una **variante pélvica**: el brazo fijo pasa a
ser la dirección `sacro − isquion` trasladada al trocánter, que es lo que el
goniómetro reproduce en la práctica clínica. Se muestran las dos porque no
coinciden y conviene que el usuario sepa cuál está leyendo.

> **Los ángulos de esta app no son intercambiables con los radiográficos.**
> Giansetto et al. (2022) usaron ejes mecánicos (centro de la cabeza femoral →
> centro femorotibial). Aquí se usan marcadores cutáneos. El trocánter está
> caudal a la cabeza femoral, de modo que el ángulo femorotibial sale
> sistemáticamente menor. Es reproducible, pero distinto. Por eso la app no
> aplica ningún criterio automático de normalidad.

## 4. Centro de masa

Cada segmento `i` tiene una fracción de masa `μᵢ` y un coeficiente de centro de
masa `cᵢ` (fracción de la longitud desde el extremo proximal), ambos medidos en
perros. Con `Aᵢ` y `Bᵢ` los extremos del segmento:

```
rᵢ = Aᵢ + cᵢ (Bᵢ − Aᵢ)
```

Los segmentos de miembro se contabilizan **dos veces** en la misma posición
sagital: es la hipótesis de simetría izquierda-derecha, explícita en el informe.
Con `fᵢ = μᵢ · (2 si es par, 1 si no)`:

```
k = 1 / Σ fᵢ                    renormalización si falta algún segmento opcional
CdM = Σ (k·fᵢ) rᵢ
```

La renormalización existe porque la cola (0,80 %) y la cabeza (7,70 %) pueden no
estar marcadas. Se reparte proporcionalmente para que la suma siga siendo la
masa corporal, y la app avisa de que lo ha hecho.

**Tabla base:** Jones et al. 2018, 11 segmentos, n = 6 Pastor Alemán. La suma
cierra en 0,9998. **Perfiles alternativos:** miembro pelviano de Labrador y de
Labrador con rotura de ligamento cruzado (Ragetly et al. 2008).

**No se usa ningún coeficiente humano.** El único hueco real es la escápula,
que Jones et al. incluyeron dentro del tórax; la app lo declara y no lo rellena.

## 4 bis. Adaptación morfométrica a la conformación del paciente

La tabla de Jones describe a un Pastor Alemán de 36,8 kg. Para que el modelo
sirva en cualquier conformación canina, la masa se reparte en proporción al
volumen de cada segmento:

```
m_i  ∝  ρ_i · A_i · L_i
```

con `ρ_i` la densidad segmentaria publicada, `L_i` la longitud medida sobre la
fotografía y `A_i` la sección transversal equivalente.

**Sección por defecto.** Si no se miden perímetros, `A_i` se toma de la
referencia escalada a la alzada del paciente. Como todo se normaliza, la
expresión se reduce a

```
m_i  ∝  m_i(Jones) · ratio_i          ratio_i = L_i(paciente) / (u · L_i(referencia))
```

donde `u` es la escala del paciente en píxeles por unidad de tronco, obtenida de
la altura a la cruz (`u = h_T1 / 1,25`) o, si T1 no está marcado, de la base de
sustentación. Solo intervienen relaciones entre longitudes: **el resultado no
depende de la escala en píxeles ni requiere calibración**.

**Sección medida.** Si se introduce el perímetro `C_i` con cinta y hay
calibración, se sustituye

```
A_i = C_i² / (4π)          ratio_sección = (C_i / C_i,ref)²
```

con `C_i,ref = 2·√(π·A_i,ref)` calculado sobre la referencia escalada al tamaño
del paciente. Esto distingue a un perro obeso de uno delgado con las mismas
longitudes.

**Volúmenes de referencia.** No se usan los volúmenes tabulados por Jones et al.
sino `V_i = m_i / ρ_i`, que es exacto por definición. El motivo es concreto: el
volumen tabulado de la cabeza (1000 cm³) es incompatible con su propia fracción
de masa y su densidad —que dan 2822 cm³—, mientras que los otros diez segmentos
cuadran con un error inferior al 3 %. Derivar el volumen evita arrastrar esa
incoherencia.

**Propiedad de consistencia.** Cuando las proporciones del paciente coinciden
con las de la referencia, todos los `ratio_i` valen 1 y el modelo devuelve
exactamente la tabla publicada. Comprobado en `test/` con tolerancia 1e-9.

**Desviación de conformación.** Se informa como la media cuadrática, ponderada
por masa, del logaritmo de los `ratio_i`. Cuantifica cuánto se aparta el
paciente del perro de referencia, y por tanto cuánta extrapolación hay en el
resultado.

**Lo que no se adapta.** La densidad `ρ_i` y el coeficiente de centro de masa
`c_i` siguen siendo los de Jones y Ragetly. Son propiedades del tejido y de la
forma del segmento, mucho menos dependientes de la raza que las fracciones de
masa, pero no están validadas fuera de esas poblaciones. El modelo también
asume sección uniforme a lo largo del eje del segmento; medir perímetros reduce
ese error donde más pesa.

## 5. Reparto de carga estático

Con `L = s_B − s_A` la base de sustentación y `s_CdM` la coordenada del centro
de masa, tomando momentos respecto al apoyo pelviano:

```
F_torácica · L = W · (L − s_CdM)
F_torácica / W = 1 − s_CdM / L
```

Es una identidad de estática de sólido rígido, exacta si el perro está cuadrado
y quieto y se miden distancias **horizontales** entre centros de presión. Está
comprobada numéricamente en `test/` con tolerancia 1e-9.

La app contrasta el resultado con las medias publicadas (59–69,4 % torácico) y
avisa explícitamente de que **el 60 % no es un umbral de normalidad**: entre dos
razas grandes sanas hay 7 puntos de diferencia y entre dos dispositivos de
medida, 5 más.

Si se introducen cargas medidas por miembro, esas prevalecen sobre la
estimación y se calcula el índice de simetría de Alves et al. 2024:

```
SI = | (D − I) / ((D + I) · 0,5) | · 100
```

con umbrales de normalidad **distintos por tren** (Linder 2021: 8,7 ± 7,5 % en
el torácico frente a 3,7 ± 2,9 % en el pelviano) y la diferencia mínima
clínicamente importante de −10 puntos para declarar mejoría.

## 6. Momentos articulares externos

Para cada articulación `j`, equilibrio del sólido libre formado por **todo lo
distal** a ella:

```
M_j = F_suelo · (s_apoyo − s_j) − Σ_k m_k · g · (s_k − s_j)
```

donde `k` recorre los segmentos distales a `j` (con la masa de **un solo**
miembro), `s_k` es la coordenada de su centro de masa y `F_suelo` la fuerza de
apoyo de ese miembro.

Cadenas distales:

| Articulación | Segmentos distales |
|---|---|
| Escápulo-humeral | brazo, antebrazo, mano |
| Codo | antebrazo, mano |
| Carpo | mano |
| Coxofemoral | muslo, pierna, pie |
| Femorotibial | pierna, pie |
| Tarso | pie |

**Fuerza de apoyo.** Si hay cargas medidas por miembro se usa la del miembro
del lado fotografiado; si no se indicó el lado, la media de ambos, y la app lo
declara en el informe. Sin medición se reparte el peso simétricamente a partir
del modelo, y también se declara.

**Sentido del momento.** No se usa ninguna tabla de supuestos anatómicos: se
determina geométricamente. Se rota numéricamente el segmento distal un ángulo
infinitesimal en sentido antihorario y se observa si el ángulo articular crece
o decrece. El signo resultante, combinado con el del momento, indica si el
momento externo tiende a flexionar o a extender **en la postura concreta que se
ha marcado**.

## 6 bis. Representación del cinturón pelviano

La pelvis se dibuja como el triángulo **tuber sacrale – tuber ischiadicum –
trocánter mayor**, relleno en semitransparencia. No es decorativo: es el eje
sobre el que se mide el ángulo coxofemoral, y sin él el trocánter aparecía
suelto y el miembro pelviano parecía no estar unido al esqueleto axial,
mientras que el torácico sí mostraba su enlace (espina escapular → tubérculo
mayor).

El triángulo solo se cierra cuando sus tres vértices están marcados; si falta
alguno se dibuja abierto, para no insinuar un lado que el usuario no ha
colocado. Hay una prueba que comprueba que **ningún reparo obligatorio queda
fuera de alguna cadena de dibujo**: marcar un punto y no ver ninguna línea que
lo use es exactamente el fallo que tenía el isquion.

## 7. Línea de gravedad

La vertical que pasa por el centro de masa global. Para cada articulación se
reporta la distancia horizontal con signo hasta esa línea: es el brazo de
palanca del peso corporal respecto a esa articulación en la postura
fotografiada, y el equivalente canino del análisis de plomada de la valoración
postural estática humana.

## 8. Incertidumbre

Monte Carlo con 800 iteraciones y generador congruencial de semilla fija (los
resultados son reproducibles). En cada iteración se muestrea cada fracción de
masa y cada coeficiente de centro de masa de una normal con la **desviación
estándar publicada** por Jones et al. Se recalcula el centro de masa y el
reparto, y se reportan media, DE e intervalo de confianza del 95 %.

Esto propaga la variabilidad **del modelo poblacional**. No incluye el error de
marcado de los reparos, que en la práctica clínica suele ser mayor: el
desplazamiento piel-hueso es máximo precisamente en escápula, cadera y muslo.

## 9. Ajuste de la plantilla y conformaciones

Transformación de semejanza 2D (escala uniforme + rotación + traslación) por
mínimos cuadrados, solución cerrada tipo Umeyama. Con los centroides `m` y `n`
de plantilla y puntos marcados:

```
a = Σ (aᵢ·bᵢ) / Σ ‖aᵢ‖²          parte coseno
b = Σ (aᵢ × bᵢ) / Σ ‖aᵢ‖²        parte seno
```

donde `aᵢ`, `bᵢ` son los puntos centrados. Bastan **dos** reparos marcados para
proyectar los dieciséis restantes. Cada corrección del usuario mejora el ajuste
de los que aún no ha tocado.

Las plantillas se generan a partir de cinco juegos de parámetros de
conformación —mesomorfo, condrodistrófico, lebrel, molosoide/braquicéfalo y
gigante— definidos por la alzada relativa (altura a la cruz en longitudes de
tronco: 0,72 en un Teckel, 1,45 en un Galgo), las longitudes de los segmentos de
miembro como fracción de la alzada y sus ángulos respecto a la vertical.

Las alturas del trocánter y del hombro no se fijan a mano: se deducen exigiendo
que la cadena llegue exactamente al suelo, de modo que cualquier combinación de
parámetros produce siempre un perro apoyado. Comprobado en `test/` para las
cinco conformaciones.

La geometría del mesomorfo se eligió para que el ángulo tarsiano coincida con
los 134,0° publicados por Giansetto et al. Sus longitudes de segmento son además
las **longitudes de referencia** del modelo morfométrico, de modo que la
geometría del perro de Jones vive en un solo sitio del código.

La plantilla es **solo una posición de partida**: no impone ninguna conformación
al cálculo.
