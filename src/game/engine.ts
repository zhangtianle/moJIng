import { Coord, HintOverlay, LevelBoard, LevelSpec, PortalId, TileData } from './types';

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.r === b.r && a.c === b.c;
}

export function coordKey(c: Coord): string {
  return `${c.r},${c.c}`;
}

export function isOrthogonalAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function buildLevelBoard(spec: LevelSpec): LevelBoard {
  const visitedInSolution = new Set<string>(spec.solution.map(coordKey));
  const orderMap = new Map<string, number>();
  let maxOrder = 0;
  for (const o of spec.orders ?? []) {
    orderMap.set(coordKey(o.coord), o.order);
    if (o.order > maxOrder) maxOrder = o.order;
  }

  const bridgeSet = new Set<string>((spec.bridges ?? []).map(coordKey));
  const portalMap = new Map<string, PortalId>();
  const portalPairs: Record<PortalId, [Coord, Coord] | undefined> = {
    A: undefined,
    B: undefined,
  };
  for (const p of spec.portals ?? []) {
    portalMap.set(coordKey(p.a), p.id);
    portalMap.set(coordKey(p.b), p.id);
    portalPairs[p.id] = [p.a, p.b];
  }

  const start = spec.solution[0];
  const end = spec.hasEnd ? spec.solution[spec.solution.length - 1] : null;
  const startKey = coordKey(start);
  const endKey = end ? coordKey(end) : '';

  const grid: TileData[][] = [];
  let nonWallCount = 0;
  let bridgeCount = 0;

  for (let r = 0; r < spec.rows; r++) {
    const row: TileData[] = [];
    for (let c = 0; c < spec.cols; c++) {
      const key = `${r},${c}`;
      if (!visitedInSolution.has(key)) {
        row.push({ r, c, kind: 'wall' });
        continue;
      }
      nonWallCount++;
      if (key === startKey) {
        row.push({ r, c, kind: 'start' });
      } else if (end && key === endKey) {
        row.push({ r, c, kind: 'end' });
      } else if (bridgeSet.has(key)) {
        bridgeCount++;
        row.push({ r, c, kind: 'bridge' });
      } else if (portalMap.has(key)) {
        row.push({ r, c, kind: 'portal', portalId: portalMap.get(key) });
      } else if (orderMap.has(key)) {
        row.push({ r, c, kind: 'order', order: orderMap.get(key) });
      } else {
        row.push({ r, c, kind: 'empty' });
      }
    }
    grid.push(row);
  }

  return {
    spec,
    grid,
    start,
    end,
    totalSteps: nonWallCount + bridgeCount,
    portalPairs,
    maxOrder,
    hasBridge: bridgeCount > 0,
    hasPortal: (spec.portals?.length ?? 0) > 0,
    hasOrder: maxOrder > 0,
  };
}

export function getPortalTwin(board: LevelBoard, coord: Coord): Coord | null {
  const tile = board.grid[coord.r]?.[coord.c];
  if (!tile || tile.kind !== 'portal' || !tile.portalId) return null;
  const pair = board.portalPairs[tile.portalId];
  if (!pair) return null;
  return sameCoord(pair[0], coord) ? pair[1] : pair[0];
}

export interface BridgeAxisUsage {
  horizontal: boolean;
  vertical: boolean;
}

export function getBridgeUsage(path: Coord[], coord: Coord): BridgeAxisUsage {
  let horizontal = false;
  let vertical = false;
  for (let i = 1; i < path.length; i++) {
    if (sameCoord(path[i], coord)) {
      const prev = path[i - 1];
      if (prev.r === coord.r) horizontal = true;
      else vertical = true;
    }
  }
  return { horizontal, vertical };
}

export function getVisitCount(path: Coord[], coord: Coord): number {
  let count = 0;
  for (let i = 0; i < path.length; i++) {
    if (sameCoord(path[i], coord)) count++;
  }
  return count;
}

export function getHighestOrderVisited(board: LevelBoard, path: Coord[]): number {
  let highest = 0;
  for (const c of path) {
    const t = board.grid[c.r]?.[c.c];
    if (t?.kind === 'order' && t.order && t.order > highest) {
      highest = t.order;
    }
  }
  return highest;
}

export interface MoveCheckResult {
  valid: boolean;
  reason?: string;
  portalExit?: Coord;
}

export function canStepTo(board: LevelBoard, path: Coord[], target: Coord): MoveCheckResult {
  if (target.r < 0 || target.r >= board.spec.rows || target.c < 0 || target.c >= board.spec.cols) {
    return { valid: false };
  }
  if (path.length === 0) return { valid: false };

  const head = path[path.length - 1];
  if (sameCoord(head, target)) return { valid: false };
  if (!isOrthogonalAdjacent(head, target)) return { valid: false };

  const headTile = board.grid[head.r][head.c];
  const targetTile = board.grid[target.r][target.c];

  if (targetTile.kind === 'wall') {
    return { valid: false };
  }

  // If currently standing on a bridge, MUST continue straight across along entry axis
  if (headTile.kind === 'bridge' && path.length >= 2) {
    const prev = path[path.length - 2];
    const expectedR = head.r + (head.r - prev.r);
    const expectedC = head.c + (head.c - prev.c);
    if (target.r !== expectedR || target.c !== expectedC) {
      return { valid: false, reason: '飞桥须直行通过，不可在桥面转弯' };
    }
  }

  // Bridge target: check axis not yet used, and straight exit exists and is not wall
  if (targetTile.kind === 'bridge') {
    const usage = getBridgeUsage(path, target);
    const axisIsHorizontal = head.r === target.r;
    if (axisIsHorizontal && usage.horizontal) {
      return { valid: false, reason: '此桥横向已渡过' };
    }
    if (!axisIsHorizontal && usage.vertical) {
      return { valid: false, reason: '此桥纵向已渡过' };
    }
    const exitR = target.r + (target.r - head.r);
    const exitC = target.c + (target.c - head.c);
    const exitTile = board.grid[exitR]?.[exitC];
    if (!exitTile || exitTile.kind === 'wall') {
      return { valid: false };
    }
    return { valid: true };
  }

  // Non-bridge tiles can only be visited once
  if (getVisitCount(path, target) > 0) {
    return { valid: false };
  }

  // Order seal check
  if (targetTile.kind === 'order' && targetTile.order) {
    const highest = getHighestOrderVisited(board, path);
    if (targetTile.order !== highest + 1) {
      return { valid: false, reason: `请先连至第 ${highest + 1} 号序印` };
    }
  }

  // End tile check: must be the final step
  if (targetTile.kind === 'end') {
    if (path.length + 1 !== board.totalSteps) {
      return { valid: false, reason: '须先连遍所有石阶，最后落于莲台' };
    }
  }

  // Portal check: both entry & twin must be unvisited, and stepping in teleports to twin
  if (targetTile.kind === 'portal') {
    const twin = getPortalTwin(board, target);
    if (!twin || getVisitCount(path, twin) > 0) {
      return { valid: false };
    }
    return { valid: true, portalExit: twin };
  }

  return { valid: true };
}

export function getValidNextMoves(board: LevelBoard, path: Coord[]): Coord[] {
  if (path.length === 0 || path.length >= board.totalSteps) return [];
  const head = path[path.length - 1];
  const dirs: Coord[] = [
    { r: head.r - 1, c: head.c },
    { r: head.r + 1, c: head.c },
    { r: head.r, c: head.c - 1 },
    { r: head.r, c: head.c + 1 },
  ];
  return dirs.filter((d) => canStepTo(board, path, d).valid);
}

export function applyStep(board: LevelBoard, path: Coord[], target: Coord): {
  nextPath: Coord[] | null;
  event?: 'step' | 'bridge' | 'portal' | 'order' | 'blocked';
  reason?: string;
  orderNum?: number;
} {
  const check = canStepTo(board, path, target);
  if (!check.valid) {
    return { nextPath: null, event: 'blocked', reason: check.reason };
  }
  const targetTile = board.grid[target.r][target.c];
  if (check.portalExit) {
    return {
      nextPath: [...path, target, check.portalExit],
      event: 'portal',
    };
  }
  if (targetTile.kind === 'bridge') {
    return { nextPath: [...path, target], event: 'bridge' };
  }
  if (targetTile.kind === 'order') {
    return { nextPath: [...path, target], event: 'order', orderNum: targetTile.order };
  }
  return { nextPath: [...path, target], event: 'step' };
}

export function applyUndo(board: LevelBoard, path: Coord[]): Coord[] {
  if (path.length <= 1) return path;
  const head = path[path.length - 1];
  const prev = path[path.length - 2];
  const headTile = board.grid[head.r][head.c];
  const prevTile = board.grid[prev.r][prev.c];

  // If head and prev are paired portals, pop both atomically
  if (
    headTile.kind === 'portal' &&
    prevTile.kind === 'portal' &&
    headTile.portalId &&
    headTile.portalId === prevTile.portalId
  ) {
    return path.slice(0, -2);
  }
  return path.slice(0, -1);
}

/**
 * Trim path back to a specific tapped coordinate index, ensuring we don't split a portal pair.
 */
export function trimPathToIndex(board: LevelBoard, path: Coord[], index: number): Coord[] {
  if (index < 0 || index >= path.length - 1) return path;
  const sliced = path.slice(0, index + 1);
  // If we stopped on the entry portal without its exit, step back one more
  const last = sliced[sliced.length - 1];
  const lastTile = board.grid[last.r][last.c];
  if (lastTile.kind === 'portal') {
    const prev = sliced[sliced.length - 2];
    const prevTile = prev ? board.grid[prev.r][prev.c] : null;
    if (!prevTile || prevTile.kind !== 'portal' || prevTile.portalId !== lastTile.portalId) {
      return sliced.slice(0, -1);
    }
  }
  return sliced;
}

export function isLevelComplete(board: LevelBoard, path: Coord[]): boolean {
  return path.length === board.totalSteps;
}

/**
 * Fast bounded DFS solver from a partial path to find a valid completion if the player diverged
 * from the canonical solution.
 */
function solveFromPartial(board: LevelBoard, partial: Coord[], maxNodes = 2500): Coord[] | null {
  let visitedNodes = 0;

  function dfs(curr: Coord[]): Coord[] | null {
    if (curr.length === board.totalSteps) return curr;
    visitedNodes++;
    if (visitedNodes > maxNodes) return null;

    const moves = getValidNextMoves(board, curr);
    if (moves.length === 0) return null;

    // Order moves by Warnsdorff heuristic (fewest onward exits first) to solve in <2ms
    const scored = moves.map((m) => {
      const res = applyStep(board, curr, m);
      const onward = res.nextPath ? getValidNextMoves(board, res.nextPath).length : 99;
      return { nextPath: res.nextPath!, onward };
    });
    scored.sort((a, b) => a.onward - b.onward);

    for (const item of scored) {
      const solved = dfs(item.nextPath);
      if (solved) return solved;
    }
    return null;
  }

  return dfs(partial);
}

/**
 * Multi-tier hint generator:
 * - Checks if current path matches canonical solution prefix OR is solvable via fast DFS.
 * - If dead-end, finds the deepest prefix that matches canonical solution and advises backtracking.
 * - Tier 1: next 3 steps, Tier 2: next 6 steps, Tier 3: full blueprint.
 */
export function computeHint(board: LevelBoard, path: Coord[], tier: 1 | 2 | 3): HintOverlay {
  const canonical = board.spec.solution;

  // Check if path is a prefix of canonical
  let prefixMatchLen = 0;
  while (
    prefixMatchLen < path.length &&
    prefixMatchLen < canonical.length &&
    sameCoord(path[prefixMatchLen], canonical[prefixMatchLen])
  ) {
    prefixMatchLen++;
  }

  let guideSolution: Coord[] | null = null;
  let startIndex = path.length - 1;
  let backtrackToIndex: number | null = null;

  if (prefixMatchLen === path.length) {
    guideSolution = canonical;
    startIndex = path.length - 1;
  } else {
    // Try solving from the player's current divergent path
    const customSolved = solveFromPartial(board, path, 2200);
    if (customSolved) {
      guideSolution = customSolved;
      startIndex = path.length - 1;
    } else {
      // Player is in a dead-end! Guide from last safe divergence point on canonical path
      guideSolution = canonical;
      startIndex = Math.max(0, prefixMatchLen - 1);
      backtrackToIndex = startIndex;
    }
  }

  const stepsToShow = tier === 1 ? 3 : tier === 2 ? 6 : guideSolution.length;
  const hintSlice = guideSolution.slice(startIndex, Math.min(guideSolution.length, startIndex + stepsToShow + 1));

  let message = '';
  if (backtrackToIndex !== null) {
    message = `当前支路难以通达，可先回退至第 ${backtrackToIndex + 1} 步再沿金线前行`;
  } else if (tier === 1) {
    message = '锦囊（一阶）：已标出前方 3 步金径';
  } else if (tier === 2) {
    message = '锦囊（二阶）：已标出前方 6 步金径';
  } else {
    message = '锦囊（三阶）：已展开完整通幽脉络';
  }

  return {
    tier,
    path: hintSlice,
    backtrackToIndex,
    message,
  };
}

/**
 * Validates that a LevelSpec's solution strictly obeys all game rules.
 */
export function validateLevelSpec(spec: LevelSpec): string | null {
  if (spec.solution.length < 2) return `Level ${spec.id}: solution too short`;
  const board = buildLevelBoard(spec);
  let curr: Coord[] = [spec.solution[0]];
  let i = 1;
  while (i < spec.solution.length) {
    const target = spec.solution[i];
    const res = applyStep(board, curr, target);
    if (!res.nextPath) {
      return `Level ${spec.id} (${spec.title}): invalid step #${i} to (${target.r},${target.c}) — ${res.reason ?? 'blocked'}`;
    }
    if (res.event === 'portal') {
      // Portal consumes two solution entries: entry and exit
      const expectedExit = spec.solution[i + 1];
      const actualExit = res.nextPath[res.nextPath.length - 1];
      if (!expectedExit || !sameCoord(expectedExit, actualExit)) {
        return `Level ${spec.id}: portal exit mismatch at step #${i}`;
      }
      curr = res.nextPath;
      i += 2;
    } else {
      curr = res.nextPath;
      i += 1;
    }
  }
  if (!isLevelComplete(board, curr)) {
    return `Level ${spec.id}: solution length ${curr.length} !== totalSteps ${board.totalSteps}`;
  }
  return null;
}
