import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coord, HintOverlay, LevelBoard } from '../game/types';
import {
  canStepTo,
  coordKey,
  getBridgeUsage,
  getValidNextMoves,
  getVisitCount,
  isOrthogonalAdjacent,
  sameCoord,
} from '../game/engine';
import { BridgePlankGlyph, LotusEndGlyph, PortalGateGlyph, RockGlyph } from './TileIcons';
import { InkParticleHandle, InkParticleLayer, SplashTint } from './InkParticleLayer';

interface RippleEffect {
  id: number;
  r: number;
  c: number;
  color: string;
}

interface PuzzleBoardProps {
  board: LevelBoard;
  path: Coord[];
  hint: HintOverlay | null;
  isComplete: boolean;
  shakeTrigger: number;
  onStepTo: (target: Coord) => boolean;
  onUndo: () => void;
  onTrimToIndex: (index: number) => void;
}

export function PuzzleBoard({
  board,
  path,
  hint,
  isComplete,
  shakeTrigger,
  onStepTo,
  onUndo,
  onTrimToIndex,
}: PuzzleBoardProps) {
  const { rows, cols } = board.spec;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const particleRef = useRef<InkParticleHandle | null>(null);
  const draggingRef = useRef(false);
  const lastPointerCellRef = useRef<string | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const prevPathRef = useRef<Coord[]>(path);
  const prevBoardRef = useRef<LevelBoard>(board);
  const prevCompleteRef = useRef<boolean>(isComplete);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const rippleIdRef = useRef(1);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 360, h: 360 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gap = rows >= 6 || cols >= 6 ? 6 : 8;
  const framePad = stageSize.w < 420 ? 10 : 14;
  const maxCellW = (stageSize.w - framePad * 2 - gap * (cols - 1)) / cols;
  const maxCellH = (stageSize.h - framePad * 2 - gap * (rows - 1)) / rows;
  const cellSize = Math.max(44, Math.min(86, Math.floor(Math.min(maxCellW, maxCellH))));
  const gridWidth = cols * cellSize + (cols - 1) * gap;
  const gridHeight = rows * cellSize + (rows - 1) * gap;

  const head = path[path.length - 1];
  const validMoves = useMemo(() => getValidNextMoves(board, path), [board, path]);
  const validMoveSet = useMemo(() => new Set(validMoves.map(coordKey)), [validMoves]);

  const spawnRipple = useCallback((r: number, c: number, color = '#e9c46a') => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev.slice(-5), { id, r, c, color }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== id));
    }, 500);
  }, []);

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): Coord | null => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const stride = cellSize + gap;
      const c = Math.min(cols - 1, Math.max(0, Math.floor(relX / stride)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(relY / stride)));
      return { r, c };
    },
    [cellSize, cols, gap, rows]
  );

  const tryInteractCell = useCallback(
    (cell: Coord, isDragMove: boolean) => {
      if (isComplete) return;
      const currHead = path[path.length - 1];
      if (!currHead || sameCoord(currHead, cell)) return;

      // 1. Backtrack if dragging/tapping previous tile (including atomic portal undo)
      if (path.length >= 2) {
        const prev = path[path.length - 2];
        const headTile = board.grid[currHead.r][currHead.c];
        const prevTile = board.grid[prev.r][prev.c];
        const isPortalBack =
          headTile.kind === 'portal' &&
          prevTile.kind === 'portal' &&
          headTile.portalId === prevTile.portalId &&
          path.length >= 3 &&
          sameCoord(path[path.length - 3], cell);

        if (sameCoord(prev, cell) || isPortalBack) {
          onUndo();
          return;
        }
      }

      // 2. Direct orthogonal step
      if (isOrthogonalAdjacent(currHead, cell)) {
        const ok = onStepTo(cell);
        if (ok) {
          const tile = board.grid[cell.r][cell.c];
          if (tile.kind === 'portal') {
            spawnRipple(cell.r, cell.c, '#5cc8d7');
          } else if (tile.kind === 'order' || tile.kind === 'end' || tile.kind === 'bridge') {
            spawnRipple(cell.r, cell.c, '#f1cf7a');
          }
        }
        return;
      }

      // 3. Diagonal corner smoothing during fast thumb drag
      if (
        isDragMove &&
        Math.abs(currHead.r - cell.r) === 1 &&
        Math.abs(currHead.c - cell.c) === 1
      ) {
        const candidates: Coord[] = [
          { r: currHead.r, c: cell.c },
          { r: cell.r, c: currHead.c },
        ].filter((mid) => canStepTo(board, path, mid).valid);

        if (candidates.length === 1) {
          const mid = candidates[0];
          const ok = onStepTo(mid);
          if (ok) {
            spawnRipple(mid.r, mid.c, '#e9c46a');
          }
        }
        return;
      }

      // 4. Tap earlier visited tile to cleanly rewind back to it
      if (!isDragMove) {
        for (let i = path.length - 2; i >= 0; i--) {
          if (sameCoord(path[i], cell)) {
            onTrimToIndex(i);
            return;
          }
        }
      }
    },
    [board, isComplete, onStepTo, onTrimToIndex, onUndo, path, spawnRipple]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isComplete) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      const rect = gridRef.current?.getBoundingClientRect();
      if (rect) {
        lastDragPosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          t: performance.now(),
        };
      }
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      lastPointerCellRef.current = coordKey(cell);
      tryInteractCell(cell, false);
    },
    [getCellFromPoint, isComplete, tryInteractCell]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || isComplete) return;

      // Subtle continuous ink mist following finger motion near the active brush head
      const rect = gridRef.current?.getBoundingClientRect();
      const currHead = path[path.length - 1];
      if (rect && currHead) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const now = performance.now();
        const prevPos = lastDragPosRef.current;
        if (prevPos) {
          const distMoved = Math.hypot(px - prevPos.x, py - prevPos.y);
          const dtMs = now - prevPos.t;
          if (distMoved >= 10 && dtMs >= 22) {
            const headCenterX = currHead.c * (cellSize + gap) + cellSize / 2;
            const headCenterY = currHead.r * (cellSize + gap) + cellSize / 2;
            const distToHead = Math.hypot(px - headCenterX, py - headCenterY);
            if (distToHead <= cellSize * 1.45) {
              const dtSec = Math.max(dtMs / 1000, 0.016);
              particleRef.current?.emitBrushDrag(
                px,
                py,
                (px - prevPos.x) / dtSec,
                (py - prevPos.y) / dtSec
              );
            }
            lastDragPosRef.current = { x: px, y: py, t: now };
          }
        } else {
          lastDragPosRef.current = { x: px, y: py, t: now };
        }
      }

      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      const key = coordKey(cell);
      if (key === lastPointerCellRef.current) return;
      lastPointerCellRef.current = key;
      tryInteractCell(cell, true);
    },
    [cellSize, gap, getCellFromPoint, isComplete, path, tryInteractCell]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    lastPointerCellRef.current = null;
    lastDragPosRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  // Build continuous SVG path segments, breaking cleanly at Moon Gate portal jumps
  const ribbonSegments = useMemo(() => {
    const segments: Coord[][] = [];
    if (path.length < 2) return segments;

    let current: Coord[] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      if (!isOrthogonalAdjacent(prev, curr)) {
        if (current.length >= 2) segments.push(current);
        current = [curr];
      } else {
        current.push(curr);
      }
    }
    if (current.length >= 2) segments.push(current);
    return segments;
  }, [path]);

  // Identify traversed portal jumps for ethereal moon-arc connectors
  const activePortalJumps = useMemo(() => {
    const jumps: Array<{ from: Coord; to: Coord; portalId: string }> = [];
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      if (!isOrthogonalAdjacent(prev, curr)) {
        const tile = board.grid[prev.r][prev.c];
        jumps.push({ from: prev, to: curr, portalId: tile.portalId ?? 'A' });
      }
    }
    return jumps;
  }, [board.grid, path]);

  const hintSegments = useMemo(() => {
    if (!hint || hint.path.length < 2) return [];
    const segs: Coord[][] = [];
    let curr: Coord[] = [hint.path[0]];
    for (let i = 1; i < hint.path.length; i++) {
      if (!isOrthogonalAdjacent(hint.path[i - 1], hint.path[i])) {
        if (curr.length >= 2) segs.push(curr);
        curr = [hint.path[i]];
      } else {
        curr.push(hint.path[i]);
      }
    }
    if (curr.length >= 2) segs.push(curr);
    return segs;
  }, [hint]);

  const toPixelCenter = useCallback(
    (c: Coord) => ({
      x: c.c * (cellSize + gap) + cellSize / 2,
      y: c.r * (cellSize + gap) + cellSize / 2,
    }),
    [cellSize, gap]
  );

  // Emit directional calligraphic ink splatters whenever the path advances or retracts
  useEffect(() => {
    const boardChanged = prevBoardRef.current !== board;
    const prevPath = prevPathRef.current;

    if (!boardChanged) {
      if (path.length > prevPath.length && prevPath.length >= 1) {
        const addedCount = path.length - prevPath.length;
        const fromCoord = prevPath[prevPath.length - 1];
        const firstNewCoord = path[prevPath.length];
        const fromPt = toPixelCenter(fromCoord);
        const firstNewPt = toPixelCenter(firstNewCoord);
        const landedTile = board.grid[firstNewCoord.r]?.[firstNewCoord.c];

        let tint: SplashTint = 'gold';
        if (landedTile?.kind === 'portal') {
          tint = landedTile.portalId === 'B' ? 'portalB' : 'portalA';
        } else if (landedTile?.kind === 'end') {
          tint = 'lotus';
        }

        particleRef.current?.emitSegmentSplash(
          fromPt.x,
          fromPt.y,
          firstNewPt.x,
          firstNewPt.y,
          tint
        );

        // If a Moon Gate portal jump occurred, also emit an emergence splash at the exit gate
        if (addedCount >= 2) {
          const exitCoord = path[path.length - 1];
          const exitPt = toPixelCenter(exitCoord);
          particleRef.current?.emitSegmentSplash(
            exitPt.x,
            exitPt.y - 6,
            exitPt.x,
            exitPt.y,
            tint
          );
        }
      } else if (path.length < prevPath.length && prevPath.length >= 2) {
        const retracted = prevPath[prevPath.length - 1];
        const pt = toPixelCenter(retracted);
        particleRef.current?.emitUndoMist(pt.x, pt.y);
      }
    }

    prevBoardRef.current = board;
    prevPathRef.current = path;
  }, [board, path, toPixelCenter]);

  // Celebratory ink & gold shimmer along the completed ribbon upon level clear
  useEffect(() => {
    if (isComplete && !prevCompleteRef.current) {
      particleRef.current?.emitVictoryCascade(path.map(toPixelCenter));
    }
    prevCompleteRef.current = isComplete;
  }, [isComplete, path, toPixelCenter]);

  const pointsToAttr = useCallback(
    (pts: Coord[]) =>
      pts
        .map((p) => {
          const pt = toPixelCenter(p);
          return `${pt.x},${pt.y}`;
        })
        .join(' '),
    [toPixelCenter]
  );

  const strokeOuter = Math.max(10, Math.round(cellSize * 0.24));
  const strokeCore = Math.max(6, Math.round(cellSize * 0.145));
  const strokeSpec = Math.max(2, Math.round(cellSize * 0.04));

  return (
    <div
      ref={stageRef}
      key={shakeTrigger}
      className={`relative flex items-center justify-center w-full h-full ${
        shakeTrigger > 0 ? 'animate-board-shake' : ''
      }`}
    >
      {/* Carved Celadon Courtyard Frame */}
      <div
        className="relative rounded-2xl bg-[#19282c]/95 border border-[#324a4f]/80 shadow-[0_20px_50px_rgba(4,10,12,0.65)]"
        style={{ padding: `${framePad}px` }}
      >
        {/* Inner exact-square tile grid */}
        <div
          ref={gridRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative grid select-none touch-none"
          style={{
            width: `${gridWidth}px`,
            height: `${gridHeight}px`,
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
          role="application"
          aria-label={`解谜棋盘 ${rows}行${cols}列`}
        >
          {board.grid.map((row, r) =>
            row.map((tile, c) => {
              const key = `${r},${c}`;
              const visitCount = getVisitCount(path, { r, c });
              const isVisited = visitCount > 0;
              const isHead = head && head.r === r && head.c === c;
              const isValidNext = !isComplete && validMoveSet.has(key);
              const isBacktrackTarget =
                hint?.backtrackToIndex !== null &&
                hint?.backtrackToIndex !== undefined &&
                path[hint.backtrackToIndex] &&
                sameCoord(path[hint.backtrackToIndex], { r, c });

              if (tile.kind === 'wall') {
                return (
                  <div
                    key={key}
                    className="relative rounded-xl bg-[#111a1d]/90 border border-[#1d2d31] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <RockGlyph variant={r * 3 + c} />
                  </div>
                );
              }

              const bridgeUsage = tile.kind === 'bridge' ? getBridgeUsage(path, { r, c }) : null;
              const tileDone = tile.kind === 'bridge' ? visitCount >= 2 : isVisited;

              return (
                <div
                  key={key}
                  className={`relative rounded-xl flex items-center justify-center transition-transform duration-150 ${
                    isHead ? 'scale-[1.03]' : ''
                  } ${
                    tile.kind === 'bridge'
                      ? 'bg-[#213337] border border-[#3d575c]'
                      : tileDone
                      ? 'bg-[#2a3f42] border border-[#d9a74a]/65 shadow-[inset_0_0_14px_rgba(217,167,74,0.16)]'
                      : isValidNext
                      ? 'bg-[#24393e] border border-[#6ca89a]/70'
                      : 'bg-[#1f3135] border border-[#2f474c]'
                  }`}
                >
                  {/* Subtle stone bevel on unvisited tiles */}
                  {tile.kind !== 'bridge' && !tileDone && (
                    <div
                      className="pointer-events-none absolute inset-[2px] rounded-[10px] border border-white/[0.04]"
                      aria-hidden="true"
                    />
                  )}

                  {/* Valid next move breathing dot */}
                  {isValidNext && (
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e9c46a]/85 animate-valid-breathe shadow-[0_0_10px_rgba(233,196,106,0.7)]" />
                    </div>
                  )}

                  {/* Backtrack ring when hint detects a dead end */}
                  {isBacktrackTarget && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#e06a54]"
                      aria-hidden="true"
                    />
                  )}

                  {/* Special tile glyphs */}
                  {tile.kind === 'start' && (
                    <div className="relative z-20 flex items-center justify-center w-[62%] h-[62%] rounded-lg bg-[#c94433] border border-[#f29d8d]/80 shadow-[0_2px_10px_rgba(201,68,51,0.5)]">
                      <span className="font-display text-xs sm:text-sm md:text-base font-bold text-[#faf4ee] leading-none">
                        起
                      </span>
                    </div>
                  )}

                  {tile.kind === 'end' && (
                    <div className="relative z-20 w-full h-full flex items-center justify-center">
                      <LotusEndGlyph active={isVisited} />
                    </div>
                  )}

                  {tile.kind === 'order' && tile.order !== undefined && (
                    <div
                      className={`relative z-20 flex items-center justify-center w-[58%] h-[58%] rounded-full border-2 transition-colors duration-150 ${
                        isVisited
                          ? 'bg-[#e9c46a] border-[#fff4d2] text-[#172326]'
                          : 'bg-[#172529]/95 border-[#86a8a0] text-[#e8efe9]'
                      }`}
                    >
                      <span className="font-mono-num text-xs sm:text-sm md:text-base font-bold leading-none">
                        {tile.order}
                      </span>
                    </div>
                  )}

                  {tile.kind === 'bridge' && bridgeUsage && (
                    <div className="relative z-10 w-full h-full">
                      <BridgePlankGlyph
                        horizontalDone={bridgeUsage.horizontal}
                        verticalDone={bridgeUsage.vertical}
                      />
                    </div>
                  )}

                  {tile.kind === 'portal' && tile.portalId && (
                    <div className="relative z-20 w-full h-full flex items-center justify-center">
                      <PortalGateGlyph portalId={tile.portalId} visited={isVisited} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Exact-pixel SVG Ink Ribbon, Portal Arcs, Hint Blueprint & Brush Head */}
          <svg
            viewBox={`0 0 ${gridWidth} ${gridHeight}`}
            width={gridWidth}
            height={gridHeight}
            className="pointer-events-none absolute inset-0 z-10 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="kintsugiRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d99f3f" />
                <stop offset="50%" stopColor="#f3d482" />
                <stop offset="100%" stopColor="#dca446" />
              </linearGradient>
              <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hint Golden Guide */}
            {hintSegments.map((seg, idx) => (
              <g key={`hint-${idx}`}>
                <polyline
                  points={pointsToAttr(seg)}
                  fill="none"
                  stroke="#f6df9e"
                  strokeWidth={Math.max(5, Math.round(cellSize * 0.11))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 10"
                  opacity="0.78"
                  className="animate-dash-flow"
                />
                {(() => {
                  const lastPt = toPixelCenter(seg[seg.length - 1]);
                  return (
                    <circle
                      cx={lastPt.x}
                      cy={lastPt.y}
                      r={Math.max(4.5, cellSize * 0.09)}
                      fill="#f6df9e"
                      opacity="0.9"
                    />
                  );
                })()}
              </g>
            ))}

            {/* Traversed Portal Ethereal Arcs */}
            {activePortalJumps.map((jump, i) => {
              const p1 = toPixelCenter(jump.from);
              const p2 = toPixelCenter(jump.to);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - cellSize * 0.45;
              return (
                <path
                  key={`portal-jump-${i}`}
                  d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={jump.portalId === 'A' ? '#6bd8e6' : '#d5a3f0'}
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  opacity="0.72"
                />
              );
            })}

            {/* Golden Kintsugi Ink Path Segments */}
            {ribbonSegments.map((seg, idx) => (
              <g key={`ribbon-${idx}`}>
                <polyline
                  points={pointsToAttr(seg)}
                  fill="none"
                  stroke="#9a6b22"
                  strokeWidth={strokeOuter}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.52"
                />
                <polyline
                  points={pointsToAttr(seg)}
                  fill="none"
                  stroke="url(#kintsugiRibbon)"
                  strokeWidth={strokeCore}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#goldGlow)"
                />
                <polyline
                  points={pointsToAttr(seg)}
                  fill="none"
                  stroke="#fff5d6"
                  strokeWidth={strokeSpec}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.78"
                />
              </g>
            ))}

            {/* Ink Ripples */}
            {ripples.map((rp) => {
              const pt = toPixelCenter({ r: rp.r, c: rp.c });
              return (
                <g key={rp.id} transform={`translate(${pt.x}, ${pt.y})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={cellSize * 0.3}
                    fill="none"
                    stroke={rp.color}
                    strokeWidth="2.5"
                    className="animate-ink-ripple"
                  />
                </g>
              );
            })}

            {/* Active Brush Head Halo */}
            {head && (
              <g transform={`translate(${toPixelCenter(head).x}, ${toPixelCenter(head).y})`}>
                <circle
                  cx="0"
                  cy="0"
                  r={Math.max(10, cellSize * 0.21)}
                  fill="rgba(241, 207, 122, 0.25)"
                  stroke="#f6df9e"
                  strokeWidth="2"
                  className="animate-head-breathe"
                />
                <circle cx="0" cy="0" r={Math.max(4.5, cellSize * 0.095)} fill="#fff4d2" />
              </g>
            )}
          </svg>

          {/* 60fps Calligraphic Ink & Gold Splatter Particle Overlay */}
          <InkParticleLayer ref={particleRef} width={gridWidth} height={gridHeight} />
        </div>
      </div>
    </div>
  );
}
