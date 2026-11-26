import { Grid2x2, Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenLevelSelect: () => void;
  onToggleMute: () => void;
  onBackToTitle: () => void;
}

export function PauseModal({
  muted,
  onResume,
  onRestart,
  onOpenLevelSelect,
  onToggleMute,
  onBackToTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091012]/80 p-5"
      role="dialog"
      aria-modal="true"
      aria-label="游戏暂停与图例说明"
      onClick={(e) => {
        if (e.target === e.currentTarget) onResume();
      }}
    >
      <div className="animate-modal-enter w-full max-w-sm rounded-2xl bg-[#162428] border border-[#334c52] p-6 shadow-2xl">
        <h2 className="font-display text-xl font-bold text-[#f3efe6] text-center tracking-wider">
          暂歇片刻
        </h2>

        {/* Concise tile rules reference */}
        <div className="mt-4 py-3.5 border-y border-[#273c41] space-y-2 text-xs text-[#bfd2ce] leading-relaxed">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#c94433] text-[#faf4ee] font-display font-bold text-[11px] shrink-0">
              起
            </span>
            <span>从起点出发，一笔连遍所有石板；回滑或点击已走石板可撤步。</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#86a8a0] text-[#f3efe6] font-mono-num font-bold text-[11px] shrink-0">
              1
            </span>
            <span>序印须按 1 → 2 → 3 从小到大依次连过；终莲须在最后一步落笔。</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#493824] border border-[#8a6b43] text-[#f1cf7a] font-mono-num font-bold text-[10px] shrink-0">
              十
            </span>
            <span>飞桥须横竖各直行通过一次，桥面不可拐弯。</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#5cc8d7] text-[#f3efe6] font-display font-bold text-[11px] shrink-0">
              甲
            </span>
            <span>月门成对互通，步入其一即从同字另一月门穿出。</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#d9a74a] hover:bg-[#e5b860] active:scale-[0.98] text-[#131e21] font-semibold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>继续解谜</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#354f55] text-[#e8e3d6] text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>重新开始</span>
            </button>
            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#354f55] text-[#e8e3d6] text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Grid2x2 className="w-4 h-4 shrink-0" />
              <span>选关目录</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1a2b2f] hover:bg-[#23393e] border border-[#2f474d] text-[#c7d8d4] text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {muted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
              <span>{muted ? '音效：关' : '音效：开'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1a2b2f] hover:bg-[#23393e] border border-[#2f474d] text-[#c7d8d4] text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>返回主界面</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
