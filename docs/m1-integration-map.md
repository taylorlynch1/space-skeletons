# M1 Integration Map

Code map for building the M1 Tier A features (combo multiplier, SUPER
BLAST, shield pickup, golden skeleton, medals, boss taunts). Produced by
a 4-agent discovery sweep on 2026-06-11 at commit ba24948. Line numbers
drift as features land; re-verify before editing, but the function names
and ownership boundaries are stable.

## 1. Kill and score flow

1. Bullet vs enemy: `updateBullets(dt)` in weapons.js:224-275. Hit test
   line 251 (`distanceTo < 1.55 * e.scale + b.r`), HP decrement line 252,
   death at line 258: `killEnemy(e, true)`. Boss hits at lines 263-271
   call `hitBoss(b.dmg, bp)` (line 266). Enemy-bolt shoot-down test at
   line 238.
2. Splash: `applySplash(center, dmg, radius)` weapons.js:207-222, called
   from updateBullets line 255 when `b.splash > 0`. Kills via
   `killEnemy(e, true)` at 215, boss via `hitBoss` at 220. Can kill
   several enemies in ONE frame.
3. Kill choke point: `killEnemy(e, scored)` skeletons.js:338-352. Always:
   explosion, bone shards, `sfx.boom(0.6)`, `sfx.bonk()` (line 343),
   removal. Only if `scored` (lines 344-349): `ctx.score += e.pts`,
   `updateScore()`, `scorePop(ctx.tmpV, "+" + e.pts, false)`,
   `ctx.kills++`, `ctx.killsSincePickup++`, `spawnAutoPickup()` every 9
   kills. Third call site skeletons.js:391: `killEnemy(e, false)` when a
   melee enemy self-destructs after landing its hit (no score, no kill
   count, but bonk still plays).
4. Boss: `hitBoss(dmg, atPos)` boss.js:133-139 decrements hp, calls
   `killBoss()` boss.js:141-164 at zero. killBoss awards
   `pts = 300 * boss.tier` directly (lines 144-146) with a big scorePop,
   then bossDie + bonk sounds (155-156), spawns crate and conditional
   heart (162-163). Boss scoring BYPASSES killEnemy.
5. All score-award sites (there is NO central addScore helper; each site
   mutates `ctx.score` then calls `updateScore()`):
   - skeletons.js:345, enemy kill, `+e.pts` (slasher 10, gunner 15,
     sniper 25, brute 30)
   - weapons.js:241, shooting down an enemy bolt, `+5`
   - boss.js:145, boss kill, `+300 * tier`
   - pickups.js:110, weapon crate at tier cap, `+150` (locked fact),
     banner "MAX POWER!" at 112, no scorePop
6. Funny kill sound: `sfx.bonk()` audio.js:62-76, three randomized
   variants (xylophone, boing, slide whistle). Beloved, locked.

## 2. Player damage flow

1. Single choke point: `damagePlayer()` main.js:69-78, the ONLY place
   `ctx.hearts` is decremented. Guard at line 70 early-returns if
   `ctx.invulnT > 0` or state is not PLAYING. On a real hit: hearts--,
   `invulnT = 1.3`, `dmgFade = 1.0`, `shake(0.7, 0.5)`, `sfx.hurt()`,
   `updateHearts()`, `gameOver()` at zero hearts (line 77). Exposed
   cross-module as `ctx.damagePlayer` (wired main.js:177).
2. Exactly two call sites, both invoke it unconditionally on contact
   (the no-op during invulnerability happens inside the guard):
   - skeletons.js:389, melee slash (slasher and brute), triggers at
     `slashT >= 0.22` with `e.didHit` latch; enemy self-destructs
     unscored at `slashT >= 0.5` (line 391), so on a melee hit the
     damage lands BEFORE the unscored kill
   - weapons.js:284, any enemy bolt within 2.6 of PLAYER_POS in
     `updateBolts`. ALL boss attacks funnel through this same path
     (boss.js:100 and 105 fire via fireBolt and fireBoltDir)
3. Feedback chain: hearts rebuild `updateHearts()` ui.js:33-39, red
   vignette via `ctx.dmgFade` faded in animate main.js:169 (note
   `ctx.flashFade`/red-flash is a SEPARATE effect used for boss
   entrances, boss.js:36), screen shake `shake(amp, dur)`
   effects.js:69-72 consumed at main.js:141-151, hearts blink during
   i-frames at main.js:171.
4. `gameOver()` main.js:105-113, called only from damagePlayer. Sets
   state OVER, fills over-score/over-best, shows screen-over.

## 3. HUD and UI conventions

1. Pattern: ui.js exports mutable element vars (elHearts, elScore,
   elWave, elBossWrap, elBanner, etc.) assigned once in `initUI(c)`
   (ui.js:15-31). initUI runs FIRST in the boot order (main.js:180).
   Other modules import element vars and write directly.
2. Exported functions: `updateHearts()` (33-39), `updateScore()` (41-44,
   no arguments, reads ctx.score, silently folds into ctx.best at 43),
   `showBanner(main, sub, danger)` (46-53, single shared auto-hide timer
   `showBanner._t`, 2200ms; concurrent banners clobber each other),
   `scorePop(worldPos, text, big)` (55-70, pool of 8 divs created in
   initUI, projects via ctx.tmpV, 850ms recycle, silently drops popups
   when the pool is exhausted).
3. Direct DOM writes elsewhere: wave box (waves.js:15, main.js:101),
   weapon pill (weapons.js:144-147), boss bar show/update/hide
   (boss.js:32-34, 137, 160; main.js:86), hint (main.js:121-124, 4.5s,
   gated by ctx.hintShown), crosshair lock class (weapons.js:307).
4. CSS: one inline style block in index.html (no CSS file). Font is
   ui-monospace stack. Palette: cyan #4df3ff, gold #ffd34d, amber
   #caa052, cream #ffe9d0, orange #ff7a2a, reds #ff3b30/#ff4757/#ff2e2e.
   Z-index layers: visor tint 4, visor corners 5, crosshair 6, HUD and
   pops and hint and boss bar 7, banner 8, damage overlays 9, screens 20.
5. Anchored positions: hearts top 16 left 22, score box top 16 right 22,
   wave box top center, weapon pill bottom 22 center, boss bar top 52
   center (display none unless boss), hint bottom 78 center (transient).
   FREE spots for new HUD: under the score box top-right, under hearts
   top-left, above the weapon pill bottom-center.
6. The only meter pattern is the boss bar: outer #boss-bar-bg (14px,
   border, radius 999px, overflow hidden) + inner #boss-bar-fill driven
   by `style.width = pct + "%"` with a 0.12s width transition
   (boss.js:137). Copy this for any new meter.
7. Show/hide conventions: class "show" (banner, hint), class "live"
   (pops), style.display (boss wrap, screens).

## 4. Game state lifecycle

1. All shared state is one object literal `ctx` in main.js:31-66. Key
   fields: state ("MENU" | "PLAYING" | "PAUSED" | "OVER"), elapsed,
   score, best, hearts, wave, MAX_HEARTS 5, kills, killsSincePickup,
   invulnT, dmgFade, flashFade, shake fields, pendingNextWaveAt,
   enemies[], spawnQueue[], boss, weaponTier, scratch vectors tmpV/tmpV2,
   callbacks damagePlayer/startPlaying (wired 177-178).
2. Sharing pattern: every module exports `initX(c)` storing c in a
   module-local ctx; main.js never gets imported (no cycles). main.js
   functions reach other modules through ctx callbacks. Exception:
   audio.js has no ctx, consumers `import { sfx } from "./audio.js"`.
3. Flow: tap on MENU or OVER calls `ctx.startPlaying()` (input.js:11);
   `startPlaying()` main.js:115-126 hides screens, calls `resetGame()`,
   sets PLAYING. Pause via visibilitychange (input.js:47-52); while
   PAUSED, animate only renders (main.js:132), so dt-based timers freeze
   safely. Use dt accumulated in animate for any new timer, never wall
   clock, or backgrounding the iPad breaks it.
4. Master reset: `resetGame()` main.js:81-103. Field-by-field manual
   reset: entities, pools, score, hearts 3, wave 0, kills counters,
   invulnT, fades, aim, weapon tier 0, HUD re-render, schedules wave 1.
   ctx.best and ctx.elapsed intentionally survive. EVERY new per-run
   state field must be added here explicitly or it leaks across runs.
5. Waves: `beginWave(n)` waves.js:13-44 (boss wave when n % 5 === 0,
   otherwise builds timed spawnQueue). Wave END is implicit: the
   conditional in `updateWaveFlow` waves.js:65-69 (no pending wave, no
   spawns left, no enemies, no boss) schedules the next wave 1.6s out.
   There is NO wave-end event or function to hook; thread into
   updateWaveFlow or beginWave directly (medals will need this).
6. Boss: `spawnBoss()` boss.js:17-40 (tier = floor(wave / 5), shows bar,
   roar). Defeat path in killBoss, see section 1.
7. localStorage: not used anywhere yet. ctx.best is session-only,
   updated inside updateScore (ui.js:43), lost on page reload. M4 task.

## 5. Audio API

1. `initAudio()` audio.js:4-16, lazily creates the AudioContext on first
   pointerdown (input.js:10), master gain 0.22, prebuilt noise buffer.
2. Private primitives (not exported): `tone(f0, f1, dur, type, vol,
   delay)` audio.js:18-29 (oscillator with exponential freq ramp and
   gain decay) and `noiseHit(dur, vol, freq, delay)` audio.js:31-43
   (filtered noise burst).
3. Public surface: `export var sfx = { ... }` audio.js:45-89. Keys:
   laser, twin, triple, plasma, enemyShot, sniperShot, boom(p), bigBoom,
   bonk, hurt, chime, heart, roar, heartbeat, waveUp, bossDie. Only
   boom takes a parameter (power scaling); follow that pattern for any
   new parameterized sound (e.g. an escalating combo chime).
4. Rising-arpeggio examples to copy: sfx.heart (80-82) is 520, 780, 1040
   Hz via the delay arg; sfx.chime (78-79) 660 to 990; sfx.waveUp (87)
   520 to 820 sweep.

## 6. Standing risks and decisions for M1 features

1. Score is awarded at 4 independent sites (section 1.5). Any multiplier
   or meter charging needs an explicit per-site decision and either a
   new shared helper or per-site edits. The +150 crate value is a locked
   design fact; do not multiply it without sign-off.
2. Combo or streak resets belong INSIDE damagePlayer after the invuln
   guard (main.js:70), never at the call sites, or no-damage hits during
   the 1.3s invulnerability window would wrongly reset the chain.
3. Only the `scored === true` branch of killEnemy counts as a real kill.
   The melee self-destruct (scored false) must not extend chains or
   charge meters; conveniently the damage reset lands first (0.22s vs
   0.5s).
4. Boss kills bypass killEnemy; bosses need their own hook in killBoss
   for any kill-driven system (combo chain, SUPER BLAST charge).
5. resetGame must zero every new state field and reset/hide every new
   HUD element, or state leaks into the next run.
6. scorePop text is formatted at each call site BEFORE updateScore runs;
   multiplied or bonus values must be computed before building the
   popup string. The 8-slot pop pool silently drops popups during dense
   chains; splash kills can score several pops in one frame.
7. showBanner has one shared timer; milestone banners (combo up, medal)
   will clobber or be clobbered by wave/boss/pickup banners if fired
   together. Prefer non-banner feedback or extend showBanner.
8. Cross-module wiring for new systems: follow the ctx callback pattern
   (like ctx.damagePlayer) when main.js logic must be reachable from
   skeletons/weapons/boss, to keep imports acyclic.
9. ctx.tmpV is a shared scratch vector consumed synchronously; deferred
   or animated UI must copy it, never hold the reference.
10. New timers must accumulate dt from animate (frozen while PAUSED),
    not wall-clock time (iPad backgrounding).
11. Combo chain has no decay BY DESIGN (Taylor, 2026-06-11): a clean
    player sits at x4 permanently from mid-game on. Intentional and
    kid-friendly. TUNABLE if playtesting shows x4 feels like the
    default instead of an achievement: raise THRESHOLDS in
    src/combo.js (currently 5/10/15) or add a slow decay, with
    Taylor's sign-off.
12. SUPER BLAST (M1 item 2) wiring: charge hooks live at the two
    comboKill sites through the ctx.chargeSuper callback (killEnemy
    pays 1, killBoss pays 5). The blast cascade calls
    killEnemy(e, true) on every active enemy nearest-first, so blast
    kills pay multiplied score and extend the combo (approved by
    Taylor 2026-06-12). chargeSuper no-ops while a blast is running,
    so blast kills never recharge the meter. Bolt shoot-downs (+5)
    and crates (+150) do not charge. Tunables in src/superblast.js:
    CHARGE_KILLS 15, BOSS_HP_CUT 0.25, KILL_GAP 0.06. The 25 percent
    boss cut is OWED, not snapshotted: fired during a boss entrance or
    with the boss still in the spawn queue, the blast stays pending and
    the cut lands when the entrance ends, so a saved meter is never
    wasted. Bolts are wiped every frame while a blast runs. Beam life
    scales with cascade length so the beam outlives the last kill.
    Hearts blink on ctx.hurtT (set only by real damage), not invulnT,
    so blast i-frames never show the got-hit cue.
13. Golden Skeleton (M1 item 4) vs SUPER BLAST, flagged by Taylor
    2026-06-12: the blast kills EVERY active enemy, which would hand
    out a free multiplied 100 point award for a rare fleeing target
    designed to be chased. Item 4's plan MUST decide whether the
    Golden Skeleton is blast-immune (for example it flees or despawns
    instead of dying) before merge.
