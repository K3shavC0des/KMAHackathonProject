# Multi-city map review — 2026-11-15

Branch: `hackathon/matthewzhang2008/dark-map`.

The map now offers separate observed Nagapattinam, Ludhiana and Ahmedabad
collections, plus the explicitly synthetic example. Switching cities updates
the available squares, acquisition dates, inspection priority, map bounds and
accessible map name. City loading failures leave a disabled unavailable option.
The default remains Nagapattinam. See `data/observed/CITIES.md` for real-file
validation, sources, missing coverage and reproducible exports.

The user's Downloads screenshots guided the dark full-canvas layout, compact
floating view controls, right-hand legend/inspector, and lower-left scouting
brief. Dark/Street changes the existing OSM raster's appearance; it does not
claim satellite imagery or add a paid tile service. Evidence colours remain
separate from the basemap styling. On narrow screens the panels follow the map.

API ranking now breaks capped or rounded score ties using the exact local
drying value, then area ID, matching the map's first-stop selection. Scores are
still illustrative and crop/SMAP context contributes no priority points.

Verification:

- Actual Ludhiana and Ahmedabad HDF5 pairs passed the verifier; derived exports
  passed the canonical schema including date-time and finite-value checks.
- Node: 28/28, including both API route prefixes, city provenance isolation,
  missing regional context, and capped/rounded/exact tie ordering.
- Python: 31/31 (14 observed, 11 pilot, 6 context). Initial sandbox run could not
  create temporary HDF5 fixtures; rerun with authorized filesystem access passed.
- JavaScript syntax and Git diff checks passed.
- Browser visual/interaction verification remains pending: Computer Use stopped
  the preceding two turns because it could not establish the browser URL for
  its policy check. No browser pass is claimed for this layout or city switching.

Next actor: Matthew or a teammate with a working browser session. Start the map
server, check each observed city and synthetic mode, inspect dates/provenance,
toggle all layers off and back on, select a square, use Fit/Region/Tilt and
Dark/Street, then inspect desktop and narrow layouts. Confirm failed city
requests leave an unavailable option. No deployment, merge or submission is
authorized by this handoff.
