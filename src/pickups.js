/* ---------------- PICKUPS (weapon crates, hearts, shields) ---------------- */
import * as THREE from "three";
import { sfx } from "./audio.js";
import { M } from "./skeletons.js";
import { TIERS, maxTierForWave, setWeaponTier } from "./weapons.js";
import { armShield } from "./shield.js";
import { showBanner, updateHearts, updateScore } from "./ui.js";

var ctx;

export function initPickups(c) { ctx = c; }

var pickups = [];
var pendingSpawns = [];
var lastSpawnAt = -10;

var PICKUP_SCALE = 0.7;  // ~30 percent smaller; collection radius unchanged
var MIN_SPACING = 7;     // world units kept between live pickups
var SPAWN_GAP = 0.45;    // near-simultaneous spawns staggered this far apart

export function nextTierIndex() {
  var cap = maxTierForWave(ctx.wave);
  return ctx.weaponTier < cap ? ctx.weaponTier + 1 : -1;
}

export function spawnAutoPickup() {
  // cycle crate, shield, heart with crate as every fallback, so crates
  // stay the most common drop; shields and hearts only when useful
  var slot = ctx.pickupCycle;
  ctx.pickupCycle = (ctx.pickupCycle + 1) % 3;
  if (slot === 1 && !ctx.shieldArmed) { spawnShield(); return; }
  if (slot === 2 && ctx.hearts < ctx.MAX_HEARTS) { spawnHeart(); return; }
  spawnWeaponCrate();
}

/* Spawns go through a queue so simultaneous drops (boss kill: crate
   plus heart in one frame) arrive SPAWN_GAP apart instead of
   overlapping. ctx.elapsed is dt-accumulated, so the queue freezes
   with the game while PAUSED. */
export function spawnWeaponCrate() { queueSpawn("weapon"); }
export function spawnHeart() { queueSpawn("heart"); }
export function spawnShield() { queueSpawn("shield"); }

function queueSpawn(kind) {
  var at = Math.max(ctx.elapsed, lastSpawnAt + SPAWN_GAP);
  lastSpawnAt = at;
  pendingSpawns.push({ kind: kind, at: at });
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

/* mini floating blaster tinted for the tier on offer at SPAWN time;
   the grant itself is recomputed at collection, so a crate that
   outlives a tier change shows a stale color (pre-existing edge,
   same as the old plain box) */
function makeMiniBlaster(color) {
  var g = new THREE.Group();
  var lit = new THREE.MeshPhongMaterial({ color: color, emissive: color,
    emissiveIntensity: 0.55, flatShading: true, shininess: 4 });
  var dark = new THREE.MeshPhongMaterial({ color: 0x2a2f3c,
    flatShading: true, shininess: 4 });
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.85, 8), lit);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.28;
  g.add(barrel);
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.22), dark);
  body.position.x = -0.18;
  g.add(body);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.18), dark);
  grip.position.set(-0.28, -0.26, 0);
  g.add(grip);
  var sight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.08), lit);
  sight.position.set(-0.05, 0.22, 0);
  g.add(sight);
  return g;
}

/* round shield: disc face, raised rim, center boss; the group is
   billboarded in updatePickups so the silhouette never collapses to
   an edge */
function makeShieldIcon() {
  var g = new THREE.Group();
  var blue = new THREE.MeshPhongMaterial({ color: 0x2f6fdd, emissive: 0x1a3f8f,
    emissiveIntensity: 0.5, flatShading: true, shininess: 6 });
  var bright = new THREE.MeshBasicMaterial({ color: 0x9fd4ff });
  var face = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 20), blue);
  face.rotation.x = Math.PI / 2;
  g.add(face);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 20), bright);
  rim.position.z = 0.05;
  g.add(rim);
  var boss = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bright);
  boss.position.z = 0.12;
  g.add(boss);
  return g;
}

/* up to 8 tries for a spot at least MIN_SPACING from every live
   pickup; falls back to the best (farthest) candidate found */
function pickSpawnPos(out) {
  var bestX = 0, bestY = 6, bestD = -1;
  for (var t = 0; t < 8; t++) {
    var x = (Math.random() - 0.5) * 24;
    var y = 4 + Math.random() * 5;
    var d = Infinity;
    for (var i = 0; i < pickups.length; i++) {
      var gp = pickups[i].group.position;
      var dx = gp.x - x, dy = gp.y - y, dz = gp.z + 95;
      var dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dd < d) d = dd;
    }
    if (d >= MIN_SPACING) { out.set(x, y, -95); return; }
    if (d > bestD) { bestD = d; bestX = x; bestY = y; }
  }
  out.set(bestX, bestY, -95);
}

function doSpawn(kind) {
  var g;
  if (kind === "weapon") {
    var next = nextTierIndex();
    var color = next >= 0 ? TIERS[next].color : 0xffd34d;
    g = makePickupGroup(color);
    g.add(makeMiniBlaster(color));
  } else if (kind === "heart") {
    g = makePickupGroup(0xff3050);
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
  } else {
    g = makePickupGroup(0x4d9fff);
    g.add(makeShieldIcon());
  }
  pickSpawnPos(g.position);
  g.scale.setScalar(PICKUP_SCALE);
  ctx.scene.add(g);
  pickups.push({ group: g, kind: kind, t: 0, baseScale: PICKUP_SCALE, remove: false });
}

export function updatePickups(dt) {
  for (var s = pendingSpawns.length - 1; s >= 0; s--) {
    if (ctx.elapsed >= pendingSpawns[s].at) {
      doSpawn(pendingSpawns.splice(s, 1)[0].kind);
    }
  }
  for (var i = 0; i < pickups.length; i++) {
    var p = pickups[i];
    p.t += dt;
    if (p.kind === "shield") {
      // billboard: the disc always faces the player
      p.group.lookAt(ctx.PLAYER_POS);
    } else {
      p.group.rotation.y += dt * 2.2;
      if (p.kind === "weapon") p.group.rotation.x += dt * 1.1;
    }
    if (p.kind !== "weapon") {
      var ps = 1 + Math.sin(p.t * 5) * 0.12;
      p.group.scale.setScalar(p.baseScale * ps);
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
  if (p.kind === "shield") {
    if (!ctx.shieldArmed) {
      armShield();
      sfx.shieldUp();
      // mid-bubble the button is untappable until this one pops, so
      // do not tell the kid to tap it yet
      if (ctx.shieldT > 0) showBanner("NEXT BUBBLE STORED!", "FOR WHEN THIS ONE POPS!", false);
      else showBanner("SHIELD ARMED!", "TAP THE BUBBLE BUTTON!", false);
    } else {
      // extras pay like a capped crate so a pickup is never worthless
      ctx.score += 150; updateScore();
      sfx.chime();
      showBanner("SHIELD FULL!", "+150", false);
    }
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
  pendingSpawns = [];
  lastSpawnAt = -10;
}
