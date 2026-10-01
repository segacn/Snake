import type { PowerUpDef } from '../types.js';

// TODO: implement PowerUpRegistry — register, spawn, resolve
const registry = new Map<string, PowerUpDef>();

export function register(def: PowerUpDef): void {
  registry.set(def.id, def);
}

export function get(id: string): PowerUpDef | undefined {
  return registry.get(id);
}
