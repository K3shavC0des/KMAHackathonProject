# Scouting map slice

Run from the repository root with
`.\.tools\node-v24.15.0-win-x64\node.exe frontend/map/serve.mjs`, then open
`http://localhost:8000/`.

This is an interface fixture, not an Indian pilot or live measurement. The sample
polygons load from the canonical `contracts/sample-areas.json`; the simple SVG is not a
geographic basemap. `map.js` keeps local SME2 change and 9 km regional SMAP
context distinct, with separate dates, units, quality, status, and source refs.
The same server delegates `/api/*` and `/map/api/*` to `backend/server.mjs`,
including collection selection, ranking and input errors. For example,
`/api/areas?dataset=observed` returns the four observed Nagapattinam analysis
tiles and `/api/rank?dataset=observed` ranks them. The default remains sample.
The nested routes support the same query parameters, POST and OPTIONS behavior.
API responses use `Cache-Control: no-store` so switching datasets cannot reuse
a cached response. Backend validation changes therefore apply to these map
routes too; full schema enforcement still depends on the backend implementation.

Run the same-origin API regressions with
`node --test tests/integration/map-api.test.mjs`. These check both route prefixes,
sample/observed separation, missing evidence, bad requests and static assets.
This server change enables observed API access; it does not add an observed-mode
selector to the current map UI.

Issue #2 owns the shared area contract. Do not infer SMAP field-scale values or
label sample data as observed.
