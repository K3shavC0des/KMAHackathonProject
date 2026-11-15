# Observed city windows

Ludhiana and Ahmedabad were downloaded through the user's authorized Earthdata
session and opened locally on 2026-11-15. These are historical NISAR SME2
surface-moisture observations, not live conditions, field boundaries, crop masks,
or irrigation prescriptions. Each city has its own acquisition pair and ranking.
Synthetic example data stays in its separate collection.

| City | Acquisition dates (UTC) | WGS84 west, south, east, north | Exported squares | Matched recommended cells |
| --- | --- | --- | --- | --- |
| Ludhiana | 2025-11-21 / 2025-12-03 | 75.76, 30.81, 75.94, 30.99 | 35 of 36 | 4,686 |
| Ahmedabad | 2025-12-12 / 2025-12-24 | 72.49, 22.93, 72.67, 23.11 | 36 of 36 | 2,681 |

The regional matched-cell median change is +0.006806090474128723 m3/m3 for
Ludhiana and +0.006999999284744263 m3/m3 for Ahmedabad. Individual squares can
dry even when the whole-window median increases. Ludhiana r03c04 has no matched
recommended cells and is omitted; no value was imputed. A square can include
unretrieved cells: its statistics describe only the matched quality-valid subset.
SMAP seasonal history and crop evidence remain unavailable for these cities.

## Source granules

Ludhiana:

- `NISAR_L3_PR_SME2_005_156_A_017_4005_DHDH_A_20251121T001310_20251121T001345_P05023_N_F_J_001`
- `NISAR_L3_PR_SME2_006_156_A_017_4005_DHDH_A_20251203T001311_20251203T001345_P05023_N_F_J_001`

Ahmedabad:

- `NISAR_L3_PR_SME2_007_113_A_013_4005_DHDH_A_20251212T003555_20251212T003630_P05023_N_F_J_001`
- `NISAR_L3_PR_SME2_008_113_A_013_4005_DHDH_A_20251224T003556_20251224T003630_P05023_N_F_J_001`

Collection: `NISAR_L3_SME2_PROVISIONAL_V1`. Source downloads use
`https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L3_SME2_PROVISIONAL_V1/{granule}/{granule}.h5`.
Raw files stay outside Git in ignored local storage. Only derived, schema-validated
analysis observations are versioned; every observation retains source granule IDs.

## Reproduction and checks

Run with Python packages `numpy`, `h5py` and `jsonschema` (or the existing project
data environment). Supply the earlier and later local HDF5 paths:

```sh
python data/pilot/verify_pair.py EARLIER.h5 LATER.h5 --bbox 75.76 30.81 75.94 30.99
python data/observed/export_nagapattinam.py EARLIER.h5 LATER.h5 --city ludhiana --skip-unavailable --output data/observed/ludhiana-areas.json
python data/pilot/verify_pair.py EARLIER.h5 LATER.h5 --bbox 72.49 22.93 72.67 23.11
python data/observed/export_nagapattinam.py EARLIER.h5 LATER.h5 --city ahmedabad --skip-unavailable --output data/observed/ahmedabad-areas.json
```

The verifier checked compatible acquisition metadata, dates, units and full
coordinate axes. Export retains the existing finite/strictly monotonic axes,
quality-fill exclusion, recommended bit-0 flag and same-cell two-date masks.
Each square's change is the median of paired cell differences; per-date values
use exactly the same matched subset. Tiles use half-open bounds to avoid double
counting. Empty cities are rejected even with `--skip-unavailable`.

API: `/api/areas?dataset=ludhiana` and `/api/areas?dataset=ahmedabad`; the same
dataset keys work for `/api/rank` and nested `/map/api/` routes. The existing
`observed` key continues to mean Nagapattinam.
