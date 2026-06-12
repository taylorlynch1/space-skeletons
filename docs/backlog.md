# Backlog

Parking lot for observed problems and demands that are NOT scheduled
work yet. Each entry names the signal, the current answer if one
exists, and where it should land. Review at the start of each
milestone planning session. Created 2026-06-12.

## 1. Late-game crates feel meaningless

- Signal: once the weapon tier hits the wave cap, every crate pays
  +150 score and nothing else. Score is abstract for a 7 year old, so
  by the deep waves crates stop being exciting to chase.
- Current answer: M2 item 2 (pick 1 of 3 upgrade cards after each
  boss) gives the reward loop real choices. Hold until then; do not
  invent a new crate reward before M2.
- Watch: if playtests show boredom before M2 lands, the cheap stopgap
  is a crate that drops a heart at full tier when hearts are below max.

## 2. Graphics elevation demand

- Signal: standing demand for the game to look more real: models,
  shadows, textures, hit reactions.
- Current answer: M4 item 2 (GLTF models from CC0 packs, real-time
  shadows, canvas or image textures, plus the three r128 upgrade task).
  Tier C scope, do not pull it forward piecemeal.
- Constraint reminder: 60fps on iPad and the 1.7 pixel ratio cap are
  the budget. Any graphics leap gets profiled on the iPad first.

## 3. Background music system with boss themes

- Signal: the game has sfx but no music. Wanted: a music layer with a
  distinct boss theme and smooth transitions when a boss spawns and
  when it dies.
- Current answer: none scheduled. Audio files become allowed in M4
  (small and preloaded). A WebAudio generative loop could land earlier
  without files if desired.
- Sketch: two-layer system, canyon loop plus boss loop, crossfade
  hooked into spawnBoss and killBoss, duck the music under the roar.
  Needs Taylor's call on M3 vs M4 placement.
- Also at this milestone: the golden skeleton speaks the words TOO
  SLOW out loud when he escapes (replacing or layering the current
  whistle plus text pop). Voice source to be decided then; candidate
  is the kid's own voice per M4 item 4.
