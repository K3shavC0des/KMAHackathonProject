# Selected development pilot: Nagapattinam, Tamil Nadu

Decision: use Nagapattinam for development and the demonstration. This selects a geography; full NISAR + SMAP + crop validation remains incomplete.

## Opened evidence

WGS84 bounds: west 79.74, south 10.70, east 79.80, north 10.76; center 79.77 E, 10.73 N. Treat this as an analysis window, not a surveyed field or verified crop mask.

Opened NISAR SME2 June 20 and July 2, 2026. Latitude and longitude arrays were checked with numpy.array_equal and match exactly. Both windows contain 1,073 cells; 920 have recommended retrieval flags on both dates. Recommended-cell waterbody-fraction median is zero. Median matched later-minus-earlier change is -0.0174946 m3/m3; 10th/90th percentiles -0.0478847 and +0.0063427. These are surface retrievals, not root-zone measurements. See nagapattinam-observed-window.json and VERIFICATION.md for source IDs and download steps.

SMAP July 2 AM was opened, but no suitable regional retrieval has been established for this window. Seasonal anomaly is null/unavailable. Do not substitute distant valid cells. Check nearby dates at the same regional grid cell, then historical quality-valid years. The existing SMAP checker still needs execution with suitable files.

## Crop context

TNAU lists Nagapattinam in the June-July Kuruvai rice season: https://agritech.tnau.ac.in/agriculture/agri_seasonandvarieties_rice.html . Rice and planting date are assumptions for scenarios until the user or a crop map confirms them. Unknown inputs mean crop stage unknown; never infer stage from the NISAR change. Flooding, transplanting and irrigation can affect rice-area surface retrievals, so this window needs local crop/land-cover review before agronomic interpretation.

## Remaining evidence gaps

The NISAR-only development pilot can proceed with the reviewed analysis window. A fully fused NISAR and SMAP result remains pending quality-valid nearby SMAP observations and a seasonal baseline. S-band overlap remains unverified. Keep missing evidence unavailable rather than filling it with synthetic readings.
