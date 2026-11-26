import { useState } from 'react';
import { Calendar, Grid2x2, Play, Volume2, VolumeX } from 'lucide-react';
import { TitleLockup } from './TitleLockup';
import { SaveProgress } from '../game/types';
import { LEVELS } from '../game/levels';
import { getTodayDateString } from '../game/daily';

const TITLE_BACKDROP_SRC = '/src/assets/images/title_courtyard_backdrop_1795664840603.jpg';

interface TitleScreenProps {
  progress: SaveProgress;
  muted: boolean;
  onToggleMute: () => void;
  onStartPrimary: () => void;
  onOpenLevelSelect: () => void;
  onStartDaily: () => void;
}

export function TitleScreen({
  progress,
  muted,
  onToggleMute,
  onStartPrimary,
  onOpenLevelSelect,
  onStartDaily,
}: TitleScreenProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const completedCount = Object.keys(progress.completed).length;
  const totalStars = Object.values(progress.completed).reduce((sum, r) => sum + r.stars, 0);
  const maxStars = LEVELS.length * 3;
  const todayDone = Boolean(progress.dailyCompleted[getTodayDateString()]);

  const nextLevelId = Math.min(
    LEVELS.length,
    Math.max(1, progress.lastLevelId)
  );
  const hasProgress = completedCount > 0;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#131e21] flex flex-col justify-between">
      {/* Atmospheric Song Dynasty Courtyard Key Art Backdrop */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {!imgFailed ? (
          <img
            src={TITLE_BACKDROP_SRC}
            alt="宋韵青瓷金缮庭院"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover animate-slow-pan opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#162529] via-[#1c3135] to-[#0f191c]" />
        )}
        {/* Measured scrim protecting center negative space and edge legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,22,25,0.78)_0%,rgba(13,22,25,0.58)_52%,rgba(9,16,18,0.88)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0d1619] via-[#0d1619]/70 to-transparent" />
      </div>

      {/* Top perimeter utility bar (only functional mute toggle) */}
      <div className="relative z-10 flex items-center justify-end px-4 sm:px-8 pt-safe pt-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? '开启音效' : '关闭音效'}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-[#162428]/75 border border-[#3a5459]/70 text-[#e8e3d6] hover:bg-[#1f3338] hover:border-[#d9a74a]/60 transition-colors flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#e9c46a]"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Center focal lockup & action stack staged over calm courtyard pond */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 text-center -mt-4">
        <TitleLockup />

        {/* Quiet unboxed progress metadata */}
        <p className="mt-4 text-xs sm:text-sm text-[#c6d6d2] tracking-wide font-mono-num">
          <span>已通 {completedCount} / {LEVELS.length} 关</span>
          <span className="mx-2.5 text-[#587276]" aria-hidden="true">·</span>
          <span>获印 {totalStars} / {maxStars}</span>
          {todayDone && (
            <>
              <span className="mx-2.5 text-[#587276]" aria-hidden="true">·</span>
              <span className="text-[#e9c46a]">今日雅局已破</span>
            </>
          )}
        </p>

        {/* Primary CTA + quiet secondary actions */}
        <div className="mt-8 w-full max-w-xs flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStartPrimary}
            className="w-full min-h-[52px] px-7 py-3 rounded-xl bg-[#d9a74a] hover:bg-[#e5b860] active:scale-[0.98] text-[#141f22] font-semibold text-base tracking-wider shadow-[0_10px_28px_rgba(217,167,74,0.3)] transition-all duration-150 flex items-center justify-center gap-2.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6df9e]"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>{hasProgress ? `继续第 ${String(nextLevelId).padStart(2, '0')} 关` : '开始解谜'}</span>
          </button>

          <div className="w-full grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#18272b]/85 hover:bg-[#22363b] active:scale-[0.98] border border-[#3a5459]/80 text-[#efeae0] text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#e9c46a]"
            >
              <Grid2x2 className="w-4 h-4 text-[#9ec2b9] shrink-0" />
              <span>选关目录</span>
            </button>

            <button
              type="button"
              onClick={onStartDaily}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#18272b]/85 hover:bg-[#22363b] active:scale-[0.98] border border-[#3a5459]/80 text-[#efeae0] text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#e9c46a]"
            >
              <Calendar className="w-4 h-4 text-[#e9c46a] shrink-0" />
              <span>每日雅局</span>
            </button>
          </div>
        </div>
      </main>

      {/* Single flat control-hint line at bottom */}
      <footer className="relative z-10 px-4 pb-safe pb-4 text-center">
        <p className="text-[11px] sm:text-xs text-[#9cb1ad]/90 tracking-wide">
          滑动一笔连线 · 回滑撤步 · 方向键移动 · R 重开 · H 锦囊 · Enter 开始
        </p>
      </footer>
    </div>
  );
}
