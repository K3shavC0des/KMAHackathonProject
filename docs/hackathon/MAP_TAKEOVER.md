# Map work takeover

## Integration review (Matthew, 2026-11-15)

Combined map commit `9c140f7` with integration `299a80a` on
`hackathon/matthewzhang2008/map-release`. The exporter retains finite monotonic
axes, string/bytes units and quality-fill exclusion. Its temporary HDF5 tests
now exercise all 36 squares. Empty filters clear stale inspector values and
the first-check suggestion follows the visible squares. Colour bands are
explicitly heuristic inspection guides. Navigation controls moved below the
title overlay.

Verification: 26 Node tests; 11 pilot, 6 context and 12 observed Python tests
pass. These include live HTTP routing and schema checks. Source HDF5 files
were not reopened here; the regional source reproduction is Keshav's evidence.
Desktop/mobile rendering, filter clicks, dataset switching and camera controls
still need a final browser pass: browser-host discovery failed, and native
Brave control was stopped by Escape and remained stopped after user resumption.
The following original handoff describes the incoming branch.

## Current state

Branch: `hackathon/K3shavC0des/google-maps-layout`

Latest pushed commit: `2aa993b` (`feat: add map priority filters`).

The map uses real OpenStreetMap basemap tiles and shows 36 observed Nagapattinam NISAR analysis squares. The right sidebar filters squares by colour: red (review sooner), orange (watch), yellow (slightly lower moisture), green (steady or higher), and grey (no usable measurement). Colours use the quality-valid local NISAR soil-moisture change. The unavailable SMAP panel was removed. Example and observed data modes remain distinct.

## Verification

- Node tests: 7/7 focused map-data and observation tests pass.
- `node --check frontend/map/map.js`: pass.
- `http://127.0.0.1:8004/`: HTTP 200.
- `/observed-areas.json`: 36 squares.
- `git diff --check`: pass.

## Remaining work

1. Visually check desktop and mobile layouts in a browser.
2. Confirm filter toggles, square selection, and details panel work together.
3. Fix any visual/interaction issues, rerun the checks above, commit and push.
4. Matthew: review and integrate this branch; update the board when complete.

The previous browser automation host was unavailable, so the final visual check remains open.

## Takeover steps

From a clone of the repository:

```powershell
git fetch origin
git switch --track origin/hackathon/K3shavC0des/google-maps-layout
npm ci
node frontend/map/serve.mjs
```

Open `http://127.0.0.1:8000/`. To use another port, set `$env:PORT='8004'` before starting the server. Focused tests:

```powershell
node --check frontend/map/map.js
node --test frontend/map/map-data.test.mjs frontend/map/observations.test.mjs
```

## Data and limits

The observed export uses the local raw NISAR SME2 pair from June 20 and July 2, 2026. Locally, those source files were `.tools/downloads/fmw/nisar_20260620.h5` and `nisar_20260702.h5`; raw files are intentionally excluded from Git. Pair/granule provenance and limitations are in `data/pilot/VERIFICATION.md`. Recreate the observed JSON after obtaining those files locally:

```powershell
python data/observed/export_nagapattinam.py earlier.h5 later.h5 --output data/observed/nagapattinam-areas.json
```

No SMAP history or crop evidence is available. The map does not claim either.
