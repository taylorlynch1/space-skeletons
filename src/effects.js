/* ---------------- SHARED EFFECTS (explosions, sparks, bone shards, shake) ---------------- */
import * as THREE from "three";
import { M } from "./skeletons.js";

var ctx;

export var shards = [], explosions = [], sparks = [], goldSparks = [];

export function getFree(pool) {
  for (var i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i];
  return null;
}

export function initEffects(c) {
  ctx = c;
  var i;
  var shardGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  for (i = 0; i < 80; i++) {
    var sm = new THREE.Mesh(shardGeo, M.bone);
    sm.visible = false; ctx.scene.add(sm);
    shards.push({ mesh: sm, active: false, vel: new THREE.Vector3(),
                  rot: new THREE.Vector3(), t: 0 });
  }
  var explGeo = new THREE.SphereGeometry(1, 10, 10);
  for (i = 0; i < 8; i++) {
    var emat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true,
        opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var em = new THREE.Mesh(explGeo, emat);
    em.visible = false; ctx.scene.add(em);
    explosions.push({ mesh: em, active: false, t: 0, power: 1 });
  }
  for (i = 0; i < 12; i++) {
    var spm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    spm.visible = false; ctx.scene.add(spm);
    sparks.push({ mesh: spm, active: false, t: 0 });
  }
  // golden skeleton sparkle trail (M1 item 4)
  var goldGeo = new THREE.SphereGeometry(0.16, 6, 6);
  for (i = 0; i < 14; i++) {
    var gm = new THREE.Mesh(goldGeo,
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    gm.visible = false; ctx.scene.add(gm);
    goldSparks.push({ mesh: gm, active: false, t: 0, vel: new THREE.Vector3() });
  }
}

export function spawnGoldSpark(pos) {
  var s = getFree(goldSparks); if (!s) return;
  s.active = true; s.t = 0;
  s.mesh.visible = true;
  s.mesh.position.set(pos.x + (Math.random() - 0.5) * 1.6,
                      pos.y + (Math.random() - 0.5) * 2.2,
                      pos.z + (Math.random() - 0.5) * 1.6);
  s.vel.set((Math.random() - 0.5) * 2, -1 - Math.random() * 2, 0);
  s.mesh.material.opacity = 0.9;
  s.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
}

export function spawnExplosion(pos, power) {
  var e = getFree(explosions); if (!e) return;
  e.active = true; e.t = 0; e.power = power;
  e.mesh.visible = true; e.mesh.position.copy(pos);
  e.mesh.scale.set(0.4, 0.4, 0.4);
  e.mesh.material.opacity = 0.95;
}

export function spawnSpark(pos) {
  var s = getFree(sparks); if (!s) return;
  s.active = true; s.t = 0;
  s.mesh.visible = true; s.mesh.position.copy(pos);
  s.mesh.material.opacity = 0.9;
  s.mesh.scale.set(1, 1, 1);
}

export function spawnBones(pos, n, force) {
  for (var i = 0; i < n; i++) {
    var s = getFree(shards); if (!s) return;
    s.active = true; s.t = 0;
    s.mesh.visible = true; s.mesh.position.copy(pos);
    s.vel.set((Math.random() - 0.5) * force,
              Math.random() * force * 0.7 + 3,
              (Math.random() - 0.5) * force);
    s.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  }
}

export function shake(amp, dur) {
  ctx.shakeAmp = Math.max(ctx.shakeAmp, amp);
  ctx.shakeT = Math.max(ctx.shakeT, dur);
}

export function updateEffects(dt) {
  var i;
  for (i = 0; i < shards.length; i++) {
    var s = shards[i];
    if (!s.active) continue;
    s.t += dt;
    s.vel.y -= 18 * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.rot.x * dt;
    s.mesh.rotation.y += s.rot.y * dt;
    if (s.mesh.position.y < -1 || s.t > 1.8) { s.active = false; s.mesh.visible = false; }
  }
  for (i = 0; i < explosions.length; i++) {
    var ex = explosions[i];
    if (!ex.active) continue;
    ex.t += dt;
    var k = ex.t / 0.45;
    ex.mesh.scale.setScalar(0.4 + k * 3.2 * ex.power);
    ex.mesh.material.opacity = Math.max(0, 0.95 * (1 - k));
    if (k >= 1) { ex.active = false; ex.mesh.visible = false; }
  }
  for (i = 0; i < sparks.length; i++) {
    var sp = sparks[i];
    if (!sp.active) continue;
    sp.t += dt;
    sp.mesh.scale.setScalar(1 + sp.t * 8);
    sp.mesh.material.opacity = Math.max(0, 0.9 - sp.t * 7);
    if (sp.t > 0.14) { sp.active = false; sp.mesh.visible = false; }
  }
  for (i = 0; i < goldSparks.length; i++) {
    var gs = goldSparks[i];
    if (!gs.active) continue;
    gs.t += dt;
    gs.mesh.position.addScaledVector(gs.vel, dt);
    gs.mesh.material.opacity = Math.max(0, 0.9 - gs.t * 1.6);
    if (gs.t > 0.6) { gs.active = false; gs.mesh.visible = false; }
  }
}
