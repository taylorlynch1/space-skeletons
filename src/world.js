/* ---------------- RENDERER / SCENE / LAVA RIVER CANYON ---------------- */
import * as THREE from "three";

var ctx;

var lavaTexRock, lavaTexGlow, darkRockTex;
var canyonRocks = [], riverIslands = [];
var emberGeoA, emberVelA = [], emberGeoB, emberVelB = [];

export function initThree(c) {
  ctx = c;
  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById("game-root").appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x46100a);
  scene.fog = new THREE.Fog(0x46100a, 55, 230);

  var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.copy(ctx.PLAYER_POS);
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

  ctx.renderer = renderer;
  ctx.scene = scene;
  ctx.camera = camera;
  ctx.clock = new THREE.Clock();
}

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

export function buildWorld() {
  var scene = ctx.scene;
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
  var bankMat = new THREE.MeshPhongMaterial({ color: 0x1d0c0e, flatShading: true, shininess: 4 });
  var bankL = new THREE.Mesh(new THREE.BoxGeometry(12, 1.7, 900), bankMat);
  bankL.position.set(-38, 0.55, -250);
  scene.add(bankL);
  var bankR = new THREE.Mesh(new THREE.BoxGeometry(12, 1.7, 900), bankMat);
  bankR.position.set(38, 0.55, -250);
  scene.add(bankR);

  // canyon walls: solid mountain rows on both sides, flowing past you
  var mtGeo = new THREE.ConeGeometry(1, 1.7, 6);
  var rockMats = [
    new THREE.MeshPhongMaterial({ color: 0x21100f, flatShading: true, shininess: 4 }),
    new THREE.MeshPhongMaterial({ color: 0x180a0b, flatShading: true, shininess: 4 }),
    new THREE.MeshPhongMaterial({ color: 0x2a1410, flatShading: true, shininess: 4 })
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
  ctx.scene.add(new THREE.Points(emberGeoA, new THREE.PointsMaterial({
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
  ctx.scene.add(new THREE.Points(emberGeoB, new THREE.PointsMaterial({
    color: 0xffb060, size: 1.5, sizeAttenuation: true,
    transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));
}

/* world motion: the lava river flows past you */
export function updateWorld(dt) {
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
}
