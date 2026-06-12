/* ---------------- SKELETON PIRATES (shared parts, builder, enemy logic) ---------------- */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { spawnExplosion, spawnBones, spawnGoldSpark } from "./effects.js";
import { updateScore, scorePop, showBanner } from "./ui.js";
import { spawnAutoPickup } from "./pickups.js";
import { comboKill } from "./combo.js";
import { fireBolt, boltMatPurple } from "./weapons.js";

var ctx;

export function initSkeletons(c) { ctx = c; }

/* ---------------- SHARED SKELETON PARTS ---------------- */
export var G = {}, M = {};

export function buildSharedParts() {
  G.skull   = new THREE.SphereGeometry(0.55, 14, 12);
  G.socket  = new THREE.SphereGeometry(0.16, 8, 8);
  G.pupil   = new THREE.SphereGeometry(0.08, 6, 6);
  G.pupilB  = new THREE.SphereGeometry(0.13, 6, 6);
  G.eyeGlow = new THREE.SphereGeometry(0.32, 8, 8);
  G.nose    = new THREE.BoxGeometry(0.1, 0.14, 0.1);
  G.jawBone = new THREE.BoxGeometry(0.4, 0.14, 0.34);
  G.tooth   = new THREE.BoxGeometry(0.09, 0.12, 0.08);
  G.torso   = new THREE.BoxGeometry(1.05, 1.25, 0.55);
  G.stripe  = new THREE.BoxGeometry(1.08, 0.1, 0.58);
  G.collar  = new THREE.BoxGeometry(0.9, 0.08, 0.2);
  G.pelvis  = new THREE.BoxGeometry(0.8, 0.3, 0.5);
  G.limb    = new THREE.BoxGeometry(0.22, 1.0, 0.22);
  G.joint   = new THREE.SphereGeometry(0.13, 8, 8);
  G.hand    = new THREE.SphereGeometry(0.12, 8, 8);
  G.foot    = new THREE.BoxGeometry(0.26, 0.12, 0.4);
  G.brim    = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 14);
  G.crown   = new THREE.CylinderGeometry(0.34, 0.52, 0.6, 14);
  G.band    = new THREE.CylinderGeometry(0.53, 0.53, 0.08, 14);
  G.emblem  = new THREE.SphereGeometry(0.07, 6, 6);
  G.cross   = new THREE.BoxGeometry(0.22, 0.04, 0.04);
  G.feather = new THREE.ConeGeometry(0.09, 0.5, 6);
  G.horn    = new THREE.ConeGeometry(0.15, 0.75, 6);
  G.crack   = new THREE.BoxGeometry(0.035, 0.4, 0.02);
  G.scar    = new THREE.BoxGeometry(0.05, 0.36, 0.02);
  G.patch   = new THREE.BoxGeometry(0.27, 0.16, 0.05);
  G.strap   = new THREE.BoxGeometry(1.1, 0.05, 0.05);
  G.plate   = new THREE.BoxGeometry(1.15, 1.0, 0.18);
  /* v3 jetpack: backpack + angled boosters with long flames seen from the front */
  G.pack    = new THREE.BoxGeometry(0.72, 0.6, 0.32);
  G.nozzle  = new THREE.CylinderGeometry(0.13, 0.19, 0.55, 8);
  G.flame   = new THREE.ConeGeometry(0.19, 0.95, 6);
  G.flameIn = new THREE.ConeGeometry(0.1, 0.6, 6);
  G.blade   = new THREE.BoxGeometry(0.1, 1.5, 0.05);
  G.bladeW  = new THREE.BoxGeometry(0.17, 1.7, 0.05);
  G.bladeTip= new THREE.ConeGeometry(0.07, 0.18, 4);
  G.guard   = new THREE.BoxGeometry(0.42, 0.1, 0.12);
  G.grip    = new THREE.BoxGeometry(0.12, 0.3, 0.12);
  G.pommel  = new THREE.SphereGeometry(0.08, 6, 6);
  G.gunBody = new THREE.BoxGeometry(0.26, 0.7, 0.26);
  G.gunBarrel = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8);
  G.rifleBarrel = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
  G.gunCoil = new THREE.TorusGeometry(0.12, 0.03, 6, 12);
  G.gunTip  = new THREE.SphereGeometry(0.1, 6, 6);
  G.aura    = new THREE.SphereGeometry(2.3, 12, 10);
  G.capeStrip = new THREE.BoxGeometry(0.8, 2.4, 0.06);
  G.pauldron = new THREE.SphereGeometry(0.5, 10, 8);
  G.belt    = new THREE.BoxGeometry(1.1, 0.18, 0.6);

  M.bone   = new THREE.MeshPhongMaterial({ color: 0xe9e3d2, flatShading: true, shininess: 4 });
  M.boneBoss = new THREE.MeshPhongMaterial({ color: 0xcfc3a6, flatShading: true, shininess: 4 });
  M.boneGold = new THREE.MeshPhongMaterial({ color: 0xffd96a, emissive: 0xffb820,
              emissiveIntensity: 0.95, flatShading: true, shininess: 30 });
  M.goldPupil = new THREE.MeshBasicMaterial({ color: 0xffffd0 });
  M.goldAura = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true,
              opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  M.dark   = new THREE.MeshPhongMaterial({ color: 0x15131c, flatShading: true, shininess: 4 });
  M.iron   = new THREE.MeshPhongMaterial({ color: 0x3a3f4c, flatShading: true, shininess: 4 });
  M.hat    = new THREE.MeshPhongMaterial({ color: 0x221c2c, flatShading: true, shininess: 4 });
  M.gold   = new THREE.MeshPhongMaterial({ color: 0xcaa052, flatShading: true, shininess: 4 });
  M.red    = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
  M.purple = new THREE.MeshBasicMaterial({ color: 0xd24dff });
  M.redGlow= new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true,
              opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  M.metal  = new THREE.MeshPhongMaterial({ color: 0xb9c4d8, emissive: 0x1a2230,
              flatShading: true, shininess: 4 });
  M.gun    = new THREE.MeshPhongMaterial({ color: 0x2a2f3c, flatShading: true, shininess: 4 });
  M.coil   = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true,
              opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  M.coilP  = new THREE.MeshBasicMaterial({ color: 0xd24dff, transparent: true,
              opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  M.flame  = new THREE.MeshBasicMaterial({ color: 0xff8c2a, transparent: true,
              opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  M.flameIn= new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true,
              opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  M.cape   = new THREE.MeshPhongMaterial({ color: 0x230d14, flatShading: true, shininess: 4 });
  M.heart  = new THREE.MeshPhongMaterial({ color: 0xff3050, emissive: 0xff2040,
              emissiveIntensity: 0.55, flatShading: true, shininess: 4 });
}

/* Build one skeleton pirate.
   type: "slasher" | "gunner" | "brute" | "sniper" | "golden" | "boss" */
export function makeSkeleton(type, scale) {
  var g = new THREE.Group();
  var isBoss = (type === "boss");
  var bMat = isBoss ? M.boneBoss : (type === "golden" ? M.boneGold : M.bone);

  function mesh(geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m); return m;
  }

  // body core
  mesh(G.pelvis, bMat, 0, 1.32, 0);
  mesh(G.torso,  bMat, 0, 1.95, 0);
  mesh(G.stripe, M.dark, 0, 1.65, 0);
  mesh(G.stripe, M.dark, 0, 1.95, 0);
  mesh(G.stripe, M.dark, 0, 2.25, 0);
  mesh(G.collar, bMat, 0, 2.6, 0.1);
  if (type === "brute") mesh(G.plate, M.iron, 0, 1.95, 0.24);

  // skull
  mesh(G.skull,  bMat, 0, 3.0, 0);
  mesh(G.socket, M.dark, -0.2, 3.06, 0.42);
  mesh(G.socket, M.dark,  0.2, 3.06, 0.42);
  var pupilMat = (type === "sniper") ? M.purple :
                 (type === "golden") ? M.goldPupil : M.red;
  mesh(isBoss ? G.pupilB : G.pupil, pupilMat, -0.2, 3.06, 0.52);
  mesh(isBoss ? G.pupilB : G.pupil, pupilMat,  0.2, 3.06, 0.52);
  var halos = null;
  if (isBoss) {
    var h1 = mesh(G.eyeGlow, M.redGlow, -0.2, 3.06, 0.5);
    var h2 = mesh(G.eyeGlow, M.redGlow,  0.2, 3.06, 0.5);
    halos = [h1, h2];
    // cracked ashen skull + glowing scar
    var ck1 = mesh(G.crack, M.dark, 0.14, 3.22, 0.49); ck1.rotation.z = -0.5;
    var ck2 = mesh(G.crack, M.dark, -0.06, 2.86, 0.5); ck2.rotation.z = 0.8;
    var scar = mesh(G.scar, M.red, -0.2, 3.1, 0.54); scar.rotation.z = 0.35;
  }
  if (type === "brute") {
    var ep = mesh(G.patch, M.dark, 0.2, 3.08, 0.5);
    var st = mesh(G.strap, M.dark, 0, 3.18, 0); st.rotation.z = 0.18;
  }
  mesh(G.nose, M.dark, 0, 2.92, 0.5);
  var jaw = mesh(G.jawBone, bMat, 0, 2.58, 0.14);
  mesh(G.tooth, bMat, -0.15, 2.72, 0.46);
  mesh(G.tooth, bMat, -0.05, 2.72, 0.48);
  mesh(G.tooth, bMat,  0.05, 2.72, 0.48);
  mesh(G.tooth, bMat,  0.15, 2.72, 0.46);

  // pirate hat (+ horns for the boss)
  var brim = mesh(G.brim, M.hat, 0, 3.42, 0); brim.rotation.z = 0.07;
  var crown = mesh(G.crown, M.hat, 0, 3.78, 0); crown.rotation.z = 0.07;
  var band = mesh(G.band, M.gold, 0, 3.53, 0); band.rotation.z = 0.07;
  mesh(G.emblem, bMat, 0, 3.8, 0.5);
  var c1 = mesh(G.cross, bMat, 0, 3.7, 0.5); c1.rotation.z = 0.7;
  var c2 = mesh(G.cross, bMat, 0, 3.7, 0.5); c2.rotation.z = -0.7;
  var feather = mesh(G.feather, M.red, 0.5, 3.98, 0); feather.rotation.z = -2.5;
  if (isBoss) {
    var hornL = mesh(G.horn, M.dark, -0.72, 3.5, 0); hornL.rotation.z = 2.45;
    var hornR = mesh(G.horn, M.dark,  0.72, 3.5, 0); hornR.rotation.z = -2.45;
  }

  /* v3 jetpack: backpack with angled side boosters, flames visible from
     the front beside the hips */
  mesh(G.pack, M.gun, 0, 2.25, -0.42);
  function booster(side) {
    var bg = new THREE.Group();
    bg.position.set(side * 0.42, 1.92, -0.38);
    bg.rotation.z = -side * 0.32;
    var nz = new THREE.Mesh(G.nozzle, M.iron); bg.add(nz);
    var fo = new THREE.Mesh(G.flame, M.flame);
    fo.rotation.x = Math.PI; fo.position.y = -0.72; bg.add(fo);
    var fi = new THREE.Mesh(G.flameIn, M.flameIn);
    fi.rotation.x = Math.PI; fi.position.y = -0.58; bg.add(fi);
    g.add(bg);
    return { outer: fo, inner: fi };
  }
  var boostL = booster(-1), boostR = booster(1);
  var flames = [boostL.outer, boostR.outer, boostL.inner, boostR.inner];

  // joints
  mesh(G.joint, bMat, -0.28, 1.25, 0);
  mesh(G.joint, bMat,  0.28, 1.25, 0);
  mesh(G.joint, bMat, -0.72, 2.42, 0);
  mesh(G.joint, bMat,  0.72, 2.42, 0);

  // limbs
  function limbGroup(x, y, withFoot) {
    var lg = new THREE.Group(); lg.position.set(x, y, 0);
    var lm = new THREE.Mesh(G.limb, bMat); lm.position.y = -0.55;
    lg.add(lm);
    if (withFoot) {
      var ft = new THREE.Mesh(G.foot, bMat); ft.position.set(0, -1.1, 0.06);
      lg.add(ft);
    } else {
      var hd = new THREE.Mesh(G.hand, bMat); hd.position.set(0, -1.08, 0);
      lg.add(hd);
    }
    g.add(lg); return lg;
  }
  var legL = limbGroup(-0.28, 1.25, true);
  var legR = limbGroup( 0.28, 1.25, true);
  var armL = limbGroup(-0.72, 2.42, false);

  var armR = new THREE.Group(); armR.position.set(0.72, 2.42, 0);
  var armMesh = new THREE.Mesh(G.limb, bMat); armMesh.position.y = -0.55;
  armR.add(armMesh);
  var handR = new THREE.Mesh(G.hand, bMat); handR.position.set(0, -1.05, 0);
  armR.add(handR);
  g.add(armR);

  var holdsSword = (type === "slasher" || type === "brute" || isBoss);
  if (holdsSword) {
    var bladeGeo = (type === "brute") ? G.bladeW : G.blade;
    var blade = new THREE.Mesh(bladeGeo, M.metal); blade.position.set(0, -1.85, 0);
    var btip  = new THREE.Mesh(G.bladeTip, M.metal); btip.position.set(0, -2.78, 0);
    btip.rotation.x = Math.PI;
    var guard = new THREE.Mesh(G.guard, M.gold);  guard.position.set(0, -1.12, 0);
    var grip  = new THREE.Mesh(G.grip, M.gun);    grip.position.set(0, -0.92, 0);
    var pom   = new THREE.Mesh(G.pommel, M.gold); pom.position.set(0, -0.74, 0);
    armR.add(blade); armR.add(btip); armR.add(guard); armR.add(grip); armR.add(pom);
    armR.rotation.x = -2.2;
  }
  if (type === "gunner" || type === "sniper" || isBoss) {
    var gunArm = isBoss ? armL : armR;
    var coilMat = (type === "sniper") ? M.coilP : M.coil;
    var tipMat  = (type === "sniper") ? M.purple : M.red;
    var gun = new THREE.Mesh(G.gunBody, M.gun); gun.position.set(0, -0.95, 0);
    gunArm.add(gun);
    if (type === "sniper") {
      var rb = new THREE.Mesh(G.rifleBarrel, M.gun); rb.position.set(0, -1.7, 0);
      gunArm.add(rb);
      var co1 = new THREE.Mesh(G.gunCoil, coilMat); co1.position.set(0, -1.4, 0);
      co1.rotation.x = Math.PI / 2; gunArm.add(co1);
      var co2 = new THREE.Mesh(G.gunCoil, coilMat); co2.position.set(0, -1.8, 0);
      co2.rotation.x = Math.PI / 2; gunArm.add(co2);
      var tipS = new THREE.Mesh(G.gunTip, tipMat); tipS.position.set(0, -2.22, 0);
      gunArm.add(tipS);
    } else {
      var gb  = new THREE.Mesh(G.gunBarrel, M.gun); gb.position.set(0, -1.45, 0);
      gunArm.add(gb);
      var c01 = new THREE.Mesh(G.gunCoil, coilMat); c01.position.set(0, -1.28, 0);
      c01.rotation.x = Math.PI / 2; gunArm.add(c01);
      var c02 = new THREE.Mesh(G.gunCoil, coilMat); c02.position.set(0, -1.42, 0);
      c02.rotation.x = Math.PI / 2; gunArm.add(c02);
      var tipG = new THREE.Mesh(G.gunTip, tipMat); tipG.position.set(0, -1.72, 0);
      gunArm.add(tipG);
    }
    gunArm.rotation.x = -Math.PI / 2;
  }
  var capes = null;
  if (isBoss) {
    var capeMid = new THREE.Mesh(G.capeStrip, M.cape);
    capeMid.position.set(0, 2.0, -0.62); capeMid.rotation.x = 0.12;
    capeMid.scale.y = 1.15;
    var capeL = new THREE.Mesh(G.capeStrip, M.cape);
    capeL.position.set(-0.7, 2.1, -0.58); capeL.rotation.x = 0.18; capeL.rotation.z = 0.08;
    var capeR = new THREE.Mesh(G.capeStrip, M.cape);
    capeR.position.set(0.7, 2.1, -0.58); capeR.rotation.x = 0.18; capeR.rotation.z = -0.08;
    g.add(capeMid); g.add(capeL); g.add(capeR);
    capes = [capeL, capeMid, capeR];
    mesh(G.pauldron, M.iron, -0.78, 2.55, 0);
    mesh(G.pauldron, M.iron,  0.78, 2.55, 0);
    mesh(G.belt, M.gold, 0, 1.45, 0);
    // menacing red glow staining the ground beneath the boss
    var glowLight = new THREE.PointLight(0xff2010, 1.15, 48);
    glowLight.position.set(0, 2.5, 1);
    g.add(glowLight);
  }

  var aura = null;
  if (type === "golden") {
    aura = mesh(G.aura, M.goldAura, 0, 2.2, 0);
  }

  g.scale.set(scale, scale, scale);
  return { group: g, legL: legL, legR: legR, armL: armL, armR: armR,
           flames: flames, jaw: jaw, halos: halos, capes: capes,
           aura: aura, holdsSword: holdsSword };
}

/* ---------------- ENEMIES ---------------- */
export function spawnSlasher() {
  var sk = makeSkeleton("slasher", 1);
  var e = {
    kind: "slasher", parts: sk, group: sk.group,
    hp: 1 + Math.floor(ctx.wave / 6),
    speed: Math.min(9 + ctx.wave * 0.7, 22),
    t: Math.random() * 10, phase: Math.random() * 6,
    slashing: false, slashT: 0, scale: 1, pts: 10, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, 4 + Math.random() * 6, -130);
  ctx.scene.add(e.group); ctx.enemies.push(e);
}

export function spawnBrute() {
  var sk = makeSkeleton("brute", 1.45);
  var e = {
    kind: "brute", parts: sk, group: sk.group,
    hp: 5 + Math.floor(ctx.wave / 4),
    speed: Math.min(7 + ctx.wave * 0.35, 13),
    t: Math.random() * 10, phase: Math.random() * 6,
    slashing: false, slashT: 0, scale: 1.45, pts: 30, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, 4 + Math.random() * 6, -135);
  ctx.scene.add(e.group); ctx.enemies.push(e);
}

export function spawnGunner() {
  var sk = makeSkeleton("gunner", 1);
  var e = {
    kind: "gunner", parts: sk, group: sk.group,
    hp: 3 + Math.floor(ctx.wave / 5),
    baseY: 4 + Math.random() * 5,
    targetZ: -55 + Math.random() * 16,
    homeX: (Math.random() - 0.5) * 44,
    sway: 6,
    t: Math.random() * 10, phase: Math.random() * 6,
    fireT: 1.5 + Math.random() * 2,
    fireRate: Math.max(1.5, 3.3 - ctx.wave * 0.12),
    boltSpeed: 24 + ctx.wave * 0.6, boltMat: null, boltScale: 1,
    scale: 1, pts: 15, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, e.baseY, -140);
  ctx.scene.add(e.group); ctx.enemies.push(e);
}

export function spawnSniper() {
  var sk = makeSkeleton("sniper", 1.1);
  var e = {
    kind: "sniper", parts: sk, group: sk.group,
    hp: 4 + Math.floor(ctx.wave / 6),
    baseY: 4.5 + Math.random() * 4,
    targetZ: -72 + Math.random() * 12,
    homeX: (Math.random() - 0.5) * 40,
    sway: 4,
    t: Math.random() * 10, phase: Math.random() * 6,
    fireT: 2 + Math.random() * 2,
    fireRate: Math.max(2.2, 4.0 - ctx.wave * 0.08),
    boltSpeed: 40, boltMat: null, boltScale: 0.85,
    scale: 1.1, pts: 25, remove: false
  };
  e.boltMat = boltMatPurple;
  e.group.position.set((Math.random() - 0.5) * 70, e.baseY, -150);
  ctx.scene.add(e.group); ctx.enemies.push(e);
}

/* ---------------- GOLDEN SKELETON (M1 item 4) ----------------
   Rare bonus chase: fast darting flier at parked-shooter depth, never
   attacks, flees after GOLDEN_WINDOW seconds. Blast-immune BY DESIGN
   (map 6.13): a SUPER BLAST scares him off instead of paying a free
   multiplied 100. Reachability (worst case INCLUDING the z weave,
   which brings him to z -40): x within 23 at dz 46 needs 0.46 rad yaw
   vs the 0.85 limit, pitch 0.14 vs 0.55. Tuning approved 2026-06-12
   as starting values. */
export var GOLDEN_WINDOW = 8;   // seconds on screen before he flees

export function spawnGolden() {
  var sk = makeSkeleton("golden", 1);
  var e = {
    kind: "golden", parts: sk, group: sk.group,
    hp: 2,
    baseY: 4.5 + Math.random() * 4,
    targetZ: -45 - Math.random() * 20,
    homeX: (Math.random() - 0.5) * 36,
    t: Math.random() * 10, phase: Math.random() * 6,
    windowT: GOLDEN_WINDOW, fleeing: false, fleeSpeed: 30,
    arrived: false, dartT: 0, sparkT: 0,
    scale: 1, pts: 100, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 50, e.baseY, -150);
  ctx.scene.add(e.group); ctx.enemies.push(e);
  showBanner("GOLDEN SKELETON!", "CATCH HIM QUICK!", false);
  sfx.goldenSpawn();
}

/* The chase ends: the timer ran out (teased) or a SUPER BLAST scared
   him off (no tease, the kid did the right thing). */
export function fleeGolden(e, teased) {
  if (e.fleeing || e.remove) return;
  e.fleeing = true;
  sfx.goldenFlee();
  if (teased) {
    enemyCenter(e, ctx.tmpV);
    scorePop(ctx.tmpV, "TOO SLOW!", false);
  }
}

export function enemyCenter(e, out) {
  out.copy(e.group.position); out.y += 1.7 * e.scale; return out;
}

export function killEnemy(e, scored) {
  enemyCenter(e, ctx.tmpV);
  spawnExplosion(ctx.tmpV, e.kind === "brute" ? 1.5 : 1.1);
  spawnBones(ctx.tmpV, e.kind === "brute" ? 11 : 7, 9);
  sfx.boom(0.6);
  sfx.bonk();
  if (scored) {
    comboKill();
    ctx.chargeSuper(1);
    var pts = e.pts * ctx.comboMult;
    ctx.score += pts; updateScore();
    scorePop(ctx.tmpV, "+" + pts, e.kind === "golden");
    if (e.kind === "golden") sfx.kaching();
    ctx.kills++; ctx.killsSincePickup++;
    if (ctx.killsSincePickup >= 9) { ctx.killsSincePickup = 0; spawnAutoPickup(); }
  }
  e.remove = true;
  ctx.scene.remove(e.group);
}

export function updateEnemies(dt) {
  for (var i = 0; i < ctx.enemies.length; i++) {
    var e = ctx.enemies[i];
    if (e.remove) continue;
    e.t += dt;
    var g = e.group;
    var melee = (e.kind === "slasher" || e.kind === "brute");

    var run = Math.sin(e.t * 9 + e.phase);
    e.parts.legL.rotation.x = run * 0.55;
    e.parts.legR.rotation.x = -run * 0.55;
    if (melee) e.parts.armL.rotation.x = -run * 0.4;
    var fx = 0.85 + Math.random() * 0.35;
    var fy = 0.75 + Math.random() * 0.5;
    for (var f = 0; f < 4; f++) {
      e.parts.flames[f].scale.x = fx;
      e.parts.flames[f].scale.y = fy;
    }

    if (e.kind === "golden") {
      // shimmer aura pulse and gold sparkle trail, darting AND fleeing
      e.parts.aura.scale.setScalar(1 + Math.sin(e.t * 5) * 0.12);
      e.sparkT -= dt;
      if (e.sparkT <= 0) {
        e.sparkT = 0.07;
        enemyCenter(e, ctx.tmpV2);
        spawnGoldSpark(ctx.tmpV2);
      }
      if (e.fleeing) {
        e.fleeSpeed += dt * 90;
        g.position.z -= e.fleeSpeed * dt;
        g.position.y += dt * 2.5;
        g.lookAt(g.position.x, g.position.y, g.position.z - 10);
        if (g.position.z < -170) { e.remove = true; ctx.scene.remove(e.group); }
      } else {
        e.windowT -= dt;
        if (e.windowT <= 0) fleeGolden(e, true);
        if (!e.arrived && g.position.z < e.targetZ) {
          // fast entry down the canyon to the dart zone
          g.position.z += 55 * dt;
          g.position.x += (e.homeX - g.position.x) * dt * 2.0;
          g.position.y = e.baseY;
        } else {
          // dart: quick two-frequency weave, never attacks. Arrival is
          // LATCHED because the z weave dips below targetZ by design;
          // an unlatched gate re-triggers the entry branch and he
          // stutters. Amplitudes ease in over 0.5s and the position
          // follows the weave target, so the switch frame is
          // continuous (no pop, the aim assist never drops him).
          e.arrived = true;
          e.dartT += dt;
          var amp = Math.min(1, e.dartT / 0.5);
          var gk = Math.min(1, dt * 8);
          g.position.x += (e.homeX + Math.sin(e.t * 2.6 + e.phase) * 5 * amp - g.position.x) * gk;
          g.position.y += (e.baseY + Math.sin(e.t * 3.4 + e.phase) * 1.5 * amp - g.position.y) * gk;
          g.position.z += (e.targetZ + Math.sin(e.t * 1.7 + e.phase) * 5 * amp - g.position.z) * gk;
        }
        g.lookAt(ctx.PLAYER_POS.x, g.position.y, ctx.PLAYER_POS.z);
      }
    } else if (melee) {
      if (!e.slashing) {
        ctx.tmpV2.copy(ctx.PLAYER_POS).sub(g.position).normalize();
        g.position.addScaledVector(ctx.tmpV2, e.speed * dt);
        g.position.x += Math.sin(e.t * 2 + e.phase) * dt * 4;
        g.position.y += Math.sin(e.t * 2.2 + e.phase) * dt * 1.2;
        g.lookAt(ctx.PLAYER_POS.x, g.position.y, ctx.PLAYER_POS.z);
        e.parts.armR.rotation.x = -2.2 + Math.sin(e.t * 3) * 0.12;
        if (g.position.distanceTo(ctx.PLAYER_POS) < 5.5 + e.scale) {
          e.slashing = true; e.slashT = 0;
        }
      } else {
        e.slashT += dt;
        e.parts.armR.rotation.x = -2.2 + Math.min(e.slashT / 0.22, 1) * 3.2;
        if (e.slashT >= 0.22 && !e.didHit) {
          e.didHit = true;
          ctx.damagePlayer();
        }
        if (e.slashT >= 0.5) killEnemy(e, false);
      }
    } else { // gunner or sniper
      if (g.position.z < e.targetZ) {
        g.position.z += 18 * dt;
        g.position.x += (e.homeX - g.position.x) * dt * 0.8;
      } else {
        g.position.x = e.homeX + Math.sin(e.t * 1.1 + e.phase) * e.sway;
      }
      g.position.y = e.baseY + Math.sin(e.t * 2.2 + e.phase) * 0.5;
      g.lookAt(ctx.PLAYER_POS.x, g.position.y, ctx.PLAYER_POS.z);
      e.fireT -= dt;
      if (e.fireT <= 0 && g.position.z >= e.targetZ - 5) {
        e.fireT = e.fireRate;
        enemyCenter(e, ctx.tmpV2); ctx.tmpV2.y += 0.4;
        fireBolt(ctx.tmpV2, e.boltSpeed, e.boltScale, e.boltMat);
        if (e.kind === "sniper") sfx.sniperShot(); else sfx.enemyShot();
      }
    }
  }
  ctx.enemies = ctx.enemies.filter(function (e) { return !e.remove; });
}
