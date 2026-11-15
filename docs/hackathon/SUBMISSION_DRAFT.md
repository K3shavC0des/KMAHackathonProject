# Farm Moisture Watch — NASA Space Apps project page draft

**Submission-ready draft.** Add the final deployed demo link and any optional video before publishing. Automated checks and the core desktop/mobile browser journey have passed. Confirm that every registered team member appears on the NASA team page before the final account-controlled submission.

## Project summary

Farm Moisture Watch is an interactive map that helps a farmer or crop adviser decide which area to **inspect first** for possible surface drying. It compares two quality-screened NISAR soil-moisture observations within each analysis square, shows when and where they were acquired, and orders squares with stronger local drying first. Three Indian city views use measurements derived from opened NISAR files. A separate synthetic example makes the data distinction explicit. The map does not prescribe irrigation.

## The problem

A satellite image can show a change without telling someone whether it is recent, reliable, or relevant to a field visit. Water decisions also depend on conditions that a surface satellite retrieval cannot establish on its own, such as root-zone moisture, crop type, and recent management. Farm Moisture Watch turns a pair of surface observations into a traceable **scouting queue**: it suggests where a person might look more closely and shows the evidence behind that suggestion.

## What we built

The map opens on Nagapattinam, Tamil Nadu, and can switch to Ludhiana, Punjab, Ahmedabad, Gujarat, or a clearly labeled synthetic example. Each observed city has its own two-date NISAR collection and its own inspection order. Users can pan and zoom, fit the analysis squares, select a square, filter by moisture-change colour, and inspect the acquisition timeline and source details. The selected square's change is the dominant feedback: a large card updates its value, direction, colour, label, and acquisition date with each click. Dark and Street change the OpenStreetMap basemap appearance; the coloured squares carry the NISAR evidence.

The scouting brief highlights the strongest supported local drying among the **visible** squares. If no visible square has usable local drying evidence, it says there is insufficient local evidence. The colour bands and inspection points are illustrative guides, not calibrated crop-water thresholds.

| Observed city | NISAR acquisition dates (UTC) | Analysis squares with matched usable cells |
| --- | --- | ---: |
| Nagapattinam | June 20 and July 2, 2026 | 36 |
| Ludhiana | November 21 and December 3, 2025 | 35 |
| Ahmedabad | December 12 and 24, 2025 | 36 |

These are rectangular **analysis squares**, not surveyed farm boundaries or verified crop areas. One Ludhiana square lacked matched recommended cells and was omitted rather than filled with an estimate. Exact granule IDs, bounds, counts, and reproduction steps are in [the observed-data notes](../../data/observed/CITIES.md) and [the Nagapattinam export notes](../../data/observed/README.md).

## How the evidence becomes an inspection order

For each square, the exporter aligns the two NISAR SME2 acquisitions on matching grid cells. It excludes fill values and cells that fail the product's recommended retrieval-quality rule on either date. It then reports the median of **later minus earlier** soil-moisture differences across the matched cells, in m³/m³. Negative change indicates a lower retrieved surface-moisture value on the later date. Each displayed reading retains its acquisition time, source granule, quality rule, and matched-cell count.

The ranking gives an illustrative inspection score only to quality-valid local drying. It does not add crop-stage or SMAP points. An API comparison also removes NISAR evidence as a value check: with the current observed collections, that leaves **no evidence-supported first stop**. We therefore do not claim that NISAR changed one supported first stop into another. We can show that the available local signal is what makes this particular scouting suggestion possible.

Regional SMAP historical context is unavailable for these city views. A nearby catalog granule does not establish a quality-valid same-cell observation or a seasonal baseline. The app leaves that context unavailable instead of inventing an anomaly. Crop stage is also unknown without verified crop and planting information. The older crop-stage scenario is outside the active map demonstration.

## Why NISAR matters here

NISAR supplies repeated local surface-moisture retrievals that can be compared over the same cells. We use those changes to focus attention on a concrete next action: **inspect an area**. The project pairs that action with dates, quality screening, provenance, and an explicit insufficient-evidence state. This is a prototype for directing limited scouting time; we have not measured water savings, yield gains, or farmer outcomes.

## Scientific limits

### Experimental L/S evidence

The main map explains the roles of L- and S-band and reports matching radar
evidence unavailable. Actual matching GCOV rasters have not yet been supplied.
No dual-band observed result, agricultural polygon validation, accuracy
improvement or water saving is claimed.
The exporter accepts reviewed calibrated HH linear-power rasters, masks them
on a common grid and reports within-band changes in dB. Independent field
validation remains open. The unavailable-evidence UI and the main map's
desktop/mobile journey have been rehearsed in a real browser. A standalone
radar/field-check experiment was intentionally removed because it was not part
of the demonstrated map journey.

NISAR SME2 is a provisional surface-moisture product. A lower retrieved value is not proof of root-zone water stress or a need to irrigate. The analysis squares may include non-agricultural land and have not been matched to surveyed fields or crop masks. Irrigation, flooding, rainfall, land cover, and retrieval uncertainty can affect the signal. The views show historical acquisitions, not live conditions. SMAP's regional scale cannot be treated as field-scale evidence, and no quality-valid seasonal SMAP anomaly has been established for these views. A farmer or adviser would need local observations before acting on a water decision.

## Demo walk-through

1. Open with the short NISAR explanation, then choose **Show me on the map**. Follow the in-map tour to the city selector, squares, reading details, colour filters, and scouting brief. Point out that the shapes are analysis squares, not farm boundaries.
2. Select a coloured square. Show its later-minus-earlier surface-moisture change, two-date timeline, source granules, quality notes, and matched-cell count.
3. Use the colour filters to narrow the visible squares. Show how the scouting brief follows the visible evidence and how it handles an empty filter result.
4. Switch to Ludhiana and Ahmedabad. Show their different dates and separate inspection orders; explain that the missing Ludhiana square was omitted.
5. Switch to the synthetic example and show its explicit label. Explain that regional SMAP history and crop evidence remain unavailable in the observed views.

Run the local map with `node frontend/map/serve.mjs` and open `http://127.0.0.1:8000/`. A static browser preview can be built with `node scripts/build-site-preview.mjs`. **Verified owner-private demo URL:** https://farm-moisture-watch-mz.twinklinglime16.chatgpt.site. The final NASA project should use a judge-accessible public URL or explicitly provide access. **Video:** optional; the verified desktop and mobile screenshots are retained outside the repository build artifacts.

## Build and validation

The interface uses MapLibre GL JS with OpenStreetMap raster tiles. A shared JSON Schema validates derived area collections, and the Node API ranks observed cities separately from the synthetic example. The Python pair verifier checks acquisition metadata, coordinate alignment, dates, units, and valid-cell masks before export. The published multi-city baseline passed **28 Node tests and 31 Python tests**. After removing the orphaned prototype, the current combined tree passed **30/30 Node tests** and **4/4 radar-exporter Python tests**, plus syntax and static build checks. Headless Edge at 1440x900 and 390x844 verified the introduction, tour, and selected-square feedback; consecutive selections changed the headline from 1.3 to 3.9 percentage points lower. [Review details](MULTICITY_REVIEW.md).

## Team and references

**Repository contributors:** `K3shavC0des` / Keshav (NISAR verification, export safeguards, integration review), `matthewzhang2008` / Matthew (shared contract, API, multi-city integration, tutorial and release), and `aa1manali` (early scouting-map and interaction work). Confirm the registered team roster and each person's preferred public name on the NASA team page before submission.

- [NASA NISAR SME2 product guide](https://nisar-docs.asf.alaska.edu/sme2/)
- [NISAR provisional product limitations](https://nisar-docs.asf.alaska.edu/product-limitations/)
- [NSIDC SMAP SPL3SMP_E v6 user guide](https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf)
- [Exact observed-city granules and reproduction notes](../../data/observed/CITIES.md)

Before submission, redeploy and open the final artifact, include the repository's open-source license, cite every external data/software source in the Project Tab, and confirm the registered team roster. The official 2026 deadline is November 15 at 11:59 PM local time.
