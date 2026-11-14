# Farm Moisture Watch - team checkpoint

Updated 2026-11-14. Integration owner: matthewzhang2008. Current integration branch: `hackathon/matthewzhang2008/integration`.

## Goal and deadline

NASA Space Apps Ottawa 2026, Dancing with the SARs. Help a farmer or adviser decide which area to scout for possible moisture change before watering. The user confirmed submission is due **2026-11-16 00:00 America/Toronto**. Judging criteria supplied by the user: Impact, Creativity, Validity, Relevance, Presentation. The NASA project page is especially important. No paid services authorized.

Current scope: a navigable map centered on the observed Nagapattinam analysis tiles, simple inspection-priority explanations and area details, with regional historical context kept at its real scale. Crop-stage scenarios are deferred from the active journey. Satellite surface moisture is not root-zone moisture, plant stress, yield, or an irrigation prescription. Observed-data display remains gated on quality checks.

## Current evidence

Nagapattinam is the **development pilot geography**, not a validated field or fused NISAR+SMAP pilot. Keshav opened June 20 and July 2 NISAR SME2 and exported four rectangular analysis tiles from WGS84 [79.74, 10.70, 79.80, 10.76]: 920 matched recommended cells, median change -0.0174946 m3/m3. The tiles are not surveyed agricultural polygons or a crop mask. July 2 SMAP has no suitable local AM retrieval; a seasonal anomaly and sourced crop stage remain unavailable. Exact granules and limits: `data/pilot/PILOT_DECISION.md`, `data/pilot/VERIFICATION.md`, and `data/observed/README.md`. Raw files remain outside Git on Keshav's machine. No S-band raster has been opened.

This checkout reproduced the public NISAR CMR preflight and found 31 nearby-date SMAP CMR catalog granules within ±15 days of July 2; catalog hits are **not** quality-valid pixels. `data/context/smap_baseline.py` is a local-file AM quality and historical baseline gate. Its leap-day/New Year calendar checks pass, but h5py's native DLL is blocked by this machine's application-control policy and the HDF5 files are absent here, so real-file baseline validation has **not** passed. Keep the synthetic fixture separate from the observed NISAR analysis tiles.

## Tasks and integration

| Board task | Owner | State | Next check |
| --- | --- | --- | --- |
| `pilot-data` | matthewzhang2008 | blocked for fused validation | Development geography selected; refine agricultural polygons and open quality-valid nearby SMAP dates before claiming a fused pilot. |
| `smap-crop` | matthewzhang2008 | blocked | Quality-valid same-cell AM baseline with at least five years, then source crop stage or leave unknown. |
| `area-contract` | matthewzhang2008 | done | Merged as PR #8; fixture/schema and API tests pass. |
| `fusion-api` | matthewzhang2008 | done | Merged as PR #9; Node tests 3/3 pass on sample inputs. |
| `scouting-map` | aa1manali | review | Integrated locally; desktop/mobile visual check remains. |
| `crop-demo` | aa1manali | review | Integrated locally; browser scenario journey and visual check remain. |
| `observed-adapter` | K3shavC0des | review | Exported four NISAR analysis tiles; backend serves them explicitly, frontend display remains separate work. |

The integration branch combines the published contract, API, map, crop-stage scenario, Keshav data scripts/report, observed NISAR analysis tiles, and the SMAP checker. The map still loads only the synthetic `contracts/sample-areas.json`; its scenario changes only hypothetical crop stage. The standalone backend explicitly serves `GET /api/areas?dataset=observed` and `GET /api/rank?dataset=observed` without mixing these records into the sample demo. Ranking now returns `first_stop: null` when evidence is inadequate. This is a demo heuristic, not calibrated advice.

## Last verification and next action

Node tests: 11/11 passed, covering missing evidence, observed-data separation, strict UTC timestamps, latest-valid map readings, and scenario observation immutability. Three pure-Python seasonal-window checks passed; Python source compiled. NASA CMR nearby-date query returned 31 catalog granules. HDF5 tests and real-file SMAP check remain blocked by application control and absent source files. The map/scenario browser visual check and final project page publication remain open; `SUBMISSION_DRAFT.md` is ready for review.

Next: coordinate with Manali on the explicit observed dataset path, review the combined UI at desktop/mobile, rehearse the sample scenario journey, and finalize the NASA project page from `SUBMISSION_DRAFT.md`. If accessible source files and an HDF5-capable runtime arrive, test nearby SMAP dates and at least five historical quality-valid years before computing an anomaly. Preserve local edits and never commit `.tools/`, `.local/`, credentials, or downloaded granules.

## Data reconciliation review (2026-11-14, Keshav)

Combined current main's observed-export schema validation with integration's
UTC normalization, nearby-date catalog helper and backend ranking fixes.
Included PR #12's acquisition guards and quality-fill regression; applied the
same fill exclusion to the exporter. Preserved both verifier import names.
On Keshav's HDF5-capable runtime, 28 Python tests and 15 Node tests pass.
The actual downloaded pair reproduces the 920-cell statistic and the complete
committed four-tile observed collection. This is NISAR development evidence;
same-cell SMAP history, crop validation and browser verification remain open.
Map-server routing is being handled separately on the integration-QA branch.
