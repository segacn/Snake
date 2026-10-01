import type { PowerUpDef } from '../../types.js';

// TODO: doubles tick-rate for N ticks
export const speedup: PowerUpDef = {
  id: 'speedup',
  color: '#facc15',
  symbol: '⚡',
  spawnWeight: 1,
  duration: 33,
  apply: (_state) => ({}),
  onExpire: (_state) => ({}),
};
