/* ---------------- WAVES ---------------- */
import { sfx } from "./audio.js";
import { showBanner, elWave } from "./ui.js";
import { spawnSlasher, spawnGunner, spawnBrute, spawnSniper } from "./skeletons.js";
import { spawnBoss } from "./boss.js";
import { spawnWeaponCrate } from "./pickups.js";
import { spawnExplosion } from "./effects.js";

var ctx;

export function initWaves(c) { ctx = c; }

export function beginWave(n) {
  ctx.wave = n;
  elWave.textContent = "WAVE " + ctx.wave;
  ctx.spawnQueue = [];
  if (ctx.wave % 5 === 0) {
    ctx.spawnQueue.push({ at: ctx.elapsed + 1.4, type: "boss" });
    showBanner("WAVE " + ctx.wave, "SOMETHING BIG IS COMING...", true);
    sfx.waveUp();
    return;
  }
  showBanner("WAVE " + ctx.wave,
    (ctx.wave === 6) ? "THE BRUTES HAVE ARRIVED!" :
    (ctx.wave === 8) ? "SNIPERS ON THE RIDGE!" : "", ctx.wave === 6 || ctx.wave === 8);
  sfx.waveUp();
  var slashers = Math.min(3 + Math.ceil(ctx.wave * 0.8), 11);
  var gunners  = ctx.wave < 2 ? 0 : Math.min(1 + Math.floor(ctx.wave / 2), 6);
  var brutes   = ctx.wave < 6 ? 0 : Math.min(1 + Math.floor((ctx.wave - 6) / 2), 5);
  var snipers  = ctx.wave < 8 ? 0 : Math.min(1 + Math.floor((ctx.wave - 8) / 2), 4);
  var list = [];
  var i;
  for (i = 0; i < slashers; i++) list.push("slasher");
  for (i = 0; i < gunners; i++) list.push("gunner");
  for (i = 0; i < brutes; i++) list.push("brute");
  for (i = 0; i < snipers; i++) list.push("sniper");
  for (i = list.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  for (i = 0; i < list.length; i++) {
    ctx.spawnQueue.push({ at: ctx.elapsed + 0.8 + i * 0.7, type: list[i] });
  }
}

export function updateWaveFlow(dt) {
  for (var i = ctx.spawnQueue.length - 1; i >= 0; i--) {
    if (ctx.elapsed >= ctx.spawnQueue[i].at) {
      var s = ctx.spawnQueue.splice(i, 1)[0];
      if (s.type === "slasher") spawnSlasher();
      else if (s.type === "gunner") spawnGunner();
      else if (s.type === "brute") spawnBrute();
      else if (s.type === "sniper") spawnSniper();
      else if (s.type === "boss") spawnBoss();
    }
  }
  for (var q = ctx.bossQueueDelay.length - 1; q >= 0; q--) {
    ctx.bossQueueDelay[q].at -= dt;
    if (ctx.bossQueueDelay[q].at <= 0) {
      var ex = ctx.bossQueueDelay.splice(q, 1)[0];
      spawnExplosion(ex.pos, ex.power);
      sfx.boom(1.3);
    }
  }
  if (ctx.pendingNextWaveAt === null && ctx.wave > 0 &&
      ctx.spawnQueue.length === 0 && ctx.enemies.length === 0 && !ctx.boss) {
    ctx.pendingNextWaveAt = ctx.elapsed + 1.6;
    if ((ctx.wave + 1) % 5 === 0) spawnWeaponCrate(); // gift before a boss fight
  }
  if (ctx.pendingNextWaveAt !== null && ctx.elapsed >= ctx.pendingNextWaveAt) {
    ctx.pendingNextWaveAt = null;
    beginWave(ctx.wave + 1);
  }
}
