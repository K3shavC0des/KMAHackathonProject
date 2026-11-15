# L/S radar evidence

Current status: **unavailable**. No matching GCOV files have been opened for this
feature. No agricultural polygon or independent field validation is claimed.
The committed JSON deliberately contains no measurements. SME2 is a different
geophysical variable and cannot substitute for GCOV backscatter.

An earlier metadata-only California S-band sample was removed from the active
artifact because it was not co-located or time-matched with Nagapattinam and
could not participate in the map result. Its purpose is retained in the
removed-prototype notes.

## Obtain and prepare data

Use ASF for L-band and registered Bhoonidhi access for S-band. Start with the
July 2, 2026 Nagapattinam candidate documented by ISRO:
`NISAR_S2_PR_GCOV_024_084_A_007_3700_DHNA_A_20260702T001555_20260702T001631_P00500_P_F_I_001`.
Its presence in the release announcement does not establish downloadable pixels.
Find the overlapping L-band GCOV and an earlier matching L/S pair. Otherwise
supply just one L/S date. Both bands must offer HH; frame numbers can differ
across bands, so confirm footprint overlap spatially.

Extract the calibrated **HH diagonal power** layer to a single-band GeoTIFF
using the product documentation and Bhoonidhi HDF-to-GTiff/QGIS or GDAL. Do not
use browse imagery, amplitude, dB rasters, covariance cross terms, or SME2.
Inspect each product's actual HDF5 layout instead of assuming an L-band path
works for S-band. Retain the documented gamma0 or sigma0 convention consistently.
Mask fill values, failed product-quality cells, layover/shadow where available,
and reviewed RFI/banding artifacts to an explicit nodata value. Record the
mask rules and calibration review; the exporter cannot establish calibration
from power pixels alone. Prepare subsets in the same projected metre CRS.

Install `pip install -r data/radar/requirements.txt` in an analysis environment. Create a local
manifest (keep raw files and local paths outside Git):

```json
{
  "rasters": [
    {
      "path": "l-earlier-hh-power.tif", "band": "L", "polarization": "HH",
      "observed_at": "2026-06-20T00:15:57Z", "track": 84,
      "pass": "Ascending", "look": "Right", "convention": "gamma0",
      "effective_resolution_m": 80,
      "source_ref": "REPLACE_WITH_EXACT_NISAR_L2_GCOV_GRANULE_ID",
      "processing_baseline": "REPLACE_FROM_METADATA",
      "quality_note": "REPLACE_WITH_ACTUAL_MASK_AND_ARTIFACT_REVIEW",
      "reviewed_calibration_and_mask": false
    }
  ],
  "land_cover_sources": {}
}
```

The above is a **non-runnable template**, not verified product metadata. Supply
two or four entries, L and S for each date; replace every example with inspected
metadata. Effective resolution must come from the product/mode, not posting.
Set review true only after inspecting source calibration and masks. Each band's
processing baseline must be consistent across time. L/S times must be within
60 seconds; track/pass/look and backscatter conventions must match.

```sh
python data/radar/export_gcov.py PATH/manifest.json --output PATH/candidate.json
node --input-type=module -e "import fs from 'node:fs'; import {validateRadar} from './backend/radar.mjs'; validateRadar(JSON.parse(fs.readFileSync(process.argv[1], 'utf8'))); console.log('Radar contract valid')" PATH/candidate.json
```

The exporter averages linear power onto the coarsest effective grid, intersects
valid cells across every input, then computes each area's mean power in dB.
Two-date change is later minus earlier dB; no L-minus-S moisture estimate is
generated. Cropping is required before processing large source swaths.
Inspect candidate values against the source rasters and independently review
the masks before replacing `data/radar/nagapattinam.json`. The API and static
build validate that artifact. Cite agricultural land-cover evidence per area
in `land_cover_sources`; absent evidence leaves the analysis-area label.

Before judging: obtain the actual GCOV inputs, verify geolocation and values,
source an agricultural case, compare with independent field observations, and
rehearse both map sizes. These are outstanding data and validation tasks.

Implementation checks: Node contract/API tests and four synthetic Python raster
tests passed. The active map shows the unavailable state without shipping a
separate radar page or synthetic paired-map controls.
Run Python checks with `python -m unittest discover -s data/radar -p test_*.py`.

Sources: [ISRO S-band release](https://www.isro.gov.in/NISARS_Band_SAR_Data_Products_Release.html),
[NASA GCOV guide](https://nisar-docs.asf.alaska.edu/gcov/),
[NASA instruments](https://www.jpl.nasa.gov/press-kits/nisar/mission-overview/science/),
[FAO root-zone guidance](https://www.fao.org/4/x0490e/x0490e0e.htm).
