import { BASE_COLS, BASE_ROWS, BASE_TICK_MS, POWERUP_SPAWN_EVERY_N_FOOD } from '../config.js';
import type { ActiveEffect, Direction, FoodItem, GameState, GridConfig, Position, Segment } from './types.js';
import { get as registryGet, tryWeightedRandom } from './powerups/registry.js';

// ---------- effect resolution ----------

type ResolvedEffects = {
  tickMultiplier: number;
  scoreMultiplier: number;
  ghostMode: boolean;
  shieldCount: number;
};

function resolveEffects(effects: ActiveEffect[]): ResolvedEffects {
  let tickMultiplier = 1;
  let scoreMultiplier = 1;
  let ghostMode = false;
  let shieldCount = 0;
  for (const e of effects) {
    const def = registryGet(e.defId);
    if (!def) continue;
    if (def.tickMultiplier !== undefined) tickMultiplier *= def.tickMultiplier;
    if (def.scoreMultiplier !== undefined) scoreMultiplier *= def.scoreMultiplier;
    if (def.ghostMode) ghostMode = true;
    if (def.shieldOnApply !== undefined) shieldCount += def.shieldOnApply;
  }
  return { tickMultiplier, scoreMultiplier, ghostMode, shieldCount };
}

/** Effective tick duration in ms for the current state — used by loop.ts. */
export function effectiveTickMs(effects: ActiveEffect[]): number {
  let multiplier = 1;
  for (const e of effects) {
    const def = registryGet(e.defId);
    if (def?.tickMultiplier !== undefined) multiplier *= def.tickMultiplier;
  }
  return BASE_TICK_MS * multiplier;
}

// ---------- helpers ----------

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

function advance(pos: Position, dir: Direction, grid: GridConfig): Position {
  const { cols, rows } = grid;
  switch (dir) {
    case 'right': return { x: (pos.x + 1) % cols,       y: pos.y };
    case 'left':  return { x: (pos.x - 1 + cols) % cols, y: pos.y };
    case 'down':  return { x: pos.x, y: (pos.y + 1) % rows };
    case 'up':    return { x: pos.x, y: (pos.y - 1 + rows) % rows };
  }
}

function posEq(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function freeCell(occupied: Position[], grid: GridConfig): Position | null {
  const free: Position[] = [];
  for (let x = 0; x < grid.cols; x++) {
    for (let y = 0; y < grid.rows; y++) {
      if (!occupied.some(p => posEq(p, { x, y }))) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function spawnFood(occupied: Position[], grid: GridConfig): FoodItem {
  const pos = freeCell(occupied, grid);
  return { pos: pos ?? { x: 0, y: 0 }, variant: Math.floor(Math.random() * 4) };
}

// ---------- public API ----------

export function initialState(grid?: GridConfig): GameState {
  const g: GridConfig = grid ?? { cols: BASE_COLS, rows: BASE_ROWS, cellSize: 20 };
  const mid = { x: Math.floor(g.cols / 2), y: Math.floor(g.rows / 2) };
  const snake: Segment[] = [
    { pos: { x: mid.x - 2, y: mid.y }, color: '#4ade80' },
    { pos: { x: mid.x - 1, y: mid.y }, color: '#4ade80' },
    { pos: mid, color: '#16a34a' },
  ];
  const food = spawnFood(snake.map(s => s.pos), g);
  return {
    grid: g,
    snake,
    food,
    powerUpItems: [],
    activeEffects: [],
    dir: 'right',
    nextDir: 'right',
    score: 0,
    highScore: 0,
    tickIndex: 0,
    status: 'idle',
  };
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  // 1. Resolve active effects
  const resolved = resolveEffects(state.activeEffects);
  let activeEffects = [...state.activeEffects];

  // 2. Apply nextDir (reject reversal)
  const dir: Direction =
    state.nextDir !== OPPOSITE[state.dir] ? state.nextDir : state.dir;

  // 3. Advance head
  const oldHead = state.snake[state.snake.length - 1];
  const newHeadPos = advance(oldHead.pos, dir, state.grid);
  const newHead: Segment = { pos: newHeadPos, color: '#16a34a' };
  // Grow tentatively: body turns uniform colour, new head appended
  const tentativeSnake: Segment[] = [
    ...state.snake.map(s => ({ ...s, color: '#4ade80' })),
    newHead,
  ];

  // 4. Self-collision (check against body without new head)
  const body = tentativeSnake.slice(0, -1);
  const selfHit = body.some(s => posEq(s.pos, newHeadPos));
  let status: GameState['status'] = state.status;

  if (selfHit && !resolved.ghostMode) {
    if (resolved.shieldCount > 0) {
      // Consume one shield effect
      const idx = activeEffects.findIndex(e => (registryGet(e.defId)?.shieldOnApply ?? 0) > 0);
      if (idx >= 0) activeEffects = activeEffects.filter((_, i) => i !== idx);
    } else {
      return { ...state, status: 'gameover' };
    }
  }

  // 5. Food collision
  let snake = tentativeSnake;
  let food = state.food;
  let score = state.score;
  let highScore = state.highScore;
  let powerUpItems = state.powerUpItems;
  let foodEaten = false;

  if (posEq(newHeadPos, food.pos)) {
    foodEaten = true;
    score = state.score + Math.round(resolved.scoreMultiplier);
    highScore = Math.max(highScore, score);
    // snake grows: keep all segments (don't trim tail below)
    const foodCount = snake.length - 3; // initial length = 3
    food = spawnFood(snake.map(s => s.pos), state.grid);
    // Possibly spawn a power-up item
    if (foodCount > 0 && foodCount % POWERUP_SPAWN_EVERY_N_FOOD === 0) {
      const def = tryWeightedRandom();
      if (def) {
        const occupied = [...snake.map(s => s.pos), food.pos];
        const pos = freeCell(occupied, state.grid);
        if (pos) powerUpItems = [...powerUpItems, { pos, defId: def.id }];
      }
    }
  }

  // 8. Trim tail (only if no food was eaten)
  if (!foodEaten) snake = snake.slice(1);

  // 6. Power-up item collision
  const hitIdx = powerUpItems.findIndex(pu => posEq(pu.pos, newHeadPos));
  if (hitIdx >= 0) {
    const pu = powerUpItems[hitIdx];
    powerUpItems = powerUpItems.filter((_, i) => i !== hitIdx);
    const def = registryGet(pu.defId);
    if (def) {
      activeEffects = [...activeEffects, { defId: def.id, remainingTicks: def.duration }];
      const partial = def.apply({ ...state, snake, food, score, powerUpItems, activeEffects, dir });
      // Merge partial (apply may tweak state beyond activeEffects tracking)
      if (partial.score !== undefined) score = partial.score;
      if (partial.food !== undefined) food = partial.food;
      if (partial.activeEffects !== undefined) activeEffects = partial.activeEffects;
    }
  }

  // 7. Decrement timers, expire effects
  const nextEffects: ActiveEffect[] = [];
  for (const e of activeEffects) {
    const remaining = e.remainingTicks - 1;
    if (remaining <= 0) {
      const def = registryGet(e.defId);
      if (def?.onExpire) {
        const partial = def.onExpire({ ...state, snake, food, score, powerUpItems, activeEffects, dir });
        if (partial.score !== undefined) score = partial.score;
      }
    } else {
      nextEffects.push({ defId: e.defId, remainingTicks: remaining });
    }
  }

  // 9. Increment tickIndex
  return {
    grid: state.grid,
    snake,
    food,
    powerUpItems,
    activeEffects: nextEffects,
    dir,
    nextDir: dir,
    score,
    highScore,
    tickIndex: state.tickIndex + 1,
    status,
  };
}
