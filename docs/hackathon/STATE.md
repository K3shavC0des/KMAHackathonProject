# Farm Moisture Watch - team checkpoint

Updated 2026-11-15. Integration owner: matthewzhang2008. Current follow-up branch: `hackathon/matthewzhang2008/dark-map`; baseline merged to team integration as PR #15 at `b701472`.

## Release checkpoint (2026-11-15)

Pitch-deck checkpoint: `Farm_Moisture_Watch_Pitch_Deck.pptx` is an editable seven-slide, English, 16:9 PowerPoint using four placements from three real project screenshots. It frames the original three-insight vision as SME2 change delivered, historical SMAP blocked by unavailable city-quality history, and auxiliary crop/weather risk as future work. Matching L/S evidence is also explicitly unavailable because of access, technical, and overlap constraints. NASA resources and a candid ChatGPT/Codex usage disclosure are included. Structural QA found seven slide XML parts, 98 editable text/shape elements, three embedded media files, no out-of-bounds objects, and a valid ZIP package. The file opened successfully in installed Microsoft PowerPoint. Native click-through visual automation was unavailable because the Windows Computer Use pipe could not start; team visual review and insertion of final public demo/repository links remain next.

The current follow-up adds the plain-language NISAR introduction, a ten-step contextual map tour, Easy/Advanced detail modes, explicit unavailable L/S radar evidence, and a prominent selected-square moisture-change card. The selected value is now the dominant map feedback: desktop places it in the upper-left map overlay and mobile places it first below the map. A headless Edge pass at 1440x900 and 390x844 selected two consecutive Nagapattinam squares and observed the card change from 1.3 to 3.9 percentage points lower; the selected outline, label, status, and animation changed with it. After unused-feature cleanup, the full Node suite passes 30/30, the radar exporter suite passes 4/4 in the existing project analysis environment, the 10-file static preview builds, map syntax passes, and `git diff --check` passes. Owner-private Sites deployment succeeded at `https://farm-moisture-watch-mz.twinklinglime16.chatgpt.site`; an authenticated deployed check repeated the 1.3-to-3.9 selection change and confirmed removed prototype paths resolve only to the app fallback with no removed content.

Official 2026 rules were checked on 2026-11-15: project submission closes at 23:59 local time on November 15; the solution must address an official challenge, include appropriate open-source license documentation, and cite every source. Team membership and the final Project Tab submission remain account-controlled actions.

Unused-feature cleanup removed the unlinked standalone radar page, its field-check form/module, styling/script, and the unrelated California S-band sample from the active routes and static bundle. The main map's explicit unavailable L/S status, schema, API, exporter, and validation tests remain because the inspector uses them. See `REMOVED_PROTOTYPES.md` for the retained mention.

## Goal and deadline

Latest checkpoint (2026-11-15): `hackathon/matthewzhang2008/dark-map` adds the
user-requested dark dashboard and separately validated observed Ludhiana (35
squares) and Ahmedabad (36 squares), alongside Nagapattinam (36 squares).
Actual new-city HDF5 pairs opened and passed QC; raw downloads remain ignored.
Node 28/28 and Python 31/31 passed for the published multi-city baseline. Browser verification for the follow-up is recorded above. Current evidence and next actor are recorded
in `MULTICITY_REVIEW.md` and `../../data/observed/CITIES.md`; earlier checkpoint
paragraphs below are historical. No SMAP history or crop evidence was invented.

NASA Space Apps Ottawa 2026, Dancing with the SARs. Help a farmer or adviser decide which area to scout for possible moisture change before watering. The user confirmed submission is due **2026-11-16 00:00 America/Toronto**. Judging criteria supplied by the user: Impact, Creativity, Validity, Relevance, Presentation. The NASA project page is especially important. No paid services authorized.

Current scope: a map-first irrigation **inspection** aid with pan, zoom and tappable areas. Priority comes from quality-valid local NISAR surface drying; a regional below-historical flag appears only after same-cell SMAP AM baseline validation. Crop-stage scenarios are deferred and contribute no default priority points. Satellite surface moisture is not root-zone moisture, plant stress, yield, or an irrigation prescription.

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
| `crop-demo` | aa1manali | deferred by revised scope | Legacy code remains, but the active map journey must not link to it or use crop-stage points. |
| `observed-adapter` | K3shavC0des | review | Exported four NISAR analysis tiles; backend serves them explicitly, frontend display remains separate work. |

The integration branch combines the published contract, API, map, Keshav data scripts/report, observed NISAR analysis tiles, and the SMAP checker. The map still loads only the synthetic `contracts/sample-areas.json`; Manali is building explicit observed/sample selection and a navigable map. The standalone backend serves `GET /api/areas?dataset=observed` and `GET /api/rank?dataset=observed` without mixing these records into the sample demo. Ranking returns `first_stop: null` without supported local drying. The legacy scenario code remains in the branch but must leave the active journey. This is an illustrative inspection heuristic, not calibrated advice.

## Pilot pair verification handoff (Keshav, 2026-11-14)

Keshav claimed `pilot-data` for verifier work on
`hackathon/K3shavC0des/pilot-verification`, based on integration `cc3abcb`.
`data/pilot/verify_pair.py` now checks full coordinate axes and matching
acquisition metadata/units/date order before comparing cells. Per-date summaries
also reject nonfinite moisture and quality fill values. Eleven temporary-HDF5
regression tests pass.
The accessible local HDF5 runtime reopened the real June 20/July 2 pair and
reproduced 920 matched recommended cells, median change -0.01749463379383087
m3/m3 for [79.74, 10.70, 79.80, 10.76]. Matthew integrated and reviewed the
two verifier commits on the shared integration branch; the full Node suite
passes 22/22.
See `data/pilot/VERIFICATION.md` for checks and reproduction.

Keshav's local HDF5 run and Matthew's independent 11/11 regression rerun resolve
the verifier runtime blocker here. The frontend owners continue the map work.
These checks do not supply nearby-date SMAP files or historical QC. Regional baseline,
agricultural polygon validation and full fused pilot acceptance remain pending.

## Last verification and next action

Node tests: 22/22 passed, covering moisture-only ranking, canonical JSON Schema validation with Ajv, conditional regional anomaly gate, observed-data separation, latest-valid map readings, legacy scenario isolation, and same-origin API routing from the map server. NISAR pair-verifier tests: 11/11; SMAP context tests: 6/6. NASA CMR nearby-date query returned 31 catalog granules. The real-file SMAP history check remains blocked by absent source files. Combined observed frontend review and final project page publication remain open. `SUBMISSION_DRAFT.md` requires the revised scope before publication.

Next: coordinate with Manali on the explicit observed dataset path and map navigation, review desktop/mobile behavior, and revise the NASA page for the map-first moisture inspection story. If accessible source files and an HDF5-capable runtime arrive, test nearby SMAP dates and at least five historical quality-valid years before computing an anomaly. Preserve local edits and never commit `.tools/`, `.local/`, credentials, or downloaded granules.

## Data reconciliation review (2026-11-14, Keshav)

Combined main's observed-export validation with current integration a6f7e3e,
including UTC normalization, canonical schema enforcement and moisture-only
ranking. PR #14 also incorporates PR #12's acquisition guards and quality-fill
correction, applies the fill exclusion to the exporter, and preserves both
verifier import names. On Keshav's runtime, 28 Python and 19 Node tests pass.
The local June 20 / July 2 HDF5 pair reproduces 920 matched recommended cells
and -0.01749463379383087 m3/m3 median change; the four-tile export exactly
matches the committed observed collection. This is NISAR development evidence;
same-cell SMAP history and browser verification remain open. Map-server routing
is handled separately in PR #13.
