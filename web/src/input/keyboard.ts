import type { Direction, GameState } from '../core/types.js';

type StateRef = { current: GameState };

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export function initKeyboard(
  ref: StateRef,
  onUpdate: (next: Partial<GameState>) => void,
  onReset: () => void,
): () => void {
  function handler(e: KeyboardEvent): void {
    const dir = KEY_MAP[e.code];
    if (dir) {
      e.preventDefault();
      if (dir !== OPPOSITE[ref.current.dir]) {
        onUpdate({ nextDir: dir });
      }
      return;
    }
    if (e.code === 'KeyP') {
      if (ref.current.status === 'playing') onUpdate({ status: 'paused' });
      else if (ref.current.status === 'paused') onUpdate({ status: 'playing' });
    }
    if (e.code === 'KeyR') {
      onReset();
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (ref.current.status === 'idle' || ref.current.status === 'gameover') {
        onUpdate({ status: 'playing' });
      }
    }
  }

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
