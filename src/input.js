/* ---------------- INPUT ---------------- */
import { initAudio } from "./audio.js";
import { scrPause } from "./ui.js";

var ctx;

var dragId = null, lastPX = 0, lastPY = 0;

function onPointerDown(e) {
  initAudio();
  if (ctx.state === "MENU" || ctx.state === "OVER") { ctx.startPlaying(); return; }
  if (ctx.state === "PAUSED") {
    ctx.state = "PLAYING"; scrPause.style.display = "none";
    ctx.clock.getDelta(); return;
  }
  if (e.pointerType !== "mouse") {
    dragId = e.pointerId; lastPX = e.clientX; lastPY = e.clientY;
  }
}

function onPointerMove(e) {
  if (ctx.state !== "PLAYING") return;
  if (e.pointerType === "mouse") {
    ctx.aimX = (e.clientX / window.innerWidth) * 2 - 1;
    ctx.aimY = -((e.clientY / window.innerHeight) * 2 - 1);
  } else if (e.pointerId === dragId) {
    var k = ctx.TOUCH_SENS / Math.min(window.innerWidth, window.innerHeight);
    ctx.aimX += (e.clientX - lastPX) * k;
    ctx.aimY -= (e.clientY - lastPY) * k;
    lastPX = e.clientX; lastPY = e.clientY;
  }
  ctx.aimX = Math.max(-1, Math.min(1, ctx.aimX));
  ctx.aimY = Math.max(-1, Math.min(1, ctx.aimY));
}

function onPointerUp(e) { if (e.pointerId === dragId) dragId = null; }

export function initInput(c) {
  ctx = c;

  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && ctx.state === "PLAYING") {
      ctx.state = "PAUSED";
      scrPause.style.display = "flex";
    }
  });

  window.addEventListener("resize", function () {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
