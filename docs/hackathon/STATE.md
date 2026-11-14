# Farm Moisture Watch - team checkpoint

Updated 2026-11-14. Integration owner: matthewzhang2008. Current integration branch: `hackathon/matthewzhang2008/integration`.

## Goal and deadline

NASA Space Apps Ottawa 2026, Dancing with the SARs. Help a farmer or adviser decide which area to scout for possible moisture change before watering. The user confirmed submission is due **2026-11-16 00:00 America/Toronto**. Judging criteria supplied by the user: Impact, Creativity, Validity, Relevance, Presentation. The NASA project page is especially important. No paid services authorized.

Core demo: labeled sample areas, local NISAR SME2 change separate from regional SMAP context, explained scouting rank with and without NISAR, area timeline, and a crop-stage scenario. Satellite surface moisture is not root-zone moisture, plant stress, yield, or an irrigation prescription. The selected Indian pilot and observed-data demonstration remain gated on quality checks.

## Current evidence

Nagapattinam is a **candidate, not a selected pilot**. Keshav opened June 20 and July 2 NISAR SME2 and July 2 SMAP HDF5 files. A broad 0.3-degree Nagapattinam window yielded 10,890 matched recommended NISAR cells and median later-minus-earlier change -0.0282 m3/m3. This spans many fields. July 2 SMAP had no recommended AM retrieval in the same window; nearest recommended cell was about 267 km away. Exact granules, source links, method and limits: `data/pilot/VERIFICATION.md`. The raw files are ignored local downloads on Keshav's machine, absent in this checkout. No S-band raster has been opened.

This checkout reproduced the public Nagapattinam CMR catalog query: four hits, two repeat pairs, `catalog_only`. `data/context/smap_baseline.py` is a local-file AM quality and historical baseline gate; Python syntax passes, but h5py's native DLL is blocked by this machine's application-control policy, so its HDF5 tests and real-file run have **not** passed. No SMAP anomaly or crop stage has been established here. Do not label the synthetic fixture as observed.

## Tasks and integration

| Board task | Owner | State | Next check |
| --- | --- | --- | --- |
| `pilot-data` | matthewzhang2008 | blocked | Obtain accessible files and runnable HDF5 environment; check small agricultural AOI and matching SMAP dates before selecting pilot. |
| `smap-crop` | matthewzhang2008 | blocked | Quality-valid same-cell AM baseline with at least five years, then source crop stage or leave unknown. |
| `area-contract` | matthewzhang2008 | done | Merged as PR #8; fixture/schema and API tests pass. |
| `fusion-api` | matthewzhang2008 | done | Merged as PR #9; Node tests 3/3 pass on sample inputs. |
| `scouting-map` | aa1manali | review | Browser visual check and integration. |
| `crop-demo` | aa1manali | queued | Add crop-stage scenario without changing satellite observations. |

The integration branch combines the published contract, API, map, Keshav data scripts/report, and the SMAP checker. It loads the canonical `contracts/sample-areas.json` and serves `/api/rank` from the map server. On synthetic inputs, the first stop changes from illustrative field B without NISAR to field A with NISAR. This is a demo heuristic, not calibrated advice.

## Last verification and next action

Node tests: 4/4 passed, including the regression that excludes suspect/missing headline readings. Map server returned HTTP 200 for page, script, quality-filter module, canonical fixture and `/api/rank`; response reported the expected first-stop change. Python source compiled; public CMR preflight returned four hits and two repeat pairs. HDF5 tests blocked by application control. Browser visual check could not run because this session's browser access host was unavailable. Crop scenario, final project page publication and real-data pilot remain to do. `SUBMISSION_DRAFT.md` is ready for review.

Next: ask aa1manali to add the scenario against the integration branch, review the combined UI at desktop/mobile, rehearse the sample demo, and finalize the NASA project page from `SUBMISSION_DRAFT.md`. If accessible source files and an HDF5-capable runtime arrive, resume the pilot gate. Preserve local edits and never commit `.tools/`, `.local/`, credentials, or downloaded granules.
