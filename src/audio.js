/* ---------------- AUDIO (all generated in code) ---------------- */
var audioCtx = null, masterGain = null, noiseBuf = null;

export function initAudio() {
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

export var sfx = {
  laser:  function () { tone(880, 320, 0.10, "square", 0.4); },
  twin:   function () { tone(940, 360, 0.10, "square", 0.4); },
  triple: function () { tone(760, 280, 0.12, "square", 0.4); },
  plasma: function () { tone(260, 60, 0.3, "sawtooth", 0.55);
                        tone(520, 120, 0.2, "square", 0.28, 0.02); },
  /* Plasma Cannon: punchy layered zap, sharp attack, fast fall */
  zap: function () { noiseHit(0.05, 0.35, 4200, 0);
                     tone(1900, 240, 0.11, "square", 0.5);
                     tone(950, 130, 0.16, "sawtooth", 0.45);
                     tone(3400, 900, 0.06, "sine", 0.22); },
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
  /* rising triad, pitched higher per combo tier (lv 2, 3, 4) */
  comboUp: function (lv) {
    var b = 520 * Math.pow(1.26, lv - 2);
    tone(b, b, 0.08, "sine", 0.4);
    tone(b * 1.25, b * 1.25, 0.08, "sine", 0.4, 0.07);
    tone(b * 1.5, b * 1.5, 0.12, "sine", 0.45, 0.14);
  },
  /* super meter full: bright fanfare, higher than heart and combo chimes */
  superReady: function () {
    tone(660, 660, 0.09, "square", 0.35);
    tone(880, 880, 0.09, "square", 0.35, 0.08);
    tone(1320, 1320, 0.16, "square", 0.4, 0.16);
    tone(1760, 1760, 0.22, "sine", 0.3, 0.26);
  },
  /* the big one: rising zap into a deep drop and a long searing tail */
  superBlast: function () {
    tone(220, 1400, 0.18, "sawtooth", 0.5);
    tone(90, 24, 1.1, "sine", 0.85, 0.12);
    noiseHit(1.0, 0.85, 900, 0.1);
    noiseHit(0.7, 0.5, 2600, 0.1);
    tone(1200, 160, 0.7, "square", 0.3, 0.15);
  },
  bossDie:function () { sfx.bigBoom(); tone(520, 60, 1.2, "sawtooth", 0.5, 0.2); }
};
