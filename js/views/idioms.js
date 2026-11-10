// Idioms & Words: list, filters (kind / difficulty / excluded), CRUD with undo.
import { $, segHTML, bindSeg, openSheet, closeSheet, toast } from '../ui.js';
import { entriesAll, entryPut, entryDel, getPref, setPref } from '../db.js';
import { esc, uuid, DIFF_LABEL, DIFF_CLASS, KIND_ICON, KINDS } from '../util.js';
import { buildSession } from '../engine.js';

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 8"/></svg>';
const ICON_OFF   = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export async function mount(root){
  const state = {
    q: '',
    kind: getPref('idioms.kind', 'all'),
    diff: getPref('idioms.diff', 'all'),
    showEx: getPref('idioms.showEx', false),
  };
  let data = [];

  const emptyHTML = hasData => `
    <div class="empty">
      <span class="art">${hasData ? '🔍' : '📚'}</span>
      <h3>${hasData ? 'Nothing matches your filters' : 'No idioms yet'}</h3>
      <p>${hasData ? 'Try a different search, difficulty or type.' : 'Tap the ＋ button to save your first idiom or word.'}</p>
    </div>`;

  const rowHTML = (e, i) => `
    <article class="row ${e.inPractice === false ? 'dim' : ''}" data-id="${e.id}" style="--i:${Math.min(i, 12)}">
      <div class="row-main">
        <h3 class="row-title">${esc(e.text)}</h3>
        <p class="row-sub">${esc(e.meaning)}</p>
        <div class="row-tags">
          <span class="pill ${DIFF_CLASS[e.difficulty] || 'm'}">${DIFF_LABEL[e.difficulty] || ''}</span>
          <span class="pill mute">${KIND_ICON[e.kind] || '📖'} ${cap(e.kind || 'idiom')}</span>
          ${(e.box || 0) >= 3 ? '<span class="pill e">✓ learned</span>' : ''}
          ${e.inPractice === false ? '<span class="pill mute">⊘ excluded</span>' : ''}
        </div>
      </div>
      <div class="row-side">
        <button class="iconbtn ${e.inPractice !== false ? 'on' : ''}" data-ex="${e.id}"
          aria-label="${e.inPractice !== false ? 'Exclude from practice' : 'Include in practice'}">
          ${e.inPractice !== false ? ICON_CHECK : ICON_OFF}</button>
      </div>
    </article>`;

  const paint = () => {
    root.querySelector('#i-kindseg').innerHTML = segHTML('kind',
      [{ v:'all', l:'All' }, ...KINDS.map(k => ({ v:k, l:cap(k) }))], state.kind);
    root.querySelector('#i-diffseg').innerHTML = segHTML('diff',
      [{ v:'all', l:'All' }, { v:'easy', l:'Easy' }, { v:'medium', l:'Medium' }, { v:'hard', l:'Hard' }], state.diff);
    bindSeg(root, 'kind', v => { state.kind = v; setPref('idioms.kind', v); paint(); });
    bindSeg(root, 'diff', v => { state.diff = v; setPref('idioms.diff', v); paint(); });

    const exBtn = root.querySelector('#i-showex');
    exBtn.className = 'chip' + (state.showEx ? ' on' : '');
    exBtn.textContent = state.showEx ? '☑ Excluded shown' : '☐ Show excluded';

    const q = state.q.trim().toLowerCase();
    const list = data
      .filter(e => state.kind === 'all' || (e.kind || 'idiom') === state.kind)
      .filter(e => state.diff === 'all' || e.difficulty === state.diff)
      .filter(e => state.showEx || e.inPractice !== false)
      .filter(e => !q || `${e.text} ${e.meaning}`.toLowerCase().includes(q))
      .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

    root.querySelector('#i-sub').textContent = `${data.length} saved`;
    const pool = data.filter(e => e.inPractice !== false).length;
    const dueNow = buildSession(data, { size: 5 }).dueCount;
    root.querySelector('#i-count').textContent =
      `${list.length} shown · ${pool} in practice · ${dueNow} due today`;

    const rows = root.querySelector('#i-rows');
    rows.innerHTML = list.length ? list.map(rowHTML).join('') : emptyHTML(data.length > 0);
  };

  const reload = async () => { data = await entriesAll(); paint(); };
  function openForm(e){
    const isNew = !e;
    const v = e ?? { text:'', meaning:'', example:'', kind:'idiom', difficulty:'medium', inPractice:true };
    openSheet(`
      <h2>${isNew ? 'New idiom / word' : 'Edit entry'}</h2>
      <label class="field"><span class="lbl">The idiom / word</span>
        <input id="f-text" maxlength="140" value="${esc(v.text)}" placeholder="Break the ice"></label>
      <label class="field"><span class="lbl">Meaning</span>
        <textarea id="f-meaning" placeholder="What does it mean?">${esc(v.meaning)}</textarea></label>
      <label class="field"><span class="lbl">Example sentence (optional)</span>
        <textarea id="f-example" style="min-height:64px" placeholder="He told a joke to break the ice.">${esc(v.example || '')}</textarea></label>
      <div class="lbl" style="margin-top:12px">Type</div><div id="f-kind"></div>
      <div class="lbl" style="margin-top:12px">Difficulty</div><div id="f-diff"></div>
      <div class="switch-row" style="margin-top:14px">
        <div class="grow"><b>Include in daily practice</b><span>Turn off to exclude it from sessions</span></div>
        <button class="switch ${v.inPractice !== false ? 'on' : ''}" id="f-pr" role="switch" aria-checked="${v.inPractice !== false}"></button>
      </div>
      <div class="sh-actions">
        ${isNew ? '' : '<button class="btn danger" id="f-del" aria-label="Delete entry">🗑</button>'}
        <button class="btn primary" id="f-save" style="flex:2">Save</button>
      </div>`);

    let kind = v.kind || 'idiom', diff = v.difficulty || 'medium', inPr = v.inPractice !== false;
    $('#f-kind').innerHTML = segHTML('fk', KINDS.map(k => ({ v:k, l:cap(k) })), kind);
    bindSeg(document, 'fk', x => kind = x);
    $('#f-diff').innerHTML = segHTML('fd', [{v:'easy',l:'Easy'},{v:'medium',l:'Medium'},{v:'hard',l:'Hard'}], diff);
    bindSeg(document, 'fd', x => diff = x);
    $('#f-pr').addEventListener('click', ev => {
      inPr = !inPr;
      ev.currentTarget.classList.toggle('on', inPr);
      ev.currentTarget.setAttribute('aria-checked', inPr);
    });
    $('#f-save').addEventListener('click', async () => {
      const text = $('#f-text').value.trim();
      const meaning = $('#f-meaning').value.trim();
      if (!text || !meaning){ toast('Text and meaning are required'); return; }
      const rec = {
        ...(e || { id: uuid(), createdAt: Date.now(), box: 0, nextDue: Date.now(), timesSeen: 0, timesCorrect: 0 }),
        text, meaning,
        example: $('#f-example').value.trim(),
        kind, difficulty: diff, inPractice: inPr,
        updatedAt: Date.now(),
      };
      await entryPut(rec);
      closeSheet();
      await reload();
      toast(isNew ? 'Saved ✓' : 'Updated ✓');
    });
    const del = $('#f-del');
    if (del) del.addEventListener('click', async () => {
      const original = e;
      await entryDel(e.id);
      closeSheet();
      await reload();
      toast(`Deleted ${esc(e.text)}`, { label:'Undo', action: async () => {
        await entryPut(original);
        await reload();
      }});
    });
  }

  root.addEventListener('click', async e => {
    const exb = e.target.closest('[data-ex]');
    if (exb){
      const item = data.find(x => x.id === exb.dataset.ex);
      if (!item) return;
      item.inPractice = item.inPractice === false;
      await entryPut(item);
      paint();
      return;
    }
    if (e.target.closest('#i-add')){ openForm(null); return; }
    if (e.target.closest('#i-showex')){
      state.showEx = !state.showEx;
      setPref('idioms.showEx', state.showEx);
      paint();
      return;
    }
    const row = e.target.closest('.row');
    if (row){
      const item = data.find(x => x.id === row.dataset.id);
      if (item) openForm(item);
    }
  });

  root.innerHTML = `
    <div class="v-head"><h1>Idioms & Words</h1><span class="sub" id="i-sub"></span></div>
    <div class="search"><span class="mag">⌕</span>
      <input id="i-q" type="search" placeholder="Search text or meaning…" autocomplete="off"></div>
    <div id="i-kindseg"></div>
    <div id="i-diffseg"></div>
    <button id="i-showex" class="chip" style="margin:4px 2px 2px"></button>
    <div class="count-line" id="i-count"></div>
    <div class="rows" id="i-rows"></div>
    <button class="fab" id="i-add" aria-label="Add new entry"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg></button>`;

  let debounce;
  root.querySelector('#i-q').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value; paint(); }, 200);
  });

  await reload();
}