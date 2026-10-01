import {
  BASE_COLS, BASE_ROWS, MAX_COLS, MAX_ROWS,
  HUD_HEIGHT, LARGE_VIEWPORT_THRESHOLD,
} from './config.js';
import { initialState } from './core/state.js';
import { register } from './core/powerups/registry.js';
import { slowmo } from './core/powerups/definitions/slowmo.js';
import { speedup } from './core/powerups/definitions/speedup.js';
import { ghost } from './core/powerups/definitions/ghost.js';
import { multiplier } from './core/powerups/definitions/multiplier.js';
import { shield } from './core/powerups/definitions/shield.js';
import { render } from './render/canvas.js';
import { renderHud } from './render/hud.js';
import { createRenderState } from './render/effects.js';
import { initKeyboard } from './input/keyboard.js';
import { initTouch } from './input/touch.js';
import { startLoop } from './loop.js';
import type { GameState } from './core/types.js';

// Register all power-up definitions
register(slowmo);
register(speedup);
register(ghost);
register(multiplier);
register(shield);

// Canvas setup
const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #game not found in DOM');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Could not get 2D rendering context from canvas #game');

const hudEl = document.getElementById('hud') as HTMLElement | null;
if (!hudEl) throw new Error('HUD element #hud not found in DOM');

// Mutable state reference shared with input handlers
const stateRef: { current: GameState } = { current: initialState() };
let renderState = createRenderState();
let loopHandles = { stop: () => {} };

function calcGrid() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const large = vw >= LARGE_VIEWPORT_THRESHOLD;
  const cols = large ? MAX_COLS : BASE_COLS;
  const rows = large ? MAX_ROWS : BASE_ROWS;
  const cellSize = Math.floor(Math.min(vw, vh - HUD_HEIGHT) / cols);
  return { cols, rows, cellSize };
}

function applyCanvasSize(grid: ReturnType<typeof calcGrid>): void {
  canvas!.width = grid.cols * grid.cellSize;
  canvas!.height = grid.rows * grid.cellSize;
}

function resetGame(): void {
  const grid = calcGrid();
  applyCanvasSize(grid);
  const hs = stateRef.current.highScore;
  stateRef.current = { ...initialState(grid), highScore: hs, status: 'idle' };
  renderState = createRenderState();
}

function handleUpdate(partial: Partial<GameState>): void {
  stateRef.current = { ...stateRef.current, ...partial };
}

// Input handlers
const cleanupKeyboard = initKeyboard(stateRef, handleUpdate, resetGame);
const cleanupTouch = initTouch(canvas, stateRef, handleUpdate);

// Initial canvas sizing
const initialGrid = calcGrid();
applyCanvasSize(initialGrid);
stateRef.current = { ...stateRef.current, grid: initialGrid };

// Handle resize: update canvas + grid, keep game running
window.addEventListener('resize', () => {
  const grid = calcGrid();
  applyCanvasSize(grid);
  stateRef.current = { ...stateRef.current, grid };
  renderState = createRenderState(); // clear particles to avoid position artefacts
});

// Start the game loop
loopHandles = startLoop(
  stateRef,
  (updatedState, rs) => {
    renderState = rs;
    render(ctx!, updatedState, rs);
    renderHud(hudEl!, updatedState);
  },
  renderState,
);

// HMR cleanup (Vite injects import.meta.hot; cast through unknown for tsc compatibility)
const metaAny = import.meta as unknown as { hot?: { dispose: (cb: () => void) => void } };
if (metaAny.hot) {
  metaAny.hot.dispose(() => {
    loopHandles.stop();
    cleanupKeyboard();
    cleanupTouch();
  });
}
