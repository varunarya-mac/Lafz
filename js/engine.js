// Practice engine — pure logic (Leitner spaced repetition), testable in Node.
import { startOfDay, shuffle, dayKey } from './util.js';

export const INTERVALS = [1, 2, 4, 8, 16, 32];   // days per Leitner box
const DAY = 86400000;

/** Grade one item. Returns the updated entry object. */
export function grade(entry, correct, now = new Date()){
  const box = correct ? Math.min((entry.box ?? 0) + 1, INTERVALS.length - 1) : 0;
  const nextDue = startOfDay(now).getTime() + INTERVALS[box] * DAY;
  return {
    ...entry,
    box,
    nextDue,
    timesSeen:   (entry.timesSeen  ?? 0) + 1,
    timesCorrect:(entry.timesCorrect?? 0) + (correct ? 1 : 0),
  };
}

/**
 * Build today's session.
 * Priority: overdue items first (oldest due first), then never-seen items,
 * then the rest (lowest mastery first) — capped at `size`.
 * Respects inPractice flag and the difficulty filter.
 */
export function buildSession(entries, { size = 10, difficulty = 'all', now = Date.now() } = {}){
  const pool = entries
    .filter(e => e.inPractice !== false)
    .filter(e => difficulty === 'all' || e.difficulty === difficulty);
  const due   = pool.filter(e => (e.nextDue ?? 0) <= now)
                   .sort((a,b) => (a.nextDue ?? 0) - (b.nextDue ?? 0));
  const fresh = shuffle(pool.filter(e => !e.timesSeen));
  const rest  = shuffle(pool.filter(e => e.timesSeen && (e.nextDue ?? 0) > now))
                   .sort((a,b) => (a.box ?? 0) - (b.box ?? 0));
  const session = [...due, ...fresh, ...rest].slice(0, Math.max(1, size));
  return { session, dueCount: due.length, freshCount: fresh.length, poolCount: pool.length };
}

/** Streak = consecutive days (ending today or yesterday) that have a log entry. */
export function streak(dayKeys, now = new Date()){
  const set = new Set(dayKeys);
  const today = dayKey(now);
  const yest   = dayKey(new Date(now.getTime() - DAY));
  let cursor = set.has(today) ? today : yest;
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)){
    n++;
    cursor = dayKey(new Date(new Date(cursor + 'T00:00:00').getTime() - DAY));
  }
  return n;
}

/** Merge imported records into current ones by id. Incoming wins on conflicts. */
export function mergeById(current, incoming){
  const map = new Map(current.map(x => [x.id, x]));
  let added = 0, updated = 0;
  for (const item of incoming){
    if (!item?.id) continue;
    if (map.has(item.id)) updated++; else added++;
    map.set(item.id, item);
  }
  return { merged: [...map.values()], added, updated };
}

/** Simple per-difficulty mastery stats (box >= 3 counts as "learned"). */
export function stats(entries){
  const mk = list => ({
    n: list.length,
    learned: list.filter(e => (e.box ?? 0) >= 3).length,
  });
  return {
    easy:   mk(entries.filter(e => e.difficulty === 'easy')),
    medium: mk(entries.filter(e => e.difficulty === 'medium')),
    hard:   mk(entries.filter(e => e.difficulty === 'hard')),
    total:  entries.length,
  };
}
