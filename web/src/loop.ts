import type { GameState } from './core/types.js';
import { tick, effectiveTickMs } from './core/state.js';
import type { RenderState } from './render/effects.js';
import { updateRenderState, spawnEatParticles, spawnDeathFlash } from './render/effects.js';

const MAX_TICKS_PER_FRAME = 10;

type LoopHandles = { stop: () => void };

export function startLoop(
  initialState: GameState,
  renderFn: (state: GameState, rs: RenderState) => void,
  initialRenderState: RenderState,
): LoopHandles {
  let state = initialState;
  let rs = initialRenderState;
  let lastStatus = initialState.status;
  let lastTime = 0;
  let accumulator = 0;
  let rafId = 0;

  function loop(now: number): void {
    const delta = lastTime === 0 ? 16 : now - lastTime;
    lastTime = now;

    // Advance particle / flash timers
    rs = updateRenderState(rs, delta);

    // Only tick if playing
    if (state.status === 'playing') {
      accumulator += delta;
      const tickMs = effectiveTickMs(state.activeEffects);
      let ticks = 0;
      while (accumulator >= tickMs && ticks < MAX_TICKS_PER_FRAME) {
        const prevState = state;
        state = tick(state);
        accumulator -= tickMs;
        ticks++;

        // Detect food eaten: snake grew
        if (state.snake.length > prevState.snake.length) {
          rs = spawnEatParticles(rs, prevState.food.pos, state.grid.cellSize);
        }
      }
    }

    // Detect game-over transition for death flash
    if (state.status === 'gameover' && lastStatus !== 'gameover') {
      rs = spawnDeathFlash(rs);
    }
    lastStatus = state.status;

    renderFn(state, rs);
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
  return {
    stop: () => cancelAnimationFrame(rafId),
  };
}
