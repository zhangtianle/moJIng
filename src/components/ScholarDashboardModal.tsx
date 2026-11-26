import { useMemo, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { SaveProgress } from '../game/types';
import { CAREER_RANKS, computeScholarSummary } from '../game/titles';
import { LEVELS } from '../game/levels';

interface ScholarDashboardModalProps {
  progress: SaveProgress;
  onEquipTitle: (titleId: string | null) => void;
  onClose: () => void;
}

type DashboardTab = 'overview' | 'badges' | 'records';

export function ScholarDashboardModal({
  progress,
  onEquipTitle,
  onClose,
}: ScholarDashboardModalProps) {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const summary = useMemo(() => computeScholarSummary(progress), [progress]);

  const completedEntries = useMemo(() => {
    return Object.entries(progress.completed)
      .map(([idStr, rec]) => {
        const id = Number(idStr);
        const spec = LEVELS.find((l) => l.id === id);
        return { id, spec, rec };
      })
      .filter((item) => Boolean(item.spec))
      .sort((a, b) => (b.rec.completedAt || 0) - (a.rec.completedAt || 0));
  }, [progress.completed]);

  const rankProgressPct = summary.nextRank
    ? Math.min(
        100,
        Math.round((summary.completedCount / Math.max(1, summary.nextRank.minLevels)) * 100)
      )
    : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#091012]/80 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="雅士录 · 玩家进度看板"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-modal-enter w-full sm:max-w-xl max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#162428] border border-[#324b51] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#273c41]">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f3efe6] tracking-wide">
              雅士录 · 进度看板
            </h2>
            <p className="text-xs text-[#9bb1ad] mt-0.5 font-mono-num">
              <span>已解锁书法印号 {summary.unlockedBadgeCount} / {summary.badges.length}</span>
              <span className="mx-2 text-[#4e676c]" aria-hidden="true">·</span>
              <span>获印 {summary.totalStars} / {summary.maxStars}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭雅士录"
            className="min-h-[44px] min-w-[44px] rounded-xl text-[#b6c9c5] hover:text-[#f3efe6] hover:bg-[#22353a] transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Calligrapher Seal Plaque */}
        <div className="px-5 pt-4">
          <div className="p-4 rounded-xl bg-[#121e21] border border-[#2d4449] flex items-center gap-4">
            {/* Vermilion carved cinnabar chop */}
            <div className="w-13 h-13 rounded-lg bg-[#c94433] border border-[#ef9888]/75 shadow-[0_4px_16px_rgba(201,68,51,0.35)] flex items-center justify-center shrink-0">
              <span className="font-display text-2xl font-bold text-[#faf4ee] leading-none">
                {summary.activeTitle.sealChar}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-[#9cb3af]">当前佩戴称号</span>
                <span className="text-xs text-[#546e73]" aria-hidden="true">·</span>
                <span className="text-xs text-[#e9c46a] font-medium">
                  阶位：{summary.careerRank.title}
                </span>
              </div>
              <div className="mt-0.5 font-display text-xl font-bold text-[#f6df9e] tracking-widest truncate">
                {summary.activeTitle.title}
              </div>
              <p className="mt-0.5 text-xs text-[#a9beb9] truncate">
                {summary.activeTitle.subtitle}
              </p>
            </div>

            {progress.equippedTitleId && (
              <button
                type="button"
                onClick={() => onEquipTitle(null)}
                className="min-h-[36px] px-2.5 rounded-lg bg-[#1d3035] hover:bg-[#263f45] border border-[#355056] text-[11px] text-[#cfe0dc] whitespace-nowrap shrink-0 transition-colors"
              >
                用阶位名
              </button>
            )}
          </div>
        </div>

        {/* 3 Segmented Tabs */}
        <div className="px-5 pt-3.5">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#111c1f] border border-[#24373c]">
            {(
              [
                { id: 'overview', label: '雅士概览' },
                { id: 'badges', label: '书法印谱' },
                { id: 'records', label: '通关墨评' },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#284045] text-[#f6df9e]'
                      : 'text-[#96ada9] hover:text-[#e4ebe9]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* 4 Core Tabular Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#263b40] rounded-xl bg-[#132024] border border-[#263b40]">
                <div className="p-3 text-center">
                  <div className="text-[11px] text-[#8fa7a3]">已完成关卡</div>
                  <div className="mt-1 font-mono-num text-base font-semibold text-[#f3efe6]">
                    {summary.completedCount}/{summary.totalLevels}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[11px] text-[#8fa7a3]">平均连贯度</div>
                  <div className="mt-1 font-mono-num text-base font-semibold text-[#f6df9e]">
                    {summary.completedCount > 0 ? `${summary.avgFluency}%` : '--'}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[11px] text-[#8fa7a3]">步数精准度</div>
                  <div className="mt-1 font-mono-num text-base font-semibold text-[#78d9bc]">
                    {summary.completedCount > 0 ? `${summary.stepPrecisionPct}%` : '--'}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[11px] text-[#8fa7a3]">平均单步耗时</div>
                  <div className="mt-1 font-mono-num text-base font-semibold text-[#f3efe6]">
                    {summary.avgSecPerStep > 0 ? `${summary.avgSecPerStep}s` : '--'}
                  </div>
                </div>
              </div>

              {/* Next Career Rank Progress */}
              <div className="pt-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[#d8e5e2]">
                    {summary.nextRank ? `下一阶位：${summary.nextRank.title}` : '已臻最高书圣境界'}
                  </span>
                  <span className="text-[#9cb3af] font-mono-num">
                    {summary.nextRank ? summary.nextRank.requirementText : '24 / 24 关'}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#101a1d] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#c78f34] to-[#f1cf7a] transition-all duration-200"
                    style={{ width: `${rankProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Career Rank Ladder */}
              <div className="pt-3 border-t border-[#253a3f]">
                <h3 className="text-xs font-medium text-[#9bb2ae] mb-2.5">八阶雅士晋升谱</h3>
                <div className="space-y-1.5">
                  {CAREER_RANKS.map((r) => {
                    const isCurrent = r.id === summary.careerRank.id;
                    const reached =
                      CAREER_RANKS.findIndex((x) => x.id === r.id) <=
                      CAREER_RANKS.findIndex((x) => x.id === summary.careerRank.id);
                    return (
                      <div
                        key={r.id}
                        className={`px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-xs border ${
                          isCurrent
                            ? 'bg-[#21353a] border-[#d9a74a]/70 text-[#f6df9e]'
                            : reached
                            ? 'bg-[#1a2b2f]/65 border-[#294045] text-[#dce7e4]'
                            : 'bg-[#131f22]/55 border-[#203236] text-[#7c9490]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                              reached
                                ? 'bg-[#c94433]/90 text-[#faf4ee]'
                                : 'bg-[#1b2b2f] text-[#667d79]'
                            }`}
                          >
                            {r.sealChar}
                          </span>
                          <span className="font-display font-semibold whitespace-nowrap">
                            {r.title}
                          </span>
                          <span className="text-[11px] opacity-75 truncate hidden sm:inline">
                            {r.requirementText}
                          </span>
                        </div>
                        <span className="font-mono-num text-[11px] whitespace-nowrap shrink-0">
                          {isCurrent ? '当前阶位' : reached ? '已达成' : r.requirementText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.badges.map((badge) => {
                const isEquipped = summary.activeTitle.id === badge.id;
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                      badge.unlocked
                        ? isEquipped
                          ? 'bg-[#22373c] border-[#d9a74a]'
                          : 'bg-[#1b2d32] border-[#344f55]'
                        : 'bg-[#132023] border-[#24373c] opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-display text-lg font-bold shrink-0 ${
                          badge.unlocked
                            ? 'bg-[#c94433] border border-[#f09d8d]/70 text-[#faf4ee]'
                            : 'bg-[#1c2b2f] border border-[#2f454a] text-[#6c837f]'
                        }`}
                      >
                        {badge.unlocked ? badge.sealChar : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3
                            className={`font-display text-sm font-bold truncate ${
                              badge.unlocked ? 'text-[#f6df9e]' : 'text-[#9bb1ad]'
                            }`}
                          >
                            {badge.title}
                          </h3>
                          <span className="text-[11px] text-[#8ba39f] whitespace-nowrap shrink-0">
                            {badge.category}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#a8bdb8] leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#263c41] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono-num text-[#90a8a4]">
                        进度：{badge.progressText}
                      </span>
                      {badge.unlocked ? (
                        <button
                          type="button"
                          onClick={() => onEquipTitle(isEquipped ? null : badge.id)}
                          className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                            isEquipped
                              ? 'bg-[#d9a74a] text-[#131e21]'
                              : 'bg-[#243b40] hover:bg-[#2d484e] text-[#f3efe6]'
                          }`}
                        >
                          {isEquipped && <Check className="w-3.5 h-3.5" />}
                          <span>{isEquipped ? '已佩戴' : '佩戴此号'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#6d8480]">未解锁</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'records' && (
            <div>
              {completedEntries.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#8fa7a3]">
                  尚无通关墨评记录，完成任意一关后将自动收录您的书法题跋。
                </div>
              ) : (
                <div className="divide-y divide-[#253a3f]">
                  {completedEntries.map(({ id, spec, rec }) => {
                    const opt = rec.optimalSteps ?? (spec ? spec.solution.length - 1 : 0);
                    const actual = rec.bestStepsTaken ?? opt;
                    const fluency =
                      typeof rec.bestFluency === 'number'
                        ? rec.bestFluency
                        : rec.stars === 3
                        ? 92
                        : rec.stars === 2
                        ? 78
                        : 65;
                    const honor =
                      rec.bestHonor ??
                      (rec.stars === 3 ? '一气呵成' : rec.stars === 2 ? '沉思入微' : '循墨通幽');

                    return (
                      <div
                        key={id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono-num text-[#8fa7a3]">
                              {String(id).padStart(2, '0')}
                            </span>
                            <span className="font-display text-sm font-semibold text-[#f3efe6] truncate">
                              {spec?.title}
                            </span>
                            <span className="text-[#4e676c]" aria-hidden="true">·</span>
                            <span className="font-display text-[#f6df9e] whitespace-nowrap">
                              {honor}
                            </span>
                          </div>
                          <div className="mt-1 font-mono-num text-[11px] text-[#90a8a4]">
                            <span>连贯度 {fluency}%</span>
                            <span className="mx-2 text-[#486065]" aria-hidden="true">·</span>
                            <span>
                              步数 {actual}/{opt}
                            </span>
                            <span className="mx-2 text-[#486065]" aria-hidden="true">·</span>
                            <span>用时 {rec.bestTimeSec}s</span>
                          </div>
                        </div>

                        <div className="font-mono-num text-xs text-[#e9c46a] whitespace-nowrap shrink-0">
                          {rec.stars} 印
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
