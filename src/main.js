import * as THREE from "three";

/* =====================================================================
   SPACE SKELETONS v3
   You are the flying robot. The skeleton pirates are many.
   v3: arcade weapon-tier ladder gated by wave, heart pickups,
       Brute + Sniper enemies after boss 1, lava river canyon,
       big visible jetpacks, smaller cockpit cannon, funny death
       sounds, scarier bosses with heartbeat audio.
   ===================================================================== */
(function () {
"use strict";

/* ---------------- CORE STATE ---------------- */
var renderer, scene, camera, clock;
var state = "MENU";            // MENU, PLAYING, PAUSED, OVER
var elapsed = 0;
var score = 0, best = 0, hearts = 3, wave = 0;
var MAX_HEARTS = 5;   // start with 3, earn up to 5
var kills = 0, killsSincePickup = 0, pickupFlip = false;
var invulnT = 0, dmgFade = 0, flashFade = 0;
var shakeT = 0, shakeAmp = 0;
var pendingNextWaveAt = null;
var hintShown = false;

var PLAYER_POS = new THREE.Vector3(0, 5.5, 6);
var MAX_YAW = 0.85, MAX_PITCH = 0.55;
var TOUCH_SENS = 3.4;
var aimX = 0, aimY = 0, curYaw = 0, curPitch = 0;

var enemies = [], spawnQueue = [];
var boss = null;
var bossQueueDelay = [];

/* ---------------- WEAPON TIER LADDER (arcade progression) ----------------
   Crates always upgrade you one tier. Tiers unlock by wave, so firepower
   scales as harder skeletons arrive. At max tier, crates pay score. */
var TIERS = [
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
var weaponTier = 0;
var weapon = TIERS[0];
var fireT = 0;

function maxTierForWave(w) {
  if (w >= 11) return 4;   // Plasma Storm era
  if (w >= 6)  return 3;   // Plasma Cannon arrives with the Brutes
  if (w >= 3)  return 2;   // Triple Blaster
  return 1;                // Twin Laser
}

var BOSS_NAMES = ["CAPTAIN BLAZEBONES", "ADMIRAL SKULLSWORD",
                  "DREAD KING MARROW", "THE BONE EMPEROR"];

/* ---------------- DOM ---------------- */
var $ = function (id) { return document.getElementById(id); };
var elHearts = $("hearts"), elScore = $("score-val"), elBest = $("best-val");
var elWave = $("wave-box"), elWeaponName = $("weapon-name"),
    elWeaponDot = $("weapon-dot"), elWeaponLv = $("weapon-lv");
var elBossWrap = $("boss-bar-wrap"), elBossName = $("boss-name"), elBossFill = $("boss-bar-fill");
var elBanner = $("banner"), elBannerMain = elBanner.querySelector(".main"),
    elBannerSub = elBanner.querySelector(".sub");
var elDmg = $("dmg-vignette"), elFlash = $("red-flash");
var elCross = $("crosshair"), elHint = $("hint");
var scrMenu = $("screen-menu"), scrOver = $("screen-over"), scrPause = $("screen-pause");

/* ---------------- AUDIO (all generated in code) ---------------- */
var audioCtx = null, masterGain = null, noiseBuf = null;

function initAudio() {
  if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioCtx.destination);
  var len = audioCtx.sampleRate * 0.5;
  noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  var d = noiseBuf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

function tone(f0, f1, dur, type, vol, delay) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime + (delay || 0);
  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(masterGain);
  o.start(t); o.stop(t + dur + 0.02);
}

function noiseHit(dur, vol, freq, delay) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime + (delay || 0);
  var src = audioCtx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  var f = audioCtx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = freq;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(masterGain);
  src.start(t); src.stop(t + dur + 0.02);
}

var sfx = {
  laser:  function () { tone(880, 320, 0.10, "square", 0.4); },
  twin:   function () { tone(940, 360, 0.10, "square", 0.4); },
  triple: function () { tone(760, 280, 0.12, "square", 0.4); },
  plasma: function () { tone(260, 60, 0.3, "sawtooth", 0.55);
                        tone(520, 120, 0.2, "square", 0.28, 0.02); },
  enemyShot: function () { tone(380, 130, 0.18, "sawtooth", 0.32); },
  sniperShot: function () { tone(980, 240, 0.16, "sawtooth", 0.32); },
  boom: function (p) {
    noiseHit(0.32 * p, 0.55, 700, 0);
    tone(140, 40, 0.28 * p, "sine", 0.5);
  },
  bigBoom: function () {
    noiseHit(0.8, 0.9, 500, 0); tone(110, 30, 0.7, "sine", 0.8);
    noiseHit(0.6, 0.6, 900, 0.15);
  },
  /* v3: funny skeleton destruction sounds, randomized */
  bonk: function () {
    var pick = Math.floor(Math.random() * 3);
    if (pick === 0) {            // bone xylophone clatter
      tone(880, 860, 0.07, "sine", 0.5);
      tone(640, 620, 0.07, "sine", 0.5, 0.08);
      tone(420, 400, 0.10, "sine", 0.5, 0.16);
      noiseHit(0.12, 0.28, 2400, 0);
    } else if (pick === 1) {     // cartoon boing
      tone(170, 760, 0.12, "triangle", 0.5);
      tone(760, 150, 0.24, "triangle", 0.45, 0.12);
    } else {                     // slide whistle down + clatter
      tone(1250, 230, 0.32, "sine", 0.45);
      noiseHit(0.1, 0.25, 2000, 0.28);
    }
  },
  hurt:   function () { tone(300, 80, 0.32, "square", 0.5); },
  chime:  function () { tone(660, 660, 0.1, "sine", 0.4);
                        tone(990, 990, 0.14, "sine", 0.4, 0.09); },
  heart:  function () { tone(520, 520, 0.1, "sine", 0.42);
                        tone(780, 780, 0.1, "sine", 0.42, 0.1);
                        tone(1040, 1040, 0.16, "sine", 0.42, 0.2); },
  roar:   function () { tone(62, 30, 1.1, "sawtooth", 0.75);
                        noiseHit(1.0, 0.5, 260, 0); },
  heartbeat: function () { tone(58, 50, 0.1, "sine", 0.3);
                           tone(52, 46, 0.12, "sine", 0.26, 0.16); },
  waveUp: function () { tone(520, 820, 0.14, "sine", 0.35); },
  bossDie:function () { sfx.bigBoom(); tone(520, 60, 1.2, "sawtooth", 0.5, 0.2); }
};

/* ---------------- RENDERER / SCENE ---------------- */
function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  $("game-root").appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x46100a);
  scene.fog = new THREE.Fog(0x46100a, 55, 230);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.copy(PLAYER_POS);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0x55291c, 0.95));
  scene.add(new THREE.HemisphereLight(0x551a05, 0xff5a00, 0.8));
  var dir = new THREE.DirectionalLight(0xffb37a, 0.9);
  dir.position.set(-25, 60, 30);
  scene.add(dir);
  var lavaGlow = new THREE.PointLight(0xff4400, 1.2, 180);
  lavaGlow.position.set(0, 3, -40);
  scene.add(lavaGlow);

  clock = new THREE.Clock();
}

/* ---------------- LAVA RIVER CANYON ---------------- */
var lavaTexRock, lavaTexGlow, darkRockTex;
var canyonRocks = [], riverIslands = [];
var emberGeoA, emberVelA = [], emberGeoB, emberVelB = [];

function makeLavaTextures() {
  var c = document.createElement("canvas");
  c.width = 1024; c.height = 1024;
  var x = c.getContext("2d");
  x.fillStyle = "#1a0503"; x.fillRect(0, 0, 1024, 1024);
  var i, gx, gy, r, g;
  for (i = 0; i < 70; i++) {
    gx = Math.random() * 1024; gy = Math.random() * 1024;
    r = 30 + Math.random() * 80;
    g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, "rgba(38,12,8,0.85)");
    g.addColorStop(1, "rgba(20,5,3,0)");
    x.fillStyle = g;
    x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.fill();
  }
  for (i = 0; i < 70; i++) {
    gx = Math.random() * 1024; gy = Math.random() * 1024;
    r = 18 + Math.random() * 60;
    g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, "rgba(255,185,65,0.95)");
    g.addColorStop(0.4, "rgba(255,95,12,0.75)");
    g.addColorStop(1, "rgba(70,10,0,0)");
    x.fillStyle = g;
    x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.fill();
  }
  x.lineWidth = 3;
  x.shadowColor = "rgba(255,130,20,1)";
  x.shadowBlur = 14;
  for (i = 0; i < 55; i++) {
    x.strokeStyle = "rgba(255,150,40,0.85)";
    x.beginPath();
    var px = Math.random() * 1024, py = Math.random() * 1024;
    x.moveTo(px, py);
    for (var s = 0; s < 6; s++) {
      px += (Math.random() - 0.5) * 180;
      py += (Math.random() - 0.5) * 180;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.shadowBlur = 0;
  var rock = new THREE.CanvasTexture(c);
  rock.wrapS = THREE.RepeatWrapping; rock.wrapT = THREE.RepeatWrapping;
  rock.repeat.set(1.5, 11);
  rock.encoding = THREE.sRGBEncoding;

  var c2 = document.createElement("canvas");
  c2.width = 512; c2.height = 512;
  var y = c2.getContext("2d");
  y.fillStyle = "#000000"; y.fillRect(0, 0, 512, 512);
  y.lineWidth = 2.5;
  y.shadowColor = "rgba(255,160,50,1)";
  y.shadowBlur = 10;
  for (i = 0; i < 34; i++) {
    y.strokeStyle = "rgba(255,190,80,0.9)";
    y.beginPath();
    var qx = Math.random() * 512, qy = Math.random() * 512;
    y.moveTo(qx, qy);
    for (var t = 0; t < 5; t++) {
      qx += (Math.random() - 0.5) * 130;
      qy += (Math.random() - 0.5) * 130;
      y.lineTo(qx, qy);
    }
    y.stroke();
  }
  var glow = new THREE.CanvasTexture(c2);
  glow.wrapS = THREE.RepeatWrapping; glow.wrapT = THREE.RepeatWrapping;
  glow.repeat.set(2, 14);
  glow.encoding = THREE.sRGBEncoding;
  return { rock: rock, glow: glow };
}

function makeDarkRockTexture() {
  var c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  var x = c.getContext("2d");
  x.fillStyle = "#170708"; x.fillRect(0, 0, 512, 512);
  var i, gx, gy, r, g;
  for (i = 0; i < 120; i++) {
    gx = Math.random() * 512; gy = Math.random() * 512;
    r = 8 + Math.random() * 40;
    g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    var shade = Math.random() < 0.5 ? "rgba(40,18,18,0.6)" : "rgba(10,3,4,0.7)";
    g.addColorStop(0, shade);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.fill();
  }
  x.strokeStyle = "rgba(120,45,15,0.35)";
  x.lineWidth = 1.5;
  for (i = 0; i < 18; i++) {
    x.beginPath();
    var px = Math.random() * 512, py = Math.random() * 512;
    x.moveTo(px, py);
    for (var s = 0; s < 4; s++) {
      px += (Math.random() - 0.5) * 140;
      py += (Math.random() - 0.5) * 140;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 12);
  t.encoding = THREE.sRGBEncoding;
  return t;
}

function makeSkyTexture() {
  var c = document.createElement("canvas");
  c.width = 64; c.height = 512;
  var x = c.getContext("2d");
  var g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0,  "#050103");
  g.addColorStop(0.45, "#1c0403");
  g.addColorStop(0.72, "#46100a");
  g.addColorStop(0.88, "#7a2a12");
  g.addColorStop(1.0,  "#93421c");
  x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  var t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  return t;
}

function buildWorld() {
  // sky dome
  var sky = new THREE.Mesh(
    new THREE.SphereGeometry(470, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  // molten sun
  var sun = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffa040, fog: false }));
  sun.position.set(-95, 34, -300);
  scene.add(sun);
  var halo = new THREE.Mesh(new THREE.SphereGeometry(19, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: false, transparent: true,
      opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.copy(sun.position);
  scene.add(halo);

  // dark valley floor under everything (scrolling for motion)
  darkRockTex = makeDarkRockTexture();
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 900),
    new THREE.MeshBasicMaterial({ map: darkRockTex })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.3, -250);
  scene.add(floor);

  // the lava river you fly along
  var tex = makeLavaTextures();
  lavaTexRock = tex.rock; lavaTexGlow = tex.glow;
  var river = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 900),
    new THREE.MeshBasicMaterial({ map: lavaTexRock })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0, -250);
  scene.add(river);
  var shimmer = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 900),
    new THREE.MeshBasicMaterial({ map: lavaTexGlow, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false })
  );
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(0, 0.07, -250);
  scene.add(shimmer);

  // rocky banks edging the river
  var bankMat = new THREE.MeshLambertMaterial({ color: 0x1d0c0e, flatShading: true });
  var bankL = new THREE.Mesh(new THREE.BoxGeometry(12, 1.7, 900), bankMat);
  bankL.position.set(-38, 0.55, -250);
  scene.add(bankL);
  var bankR = new THREE.Mesh(new THREE.BoxGeometry(12, 1.7, 900), bankMat);
  bankR.position.set(38, 0.55, -250);
  scene.add(bankR);

  // canyon walls: solid mountain rows on both sides, flowing past you
  var mtGeo = new THREE.ConeGeometry(1, 1.7, 6);
  var rockMats = [
    new THREE.MeshLambertMaterial({ color: 0x21100f, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x180a0b, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x2a1410, flatShading: true })
  ];
  var i, m, s, side;
  for (i = 0; i < 26; i++) {
    side = (i % 2 === 0) ? -1 : 1;
    m = new THREE.Mesh(mtGeo, rockMats[i % 3]);
    s = 10 + Math.random() * 13;
    m.scale.set(s, s * (1 + Math.random() * 0.6), s);
    m.position.set(side * (52 + Math.random() * 32),
                   m.scale.y * 0.42,
                   -15 - Math.random() * 230);
    m.rotation.y = Math.random() * Math.PI;
    m.userData.side = side;
    scene.add(m); canyonRocks.push(m);
  }
  // small dark islands at the river's edges (never in your lane)
  var islGeo = new THREE.DodecahedronGeometry(1, 0);
  for (i = 0; i < 8; i++) {
    side = (i % 2 === 0) ? -1 : 1;
    m = new THREE.Mesh(islGeo, rockMats[i % 3]);
    s = 1.2 + Math.random() * 1.6;
    m.scale.set(s, s * 0.8, s);
    m.position.set(side * (10 + Math.random() * 14), s * 0.3,
                   -15 - Math.random() * 220);
    m.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    m.userData.side = side;
    scene.add(m); riverIslands.push(m);
  }
  // giant volcano silhouettes at the canyon's end, two with glowing tips
  for (i = 0; i < 5; i++) {
    m = new THREE.Mesh(mtGeo, rockMats[1]);
    s = 45 + Math.random() * 50;
    m.scale.set(s, s * 1.15, s);
    var vx = -190 + i * 95 + (Math.random() - 0.5) * 24;
    if (Math.abs(vx) < 55) vx = vx < 0 ? -55 : 55;
    m.position.set(vx, m.scale.y * 0.4, -265 - Math.random() * 45);
    scene.add(m);
    if (i === 1 || i === 3) {
      var tipGlow = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5,
          blending: THREE.AdditiveBlending, depthWrite: false }));
      tipGlow.position.set(m.position.x, m.scale.y * 0.86, m.position.z);
      scene.add(tipGlow);
    }
  }

  buildEmbers();
  buildCockpitCannon();
}

function buildEmbers() {
  var A = 160, i;
  emberGeoA = new THREE.BufferGeometry();
  var posA = new Float32Array(A * 3);
  for (i = 0; i < A; i++) {
    posA[i * 3]     = (Math.random() - 0.5) * 70;
    posA[i * 3 + 1] = Math.random() * 42;
    posA[i * 3 + 2] = -Math.random() * 170 + 5;
    emberVelA.push(2 + Math.random() * 4);
  }
  emberGeoA.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  scene.add(new THREE.Points(emberGeoA, new THREE.PointsMaterial({
    color: 0xff8a2a, size: 0.7, sizeAttenuation: true,
    transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));
  var B = 50;
  emberGeoB = new THREE.BufferGeometry();
  var posB = new Float32Array(B * 3);
  for (i = 0; i < B; i++) {
    posB[i * 3]     = (Math.random() - 0.5) * 70;
    posB[i * 3 + 1] = Math.random() * 42;
    posB[i * 3 + 2] = -Math.random() * 170 + 5;
    emberVelB.push(0.8 + Math.random() * 1.5);
  }
  emberGeoB.setAttribute("position", new THREE.BufferAttribute(posB, 3));
  scene.add(new THREE.Points(emberGeoB, new THREE.PointsMaterial({
    color: 0xffb060, size: 1.5, sizeAttenuation: true,
    transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));
}

/* ---------------- COCKPIT CANNON (smaller in v3) ---------------- */
var cannon, cannonTipMesh, cannonTipMat, cannonRingMat, muzzleFlash, recoil = 0;

function buildCockpitCannon() {
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
  camera.add(cannon);
}

/* ---------------- SHARED SKELETON PARTS ---------------- */
var G = {}, M = {};

function buildSharedParts() {
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
  G.capeStrip = new THREE.BoxGeometry(0.8, 2.4, 0.06);
  G.pauldron = new THREE.SphereGeometry(0.5, 10, 8);
  G.belt    = new THREE.BoxGeometry(1.1, 0.18, 0.6);

  M.bone   = new THREE.MeshLambertMaterial({ color: 0xe9e3d2, flatShading: true });
  M.boneBoss = new THREE.MeshLambertMaterial({ color: 0xcfc3a6, flatShading: true });
  M.dark   = new THREE.MeshLambertMaterial({ color: 0x15131c, flatShading: true });
  M.iron   = new THREE.MeshLambertMaterial({ color: 0x3a3f4c, flatShading: true });
  M.hat    = new THREE.MeshLambertMaterial({ color: 0x221c2c, flatShading: true });
  M.gold   = new THREE.MeshLambertMaterial({ color: 0xcaa052, flatShading: true });
  M.red    = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
  M.purple = new THREE.MeshBasicMaterial({ color: 0xd24dff });
  M.redGlow= new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true,
              opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  M.metal  = new THREE.MeshLambertMaterial({ color: 0xb9c4d8, emissive: 0x1a2230,
              flatShading: true });
  M.gun    = new THREE.MeshLambertMaterial({ color: 0x2a2f3c, flatShading: true });
  M.coil   = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true,
              opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  M.coilP  = new THREE.MeshBasicMaterial({ color: 0xd24dff, transparent: true,
              opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  M.flame  = new THREE.MeshBasicMaterial({ color: 0xff8c2a, transparent: true,
              opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  M.flameIn= new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true,
              opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  M.cape   = new THREE.MeshLambertMaterial({ color: 0x230d14, flatShading: true });
  M.heart  = new THREE.MeshLambertMaterial({ color: 0xff3050, emissive: 0xff2040,
              emissiveIntensity: 0.55, flatShading: true });
}

/* Build one skeleton pirate.
   type: "slasher" | "gunner" | "brute" | "sniper" | "boss" */
function makeSkeleton(type, scale) {
  var g = new THREE.Group();
  var isBoss = (type === "boss");
  var bMat = isBoss ? M.boneBoss : M.bone;

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
  var pupilMat = (type === "sniper") ? M.purple : M.red;
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

  g.scale.set(scale, scale, scale);
  return { group: g, legL: legL, legR: legR, armL: armL, armR: armR,
           flames: flames, jaw: jaw, halos: halos, capes: capes,
           holdsSword: holdsSword };
}

/* ---------------- POOLS ---------------- */
var bullets = [], bolts = [], shards = [], explosions = [], sparks = [], pickups = [], pops = [];
var tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), camDir = new THREE.Vector3();
var assistPoint = new THREE.Vector3();
var boltMatRed, boltMatPurple;

function buildPools() {
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
    bm.visible = false; scene.add(bm);
    bullets.push({ mesh: bm, mats: tierMats, active: false,
                   vel: new THREE.Vector3(), dmg: 1, splash: 0, r: 0.5 });
  }
  boltMatRed = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true,
      opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  boltMatPurple = new THREE.MeshBasicMaterial({ color: 0xd24dff, transparent: true,
      opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  for (i = 0; i < 40; i++) {
    var btm = new THREE.Mesh(bulletGeo, boltMatRed);
    btm.visible = false; scene.add(btm);
    bolts.push({ mesh: btm, active: false, vel: new THREE.Vector3(), r: 0.95 });
  }
  var shardGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  for (i = 0; i < 80; i++) {
    var sm = new THREE.Mesh(shardGeo, M.bone);
    sm.visible = false; scene.add(sm);
    shards.push({ mesh: sm, active: false, vel: new THREE.Vector3(),
                  rot: new THREE.Vector3(), t: 0 });
  }
  var explGeo = new THREE.SphereGeometry(1, 10, 10);
  for (i = 0; i < 8; i++) {
    var emat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true,
        opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var em = new THREE.Mesh(explGeo, emat);
    em.visible = false; scene.add(em);
    explosions.push({ mesh: em, active: false, t: 0, power: 1 });
  }
  for (i = 0; i < 12; i++) {
    var spm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    spm.visible = false; scene.add(spm);
    sparks.push({ mesh: spm, active: false, t: 0 });
  }
  for (i = 0; i < 8; i++) {
    var pd = document.createElement("div");
    pd.className = "pop"; document.body.appendChild(pd);
    pops.push({ el: pd, busy: false });
  }
}

function getFree(pool) {
  for (var i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i];
  return null;
}

/* ---------------- EFFECTS ---------------- */
function spawnExplosion(pos, power) {
  var e = getFree(explosions); if (!e) return;
  e.active = true; e.t = 0; e.power = power;
  e.mesh.visible = true; e.mesh.position.copy(pos);
  e.mesh.scale.set(0.4, 0.4, 0.4);
  e.mesh.material.opacity = 0.95;
}

function spawnSpark(pos) {
  var s = getFree(sparks); if (!s) return;
  s.active = true; s.t = 0;
  s.mesh.visible = true; s.mesh.position.copy(pos);
  s.mesh.material.opacity = 0.9;
  s.mesh.scale.set(1, 1, 1);
}

function spawnBones(pos, n, force) {
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

function scorePop(worldPos, text, big) {
  var p = null;
  for (var i = 0; i < pops.length; i++) if (!pops[i].busy) { p = pops[i]; break; }
  if (!p) return;
  tmpV.copy(worldPos).project(camera);
  if (tmpV.z > 1) return;
  var x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
  var y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
  p.busy = true;
  p.el.textContent = text;
  p.el.style.left = x + "px";
  p.el.style.top = y + "px";
  p.el.style.fontSize = big ? "30px" : "18px";
  p.el.classList.add("live");
  setTimeout(function () { p.el.classList.remove("live"); p.busy = false; }, 850);
}

function shake(amp, dur) { shakeAmp = Math.max(shakeAmp, amp); shakeT = Math.max(shakeT, dur); }

/* ---------------- ENEMIES ---------------- */
function spawnSlasher() {
  var sk = makeSkeleton("slasher", 1);
  var e = {
    kind: "slasher", parts: sk, group: sk.group,
    hp: 1 + Math.floor(wave / 6),
    speed: Math.min(9 + wave * 0.7, 22),
    t: Math.random() * 10, phase: Math.random() * 6,
    slashing: false, slashT: 0, scale: 1, pts: 10, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, 4 + Math.random() * 6, -130);
  scene.add(e.group); enemies.push(e);
}

function spawnBrute() {
  var sk = makeSkeleton("brute", 1.45);
  var e = {
    kind: "brute", parts: sk, group: sk.group,
    hp: 5 + Math.floor(wave / 4),
    speed: Math.min(7 + wave * 0.35, 13),
    t: Math.random() * 10, phase: Math.random() * 6,
    slashing: false, slashT: 0, scale: 1.45, pts: 30, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, 4 + Math.random() * 6, -135);
  scene.add(e.group); enemies.push(e);
}

function spawnGunner() {
  var sk = makeSkeleton("gunner", 1);
  var e = {
    kind: "gunner", parts: sk, group: sk.group,
    hp: 3 + Math.floor(wave / 5),
    baseY: 4 + Math.random() * 5,
    targetZ: -55 + Math.random() * 16,
    homeX: (Math.random() - 0.5) * 44,
    sway: 6,
    t: Math.random() * 10, phase: Math.random() * 6,
    fireT: 1.5 + Math.random() * 2,
    fireRate: Math.max(1.5, 3.3 - wave * 0.12),
    boltSpeed: 24 + wave * 0.6, boltMat: null, boltScale: 1,
    scale: 1, pts: 15, remove: false
  };
  e.group.position.set((Math.random() - 0.5) * 70, e.baseY, -140);
  scene.add(e.group); enemies.push(e);
}

function spawnSniper() {
  var sk = makeSkeleton("sniper", 1.1);
  var e = {
    kind: "sniper", parts: sk, group: sk.group,
    hp: 4 + Math.floor(wave / 6),
    baseY: 4.5 + Math.random() * 4,
    targetZ: -72 + Math.random() * 12,
    homeX: (Math.random() - 0.5) * 40,
    sway: 4,
    t: Math.random() * 10, phase: Math.random() * 6,
    fireT: 2 + Math.random() * 2,
    fireRate: Math.max(2.2, 4.0 - wave * 0.08),
    boltSpeed: 40, boltMat: null, boltScale: 0.85,
    scale: 1.1, pts: 25, remove: false
  };
  e.boltMat = boltMatPurple;
  e.group.position.set((Math.random() - 0.5) * 70, e.baseY, -150);
  scene.add(e.group); enemies.push(e);
}

function spawnBoss() {
  var tier = Math.floor(wave / 5);
  var sk = makeSkeleton("boss", 3.8);
  boss = {
    parts: sk, group: sk.group, tier: tier,
    hp: 80 + (tier - 1) * 50, hpMax: 80 + (tier - 1) * 50,
    baseY: 8.4, t: 0, entering: true,
    attackT: 2.5, attackRate: Math.max(1.4, 2.5 - tier * 0.15),
    pattern: 0, summoned: false, roarT: 4, jawT: 0, beatT: 1.0,
    shotQueue: []
  };
  boss.group.position.set(0, boss.baseY, -150);
  scene.add(boss.group);
  var name = BOSS_NAMES[(tier - 1) % BOSS_NAMES.length] +
             (tier > BOSS_NAMES.length ? " \u2605" : "");
  elBossName.textContent = name;
  elBossFill.style.width = "100%";
  elBossWrap.style.display = "block";
  showBanner(name, "WARNING! BIG BOSS!", true);
  flashFade = 0.6;
  shake(0.9, 1.0);
  boss.jawT = 0.6;
  sfx.roar();
}

function fireBolt(fromPos, speed, scaleMul, mat) {
  var b = getFree(bolts); if (!b) return;
  b.active = true;
  b.mesh.visible = true;
  b.mesh.material = mat || boltMatRed;
  b.mesh.position.copy(fromPos);
  tmpV.copy(PLAYER_POS).sub(fromPos).normalize();
  b.vel.copy(tmpV).multiplyScalar(speed);
  tmpV2.copy(fromPos).add(tmpV);
  b.mesh.lookAt(tmpV2);
  var s = 0.5 * (scaleMul || 1);
  b.mesh.scale.set(s, s, s * 2.6);
}

function fireBoltDir(fromPos, dir, speed, scaleMul, mat) {
  var b = getFree(bolts); if (!b) return;
  b.active = true;
  b.mesh.visible = true;
  b.mesh.material = mat || boltMatRed;
  b.mesh.position.copy(fromPos);
  b.vel.copy(dir).multiplyScalar(speed);
  tmpV2.copy(fromPos).add(dir);
  b.mesh.lookAt(tmpV2);
  var s = 0.5 * (scaleMul || 1);
  b.mesh.scale.set(s, s, s * 2.6);
}

function enemyCenter(e, out) {
  out.copy(e.group.position); out.y += 1.7 * e.scale; return out;
}

function killEnemy(e, scored) {
  enemyCenter(e, tmpV);
  spawnExplosion(tmpV, e.kind === "brute" ? 1.5 : 1.1);
  spawnBones(tmpV, e.kind === "brute" ? 11 : 7, 9);
  sfx.boom(0.6);
  sfx.bonk();
  if (scored) {
    score += e.pts; updateScore();
    scorePop(tmpV, "+" + e.pts, false);
    kills++; killsSincePickup++;
    if (killsSincePickup >= 9) { killsSincePickup = 0; spawnAutoPickup(); }
  }
  e.remove = true;
  scene.remove(e.group);
}

function updateEnemies(dt) {
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
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

    if (melee) {
      if (!e.slashing) {
        tmpV2.copy(PLAYER_POS).sub(g.position).normalize();
        g.position.addScaledVector(tmpV2, e.speed * dt);
        g.position.x += Math.sin(e.t * 2 + e.phase) * dt * 4;
        g.position.y += Math.sin(e.t * 2.2 + e.phase) * dt * 1.2;
        g.lookAt(PLAYER_POS.x, g.position.y, PLAYER_POS.z);
        e.parts.armR.rotation.x = -2.2 + Math.sin(e.t * 3) * 0.12;
        if (g.position.distanceTo(PLAYER_POS) < 5.5 + e.scale) {
          e.slashing = true; e.slashT = 0;
        }
      } else {
        e.slashT += dt;
        e.parts.armR.rotation.x = -2.2 + Math.min(e.slashT / 0.22, 1) * 3.2;
        if (e.slashT >= 0.22 && !e.didHit) {
          e.didHit = true;
          damagePlayer();
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
      g.lookAt(PLAYER_POS.x, g.position.y, PLAYER_POS.z);
      e.fireT -= dt;
      if (e.fireT <= 0 && g.position.z >= e.targetZ - 5) {
        e.fireT = e.fireRate;
        enemyCenter(e, tmpV2); tmpV2.y += 0.4;
        fireBolt(tmpV2, e.boltSpeed, e.boltScale, e.boltMat);
        if (e.kind === "sniper") sfx.sniperShot(); else sfx.enemyShot();
      }
    }
  }
  enemies = enemies.filter(function (e) { return !e.remove; });
}

/* ---------------- BOSS ---------------- */
function updateBoss(dt) {
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
    g.lookAt(PLAYER_POS.x, g.position.y, PLAYER_POS.z);
    return;
  }

  g.position.x = Math.sin(boss.t * 0.55) * 14;
  g.lookAt(PLAYER_POS.x, g.position.y, PLAYER_POS.z);
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
      enemyCenter({ group: g, scale: 3.8 }, tmpV2); tmpV2.y += 1.5;
      if (sq.fan === 0) {
        fireBolt(tmpV2, 26 + boss.tier * 2, 1.5, boltMatRed);
        sfx.enemyShot();
      } else {
        tmpV.copy(PLAYER_POS).sub(tmpV2).normalize();
        var rd = tmpV.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sq.fan);
        fireBoltDir(tmpV2, rd, 24 + boss.tier * 2, 1.5, boltMatRed);
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
    if (wave >= 10) { spawnBrute(); spawnSlasher(); }
    else { spawnSlasher(); spawnSlasher(); }
    showBanner("MORE PIRATES!", "", true);
  }
}

function hitBoss(dmg, atPos) {
  if (!boss || boss.entering) return;
  boss.hp -= dmg;
  spawnSpark(atPos);
  elBossFill.style.width = Math.max(0, (boss.hp / boss.hpMax) * 100) + "%";
  if (boss.hp <= 0) killBoss();
}

function killBoss() {
  var pos = boss.group.position.clone(); pos.y += 6;
  var pts = 300 * boss.tier;
  score += pts; updateScore();
  scorePop(pos, "+" + pts, true);
  for (var i = 0; i < 5; i++) {
    bossQueueDelay.push({ at: i * 0.18,
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9,
                                             (Math.random() - 0.5) * 8,
                                             (Math.random() - 0.5) * 4)),
      power: 2.4 });
  }
  spawnBones(pos, 18, 17);
  sfx.bossDie();
  sfx.bonk();
  shake(1.0, 1.0);
  scene.remove(boss.group);
  boss = null;
  elBossWrap.style.display = "none";
  showBanner("BOSS DEFEATED!", "GREAT FLYING, PILOT!", false);
  spawnWeaponCrate();
  if (hearts < MAX_HEARTS) spawnHeart();
}

/* ---------------- PICKUPS ---------------- */
function nextTierIndex() {
  var cap = maxTierForWave(wave);
  return weaponTier < cap ? weaponTier + 1 : -1;
}

function spawnAutoPickup() {
  // alternate heart and weapon crate when you're hurt; otherwise weapons
  if (hearts < MAX_HEARTS && pickupFlip) {
    pickupFlip = false;
    spawnHeart();
  } else {
    pickupFlip = true;
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

function spawnWeaponCrate() {
  var next = nextTierIndex();
  var color = next >= 0 ? TIERS[next].color : 0xffd34d;
  var g = makePickupGroup(color);
  var box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95),
    new THREE.MeshLambertMaterial({ color: color, emissive: color,
      emissiveIntensity: 0.55, flatShading: true }));
  g.add(box);
  g.position.set((Math.random() - 0.5) * 24, 4 + Math.random() * 5, -95);
  scene.add(g);
  pickups.push({ group: g, kind: "weapon", t: 0, remove: false });
}

function spawnHeart() {
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
  scene.add(g);
  pickups.push({ group: g, kind: "heart", t: 0, remove: false });
}

function updatePickups(dt) {
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
    p.group.position.x += (PLAYER_POS.x - p.group.position.x) * dt * 0.5;
    p.group.position.y += (PLAYER_POS.y - p.group.position.y) * dt * 0.5;
    if (p.group.position.distanceTo(PLAYER_POS) < 4) {
      collectPickup(p);
      p.remove = true; scene.remove(p.group);
    } else if (p.group.position.z > 12) {
      p.remove = true; scene.remove(p.group);
    }
  }
  pickups = pickups.filter(function (p) { return !p.remove; });
}

function collectPickup(p) {
  if (p.kind === "heart") {
    hearts = Math.min(MAX_HEARTS, hearts + 1);
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
    score += 150; updateScore();
    sfx.chime();
    showBanner("MAX POWER!", "+150", false);
  }
}

function setWeaponTier(i) {
  weaponTier = i;
  weapon = TIERS[i];
  elWeaponName.textContent = weapon.name;
  elWeaponDot.style.background = weapon.css;
  elWeaponDot.style.color = weapon.css;
  elWeaponLv.textContent = "LV " + (i + 1);
  cannonTipMat.color.setHex(weapon.color);
  cannonRingMat.color.setHex(weapon.color);
}

/* ---------------- SHOOTING ---------------- */
function acquireAimPoint() {
  camera.getWorldDirection(camDir);
  var bestDot = 0.993, found = false;
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].remove) continue;
    enemyCenter(enemies[i], tmpV);
    tmpV2.copy(tmpV).sub(camera.position).normalize();
    var d = tmpV2.dot(camDir);
    if (d > bestDot) { bestDot = d; assistPoint.copy(tmpV); found = true; }
  }
  if (boss && !boss.entering) {
    enemyCenter({ group: boss.group, scale: 3.8 }, tmpV);
    tmpV2.copy(tmpV).sub(camera.position).normalize();
    if (tmpV2.dot(camDir) > 0.985) { assistPoint.copy(tmpV); found = true; }
  }
  if (!found) {
    assistPoint.copy(camera.position).addScaledVector(camDir, 80);
  }
  return assistPoint;
}

function fireWeapon() {
  camera.updateMatrixWorld(true);
  var target = acquireAimPoint();
  var up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  var muzzle = new THREE.Vector3();
  cannonTipMesh.getWorldPosition(muzzle);
  var baseDir = target.clone().sub(muzzle).normalize();

  for (var c = 0; c < weapon.count; c++) {
    var b = getFree(bullets); if (!b) break;
    var ang = (c - (weapon.count - 1) / 2) * weapon.spread;
    var dir = baseDir.clone();
    if (ang !== 0) dir.applyAxisAngle(up, ang);
    b.active = true;
    b.dmg = weapon.dmg; b.splash = weapon.splash; b.r = weapon.size;
    b.mesh.material = b.mats[weaponTier];
    b.mesh.visible = true;
    b.mesh.position.copy(muzzle);
    b.vel.copy(dir).multiplyScalar(weapon.speed);
    tmpV2.copy(muzzle).add(dir);
    b.mesh.lookAt(tmpV2);
    b.mesh.scale.set(weapon.size, weapon.size, weapon.size * 3.0);
  }
  recoil = 0.14;
  muzzleFlash.material.opacity = 0.9;
  muzzleFlash.material.color.setHex(weapon.color);
  if (weaponTier === 4) sfx.plasma();
  else if (weaponTier === 3) sfx.plasma();
  else if (weaponTier === 2) sfx.triple();
  else if (weaponTier === 1) sfx.twin();
  else sfx.laser();
}

function applySplash(center, dmg, radius) {
  var i;
  for (i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (e.remove) continue;
    enemyCenter(e, tmpV2);
    if (tmpV2.distanceTo(center) < radius) {
      e.hp -= dmg;
      if (e.hp <= 0) killEnemy(e, true);
    }
  }
  if (boss && !boss.entering) {
    enemyCenter({ group: boss.group, scale: 3.8 }, tmpV2);
    if (tmpV2.distanceTo(center) < radius + 4) hitBoss(dmg, center);
  }
}

function updateBullets(dt) {
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
        score += 5; updateScore();
        scorePop(bo.mesh.position, "+5", false);
        hit = true; break;
      }
    }
    if (!hit) {
      for (var k = 0; k < enemies.length; k++) {
        var e = enemies[k];
        if (e.remove) continue;
        enemyCenter(e, tmpV2);
        if (tmpV2.distanceTo(bp) < 1.55 * e.scale + b.r) {
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
    if (!hit && boss && !boss.entering) {
      enemyCenter({ group: boss.group, scale: 3.8 }, tmpV2);
      if (tmpV2.distanceTo(bp) < 6.2 + b.r) {
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

function updateBolts(dt) {
  for (var i = 0; i < bolts.length; i++) {
    var b = bolts[i];
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    if (b.mesh.position.distanceTo(PLAYER_POS) < 2.6) {
      b.active = false; b.mesh.visible = false;
      damagePlayer();
      continue;
    }
    if (b.mesh.position.z > 14) { b.active = false; b.mesh.visible = false; }
  }
}

/* ---------------- PLAYER ---------------- */
function damagePlayer() {
  if (invulnT > 0 || state !== "PLAYING") return;
  hearts--;
  invulnT = 1.3;
  dmgFade = 1.0;
  shake(0.7, 0.5);
  sfx.hurt();
  updateHearts();
  if (hearts <= 0) gameOver();
}

function updateHearts() {
  var html = "";
  for (var i = 0; i < MAX_HEARTS; i++) {
    html += '<span class="' + (i < hearts ? "h-on" : "h-off") + '">&#9829;</span>';
  }
  elHearts.innerHTML = html;
}

function updateScore() {
  elScore.textContent = score;
  if (score > best) { best = score; elBest.textContent = best; }
}

/* ---------------- WAVES ---------------- */
function showBanner(main, sub, danger) {
  elBannerMain.textContent = main;
  elBannerSub.textContent = sub || "";
  elBanner.classList.toggle("danger", !!danger);
  elBanner.classList.add("show");
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(function () { elBanner.classList.remove("show"); }, 2200);
}

function beginWave(n) {
  wave = n;
  elWave.textContent = "WAVE " + wave;
  spawnQueue = [];
  if (wave % 5 === 0) {
    spawnQueue.push({ at: elapsed + 1.4, type: "boss" });
    showBanner("WAVE " + wave, "SOMETHING BIG IS COMING...", true);
    sfx.waveUp();
    return;
  }
  showBanner("WAVE " + wave,
    (wave === 6) ? "THE BRUTES HAVE ARRIVED!" :
    (wave === 8) ? "SNIPERS ON THE RIDGE!" : "", wave === 6 || wave === 8);
  sfx.waveUp();
  var slashers = Math.min(3 + Math.ceil(wave * 0.8), 11);
  var gunners  = wave < 2 ? 0 : Math.min(1 + Math.floor(wave / 2), 6);
  var brutes   = wave < 6 ? 0 : Math.min(1 + Math.floor((wave - 6) / 2), 5);
  var snipers  = wave < 8 ? 0 : Math.min(1 + Math.floor((wave - 8) / 2), 4);
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
    spawnQueue.push({ at: elapsed + 0.8 + i * 0.7, type: list[i] });
  }
}

function updateWaveFlow(dt) {
  for (var i = spawnQueue.length - 1; i >= 0; i--) {
    if (elapsed >= spawnQueue[i].at) {
      var s = spawnQueue.splice(i, 1)[0];
      if (s.type === "slasher") spawnSlasher();
      else if (s.type === "gunner") spawnGunner();
      else if (s.type === "brute") spawnBrute();
      else if (s.type === "sniper") spawnSniper();
      else if (s.type === "boss") spawnBoss();
    }
  }
  for (var q = bossQueueDelay.length - 1; q >= 0; q--) {
    bossQueueDelay[q].at -= dt;
    if (bossQueueDelay[q].at <= 0) {
      var ex = bossQueueDelay.splice(q, 1)[0];
      spawnExplosion(ex.pos, ex.power);
      sfx.boom(1.3);
    }
  }
  if (pendingNextWaveAt === null && wave > 0 &&
      spawnQueue.length === 0 && enemies.length === 0 && !boss) {
    pendingNextWaveAt = elapsed + 1.6;
    if ((wave + 1) % 5 === 0) spawnWeaponCrate(); // gift before a boss fight
  }
  if (pendingNextWaveAt !== null && elapsed >= pendingNextWaveAt) {
    pendingNextWaveAt = null;
    beginWave(wave + 1);
  }
}

/* ---------------- GAME FLOW ---------------- */
function resetGame() {
  var i;
  for (i = 0; i < enemies.length; i++) scene.remove(enemies[i].group);
  enemies = [];
  if (boss) { scene.remove(boss.group); boss = null; }
  elBossWrap.style.display = "none";
  for (i = 0; i < pickups.length; i++) scene.remove(pickups[i].group);
  pickups = [];
  [bullets, bolts, shards, explosions, sparks].forEach(function (pool) {
    for (var k = 0; k < pool.length; k++) {
      pool[k].active = false; pool[k].mesh.visible = false;
    }
  });
  bossQueueDelay = [];
  spawnQueue = [];
  score = 0; hearts = 3; wave = 0;
  kills = 0; killsSincePickup = 0; pickupFlip = false;
  invulnT = 0; dmgFade = 0; flashFade = 0; fireT = 0;
  aimX = 0; aimY = 0;
  setWeaponTier(0);
  updateHearts(); updateScore();
  elWave.textContent = "WAVE 1";
  pendingNextWaveAt = elapsed + 0.9;
}

function gameOver() {
  state = "OVER";
  $("over-score").textContent = score;
  $("over-best").textContent = best;
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
  state = "PLAYING";
  if (!hintShown) {
    hintShown = true;
    elHint.classList.add("show");
    setTimeout(function () { elHint.classList.remove("show"); }, 4500);
  }
}

/* ---------------- INPUT ---------------- */
var dragId = null, lastPX = 0, lastPY = 0;

function onPointerDown(e) {
  initAudio();
  if (state === "MENU" || state === "OVER") { startPlaying(); return; }
  if (state === "PAUSED") {
    state = "PLAYING"; scrPause.style.display = "none";
    clock.getDelta(); return;
  }
  if (e.pointerType !== "mouse") {
    dragId = e.pointerId; lastPX = e.clientX; lastPY = e.clientY;
  }
}

function onPointerMove(e) {
  if (state !== "PLAYING") return;
  if (e.pointerType === "mouse") {
    aimX = (e.clientX / window.innerWidth) * 2 - 1;
    aimY = -((e.clientY / window.innerHeight) * 2 - 1);
  } else if (e.pointerId === dragId) {
    var k = TOUCH_SENS / Math.min(window.innerWidth, window.innerHeight);
    aimX += (e.clientX - lastPX) * k;
    aimY -= (e.clientY - lastPY) * k;
    lastPX = e.clientX; lastPY = e.clientY;
  }
  aimX = Math.max(-1, Math.min(1, aimX));
  aimY = Math.max(-1, Math.min(1, aimY));
}

function onPointerUp(e) { if (e.pointerId === dragId) dragId = null; }

window.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
window.addEventListener("contextmenu", function (e) { e.preventDefault(); });

document.addEventListener("visibilitychange", function () {
  if (document.hidden && state === "PLAYING") {
    state = "PAUSED";
    scrPause.style.display = "flex";
  }
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- EFFECT POOLS UPDATE ---------------- */
function updateEffects(dt) {
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
  if (muzzleFlash.material.opacity > 0) {
    muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 9);
  }
  recoil = Math.max(0, recoil - dt * 0.9);
  cannon.position.z = -0.1 + recoil;
}

/* ---------------- CROSSHAIR TARGET CHECK ---------------- */
function updateCrosshair() {
  var locked = false;
  camera.getWorldDirection(camDir);
  var i;
  for (i = 0; i < enemies.length; i++) {
    if (enemies[i].remove) continue;
    enemyCenter(enemies[i], tmpV);
    tmpV.sub(camera.position).normalize();
    if (tmpV.dot(camDir) > 0.993) { locked = true; break; }
  }
  if (!locked && boss && !boss.entering) {
    enemyCenter({ group: boss.group, scale: 3.8 }, tmpV);
    tmpV.sub(camera.position).normalize();
    if (tmpV.dot(camDir) > 0.985) locked = true;
  }
  elCross.classList.toggle("locked", locked);
}

/* ---------------- MAIN LOOP ---------------- */
function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  if (state === "PAUSED") { renderer.render(scene, camera); return; }
  elapsed += dt;

  // world motion: the lava river flows past you
  lavaTexRock.offset.y += dt * 0.55;
  lavaTexGlow.offset.y += dt * 0.85;
  darkRockTex.offset.y += dt * 0.4;
  var i;
  for (i = 0; i < canyonRocks.length; i++) {
    canyonRocks[i].position.z += 26 * dt;
    if (canyonRocks[i].position.z > 30) {
      canyonRocks[i].position.z = -245 - Math.random() * 25;
      canyonRocks[i].position.x = canyonRocks[i].userData.side *
        (52 + Math.random() * 32);
    }
  }
  for (i = 0; i < riverIslands.length; i++) {
    riverIslands[i].position.z += 26 * dt;
    if (riverIslands[i].position.z > 25) {
      riverIslands[i].position.z = -230 - Math.random() * 20;
      riverIslands[i].position.x = riverIslands[i].userData.side *
        (10 + Math.random() * 14);
    }
  }
  var posA = emberGeoA.attributes.position.array;
  for (i = 0; i < emberVelA.length; i++) {
    posA[i * 3 + 1] += emberVelA[i] * dt;
    posA[i * 3 + 2] += 6 * dt;
    if (posA[i * 3 + 1] > 44 || posA[i * 3 + 2] > 10) {
      posA[i * 3]     = (Math.random() - 0.5) * 70;
      posA[i * 3 + 1] = 0;
      posA[i * 3 + 2] = -170 + Math.random() * 40;
    }
  }
  emberGeoA.attributes.position.needsUpdate = true;
  var posB = emberGeoB.attributes.position.array;
  for (i = 0; i < emberVelB.length; i++) {
    posB[i * 3 + 1] += emberVelB[i] * dt;
    posB[i * 3 + 2] += 3 * dt;
    if (posB[i * 3 + 1] > 44 || posB[i * 3 + 2] > 10) {
      posB[i * 3]     = (Math.random() - 0.5) * 70;
      posB[i * 3 + 1] = 0;
      posB[i * 3 + 2] = -170 + Math.random() * 40;
    }
  }
  emberGeoB.attributes.position.needsUpdate = true;

  curYaw   += (-aimX * MAX_YAW - curYaw) * Math.min(1, dt * 11);
  curPitch += ( aimY * MAX_PITCH - curPitch) * Math.min(1, dt * 11);
  camera.rotation.set(curPitch, curYaw, 0);

  if (shakeT > 0) {
    shakeT -= dt;
    camera.position.set(
      PLAYER_POS.x + (Math.random() - 0.5) * shakeAmp,
      PLAYER_POS.y + (Math.random() - 0.5) * shakeAmp,
      PLAYER_POS.z);
    if (shakeT <= 0) shakeAmp = 0;
  } else {
    camera.position.copy(PLAYER_POS);
    camera.position.y += Math.sin(elapsed * 1.7) * 0.12;
  }
  camera.updateMatrixWorld(true);

  if (state === "PLAYING") {
    invulnT = Math.max(0, invulnT - dt);
    fireT -= dt;
    if (fireT <= 0) { fireT = weapon.rate; fireWeapon(); }
    updateWaveFlow(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateBolts(dt);
    updatePickups(dt);
    updateCrosshair();
  }
  updateEffects(dt);

  if (dmgFade > 0) { dmgFade = Math.max(0, dmgFade - dt * 1.4); elDmg.style.opacity = dmgFade; }
  if (flashFade > 0) { flashFade = Math.max(0, flashFade - dt * 1.2); elFlash.style.opacity = flashFade; }
  elHearts.style.opacity = (invulnT > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.35 : 1;

  renderer.render(scene, camera);
}

/* ---------------- BOOT ---------------- */
initThree();
buildSharedParts();
buildWorld();
buildPools();
updateHearts();
updateScore();
setWeaponTier(0);
animate();

})();
