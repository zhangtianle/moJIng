import { LEVELS } from './levels';
import { LevelBoard, LevelRecord, LevelRunMetrics, SaveProgress } from './types';

export interface ScholarRankDef {
  id: string;
  title: string;
  sealChar: string;
  subtitle: string;
  requirementText: string;
  minLevels: number;
  minAvgFluency: number;
  minPerfectCount?: number;
  maxAvgSecPerStep?: number;
}

export interface CalligrapherTitleBadge {
  id: string;
  title: string;
  sealChar: string;
  category: '连贯' | '步法' | '神速' | '雅修';
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface PlayerScholarSummary {
  careerRank: ScholarRankDef;
  nextRank: ScholarRankDef | null;
  activeTitle: {
    id: string;
    title: string;
    sealChar: string;
    subtitle: string;
  };
  badges: CalligrapherTitleBadge[];
  unlockedBadgeCount: number;
  completedCount: number;
  totalLevels: number;
  totalStars: number;
  maxStars: number;
  avgFluency: number;
  stepPrecisionPct: number;
  avgSecPerStep: number;
  perfectRunCount: number;
  zeroUndoCount: number;
  dailyCount: number;
}

export const CAREER_RANKS: ScholarRankDef[] = [
  {
    id: 'rank_0',
    title: '初执墨毫',
    sealChar: '初',
    subtitle: '始入青瓷庭院，蓄势待发',
    requirementText: '完成第 1 关即可晋升',
    minLevels: 0,
    minAvgFluency: 0,
  },
  {
    id: 'rank_1',
    title: '青阶书童',
    sealChar: '童',
    subtitle: '落笔有度，初通石阶行径',
    requirementText: '完成 1 关',
    minLevels: 1,
    minAvgFluency: 0,
  },
  {
    id: 'rank_2',
    title: '临池墨客',
    sealChar: '客',
    subtitle: '行笔沉稳，渐识回廊奥妙',
    requirementText: '完成 4 关',
    minLevels: 4,
    minAvgFluency: 0,
  },
  {
    id: 'rank_3',
    title: '素石清士',
    sealChar: '清',
    subtitle: '序印井然，连贯如水',
    requirementText: '完成 8 关且平均连贯度 ≥ 70%',
    minLevels: 8,
    minAvgFluency: 70,
  },
  {
    id: 'rank_4',
    title: '行草逸人',
    sealChar: '逸',
    subtitle: '转折自如，飞桥亦难阻其锋',
    requirementText: '完成 12 关且平均连贯度 ≥ 80%',
    minLevels: 12,
    minAvgFluency: 80,
  },
  {
    id: 'rank_5',
    title: '金缮丹青',
    sealChar: '丹',
    subtitle: '笔断意连，月门穿梭成章',
    requirementText: '完成 16 关且平均连贯度 ≥ 85%',
    minLevels: 16,
    minAvgFluency: 85,
  },
  {
    id: 'rank_6',
    title: '兰亭雅士',
    sealChar: '雅',
    subtitle: '一气贯庭院，已有大家气象',
    requirementText: '完成 20 关且 3 关以上达成一气呵成',
    minLevels: 20,
    minAvgFluency: 85,
    minPerfectCount: 3,
  },
  {
    id: 'rank_7',
    title: '通幽书圣',
    sealChar: '圣',
    subtitle: '廿四局全破，行云流水入化境',
    requirementText: '通关全部 24 关、均连贯度 ≥ 90% 且单步 ≤ 1.8s',
    minLevels: 24,
    minAvgFluency: 90,
    maxAvgSecPerStep: 1.8,
  },
];

/**
 * Evaluate a single completed puzzle run based on continuity (undo/restart/hint),
 * step efficiency (actual forward steps vs optimal steps), and elapsed time.
 */
export function evaluateRunMetrics(
  board: LevelBoard,
  elapsedSec: number,
  hintsUsed: number,
  undoCount: number,
  restartCount: number,
  stepsTaken: number
): LevelRunMetrics {
  const optimalSteps = Math.max(1, board.totalSteps - 1);
  const actualSteps = Math.max(optimalSteps, stepsTaken);
  const extraSteps = Math.max(0, actualSteps - optimalSteps);

  // Fluency measures unbroken one-stroke continuity (0 - 100)
  const penalty =
    undoCount * 10 +
    Math.min(24, extraSteps * 3) +
    restartCount * 14 +
    hintsUsed * 15;
  const fluencyScore = Math.max(20, Math.min(100, Math.round(100 - penalty)));

  const secPerStep = elapsedSec / optimalSteps;
  const isSwift = secPerStep <= 1.25 && elapsedSec <= Math.max(18, optimalSteps * 1.35);
  const isPerfectStroke = undoCount === 0 && restartCount === 0 && hintsUsed === 0 && extraSteps === 0;

  let honorTitle = '循墨通幽';
  let honorDesc = '稳步探径，终成全篇';

  if (isPerfectStroke && isSwift) {
    honorTitle = '行云流水';
    honorDesc = '零撤步疾行贯通，神完气足';
  } else if (isPerfectStroke) {
    honorTitle = '一气呵成';
    honorDesc = '不退一步、未借锦囊，一笔成画';
  } else if (isSwift && fluencyScore >= 75) {
    honorTitle = '笔走龙蛇';
    honorDesc = '落笔迅捷，连贯流畅';
  } else if (undoCount === 0 && extraSteps === 0 && hintsUsed <= 1) {
    honorTitle = '落墨无悔';
    honorDesc = '步步精准，未曾折返';
  } else if (hintsUsed === 0 && fluencyScore >= 70) {
    honorTitle = '沉思入微';
    honorDesc = '独运匠心，从容破局';
  } else if (hintsUsed === 0) {
    honorTitle = '百折不挠';
    honorDesc = '屡试终通，自有顿悟';
  }

  return {
    elapsedSec,
    hintsUsed,
    undoCount,
    restartCount,
    stepsTaken: actualSteps,
    optimalSteps,
    fluencyScore,
    honorTitle,
    honorDesc,
  };
}

function getRecordOptimalSteps(levelId: number, rec: LevelRecord): number {
  if (rec.optimalSteps && rec.optimalSteps > 0) return rec.optimalSteps;
  const lv = LEVELS.find((l) => l.id === levelId);
  return lv ? Math.max(1, lv.solution.length - 1) : 14;
}

function getRecordFluency(rec: LevelRecord): number {
  if (typeof rec.bestFluency === 'number') return rec.bestFluency;
  // Graceful fallback for legacy saves created before title tracking
  return rec.stars === 3 ? 92 : rec.stars === 2 ? 78 : 65;
}

export function computeScholarSummary(progress: SaveProgress): PlayerScholarSummary {
  const entries = Object.entries(progress.completed).map(([idStr, rec]) => ({
    id: Number(idStr),
    rec,
  }));

  const completedCount = entries.length;
  const totalLevels = LEVELS.length;
  const totalStars = entries.reduce((sum, e) => sum + e.rec.stars, 0);
  const maxStars = totalLevels * 3;
  const dailyCount = Object.keys(progress.dailyCompleted).length;

  let fluencySum = 0;
  let optimalSum = 0;
  let actualStepsSum = 0;
  let timeSum = 0;
  let perfectRunCount = 0;
  let zeroUndoCount = 0;
  let swiftCleanCount = 0;
  let highFluencyCount = 0;
  let advancedCleanCount = 0;

  for (const { id, rec } of entries) {
    const fluency = getRecordFluency(rec);
    const opt = getRecordOptimalSteps(id, rec);
    const actual = rec.bestStepsTaken ? Math.max(opt, rec.bestStepsTaken) : opt;

    fluencySum += fluency;
    optimalSum += opt;
    actualStepsSum += actual;
    timeSum += Math.max(1, rec.bestTimeSec);

    const isPerfect = rec.perfectFluency ?? fluency >= 100;
    const isZeroUndo = rec.zeroUndo ?? (rec.bestStepsTaken ? rec.bestStepsTaken <= opt : rec.stars === 3);
    const isZeroHint = rec.zeroHint ?? rec.stars === 3;

    if (isPerfect) perfectRunCount++;
    if (isZeroUndo) zeroUndoCount++;
    if (fluency >= 85) highFluencyCount++;
    if (rec.bestTimeSec / opt <= 1.05 && fluency >= 85) swiftCleanCount++;

    const lv = LEVELS.find((l) => l.id === id);
    if (lv && lv.chapter >= 3 && isZeroHint) {
      advancedCleanCount++;
    }
  }

  const avgFluency = completedCount > 0 ? Math.round(fluencySum / completedCount) : 0;
  const stepPrecisionPct =
    actualStepsSum > 0 ? Math.min(100, Math.round((optimalSum / actualStepsSum) * 100)) : 0;
  const avgSecPerStep =
    optimalSum > 0 ? Number((timeSum / optimalSum).toFixed(2)) : 0;

  // Determine highest unlocked Career Rank
  let rankIdx = 0;
  for (let i = 1; i < CAREER_RANKS.length; i++) {
    const r = CAREER_RANKS[i];
    const meetsLevels = completedCount >= r.minLevels;
    const meetsFluency = avgFluency >= r.minAvgFluency;
    const meetsPerfect = !r.minPerfectCount || perfectRunCount >= r.minPerfectCount;
    const meetsSpeed =
      !r.maxAvgSecPerStep || (avgSecPerStep > 0 && avgSecPerStep <= r.maxAvgSecPerStep);
    if (meetsLevels && meetsFluency && meetsPerfect && meetsSpeed) {
      rankIdx = i;
    }
  }

  const careerRank = CAREER_RANKS[rankIdx];
  const nextRank = rankIdx + 1 < CAREER_RANKS.length ? CAREER_RANKS[rankIdx + 1] : null;

  // 6 Thematic Unlockable Calligraphy Titles
  const badges: CalligrapherTitleBadge[] = [
    {
      id: 'badge_perfect_one',
      title: '一笔惊鸿',
      sealChar: '鸿',
      category: '连贯',
      description: '任意关卡以 100% 连贯度（零撤步、零提示）一气贯通',
      unlocked: perfectRunCount >= 1,
      progressText: `${Math.min(1, perfectRunCount)} / 1 关`,
    },
    {
      id: 'badge_swift_ink',
      title: '疾风骤墨',
      sealChar: '疾',
      category: '神速',
      description: '任意关卡单步平均耗时 ≤ 1.05 秒且连贯度 ≥ 85%',
      unlocked: swiftCleanCount >= 1,
      progressText: `${Math.min(1, swiftCleanCount)} / 1 关`,
    },
    {
      id: 'badge_no_regret',
      title: '无悔书魂',
      sealChar: '魂',
      category: '步法',
      description: '累计 5 关达成零撤步精准通关（实走步数等于最优步数）',
      unlocked: zeroUndoCount >= 5,
      progressText: `${Math.min(5, zeroUndoCount)} / 5 关`,
    },
    {
      id: 'badge_iron_stroke',
      title: '铁画银钩',
      sealChar: '钩',
      category: '步法',
      description: '零锦囊提示攻克任意「飞桥渡墨」或「月门洞天」关卡',
      unlocked: advancedCleanCount >= 1,
      progressText: `${Math.min(1, advancedCleanCount)} / 1 关`,
    },
    {
      id: 'badge_nine_dragons',
      title: '九曲游龙',
      sealChar: '龙',
      category: '连贯',
      description: '累计 10 关连贯度达到 85% 及以上',
      unlocked: highFluencyCount >= 10,
      progressText: `${Math.min(10, highFluencyCount)} / 10 关`,
    },
    {
      id: 'badge_daily_scholar',
      title: '日课雅士',
      sealChar: '课',
      category: '雅修',
      description: '完成任意一日的「每日雅局」挑战',
      unlocked: dailyCount >= 1,
      progressText: `${Math.min(1, dailyCount)} / 1 日`,
    },
  ];

  const unlockedBadgeCount = badges.filter((b) => b.unlocked).length;

  // Resolve currently equipped title (fallback to careerRank)
  let activeTitle = {
    id: careerRank.id,
    title: careerRank.title,
    sealChar: careerRank.sealChar,
    subtitle: careerRank.subtitle,
  };

  if (progress.equippedTitleId) {
    const matchedBadge = badges.find(
      (b) => b.id === progress.equippedTitleId && b.unlocked
    );
    if (matchedBadge) {
      activeTitle = {
        id: matchedBadge.id,
        title: matchedBadge.title,
        sealChar: matchedBadge.sealChar,
        subtitle: matchedBadge.description,
      };
    }
  }

  return {
    careerRank,
    nextRank,
    activeTitle,
    badges,
    unlockedBadgeCount,
    completedCount,
    totalLevels,
    totalStars,
    maxStars,
    avgFluency,
    stepPrecisionPct,
    avgSecPerStep,
    perfectRunCount,
    zeroUndoCount,
    dailyCount,
  };
}
