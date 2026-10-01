import type { PowerUpDef } from '../../types.js';

// TODO: doubles score for N ticks
export const multiplier: PowerUpDef = {
  id: 'multiplier',
  color: '#34d399',
  symbol: '×',
  spawnWeight: 1,
  duration: 33,
  apply: (_state) => ({}),
  onExpire: (_state) => ({}),
};
