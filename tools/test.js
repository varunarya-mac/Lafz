// Unit tests for Lafz pure modules. Run:  node tools/test.js
import { dayKey, addDays, shuffle, esc, uuid, startOfDay } from '../js/util.js';
import { grade, buildSession, streak, mergeById, stats, INTERVALS } from '../js/engine.js';

let pass = 0, fail = 0;
function T(name, cond){
  if (cond) pass++;
  else { fail++; console.error('FAIL: ' + name); }
}

// ---------- dates ----------
const d = new Date(2026, 10, 9);   // Nov 9, 2026
T('dayKey', dayKey(d) === '2026-11-09');
T('addDays +3', dayKey(addDays(d, 3)) === '2026-11-12');
T('addDays month rollover', dayKey(addDays(d, 22)) === '2026-12-01');
T('startOfDay zeroes time', startOfDay(new Date(2026, 10, 9, 15, 42)).getHours() === 0);

// ---------- Leitner grading ----------
const e0 = { id:'1', box:0, timesSeen:0, timesCorrect:0, nextDue:0, difficulty:'easy', inPractice:true, text:'x' };
const g1 = grade(e0, true, new Date(2026, 10, 9, 10));
T('correct: box 1', g1.box === 1);
T('correct: counters', g1.timesSeen === 1 && g1.timesCorrect === 1);
T('correct: due in 2 days (Leitner box 1)', g1.nextDue === new Date(2026, 10, 11).getTime());
const g2 = grade(g1, false, new Date(2026, 10, 9, 10));
T('wrong: box reset', g2.box === 0);
T('wrong: counters', g2.timesSeen === 2 && g2.timesCorrect === 1);
const gTop = grade({ ...e0, box: INTERVALS.length - 1 }, true, new Date(2026, 10, 9));
T('capped at last box', gTop.box === INTERVALS.length - 1);

// ---------- session building ----------
const now = new Date(2026, 10, 9, 12).getTime();
const mk = (id, diff, nextDue, seen, inPr = true, box = 0) =>
  ({ id, difficulty: diff, nextDue, timesSeen: seen, inPractice: inPr, box, text: id });
const pool = [
  mk('a', 'easy', 0, 1),
  mk('b', 'hard', 0, 1),
  mk('c', 'easy', now + 9e7, 0),
  mk('d', 'easy', now + 9e7, 3),
  mk('e', 'easy', 0, 1, false),   // excluded, even though due
  mk('f', 'hard', now + 9e7, 2),
];
const r = buildSession(pool, { size: 10, difficulty: 'all', now });
T('session excludes excluded', !r.session.some(x => x.id === 'e'));
T('due counts', r.dueCount === 2);
T('fresh counts', r.freshCount === 1);
T('pool counts', r.poolCount === 5);
const rh = buildSession(pool, { size: 10, difficulty: 'hard', now });
T('difficulty filter', rh.poolCount === 2 && rh.session.every(x => x.difficulty === 'hard'));
const r1 = buildSession(pool, { size: 1, now });
T('size cap', r1.session.length === 1);
const byId = r.session.map(x => x.id);
T('all session ids from pool', byId.every(id => pool.some(p => p.id === id)));

// ---------- streak ----------
const N9 = dayKey(new Date(2026, 10, 9, 15));
const N8 = dayKey(new Date(2026, 10, 8, 15));
const N7 = dayKey(new Date(2026, 10, 7, 15));
const N6 = dayKey(new Date(2026, 10, 6, 15));
T('streak 3 days', streak([N9, N8, N7], new Date(2026, 10, 9, 15)) === 3);
T('streak broken', streak([N9, N7], new Date(2026, 10, 9, 15)) === 1);
T('streak alive before today', streak([N8, N7, N6], new Date(2026, 10, 9, 3)) === 3);
T('streak dead', streak([N7], new Date(2026, 10, 9, 3)) === 0);
T('streak empty', streak([], new Date()) === 0);

// ---------- mergeById (backup import) ----------
const m = mergeById([{ id:'1', v:1 }, { id:'2', v:2 }], [{ id:'2', v:22 }, { id:'3', v:3 }]);
T('merge counts', m.added === 1 && m.updated === 1);
T('merge incoming wins', m.merged.find(x => x.id === '2').v === 22);
T('merge keeps others', m.merged.find(x => x.id === '1').v === 1);
T('merge size', m.merged.length === 3);

// ---------- esc (built without literal entities in this file) ----------
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const AM = String.fromCharCode(38);
const QU = String.fromCharCode(34);
const AP = String.fromCharCode(39);
const out = esc(LT + 'b' + GT + AM + QU + AP + LT + '/b' + GT);
T('esc removes raw <', !out.includes(LT));
T('esc removes raw >', !out.includes(GT));
const ampOnly = esc(AM);
T('esc ampersand becomes entity', ampOnly === AM + 'amp;');
T('esc all ampersands entity-safe',
  out.split(AM).every((seg, i) => i === 0 ||
    ['amp;', 'lt;', 'gt;', 'quot;', '#39;'].some(x => seg.startsWith(x))));
T('esc removes raw quotes', !out.includes(QU) && !out.includes(AP));
T('esc keeps letters', out.includes('b'));

// ---------- misc ----------
const arr = [1, 2, 3, 4, 5, 6, 7, 8];
T('shuffle keeps all items', shuffle(arr).slice().sort((a, b) => a - b).join() === arr.join());
T('shuffle does not mutate', arr.join() === '1,2,3,4,5,6,7,8');
T('uuid unique', uuid() !== uuid());
T('uuid format', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid()));
T('stats totals', stats(pool).total === 6);

console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? '' : ' — all good!'));
process.exit(fail ? 1 : 0);
