/**
 * parche-android.mjs — Ajustes del proyecto Android que Capacitor no hace solo.
 *
 * 1. Declara el permiso de CÁMARA. Sin él, getUserMedia falla dentro del APK y
 *    la captura integrada no funciona (la app seguiría permitiendo subir fotos
 *    desde la galería, pero perdería la mitad de la función).
 * 2. Marca la cámara como no obligatoria, para no excluir dispositivos sin ella.
 *
 * Se ejecuta después de `npx cap add android` y es idempotente.
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const MANIFIESTO = path.resolve('android/app/src/main/AndroidManifest.xml');

try { await access(MANIFIESTO, constants.R_OK); }
catch {
  console.error('No existe el proyecto Android. Ejecute antes: npx cap add android');
  process.exit(1);
}

let xml = await readFile(MANIFIESTO, 'utf8');
let cambios = 0;

const lineas = [
  '    <uses-permission android:name="android.permission.CAMERA" />',
  '    <uses-feature android:name="android.hardware.camera" android:required="false" />'
];

for (const linea of lineas) {
  const marca = linea.trim().split(' ')[1];           // android:name="…"
  if (xml.includes(marca)) continue;
  xml = xml.replace('</manifest>', linea + '\n</manifest>');
  cambios++;
}

if (cambios) {
  await writeFile(MANIFIESTO, xml);
  console.log(`AndroidManifest.xml: ${cambios} entradas añadidas (permiso de cámara).`);
} else {
  console.log('AndroidManifest.xml ya estaba parcheado.');
}
