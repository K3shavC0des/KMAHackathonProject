# SMAP local-file baseline check

Use `python data/context/smap_baseline.py --current CURRENT.h5 --historical HISTORY_*.h5 --lat LAT --lon LON` after downloading authorized SPL3SMP_E v6 files. Requires `h5py` and `numpy`. This tool reads AM `soil_moisture`, `retrieval_qual_flag`, latitude, and longitude at the nearest 9 km grid center. It accepts only retrieval quality flags 0 or 8, requires the point within 15 km of that center, and needs at least five quality-valid years in a ±15-day seasonal window from 2016–2025. It reports `unavailable` with a reason instead of manufacturing a baseline.

It does not download files, identify an agricultural field, infer crop stage, or turn SMAP into field-scale evidence. Pair the result with an independently checked NISAR AOI and crop source before selecting a pilot. The [NSIDC v6 guide](https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf) describes the AM fields and recommended retrieval flags.
