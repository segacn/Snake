import type { PowerUpDef } from '../../types.js';

export const shield: PowerUpDef = {
  id: 'shield',
  color: '#fb923c',
  symbol: '🛡',
  spawnWeight: 1,
  duration: 9999, // effectively "until consumed" — removed by tick() on collision
  shieldOnApply: 1,
  apply: () => ({}),
  onExpire: () => ({}),
};
