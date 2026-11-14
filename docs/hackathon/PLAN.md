# Farm Moisture Watch — approval draft

Approved on 2026-11-14. The six issues, matching board tasks, and four messages were published and read back. This document preserves the selection method and handoff requirements; it is not an implementation claim.

## Data-led pilot gate

Shortlist, in this order:

1. **Nagapattinam, Tamil Nadu:** NASA SME2 catalog: `NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001` and `NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001`. ISRO illustrates S-band GCOV `NISAR_S2_PR_GCOV_024_084_A_007_3700_DHNA_A_20260702T001555_20260702T001631_P00500_P_F_I_001` over Nagapattinam. This is catalog/publication evidence only.
2. **Ludhiana, Punjab:** NASA catalog shows 2025-11-21 and 2025-12-03 same-track SME2 candidates. Punjab Agricultural University provides a rice calendar. S-band product overlap unverified.
3. **Ahmedabad, Gujarat:** NASA catalog shows 2025-12-12 and 2025-12-24 same-track SME2 candidates; ISRO illustrates L/S-derived soil moisture over Ahmedabad. S-band product/date overlap unverified.

CMR query pattern: https://cmr.earthdata.nasa.gov/search/granules.json?short_name=NISAR_L3_SME2_PROVISIONAL_V1&point=79.84,10.77&page_size=30 . ISRO release: https://www.isro.gov.in/NISARS_Band_SAR_Data_Products_Release.html . ISRO moisture demonstration: https://www.isro.gov.in/NisarData_soil_moisture_products.html . PAU calendar: https://pau.edu/content/ccil/pf/pp_kharif.pdf .

Ingest a small agricultural AOI for each viable candidate, not just a point in a city. Open both SME2 HDF5 files; record granule ID, dates, footprint, grid, units, exact quality fields, valid agricultural pixels, matched-cell fraction, and observed change. Obtain same-area SMAP SPL3SMP_E v6 AM current and historical cells, QC flags, seasonal baseline sample count and spread. Check a credible local crop calendar and whether crop/planting data are available. For optional dual-band analysis, open the actual Bhoonidhi S product, verify same footprint/date and product calibration, and define a comparable variable or ground-reference test. GCOV backscatter cannot be subtracted from SME2 moisture. Choose the pilot with usable, explainable inputs and a demonstrable scouting-order change; publish a short evidence table. If no candidate passes, keep the UI labeled sample and report the blocker.

Sources/access: https://nisar-docs.asf.alaska.edu/sme2/ ; https://search.earthdata.nasa.gov/ ; https://nsidc.org/data/spl3smp_e/versions/6 ; https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf ; https://bhoonidhi.nrsc.gov.in/NISAR/ . Earthdata and Bhoonidhi accounts may be required for file downloads. Source quality and product maturity must be visible in the demo.

## Calculation and interface

For each area, align two SME2 observations on common valid grid cells. Local delta is later minus earlier in m³/m³; summarize by median and report dates, matched count, coverage, and quality. For the corresponding SMAP 9 km cell, compare a quality-valid current AM reading to the median of quality-valid 2016–2025 AM readings in a ±15-day seasonal window. Require at least five represented years or show baseline unavailable. Show the anomaly in m³/m³ and historical spread. Do not render SMAP as a field-scale measurement. A crop calendar supplies an estimated stage when crop and planting date are known; unknown stays unknown. Recent rainfall may be added if a sourced series is available; it is context, not a substitute for moisture QC.

Priority: rank sufficiently observed areas by local drying; use regional anomaly and crop-stage sensitivity as explained context/tie-breakers. Flag inadequate evidence. Compare the top area using regional+crop context alone with the top area after adding SME2, and report whether NISAR changes the first scouting stop. A scenario changes assumed crop/stage and the priority explanation, not satellite data. Example fixture values 0.26 to 0.18 SME2 and 0.21 versus 0.25 SMAP are **invented sample values**.

Proposed shared JSON fields: `schema_version`, `evidence_status` (`sample` or `observed`), `area_id`, `geometry_wgs84`, `nisar` (`product`, `granule_ids`, `dates_utc`, `moisture_m3m3`, `delta_m3m3`, `matched_pixel_count`, `valid_fraction`, `quality_flags`), `smap` (`product`, `version`, `grid_cell_id`, `date_utc`, `current_m3m3`, `baseline_m3m3`, `anomaly_m3m3`, `baseline_years`, `baseline_valid_year_count`, `spread_m3m3`, `quality`), `crop` (`type`, `planting_date`, `stage`, `stage_source`, `assumed`), `priority` (`rank`, `reasons`, `insufficient_evidence_reason`). Unknown numeric values are `null` with a reason. Freeze exact flag names after opening products.

## Issue and matching board task drafts

Each row becomes one GitHub issue plus one board task with the same title and an issue link. These are equal teammates; ownership coordinates active paths, not authority.

| Title / start | Owner and paths | Dependencies, acceptance and handoff |
| --- | --- | --- |
| Ingest candidate data and select Indian pilot / now | K3shavC0des; `data/`, `scripts/data/`, provenance notes | Open two SME2 granules and SMAP current/history for each viable AOI; record exact flags, coverage, dates, baseline, crop context, access and selection score. Check matching S data separately. Handoff manifest and evidence to Matthewzhang2008; aa1manali reviews. |
| Define shared area contract and labeled fixture / now | Matthewzhang2008; schema and fixture files | Agree CRS, units, dates, provenance, QC, nulls and sample/observed states with teammates. Validate fixture. Handoff schema to both; K3shavC0des and aa1manali review. |
| Build SMAP seasonal and crop context ingest / pilot AOI selection | K3shavC0des; `scripts/data/`, regional/crop module | Quality-valid same-cell AM baseline, ≥5 years, count/spread; sourced local crop calendar and unknown state. Handoff output and checks to Matthewzhang2008; aa1manali reviews. |
| Build fusion, ranking and value-check API / contract now, observed data later | Matthewzhang2008; backend | Compute matched SME2 delta, regional anomaly, explained rank and with/without-NISAR first stop; reject insufficient evidence. Integrate observed data after pilot gate. Handoff API/checks to aa1manali; K3shavC0des reviews. Matthewzhang2008 integrates. |
| Build scouting map and area timeline / contract now | aa1manali; frontend | Show ranked areas, source dates, units, 9 km context, sample badge, flags and missing states. Connect fixture then API. Handoff working screen to Matthewzhang2008; K3shavC0des reviews. |
| Build crop-stage scenario and demo / map and contract first | aa1manali; frontend/demo | Scenario changes priority assumption and explanation without changing readings; show one case and NISAR value check. Handoff demo steps and evidence to K3shavC0des; Matthewzhang2008 reviews. |

Use one `hackathon/<handle>/<task>` branch per parallel writer. Claim shared files before editing. A handoff includes issue/PR link, checks run, and who can act next.

## Board message drafts

**all:** Farm Moisture Watch kickoff. Read your board inbox when starting work, when a dependency changes, and before handoff. Post blockers and shared-format changes as they happen. Keep sample and observed data labeled. Each handoff needs an issue or PR link, checks run, and who can act next. We will select the Indian pilot only after ingesting and checking the source data.

**K3shavC0des:** First task: ingest candidate India data and select a pilot by usable SME2 overlap, SMAP history, crop context, quality, and access. Start with Nagapattinam; evaluate Ludhiana and Ahmedabad if needed. Check same-area S-band separately and hand the provenance manifest to Matthewzhang2008 for integration and aa1manali for review.

**Matthewzhang2008:** First task: own the shared area response contract and labeled sample fixture. Agree units, grid/CRS, dates, flags, missing values, and provenance with both teammates; then build the fusion API. You own contract integration.

**aa1manali:** First task: build the scouting map and area timeline against the reviewed sample fixture. Show local SME2 change separately from SMAP regional context, dates, flags, and sample status. Coordinate contract changes with Matthewzhang2008; add the crop-stage scenario after the map works.

Publication verification: GitHub and board were checked for duplicates before writing. Unique board `request_id` values were used and the same IDs were retained on retries. All six issues, owners, linked board tasks, and four message deliveries were read back. The checkpoint has the links and approved scope.
