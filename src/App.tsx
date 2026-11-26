import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  Grid2x2,
  Home,
  Lightbulb,
  Pause,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ActiveModal,
  Coord,
  GameScreen,
  HintOverlay,
  LevelRunMetrics,
  LevelSpec,
  SaveProgress,
} from './game/types';
import { CHAPTERS, LEVELS } from './game/levels';
import {
  applyStep,
  applyUndo,
  buildLevelBoard,
  computeHint,
  isLevelComplete,
  trimPathToIndex,
} from './game/engine';
import {
  generateProceduralLevel,
  getTodayDailyLevel,
  getTodayDateString,
} from './game/daily';
import { loadProgress, saveProgress } from './game/storage';
import { computeScholarSummary, evaluateRunMetrics } from './game/titles';
import { soundEngine } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { PuzzleBoard } from './components/PuzzleBoard';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';
import { ScholarDashboardModal } from './components/ScholarDashboardModal';

const BOARD_TEXTURE_SRC = '/src/assets/images/board_stone_texture_1795664840492.jpg';

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [progress, setProgress] = useState<SaveProgress>(() => {
    const loaded = loadProgress();
    soundEngine.setMuted(loaded.muted);
    return loaded;
  });

  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [modal, setModal] = useState<ActiveModal>('NONE');
  const [currentSpec, setCurrentSpec] = useState<LevelSpec>(() => {
    const initial = LEVELS.find((l) => l.id === progress.lastLevelId) ?? LEVELS[0];
    return initial;
  });

  const board = useMemo(() => buildLevelBoard(currentSpec), [currentSpec]);
  const scholar = useMemo(() => computeScholarSummary(progress), [progress]);
  const [path, setPath] = useState<Coord[]>(() => [board.start]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [restartCount, setRestartCount] = useState(0);
  const [stepsTaken, setStepsTaken] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [hintOverlay, setHintOverlay] = useState<HintOverlay | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [earnedStars, setEarnedStars] = useState<1 | 2 | 3>(3);
  const [lastRunMetrics, setLastRunMetrics] = useState<LevelRunMetrics | null>(null);
  const [newlyUnlockedTitles, setNewlyUnlockedTitles] = useState<string[]>([]);
  const [textureFailed, setTextureFailed] = useState(false);

  const feedbackTimerRef = useRef<number | null>(null);
  const victoryTimerRef = useRef<number | null>(null);
  const randomCounterRef = useRef(1);

  const isComplete = isLevelComplete(board, path);

  const updateProgress = useCallback((updater: (prev: SaveProgress) => SaveProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const flashFeedback = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMsg(null);
    }, 2600);
  }, []);

  const loadLevel = useCallback(
    (spec: LevelSpec) => {
      if (victoryTimerRef.current) {
        window.clearTimeout(victoryTimerRef.current);
        victoryTimerRef.current = null;
      }
      const nextBoard = buildLevelBoard(spec);
      setCurrentSpec(spec);
      setPath([nextBoard.start]);
      setElapsedSec(0);
      setHintsUsed(0);
      setUndoCount(0);
      setRestartCount(0);
      setStepsTaken(0);
      setHintTier(0);
      setHintOverlay(null);
      setFeedbackMsg(null);
      setLastRunMetrics(null);
      setNewlyUnlockedTitles([]);
      setModal('NONE');
      setScreen('PLAYING');

      if (spec.chapter > 0) {
        updateProgress((prev) => ({ ...prev, lastLevelId: spec.id }));
      }
    },
    [updateProgress]
  );

  // Elapsed level timer (only ticks during active unobstructed gameplay)
  useEffect(() => {
    if (screen !== 'PLAYING' || modal !== 'NONE' || isComplete) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen, modal, isComplete]);

  // Cleanup stray timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
      if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !progress.muted;
    soundEngine.setMuted(nextMuted);
    if (!nextMuted) soundEngine.playClick();
    updateProgress((prev) => ({ ...prev, muted: nextMuted }));
  }, [progress.muted, updateProgress]);

  const handleEquipTitle = useCallback(
    (titleId: string | null) => {
      soundEngine.playClick();
      updateProgress((prev) => ({ ...prev, equippedTitleId: titleId }));
    },
    [updateProgress]
  );

  const handleComplete = useCallback(
    (
      finalHintsUsed: number,
      finalElapsedSec: number,
      finalUndoCount: number,
      finalRestartCount: number,
      finalStepsTaken: number
    ) => {
      const stars: 1 | 2 | 3 =
        finalHintsUsed === 0 ? 3 : finalHintsUsed === 1 ? 2 : 1;
      const metrics = evaluateRunMetrics(
        board,
        finalElapsedSec,
        finalHintsUsed,
        finalUndoCount,
        finalRestartCount,
        finalStepsTaken
      );
      setEarnedStars(stars);
      setLastRunMetrics(metrics);
      soundEngine.playVictory();

      const beforeSummary = computeScholarSummary(progress);
      const beforeUnlocked = new Set<string>([
        beforeSummary.careerRank.id,
        ...beforeSummary.badges.filter((b) => b.unlocked).map((b) => b.id),
      ]);

      let nextProgressSnapshot = progress;
      if (currentSpec.isDaily && currentSpec.dailyDate) {
        const existing = progress.dailyCompleted[currentSpec.dailyDate];
        nextProgressSnapshot = {
          ...progress,
          dailyCompleted: {
            ...progress.dailyCompleted,
            [currentSpec.dailyDate]: {
              stars: existing ? (Math.max(existing.stars, stars) as 1 | 2 | 3) : stars,
              timeSec: existing
                ? Math.min(existing.timeSec, finalElapsedSec)
                : finalElapsedSec,
              fluency: existing?.fluency
                ? Math.max(existing.fluency, metrics.fluencyScore)
                : metrics.fluencyScore,
              honor:
                !existing?.fluency || metrics.fluencyScore >= existing.fluency
                  ? metrics.honorTitle
                  : existing.honor,
            },
          },
        };
      } else if (currentSpec.chapter > 0) {
        const existing = progress.completed[currentSpec.id];
        const nextUnlock = Math.min(LEVELS.length, currentSpec.id + 1);
        const isBetterFluency =
          existing?.bestFluency === undefined ||
          metrics.fluencyScore >= existing.bestFluency;

        nextProgressSnapshot = {
          ...progress,
          lastLevelId: Math.max(progress.lastLevelId, nextUnlock),
          completed: {
            ...progress.completed,
            [currentSpec.id]: {
              stars: existing ? (Math.max(existing.stars, stars) as 1 | 2 | 3) : stars,
              bestTimeSec: existing
                ? Math.min(existing.bestTimeSec, finalElapsedSec)
                : finalElapsedSec,
              completedAt: Date.now(),
              bestFluency: existing?.bestFluency
                ? Math.max(existing.bestFluency, metrics.fluencyScore)
                : metrics.fluencyScore,
              bestStepsTaken: existing?.bestStepsTaken
                ? Math.min(existing.bestStepsTaken, metrics.stepsTaken)
                : metrics.stepsTaken,
              optimalSteps: metrics.optimalSteps,
              bestHonor: isBetterFluency
                ? metrics.honorTitle
                : existing?.bestHonor ?? metrics.honorTitle,
              perfectFluency: Boolean(
                existing?.perfectFluency || metrics.fluencyScore === 100
              ),
              zeroUndo: Boolean(
                existing?.zeroUndo ||
                  (finalUndoCount === 0 && metrics.stepsTaken <= metrics.optimalSteps)
              ),
              zeroHint: Boolean(existing?.zeroHint || finalHintsUsed === 0),
            },
          },
        };
      }

      const afterSummary = computeScholarSummary(nextProgressSnapshot);
      const unlockedNow: string[] = [];
      if (!beforeUnlocked.has(afterSummary.careerRank.id)) {
        unlockedNow.push(afterSummary.careerRank.title);
      }
      for (const b of afterSummary.badges) {
        if (b.unlocked && !beforeUnlocked.has(b.id)) {
          unlockedNow.push(b.title);
        }
      }
      setNewlyUnlockedTitles(unlockedNow);

      setProgress(nextProgressSnapshot);
      saveProgress(nextProgressSnapshot);

      victoryTimerRef.current = window.setTimeout(() => {
        setModal('VICTORY');
      }, 360);
    },
    [board, currentSpec, progress]
  );

  const handleStepTo = useCallback(
    (target: Coord): boolean => {
      if (modal !== 'NONE' || isComplete) return false;
      const res = applyStep(board, path, target);
      if (!res.nextPath) {
        if (res.reason) {
          soundEngine.playBlocked();
          setShakeTrigger((n) => n + 1);
          flashFeedback(res.reason);
        }
        return false;
      }

      const deltaSteps = Math.max(1, res.nextPath.length - path.length);
      const nextStepsTaken = stepsTaken + deltaSteps;
      setStepsTaken(nextStepsTaken);
      setPath(res.nextPath);
      setHintOverlay(null);
      setHintTier(0);

      if (isLevelComplete(board, res.nextPath)) {
        handleComplete(hintsUsed, elapsedSec, undoCount, restartCount, nextStepsTaken);
      } else if (res.event === 'portal') {
        soundEngine.playPortal();
      } else if (res.event === 'bridge') {
        soundEngine.playBridge(res.nextPath.length - 1);
      } else if (res.event === 'order' && res.orderNum) {
        soundEngine.playOrderSeal(res.orderNum);
      } else {
        soundEngine.playStep(res.nextPath.length - 1);
      }
      return true;
    },
    [
      board,
      elapsedSec,
      flashFeedback,
      handleComplete,
      hintsUsed,
      isComplete,
      modal,
      path,
      restartCount,
      stepsTaken,
      undoCount,
    ]
  );

  const handleUndo = useCallback(() => {
    if (modal !== 'NONE' || isComplete || path.length <= 1) return;
    const next = applyUndo(board, path);
    setPath(next);
    setUndoCount((c) => c + 1);
    setHintOverlay(null);
    setHintTier(0);
    soundEngine.playBacktrack();
  }, [board, isComplete, modal, path]);

  const handleTrimToIndex = useCallback(
    (idx: number) => {
      if (modal !== 'NONE' || isComplete) return;
      const next = trimPathToIndex(board, path, idx);
      if (next.length !== path.length) {
        setPath(next);
        setUndoCount((c) => c + 1);
        setHintOverlay(null);
        setHintTier(0);
        soundEngine.playBacktrack();
      }
    },
    [board, isComplete, modal, path]
  );

  const handleRestart = useCallback(() => {
    soundEngine.playClick();
    if (victoryTimerRef.current) {
      window.clearTimeout(victoryTimerRef.current);
      victoryTimerRef.current = null;
    }
    const wasFinished = isLevelComplete(board, path);
    setPath([board.start]);
    setHintOverlay(null);
    setHintTier(0);
    setFeedbackMsg(null);
    setModal('NONE');
    if (wasFinished) {
      // Fresh replay from Victory Modal resets all run metrics cleanly
      setElapsedSec(0);
      setHintsUsed(0);
      setUndoCount(0);
      setRestartCount(0);
      setStepsTaken(0);
      setLastRunMetrics(null);
      setNewlyUnlockedTitles([]);
    } else if (path.length > 1) {
      setRestartCount((c) => c + 1);
    }
  }, [board, path]);

  const handleHint = useCallback(() => {
    if (modal !== 'NONE' || isComplete) return;
    const nextTier = (hintTier >= 3 ? 3 : hintTier + 1) as 1 | 2 | 3;
    const computed = computeHint(board, path, nextTier);
    setHintTier(nextTier);
    setHintOverlay(computed);
    setHintsUsed((c) => c + 1);
    soundEngine.playClick();
    flashFeedback(computed.message);
  }, [board, flashFeedback, hintTier, isComplete, modal, path]);

  const handleStartPrimary = useCallback(() => {
    soundEngine.playClick();
    const target = LEVELS.find((l) => l.id === progress.lastLevelId) ?? LEVELS[0];
    loadLevel(target);
  }, [loadLevel, progress.lastLevelId]);

  const handleStartDaily = useCallback(() => {
    soundEngine.playClick();
    const daily = getTodayDailyLevel();
    loadLevel(daily);
  }, [loadLevel]);

  const handleStartEndless = useCallback(() => {
    soundEngine.playClick();
    const seed = `inkpath-random-${Date.now()}-${randomCounterRef.current++}`;
    const randomLevel = generateProceduralLevel(seed, `随机雅局 #${randomCounterRef.current - 1}`, false);
    loadLevel(randomLevel);
  }, [loadLevel]);

  const handleSelectLevelById = useCallback(
    (levelId: number) => {
      soundEngine.playClick();
      const found = LEVELS.find((l) => l.id === levelId);
      if (found) loadLevel(found);
    },
    [loadLevel]
  );

  const handleNextLevel = useCallback(() => {
    soundEngine.playClick();
    const next = LEVELS.find((l) => l.id === currentSpec.id + 1);
    if (next) {
      loadLevel(next);
    } else {
      handleStartEndless();
    }
  }, [currentSpec.id, handleStartEndless, loadLevel]);

  // Global Keyboard Controls (WASD / Arrows, Undo, Restart, Hint, Mute, Esc, Enter/Space)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (screen === 'TITLE_MENU') {
        if ((modal === 'LEVEL_SELECT' || modal === 'SCHOLAR_DASHBOARD') && e.key === 'Escape') {
          e.preventDefault();
          setModal('NONE');
          return;
        }
        if (modal === 'NONE' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleStartPrimary();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (modal === 'NONE') setModal('PAUSED');
        else if (
          modal === 'PAUSED' ||
          modal === 'LEVEL_SELECT' ||
          modal === 'SCHOLAR_DASHBOARD'
        ) {
          setModal('NONE');
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (modal === 'VICTORY') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (currentSpec.chapter > 0 && currentSpec.id < LEVELS.length) {
            handleNextLevel();
          } else {
            handleStartEndless();
          }
        }
        return;
      }

      if (modal !== 'NONE' || isComplete) return;

      const head = path[path.length - 1];
      if (!head) return;

      let dr = 0;
      let dc = 0;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dr = -1;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dr = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dc = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dc = 1;

      if (dr !== 0 || dc !== 0) {
        e.preventDefault();
        const target = { r: head.r + dr, c: head.c + dc };
        // If pressing back toward previous tile, undo cleanly
        if (path.length >= 2) {
          const prev = path[path.length - 2];
          if (prev.r === target.r && prev.c === target.c) {
            handleUndo();
            return;
          }
        }
        handleStepTo(target);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRestart();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleHint();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentSpec.chapter,
    currentSpec.id,
    handleHint,
    handleNextLevel,
    handleRestart,
    handleStartEndless,
    handleStartPrimary,
    handleStepTo,
    handleToggleMute,
    handleUndo,
    isComplete,
    modal,
    path,
    screen,
  ]);

  if (screen === 'TITLE_MENU') {
    return (
      <>
        <TitleScreen
          progress={progress}
          muted={progress.muted}
          onToggleMute={handleToggleMute}
          onStartPrimary={handleStartPrimary}
          onOpenLevelSelect={() => {
            soundEngine.playClick();
            setModal('LEVEL_SELECT');
          }}
          onOpenDashboard={() => {
            soundEngine.playClick();
            setModal('SCHOLAR_DASHBOARD');
          }}
          onStartDaily={handleStartDaily}
        />
        {modal === 'LEVEL_SELECT' && (
          <LevelSelectModal
            currentLevelId={null}
            progress={progress}
            onSelectLevel={handleSelectLevelById}
            onStartDaily={handleStartDaily}
            onStartEndless={handleStartEndless}
            onOpenDashboard={() => {
              soundEngine.playClick();
              setModal('SCHOLAR_DASHBOARD');
            }}
            onClose={() => setModal('NONE')}
          />
        )}
        {modal === 'SCHOLAR_DASHBOARD' && (
          <ScholarDashboardModal
            progress={progress}
            onEquipTitle={handleEquipTitle}
            onClose={() => setModal('NONE')}
          />
        )}
      </>
    );
  }

  const chapterMeta = CHAPTERS.find((c) => c.id === currentSpec.chapter);
  const progressPct = Math.round((path.length / board.totalSteps) * 100);
  const levelLabel =
    currentSpec.chapter > 0
      ? `第 ${String(currentSpec.id).padStart(2, '0')} 关`
      : currentSpec.isDaily
      ? '每日雅局'
      : '随机演练';
  const todayStr = getTodayDateString();
  const activeCaption = feedbackMsg ?? currentSpec.tip ?? null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#131e21] flex flex-col lg:flex-row">
      {/* Subtle Celadon Stone Backdrop Texture */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {!textureFailed ? (
          <img
            src={BOARD_TEXTURE_SRC}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setTextureFailed(true)}
            className="w-full h-full object-cover opacity-55"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#172529] to-[#101a1d]" />
        )}
        <div className="absolute inset-0 bg-[#121e21]/55" />
      </div>

      {/* ==================== MOBILE TOP HUD BAR (< lg, compact <= 8% viewport) ==================== */}
      <header className="lg:hidden relative z-20 shrink-0 pt-safe px-3 h-14 flex items-center justify-between gap-2 border-b border-[#253a3f]/80 bg-[#142125]/90">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setModal('PAUSED');
          }}
          aria-label="暂停与规则"
          className="min-h-[44px] min-w-[44px] rounded-xl text-[#d7e2df] hover:bg-[#203338] flex items-center justify-center shrink-0"
        >
          <Pause className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#f3efe6] truncate">
            <span className="font-mono-num text-[#e9c46a]">{levelLabel}</span>
            <span className="text-[#557075]" aria-hidden="true">·</span>
            <span className="font-display truncate">{currentSpec.title}</span>
          </div>
          <div className="text-[11px] text-[#9cb3af] font-mono-num">
            <span>{path.length}/{board.totalSteps} 步</span>
            <span className="mx-1.5 text-[#4d666b]" aria-hidden="true">·</span>
            <span>{formatClock(elapsedSec)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={progress.muted ? '开启音效' : '关闭音效'}
          className="min-h-[44px] min-w-[44px] rounded-xl text-[#d7e2df] hover:bg-[#203338] flex items-center justify-center shrink-0"
        >
          {progress.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </header>

      {/* ==================== MAIN UNOBSTRUCTED PLAYFIELD STAGE ==================== */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-3 py-2 sm:px-6 sm:py-4 lg:p-10">
        {/* Desktop minimal perimeter controls (unobtrusive, never blocking playfield) */}
        <div className="hidden lg:flex pointer-events-none absolute top-5 inset-x-7 items-center justify-between z-20">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setScreen('TITLE_MENU');
              setModal('NONE');
            }}
            className="pointer-events-auto min-h-[44px] px-3.5 rounded-xl bg-[#162529]/85 hover:bg-[#1f3339] border border-[#2f474d] text-[#d7e2df] text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Home className="w-4 h-4 text-[#e9c46a] shrink-0" />
            <span className="font-display tracking-wider">墨径</span>
          </button>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={progress.muted ? '开启音效' : '关闭音效'}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#162529]/85 hover:bg-[#1f3339] border border-[#2f474d] text-[#d7e2df] transition-colors flex items-center justify-center"
            >
              {progress.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setModal('PAUSED');
              }}
              aria-label="暂停与规则"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#162529]/85 hover:bg-[#1f3339] border border-[#2f474d] text-[#d7e2df] text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Pause className="w-4 h-4 shrink-0" />
              <span>暂停</span>
            </button>
          </div>
        </div>

        {/* Centered Responsive Board Container */}
        <div className="w-full flex-1 min-h-0 flex items-center justify-center max-w-[540px] lg:max-w-[600px] xl:max-w-[640px] max-h-[540px] lg:max-h-[600px]">
          <PuzzleBoard
            board={board}
            path={path}
            hint={hintOverlay}
            isComplete={isComplete}
            shakeTrigger={shakeTrigger}
            onStepTo={handleStepTo}
            onUndo={handleUndo}
            onTrimToIndex={handleTrimToIndex}
          />
        </div>

        {/* Quiet single-line contextual tip / feedback below board (never occludes tiles) */}
        <div className="shrink-0 h-7 mt-2 flex items-center justify-center px-2">
          {activeCaption && (
            <p
              className={`text-xs sm:text-sm text-center truncate max-w-md transition-opacity duration-150 ${
                feedbackMsg ? 'text-[#f6df9e]' : 'text-[#9bb2ae]'
              }`}
            >
              {activeCaption}
            </p>
          )}
        </div>
      </main>

      {/* ==================== MOBILE BOTTOM THUMB DOCK (< lg) ==================== */}
      <nav
        aria-label="解谜操作栏"
        className="lg:hidden relative z-20 shrink-0 pb-safe px-3 pt-2 border-t border-[#253a3f]/80 bg-[#142125]/92"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={path.length <= 1 || isComplete}
            className="min-h-[48px] rounded-xl bg-[#1d3035] active:scale-[0.97] disabled:opacity-40 border border-[#314a50] text-[#ebe6db] flex flex-col items-center justify-center gap-0.5 transition-transform"
          >
            <Undo2 className="w-4 h-4 text-[#b4ccc6]" />
            <span className="text-[11px] font-medium whitespace-nowrap">撤步</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="min-h-[48px] rounded-xl bg-[#1d3035] active:scale-[0.97] border border-[#314a50] text-[#ebe6db] flex flex-col items-center justify-center gap-0.5 transition-transform"
          >
            <RotateCcw className="w-4 h-4 text-[#b4ccc6]" />
            <span className="text-[11px] font-medium whitespace-nowrap">重开</span>
          </button>

          <button
            type="button"
            onClick={handleHint}
            disabled={isComplete}
            className="min-h-[48px] rounded-xl bg-[#273832] active:scale-[0.97] disabled:opacity-40 border border-[#567461] text-[#f6df9e] flex flex-col items-center justify-center gap-0.5 transition-transform"
          >
            <Lightbulb className="w-4 h-4 text-[#e9c46a]" />
            <span className="text-[11px] font-medium whitespace-nowrap font-mono-num">
              {hintTier > 0 ? `锦囊 ${hintTier}/3` : '锦囊'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setModal('LEVEL_SELECT');
            }}
            className="min-h-[48px] rounded-xl bg-[#1d3035] active:scale-[0.97] border border-[#314a50] text-[#ebe6db] flex flex-col items-center justify-center gap-0.5 transition-transform"
          >
            <Grid2x2 className="w-4 h-4 text-[#b4ccc6]" />
            <span className="text-[11px] font-medium whitespace-nowrap">选关</span>
          </button>
        </div>
      </nav>

      {/* ==================== DESKTOP ARCHITECTURAL SIDE RAIL (lg+) ==================== */}
      <aside className="hidden lg:flex relative z-20 w-[340px] xl:w-[376px] shrink-0 flex-col justify-between bg-[#152327]/95 border-l border-[#294045] p-6 xl:p-7 overflow-y-auto">
        {/* Level Header & Telemetry */}
        <div>
          {/* Integrated Player Calligrapher Title Card */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setModal('SCHOLAR_DASHBOARD');
            }}
            className="w-full mb-5 p-3 rounded-xl bg-[#111c1f] hover:bg-[#18272b] border border-[#2a4045] hover:border-[#d9a74a]/65 transition-colors flex items-center gap-3 text-left"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#c94433] border border-[#ef9888]/75 font-display text-base font-bold text-[#faf4ee] shrink-0">
              {scholar.activeTitle.sealChar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#f6df9e] tracking-wider truncate">
                  {scholar.activeTitle.title}
                </span>
                <span className="text-[11px] text-[#9cb3af] whitespace-nowrap shrink-0 flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#e9c46a]" />
                  <span>雅士录</span>
                </span>
              </div>
              <div className="mt-0.5 font-mono-num text-[11px] text-[#8fa7a3] truncate">
                <span>通 {scholar.completedCount}/{scholar.totalLevels}</span>
                <span className="mx-1.5 text-[#465e63]" aria-hidden="true">·</span>
                <span>连贯 {scholar.completedCount > 0 ? `${scholar.avgFluency}%` : '--'}</span>
                <span className="mx-1.5 text-[#465e63]" aria-hidden="true">·</span>
                <span>印号 {scholar.unlockedBadgeCount}/{scholar.badges.length}</span>
              </div>
            </div>
          </button>

          <p className="text-xs text-[#8fa8a4] tracking-wide">
            {chapterMeta ? chapterMeta.title : currentSpec.isDaily ? `每日雅局 · ${todayStr}` : '无尽演练'}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <span className="font-mono-num text-sm font-semibold text-[#e9c46a]">
              {levelLabel}
            </span>
            <h1 className="font-display text-2xl font-bold text-[#f3efe6] tracking-wide">
              {currentSpec.title}
            </h1>
          </div>

          {/* Step progress bar & numeric telemetry */}
          <div className="mt-4 pt-4 border-t border-[#253a3f]">
            <div className="flex items-center justify-between text-xs text-[#9cb3af] font-mono-num">
              <span>石阶进度</span>
              <span className="text-[#f3efe6] font-semibold">
                {path.length} / {board.totalSteps} 步
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[#101a1d] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c78f34] to-[#f1cf7a] transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[#8ba39f]">耗时</span>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-[#f3efe6]">
                  {formatClock(elapsedSec)}
                </div>
              </div>
              <div>
                <span className="text-[#8ba39f]">撤步</span>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-[#f3efe6]">
                  {undoCount} 次
                </div>
              </div>
              <div>
                <span className="text-[#8ba39f]">锦囊</span>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-[#f3efe6]">
                  {hintsUsed} 次
                </div>
              </div>
            </div>
          </div>

          {/* Active Level Mechanics Legend (only symbols present in this level) */}
          <div className="mt-5 pt-5 border-t border-[#253a3f]">
            <h2 className="text-xs font-medium text-[#9bb2ae] mb-3">本局石印图例</h2>
            <ul className="space-y-2.5 text-xs text-[#cddcd9] leading-relaxed">
              <li className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#c94433] text-[#faf4ee] font-display font-bold text-xs shrink-0">
                  起
                </span>
                <span>起点朱印，从此落笔一气连遍所有青石</span>
              </li>
              {board.end && (
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#2a5c4e] border border-[#6cbca3] text-[#e6f7f1] font-display font-bold text-xs shrink-0">
                    终
                  </span>
                  <span>终点青莲，须在走遍所有石板后最后抵达</span>
                </li>
              )}
              {board.hasOrder && (
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#172529] border border-[#86a8a0] text-[#f3efe6] font-mono-num font-bold text-xs shrink-0">
                    1
                  </span>
                  <span>序印须按 1 → {board.maxOrder} 顺序依次连接</span>
                </li>
              )}
              {board.hasBridge && (
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#493824] border border-[#8a6b43] text-[#f1cf7a] font-mono-num font-bold text-xs shrink-0">
                    十
                  </span>
                  <span>飞桥须横竖各直行通过一次，桥面不可折转</span>
                </li>
              )}
              {board.hasPortal && (
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1a3a42] border border-[#5cc8d7] text-[#f3efe6] font-display font-bold text-xs shrink-0">
                    甲
                  </span>
                  <span>成对月门互通，步入即从另一月门穿出</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Desktop Action Cluster */}
        <div className="pt-5 border-t border-[#253a3f] space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={path.length <= 1 || isComplete}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] disabled:opacity-40 border border-[#344e54] text-[#efeae0] text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Undo2 className="w-4 h-4 shrink-0" />
              <span>撤回一步</span>
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1e3136] hover:bg-[#273f45] border border-[#344e54] text-[#efeae0] text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>重新开始</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleHint}
            disabled={isComplete}
            className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#273b34] hover:bg-[#314a41] disabled:opacity-40 border border-[#567866] text-[#f6df9e] text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Lightbulb className="w-4 h-4 text-[#e9c46a] shrink-0" />
            <span>
              {hintTier === 0
                ? '开启锦囊提示（一阶）'
                : hintTier === 1
                ? '加深提示（二阶 · 6步）'
                : '展开完整金径（三阶）'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setModal('LEVEL_SELECT');
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#18272b] hover:bg-[#21353a] border border-[#2d4348] text-[#cddcd9] text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Grid2x2 className="w-4 h-4 shrink-0" />
              <span>选关目录</span>
            </button>

            <button
              type="button"
              onClick={handleStartDaily}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#18272b] hover:bg-[#21353a] border border-[#2d4348] text-[#cddcd9] text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-[#e9c46a] shrink-0" />
              <span>每日雅局</span>
            </button>
          </div>

          <p className="pt-2 text-[11px] text-[#7c9490] text-center">
            拖拽连线 · 方向键移动 · Z 撤步 · R 重开 · H 锦囊
          </p>
        </div>
      </aside>

      {/* ==================== MODALS ==================== */}
      {modal === 'PAUSED' && (
        <PauseModal
          muted={progress.muted}
          onResume={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
          onRestart={handleRestart}
          onOpenLevelSelect={() => {
            soundEngine.playClick();
            setModal('LEVEL_SELECT');
          }}
          onOpenDashboard={() => {
            soundEngine.playClick();
            setModal('SCHOLAR_DASHBOARD');
          }}
          onToggleMute={handleToggleMute}
          onBackToTitle={() => {
            soundEngine.playClick();
            setModal('NONE');
            setScreen('TITLE_MENU');
          }}
        />
      )}

      {modal === 'LEVEL_SELECT' && (
        <LevelSelectModal
          currentLevelId={currentSpec.chapter > 0 ? currentSpec.id : null}
          progress={progress}
          onSelectLevel={handleSelectLevelById}
          onStartDaily={handleStartDaily}
          onStartEndless={handleStartEndless}
          onOpenDashboard={() => {
            soundEngine.playClick();
            setModal('SCHOLAR_DASHBOARD');
          }}
          onClose={() => setModal('NONE')}
        />
      )}

      {modal === 'SCHOLAR_DASHBOARD' && (
        <ScholarDashboardModal
          progress={progress}
          onEquipTitle={handleEquipTitle}
          onClose={() => setModal('NONE')}
        />
      )}

      {modal === 'VICTORY' && lastRunMetrics && (
        <VictoryModal
          level={currentSpec}
          stars={earnedStars}
          runMetrics={lastRunMetrics}
          newlyUnlockedTitles={newlyUnlockedTitles}
          hasNextLevel={currentSpec.chapter > 0 && currentSpec.id < LEVELS.length}
          onNextLevel={handleNextLevel}
          onReplay={handleRestart}
          onOpenLevelSelect={() => {
            soundEngine.playClick();
            setModal('LEVEL_SELECT');
          }}
          onOpenDashboard={() => {
            soundEngine.playClick();
            setModal('SCHOLAR_DASHBOARD');
          }}
          onNextRandom={handleStartEndless}
        />
      )}
    </div>
  );
}
