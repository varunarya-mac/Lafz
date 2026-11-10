// IndexedDB wrapper + local preferences. All data lives on this device.
import { dayKey } from './util.js';

const DB_NAME = 'lafz';
const DB_VER  = 1;
let dbp = null;

export function openDB(){
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('entries')){
        const s = db.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('nextDue', 'nextDue');
      }
      if (!db.objectStoreNames.contains('shayri'))  db.createObjectStore('shayri',  { keyPath: 'id' });
      if (!db.objectStoreNames.contains('daylogs')) db.createObjectStore('daylogs', { keyPath: 'day' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror   = () => { dbp = null; rej(r.error); };
  });
  return dbp;
}

function run(store, mode, fn){
  return openDB().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    try { out = fn(s); } catch(e){ rej(e); return; }
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  }));
}

/* ----- entries (idioms / words / phrases) ----- */
export const entriesAll = () => run('entries', 'readonly', s => s.getAll());
export const entryPut   = v   => run('entries', 'readwrite', s => s.put(v));
export const entryDel   = id  => run('entries', 'readwrite', s => s.delete(id));

/* ----- shayari ----- */
export const shayriAll = () => run('shayri', 'readonly', s => s.getAll());
export const shayriPut = v   => run('shayri', 'readwrite', s => s.put(v));
export const shayriDel = id  => run('shayri', 'readwrite', s => s.delete(id));

/* ----- bulk / shared ----- */
export const bulkPut = (store, items) =>
  run(store, 'readwrite', s => { for (const it of items) s.put(it); return items.length; });

/* ----- practice logs ----- */
export const logsAll = () => run('daylogs', 'readonly', s => s.getAll());

export function logDay(date, nReviewed, nCorrect){
  return openDB().then(db => new Promise((res, rej) => {
    const t = db.transaction('daylogs', 'readwrite');
    const s = t.objectStore('daylogs');
    const key = dayKey(date);
    const g = s.get(key);
    g.onsuccess = () => {
      const cur = g.result || { day: key, reviewed: 0, correct: 0 };
      s.put({ day: key, reviewed: (cur.reviewed||0) + nReviewed, correct: (cur.correct||0) + nCorrect });
    };
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  }));
}

/** Import day logs without double-counting: keep max counts per day. */
export function mergeLogs(items){
  return openDB().then(db => new Promise((res, rej) => {
    const t = db.transaction('daylogs', 'readwrite');
    const s = t.objectStore('daylogs');
    for (const it of items){
      if (!it?.day) continue;
      const g = s.get(it.day);
      g.onsuccess = () => {
        const cur = g.result || { day: it.day, reviewed: 0, correct: 0 };
        s.put({
          day: it.day,
          reviewed: Math.max(cur.reviewed||0, it.reviewed||0),
          correct:  Math.max(cur.correct ||0, it.correct ||0),
        });
      };
    }
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  }));
}

/* ----- danger zone ----- */
export function clearStores(){
  return openDB().then(db => new Promise((res, rej) => {
    const t = db.transaction(['entries','shayri','daylogs'], 'readwrite');
    for (const n of ['entries','shayri','daylogs']) t.objectStore(n).clear();
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  }));
}

/* ----- tiny preferences store (localStorage) ----- */
export function getPref(k, d = null){
  try {
    const v = localStorage.getItem('lafz:' + k);
    return v == null ? d : JSON.parse(v);
  } catch { return d; }
}
export function setPref(k, v){
  try { localStorage.setItem('lafz:' + k, JSON.stringify(v)); } catch { }
}
