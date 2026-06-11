# SPACE SKELETONS

A 3D first-person cockpit shooter. You are the flying robot. The skeleton
pirates of the lava planet are many. Built by a dad, a 7-year-old lead
designer, and Claude.

## First-time setup (Windows)

1. Unzip this folder somewhere like `C:\dev\space-skeletons`
2. Open a terminal in the folder (VS Code: File > Open Folder, then
   Terminal > New Terminal)
3. Install dependencies:
   ```
   npm install
   ```
4. Run the game:
   ```
   npm run dev
   ```
   Open the URL it prints (usually http://localhost:5173). The game should
   play exactly like the artifact version.

## Test on the iPad (same wifi)

1. Run with network access:
   ```
   npm run dev -- --host
   ```
2. It prints a Network URL like `http://192.168.x.x:5173`. Open that in
   Safari on the iPad.

## Put it on the internet (his own game URL)

1. Create the repo and push (GitHub CLI is already set up):
   ```
   git init
   git add .
   git commit -m "SPACE SKELETONS v4: ported from artifact"
   gh repo create space-skeletons --public --source=. --push
   ```
2. On github.com, open the repo: Settings > Pages > Build and deployment >
   Source: **GitHub Actions**
3. Push to main (already done by step 1). The included workflow builds and
   deploys automatically. After a minute or two the game is live at:
   ```
   https://<your-github-username>.github.io/space-skeletons/
   ```
4. On the iPad, open that URL in Safari, tap Share, then
   **Add to Home Screen**. Now it has its own icon like a real game,
   because it is one.

## Start building with Claude Code

In the project folder, run:
```
claude
```
Then paste this as your first prompt:

> Read CLAUDE.md fully. We are starting Milestone M0 item 1: refactor
> src/main.js into the module structure listed there with zero behavior
> change. State your 3-to-5-step plan first, wait for my go-ahead, then
> execute. The game must play identically afterward.

## Project structure

```
index.html        all markup, HUD, and styles
src/main.js       the entire game (M0 splits this into modules)
public/           future assets (models, textures, audio)
CLAUDE.md         design constitution, locked facts, roadmap
vite.config.js    build config (base ./ for GitHub Pages)
.github/          auto-deploy workflow
```

## Credits

Design direction: the 7-year-old lead designer.
Engine: three.js. Build: Vite. All sounds generated in code.
