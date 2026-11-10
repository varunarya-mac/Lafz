// Settings: theme, daily goal, JSON export/import backup, danger zone.
import { segHTML, bindSeg, applyTheme, openSheet, closeSheet, toast } from '../ui.js';
import { entriesAll, shayriAll, logsAll, bulkPut, mergeLogs, clearStores, getPref, setPref } from '../db.js';
import { relTime, dayKey } from '../util.js';
import { mergeById } from '../engine.js';
import { loadSample } from '../seed.js';

export async function mount(root){
  const download = (name, text) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };

  const paint = async () => {
    const [entries, shayri] = await Promise.all([entriesAll(), shayriAll()]);
    const lastB = getPref('lastBackup', 0);
    const days = lastB ? Math.floor((Date.now() - lastB) / 86400000) : -1;

    root.innerHTML = `
      <div class="v-head"><h1>Settings</h1><span class="sub">v1.0</span></div>

      <div class="set-group">Appearance</div>
      <div class="set-card"><div style="padding:12px 14px 14px" id="st-theme"></div></div>

      <div class="set-group">Daily practice</div>
      <div class="set-card"><div style="padding:12px 14px 14px" id="st-goal"></div></div>

      <div class="set-group">Your data — stored only on this device</div>
      <div class="set-card">
        <div class="set-row"><div class="grow"><b>Library</b><span id="st-count"></span></div></div>
        <div class="set-row"><div class="grow"><b>Last backup</b><span id="st-lastb"></span></div>
          <span class="backup-pill ${lastB && days <= 30 ? 'ok' : 'warn'}" id="st-pill"></span></div>
        <div class="set-row" style="gap:10px">
          <button class="btn primary sm" id="st-export" style="flex:1">⬇︎ Export JSON</button>
          <label class="btn sm" style="flex:1;cursor:pointer">⬆︎ Import JSON
            <input id="st-import" type="file" accept="application/json,.json" hidden></label>
        </div>
        <div class="set-row"><button class="btn sm" id="st-sample" style="flex:1">Load sample pack</button></div>
      </div>

      <div class="set-group">Danger zone</div>
      <div class="set-card" style="padding:12px 14px">
        <button class="btn danger sm" id="st-erase" style="width:100%">Erase all data</button>
      </div>

      <p class="about">
        <b>Lafz</b> is your personal idioms-practice and shayari notebook. It keeps
        everything in this device's local storage — no server, no account, no sync, no tracking.<br><br>
        For the real app feel, open Lafz in Safari and use <b>Share → Add to Home Screen</b>.
        Export a JSON backup regularly (and before erasing anything) — that file is the only copy
        of your library outside this device.<br><br>
        💚 v1.0 — made just for you.
      </p>`;
    root.querySelector('#st-count').textContent =
      `${entries.length} entries · ${shayri.length} shayari`;
    root.querySelector('#st-lastb').textContent = lastB ? relTime(lastB) : 'never';
    root.querySelector('#st-pill').textContent =
      lastB ? (days <= 30 ? 'healthy' : `${days} days ago`) : 'no backup yet';

    root.querySelector('#st-theme').innerHTML = segHTML('theme',
      [{v:'auto',l:'Auto (system)'},{v:'light',l:'Light'},{v:'dark',l:'Dark'}], getPref('theme', 'auto'));
    bindSeg(root, 'theme', v => { setPref('theme', v); applyTheme(); });

    root.querySelector('#st-goal').innerHTML = segHTML('goal',
      [5,10,15,20,25].map(n => ({ v:String(n), l:String(n) })), String(getPref('dailyGoal', 10)));
    bindSeg(root, 'goal', v => { setPref('dailyGoal', Number(v)); toast(`Daily goal: ${v} cards`); });

    root.querySelector('#st-export').addEventListener('click', async () => {
      const [es, ss, logs] = await Promise.all([entriesAll(), shayriAll(), logsAll()]);
      const payload = {
        app: 'lafz', version: 1, exportedAt: new Date().toISOString(),
        entries: es, shayari: ss, daylogs: logs,
      };
      download(`lafz-backup-${dayKey(new Date())}.json`, JSON.stringify(payload, null, 2));
      setPref('lastBackup', Date.now());
      toast('Backup exported ✓ — check Downloads / Files');
      paint();
    });

    root.querySelector('#st-import').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || !Array.isArray(data.entries) || !Array.isArray(data.shayari)) throw new Error('bad');
        const [curE, curS] = await Promise.all([entriesAll(), shayriAll()]);
        const me = mergeById(curE, data.entries);
        const ms = mergeById(curS, data.shayari);
        await bulkPut('entries', me.merged);
        await bulkPut('shayri', ms.merged);
        if (Array.isArray(data.daylogs)) await mergeLogs(data.daylogs);
        toast(`Imported ${me.added + ms.added} new · updated ${me.updated + ms.updated} ✓`);
      } catch {
        toast('Not a valid Lafz backup file');
      }
      paint();
    });

    root.querySelector('#st-sample').addEventListener('click', async () => {
      await loadSample();
      toast('Sample pack loaded ✓');
      paint();
    });

    root.querySelector('#st-erase').addEventListener('click', () => {
      openSheet(`
        <h2>Erase everything?</h2>
        <p style="color:var(--text-2);font-size:14.5px;margin-top:6px">
          All idioms, shayari and practice history will be permanently deleted from this device.
          Export a backup first if you're not sure.</p>
        <div class="sh-actions">
          <button class="btn" id="st-no">Keep data</button>
          <button class="btn danger" id="st-yes">Erase</button>
        </div>`);
      document.querySelector('#st-no').addEventListener('click', closeSheet);
      document.querySelector('#st-yes').addEventListener('click', async () => {
        await clearStores();
        closeSheet();
        toast('All data erased');
        paint();
      });
    });
  };

  await paint();
}