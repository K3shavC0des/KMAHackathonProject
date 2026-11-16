# Observed Nagapattinam development data

`nagapattinam-areas.json` implements the reviewed area collection v1 contract.
All readings are derived from the opened NISAR SME2 June 20 / July 2, 2026
granules listed in `data/pilot/VERIFICATION.md`. The 36 rectangular analysis
squares cover a 0.18° × 0.18° development region around Nagapattinam (79.68–79.86° E,
10.64–10.82° N); they are not surveyed fields or a crop mask.

Reproduce from the repository root (Python requires h5py, numpy and jsonschema):

```powershell
python data/observed/export_nagapattinam.py earlier.h5 later.h5 --output data/observed/nagapattinam-areas.json
```

Before writing, the exporter validates the complete collection against the shared
`contracts/area.schema.json` with date-time format checking and rejects nonfinite
numbers. No output is written on validation failure.

Run validation regressions with `python -m unittest discover -s data/observed -p test_validation.py`.
Set `FMW_AREA_SCHEMA` to the same canonical schema path if using a separate checkout.

The exporter checks matching coordinate axes, track, frame, pass, radar band,
look direction, product type, units, and date order. It uses each dataset's fill
value, finite values, and retrievalQualityFlag bit 0=0 on both dates. Quality-flag
fill values are excluded even when their low bit is zero. Square bounds
are half-open to prevent double counting shared edges. The 36 exported squares contain
7,415 matched recommended cells in total. A square is shown only when it has qualified
common cells in both acquisition dates; values are never filled in or estimated.

For each tile, the change is the median of per-cell later-minus-earlier moisture
on the common valid mask. Two additional observations record each date's median
on that same mask. The difference of these two medians need not equal the median
of per-cell differences. Values use m3/m3; polygon coordinates are WGS84 lon/lat.
Each reading retains exact acquisition start time, source granule ID, quality
rule, and matched count. `quality=valid` means the retrieval passed this mask;
it does not establish crop identity or agricultural decision accuracy.

SMAP observations are omitted because usable regional seasonal context is still
unverified. Show **Regional context unavailable**. Crop stage stays `unknown`.
Crop-stage scenarios are deferred from the active map journey. Paddy water management can
affect surface moisture; do not present drying as measured root-zone stress.

The map displays this as observed data, separate from the labeled synthetic example.
Field boundaries and crop identity have not been validated for these squares.
