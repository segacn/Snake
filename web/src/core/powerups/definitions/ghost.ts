import type { PowerUpDef } from '../../types.js';

// TODO: disables self-collision for N ticks
export const ghost: PowerUpDef = {
  id: 'ghost',
  color: '#a78bfa',
  symbol: '👻',
  spawnWeight: 1,
  duration: 40,
  apply: (_state) => ({}),
  onExpire: (_state) => ({}),
};
