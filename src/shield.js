/* ---------------- SHIELD BUBBLE (active ability) ---------------- */
/* A shield pickup arms ONE stored charge (max one, extras pay +150 in
   pickups.js). The armed button sits directly left of SUPER BLAST;
   tapping it starts a SHIELD_DURATION invincibility bubble that blocks
   every damage source including melee, so the combo cannot break while
   it runs. Tapping during a running bubble does nothing (no extend, no
   stack); a pickup collected mid-bubble arms the next charge. The ring
   drains as a countdown and the button plus the screen edge glow blink
   for the last WARN_TIME seconds. Rules approved 2026-06-12. */
import { sfx } from "./audio.js";
import { shake } from "./effects.js";
import { elShieldBtn, elShieldRing, elShieldGlow } from "./ui.js";

var ctx;

var SHIELD_DURATION = 6.0;  // seconds of invincibility per charge
var WARN_TIME = 1.5;        // ending-soon blink window

var lastPct = -1;

export function initShield(c) {
  ctx = c;
  elShieldBtn.addEventListener("pointerdown", function (e) {
    e.stopPropagation();   // never start an aim drag from the button
    fireShield();
  });
}

/* Called from pickups.js when a shield pickup is collected. */
export function armShield() {
  ctx.shieldArmed = true;
  updateShieldUI();
}

export function fireShield() {
  if (!ctx.shieldArmed || ctx.shieldT > 0 || ctx.state !== "PLAYING") return;
  ctx.shieldArmed = false;
  ctx.shieldT = SHIELD_DURATION;
  ctx.shieldFade = 1.0;   // blue activation flash, faded in main.js
  shake(0.3, 0.25);
  sfx.shieldOn();
  updateShieldUI();
}

export function updateShieldBubble(dt) {
  if (ctx.shieldT <= 0) return;
  ctx.shieldT -= dt;
  if (ctx.shieldT <= 0) {
    ctx.shieldT = 0;
    sfx.shieldBreak();
    updateShieldUI();
    return;
  }
  // countdown ring, redrawn only on whole-percent changes
  var pct = Math.ceil((ctx.shieldT / SHIELD_DURATION) * 100);
  if (pct !== lastPct) {
    lastPct = pct;
    elShieldRing.style.background = "conic-gradient(#6ec1ff 0% " + pct +
      "%, rgba(8, 16, 30, 0.75) " + pct + "% 100%)";
  }
  if (ctx.shieldT < WARN_TIME) {
    // kill the glow's 0.4s CSS transition for the warn window or the
    // 0.2s blink gets smoothed into a faint pulse; updateShieldUI
    // restores it
    elShieldGlow.style.transition = "none";
    var on = Math.floor(ctx.shieldT * 5) % 2 === 0;
    elShieldBtn.classList.toggle("warn", !on);
    elShieldGlow.style.opacity = on ? 1 : 0.25;
  }
}

function updateShieldUI() {
  var active = ctx.shieldT > 0;
  elShieldBtn.classList.toggle("armed", ctx.shieldArmed && !active);
  elShieldBtn.classList.toggle("active", active);
  elShieldBtn.classList.remove("warn");
  if (!active) {
    lastPct = -1;
    elShieldRing.style.background = ctx.shieldArmed
      ? "conic-gradient(#6ec1ff 0% 100%, #6ec1ff 100% 100%)"
      : "conic-gradient(rgba(8, 16, 30, 0.75) 0% 100%, rgba(8, 16, 30, 0.75) 100% 100%)";
  }
  elShieldGlow.style.transition = "";
  elShieldGlow.style.opacity = active ? 1 : 0;
}

/* Called from resetGame. */
export function resetShield() {
  ctx.shieldArmed = false;
  ctx.shieldT = 0;
  elShieldBtn.style.display = "flex";
  updateShieldUI();
}
