import type { PowerUpDef } from '../../types.js';
import { BASE_TICK_MS } from '../../../config.js';

export const speedup: PowerUpDef = {
  id: 'speedup',
  color: '#facc15',
  symbol: '⚡',
  spawnWeight: 2,
  duration: Math.round(5000 / BASE_TICK_MS), // ≈33 ticks
  tickMultiplier: 0.5,
  apply: () => ({}),
  onExpire: () => ({}),
};
