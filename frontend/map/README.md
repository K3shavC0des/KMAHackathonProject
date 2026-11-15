# Scouting map

From the project root, run
`.\.tools\node-v24.15.0-win-x64\node.exe frontend/map/serve.mjs`, then open
`http://127.0.0.1:8000/`.

The map defaults to four observed NISAR analysis tiles from Nagapattinam and
keeps the synthetic sample areas in a separate evidence view. The tiles are
not surveyed fields or verified crops. Tap a tile to inspect the local
surface-moisture change and its two acquisition readings; expand source notes
for granule IDs and quality details. Pan by dragging and zoom with the buttons
or wheel. The map is a coordinate sketch, not a geographic basemap.

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
The observed-mode selector uses these same-origin routes.

The **Crop + weather** map mode is available for every observed city. It groups
observed 200 m SME2 cells into approximately 1 km blocks, keeps blocks with at
least 10 matched cells, and colours each block by median moisture change:
green for under 2 points lower or higher, yellow for 2 to under 3.5 points
lower, and red for 3.5+ points lower. The right panel loads NASA POWER weather,
a NISAR summary, and locally sourced crop choices for the selected city. Crop presence and
growth stage remain unknown. NISAR uncertainty was checked for Nagapattinam;
other cities say when it has not been checked. These colours are inspection
cues, not confirmed crop stress. City reports can be regenerated with
`python experiments/crop-weather-risk/build_city_reports.py`.

The map requests collections through `/api/areas?dataset=observed` or
`dataset=sample`, served by the shared backend handler. It checks the contract
version and basic shape before rendering. The strongest valid local drying
signal is an **inspection candidate**, not watering advice. SMAP seasonal
history and a below-historical-standard flag remain unavailable until a
quality-valid same-cell comparison is established.

Run the focused checks with
`node --test backend/rank.test.mjs frontend/map/map-data.test.mjs frontend/map/observations.test.mjs tests/integration/map-api.test.mjs`.
