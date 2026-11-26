import { Coord, LevelSpec } from './types';
import { coordKey } from './engine';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a guaranteed-solvable procedural puzzle by constructing a random self-avoiding
 * walk on a 5x5 or 6x5 grid, then selecting strategic order seals along the path.
 */
export function generateProceduralLevel(seedKey: string, title: string, isDaily: boolean, dailyDate?: string): LevelSpec {
  const rng = mulberry32(hashString(seedKey));
  const rows = rng() > 0.45 ? 6 : 5;
  const cols = 5;
  const targetLen = rows === 6 ? 24 : 21;

  let bestPath: Coord[] = [];

  for (let attempt = 0; attempt < 30; attempt++) {
    const startR = Math.floor(rng() * rows);
    const startC = Math.floor(rng() * cols);
    const path: Coord[] = [{ r: startR, c: startC }];
    const visited = new Set<string>([`${startR},${startC}`]);

    while (path.length < targetLen) {
      const head = path[path.length - 1];
      const dirs: Coord[] = [
        { r: head.r - 1, c: head.c },
        { r: head.r + 1, c: head.c },
        { r: head.r, c: head.c - 1 },
        { r: head.r, c: head.c + 1 },
      ].filter(
        (n) => n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && !visited.has(coordKey(n))
      );

      if (dirs.length === 0) break;

      // Prefer cells with more open neighbors early and fewer later to form dense courtyards
      dirs.sort((a, b) => {
        const degA = countOpenNeighbors(a, rows, cols, visited);
        const degB = countOpenNeighbors(b, rows, cols, visited);
        return degA - degB + (rng() - 0.5) * 1.4;
      });

      const pick = dirs[0];
      path.push(pick);
      visited.add(coordKey(pick));
    }

    if (path.length > bestPath.length) {
      bestPath = path;
      if (bestPath.length >= targetLen) break;
    }
  }

  // Place 3 evenly spaced order seals along the verified solution path
  const len = bestPath.length;
  const idx1 = Math.max(2, Math.floor(len * 0.28));
  const idx2 = Math.max(idx1 + 2, Math.floor(len * 0.56));
  const idx3 = Math.max(idx2 + 2, Math.floor(len * 0.8));

  const orders =
    len >= 12
      ? [
          { coord: bestPath[idx1], order: 1 },
          { coord: bestPath[idx2], order: 2 },
          { coord: bestPath[idx3], order: 3 },
        ]
      : undefined;

  return {
    id: isDaily ? 900 : 901 + Math.floor(rng() * 9000),
    chapter: 0,
    title,
    rows,
    cols,
    hasEnd: true,
    solution: bestPath,
    orders,
    isDaily,
    dailyDate,
    tip: isDaily ? `${dailyDate} 每日雅局 · 循序印落莲台` : '随机雅局 · 每次皆为新庭院',
  };
}

function countOpenNeighbors(c: Coord, rows: number, cols: number, visited: Set<string>): number {
  let count = 0;
  const dirs = [
    [c.r - 1, c.c],
    [c.r + 1, c.c],
    [c.r, c.c - 1],
    [c.r, c.c + 1],
  ];
  for (const [nr, nc] of dirs) {
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
      count++;
    }
  }
  return count;
}

export function getTodayDailyLevel(): LevelSpec {
  const dateStr = getTodayDateString();
  return generateProceduralLevel(`inkpath-daily-${dateStr}`, '每日雅局', true, dateStr);
}
