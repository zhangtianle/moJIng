import { useState } from 'react';
import { Calendar, Shuffle, X } from 'lucide-react';
import { CHAPTERS, LEVELS } from '../game/levels';
import { SaveProgress } from '../game/types';
import { getTodayDateString } from '../game/daily';
import { SealStarIcon } from './TileIcons';

interface LevelSelectModalProps {
  currentLevelId: number | null;
  progress: SaveProgress;
  onSelectLevel: (levelId: number) => void;
  onStartDaily: () => void;
  onStartEndless: () => void;
  onClose: () => void;
}

export function LevelSelectModal({
  currentLevelId,
  progress,
  onSelectLevel,
  onStartDaily,
  onStartEndless,
  onClose,
}: LevelSelectModalProps) {
  const initialChapter =
    LEVELS.find((l) => l.id === currentLevelId)?.chapter ?? 1;
  const [activeChapter, setActiveChapter] = useState<number>(initialChapter);

  const chapterInfo = CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];
  const chapterLevels = LEVELS.filter((l) => l.chapter === activeChapter);
  const todayStr = getTodayDateString();
  const dailyRec = progress.dailyCompleted[todayStr];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#091012]/80 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="选关目录"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-modal-enter w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#162428] border border-[#31484d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#273c41]">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f3efe6]">选关目录</h2>
            <p className="text-xs text-[#9bb1ad] mt-0.5 font-mono-num">
              四卷二十四局 · 循序解锁亦可自由研习
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭目录"
            className="min-h-[44px] min-w-[44px] rounded-xl text-[#b6c9c5] hover:text-[#f3efe6] hover:bg-[#22353a] transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily & Random quick entries */}
        <div className="px-5 pt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onStartDaily}
            className="min-h-[56px] px-3.5 py-2.5 rounded-xl bg-[#1e3136] hover:bg-[#263e44] border border-[#3a575d] text-left transition-colors flex items-center gap-3"
          >
            <Calendar className="w-5 h-5 text-[#e9c46a] shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#f3efe6] truncate">每日雅局</div>
              <div className="text-[11px] text-[#9eb4b0] font-mono-num truncate">
                {dailyRec ? `已破 · ${dailyRec.timeSec}s` : todayStr}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onStartEndless}
            className="min-h-[56px] px-3.5 py-2.5 rounded-xl bg-[#1e3136] hover:bg-[#263e44] border border-[#3a575d] text-left transition-colors flex items-center gap-3"
          >
            <Shuffle className="w-5 h-5 text-[#68c7ad] shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#f3efe6] truncate">随机新局</div>
              <div className="text-[11px] text-[#9eb4b0] truncate">无尽庭院演练</div>
            </div>
          </button>
        </div>

        {/* Chapter segmented tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#111c1f] border border-[#24373c]">
            {CHAPTERS.map((ch) => {
              const active = ch.id === activeChapter;
              const chDone = LEVELS.filter(
                (l) => l.chapter === ch.id && progress.completed[l.id]
              ).length;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChapter(ch.id)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex flex-col items-center justify-center ${
                    active
                      ? 'bg-[#284045] text-[#f6df9e]'
                      : 'text-[#96ada9] hover:text-[#e4ebe9]'
                  }`}
                >
                  <span>卷{['一', '二', '三', '四'][ch.id - 1]}</span>
                  <span className="text-[10px] font-mono-num opacity-75">{chDone}/6</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chapter info + Level grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="font-display text-sm font-semibold text-[#f3efe6]">
              {chapterInfo.title}
            </h3>
            <span className="text-xs text-[#9cb3af] whitespace-nowrap">
              {chapterInfo.mechanicTag}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {chapterLevels.map((lv) => {
              const rec = progress.completed[lv.id];
              const isCurrent = currentLevelId === lv.id;
              return (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => onSelectLevel(lv.id)}
                  className={`min-h-[76px] p-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-[#294146] border-[#d9a74a] shadow-[0_0_0_1px_rgba(217,167,74,0.35)]'
                      : rec
                      ? 'bg-[#1d3035] border-[#39555b] hover:border-[#628c87]'
                      : 'bg-[#1a2a2e] border-[#293e43] hover:border-[#4b6a70]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono-num text-xs text-[#9cb3af]">
                      {String(lv.id).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <SealStarIcon
                          key={s}
                          size={13}
                          filled={Boolean(rec && rec.stars >= s)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <div className="text-sm font-medium text-[#f3efe6] truncate">
                      {lv.title}
                    </div>
                    <div className="text-[11px] text-[#8ba39f] font-mono-num mt-0.5">
                      {lv.rows}×{lv.cols}
                      {rec ? ` · ${rec.bestTimeSec}s` : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
