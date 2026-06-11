/* ---------------- WEAPONS (tier ladder, cockpit cannon, bullets, bolts, aim) ---------------- */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { getFree, spawnSpark, spawnExplosion, shake } from "./effects.js";
import { enemyCenter, killEnemy } from "./skeletons.js";
import { hitBoss } from "./boss.js";
import { updateScore, scorePop, elWeaponName, elWeaponDot, elWeaponLv, elCross } from "./ui.js";

var ctx;

/* ---------------- WEAPON TIER LADDER (arcade progression) ----------------
   Crates always upgrade you one tier. Tiers unlock by wave, so firepower
   scales as harder skeletons arrive. At max tier, crates pay score. */
export var TIERS = [
  { name: "LASER BLASTER",  css: "#4df3ff", color: 0x4df3ff,
    rate: 0.17, dmg: 1, speed: 170, size: 0.30, count: 1, spread: 0,    splash: 0 },
  { name: "TWIN LASER",     css: "#9af6ff", color: 0x9af6ff,
    rate: 0.15, dmg: 1, speed: 175, size: 0.28, count: 2, spread: 0.035, splash: 0 },
  { name: "TRIPLE BLASTER", css: "#ffd34d", color: 0xffd34d,
    rate: 0.24, dmg: 1, speed: 165, size: 0.28, count: 3, spread: 0.07,  splash: 0 },
  { name: "PLASMA CANNON",  css: "#7cff6b", color: 0x9dffa0,
    rate: 0.42, dmg: 5, speed: 130, size: 0.55, count: 1, spread: 0,     splash: 6 },
  { name: "PLASMA STORM",   css: "#c8ff5e", color: 0xc8ff5e,
    rate: 0.50, dmg: 4, speed: 125, size: 0.50, count: 3, spread: 0.09,  splash: 5 }
];

export function maxTierForWave(w) {
  if (w >= 11) return 4;   // Plasma Storm era
  if (w >= 6)  return 3;   // Plasma Cannon arrives with the Brutes
  if (w >= 3)  return 2;   // Triple Blaster
  return 1;                // Twin Laser
}

export function initWeapons(c) {
  ctx = c;
  ctx.weapon = TIERS[0];
}

/* ---------------- COCKPIT CANNON (smaller in v3) ---------------- */
var cannon, cannonTipMesh, cannonTipMat, cannonRingMat, muzzleFlash, recoil = 0;

export function buildCockpitCannon() {
  cannon = new THREE.Group();
  var grey = new THREE.MeshLambertMaterial({ color: 0x6a7484, flatShading: true });
  var dark = new THREE.MeshLambertMaterial({ color: 0x2a2f3c, flatShading: true });
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 1.5, 10), grey);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.62, -1.55);
  cannon.add(barrel);
  var housing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.85), dark);
  housing.position.set(0, -0.76, -0.72);
  cannon.add(housing);
  var ventL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.5), grey);
  ventL.position.set(-0.32, -0.7, -0.75); cannon.add(ventL);
  var ventR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.5), grey);
  ventR.position.set(0.32, -0.7, -0.75); cannon.add(ventR);
  var fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.7), grey);
  fin.position.set(0, -0.42, -1.1);
  cannon.add(fin);
  cannonTipMat = new THREE.MeshBasicMaterial({ color: 0x4df3ff });
  cannonTipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cannonTipMat);
  cannonTipMesh.position.set(0, -0.62, -2.3);
  cannon.add(cannonTipMesh);
  cannonRingMat = new THREE.MeshBasicMaterial({ color: 0x4df3ff, transparent: true,
    opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 18), cannonRingMat);
  ring.position.set(0, -0.62, -2.1);
  cannon.add(ring);
  muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false })
  );
  muzzleFlash.position.set(0, -0.62, -2.35);
  cannon.add(muzzleFlash);
  // v3: ~45% smaller and tucked toward the bottom edge of the visor
  cannon.scale.setScalar(0.55);
  cannon.position.set(0, -0.46, -0.1);
  ctx.camera.add(cannon);
}

/* ---------------- POOLS ---------------- */
export var bullets = [], bolts = [];
export var boltMatRed, boltMatPurple;

export function buildWeaponPools() {
  var i;
  var bulletGeo = new THREE.SphereGeometry(1, 8, 8);
  var tierMats = [];
  for (i = 0; i < TIERS.length; i++) {
    var isPlasma = i >= 3;
    tierMats.push(new THREE.MeshBasicMaterial(isPlasma ?
      { color: TIERS[i].color, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false } :
      { color: TIERS[i].color }));
  }
  for (i = 0; i < 70; i++) {
    var bm = new THREE.Mesh(bulletGeo, tierMats[0]);
    bm.visible = false; ctx.scene.add(bm);
    bullets.push({ mesh: bm, mats: tierMats, active: false,
                   vel: new THREE.Vector3(), dmg: 1, splash: 0, r: 0.5 });
  }
  boltMatRed = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true,
      opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  boltMatPurple = new THREE.MeshBasicMaterial({ color: 0xd24dff, transparent: true,
      opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  for (i = 0; i < 40; i++) {
    var btm = new THREE.Mesh(bulletGeo, boltMatRed);
    btm.visible = false; ctx.scene.add(btm);
    bolts.push({ mesh: btm, active: false, vel: new THREE.Vector3(), r: 0.95 });
  }
}

export function fireBolt(fromPos, speed, scaleMul, mat) {
  var b = getFree(bolts); if (!b) return;
  b.active = true;
  b.mesh.visible = true;
  b.mesh.material = mat || boltMatRed;
  b.mesh.position.copy(fromPos);
  ctx.tmpV.copy(ctx.PLAYER_POS).sub(fromPos).normalize();
  b.vel.copy(ctx.tmpV).multiplyScalar(speed);
  ctx.tmpV2.copy(fromPos).add(ctx.tmpV);
  b.mesh.lookAt(ctx.tmpV2);
  var s = 0.5 * (scaleMul || 1);
  b.mesh.scale.set(s, s, s * 2.6);
}

export function fireBoltDir(fromPos, dir, speed, scaleMul, mat) {
  var b = getFree(bolts); if (!b) return;
  b.active = true;
  b.mesh.visible = true;
  b.mesh.material = mat || boltMatRed;
  b.mesh.position.copy(fromPos);
  b.vel.copy(dir).multiplyScalar(speed);
  ctx.tmpV2.copy(fromPos).add(dir);
  b.mesh.lookAt(ctx.tmpV2);
  var s = 0.5 * (scaleMul || 1);
  b.mesh.scale.set(s, s, s * 2.6);
}

export function setWeaponTier(i) {
  ctx.weaponTier = i;
  ctx.weapon = TIERS[i];
  elWeaponName.textContent = ctx.weapon.name;
  elWeaponDot.style.background = ctx.weapon.css;
  elWeaponDot.style.color = ctx.weapon.css;
  elWeaponLv.textContent = "LV " + (i + 1);
  cannonTipMat.color.setHex(ctx.weapon.color);
  cannonRingMat.color.setHex(ctx.weapon.color);
}

/* ---------------- SHOOTING ---------------- */
function acquireAimPoint() {
  ctx.camera.getWorldDirection(ctx.camDir);
  var bestDot = 0.993, found = false;
  for (var i = 0; i < ctx.enemies.length; i++) {
    if (ctx.enemies[i].remove) continue;
    enemyCenter(ctx.enemies[i], ctx.tmpV);
    ctx.tmpV2.copy(ctx.tmpV).sub(ctx.camera.position).normalize();
    var d = ctx.tmpV2.dot(ctx.camDir);
    if (d > bestDot) { bestDot = d; ctx.assistPoint.copy(ctx.tmpV); found = true; }
  }
  if (ctx.boss && !ctx.boss.entering) {
    enemyCenter({ group: ctx.boss.group, scale: 3.8 }, ctx.tmpV);
    ctx.tmpV2.copy(ctx.tmpV).sub(ctx.camera.position).normalize();
    if (ctx.tmpV2.dot(ctx.camDir) > 0.985) { ctx.assistPoint.copy(ctx.tmpV); found = true; }
  }
  if (!found) {
    ctx.assistPoint.copy(ctx.camera.position).addScaledVector(ctx.camDir, 80);
  }
  return ctx.assistPoint;
}

export function fireWeapon() {
  ctx.camera.updateMatrixWorld(true);
  var target = acquireAimPoint();
  var up = new THREE.Vector3(0, 1, 0).applyQuaternion(ctx.camera.quaternion);
  var muzzle = new THREE.Vector3();
  cannonTipMesh.getWorldPosition(muzzle);
  var baseDir = target.clone().sub(muzzle).normalize();

  for (var c = 0; c < ctx.weapon.count; c++) {
    var b = getFree(bullets); if (!b) break;
    var ang = (c - (ctx.weapon.count - 1) / 2) * ctx.weapon.spread;
    var dir = baseDir.clone();
    if (ang !== 0) dir.applyAxisAngle(up, ang);
    b.active = true;
    b.dmg = ctx.weapon.dmg; b.splash = ctx.weapon.splash; b.r = ctx.weapon.size;
    b.mesh.material = b.mats[ctx.weaponTier];
    b.mesh.visible = true;
    b.mesh.position.copy(muzzle);
    b.vel.copy(dir).multiplyScalar(ctx.weapon.speed);
    ctx.tmpV2.copy(muzzle).add(dir);
    b.mesh.lookAt(ctx.tmpV2);
    b.mesh.scale.set(ctx.weapon.size, ctx.weapon.size, ctx.weapon.size * 3.0);
  }
  recoil = 0.14;
  muzzleFlash.material.opacity = 0.9;
  muzzleFlash.material.color.setHex(ctx.weapon.color);
  if (ctx.weaponTier === 4) sfx.plasma();
  else if (ctx.weaponTier === 3) sfx.plasma();
  else if (ctx.weaponTier === 2) sfx.triple();
  else if (ctx.weaponTier === 1) sfx.twin();
  else sfx.laser();
}

function applySplash(center, dmg, radius) {
  var i;
  for (i = 0; i < ctx.enemies.length; i++) {
    var e = ctx.enemies[i];
    if (e.remove) continue;
    enemyCenter(e, ctx.tmpV2);
    if (ctx.tmpV2.distanceTo(center) < radius) {
      e.hp -= dmg;
      if (e.hp <= 0) killEnemy(e, true);
    }
  }
  if (ctx.boss && !ctx.boss.entering) {
    enemyCenter({ group: ctx.boss.group, scale: 3.8 }, ctx.tmpV2);
    if (ctx.tmpV2.distanceTo(center) < radius + 4) hitBoss(dmg, center);
  }
}

export function updateBullets(dt) {
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    var bp = b.mesh.position;
    if (bp.z < -260 || Math.abs(bp.x) > 200 || bp.y > 140 || bp.y < -10) {
      b.active = false; b.mesh.visible = false; continue;
    }
    var hit = false;

    for (var j = 0; j < bolts.length; j++) {
      var bo = bolts[j];
      if (!bo.active) continue;
      if (bo.mesh.position.distanceTo(bp) < bo.r + b.r) {
        bo.active = false; bo.mesh.visible = false;
        spawnSpark(bo.mesh.position);
        ctx.score += 5; updateScore();
        scorePop(bo.mesh.position, "+5", false);
        hit = true; break;
      }
    }
    if (!hit) {
      for (var k = 0; k < ctx.enemies.length; k++) {
        var e = ctx.enemies[k];
        if (e.remove) continue;
        enemyCenter(e, ctx.tmpV2);
        if (ctx.tmpV2.distanceTo(bp) < 1.55 * e.scale + b.r) {
          e.hp -= b.dmg;
          spawnSpark(bp);
          if (b.splash > 0) {
            spawnExplosion(bp, 2.4); applySplash(bp, b.dmg, b.splash);
            sfx.boom(1.2); shake(0.22, 0.18);
          }
          if (e.hp <= 0 && !e.remove) killEnemy(e, true);
          hit = true; break;
        }
      }
    }
    if (!hit && ctx.boss && !ctx.boss.entering) {
      enemyCenter({ group: ctx.boss.group, scale: 3.8 }, ctx.tmpV2);
      if (ctx.tmpV2.distanceTo(bp) < 6.2 + b.r) {
        hitBoss(b.dmg, bp);
        if (b.splash > 0) {
          spawnExplosion(bp, 2.4); sfx.boom(1.2); shake(0.22, 0.18);
        }
        hit = true;
      }
    }
    if (hit) { b.active = false; b.mesh.visible = false; }
  }
}

export function updateBolts(dt) {
  for (var i = 0; i < bolts.length; i++) {
    var b = bolts[i];
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    if (b.mesh.position.distanceTo(ctx.PLAYER_POS) < 2.6) {
      b.active = false; b.mesh.visible = false;
      ctx.damagePlayer();
      continue;
    }
    if (b.mesh.position.z > 14) { b.active = false; b.mesh.visible = false; }
  }
}

/* ---------------- CROSSHAIR TARGET CHECK ---------------- */
export function updateCrosshair() {
  var locked = false;
  ctx.camera.getWorldDirection(ctx.camDir);
  var i;
  for (i = 0; i < ctx.enemies.length; i++) {
    if (ctx.enemies[i].remove) continue;
    enemyCenter(ctx.enemies[i], ctx.tmpV);
    ctx.tmpV.sub(ctx.camera.position).normalize();
    if (ctx.tmpV.dot(ctx.camDir) > 0.993) { locked = true; break; }
  }
  if (!locked && ctx.boss && !ctx.boss.entering) {
    enemyCenter({ group: ctx.boss.group, scale: 3.8 }, ctx.tmpV);
    ctx.tmpV.sub(ctx.camera.position).normalize();
    if (ctx.tmpV.dot(ctx.camDir) > 0.985) locked = true;
  }
  elCross.classList.toggle("locked", locked);
}

/* muzzle flash fade + cannon recoil, runs every frame */
export function updateWeaponFX(dt) {
  if (muzzleFlash.material.opacity > 0) {
    muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 9);
  }
  recoil = Math.max(0, recoil - dt * 0.9);
  cannon.position.z = -0.1 + recoil;
}
