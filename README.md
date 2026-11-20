[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/jinglue25/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/jinglue25/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Port Solana — an original open-world crime game for the browser

Play Marina Vale, a courier finding her feet in a sun-soaked coastal city. Walk the waterfront, borrow a ride, carry packages for fixer Dario Venn, and shake the police through pastel streets and palm-lined avenues. Complete five connected missions, then keep exploring in free roam.

The city, characters, vehicles, textures, and story are original and generated locally. Low-poly 3D uses vendored three.js; sound comes from a WebAudio synthesizer. The game needs a desktop browser with WebGL and makes no external requests. A local static server works without an internet connection.

## Run locally

Use Node.js 22.18 or later, with support for running the repository’s TypeScript entry scripts directly. From this directory:

```sh
node serve.ts
```

Open the loopback address printed by the server in your desktop browser. No install or build step is required to play. Audio starts after your first click or key press.

Choose **New game** to reset the saved day, **Continue** to restore it, or **Replay story** to start the five runs again. Progress is stored in this browser’s local storage, with periodic saves, mission-completion saves, and recovery saves. The pause menu also has **Save & return to menu**.

## Controls

| Input | Action |
| --- | --- |
| W / S | Walk forward/backward relative to the camera; accelerate/reverse in a car |
| A / D | Walk sideways; steer in a car |
| Shift | Sprint on foot |
| E | Enter a nearby parked or stopped car; exit your car |
| Left mouse click | Shoot forward while on foot |
| F, or hold F | Shoot forward; hold for repeated shots |
| Right mouse drag | Rotate the camera; the driving camera eases back behind the car |
| Left / right arrow | Rotate the camera |
| Space | Brake while driving |
| M | Toggle all sound |
| Escape | Pause / resume |

Use the crosshair and camera to face your shot. Gold minimap diamonds mark objectives; red and blue squares mark police. The HUD shows wanted stars, health, cash, objective distance, mission timers, and driving speed. Lose sight of police and stay hidden to shed stars. Calm periods restore health. Arrest leads to **City Lockup** and a fine; losing all health leads to **Second Sunrise**, a medical fee, and a fresh start at Coastal Medical.

## Dario’s five runs

Marina arrives with a courier bag and little cash. Dario Venn offers a first handoff at the marina, then asks for favors that draw more attention than he promised.

1. **First Run** — Take a car to the marina pier and collect Dario’s sealed package. Pays $200.
2. **Across the Bay** — Deliver the package to Luz’s beachfront café within 100 seconds. Pays $350.
3. **Borrowed Wheels** — Take the marked coral coupe downtown and bring it to Dario’s western garage. The theft draws police attention. Pays $500.
4. **Heat** — Break pursuit and clear every wanted star. Pays $400.
5. **Last Boat Out** — Starting at three stars, reach Dario’s getaway boat at the end of the pier within 120 seconds. Pays $1,000 and unlocks free roam.

Timed handoffs restart their timer when missed. A destroyed mission coupe is replaced at the downtown pickup so the story remains playable. Traffic, pedestrian behavior, pursuit, and damage use simple arcade rules.

## Source layout

`game/index.html` contains the page, import map, menus, and HUD. All runtime files are under `game/`; no remote assets are required.

| File under `game/src/` | Job |
| --- | --- |
| `main.js` | Boot, lighting, clouds, game states, input, cameras, recovery, and the frame loop |
| `city.js` | Procedural buildings, roads, palms, beach, marina, water, ground heights, and collision bounds |
| `vehicles.js` | Car meshes, traffic lanes, parked cars, and arcade driving |
| `player.js` | Marina’s figure, walking, sprinting, collisions, and car entry/exit |
| `pedestrians.js` | Nearby sidewalk walkers, recycling, panic, and knockdowns |
| `police.js` | Crimes, wanted stars, street-grid pursuit, visibility, arrests, and police damage |
| `combat.js` | Hitscan shooting, cover checks, muzzle flash, tracers, vehicle damage, and smoke |
| `missions.js` | Dario’s story chain, objectives, checkpoint effects, timers, rewards, and retries |
| `audio.js` | Gesture-started WebAudio engine, sirens, shots, UI cues, jingles, and ambient pad |
| `save.js` | Local save validation, player and mission snapshots, Continue data, and reset |
| `hud.js` | Minimap, police/objective blips, stars, health, cash, speed, prompts, and dialogue |
| `shots.js` | Seeded randomness, deterministic scene setup, and the screenshot-ready signal |
| `style.css` | Full-screen layout, title screen, HUD, menus, and recovery overlays |

`game/vendor/three/` holds the two local three.js builds. At the repository root, `serve.ts` serves the game, `main.ts` copies the entry and builds its dossier, `shots.json` lists the gallery views, and `capture.mjs` produces the gallery images.

## Screenshots and packaging

The capture script expects the existing toolkit at `~/workspace/makefun/tools/pw`, including its `playwright-core` package and Chrome Headless Shell. It uses an ephemeral loopback server, blocks external page requests, and needs no download. Run it in the screenshot session:

```sh
node capture.mjs
```

It captures the four `shots.json` scenes at 1280×720 after `window.__shotReady` is true. JPEG quality begins at 82 and drops in steps to 70 if necessary to stay within 256 KiB. A shot that still exceeds the cap fails explicitly. The output gallery is `1-chase.jpg`, `2-drive.jpg`, `3-mission.jpg`, and `4-city.jpg` under `screenshots/`.

The browser also supports `?shot=start&seed=1`. Screenshot scenes hold their actors and camera composition, keep the HUD visible for gameplay views, and never overwrite a saved game. Police lights continue flashing in the chase view.

After capture, package the game and gallery:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/port-solana-output node main.ts
```

The default output directory is `/output`. Packaging validates file counts, paths, image limits, and total game size, then writes `dossier.json` and prints the copied counts and dossier size. At least one real screenshot is required by the dossier builder; the competition gallery should contain all four captures. Rebuild the package whenever source or screenshots change.

## License

This repository is distributed under the MIT license in [LICENSE](LICENSE). The vendored three.js builds retain the Three.js Authors’ MIT license notice. `vendor/makefun-game.ts` is the supplied competition packaging library and remains unchanged.
