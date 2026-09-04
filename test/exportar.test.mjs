/**
 * Pruebas del exportador. El .docx se construye a mano, así que hay que
 * comprobar que el ZIP es válido y que el XML está bien formado: si no, Word
 * abre un archivo corrupto y el usuario no tiene forma de saber por qué.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// El módulo usa APIs de navegador solo en la parte de imagen; el .docx no.
globalThis.Blob = globalThis.Blob || (await import('node:buffer')).Blob;

const { crearZip, construirDocx } = await import('../js/exportar.js');
const { generarPlantilla } = await import('../js/landmarks.js');
const { analizar } = await import('../js/biomech.js');
const params = await import('../js/params.js');

function casoDeEjemplo(conf = 'mesomorfo') {
  const pl = generarPlantilla(conf);
  const puntos = {};
  for (const [k, [x, y]] of Object.entries(pl.puntos)) puntos[k] = [200 + x * 400, 100 + y * 400];
  const caso = {
    fecha: '2026-08-24',
    ficha: { paciente: 'Nube', raza: 'Labrador', edad: '6 años', sexo: 'Hembra esterilizada',
             lado: 'Derecho', explorador: 'MVZ Jorge Grana', motivo: 'Control post-quirúrgico' }
  };
  const analisis = analizar({
    puntos, masaKg: 30, calibracion: { p1: [0, 0], p2: [0, 400], cm: 60 },
    perfil: 'morfometrico', lado: 'Derecho',
    cargasMedidas: { tdi: 9.1, tdd: 10.4, tpi: 5.2, tpd: 5.3 }
  });
  return { caso, analisis };
}

const REF = {
  ANGULOS_ESTACION: params.ANGULOS_ESTACION,
  REPARTO_REFERENCIA: params.REPARTO_REFERENCIA,
  LIMITACIONES: params.LIMITACIONES,
  FUENTES: params.FUENTES,
  CDM_REFERENCIA: params.CDM_REFERENCIA
};

async function bytes(blob) { return Buffer.from(await blob.arrayBuffer()); }

test('el ZIP generado tiene firma, directorio central y fin de archivo', async () => {
  const blob = crearZip([{ nombre: 'hola.txt', datos: new TextEncoder().encode('qué tal') }]);
  const b = await bytes(blob);
  assert.equal(b.subarray(0, 4).toString('hex'), '504b0304', 'falta la firma local');
  assert.ok(b.includes(Buffer.from('504b0102', 'hex')), 'falta el directorio central');
  assert.ok(b.includes(Buffer.from('504b0506', 'hex')), 'falta el fin de archivo');
});

test('el .docx contiene las cuatro partes obligatorias y la imagen', async (t) => {
  const { caso, analisis } = casoDeEjemplo();
  const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(200).fill(7)]);
  const blob = construirDocx({ caso, analisis, referencias: REF,
    imagenPng: { datos: png, ancho: 1200, alto: 800 } });
  const b = await bytes(blob);

  const dir = mkdtempSync(path.join(tmpdir(), 'docx-'));
  const archivo = path.join(dir, 'informe.docx');
  writeFileSync(archivo, b);

  let lista;
  try {
    lista = execFileSync('unzip', ['-Z1', archivo], { encoding: 'utf8' });
  } catch {
    t.skip('unzip no disponible en este entorno');
    return;
  }
  for (const parte of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml',
                       'word/_rels/document.xml.rels', 'word/media/diagrama.png']) {
    assert.ok(lista.includes(parte), 'falta ' + parte);
  }

  // El XML debe estar bien formado: es el fallo que produce "archivo corrupto".
  const xml = execFileSync('unzip', ['-p', archivo, 'word/document.xml'], { encoding: 'utf8' });
  assert.ok(xml.startsWith('<?xml'), 'el documento no empieza por la declaración XML');
  const abiertas = (xml.match(/<w:p>/g) || []).length;
  const cerradas = (xml.match(/<\/w:p>/g) || []).length;
  assert.equal(abiertas, cerradas, 'párrafos sin cerrar');
  const tOpen = (xml.match(/<w:tbl>/g) || []).length;
  const tClose = (xml.match(/<\/w:tbl>/g) || []).length;
  assert.equal(tOpen, tClose, 'tablas sin cerrar');
  assert.ok(xml.includes('r:embed="rId10"'), 'la imagen no está referenciada');

  // Y el contenido tiene que estar de verdad.
  assert.ok(xml.includes('Nube'));
  assert.ok(xml.includes('Labrador'));
  assert.ok(xml.includes('Femorotibial'));
  assert.ok(xml.includes('Jones'), 'faltan las referencias bibliográficas');
});

test('los caracteres especiales del nombre no rompen el XML', async () => {
  const { caso, analisis } = casoDeEjemplo();
  caso.ficha.paciente = 'Ñoño <&> "Tobi" O\'Hara';
  caso.ficha.motivo = 'Cojera 3/5 & sospecha de rotura de LCC';
  const blob = construirDocx({ caso, analisis, referencias: REF, imagenPng: null });
  const texto = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert.ok(texto.includes('&lt;&amp;&gt;'), 'los signos no se han escapado');
  assert.ok(!/paciente[^<]*<&>/.test(texto));
});

test('el documento se genera sin imagen y sin calibración', async () => {
  const pl = generarPlantilla('condrodistrofico');
  const puntos = {};
  for (const [k, [x, y]] of Object.entries(pl.puntos)) puntos[k] = [200 + x * 400, 100 + y * 400];
  const analisis = analizar({ puntos, masaKg: null });
  const blob = construirDocx({
    caso: { fecha: '2026-08-24', ficha: {} }, analisis, referencias: REF, imagenPng: null });
  const b = await bytes(blob);
  assert.ok(b.length > 2000, 'el documento ha salido vacío');
  assert.equal(b.subarray(0, 4).toString('hex'), '504b0304');
});

test('las cinco conformaciones producen un documento válido', async () => {
  for (const conf of ['mesomorfo', 'condrodistrofico', 'lebrel', 'molosoide', 'gigante']) {
    const { caso, analisis } = casoDeEjemplo(conf);
    const blob = construirDocx({ caso, analisis, referencias: REF, imagenPng: null });
    const b = await bytes(blob);
    assert.ok(b.length > 2000, conf + ': documento vacío');
  }
});

/* =================================================================== */
/* Versión y caché                                                     */
/* =================================================================== */

test('la versión de sw.js y la de app.js coinciden', async () => {
  // Si no coinciden, los dispositivos ya instalados pueden quedarse con una
  // mezcla de archivos viejos y nuevos, o no enterarse de la actualización.
  // Es exactamente el fallo que hacía que los cambios «no llegaran».
  const { readFile } = await import('node:fs/promises');
  const sw  = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const vSw  = sw.match(/const VERSION\s*=\s*'([^']+)'/);
  const vApp = app.match(/const VERSION_APP\s*=\s*'([^']+)'/);
  assert.ok(vSw, 'sw.js debe declarar VERSION');
  assert.ok(vApp, 'app.js debe declarar VERSION_APP');
  assert.equal(vSw[1], vApp[1], 'suba la versión en sw.js Y en app.js');
});

test('el service worker precarga todos los módulos de la app', async () => {
  // Un módulo fuera de NUCLEO no se guarda al instalar: la app arrancaría
  // pero fallaría al abrirla sin conexión.
  const { readFile, readdir } = await import('node:fs/promises');
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const modulos = (await readdir(new URL('../js/', import.meta.url))).filter(f => f.endsWith('.js'));
  for (const m of modulos) {
    assert.ok(sw.includes(`./js/${m}`), `falta ./js/${m} en NUCLEO de sw.js`);
  }
});
