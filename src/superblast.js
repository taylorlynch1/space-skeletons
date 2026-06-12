/* ---------------- SUPER BLAST ---------------- */
/* Kills charge a meter: 15 scored kills fill it, a boss kill pays 5.
   When full, the bottom-right button arms; tapping it (or Space on
   desktop) clears the screen. Every enemy dies nearest-first on a short
   cascade so the funny bonks play as a run, all enemy bolts are wiped,
   and the boss loses 25 percent of MAX hp (never a free boss kill, so
   spend-or-save stays a real decision). Fired during a boss entrance
   or with the boss still queued, the cut stays pending and lands the
   moment the entrance ends: a meter saved for the boss is never
   wasted. Blast kills pay multiplied
   score and extend the combo BY DESIGN (Taylor, 2026-06-12). Kills that
   land while a blast is running never recharge the meter, so it cannot
   snowball. */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { killEnemy, enemyCenter } from "./skeletons.js";
import { hitBoss } from "./boss.js";
import { bolts } from "./weapons.js";
import { spawnSpark, spawnExplosion, shake } from "./effects.js";
import { elSuperBtn, elSuperRing, elSuperFlash } from "./ui.js";

var ctx;

var CHARGE_KILLS = 15;   // scored kills to fill the meter
var KILL_GAP = 0.06;     // seconds between cascade kills
var BOSS_HP_CUT = 0.25;  // fraction of boss MAX hp removed by a blast
var BEAM_LIFE = 0.75;    // minimum seconds the beam stays on screen
var BOSS_HIT_AT = 0.25;  // earliest moment the boss cut can land

var charge = 0, ready = false, blasting = false;
var blastT = 0, cascade = [], bossCutPending = false, flashFade = 0;
var blastLife = BEAM_LIFE;
var beam, beamMat;

export function initSuperBlast(c) {
  ctx = c;
  beamMat = new THREE.MeshBasicMaterial({ color: 0xcffcff, transparent: true,
    opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  beam = new THREE.Mesh(new THREE.CylinderGeometry(7, 0.4, 200, 14, 1, true), beamMat);
  beam.rotation.x = -Math.PI / 2;   // wide end points down the corridor
  beam.position.set(0, -0.8, -100.3);
  beam.visible = false;
  ctx.camera.add(beam);

  elSuperBtn.addEventListener("pointerdown", function (e) {
    e.stopPropagation();   // never start an aim drag from the button
    fireSuperBlast();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" && !e.repeat) fireSuperBlast();
  });
}

/* Called from killEnemy and killBoss through ctx.chargeSuper. */
export function chargeSuper(n) {
  if (blasting || ready) return;   // blast kills never recharge the meter
  charge = Math.min(CHARGE_KILLS, charge + n);
  if (charge >= CHARGE_KILLS) { ready = true; sfx.superReady(); }
  updateSuperUI();
}

/* Bolts are wiped at fire AND every frame while the blast runs, so a
   shot from an enemy waiting on its cascade slot (or from the boss)
   can never sneak through and land after the invulnerability ends. */
function wipeBolts() {
  for (var i = 0; i < bolts.length; i++) {
    var bo = bolts[i];
    if (!bo.active) continue;
    bo.active = false; bo.mesh.visible = false;
    spawnSpark(bo.mesh.position);
  }
}

export function fireSuperBlast() {
  if (!ready || blasting || ctx.state !== "PLAYING") return;
  ready = false; charge = 0; blasting = true; blastT = 0;

  wipeBolts();

  // nearest-first kill cascade: the bonk sounds play as a run
  var i;
  var alive = [];
  for (i = 0; i < ctx.enemies.length; i++) {
    if (!ctx.enemies[i].remove) alive.push(ctx.enemies[i]);
  }
  alive.sort(function (a, b) {
    return a.group.position.distanceTo(ctx.PLAYER_POS) -
           b.group.position.distanceTo(ctx.PLAYER_POS);
  });
  cascade = [];
  for (i = 0; i < alive.length; i++) {
    cascade.push({ at: 0.12 + i * KILL_GAP, e: alive[i] });
  }
  // the boss cut is OWED, not snapshotted at fire time: during the
  // entrance flight (or with the boss still in the spawn queue) the
  // blast stays pending and the cut lands when the entrance ends
  bossCutPending = !!ctx.boss;
  for (i = 0; i < ctx.spawnQueue.length; i++) {
    if (ctx.spawnQueue[i].type === "boss") bossCutPending = true;
  }

  // beam outlives the last cascade kill; invuln outlives the beam
  blastLife = Math.max(BEAM_LIFE, 0.12 + cascade.length * KILL_GAP + 0.3);
  ctx.invulnT = Math.max(ctx.invulnT, blastLife + 0.25);

  beam.visible = true; beamMat.opacity = 0;
  flashFade = 1.0;
  shake(0.9, 0.6);
  sfx.superBlast();
  updateSuperUI();
}

export function updateSuperBlast(dt) {
  if (flashFade > 0) {
    flashFade = Math.max(0, flashFade - dt * 2.4);
    elSuperFlash.style.opacity = flashFade;
  }
  if (!blasting) return;
  blastT += dt;

  var grow = Math.min(1, blastT / 0.1);
  beam.scale.set(grow, 1, grow);   // radius only, length stays
  var fadeStart = blastLife - 0.35;
  beamMat.opacity = blastT < fadeStart ? 0.75 * grow
    : Math.max(0, 0.75 * (1 - (blastT - fadeStart) / 0.35));

  wipeBolts();

  while (cascade.length > 0 && cascade[0].at <= blastT) {
    var c = cascade.shift();
    if (!c.e.remove) killEnemy(c.e, true);
  }
  if (bossCutPending && blastT >= BOSS_HIT_AT && ctx.boss && !ctx.boss.entering) {
    bossCutPending = false;
    enemyCenter({ group: ctx.boss.group, scale: 3.8 }, ctx.tmpV2);
    spawnExplosion(ctx.tmpV2, 1.8);
    sfx.boom(1.4);
    hitBoss(ctx.boss.hpMax * BOSS_HP_CUT, ctx.tmpV2);
  }
  if (cascade.length === 0 && !bossCutPending && blastT >= blastLife) {
    blasting = false;
    beam.visible = false; beamMat.opacity = 0;
  }
}

function updateSuperUI() {
  var pct = ready ? 100 : Math.round((charge / CHARGE_KILLS) * 100);
  elSuperRing.style.background = "conic-gradient(#ffd34d 0% " + pct +
    "%, rgba(20, 4, 2, 0.7) " + pct + "% 100%)";
  elSuperBtn.classList.toggle("ready", ready);
}

/* Called from resetGame. Charge survives damage and wave changes,
   only a restart clears it. */
export function resetSuperBlast() {
  charge = 0; ready = false; blasting = false;
  blastT = 0; cascade = []; bossCutPending = false; blastLife = BEAM_LIFE;
  flashFade = 0; elSuperFlash.style.opacity = 0;
  beam.visible = false; beamMat.opacity = 0;
  elSuperBtn.style.display = "flex";
  updateSuperUI();
}
