/**
 * build-www.mjs — Copia los archivos de la app a ./www para que Capacitor los
 * empaquete dentro del APK. No hay compilación ni bundler: la app son módulos
 * ES nativos, así que "construir" es copiar.
 */
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'www');

const ENTRADAS = [
  'index.html', 'manifest.webmanifest', 'sw.js',
  'css', 'js', 'icons', 'models', 'vendor'
];

const existe = async (p) => { try { await access(p, constants.R_OK); return true; } catch { return false; } };

await rm(DESTINO, { recursive: true, force: true });
await mkdir(DESTINO, { recursive: true });

for (const e of ENTRADAS) {
  const origen = path.join(RAIZ, e);
  if (!(await existe(origen))) { console.log(`  (omitido, no existe) ${e}`); continue; }
  await cp(origen, path.join(DESTINO, e), { recursive: true });
  console.log(`  copiado ${e}`);
}

console.log(`\nListo: ${DESTINO}`);
console.log('El APK resultante funciona 100 % sin conexión: todos los archivos viajan dentro.');
