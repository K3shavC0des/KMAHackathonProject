# Observed Nagapattinam development data

`nagapattinam-areas.json` implements the reviewed area collection v1 contract.
All readings are derived from the opened NISAR SME2 June 20 / July 2, 2026
granules listed in `data/pilot/VERIFICATION.md`. These four rectangular analysis
tiles divide the development window; they are not surveyed fields or a crop mask.

Reproduce from the repository root (Python requires h5py and numpy):

```powershell
python data/observed/export_nagapattinam.py earlier.h5 later.h5 --output data/observed/nagapattinam-areas.json
```

The exporter checks matching coordinate axes, track, frame, pass, radar band,
look direction, product type, units, and date order. It uses each dataset's fill
value, finite values, and retrievalQualityFlag bit 0=0 on both dates. Tile bounds
are half-open to prevent double counting shared edges. The four tiles contain
194, 235, 238, and 253 matched recommended cells (920 total).

For each tile, the change is the median of per-cell later-minus-earlier moisture
on the common valid mask. Two additional observations record each date's median
on that same mask. The difference of these two medians need not equal the median
of per-cell differences. Values use m3/m3; polygon coordinates are WGS84 lon/lat.
Each reading retains exact acquisition start time, source granule ID, quality
rule, and matched count. `quality=valid` means the retrieval passed this mask;
it does not establish crop identity or agricultural decision accuracy.

SMAP observations are omitted because usable regional seasonal context is still
unverified. Show **Regional context unavailable**. Crop stage stays `unknown`.
Use the separate crop scenario for assumptions. Paddy water management can
affect surface moisture; do not present drying as measured root-zone stress.

## Frontend/backend handoff

- Load this collection explicitly as observed data; keep the synthetic demo as a
  separately labeled option. Select the requested observation metric as well as
  source: change for the headline, soil_moisture for the two-date timeline.
- Support `first_stop=null` from ranking PR #11. On these inputs the southwest
  tile ranks first with NISAR; without NISAR there is insufficient evidence.
  `first_stop_changes=false` because both modes do not have supported stops.
- Validate against `contracts/area.schema.json`. Schema/date validation passed;
  the export was run against the actual opened HDF5 pair. This export has not
  yet been wired into the browser interface or validated in the field.
