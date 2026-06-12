# SPACE SKELETONS — Project Constitution

Read this file at the start of every session before doing any work.

## What this is

A 3D first-person cockpit shooter built by Taylor and his 7-year-old son.
The player IS a flying robot, soaring along a lava river canyon, fighting
skeleton pirates. It started as a single-file Claude.ai artifact and has
been ported into this Vite + Three.js project for Phase 2 development.

The 7-year-old is the lead designer. Every feature decision filters through
one question: does this make a 7-year-old feel powerful, surprised, or
proud? Complexity must come from interesting decisions and anticipation,
never from harder execution. He should never feel punished.

## Working agreements (Taylor's standing rules)

1. Think 3 to 5 steps ahead before suggesting any task. Evaluate whether
   work survives into the next milestone or gets discarded.
2. Flag scope creep, redundant work, and premature complexity BEFORE work
   starts. Never walk back a direction after work has begun.
3. Verify before suggesting fixes. Flag uncertainty explicitly. Never
   assume without confirmation.
4. Communicate in numbered action lists, plain and concise. No em dashes
   anywhere, in chat or in code comments or UI strings.
5. The game must be playable and improved at the end of EVERY session.
   Never leave it broken between sessions.
6. After any code change: run `npm run dev`, play at least 2 waves, and
   confirm 60fps feel before calling a task done.
7. Effort policy: use ultracode for milestone implementation tasks. Drop
   to high effort for housekeeping, deploy watching, and small fixes.
   Re-set each session since effort is session-only.
8. Verification economy: Taylor does routine visual playtesting himself.
   Do not use browser tooling for routine visual checks. Console checks
   happen at exactly two moments: (a) once at the end of each milestone
   before the final commit, and (b) when the game plays fine but a change
   seems to have had no effect or something feels off, since that pattern
   means a silent failure. Browser tooling is reserved for those console
   checks, bugs Taylor cannot reproduce or describe, and performance
   profiling.

## Locked design facts (do not change without Taylor's explicit sign-off)

- Player starts with 3 hearts. Maximum hearts is 5 (MAX_HEARTS).
- Weapon ladder, in order: LASER BLASTER, TWIN LASER, TRIPLE BLASTER,
  PLASMA CANNON, PLASMA STORM. Crates upgrade exactly one tier.
  Tier caps by wave: <3 cap LV2, 3-5 cap LV3, 6-10 cap LV4, 11+ cap LV5.
  At cap, crates pay +150 score.
- Boss every 5 waves. Boss names cycle: CAPTAIN BLAZEBONES, ADMIRAL
  SKULLSWORD, DREAD KING MARROW, THE BONE EMPEROR.
- Enemy roster: Slasher (wave 1+), Gunner (wave 2+), Brute (wave 6+,
  eyepatch, iron plate, 30 pts), Sniper (wave 8+, purple bolts, 25 pts).
- Skeleton kills play a randomized funny sound (bone xylophone, cartoon
  boing, or slide whistle). This is beloved. Keep it.
- Controls: drag to aim on touch, mouse position on desktop, auto-fire,
  aim assist snaps to targets near the crosshair, bullets converge on the
  crosshair point. Aim limits: yaw 0.85 rad, pitch 0.55 rad.
- The center flight corridor stays clear of obstacles at all times.
- Enemies must ALWAYS be positioned inside the aim cone. Any new enemy
  needs a reachability check (worst-case angle vs aim limits) before merge.
- iPad Safari is the primary target. Desktop is the dev environment.
- Sounds are generated in code with WebAudio today. Audio files may be
  added in M4 but must be small and preloaded.

## Tech constraints

- three is PINNED at 0.128.0 because the code uses r128 APIs
  (outputEncoding, sRGBEncoding, texture.encoding). Upgrading three is a
  dedicated M4 task with live testing, not a drive-by change.
- 60fps on iPad is the performance budget. Pixel ratio capped at 1.7.
  Pool projectiles and particles. Share geometries and materials.
- No paid assets. CC0 sources only: Kenney.nl, Quaternius, OpenGameArt,
  Kenney audio. Credit sources in README when added.
- localStorage IS allowed here (unlike the artifact). Use it for saves.

## Roadmap

### M0 — Foundation (do this first)
1. DONE 2026-06-11. Refactor src/main.js into modules with ZERO behavior
   change: src/world.js, src/skeletons.js, src/weapons.js, src/pickups.js,
   src/waves.js, src/boss.js, src/audio.js, src/ui.js, src/input.js,
   src/effects.js (shared explosions, sparks, bone shards, screen shake),
   src/main.js (game loop + state). Verify the game plays identically.
2. Deploy confirmed live 2026-06-11 at
   https://taylorlynch1.github.io/space-skeletons/ (Pages had to be
   enabled in repo settings, then the failed Actions run was re-run).
   Verified in browser: title screen, gameplay, no console errors.
   REMAINING: Taylor confirms it runs on the iPad and adds it to the
   home screen.

### M1 — Tier A (feel and reward)
1. DONE 2026-06-11. Combo multiplier: kill chain without taking a hit,
   x2 x3 x4 score, on-screen meter, resets on damage. Thresholds
   5/10/15 kills, no decay (tunable, see docs/m1-integration-map.md
   section 6.11). Applies to enemy and boss kills only; +5 bolt and
   +150 crate awards stay unmultiplied.
2. DONE 2026-06-12. SUPER BLAST: 15 scored kills fill the meter (boss
   kill pays 5), bottom-right button arms when full, Space fires on
   desktop. Blast wipes all enemy bolts, kills every enemy nearest
   first on a bonk cascade, boss loses 25 percent of max hp (deferred
   to entrance end if fired early, a saved meter is never wasted). Blast
   kills pay multiplied score and extend the combo; blast kills never
   recharge the meter. Charge survives damage, only restart clears it.
   Tunables in src/superblast.js. Golden Skeleton blast-immunity
   decision flagged for item 4 in docs/m1-integration-map.md 6.13.
3. Shield pickup: blue bubble, absorbs one hit, third pickup type.
4. Golden Skeleton: rare, fast, flees, 100 points.
5. End-of-wave pilot medals: Bronze, Silver, Gold by hits taken.
6. Boss entrance taunts: speech bubble text, kid-friendly trash talk.

### M2 — Tier B part 1 (worlds and choices)
1. Biome shifts after each boss: lava river (current), ice canyon,
   deep-space asteroid run, bone graveyard. Recolor plus prop swap,
   same gameplay layer.
2. Pick-1-of-3 upgrade cards after each boss: fire rate, pickup magnet,
   bigger blast radius (more cards welcome, balance gently).

### M3 — Tier B part 2 (tactics and toys)
1. New archetypes: Shield-Bearer (hit when shield drops), Bomber (arcing
   bombs you can shoot), Healer (heals others, priority target).
2. Boss weak points: glowing eye or heart, triple damage, shield phases.
3. Sidekick drone the kid names. Follows, occasionally shoots, upgradable.
4. Silly modes menu: Big Head, Tiny Pirates, Rainbow Lasers.

### M4 — Tier C (the real-game leap)
1. Persistent saves via localStorage: best score, medals, unlocked skins
   and silly modes.
2. Graphics leap: GLTF models from CC0 packs, real-time shadows, canvas
   or image textures, hit reactions. Includes the three upgrade task.
3. His art in the game: photograph his skeleton drawing, texture a boss
   with it.
4. His voice: record robot lines and boss roars, small audio files.
5. Gamepad support and a mission-select map.

## Session protocol

1. Read this file.
2. State which milestone item you are working on and the 3-to-5-step plan.
3. Get Taylor's go-ahead if the plan changes anything not listed here.
4. Build, then verify per working agreement 6.
5. Update the Roadmap section, marking items DONE with the date.
