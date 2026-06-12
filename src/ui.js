/* ---------------- DOM / HUD ---------------- */
var ctx;

export var $ = function (id) { return document.getElementById(id); };
export var elHearts, elScore, elBest;
export var elComboWrap, elComboLabel, elComboFill;
export var elSuperBtn, elSuperRing, elSuperFlash;
export var elWave, elWeaponName, elWeaponDot, elWeaponLv;
export var elBossWrap, elBossName, elBossFill;
export var elBanner, elBannerMain, elBannerSub;
export var elDmg, elFlash;
export var elCross, elHint;
export var scrMenu, scrOver, scrPause;

var pops = [];

export function initUI(c) {
  ctx = c;
  elHearts = $("hearts"); elScore = $("score-val"); elBest = $("best-val");
  elComboWrap = $("combo-wrap"); elComboLabel = $("combo-label");
  elComboFill = $("combo-bar-fill");
  elSuperBtn = $("super-btn"); elSuperRing = $("super-ring");
  elSuperFlash = $("super-flash");
  elWave = $("wave-box"); elWeaponName = $("weapon-name");
  elWeaponDot = $("weapon-dot"); elWeaponLv = $("weapon-lv");
  elBossWrap = $("boss-bar-wrap"); elBossName = $("boss-name"); elBossFill = $("boss-bar-fill");
  elBanner = $("banner"); elBannerMain = elBanner.querySelector(".main");
  elBannerSub = elBanner.querySelector(".sub");
  elDmg = $("dmg-vignette"); elFlash = $("red-flash");
  elCross = $("crosshair"); elHint = $("hint");
  scrMenu = $("screen-menu"); scrOver = $("screen-over"); scrPause = $("screen-pause");
  for (var i = 0; i < 8; i++) {
    var pd = document.createElement("div");
    pd.className = "pop"; document.body.appendChild(pd);
    pops.push({ el: pd, busy: false });
  }
}

export function updateHearts() {
  var html = "";
  for (var i = 0; i < ctx.MAX_HEARTS; i++) {
    html += '<span class="' + (i < ctx.hearts ? "h-on" : "h-off") + '">&#9829;</span>';
  }
  elHearts.innerHTML = html;
}

export function updateScore() {
  elScore.textContent = ctx.score;
  if (ctx.score > ctx.best) { ctx.best = ctx.score; elBest.textContent = ctx.best; }
}

export function updateCombo(pulse) {
  if (ctx.comboMult >= 2) {
    elComboWrap.style.display = "block";
    elComboLabel.textContent = "COMBO x" + ctx.comboMult;
    elComboFill.style.width = Math.round(ctx.comboFrac * 100) + "%";
    if (pulse) {
      elComboWrap.classList.remove("bump");
      void elComboWrap.offsetWidth;
      elComboWrap.classList.add("bump");
    }
  } else {
    elComboWrap.style.display = "none";
  }
}

export function showBanner(main, sub, danger) {
  elBannerMain.textContent = main;
  elBannerSub.textContent = sub || "";
  elBanner.classList.toggle("danger", !!danger);
  elBanner.classList.add("show");
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(function () { elBanner.classList.remove("show"); }, 2200);
}

export function scorePop(worldPos, text, big) {
  var p = null;
  for (var i = 0; i < pops.length; i++) if (!pops[i].busy) { p = pops[i]; break; }
  if (!p) return;
  ctx.tmpV.copy(worldPos).project(ctx.camera);
  if (ctx.tmpV.z > 1) return;
  var x = (ctx.tmpV.x * 0.5 + 0.5) * window.innerWidth;
  var y = (-ctx.tmpV.y * 0.5 + 0.5) * window.innerHeight;
  p.busy = true;
  p.el.textContent = text;
  p.el.style.left = x + "px";
  p.el.style.top = y + "px";
  p.el.style.fontSize = big ? "30px" : "18px";
  p.el.classList.add("live");
  setTimeout(function () { p.el.classList.remove("live"); p.busy = false; }, 850);
}
