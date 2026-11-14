# Farm Moisture Watch — team checkpoint

Updated 2026-11-14. Team handoff published and updated. Earthdata access works; pilot-data has opened NISAR and SMAP granules and continues AOI/date matching. Sample-data contract/fusion and map work are unblocked.

## Goal and scope

NASA Space Apps Ottawa 2026, Dancing with the SARs. Help a farmer or crop adviser decide where to **check root-zone moisture** before watering. Core demo: one crop, one Indian agricultural district, two usable NISAR SME2 observations, a scouting-priority map, an area timeline, and a crop-stage scenario. SMAP supplies a regional seasonal baseline at its own scale. Crop comparisons and L/S-band analysis are optional. Satellite surface moisture is not root-zone water, plant stress, yield, or an irrigation prescription.

Project descriptions: `C:/Users/kesha/Downloads/Farm_Moisture_Watch.pdf` and `C:/Users/kesha/Downloads/NISAR_Farm_Water_Stress_Monitor.pdf`. These are project briefs, not the official challenge rules. Challenge resources: https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources . Judging: Impact, Creativity, Validity, Relevance, Presentation.

Submission deadline: **unknown**; user supplied a placeholder, not a date/time. Timezone: America/Toronto. Official challenge attachment/rules not yet available in the session. No paid services authorized.

## Pilot selection status

**Candidate, not selected:** Nagapattinam agricultural area, Tamil Nadu. Opened SME2 granules on 2026-06-20 and 2026-07-02 (CMR IDs `G4249557322-ASF`, `G4255109928-ASF`), each about 60–72 MB. In a broad 0.3° × 0.3° window centered near Nagapattinam, 10,890 recommended cells match across dates; median later-minus-earlier surface moisture is −0.0282 m³/m³ (10th/90th percentiles −0.0625/0.0009). This is not field-level evidence. Opened July 2 SMAP SPL3SMP_E v6 (`SMAP_L3_SM_P_E_20260702_R19240_004.h5`). It has no recommended retrieval pixels in the same window; nearest recommended pixel is ~267 km away. Point CMR queries returned the same SMAP granule for Nagapattinam, Ludhiana, and Ahmedabad, so catalog selection alone does not demonstrate local usable coverage. Continue searching nearby SMAP dates and small agricultural AOIs before choosing a site. S-band raster remains unopened; July 2 GCOV backscatter is not directly comparable to SME2 moisture. See `PLAN.md` and [draft PR #7](https://github.com/K3shavC0des/KMAHackathonProject/pull/7).

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

Read-only CMR queries and both local scripts cover NISAR repeat-pair and SMAP seasonal catalog discovery. Three HDF5 files were downloaded to ignored `.tools/downloads/fmw`; both NISAR files and the July 2 SMAP file were opened with h5py. Pixel-level limits and current findings are in the pilot section and draft PR #7. Board task `pilot-data` was reopened; sample-data contract/fusion and map tasks can continue while AOI/date matching proceeds. No S-band product was opened. The memory semantic backend was offline. Graphify was unnecessary because there is no app code to map; bounded output made Headroom compression unnecessary. Do not commit `.tools/`, `.local/`, credentials, or downloaded granules.
