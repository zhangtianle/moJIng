export interface Coord {
  r: number;
  c: number;
}

export type TileKind = 'empty' | 'wall' | 'start' | 'end' | 'order' | 'bridge' | 'portal';

export type PortalId = 'A' | 'B';

export interface TileData {
  r: number;
  c: number;
  kind: TileKind;
  order?: number;
  portalId?: PortalId;
}

export interface ChapterInfo {
  id: number;
  title: string;
  subtitle: string;
  mechanicTag: string;
}

export interface LevelSpec {
  id: number;
  chapter: number;
  title: string;
  subtitle?: string;
  rows: number;
  cols: number;
  solution: Coord[];
  hasEnd?: boolean;
  orders?: Array<{ coord: Coord; order: number }>;
  bridges?: Coord[];
  portals?: Array<{ id: PortalId; a: Coord; b: Coord }>;
  tip?: string;
  isDaily?: boolean;
  dailyDate?: string;
}

export interface LevelBoard {
  spec: LevelSpec;
  grid: TileData[][];
  start: Coord;
  end: Coord | null;
  totalSteps: number;
  portalPairs: Record<PortalId, [Coord, Coord] | undefined>;
  maxOrder: number;
  hasBridge: boolean;
  hasPortal: boolean;
  hasOrder: boolean;
}

export type GameScreen = 'TITLE_MENU' | 'PLAYING';

export type ActiveModal = 'NONE' | 'PAUSED' | 'LEVEL_SELECT' | 'VICTORY';

export interface LevelRecord {
  stars: 1 | 2 | 3;
  bestTimeSec: number;
  completedAt: number;
}

export interface SaveProgress {
  completed: Record<number, LevelRecord>;
  dailyCompleted: Record<string, { timeSec: number; stars: 1 | 2 | 3 }>;
  lastLevelId: number;
  muted: boolean;
}

export interface HintOverlay {
  tier: 1 | 2 | 3;
  path: Coord[];
  backtrackToIndex: number | null;
  message: string;
}
