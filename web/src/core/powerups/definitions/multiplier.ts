import type { PowerUpDef } from '../../types.js';
import { BASE_TICK_MS } from '../../../config.js';

export const multiplier: PowerUpDef = {
  id: 'multiplier',
  color: '#34d399',
  symbol: '×2',
  spawnWeight: 3,
  duration: Math.round(10000 / BASE_TICK_MS), // ≈67 ticks
  scoreMultiplier: 2,
  apply: () => ({}),
  onExpire: () => ({}),
};
