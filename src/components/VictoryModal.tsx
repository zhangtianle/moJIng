import React, { useEffect } from 'react';
import { ArrowRight, Award, Grid2x2, RotateCcw, Shuffle } from 'lucide-react';
import { LevelRunMetrics, LevelSpec } from '../game/types';
import { soundEngine } from '../game/audio';
import { SealStarIcon } from './TileIcons';

interface VictoryModalProps {
  level: LevelSpec;
  stars: 1 | 2 | 3;
  runMetrics: LevelRunMetrics;
  newlyUnlockedTitles: string[];
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  onOpenDashboard: () => void;
  onNextRandom: () => void;
}

const STAR_DELAYS_MS: Record<1 | 2 | 3, number> = {
  1: 160,
  2: 340,
  3: 520,
};

const SPARK_ANGLES = [22, 95, 165, 240, 310];

export function VictoryModal({
  level,
  stars,
  runMetrics,
  newlyUnlockedTitles,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onOpenDashboard,
  onNextRandom,
}: VictoryModalProps) {
  const isCustomMode = level.chapter === 0;

  // Trigger delicate rising pentatonic chime in sync with each earned star pop-in
  useEffect(() => {
    const timers: number[] = [];
    for (let i = 1; i <= stars; i++) {
      const idx = i as 1 | 2 | 3;
      const t = window.setTimeout(() => {
        soundEngine.playStarPop(idx);
      }, STAR_DELAYS_MS[idx]);
      timers.push(t);
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [level.id, stars]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}分${String(sec).padStart(2, '0')}秒` : `${sec}秒`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091012]/80 p-5"
      role="dialog"
      aria-modal="true"
      aria-label="通关结算与雅士墨评"
    >
      <div className="animate-modal-enter w-full max-w-sm rounded-2xl bg-[#162428] border border-[#3d5a5f] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        {/* Sequential Arch Stars with Subtle Kintsugi Gold Shimmer */}
        <div className="flex flex-col items-center">
          <div
            className="flex items-end justify-center gap-3.5 h-12 mb-3"
            aria-label={`获得 ${stars} 颗金印星`}
          >
            {([1, 2, 3] as const).map((idx) => {
              const earned = stars >= idx;
              const isCenter = idx === 2;
              const delayMs = STAR_DELAYS_MS[idx];
              const starSize = isCenter ? 34 : 28;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center ${
                    isCenter ? '-translate-y-1.5' : ''
                  }`}
                  style={{ width: `${starSize}px`, height: `${starSize}px` }}
                >
                  {/* Kintsugi golden ripple ring + micro gold lacquer sparks on earned star arrival */}
                  {earned && (
                    <>
                      <span
                        className="pointer-events-none absolute inset-0 rounded-full border border-[#f6df9e]/80 animate-kintsugi-ring"
                        style={{ animationDelay: `${delayMs + 40}ms` }}
                        aria-hidden="true"
                      />
                      {SPARK_ANGLES.map((angle, sIdx) => (
                        <span
                          key={sIdx}
                          className="pointer-events-none absolute w-1 h-1 rounded-full bg-[#f6df9e] shadow-[0_0_6px_rgba(246,223,158,0.9)] animate-kintsugi-spark"
                          style={
                            {
                              animationDelay: `${delayMs + 50 + sIdx * 18}ms`,
                              '--spark-angle': `${angle}deg`,
                            } as React.CSSProperties
                          }
                          aria-hidden="true"
                        />
                      ))}
                    </>
                  )}

                  {/* Pop-in Star Body */}
                  <div
                    className={earned ? 'animate-star-pop' : 'animate-star-muted'}
                    style={{ animationDelay: `${delayMs}ms` }}
                  >
                    <div
                      className={
                        earned
                          ? 'drop-shadow-[0_0_8px_rgba(233,196,106,0.45)]'
                          : ''
                      }
                    >
                      <SealStarIcon size={starSize} filled={earned} />
                    </div>
                  </div>

                  {/* Delicate lingering kintsugi 4-point gold glint on top-right corner of earned star */}
                  {earned && (
                    <svg
                      viewBox="0 0 16 16"
                      className="pointer-events-none absolute -top-1 -right-1 w-3.5 h-3.5 text-[#fff4d2] animate-kintsugi-glint"
                      style={{ animationDelay: `${delayMs + 280}ms` }}
                      aria-hidden="true"
                    >
                      <path
                        d="M8 1 L9.2 6.8 L15 8 L9.2 9.2 L8 15 L6.8 9.2 L1 8 L6.8 6.8 Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#c94433] border border-[#f09b8b]/70 font-display text-[11px] font-bold text-[#faf4ee] leading-none">
              墨评
            </span>
            <h2 className="font-display text-2xl font-bold text-[#f6df9e] tracking-widest">
              {runMetrics.honorTitle}
            </h2>
          </div>

          <p className="mt-1.5 text-xs text-[#b8cbc7]">{runMetrics.honorDesc}</p>

          <p className="mt-1 text-xs text-[#8ea5a1]">
            {isCustomMode
              ? level.title
              : `第 ${String(level.id).padStart(2, '0')} 关 · ${level.title}`}
          </p>
        </div>

        {/* Newly unlocked Scholar Title callout */}
        {newlyUnlockedTitles.length > 0 && (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-[#22342f] border border-[#567c6a] flex items-center justify-between gap-2 text-left">
            <div className="min-w-0">
              <div className="text-[11px] text-[#95d6ba]">新获雅士称号</div>
              <div className="font-display text-sm font-bold text-[#f6df9e] truncate">
                「{newlyUnlockedTitles.join('」「')}」
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="min-h-[36px] px-2.5 rounded-lg bg-[#2f4941] hover:bg-[#3a5a50] text-xs text-[#f3efe6] whitespace-nowrap shrink-0 transition-colors"
            >
              前往佩戴
            </button>
          </div>
        )}

        {/* 3-Column Tabular Metrics: Fluency, Steps, Elapsed Time */}
        <div className="mt-5 py-3.5 border-y border-[#283e43] grid grid-cols-3 divide-x divide-[#283e43]">
          <div>
            <div className="text-[11px] text-[#8ea5a1]">连贯度</div>
            <div className="mt-1 font-mono-num text-sm font-semibold text-[#f6df9e]">
              {runMetrics.fluencyScore}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8ea5a1]">步数 / 最优</div>
            <div className="mt-1 font-mono-num text-sm font-semibold text-[#f3efe6]">
              {runMetrics.stepsTaken}/{runMetrics.optimalSteps}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8ea5a1]">耗时</div>
            <div className="mt-1 font-mono-num text-sm font-semibold text-[#f3efe6]">
              {formatTime(runMetrics.elapsedSec)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-col gap-2.5">
          {!isCustomMode && hasNextLevel ? (
            <button
              type="button"
              onClick={onNextLevel}
              className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#d9a74a] hover:bg-[#e5b860] active:scale-[0.98] text-[#131e21] font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>下一关</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextRandom}
              className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#d9a74a] hover:bg-[#e5b860] active:scale-[0.98] text-[#131e21] font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4 shrink-0" />
              <span>挑战随机新局</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onReplay}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#365056] text-[#e8e3d6] text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>重玩</span>
            </button>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#365056] text-[#f6df9e] text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>雅士录</span>
            </button>
            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#365056] text-[#e8e3d6] text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Grid2x2 className="w-3.5 h-3.5 shrink-0" />
              <span>选关</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
