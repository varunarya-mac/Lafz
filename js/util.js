// Pure helpers — no DOM, safe to unit-test in Node.
export function uuid(){
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.random() * 16 | 0;
    return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
export function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function dayKey(d){
  const x = new Date(d);
  const m = String(x.getMonth()+1).padStart(2,'0');
  const day = String(x.getDate()).padStart(2,'0');
  return `${x.getFullYear()}-${m}-${day}`;
}
export function addDays(date, n){ const x = new Date(date); x.setDate(x.getDate()+n); return x; }
export function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length-1; i > 0; i--){
    const j = Math.random() * (i+1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function esc(s){
  // '&' is built at runtime so no HTML-entity sequence ever appears in source.
  const A = String.fromCharCode(38);
  return String(s ?? '')
    .replace(/&/g, A + 'amp;')
    .replace(/</g, A + 'lt;')
    .replace(/>/g, A + 'gt;')
    .replace(/"/g, A + 'quot;')
    .replace(/'/g, A + '#39;');
}
export function clamp(n, lo, hi){ return Math.min(hi, Math.max(lo, n)); }
export function relTime(ts, now = Date.now()){
  const s = Math.floor((now - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s/60);  if (m < 60)  return m + 'm ago';
  const h = Math.floor(m/60);  if (h < 24)  return h + 'h ago';
  const d = Math.floor(h/24);  if (d === 1)  return 'yesterday';
  if (d < 30) return d + 'd ago';
  const mo = Math.floor(d/30); if (mo < 12) return mo + 'mo ago';
  return Math.floor(d/365) + 'y ago';
}
export const KINDS   = ['idiom','word','phrase'];
export const DIFFS   = ['easy','medium','hard'];
export const KIND_ICON = { idiom:'📖', word:'🔤', phrase:'💬' };
export const DIFF_LABEL = { easy:'Easy', medium:'Medium', hard:'Hard' };
export const DIFF_CLASS = { easy:'e', medium:'m', hard:'h' };
