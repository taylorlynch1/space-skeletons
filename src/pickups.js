/* ---------------- PICKUPS (weapon crates, hearts) ---------------- */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { M } from "./skeletons.js";
import { TIERS, maxTierForWave, setWeaponTier } from "./weapons.js";
import { showBanner, updateHearts, updateScore } from "./ui.js";

var ctx;

export function initPickups(c) { ctx = c; }

var pickups = [];

export function nextTierIndex() {
  var cap = maxTierForWave(ctx.wave);
  return ctx.weaponTier < cap ? ctx.weaponTier + 1 : -1;
}

export function spawnAutoPickup() {
  // alternate heart and weapon crate when you're hurt; otherwise weapons
  if (ctx.hearts < ctx.MAX_HEARTS && ctx.pickupFlip) {
    ctx.pickupFlip = false;
    spawnHeart();
  } else {
    ctx.pickupFlip = true;
    spawnWeaponCrate();
  }
}

function makePickupGroup(color) {
  var g = new THREE.Group();
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 24),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  var ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  ring2.rotation.x = Math.PI / 2;
  g.add(ring); g.add(ring2);
  return g;
}

export function spawnWeaponCrate() {
  var next = nextTierIndex();
  var color = next >= 0 ? TIERS[next].color : 0xffd34d;
  var g = makePickupGroup(color);
  var box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95),
    new THREE.MeshPhongMaterial({ color: color, emissive: color,
      emissiveIntensity: 0.55, flatShading: true, shininess: 4 }));
  g.add(box);
  g.position.set((Math.random() - 0.5) * 24, 4 + Math.random() * 5, -95);
  ctx.scene.add(g);
  pickups.push({ group: g, kind: "weapon", t: 0, remove: false });
}

export function spawnHeart() {
  var g = makePickupGroup(0xff3050);
  var hg = new THREE.Group();
  var sL = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), M.heart);
  sL.position.set(-0.18, 0.14, 0);
  var sR = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), M.heart);
  sR.position.set(0.18, 0.14, 0);
  var tip = new THREE.Mesh(new THREE.ConeGeometry(0.43, 0.6, 4), M.heart);
  tip.rotation.x = Math.PI; tip.rotation.y = Math.PI / 4;
  tip.position.set(0, -0.26, 0);
  hg.add(sL); hg.add(sR); hg.add(tip);
  g.add(hg);
  g.position.set((Math.random() - 0.5) * 24, 4 + Math.random() * 5, -95);
  ctx.scene.add(g);
  pickups.push({ group: g, kind: "heart", t: 0, remove: false });
}

export function updatePickups(dt) {
  for (var i = 0; i < pickups.length; i++) {
    var p = pickups[i];
    p.t += dt;
    p.group.rotation.y += dt * 2.2;
    if (p.kind === "weapon") p.group.rotation.x += dt * 1.1;
    else {
      var ps = 1 + Math.sin(p.t * 5) * 0.12;
      p.group.scale.setScalar(ps);
    }
    p.group.position.z += 9 * dt;
    p.group.position.x += (ctx.PLAYER_POS.x - p.group.position.x) * dt * 0.5;
    p.group.position.y += (ctx.PLAYER_POS.y - p.group.position.y) * dt * 0.5;
    if (p.group.position.distanceTo(ctx.PLAYER_POS) < 4) {
      collectPickup(p);
      p.remove = true; ctx.scene.remove(p.group);
    } else if (p.group.position.z > 12) {
      p.remove = true; ctx.scene.remove(p.group);
    }
  }
  pickups = pickups.filter(function (p) { return !p.remove; });
}

function collectPickup(p) {
  if (p.kind === "heart") {
    ctx.hearts = Math.min(ctx.MAX_HEARTS, ctx.hearts + 1);
    updateHearts();
    sfx.heart();
    showBanner("+1 HEART!", "", false);
    return;
  }
  var next = nextTierIndex();
  if (next >= 0) {
    setWeaponTier(next);
    sfx.chime();
    showBanner(TIERS[next].name + "!", "WEAPON UPGRADED!", false);
  } else {
    ctx.score += 150; updateScore();
    sfx.chime();
    showBanner("MAX POWER!", "+150", false);
  }
}

export function clearPickups() {
  for (var i = 0; i < pickups.length; i++) ctx.scene.remove(pickups[i].group);
  pickups = [];
}
