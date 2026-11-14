# Crop-stage scenario

From the project root, run
`.\.tools\node-v24.15.0-win-x64\node.exe frontend/scenario/serve.mjs`
and open `http://127.0.0.1:8002/`. This server also serves the integrated
scouting map at `/frontend/map/` for a local demo.

Stage selectors create a scenario copy of the reviewed area collection. Only
`crop_stage` changes; observation values, timestamps, quality, and source refs
remain the same. Both with- and without-NISAR rankings come from the shared
`backend/rank.mjs` heuristic. The page labels the inputs synthetic and warns
that priority points are not calibrated irrigation advice.

Run `node --test frontend/scenario/scenario.test.mjs` to verify stage changes
alter priority without mutating the fixture observations.
