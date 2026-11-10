// Daily practice: flashcards with Leitner spaced repetition + streak.
import { segHTML, bindSeg, toast, confetti } from '../ui.js';
import { $ } from '../ui.js';
import { entriesAll, logsAll, entryPut, logDay, getPref, setPref } from '../db.js';
import { esc, dayKey, DIFF_LABEL, DIFF_CLASS } from '../util.js';
import { buildSession, grade, streak } from '../engine.js';

export async function mount(root){
  let diff = getPref('practice.diff', 'all');

  const sessionView = (list) => {
    const items = list.slice();
    let idx = 0, correct = 0, flipped = false;

    root.innerHTML = `
      <div class="v-head"><h1>Session</h1><span class="sub" id="s-prog">1 / ${items.length}</span></div>
      <div class="stage">
        <div class="flipzone" id="s-flip"></div>
        <div class="grade" id="s-grade" style="opacity:0;pointer-events:none"></div>
      </div>`;

    const flipZone = root.querySelector('#s-flip');
    const gradeBar = root.querySelector('#s-grade');

    const cardHTML = (e, cls) => `
      <div class="fcard ${cls}" id="s-card" role="button" tabindex="0" aria-label="Flip card to see the meaning">
        <div class="face">
          <h3 class="word">${esc(e.text)}</h3>
          <span class="tap-hint">tap to reveal meaning</span>
        </div>
        <div class="face back">
          <p class="meaning">${esc(e.meaning)}</p>
          ${e.example ? `<p class="example">${esc(e.example)}</p>` : ''}
          <div class="tags">
            <span class="pill ${DIFF_CLASS[e.difficulty] || 'm'}">${DIFF_LABEL[e.difficulty] || ''}</span>
            <span class="pill mute">box ${Math.min((e.box || 0) + 1, 6)} / 6</span>
          </div>
        </div>
      </div>`;

    const hideGrade = () => {
      gradeBar.innerHTML = '';
      gradeBar.className = 'grade';
      gradeBar.style.opacity = '0';
      gradeBar.style.pointerEvents = 'none';
    };

    const renderCard = () => {
      const e = items[idx];
      flipZone.innerHTML = cardHTML(e, 'card-in');
      flipped = false;
      hideGrade();
      const card = flipZone.querySelector('#s-card');
      const reveal = () => {
        if (flipped) return;
        flipped = true;
        card.classList.add('flipped');
        showGrade(e);
      };
      card.addEventListener('click', reveal);
      card.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); reveal(); }
      });
    };

    const showGrade = (e) => {
      gradeBar.className = 'grade grade-enter';
      gradeBar.style.opacity = '';
      gradeBar.style.pointerEvents = '';
      gradeBar.innerHTML = `
        <button class="btn wrong" id="g-no">✕ Need practice</button>
        <button class="btn right" id="g-yes">✓ Got it</button>
        <button class="btn" id="g-skip" aria-label="Skip without grading">↷</button>`;
      gradeBar.querySelector('#g-yes').addEventListener('click', () => answer(e, true));
      gradeBar.querySelector('#g-no').addEventListener('click', () => answer(e, false));
      gradeBar.querySelector('#g-skip').addEventListener('click', () => animOut(true));
    };

    const answer = async (e, ok) => {
      if (gradeBar.style.pointerEvents === 'none') return;
      gradeBar.style.pointerEvents = 'none';
      const updated = grade(e, ok);
      items[idx] = updated;
      if (ok) correct++;
      await Promise.all([entryPut(updated), logDay(new Date(), 1, ok ? 1 : 0)]);
      const card = flipZone.querySelector('#s-card');
      if (!ok && card){
        card.classList.add('card-shake');
        setTimeout(() => animOut(false), 480);
      } else {
        setTimeout(() => animOut(true), 140);
      }
    };

    const animOut = (toRight) => {
      if (!root.isConnected) return;
      const card = flipZone.querySelector('#s-card');
      if (card) card.classList.add(toRight ? 'card-out-right' : 'card-out-left');
      setTimeout(() => {
        if (!root.isConnected) return;
        idx++;
        if (idx >= items.length){ finish(); return; }
        root.querySelector('#s-prog').textContent = `${idx + 1} / ${items.length}`;
        renderCard();
      }, 440);
    };

    const finish = async () => {
      const logs = await logsAll();
      const s2 = streak(logs.map(l => l.day));
      const perfect = correct === items.length && items.length > 0;
      root.innerHTML = `
        <div class="stage">
          <div class="done">
            <span class="emoji">${perfect ? '🏆' : '🎉'}</span>
            <h2>${perfect ? 'Perfect session!' : 'Session complete!'}</h2>
            <div class="stats">
              <div><b>${items.length}</b><span>reviewed</span></div>
              <div><b>${correct}</b><span>correct</span></div>
              <div><b>${s2}</b><span>streak</span></div>
            </div>
            <button class="btn primary" id="d-again">Practice more</button>
            <button class="btn" id="d-home">Back to overview</button>
          </div>
        </div>`;
      root.querySelector('#d-home').addEventListener('click', () => home());
      root.querySelector('#d-again').addEventListener('click', async () => {
        const goal = getPref('dailyGoal', 10);
        const all = await entriesAll();
        const built = buildSession(all, { size: goal, difficulty: diff });
        if (built.session.length) sessionView(built.session);
        else { toast('Nothing left to practice today ✨'); home(); }
      });
      confetti();
    };

    renderCard();
  };

  const home = async () => {
    const goal = getPref('dailyGoal', 10);
    const [all, logs] = await Promise.all([entriesAll(), logsAll()]);
    const s = streak(logs.map(l => l.day));
    const todayLog = logs.find(l => l.day === dayKey(new Date())) || { reviewed: 0, correct: 0 };
    const built = buildSession(all, { size: goal, difficulty: diff });

    root.innerHTML = `
      <div class="v-head"><h1>Practice</h1><span class="sub">goal: ${goal} cards / day</span></div>
      <div class="p-hero">
        <div class="streak">
          <span class="flame" id="p-flame">${s > 0 ? '🔥' : '💤'}</span>
          <div><b id="p-streak">${s}</b><span class="lbl">day streak</span></div>
        </div>
        <div class="ring-wrap" title="Reviewed today / daily goal">
          <svg viewBox="0 0 74 74" aria-hidden="true">
            <circle class="ring-bg" cx="37" cy="37" r="31"></circle>
            <circle class="ring-fg" id="p-ring" cx="37" cy="37" r="31"></circle>
          </svg>
          <span class="ring-txt" id="p-ringtxt"></span>
        </div>
      </div>
      <div class="p-meta">
        <div class="stat"><div class="n">${built.dueCount}</div><div class="l">due now</div></div>
        <div class="stat"><div class="n">${built.freshCount}</div><div class="l">new</div></div>
        <div class="stat"><div class="n">${built.poolCount}</div><div class="l">in pool</div></div>
      </div>
      <div class="set-group" style="margin-top:14px">Practice set (difficulty)</div>
      <div id="p-diff"></div>
      <div id="p-lower"></div>`;

    const C = 2 * Math.PI * 31;
    const ring = root.querySelector('#p-ring');
    ring.style.strokeDasharray = String(C);
    root.querySelector('#p-ringtxt').innerHTML =
      `${Math.min(todayLog.reviewed, goal)}<span style="font-size:10px;color:var(--text-3)">/${goal}</span>`;
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = String(C * (1 - Math.min(todayLog.reviewed / goal, 1)));
    });

    root.querySelector('#p-diff').innerHTML = segHTML('pd',
      [{v:'all',l:'All'},{v:'easy',l:'Easy'},{v:'medium',l:'Medium'},{v:'hard',l:'Hard'}], diff);
    bindSeg(root, 'pd', v => { diff = v; setPref('practice.diff', v); home(); });

    const lower = root.querySelector('#p-lower');
    if (built.poolCount === 0){
      lower.innerHTML = `
        <div class="empty">
          <span class="art">🎯</span>
          <h3>No cards to practice yet</h3>
          <p>Save idioms or words in the Idioms tab first, keeping “Include in practice” turned on.</p>
          <button class="btn primary" id="p-goto" style="margin-top:16px">Go to Idioms</button>
        </div>`;
      root.querySelector('#p-goto').addEventListener('click', () => { location.hash = '#idioms'; });
      return;
    }
    const caughtUp = built.dueCount === 0 && built.freshCount === 0;
    lower.innerHTML = `
      ${caughtUp ? '<div class="count-line" style="text-align:center;padding-top:14px">✨ All caught up — nothing is due today. Practice extra if you feel like it.</div>' : ''}
      <button class="btn primary block" id="p-start" style="min-height:56px;font-size:17px;margin-top:12px">
        ▶ Start session · ${built.session.length} card${built.session.length === 1 ? '' : 's'}</button>
      <div class="count-line" style="text-align:center">Cards you grade “Got it” come back in 2, 4, 8, 16, 32 days.</div>`;
    root.querySelector('#p-start').addEventListener('click', () => sessionView(built.session, s));
  };

  await home();
}