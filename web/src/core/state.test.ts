import { describe, it, expect } from 'vitest';
import { initialState, tick } from './state.js';
import { register } from './powerups/registry.js';
import { slowmo } from './powerups/definitions/slowmo.js';
import { speedup } from './powerups/definitions/speedup.js';
import { ghost } from './powerups/definitions/ghost.js';
import { multiplier } from './powerups/definitions/multiplier.js';
import { shield } from './powerups/definitions/shield.js';
import type { GameState } from './types.js';

// Each test file gets an isolated module graph (isolate: true in vitest.config.js),
// so this registry instance is always fresh — no try/catch needed.
register(slowmo);
register(speedup);
register(ghost);
register(multiplier);
register(shield);

function playing(s: GameState): GameState {
  return { ...s, status: 'playing' };
}

describe('initialState()', () => {
  it('returns snake of length 3', () => {
    expect(initialState().snake).toHaveLength(3);
  });

  it('returns score 0 and status idle', () => {
    const s = initialState();
    expect(s.score).toBe(0);
    expect(s.status).toBe('idle');
  });

  it('food does not overlap any snake segment', () => {
    const s = initialState();
    const overlap = s.snake.some(
      seg => seg.pos.x === s.food.pos.x && seg.pos.y === s.food.pos.y,
    );
    expect(overlap).toBe(false);
  });
});

describe('tick() — basic movement', () => {
  it('advances head x by 1 when moving right', () => {
    const s = playing(initialState());
    const headBefore = s.snake[s.snake.length - 1].pos;
    const next = tick(s);
    const headAfter = next.snake[next.snake.length - 1].pos;
    expect(headAfter.x).toBe((headBefore.x + 1) % s.grid.cols);
    expect(headAfter.y).toBe(headBefore.y);
  });

  it('increments tickIndex by 1', () => {
    const s = playing(initialState());
    expect(tick(s).tickIndex).toBe(s.tickIndex + 1);
  });

  it('does not mutate the input state', () => {
    const s = playing(initialState());
    const original = JSON.stringify(s);
    tick(s);
    expect(JSON.stringify(s)).toBe(original);
  });
});

describe('tick() — reversal prevention', () => {
  it('continues moving right when nextDir is left', () => {
    const s = playing({ ...initialState(), dir: 'right', nextDir: 'left' });
    const headBefore = s.snake[s.snake.length - 1].pos;
    const next = tick(s);
    const headAfter = next.snake[next.snake.length - 1].pos;
    // Should still move right, not left
    expect(headAfter.x).toBe((headBefore.x + 1) % s.grid.cols);
  });
});

describe('tick() — grid wrapping', () => {
  it('wraps right edge to x=0', () => {
    const s = initialState();
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...s,
      grid,
      dir: 'right',
      nextDir: 'right',
      snake: [
        { pos: { x: 1, y: 2 }, color: '#4ade80' },
        { pos: { x: 2, y: 2 }, color: '#4ade80' },
        { pos: { x: 4, y: 2 }, color: '#16a34a' },
      ],
      food: { pos: { x: 0, y: 0 }, variant: 0 }, // avoid overlap
    });
    const next = tick(state);
    expect(next.snake[next.snake.length - 1].pos.x).toBe(0);
  });

  it('wraps left edge', () => {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...initialState(),
      grid,
      dir: 'left',
      nextDir: 'left',
      snake: [
        { pos: { x: 2, y: 2 }, color: '#4ade80' },
        { pos: { x: 1, y: 2 }, color: '#4ade80' },
        { pos: { x: 0, y: 2 }, color: '#16a34a' },
      ],
      food: { pos: { x: 4, y: 4 }, variant: 0 },
    });
    expect(tick(state).snake.at(-1)!.pos.x).toBe(4);
  });

  it('wraps bottom edge', () => {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...initialState(),
      grid,
      dir: 'down',
      nextDir: 'down',
      snake: [
        { pos: { x: 2, y: 2 }, color: '#4ade80' },
        { pos: { x: 2, y: 3 }, color: '#4ade80' },
        { pos: { x: 2, y: 4 }, color: '#16a34a' },
      ],
      food: { pos: { x: 0, y: 0 }, variant: 0 },
    });
    expect(tick(state).snake.at(-1)!.pos.y).toBe(0);
  });

  it('wraps top edge', () => {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...initialState(),
      grid,
      dir: 'up',
      nextDir: 'up',
      snake: [
        { pos: { x: 2, y: 2 }, color: '#4ade80' },
        { pos: { x: 2, y: 1 }, color: '#4ade80' },
        { pos: { x: 2, y: 0 }, color: '#16a34a' },
      ],
      food: { pos: { x: 4, y: 4 }, variant: 0 },
    });
    expect(tick(state).snake.at(-1)!.pos.y).toBe(4);
  });
});

describe('tick() — food collision', () => {
  it('increases score, grows snake, moves food', () => {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...initialState(),
      grid,
      dir: 'right',
      nextDir: 'right',
      snake: [
        { pos: { x: 0, y: 0 }, color: '#4ade80' },
        { pos: { x: 1, y: 0 }, color: '#4ade80' },
        { pos: { x: 2, y: 0 }, color: '#16a34a' },
      ],
      food: { pos: { x: 3, y: 0 }, variant: 0 },
      score: 0,
    });
    const next = tick(state);
    expect(next.score).toBeGreaterThan(0);
    expect(next.snake.length).toBe(4);
    // New food not on the snake
    const overlap = next.snake.some(
      s => s.pos.x === next.food.pos.x && s.pos.y === next.food.pos.y,
    );
    expect(overlap).toBe(false);
  });
});

describe('tick() — self-collision', () => {
  function buildCollidingState(): GameState {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    return playing({
      ...initialState(),
      grid,
      dir: 'up',
      nextDir: 'up',
      snake: [
        { pos: { x: 2, y: 3 }, color: '#4ade80' },
        { pos: { x: 2, y: 2 }, color: '#4ade80' },
        { pos: { x: 2, y: 1 }, color: '#4ade80' },
        { pos: { x: 2, y: 2 }, color: '#16a34a' }, // duplicate — will cause hit
      ],
      food: { pos: { x: 4, y: 4 }, variant: 0 },
      activeEffects: [],
    });
  }

  it('ghost off — self-collision sets status gameover', () => {
    const next = tick(buildCollidingState());
    expect(next.status).toBe('gameover');
  });

  it('ghost on — self-collision is ignored', () => {
    const state = {
      ...buildCollidingState(),
      activeEffects: [{ defId: 'ghost', remainingTicks: 40 }],
    };
    const next = tick(state);
    expect(next.status).toBe('playing');
  });

  it('shield absorbs collision without gameover and shield is consumed', () => {
    const state = {
      ...buildCollidingState(),
      activeEffects: [{ defId: 'shield', remainingTicks: 9999 }],
    };
    const next = tick(state);
    expect(next.status).toBe('playing');
    // Shield should be removed from activeEffects
    expect(next.activeEffects.find(e => e.defId === 'shield')).toBeUndefined();
  });
});

describe('tick() — score multiplier', () => {
  it('multiplier doubles score on food eat', () => {
    const grid = { cols: 5, rows: 5, cellSize: 20 };
    const state = playing({
      ...initialState(),
      grid,
      dir: 'right',
      nextDir: 'right',
      snake: [
        { pos: { x: 0, y: 0 }, color: '#4ade80' },
        { pos: { x: 1, y: 0 }, color: '#4ade80' },
        { pos: { x: 2, y: 0 }, color: '#16a34a' },
      ],
      food: { pos: { x: 3, y: 0 }, variant: 0 },
      score: 0,
      activeEffects: [{ defId: 'multiplier', remainingTicks: 67 }],
    });
    const next = tick(state);
    expect(next.score).toBe(2); // scoreMultiplier=2
  });
});

describe('tick() — effect expiry', () => {
  it('removes effect when remainingTicks reaches 0', () => {
    const state = playing({
      ...initialState(),
      activeEffects: [{ defId: 'ghost', remainingTicks: 1 }],
    });
    const next = tick(state);
    expect(next.activeEffects).toHaveLength(0);
  });
});

describe('tick() — paused and gameover are no-ops', () => {
  it('paused: returns state unchanged', () => {
    const s = { ...initialState(), status: 'paused' as const };
    expect(tick(s)).toBe(s);
  });

  it('gameover: returns state unchanged', () => {
    const s = { ...initialState(), status: 'gameover' as const };
    expect(tick(s)).toBe(s);
  });
});
