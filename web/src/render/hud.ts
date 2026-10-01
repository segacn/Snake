import type { GameState } from '../core/types.js';
import { get as registryGet } from '../core/powerups/registry.js';

export function renderHud(el: HTMLElement, state: GameState): void {
  const badges = state.activeEffects.map(e => {
    const def = registryGet(e.defId);
    if (!def) return '';
    const pct = Math.round((e.remainingTicks / def.duration) * 100);
    return `<span class="hud-badge" title="${def.id}" style="margin-right:8px">
      ${def.symbol}
      <span style="display:inline-block;width:32px;height:4px;background:#333;vertical-align:middle;border-radius:2px">
        <span style="display:block;width:${pct}%;height:100%;background:${def.color};border-radius:2px"></span>
      </span>
    </span>`;
  }).join('');

  el.innerHTML = `
    <span style="margin-right:16px">Score: <strong>${state.score}</strong></span>
    <span style="margin-right:16px">Best: <strong>${state.highScore}</strong></span>
    ${badges}
  `;
}
