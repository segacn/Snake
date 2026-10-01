import type { PowerUpDef } from '../../types.js';
import { BASE_TICK_MS } from '../../../config.js';

export const ghost: PowerUpDef = {
  id: 'ghost',
  color: '#a78bfa',
  symbol: '👻',
  spawnWeight: 1,
  duration: Math.round(6000 / BASE_TICK_MS), // ≈40 ticks
  ghostMode: true,
  apply: () => ({}),
  onExpire: () => ({}),
};
