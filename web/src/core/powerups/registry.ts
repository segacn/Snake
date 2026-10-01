import type { PowerUpDef } from '../types.js';

const _registry = new Map<string, PowerUpDef>();

export function register(def: PowerUpDef): void {
  if (_registry.has(def.id)) throw new Error(`PowerUpDef '${def.id}' already registered`);
  _registry.set(def.id, def);
}

export function get(id: string): PowerUpDef | undefined {
  return _registry.get(id);
}

/** Returns undefined if registry is empty. */
export function tryWeightedRandom(): PowerUpDef | undefined {
  if (_registry.size === 0) return undefined;
  const defs = Array.from(_registry.values());
  const totalWeight = defs.reduce((sum, d) => sum + d.spawnWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const d of defs) {
    roll -= d.spawnWeight;
    if (roll <= 0) return d;
  }
  return defs[defs.length - 1];
}

/** Throws if registry is empty. */
export function weightedRandom(): PowerUpDef {
  const result = tryWeightedRandom();
  if (!result) throw new Error('PowerUpRegistry is empty');
  return result;
}
