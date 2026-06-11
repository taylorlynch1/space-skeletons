/* ---------------- BOSS ---------------- */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { makeSkeleton, spawnSlasher, spawnBrute, enemyCenter } from "./skeletons.js";
import { fireBolt, fireBoltDir, boltMatRed } from "./weapons.js";
import { showBanner, updateScore, scorePop, elBossWrap, elBossName, elBossFill } from "./ui.js";
import { spawnSpark, spawnBones, shake } from "./effects.js";
import { spawnWeaponCrate, spawnHeart } from "./pickups.js";

var ctx;

export function initBoss(c) { ctx = c; }

var BOSS_NAMES = ["CAPTAIN BLAZEBONES", "ADMIRAL SKULLSWORD",
                  "DREAD KING MARROW", "THE BONE EMPEROR"];

export function spawnBoss() {
  var tier = Math.floor(ctx.wave / 5);
  var sk = makeSkeleton("boss", 3.8);
  ctx.boss = {
    parts: sk, group: sk.group, tier: tier,
    hp: 80 + (tier - 1) * 50, hpMax: 80 + (tier - 1) * 50,
    baseY: 8.4, t: 0, entering: true,
    attackT: 2.5, attackRate: Math.max(1.4, 2.5 - tier * 0.15),
    pattern: 0, summoned: false, roarT: 4, jawT: 0, beatT: 1.0,
    shotQueue: []
  };
  ctx.boss.group.position.set(0, ctx.boss.baseY, -150);
  ctx.scene.add(ctx.boss.group);
  var name = BOSS_NAMES[(tier - 1) % BOSS_NAMES.length] +
             (tier > BOSS_NAMES.length ? " ★" : "");
  elBossName.textContent = name;
  elBossFill.style.width = "100%";
  elBossWrap.style.display = "block";
  showBanner(name, "WARNING! BIG BOSS!", true);
  ctx.flashFade = 0.6;
  shake(0.9, 1.0);
  ctx.boss.jawT = 0.6;
  sfx.roar();
}

export function updateBoss(dt) {
  var boss = ctx.boss;
  if (!boss) return;
  var g = boss.group;
  boss.t += dt;

  var fx = 0.85 + Math.random() * 0.35;
  var fy = 0.75 + Math.random() * 0.5;
  for (var f = 0; f < 4; f++) {
    boss.parts.flames[f].scale.x = fx;
    boss.parts.flames[f].scale.y = fy;
  }
  g.position.y = boss.baseY + Math.sin(boss.t * 1.6) * 0.8;

  // scary idle: pulsing eye glow, swaying tattered cape, roaring jaw
  var pulse = 1 + Math.sin(boss.t * 6) * 0.28;
  boss.parts.halos[0].scale.setScalar(pulse);
  boss.parts.halos[1].scale.setScalar(pulse);
  boss.parts.capes[0].rotation.z = 0.08 + Math.sin(boss.t * 1.3) * 0.16;
  boss.parts.capes[1].rotation.z = Math.sin(boss.t * 1.1 + 1) * 0.12;
  boss.parts.capes[2].rotation.z = -0.08 + Math.sin(boss.t * 1.4 + 2) * 0.16;
  if (boss.jawT > 0) {
    boss.jawT -= dt;
    boss.parts.jaw.rotation.x = 0.55;
    boss.parts.jaw.position.y = 2.46;
  } else {
    boss.parts.jaw.rotation.x = 0;
    boss.parts.jaw.position.y = 2.58;
  }

  if (boss.entering) {
    g.position.z += 38 * dt;
    if (g.position.z >= -65) { g.position.z = -65; boss.entering = false; }
    g.lookAt(ctx.PLAYER_POS.x, g.position.y, ctx.PLAYER_POS.z);
    return;
  }

  g.position.x = Math.sin(boss.t * 0.55) * 14;
  g.lookAt(ctx.PLAYER_POS.x, g.position.y, ctx.PLAYER_POS.z);
  boss.parts.armR.rotation.x = -2.2 + Math.sin(boss.t * 2.2) * 0.35;

  // low heartbeat drum for tension
  boss.beatT -= dt;
  if (boss.beatT <= 0) { boss.beatT = 1.15; sfx.heartbeat(); }

  boss.roarT -= dt;
  if (boss.roarT <= 0) {
    boss.roarT = 6 + Math.random() * 3;
    boss.jawT = 0.7;
    sfx.roar(); shake(0.25, 0.4);
  }

  for (var q = boss.shotQueue.length - 1; q >= 0; q--) {
    boss.shotQueue[q].at -= dt;
    if (boss.shotQueue[q].at <= 0) {
      var sq = boss.shotQueue.splice(q, 1)[0];
      enemyCenter({ group: g, scale: 3.8 }, ctx.tmpV2); ctx.tmpV2.y += 1.5;
      if (sq.fan === 0) {
        fireBolt(ctx.tmpV2, 26 + boss.tier * 2, 1.5, boltMatRed);
        sfx.enemyShot();
      } else {
        ctx.tmpV.copy(ctx.PLAYER_POS).sub(ctx.tmpV2).normalize();
        var rd = ctx.tmpV.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sq.fan);
        fireBoltDir(ctx.tmpV2, rd, 24 + boss.tier * 2, 1.5, boltMatRed);
        sfx.enemyShot();
      }
    }
  }

  boss.attackT -= dt;
  if (boss.attackT <= 0) {
    boss.attackT = boss.attackRate;
    boss.pattern = (boss.pattern + 1) % 2;
    if (boss.pattern === 0) {
      boss.shotQueue.push({ at: 0, fan: 0 });
      boss.shotQueue.push({ at: 0.18, fan: 0 });
      boss.shotQueue.push({ at: 0.36, fan: 0 });
    } else {
      for (var k = -2; k <= 2; k++) boss.shotQueue.push({ at: 0, fan: k * 0.12 });
    }
  }

  if (!boss.summoned && boss.hp <= boss.hpMax * 0.5) {
    boss.summoned = true;
    boss.jawT = 0.7;
    if (ctx.wave >= 10) { spawnBrute(); spawnSlasher(); }
    else { spawnSlasher(); spawnSlasher(); }
    showBanner("MORE PIRATES!", "", true);
  }
}

export function hitBoss(dmg, atPos) {
  if (!ctx.boss || ctx.boss.entering) return;
  ctx.boss.hp -= dmg;
  spawnSpark(atPos);
  elBossFill.style.width = Math.max(0, (ctx.boss.hp / ctx.boss.hpMax) * 100) + "%";
  if (ctx.boss.hp <= 0) killBoss();
}

export function killBoss() {
  var boss = ctx.boss;
  var pos = boss.group.position.clone(); pos.y += 6;
  var pts = 300 * boss.tier;
  ctx.score += pts; updateScore();
  scorePop(pos, "+" + pts, true);
  for (var i = 0; i < 5; i++) {
    ctx.bossQueueDelay.push({ at: i * 0.18,
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9,
                                             (Math.random() - 0.5) * 8,
                                             (Math.random() - 0.5) * 4)),
      power: 2.4 });
  }
  spawnBones(pos, 18, 17);
  sfx.bossDie();
  sfx.bonk();
  shake(1.0, 1.0);
  ctx.scene.remove(boss.group);
  ctx.boss = null;
  elBossWrap.style.display = "none";
  showBanner("BOSS DEFEATED!", "GREAT FLYING, PILOT!", false);
  spawnWeaponCrate();
  if (ctx.hearts < ctx.MAX_HEARTS) spawnHeart();
}
