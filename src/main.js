import * as THREE from "three";

/* =====================================================================
   SPACE SKELETONS v3
   You are the flying robot. The skeleton pirates are many.
   v3: arcade weapon-tier ladder gated by wave, heart pickups,
       Brute + Sniper enemies after boss 1, lava river canyon,
       big visible jetpacks, smaller cockpit cannon, funny death
       sounds, scarier bosses with heartbeat audio.
   M0: refactored into modules. main.js owns the game state (ctx),
       the game flow, and the loop. Each module gets ctx via init.
   ===================================================================== */

import { sfx } from "./audio.js";
import { initUI, updateHearts, updateScore, $, elWave, elBossWrap,
         elDmg, elFlash, elHearts, elHint,
         scrMenu, scrOver, scrPause } from "./ui.js";
import { initEffects, updateEffects, shake, spawnExplosion,
         shards, explosions, sparks } from "./effects.js";
import { initThree, buildWorld, updateWorld } from "./world.js";
import { initSkeletons, buildSharedParts, updateEnemies } from "./skeletons.js";
import { initWeapons, buildCockpitCannon, buildWeaponPools, setWeaponTier,
         fireWeapon, updateBullets, updateBolts, updateCrosshair,
         updateWeaponFX, bullets, bolts } from "./weapons.js";
import { initBoss, updateBoss } from "./boss.js";
import { initPickups, updatePickups, clearPickups } from "./pickups.js";
import { initWaves, updateWaveFlow } from "./waves.js";
import { initInput } from "./input.js";
import { initCombo, comboReset } from "./combo.js";

/* ---------------- CORE STATE ---------------- */
var ctx = {
  // three.js core, set by initThree
  renderer: null, scene: null, camera: null, clock: null,

  // game state
  state: "MENU",            // MENU, PLAYING, PAUSED, OVER
  elapsed: 0,
  score: 0, best: 0, hearts: 3, wave: 0,
  MAX_HEARTS: 5,   // start with 3, earn up to 5
  kills: 0, killsSincePickup: 0, pickupFlip: false,
  comboChain: 0, comboMult: 1, comboFrac: 0,
  invulnT: 0, dmgFade: 0, flashFade: 0,
  shakeT: 0, shakeAmp: 0,
  pendingNextWaveAt: null,
  hintShown: false,

  // player position and aim
  PLAYER_POS: new THREE.Vector3(0, 5.5, 6),
  MAX_YAW: 0.85, MAX_PITCH: 0.55,
  TOUCH_SENS: 3.4,
  aimX: 0, aimY: 0, curYaw: 0, curPitch: 0,

  // entities
  enemies: [], spawnQueue: [],
  boss: null,
  bossQueueDelay: [],

  // weapon state, set by setWeaponTier
  weaponTier: 0, weapon: null, fireT: 0,

  // shared scratch vectors (single instances, same as v3)
  tmpV: new THREE.Vector3(), tmpV2: new THREE.Vector3(),
  camDir: new THREE.Vector3(), assistPoint: new THREE.Vector3(),

  // cross-module callbacks, wired below
  damagePlayer: null, startPlaying: null
};

/* ---------------- PLAYER ---------------- */
function damagePlayer() {
  if (ctx.invulnT > 0 || ctx.state !== "PLAYING") return;
  ctx.hearts--;
  comboReset();
  ctx.invulnT = 1.3;
  ctx.dmgFade = 1.0;
  shake(0.7, 0.5);
  sfx.hurt();
  updateHearts();
  if (ctx.hearts <= 0) gameOver();
}

/* ---------------- GAME FLOW ---------------- */
function resetGame() {
  var i;
  for (i = 0; i < ctx.enemies.length; i++) ctx.scene.remove(ctx.enemies[i].group);
  ctx.enemies = [];
  if (ctx.boss) { ctx.scene.remove(ctx.boss.group); ctx.boss = null; }
  elBossWrap.style.display = "none";
  clearPickups();
  [bullets, bolts, shards, explosions, sparks].forEach(function (pool) {
    for (var k = 0; k < pool.length; k++) {
      pool[k].active = false; pool[k].mesh.visible = false;
    }
  });
  ctx.bossQueueDelay = [];
  ctx.spawnQueue = [];
  ctx.score = 0; ctx.hearts = 3; ctx.wave = 0;
  ctx.kills = 0; ctx.killsSincePickup = 0; ctx.pickupFlip = false;
  ctx.invulnT = 0; ctx.dmgFade = 0; ctx.flashFade = 0; ctx.fireT = 0;
  ctx.aimX = 0; ctx.aimY = 0;
  setWeaponTier(0);
  comboReset();
  updateHearts(); updateScore();
  elWave.textContent = "WAVE 1";
  ctx.pendingNextWaveAt = ctx.elapsed + 0.9;
}

function gameOver() {
  ctx.state = "OVER";
  $("over-score").textContent = ctx.score;
  $("over-best").textContent = ctx.best;
  scrOver.style.display = "flex";
  spawnExplosion(new THREE.Vector3(0, 4.5, 2), 2.2);
  sfx.bigBoom();
  shake(1.2, 0.8);
}

function startPlaying() {
  scrMenu.style.display = "none";
  scrOver.style.display = "none";
  scrPause.style.display = "none";
  resetGame();
  ctx.state = "PLAYING";
  if (!ctx.hintShown) {
    ctx.hintShown = true;
    elHint.classList.add("show");
    setTimeout(function () { elHint.classList.remove("show"); }, 4500);
  }
}

/* ---------------- MAIN LOOP ---------------- */
function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(ctx.clock.getDelta(), 0.05);
  if (ctx.state === "PAUSED") { ctx.renderer.render(ctx.scene, ctx.camera); return; }
  ctx.elapsed += dt;

  updateWorld(dt);

  ctx.curYaw   += (-ctx.aimX * ctx.MAX_YAW - ctx.curYaw) * Math.min(1, dt * 11);
  ctx.curPitch += ( ctx.aimY * ctx.MAX_PITCH - ctx.curPitch) * Math.min(1, dt * 11);
  ctx.camera.rotation.set(ctx.curPitch, ctx.curYaw, 0);

  if (ctx.shakeT > 0) {
    ctx.shakeT -= dt;
    ctx.camera.position.set(
      ctx.PLAYER_POS.x + (Math.random() - 0.5) * ctx.shakeAmp,
      ctx.PLAYER_POS.y + (Math.random() - 0.5) * ctx.shakeAmp,
      ctx.PLAYER_POS.z);
    if (ctx.shakeT <= 0) ctx.shakeAmp = 0;
  } else {
    ctx.camera.position.copy(ctx.PLAYER_POS);
    ctx.camera.position.y += Math.sin(ctx.elapsed * 1.7) * 0.12;
  }
  ctx.camera.updateMatrixWorld(true);

  if (ctx.state === "PLAYING") {
    ctx.invulnT = Math.max(0, ctx.invulnT - dt);
    ctx.fireT -= dt;
    if (ctx.fireT <= 0) { ctx.fireT = ctx.weapon.rate; fireWeapon(); }
    updateWaveFlow(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateBolts(dt);
    updatePickups(dt);
    updateCrosshair();
  }
  updateEffects(dt);
  updateWeaponFX(dt);

  if (ctx.dmgFade > 0) { ctx.dmgFade = Math.max(0, ctx.dmgFade - dt * 1.4); elDmg.style.opacity = ctx.dmgFade; }
  if (ctx.flashFade > 0) { ctx.flashFade = Math.max(0, ctx.flashFade - dt * 1.2); elFlash.style.opacity = ctx.flashFade; }
  elHearts.style.opacity = (ctx.invulnT > 0 && Math.floor(ctx.elapsed * 10) % 2 === 0) ? 0.35 : 1;

  ctx.renderer.render(ctx.scene, ctx.camera);
}

/* ---------------- BOOT ---------------- */
ctx.damagePlayer = damagePlayer;
ctx.startPlaying = startPlaying;

initUI(ctx);
initCombo(ctx);
initThree(ctx);
initSkeletons(ctx);
buildSharedParts();
buildWorld();
initWeapons(ctx);
buildCockpitCannon();
buildWeaponPools();
initEffects(ctx);
initBoss(ctx);
initPickups(ctx);
initWaves(ctx);
initInput(ctx);
updateHearts();
updateScore();
setWeaponTier(0);
animate();
