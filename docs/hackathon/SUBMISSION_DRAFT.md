# Farm Moisture Watch - NASA project page draft

Status: **needs rewrite for the revised map-first scope before publication**. Crop-stage comparisons and the former A-versus-B first-stop claim below are historical draft text. Replace them with the reviewed moisture-only ranking, explicit insufficient-evidence state, and verified regional-anomaly status. Add the final demo screenshot/video after browser rehearsal. Nagapattinam is a development geography, not a validated agricultural field.

## One-line summary

Farm Moisture Watch helps a farmer or crop adviser decide where to scout first by comparing local NISAR surface-moisture change with regional SMAP context and clearly explaining what changes when NISAR is included.

## The problem and intended impact

Water decisions are often made with incomplete information. A field visit is useful, but time is limited and satellite products have different resolutions and quality limits. We propose a transparent scouting queue, not an automatic watering instruction. A reliable queue could help crop advisers focus scarce visits on areas with stronger evidence of drying. We have not measured farmer outcomes or water savings; that impact remains a hypothesis to test with ground observations.

## What the demo does

Open the sample map, select either illustrative area, and inspect the local NISAR change, its date/unit/quality/source, and the separate 9 km regional SMAP context. The ranked API compares the first scouting stop with and without local NISAR evidence. In the synthetic fixture, the first stop changes from field B (crop-stage scenario only) to field A when the sample local drying signal is included. The UI labels all fixture values as sample and says no Indian pilot has been selected. The map is a simplified SVG, not a geographic basemap.

Run locally with `node frontend/map/serve.mjs`, then open `http://127.0.0.1:8000/`. The integration branch is `hackathon/matthewzhang2008/integration`. [Add final deployed URL or video here after verification.]

## Technical approach and scientific boundaries

- `contracts/area.schema.json` defines common area geometry, crop stage and observation records with source, timestamp, unit, quality, sample/observed status and source reference. The demo fixture is synthetic.
- The backend uses an explicitly illustrative priority heuristic. It adds a local NISAR drying signal to crop-stage scenario points; SMAP seasonal baseline is displayed as regional context and is never treated as field-scale moisture. Suspect or missing local readings do not raise priority.
- Keshav verified two opened NISAR SME2 granules for a broad Nagapattinam candidate window. The median later-minus-earlier change was -0.0282 m3/m3 across 10,890 matched recommended cells. That window spans many fields. The opened July 2 SMAP file had no recommended AM retrieval in the same window; a same-area seasonal baseline and a pilot selection are still unavailable. Source IDs, links and method are in `data/pilot/VERIFICATION.md`.
- NISAR SME2 provisional data are not fully calibrated; its soil-moisture observations concern the surface, not root-zone water. SMAP is regional. Crop stage requires a sourced calendar or must remain an assumption/unknown. No field trial, yield prediction, or irrigation prescription is claimed.

## Why it fits the challenge and rubric

The project uses SAR-derived NISAR moisture change for a concrete scouting decision, while showing its incremental effect instead of merely displaying a raster. Impact is the potential to direct field visits more efficiently. Creativity is the with/without-NISAR value check and explanation. Validity comes from scale separation, quality gates, source provenance, and honest missing-data states. Relevance and presentation come from one clear first-stop journey. The exact official challenge requirements should be checked against the final project page before submission; the challenge page was inaccessible from this session.

## Demo sequence and fallback

1. Show the sample badge and explain that these are illustrative areas, not the selected Indian pilot.
2. Select field A; show local SME2 drying, timestamp, unit, quality and source label. Point to SMAP as 9 km regional context.
3. Show first stop with NISAR (A) versus without NISAR (B). Explain that the fallback is a crop-stage scenario, not an observed field-moisture estimate.
4. Select field B and show its timeline; explain the quality/provenance fields and missing-data behavior.
5. Open the crop-stage scenario from the map. Change one field's hypothetical stage, show the priority change, then reset it. The moisture observations and provenance stay fixed.
6. If the network or browser fails, run the local server and show `GET /api/rank` plus `contracts/sample-areas.json`. Keep screenshots/video of the verified final UI as a fallback.

## Team and sources

Team: K3shavC0des (candidate data verification), matthewzhang2008 (contract, ranking API and integration), aa1manali (map and scenario). Review credits before submission. Sources: [NASA NISAR SME2 guide](https://nisar-docs.asf.alaska.edu/sme2/), [NISAR provisional limitations](https://nisar-docs.asf.alaska.edu/product-limitations/), [NSIDC SMAP SPL3SMP_E v6 guide](https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf), and exact granule links in `data/pilot/VERIFICATION.md`.

## Remaining before submission

Visually inspect the integrated map and crop-stage scenario at desktop/mobile, rehearse the scenario journey, capture a demo artifact, and fill the final NASA project URL/video. If no quality-valid SMAP match and agricultural AOI are available, submit the clearly labeled sample demonstration and describe the pilot-data gap as future work. Never silently promote the broad-window candidate to a field-level pilot.
