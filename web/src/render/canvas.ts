import type { GameState } from '../core/types.js';
import { get as registryGet } from '../core/powerups/registry.js';
import type { RenderState } from './effects.js';
import { drawParticles, drawDeathFlash } from './effects.js';

const HEAD_COLOR = '#16a34a';
const HEAD_BORDER = '#052e16';
const BODY_COLOR = '#4ade80';
const GRID_LINE = 'rgba(255,255,255,0.04)';

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  rs: RenderState,
): void {
  const { grid, snake, food, powerUpItems, activeEffects, tickIndex } = state;
  const { cellSize } = grid;
  const W = grid.cols * cellSize;
  const H = grid.rows * cellSize;

  // 1. Clear
  ctx.clearRect(0, 0, W, H);

  // 2. Grid background lines
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= grid.cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, H);
    ctx.stroke();
  }
  for (let y = 0; y <= grid.rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(W, y * cellSize);
    ctx.stroke();
  }

  // 3. Food — pulsing scale (sine wave, period ~20 ticks, ±10%)
  const pulse = 1 + 0.1 * Math.sin((tickIndex / 20) * Math.PI * 2);
  const foodSize = cellSize * pulse;
  const foodOffset = (cellSize - foodSize) / 2;
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(
    food.pos.x * cellSize + foodOffset,
    food.pos.y * cellSize + foodOffset,
    foodSize,
    foodSize,
  );

  // 4. Power-up items
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`;
  for (const pu of powerUpItems) {
    const def = registryGet(pu.defId);
    if (!def) continue;
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(pu.pos.x * cellSize, pu.pos.y * cellSize, cellSize, cellSize);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillText(
      def.symbol,
      pu.pos.x * cellSize + cellSize / 2,
      pu.pos.y * cellSize + cellSize / 2,
    );
  }

  // 5. Snake — ghost mode = 50% opacity
  const isGhost = activeEffects.some(e => registryGet(e.defId)?.ghostMode);
  ctx.globalAlpha = isGhost ? 0.5 : 1;
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const isHead = i === snake.length - 1;
    ctx.fillStyle = isHead ? HEAD_COLOR : BODY_COLOR;
    ctx.fillRect(seg.pos.x * cellSize + 1, seg.pos.y * cellSize + 1, cellSize - 2, cellSize - 2);
    if (isHead) {
      ctx.strokeStyle = HEAD_BORDER;
      ctx.lineWidth = 2;
      ctx.strokeRect(seg.pos.x * cellSize + 1, seg.pos.y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }
  ctx.globalAlpha = 1;

  // 6. Particles
  drawParticles(ctx, rs);

  // 7. Death flash (full-canvas overlay)
  drawDeathFlash(ctx, rs, W, H);
}
