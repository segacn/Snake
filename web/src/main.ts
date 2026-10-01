import { register } from './core/powerups/registry.js';
import { slowmo } from './core/powerups/definitions/slowmo.js';
import { speedup } from './core/powerups/definitions/speedup.js';
import { ghost } from './core/powerups/definitions/ghost.js';
import { multiplier } from './core/powerups/definitions/multiplier.js';
import { shield } from './core/powerups/definitions/shield.js';

register(slowmo);
register(speedup);
register(ghost);
register(multiplier);
register(shield);
