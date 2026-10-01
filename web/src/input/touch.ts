import type { Direction, GameState } from '../core/types.js';

type StateRef = { current: GameState };

const MIN_SWIPE_PX = 20;

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export function initTouch(
  el: HTMLElement,
  ref: StateRef,
  onUpdate: (next: Partial<GameState>) => void,
): () => void {
  let startX = 0;
  let startY = 0;

  function onStart(e: TouchEvent): void {
    e.preventDefault();
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
  }

  function onEnd(e: TouchEvent): void {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < MIN_SWIPE_PX && ady < MIN_SWIPE_PX) return; // too short
    if (Math.abs(adx - ady) < 1) return; // diagonal — ignore

    let dir: Direction;
    if (adx > ady) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }

    if (dir !== OPPOSITE[ref.current.dir]) {
      onUpdate({ nextDir: dir });
    }
  }

  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend', onEnd);
  };
}
