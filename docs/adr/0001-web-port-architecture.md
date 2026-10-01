# ADR-0001 — Port Snake to a Modern Web Application

**Date:** 2026-10-01  
**Status:** Proposed  
**Deciders:** segacn-architect

---

## Context

The current implementation is a Java Swing desktop application. Running it requires a local JRE or a Docker + X11 forwarding setup, which limits who can play and where the game can be shared. The codebase also carries several structural problems:

- Game loop runs on a raw `Thread`; rendering state is shared between that thread and Swing's EDT with no synchronisation.
- All direction state lives in a `public static` field on `ThreadsController` — a global mutation point.
- Game-over freezes the thread in `while(true){sleep()}` — only exit is to kill the process.
- The grid is rendered as 400 live `JPanel` instances; a canvas draw call is a fraction of the cost.
- A confirmed x/y swap in `checkCollision()` makes food detection unreliable (`posCritique.getX()==foodPosition.y`).
- The window is fixed at 300×300 px — unusable on high-DPI or large screens.

The goal is a browser-native port that fixes these issues, adds a power-up system from day one, and is structured to support future enhancements without rewriting core logic.

---

## Decision

**Chosen stack: TypeScript + HTML5 Canvas + Vite**

No UI framework. Snake is a state-machine driving a pixel grid — a `<canvas>` is the exact primitive needed. Frameworks add virtual-DOM overhead for a game that redraws every frame and has no component tree.

TypeScript is chosen over plain JS to catch the class of coordinate-swap bugs already present in the original.

Vite is chosen for instant HMR during development and zero-config static build output (deployable to GitHub Pages, Netlify, or any CDN with no server).

### Why not React/Vue/Svelte

A component model is the wrong abstraction for a game render loop. The entire game state updates every tick and the only output is a canvas draw — there is no benefit to diffing a virtual DOM.

### Why not a game framework (Phaser, PlayCanvas)

The game logic fits in ~300 lines. A framework would add a multi-MB dependency, a learning curve, and conventions that don't map cleanly onto a grid game. The raw Canvas API is sufficient and keeps the bundle near zero.

---

## Module Structure

```
src/
  core/
    types.ts          ← all domain types (GameState, Direction, PowerUpDef …)
    state.ts          ← tick(state): GameState  — pure, no side-effects
    powerups/
      registry.ts     ← PowerUpRegistry: register, spawn, resolve
      definitions/
        slowmo.ts     ← halves tick-rate for N ticks
        speedup.ts    ← doubles tick-rate for N ticks
        ghost.ts      ← disables self-collision for N ticks
        multiplier.ts ← doubles score for N ticks
        shield.ts     ← absorbs one wall/self collision
  render/
    canvas.ts         ← render(ctx, state): void
    hud.ts            ← score, active-effect badges, high score
    effects.ts        ← particle burst on eat, screen-flash on death
  input/
    keyboard.ts       ← arrow keys, WASD, P (pause), R (restart)
    touch.ts          ← four-direction swipe, pinch-to-zoom grid
  loop.ts             ← requestAnimationFrame + delta-time accumulator
  config.ts           ← defaults: grid size, base speed, spawn weights
main.ts               ← wires canvas, input, loop; handles resize
index.html
```

---

## Domain Model

### GameState (immutable record)

```ts
type GameState = {
  grid:          GridConfig;        // cols, rows, cellSize — recalculated on resize
  snake:         Segment[];         // head is last element; Segment = { pos, color }
  food:          FoodItem;          // position + visual variant
  powerUpItems:  PowerUpItem[];     // items currently on the grid
  activeEffects: ActiveEffect[];    // effects currently applied to the snake
  dir:           Direction;         // committed direction for this tick
  nextDir:       Direction;         // queued from input; applied next tick
  score:         number;
  highScore:     number;
  tickIndex:     number;            // monotonic counter
  status:        'idle' | 'playing' | 'paused' | 'gameover';
};
```

`tick(state): GameState` is a **pure function** — given a state it returns the next state. No mutation, no DOM access. This makes the logic trivially unit-testable and enables replay (record input sequences; replay by re-running tick from initial state).

### GridConfig (responsive)

```ts
type GridConfig = {
  cols:     number;   // default 20; can scale to 40+ on large screens
  rows:     number;
  cellSize: number;   // px — calculated from viewport at startup and on resize
};
```

`main.ts` listens to `window.resize`, recalculates `cellSize = Math.floor(Math.min(vw, vh - HUD_HEIGHT) / cols)`, and updates the canvas dimensions. The game continues without reset.

### Power-up definition contract

```ts
interface PowerUpDef {
  id:           string;
  color:        string;        // fill color on grid
  symbol:       string;        // single glyph drawn over the cell
  spawnWeight:  number;        // relative frequency (higher = more common)
  duration:     number;        // ticks the effect stays active
  apply:   (state: GameState) => Partial<GameState>;   // applied on eat
  onExpire?: (state: GameState) => Partial<GameState>; // cleanup when duration ends
}
```

`registry.ts` holds a map of `id → PowerUpDef`. Adding a new power-up is a single file in `definitions/` plus one `registry.register(def)` call in `main.ts` — no changes to core logic.

### Effect resolution in tick()

```
tick(state):
  1. resolve active effects → derive effectiveSpeed, scoreMultiplier, ghostMode, shieldCount
  2. apply nextDir (if not opposite of dir)
  3. advance head by one cell (with wrap or wall-collision check)
  4. check self-collision (skip if ghostMode)
  5. check food collision → grow, increment score × multiplier, spawn new food + possibly a power-up
  6. check power-up item collision → push to activeEffects, call apply()
  7. decrement activeEffect timers; call onExpire() for expired effects
  8. trim tail to sizeSnake
  9. return new state
```

---

## Rendering

A single `render(ctx, state)` call per animation frame:

1. `clearRect` entire canvas
2. Draw grid background (subtle lines)
3. Draw food (pulsing scale animation driven by `tickIndex`)
4. Draw power-up items (symbol + color fill)
5. Draw snake segments (head distinct from body; ghost mode = semi-transparent)
6. Draw particle effects (short-lived burst objects stored in render state, not game state)
7. Draw HUD overlay (score, high score, active-effect badges with countdown bars)

Rendering state (particles, animations) is kept **separate from game state** — it is not passed through `tick()`.

---

## Input

**Keyboard:** arrow keys and WASD map to `Direction`. Input is written to `state.nextDir`; `tick()` promotes it to `state.dir`. A direction is rejected if it is the exact opposite of the current `dir` (prevents immediate reversal).

**Touch:** `touchstart` + `touchend` delta determines swipe axis and sign → mapped to `Direction`. A pinch gesture (future) can adjust grid zoom.

**Pause / Restart:** `P` toggles `status` between `playing` and `paused`; `R` resets to `initialState()`.

---

## Game Loop

```ts
let lastTime = 0;
let accumulator = 0;

function loop(now: number) {
  const delta = now - lastTime;
  lastTime = now;
  accumulator += delta;

  const tickMs = BASE_TICK_MS * speedMultiplier(state.activeEffects);

  while (accumulator >= tickMs) {
    state = tick(state);
    accumulator -= tickMs;
  }

  render(ctx, state);
  requestAnimationFrame(loop);
}
```

`speedMultiplier` is derived from active effects (slow-mo < 1, speed-up > 1). The delta accumulator decouples game speed from frame rate — the game runs consistently on 60 Hz and 144 Hz displays alike.

---

## Power-Up Catalogue (initial set)

| ID | Symbol | Effect | Duration |
|---|---|---|---|
| `slowmo` | ❄ | Halves effective tick rate | 8 s |
| `speedup` | ⚡ | Doubles effective tick rate | 5 s |
| `ghost` | 👻 | Self-collision disabled | 6 s |
| `multiplier` | ×2 | Score × 2 per food eaten | 10 s |
| `shield` | 🛡 | Absorbs one lethal collision | Until triggered |

Spawn probability is weighted: `slowmo` and `multiplier` are common; `ghost` and `shield` are rare. A power-up appears on the grid every N food items eaten (configurable; default N=5).

---

## Fixes Applied vs Original

| Original issue | Resolution |
|---|---|
| x/y swap in food collision | `tick()` uses a single `Position` type throughout — no separate x/y fields |
| Static mutable direction | `state.nextDir` in immutable record; written by input handler, read by `tick()` |
| No restart | `R` key calls `resetState()`; no process restart needed |
| Thread + EDT race | No threads — single-threaded JS event loop; `requestAnimationFrame` is safe |
| Fixed 300×300 window | Canvas fills viewport; `cellSize` recalculates on resize |
| No score | Score tracked in `GameState.score`; displayed in HUD |

---

## Future Extension Points

| Feature | What to add |
|---|---|
| Walls / levels | `GridConfig.walls: Position[]`; checked in `tick()` collision step |
| Multiplayer (local) | `snakes: Snake[]` array; one `KeyboardListener` per player |
| Multiplayer (online) | Replace `tick()` call with server-authoritative state via WebSocket |
| Leaderboard | `POST /scores` on game-over; `localStorage` for offline high score |
| Replay | Record `(tickIndex, dir)` pairs; replay by re-running `tick()` from `initialState()` |
| Mobile app | Wrap canvas in a Capacitor shell — no game logic changes needed |

---

## Consequences

- **Positive:** No install, runs in any browser, shareable via URL, responsive, extensible power-up system, unit-testable game logic.
- **Positive:** Bundle size ~5 kB gzipped (TypeScript compiled, no runtime dependencies).
- **Neutral:** The Java source is not reused — it serves only as a reference for game rules.
- **Negative:** Canvas accessibility (screen readers) is limited; not a concern for a game, but noted.
