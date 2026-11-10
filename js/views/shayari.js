// Shayari: English verses, optional poet name, dynamic poet filter chips.
import { openSheet, closeSheet, toast } from '../ui.js';
import { shayriAll, shayriPut, shayriDel, getPref, setPref } from '../db.js';
import { esc, uuid } from '../util.js';

export async function mount(root){
  let data = [];
  let filter = getPref('shayari.filter', 'all');
  const q = { v: '' };

  const matches = s => {
    if (filter === 'fav')   return !!s.isFavorite;
    if (filter === 'none')  return !s.poet;
    if (filter !== 'all')   return (s.poet || '') === filter;
    return true;
  };

  const cardHTML = (s, i) => `
    <article class="shay" data-id="${s.id}" style="--i:${Math.min(i, 12)}">
      <button class="heart ${s.isFavorite ? 'on' : ''}" data-fav="${s.id}"
        aria-label="${s.isFavorite ? 'Remove favorite' : 'Add favorite'}">${s.isFavorite ? '♥' : '♡'}</button>
      <p class="txt">${esc(s.text)}</p>
      ${s.poet ? `<p class="poet">— ${esc(s.poet)}</p>` : ''}
    </article>`;

  const emptyHTML = hasData => `
    <div class="empty">
      <span class="art">${hasData ? '🔎' : '✒️'}</span>
      <h3>${hasData ? 'No shayari for this filter' : 'No shayari yet'}</h3>
      <p>${hasData ? 'Try another poet chip or clear the search.' : 'Tap the ＋ button to save your first verse.'}</p>
    </div>`;

  const paint = () => {
    const poets = [...new Set(data.map(s => (s.poet || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const favN = data.filter(s => s.isFavorite).length;
    const chips =
      `<button class="chip ${filter === 'all' ? 'on' : ''}" data-filter="all">All</button>` +
      `<button class="chip ${filter === 'fav' ? 'on' : ''}" data-filter="fav">♥ Favorites</button>` +
      `<button class="chip ${filter === 'none' ? 'on' : ''}" data-filter="none">Unnamed</button>` +
      poets.map(p => `<button class="chip ${filter === p ? 'on' : ''}" data-filter="${esc(p)}">${esc(p)}</button>`).join('');

    const needle = q.v.trim().toLowerCase();
    const list = data
      .filter(matches)
      .filter(s => !needle || `${s.text} ${s.poet || ''}`.toLowerCase().includes(needle))
      .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

    // update only dynamic regions, so the search input keeps focus while typing
    root.querySelector('#s-sub').textContent = `${data.length} saved`;
    root.querySelector('#s-chips').innerHTML = chips;
    root.querySelector('#s-count').textContent =
      `${list.length} shown · ${poets.length} poets · ${favN} ♥`;
    root.querySelector('#s-rows').innerHTML =
      list.length ? list.map(cardHTML).join('') : emptyHTML(data.length > 0);
  };
  const reload = async () => { data = await shayriAll(); paint(); };

  function openForm(s){
    const isNew = !s;
    const v = s ?? { text:'', poet:'', isFavorite:false };
    openSheet(`
      <h2>${isNew ? 'New shayari' : 'Edit shayari'}</h2>
      <label class="field"><span class="lbl">Shayari (English)</span>
        <textarea id="f-text" style="min-height:120px;font-family:var(--serif);font-size:17px;line-height:1.6"
          placeholder="Write or paste the verse here…">${esc(v.text)}</textarea></label>
      <label class="field"><span class="lbl">Poet — optional</span>
        <input id="f-poet" maxlength="60" value="${esc(v.poet || '')}" placeholder="Who wrote it? (optional)"></label>
      <div class="switch-row" style="margin-top:6px">
        <div class="grow"><b>Favorite ♥</b><span>Show under the Favorites chip</span></div>
        <button class="switch ${v.isFavorite ? 'on' : ''}" id="f-fav" role="switch" aria-checked="${!!v.isFavorite}"></button>
      </div>
      <div class="sh-actions">
        ${isNew ? '' : '<button class="btn danger" id="f-del" aria-label="Delete">🗑</button>'}
        <button class="btn primary" id="f-save" style="flex:2">Save</button>
      </div>`);

    let fav = !!v.isFavorite;
    const favBtn = document.querySelector('#f-fav');
    favBtn.addEventListener('click', () => {
      fav = !fav;
      favBtn.classList.toggle('on', fav);
      favBtn.setAttribute('aria-checked', fav);
    });
    document.querySelector('#f-save').addEventListener('click', async () => {
      const text = document.querySelector('#f-text').value.trim();
      if (!text){ toast('Shayari text is required'); return; }
      const poet = document.querySelector('#f-poet').value.trim();
      const rec = {
        ...(s || { id: uuid(), createdAt: Date.now() }),
        text, poet: poet || null, isFavorite: fav,
        updatedAt: Date.now(),
      };
      await shayriPut(rec);
      closeSheet();
      await reload();
      toast(isNew ? 'Saved ✓' : 'Updated ✓');
    });
    const del = document.querySelector('#f-del');
    if (del) del.addEventListener('click', async () => {
      const original = s;
      await shayriDel(s.id);
      closeSheet();
      await reload();
      toast('Deleted', { label:'Undo', action: async () => {
        await shayriPut(original);
        await reload();
      }});
    });
  }

  root.addEventListener('click', async e => {
    const fav = e.target.closest('[data-fav]');
    if (fav){
      const s = data.find(x => x.id === fav.dataset.fav);
      if (!s) return;
      s.isFavorite = !s.isFavorite;
      await shayriPut(s);
      paint();
      return;
    }
    if (e.target.closest('#s-add')){ openForm(null); return; }
    const chipEl = e.target.closest('[data-filter]');
    if (chipEl){ filter = chipEl.dataset.filter; setPref('shayari.filter', filter); paint(); return; }
    const card = e.target.closest('.shay');
    if (card){
      const s = data.find(x => x.id === card.dataset.id);
      if (s) openForm(s);
    }
  });

  // static chrome — built once so paint() never touches the search input
  root.innerHTML = `
    <div class="v-head"><h1>Shayari</h1><span class="sub" id="s-sub"></span></div>
    <div class="search"><span class="mag">⌕</span>
      <input id="s-q" type="search" placeholder="Search verse or poet…" autocomplete="off"></div>
    <div class="chips" id="s-chips"></div>
    <div class="count-line" id="s-count"></div>
    <div class="rows" id="s-rows"></div>
    <button class="fab" id="s-add" aria-label="Add shayari"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg></button>`;

  let debounce;
  root.querySelector('#s-q').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { q.v = e.target.value; paint(); }, 220);
  });

  await reload();
}