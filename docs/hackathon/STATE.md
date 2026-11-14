# Farm Moisture Watch — team checkpoint

Updated 2026-11-14. Approved team handoff published and read back. Pilot-data implementation has started on issue #1.

## Goal and scope

NASA Space Apps Ottawa 2026, Dancing with the SARs. Help a farmer or crop adviser decide where to **check root-zone moisture** before watering. Core demo: one crop, one Indian agricultural district, two usable NISAR SME2 observations, a scouting-priority map, an area timeline, and a crop-stage scenario. SMAP supplies a regional seasonal baseline at its own scale. Crop comparisons and L/S-band analysis are optional. Satellite surface moisture is not root-zone water, plant stress, yield, or an irrigation prescription.

Project descriptions: `C:/Users/kesha/Downloads/Farm_Moisture_Watch.pdf` and `C:/Users/kesha/Downloads/NISAR_Farm_Water_Stress_Monitor.pdf`. These are project briefs, not the official challenge rules. Challenge resources: https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources . Judging: Impact, Creativity, Validity, Relevance, Presentation.

Submission deadline: **unknown**; user supplied a placeholder, not a date/time. Timezone: America/Toronto. Official challenge attachment/rules not yet available in the session. No paid services authorized.

## Pilot selection status

**Candidate, not selected:** Nagapattinam agricultural area, Tamil Nadu. A reproducible `data/pilot/catalog.py` CMR preflight found same-track/frame SME2 candidates for 2026-06-20 and 2026-07-02. CMR IDs are `G4249557322-ASF` and `G4255109928-ASF`; advertised sizes are about 60 and 72 MB. A separate `data/pilot/smap_catalog.py` preflight found July 2 SPL3SMP_E v6 granule `SMAP_L3_SM_P_E_20260702_R19240_004.h5` (`G4321334815-NSIDC_CPRD`) and catalog granules in every proposed 2016–2025 seasonal window; 2019 has only three catalog dates in that window. ISRO illustrates a Nagapattinam S-band GCOV acquisition on July 2, but says routine S-band downloads begin July 8 and earlier data are reprocessed in phases. This is catalog/publication evidence, not valid-pixel evidence. The NISAR HDF5 download returned HTTP 401 without Earthdata authentication; no HDF5 pixels were opened. The S-band GCOV backscatter is not directly comparable to SME2 volumetric moisture. See `PLAN.md` for IDs and decision gate.

Alternates: Ludhiana/Punjab and Ahmedabad/Gujarat have repeat SME2 catalog candidates; ISRO has demonstrated L/S-derived moisture over North India and Ahmedabad. No candidate has passed pixel/quality, SMAP, crop-calendar, and access checks. Do not describe any as a verified pilot.

## Data format and pipeline

Contract owner: Matthewzhang2008; integration owner: Matthewzhang2008. Proposed version 1 response is in `PLAN.md`, pending teammate review. Store source product and granule IDs, timestamps, CRS, units, quality, coverage, baseline sample count, and `sample` versus `observed` evidence status. Missing data is explicit. NISAR local change = later minus earlier valid matched-cell surface moisture (m³/m³). SMAP SPL3SMP_E v6 AM current minus historical same-cell seasonal median (proposed 2016–2025, ±15 day window, at least five represented years) stays at 9 km scale. Crop stage is estimated or assumed, never satellite inferred.

## Team and next actions

Three equal teammates: K3shavC0des, Matthewzhang2008, aa1manali. At publication, GitHub and board had no prior tasks or issues. Six issues were created, assigned, and fetched back; six matching board tasks with issue links and the kickoff plus three direct messages were posted and read back in the intended inboxes. Existing modified README and untracked PROJECT_CONTEXT.md were preserved.

| Board task | Owner | GitHub issue | Start |
| --- | --- | --- | --- |
| `pilot-data` | K3shavC0des | https://github.com/K3shavC0des/KMAHackathonProject/issues/1 | Now: ingest candidate data and select the pilot by evidence |
| `area-contract` | Matthewzhang2008 | https://github.com/K3shavC0des/KMAHackathonProject/issues/2 | Now: freeze the shared format and labeled fixture |
| `smap-crop` | K3shavC0des | https://github.com/K3shavC0des/KMAHackathonProject/issues/3 | After AOI selection |
| `fusion-api` | Matthewzhang2008 | https://github.com/K3shavC0des/KMAHackathonProject/issues/4 | Sample data after contract; observed data after pilot gate |
| `scouting-map` | aa1manali | https://github.com/K3shavC0des/KMAHackathonProject/issues/5 | Sample data after contract |
| `crop-demo` | aa1manali | https://github.com/K3shavC0des/KMAHackathonProject/issues/6 | After map and contract |

Board: `hackathon-board` branch in the shared repository, accessed with `.agents/skills/hackathon-autopilot/scripts/board.mjs`. The three immediate human actions are to read inboxes, claim `pilot-data`, `area-contract`, and `scouting-map` in their own sessions, and coordinate the contract before shared edits. Matthewzhang2008 integrates the shared response. Each handoff supplies issue/PR link, checks run, and next actor.

## Verification and limitations

Read-only CMR catalog queries ran for Ludhiana, Ahmedabad, and Nagapattinam; two scripts reproduce NISAR repeat-pair and SMAP temporal-coverage discovery. CMR metadata is not raster verification. A direct NISAR file download returned HTTP 401; Earthdata sign-in or an authorized download path is needed to inspect pixels. SMAP and ISRO files have not been ingested. Draft PR: https://github.com/K3shavC0des/KMAHackathonProject/pull/7 . The memory semantic backend was offline. Graphify was unnecessary because there was no app code to map; bounded output made Headroom compression unnecessary. Do not commit `.tools/`, `.local/`, credentials, or downloaded granules.
