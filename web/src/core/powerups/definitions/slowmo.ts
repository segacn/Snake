import type { PowerUpDef } from '../../types.js';

// TODO: halves tick-rate for N ticks
export const slowmo: PowerUpDef = {
  id: 'slowmo',
  color: '#60a5fa',
  symbol: '❄',
  spawnWeight: 1,
  duration: 53,
  apply: (_state) => ({}),
  onExpire: (_state) => ({}),
};
