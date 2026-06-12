/* ---------------- COMBO MULTIPLIER ---------------- */
/* Kill chain without taking a hit. 5 kills reach x2, 10 reach x3,
   15 reach x4. No decay by design: the chain only breaks on real
   damage, so a clean run sits at x4 from mid-game on. THRESHOLDS is
   the tuning knob if x4 starts feeling like the default. */
import { sfx } from "./audio.js";
import { updateCombo } from "./ui.js";

var ctx;
var THRESHOLDS = [5, 10, 15];   // chain needed for x2, x3, x4

export function initCombo(c) { ctx = c; }

function multFor(chain) {
  if (chain >= THRESHOLDS[2]) return 4;
  if (chain >= THRESHOLDS[1]) return 3;
  if (chain >= THRESHOLDS[0]) return 2;
  return 1;
}

function fracToNext(chain) {
  if (chain >= THRESHOLDS[2]) return 1;
  if (chain >= THRESHOLDS[1]) return (chain - THRESHOLDS[1]) / (THRESHOLDS[2] - THRESHOLDS[1]);
  if (chain >= THRESHOLDS[0]) return (chain - THRESHOLDS[0]) / (THRESHOLDS[1] - THRESHOLDS[0]);
  return chain / THRESHOLDS[0];
}

/* Call on every scored kill BEFORE awarding points, so the kill that
   reaches a new tier already pays at the new multiplier. */
export function comboKill() {
  ctx.comboChain++;
  ctx.comboFrac = fracToNext(ctx.comboChain);
  var m = multFor(ctx.comboChain);
  var up = m > ctx.comboMult;
  ctx.comboMult = m;
  if (up) sfx.comboUp(m);
  updateCombo(up);
}

/* Called from damagePlayer after the invuln guard, and from resetGame.
   Silent on purpose: losing the chain must never add punishment. */
export function comboReset() {
  if (ctx.comboChain === 0 && ctx.comboMult === 1) return;
  ctx.comboChain = 0;
  ctx.comboMult = 1;
  ctx.comboFrac = 0;
  updateCombo(false);
}
