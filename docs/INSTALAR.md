# Instalar DempsterCan en el móvil

Hay dos formas. Las dos dejan la app funcionando **sin conexión** en el
teléfono; la diferencia está en cuánto tiene que instalar usted en el ordenador.

| | Ruta A — desde el navegador | Ruta B — APK |
|---|---|---|
| Qué instala en el ordenador | nada | nada (lo compila GitHub) |
| Tiempo hasta tenerla en el móvil | ~5 minutos | ~10 minutos |
| Aparece como app con icono | sí | sí |
| Funciona sin conexión | sí | sí |
| Cámara integrada | sí | sí |
| Requiere repositorio público | sí (o cuenta GitHub Pro) | no |
| Se actualiza sola al hacer push | sí | no, hay que reinstalar |

**Empiece por la ruta A.** Es la más rápida y no depende de que compile nada.
La B es preferible si el repositorio tiene que ser privado o si quiere repartir
la app a compañeros que no van a abrir una URL.

---

## Paso 0 — Subir el proyecto a GitHub

Común a las dos rutas.

### 0.1 Descomprimir y ver los archivos ocultos

Descomprima `dempstercan.zip`. **Active la vista de archivos ocultos** antes de
seguir: hay una carpeta `.github/` que el sistema esconde y que contiene los
flujos de trabajo que publican la app sola.

- Windows: Explorador → pestaña *Vista* → marcar *Elementos ocultos*.
- Mac: en el Finder, pulse `⌘` `⇧` `.`

Debe ver `.github` y `.gitignore` junto a `index.html`.

### 0.2 Crear el repositorio vacío en GitHub

En <https://github.com/new>:

| Campo | Valor |
|---|---|
| Repository name | `dempstercan` |
| Visibilidad | **Public** (Pages en repositorios privados requiere cuenta de pago) |
| Add a README | **desmarcado** |
| Add .gitignore / Choose a license | **None** en los dos |

Si marca cualquiera de esas tres casillas, GitHub crea archivos que chocarán con
los suyos y el push fallará.

### 0.3 Subir los archivos

**Opción A — por el navegador, sin instalar nada.** En la página del repositorio
recién creado, pulse *uploading an existing file* y arrastre **el contenido** de
la carpeta `dempstercan` (no la carpeta que lo envuelve). Escriba un mensaje y
pulse *Commit changes*. Después compruebe que aparece la carpeta `.github`; si el
arrastre no incluyó los archivos ocultos, créelos con *Add file → Create new
file* escribiendo como nombre `.github/workflows/pages.yml` y pegando el
contenido.

**Opción B — con Git.** El zip **no** incluye historial, así que hay que
inicializarlo:

```bash
cd /ruta/hasta/dempstercan
git init
git add -A
git commit -m "DempsterCan 1.1"
git branch -M main
git remote add origin https://github.com/USUARIO/dempstercan.git
git push -u origin main
```

Sustituya `USUARIO` por su nombre de usuario. GitHub **no acepta la contraseña
de la cuenta** desde la terminal: cuando la pida, use un token personal
(<https://github.com/settings/tokens> → *Generate new token (classic)* → permiso
`repo`). Con el cliente `gh` instalado se evita ese paso:

```bash
gh auth login
gh repo create dempstercan --public --source=. --push
```

## Ruta A — Instalar desde el navegador (recomendada)

### A.1 Activar GitHub Pages

1. Abra el repositorio en GitHub.
2. **Settings** → **Pages** (menú de la izquierda).
3. En *Build and deployment* → *Source*, elija **GitHub Actions**.
4. **Settings** → **Actions** → **General** → *Workflow permissions* →
   **Read and write permissions** → *Save*.

No hace falta tocar nada más: el flujo `.github/workflows/pages.yml` ya está en
el repositorio. Se dispara solo con cada push a `main`, ejecuta antes las 37
pruebas del motor de cálculo y solo publica si pasan.

### A.2 Esperar a que publique

Pestaña **Actions** del repositorio. La ejecución «Publicar en GitHub Pages»
tarda un par de minutos. Al terminar, la URL aparece en **Settings → Pages** y
tiene esta forma:

```
https://USUARIO.github.io/dempstercan/
```

### A.3 Instalarla en el teléfono

1. Abra esa URL **en Chrome** en el móvil.
2. Menú de tres puntos → **Añadir a pantalla de inicio** (en algunas versiones
   aparece como *Instalar aplicación*).
3. Confirme. El icono queda en el escritorio como cualquier otra app.

Ábrala una vez con datos o wifi: en esa primera apertura el *service worker*
guarda todos los archivos en el teléfono. **A partir de ahí funciona en modo
avión.** Puede comprobarlo activando el modo avión y abriéndola de nuevo.

### A.4 Permiso de cámara

La primera vez que pulse *Tomar foto con la cámara*, Chrome pedirá permiso.
Acéptelo. Si lo rechazó por error: Chrome → tres puntos → *Configuración* →
*Configuración de sitios* → *Cámara* → busque el sitio y permítalo.

> **Por qué tiene que ser GitHub Pages y no su ordenador.** Los navegadores solo
> dan acceso a la cámara en páginas servidas por **HTTPS** o en `localhost`.
> Si abre la app desde la IP local de su ordenador (algo como
> `http://192.168.1.40:8080`), todo funcionará **menos la cámara**. GitHub Pages
> sirve por HTTPS, así que no tiene ese problema.

### A.5 Actualizar la app más adelante

```bash
git add -A
git commit -m "lo que haya cambiado"
git push
```

GitHub republica sola. En el teléfono, la nueva versión entra la **segunda** vez
que abra la app: la primera se descarga en segundo plano. Si quiere forzarlo,
cierre la app del todo y vuelva a abrirla dos veces.

---

## Ruta B — APK instalable

### B.1 Dejar que lo compile GitHub

El flujo `.github/workflows/apk.yml` ya está en el repositorio y se ejecuta con
cada push a `main`. Para obtener además una *Release* con el APK adjunto,
publique una etiqueta de versión:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Después:

1. Pestaña **Actions** → ejecución «APK de Android» → espere a que termine
   (5–10 minutos la primera vez, porque descarga el SDK de Android).
2. Descargue el APK desde **Releases** (si publicó etiqueta) o desde el apartado
   *Artifacts* al final de la página de la ejecución.

> **Aviso honesto:** la compilación con Capacitor no se ha podido ejecutar en el
> entorno donde se escribió esta app, porque no tenía acceso al registro de npm.
> La configuración está completa y es la estándar, pero **la primera ejecución
> del flujo en GitHub es donde se valida de verdad**. Si falla, mire el registro
> de la ejecución: casi siempre es una versión de Capacitor o de Gradle que hay
> que fijar, y el error lo dice con claridad. La ruta A no depende de esto.

### B.2 Instalarlo en el teléfono

1. Pase el archivo `.apk` al móvil (correo, cable, Drive, lo que prefiera) y
   ábralo desde la app de Archivos.
2. Android avisará de que la app viene de un origen desconocido. Pulse
   **Configuración** en ese aviso y active el permiso para la app desde la que
   está abriendo el archivo (normalmente *Archivos* o *Chrome*).
   La ruta completa es: *Ajustes → Aplicaciones → Acceso especial → Instalar
   aplicaciones desconocidas*.
3. Vuelva atrás y pulse **Instalar**.

El APK va firmado con la clave de depuración, así que **no se puede subir a
Google Play tal cual**. Para eso hay que firmarlo con una clave propia; para uso
en su clínica y entre compañeros no hace falta.

### B.3 Compilarlo en su propio ordenador (opcional)

Solo si prefiere no depender de GitHub. Necesita **Node 20+**, **Java 21** y el
**SDK de Android** (lo más cómodo es instalar Android Studio, que trae ambos):

```bash
npm install
npm run android:apk
# el archivo queda en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

El script `android:apk` copia la app a `www/`, crea el proyecto Android, aplica
el parche que declara el permiso de cámara y lanza Gradle. Es idempotente:
puede repetirlo cuantas veces quiera.

---

## Probar en el ordenador antes de subir nada

```bash
cd dempstercan
npm test                      # 37 pruebas del motor de cálculo
python3 -m http.server 8080
```

Abra <http://localhost:8080>. En `localhost` la cámara **sí** funciona, aunque
sea HTTP.

> **No abra `index.html` haciendo doble clic.** La app son módulos ES nativos y
> el navegador los bloquea por `file://`: verá una pantalla en blanco. Hay que
> servirla por HTTP, aunque sea con el servidor de una línea de arriba.

---

## Problemas frecuentes

**La pantalla sale en blanco.**
Está abriendo el archivo directamente en vez de servirlo por HTTP. Vea el
apartado anterior.

**No aparece «Añadir a pantalla de inicio».**
Tiene que ser Chrome (o Edge) sobre HTTPS. En Firefox de Android la opción está
en el menú como *Instalar*. Si sigue sin salir, compruebe que la URL termina en
`/dempstercan/` y que carga el icono.

**El botón de la cámara no hace nada.**
O no hay permiso, o la página no está en HTTPS ni en localhost. La app pasa
automáticamente al selector de galería cuando la cámara no está disponible, así
que siempre puede seguir trabajando con fotos ya hechas.

**Las fotos salen giradas.**
No debería ocurrir: la app aplica la orientación EXIF al cargarlas. Si le pasa,
es un caso que merece la pena reportar.

**Actions falla en «Publicar en GitHub Pages» con un error de permisos.**
En *Settings → Actions → General → Workflow permissions*, marque
**Read and write permissions**.

**El repositorio es privado y Pages no funciona.**
GitHub Pages en repositorios privados requiere cuenta de pago. Hágalo público
—la app no contiene datos de pacientes— o use la ruta B.

---

## Lo que conviene tener a mano el primer día en la clínica

- Una **regla rígida o cinta métrica** que pueda dejar apoyada en el mismo plano
  que el perro. Sin ella no hay centímetros, ni newtons, ni momentos: solo
  ángulos y porcentajes.
- La **masa corporal** del paciente, de la báscula.
- Si dispone de ellas, **dos o cuatro básculas** para el reparto de carga
  medido. Con dos ya se cubre el reparto torácico:pelviano, que es el dato
  principal.
- Una **cinta métrica flexible** para los perímetros torácico y abdominal, que
  son los que más afinan el reparto de masa en perros obesos, braquicéfalos o
  con atrofia.
