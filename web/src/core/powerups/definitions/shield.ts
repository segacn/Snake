import type { PowerUpDef } from '../../types.js';

// TODO: absorbs one wall/self collision
export const shield: PowerUpDef = {
  id: 'shield',
  color: '#fb923c',
  symbol: '🛡',
  spawnWeight: 1,
  duration: 1,
  apply: (_state) => ({}),
  onExpire: (_state) => ({}),
};
