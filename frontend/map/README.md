# Scouting map slice

Run from the repository root with
`.\.tools\node-v24.15.0-win-x64\node.exe frontend/map/serve.mjs`, then open
`http://localhost:8000/`.

This is an interface fixture, not an Indian pilot or live measurement. The sample
polygons come from issue #2 contract commit `7a4d0ac`; the simple SVG is not a
geographic basemap. `map.js` keeps local SME2 change and 9 km regional SMAP
context distinct, with separate dates, units, quality, status, and source refs.

Issue #2 owns the shared area contract. This slice copies its sample fixture
while that branch is in review. Once integrated, remove this copy and load the
canonical `contracts/sample-areas.json`. Do not infer SMAP field-scale values
or label sample data as observed.
