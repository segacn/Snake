import type { PowerUpDef } from '../../types.js';
import { BASE_TICK_MS } from '../../../config.js';

export const slowmo: PowerUpDef = {
  id: 'slowmo',
  color: '#60a5fa',
  symbol: '❄',
  spawnWeight: 3,
  duration: Math.round(8000 / BASE_TICK_MS), // ≈53 ticks @ 150ms/tick
  tickMultiplier: 2,
  apply: () => ({}),
  onExpire: () => ({}),
};
