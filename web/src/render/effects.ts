import type { Position } from '../core/types.js';

export type Particle = {
  x: number;       // canvas pixels
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0–1 remaining
  decay: number;   // fraction per ms
  color: string;
};

export type RenderState = {
  particles: Particle[];
  flashRemaining: number;  // ms of death-flash remaining
};

export function createRenderState(): RenderState {
  return { particles: [], flashRemaining: 0 };
}

export function spawnEatParticles(rs: RenderState, pos: Position, cellSize: number): RenderState {
  const cx = (pos.x + 0.5) * cellSize;
  const cy = (pos.y + 0.5) * cellSize;
  const newParticles: Particle[] = Array.from({ length: 8 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = cellSize * (0.02 + Math.random() * 0.04);
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 1 / 600,  // fully decayed in 600 ms
      color: ['#facc15', '#4ade80', '#fb923c'][Math.floor(Math.random() * 3)],
    };
  });
  return { ...rs, particles: [...rs.particles, ...newParticles] };
}

export function spawnDeathFlash(rs: RenderState): RenderState {
  return { ...rs, flashRemaining: 500 };
}

export function updateRenderState(rs: RenderState, deltaMs: number): RenderState {
  const particles = rs.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * deltaMs,
      y: p.y + p.vy * deltaMs,
      life: p.life - p.decay * deltaMs,
    }))
    .filter(p => p.life > 0);
  const flashRemaining = Math.max(0, rs.flashRemaining - deltaMs);
  return { particles, flashRemaining };
}

export function drawParticles(ctx: CanvasRenderingContext2D, rs: RenderState): void {
  for (const p of rs.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export function drawDeathFlash(ctx: CanvasRenderingContext2D, rs: RenderState, w: number, h: number): void {
  if (rs.flashRemaining <= 0) return;
  const alpha = (rs.flashRemaining / 500) * 0.4;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}
