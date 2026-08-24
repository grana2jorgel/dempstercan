/**
 * store.js — Historial de casos en IndexedDB. Todo queda en el dispositivo:
 * la app no envía nada a ningún servidor y funciona sin conexión.
 */

const DB = 'dempstercan';
const VER = 1;

function abrir() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('casos')) {
        const s = db.createObjectStore('casos', { keyPath: 'id' });
        s.createIndex('paciente', 'paciente', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx(db, modo, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction('casos', modo);
    const s = t.objectStore('casos');
    let out;
    try { out = fn(s); } catch (e) { rej(e); return; }
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export function nuevoId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function guardar(caso) {
  const db = await abrir();
  caso.actualizado = new Date().toISOString();
  await tx(db, 'readwrite', s => s.put(caso));
  db.close();
  return caso.id;
}

export async function listar() {
  const db = await abrir();
  const r = await new Promise((res, rej) => {
    const req = db.transaction('casos').objectStore('casos').getAll();
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
  db.close();
  return r.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

export async function obtener(id) {
  const db = await abrir();
  const r = await new Promise((res, rej) => {
    const req = db.transaction('casos').objectStore('casos').get(id);
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
  db.close();
  return r;
}

export async function borrar(id) {
  const db = await abrir();
  await tx(db, 'readwrite', s => s.delete(id));
  db.close();
}

/** Exporta todos los casos a un JSON descargable (copia de seguridad). */
export async function exportarTodo() {
  const casos = await listar();
  return JSON.stringify({ app: 'DempsterCan', version: 1, exportado: new Date().toISOString(), casos }, null, 2);
}

export async function importar(texto, { fusionar = true } = {}) {
  const d = JSON.parse(texto);
  const casos = Array.isArray(d) ? d : d.casos;
  if (!Array.isArray(casos)) throw new Error('Archivo no reconocido.');
  const db = await abrir();
  let n = 0;
  await tx(db, 'readwrite', s => {
    for (const c of casos) {
      if (!c.id) c.id = nuevoId();
      if (!fusionar) c.id = nuevoId();
      s.put(c); n++;
    }
  });
  db.close();
  return n;
}
