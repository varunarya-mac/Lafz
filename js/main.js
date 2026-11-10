// App bootstrap: routing, service worker, install banner, first-run welcome.
import { $, $$, applyTheme, toast, openSheet, closeSheet } from './ui.js';
import { getPref, setPref, entriesAll, shayriAll } from './db.js';
import * as idioms from './views/idioms.js';
import * as practice from './views/practice.js';
import * as shayari from './views/shayari.js';
import * as settings from './views/settings.js';
import { loadSample } from './seed.js';

const VIEWS = { idioms, practice, shayari, settings };
let current = null;

async function show(tab){
  current = tab;
  $$('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  history.replaceState(null, '', '#' + tab);
  const screen = $('#screen');
  screen.scrollTop = 0;
  screen.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'view';
  screen.appendChild(wrap);
  await VIEWS[tab].mount(wrap);
}

function setTab(tab){
  if (!VIEWS[tab]) tab = 'idioms';
  show(tab); // tapping the active tab also refreshes
}

/* ------- first run / sample pack ------- */
async function firstRun(){
  if (getPref('welcomed')) return;
  const [es, ss] = await Promise.all([entriesAll(), shayriAll()]);
  if (es.length || ss.length){ setPref('welcomed', true); return; }
  openSheet(`
    <h2>Welcome to Lafz 👋</h2>
    <p style="color:var(--text-2);font-size:14.5px;margin-top:6px">
      Your personal space for <b>English idioms & words</b> with daily flashcard practice,
      plus a <b>shayari</b> collection you can browse and filter by poet.</p>
    <div class="sh-actions">
      <button class="btn" id="w-empty">Start empty</button>
      <button class="btn primary" id="w-sample">Load sample pack</button>
    </div>
  `, { onClose(){ setPref('welcomed', true); } });
  $('#w-sample').addEventListener('click', async () => {
    try {
      await loadSample();
      closeSheet();
      toast('Sample pack loaded 🎉');
      show(current || 'idioms');
    } catch(e){ console.error(e); toast('Could not load sample'); }
  });
  $('#w-empty').addEventListener('click', () => closeSheet());
}

/* ------- iOS install hint ------- */
function installBanner(){
  const b = $('#a2hs');
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  if (standalone || getPref('a2hs-x')) return;
  if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
  b.hidden = false;
  $('#a2hs-x').addEventListener('click', () => {
    b.hidden = true;
    setPref('a2hs-x', true);
  });
}

/* ------- routing ------- */
function initRouting(){
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });
  window.addEventListener('hashchange', () => {
    const t = location.hash.replace('#', '') || 'idioms';
    if (VIEWS[t] && t !== current) show(t);
  });
}

/* ------- service worker + update toast ------- */
function initSW(){
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return; // file:// etc.
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller){
          toast('✨ New version ready', { label: 'Refresh', action(){ location.reload(); } });
        }
      });
    });
    reg.update?.();
  }).catch(() => {});
}

(async function init(){
  applyTheme();
  installBanner();
  initRouting();
  initSW();
  const startTab = location.hash.replace('#', '');
  try {
    await show(VIEWS[startTab] ? startTab : 'idioms');
  } catch(e){ console.error(e); }
  firstRun();
})();
