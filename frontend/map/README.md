# Scouting map slice

Run from the repository root with
`.\.tools\node-v24.15.0-win-x64\node.exe frontend/map/serve.mjs`, then open
`http://localhost:8000/`.

This is an interface fixture, not an Indian pilot or live measurement. The sample
polygons load from the canonical `contracts/sample-areas.json`; the simple SVG is not a
geographic basemap. `map.js` keeps local SME2 change and 9 km regional SMAP
context distinct, with separate dates, units, quality, status, and source refs.
The same server exposes `/api/rank` from `backend/rank.mjs`, showing the first
scouting stop with and without NISAR and the selected area's explanation.

Issue #2 owns the shared area contract. Do not infer SMAP field-scale values or
label sample data as observed.
