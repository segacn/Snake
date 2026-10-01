import { describe, it, expect } from 'vitest';
import { register, weightedRandom } from './registry.js';
import { slowmo } from './definitions/slowmo.js';
import { speedup } from './definitions/speedup.js';
import { ghost } from './definitions/ghost.js';
import { multiplier } from './definitions/multiplier.js';
import { shield } from './definitions/shield.js';

// Register all five defs once for this module's registry instance
register(slowmo);
register(speedup);
register(ghost);
register(multiplier);
register(shield);

describe('PowerUpRegistry — all five definitions', () => {
  it('all five defs have unique ids', () => {
    const ids = [slowmo.id, speedup.id, ghost.id, multiplier.id, shield.id];
    expect(new Set(ids).size).toBe(5);
  });

  it('all five defs have positive spawnWeight', () => {
    [slowmo, speedup, ghost, multiplier, shield].forEach(d => {
      expect(d.spawnWeight).toBeGreaterThan(0);
    });
  });

  it('all five defs have positive duration', () => {
    [slowmo, speedup, ghost, multiplier, shield].forEach(d => {
      expect(d.duration).toBeGreaterThan(0);
    });
  });
});

describe('PowerUpRegistry — register / weightedRandom', () => {
  it('register() throws on duplicate id', () => {
    expect(() => register(ghost)).toThrow();
  });

  it('weightedRandom() returns a registered definition', () => {
    const def = weightedRandom();
    expect(def).toBeDefined();
    expect(def.id).toBeTruthy();
  });

  it('weightedRandom() — slowmo and multiplier appear more often than ghost and shield', () => {
    const counts: Record<string, number> = {};
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const d = weightedRandom();
      counts[d.id] = (counts[d.id] ?? 0) + 1;
    }
    // Weights: slowmo=3, speedup=2, multiplier=3, ghost=1, shield=1 → total=10
    // High-weight combined (slowmo+multiplier) > 2× low-weight (ghost+shield)
    const highWeight = (counts['slowmo'] ?? 0) + (counts['multiplier'] ?? 0);
    const lowWeight = (counts['ghost'] ?? 0) + (counts['shield'] ?? 0);
    expect(highWeight).toBeGreaterThan(lowWeight * 2);
  });
});
