import { ArrowRight, Grid2x2, RotateCcw, Shuffle } from 'lucide-react';
import { LevelSpec } from '../game/types';
import { SealStarIcon } from './TileIcons';

interface VictoryModalProps {
  level: LevelSpec;
  stars: 1 | 2 | 3;
  elapsedSec: number;
  hintsUsed: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  onNextRandom: () => void;
}

export function VictoryModal({
  level,
  stars,
  elapsedSec,
  hintsUsed,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onNextRandom,
}: VictoryModalProps) {
  const isCustomMode = level.chapter === 0;
  const ratingTitle =
    stars === 3 ? '一气呵成' : stars === 2 ? '通幽入微' : '墨径贯通';

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
      aria-label="通关结算"
    >
      <div className="animate-modal-enter w-full max-w-sm rounded-2xl bg-[#162428] border border-[#3d5a5f] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        {/* Cinnabar Seal Badge & Stars */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3].map((idx) => (
              <SealStarIcon key={idx} size={28} filled={stars >= idx} />
            ))}
          </div>

          <h2 className="font-display text-2xl font-bold text-[#f6df9e] tracking-widest">
            {ratingTitle}
          </h2>

          <p className="mt-1.5 text-sm text-[#c4d5d1]">
            {isCustomMode
              ? level.title
              : `第 ${String(level.id).padStart(2, '0')} 关 · ${level.title}`}
          </p>
        </div>

        {/* Clean tabular metrics separated by hairline dividers */}
        <div className="mt-5 py-3.5 border-y border-[#283e43] grid grid-cols-2 divide-x divide-[#283e43]">
          <div>
            <div className="text-xs text-[#8ea5a1]">耗时</div>
            <div className="mt-1 font-mono-num text-base font-semibold text-[#f3efe6]">
              {formatTime(elapsedSec)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8ea5a1]">锦囊提示</div>
            <div className="mt-1 font-mono-num text-base font-semibold text-[#f3efe6]">
              {hintsUsed === 0 ? '未用' : `${hintsUsed} 次`}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
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

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReplay}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#365056] text-[#e8e3d6] text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>再玩一次</span>
            </button>
            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#365056] text-[#e8e3d6] text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Grid2x2 className="w-4 h-4 shrink-0" />
              <span>选关目录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
