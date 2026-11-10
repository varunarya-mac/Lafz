// Sample content loader — safe to run repeatedly: fixed IDs, no duplicates.
import { bulkPut } from './db.js';
import { SEED_IDIOMS } from './seed-idioms.js';
import { SEED_WORDS } from './seed-words.js';
import { SEED_SHAYARI } from './seed-shayari.js';

export async function loadSample(){
  const now = Date.now();
  const entries = [
    ...SEED_IDIOMS.map((x, i) => ({
      id: 'seed-e-' + (i + 1),
      text: x.t, meaning: x.m, example: x.x || '',
      kind: 'idiom', difficulty: x.d,
      inPractice: !x.np, box: x.b || 0,
      nextDue: now, timesSeen: 0, timesCorrect: 0,
      createdAt: now - (i + 1) * 3600000, updatedAt: now,
    })),
    ...SEED_WORDS.map((x, i) => ({
      id: 'seed-w-' + (i + 1),
      text: x.t, meaning: x.m, example: x.x || '',
      kind: x.k, difficulty: x.d,
      inPractice: !x.np, box: x.b || 0,
      nextDue: now, timesSeen: 0, timesCorrect: 0,
      createdAt: now - (SEED_IDIOMS.length + i + 1) * 3600000, updatedAt: now,
    })),
  ];
  const shayri = SEED_SHAYARI.map((x, i) => ({
    id: 'seed-s-' + (i + 1),
    text: x.t, poet: x.p || null, isFavorite: !!x.f,
    createdAt: now - (i + 1) * 3600000, updatedAt: now,
  }));
  await bulkPut('entries', entries);
  await bulkPut('shayri', shayri);
  return { entries: entries.length, shayari: shayri.length };
}
