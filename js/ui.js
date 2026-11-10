// UI plumbing: theme, toasts, bottom sheets, confetti, segmented controls.
import { getPref, setPref } from './db.js';

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function applyTheme(){
  const t = getPref('theme', 'auto');
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

/* ---------- toast (with optional action) ---------- */
let toastTimer = null;
export function toast(msg, { label, action, ms = 4200 } = {}){
  const t = $('#toast');
  t.hidden = false;
  t.innerHTML = `<span>${msg}</span>` + (label ? `<button class="t-act">${label}</button>` : '');
  const hide = () => {
    t.classList.remove('show');
    setTimeout(() => { t.hidden = true; }, 350);
  };
  if (label && action){
    $('#toast .t-act', t).addEventListener('click', () => { action(); hide(); }, { once: true });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, ms + 1600);
  } else {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, ms);
  }
  requestAnimationFrame(() => t.classList.add('show'));
}

/* ---------- bottom sheet ---------- */
let onCloseCb = null;
export function openSheet(html, { onClose } = {}){
  const overlay = $('#overlay'), sheet = $('#overlay .sheet');
  onCloseCb = onClose || null;
  sheet.innerHTML = `<div class="sh-handle" aria-label="Drag down to dismiss"><span></span></div>` + html;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('open'));
  sheet.style.transform = '';

  // fresh backdrop to avoid listener pile-up
  const old = $('#overlay .backdrop');
  const bd = old.cloneNode(false);
  old.replaceWith(bd);
  bd.addEventListener('click', closeSheet);

  // drag handle to dismiss
  const handle = sheet.querySelector('.sh-handle');
  let sy = 0, dy = 0, dragging = false;
  handle.addEventListener('pointerdown', e => {
    dragging = true; sy = e.clientY; dy = 0;
    sheet.classList.add('dragging');
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - sy);
    sheet.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    if (dy > 110) closeSheet();
    else sheet.style.transform = '';
    dy = 0;
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

export function closeSheet(){
  const overlay = $('#overlay');
  if (overlay.hidden) return;
  const sheet = $('#overlay .sheet');
  sheet.style.transform = '';   // clear drag offset so the close animation runs
  overlay.classList.remove('open');
  const cb = onCloseCb;
  onCloseCb = null;
  setTimeout(() => {
    overlay.hidden = true;
    sheet.innerHTML = '';
  }, 460);
  cb && cb();
}

/* ---------- confetti ---------- */
export function confetti(host = document.body, n = 30){
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#22c55e', '#38bdf8'];
  for (let i = 0; i < n; i++){
    const p = document.createElement('i');
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (1 + Math.random() * 1.4) + 's';
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    p.style.width = (6 + Math.random() * 6) + 'px';
    p.style.height = (10 + Math.random() * 9) + 'px';
    wrap.appendChild(p);
  }
  host.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3000);
}

/* ---------- segmented control ---------- */
export function segHTML(name, items, current){
  const i = Math.max(0, items.findIndex(x => x.v === current));
  return `<div class="seg" data-name="${name}" style="--n:${items.length};--i:${i}"><div class="thumb"></div>` +
    items.map(x => `<button type="button" data-v="${x.v}" class="${x.v === current ? 'on' : ''}">${x.l}</button>`).join('') +
    `</div>`;
}
export function bindSeg(root, name, onPick){
  const segEl = root.querySelector(`.seg[data-name="${name}"]`);
  if (!segEl) return;
  segEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const idx = [...segEl.querySelectorAll('button')].indexOf(b);
    segEl.style.setProperty('--i', idx);
    segEl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onPick(b.dataset.v);
  });
}
