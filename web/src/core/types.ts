export type Position = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Segment = { pos: Position; color: string };

export type FoodItem = { pos: Position; variant: number };

export type PowerUpItem = { pos: Position; defId: string };

export type ActiveEffect = { defId: string; remainingTicks: number };

export type GridConfig = { cols: number; rows: number; cellSize: number };

export type GameState = {
  grid: GridConfig;
  snake: Segment[];
  food: FoodItem;
  powerUpItems: PowerUpItem[];
  activeEffects: ActiveEffect[];
  dir: Direction;
  nextDir: Direction;
  score: number;
  highScore: number;
  tickIndex: number;
  status: 'idle' | 'playing' | 'paused' | 'gameover';
};

export interface PowerUpDef {
  id: string;
  color: string;
  symbol: string;
  spawnWeight: number;
  duration: number;
  apply: (state: GameState) => Partial<GameState>;
  onExpire?: (state: GameState) => Partial<GameState>;
  // Optional resolution contributions — derived by tick() from activeEffects:
  tickMultiplier?: number;   // multiplies BASE_TICK_MS (2 = slower, 0.5 = faster)
  scoreMultiplier?: number;  // multiplies score on food eat
  ghostMode?: boolean;       // disables self-collision
  shieldOnApply?: number;    // shields granted on pickup
}
