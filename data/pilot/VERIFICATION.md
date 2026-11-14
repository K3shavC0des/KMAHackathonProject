# Nagapattinam candidate data check

**Status: Nagapattinam selected as development geography; full fused validation pending.** The broad-window findings below are the initial candidate check. The selected smaller window is documented in [PILOT_DECISION.md](PILOT_DECISION.md). This is a reproducibility note, not a field-level scouting recommendation.

## Source granules

- NISAR SME2 June 20, 2026: `NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001.h5` (CMR `G4249557322-ASF`). [Download via ASF](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L3_SME2_PROVISIONAL_V1/NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001/NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001.h5)
- NISAR SME2 July 2, 2026: `NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001.h5` (CMR `G4255109928-ASF`). [Download via ASF](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L3_SME2_PROVISIONAL_V1/NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001/NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001.h5)
- SMAP SPL3SMP_E v6 July 2, 2026: `SMAP_L3_SM_P_E_20260702_R19240_004.h5` (CMR `G4321334815-NSIDC_CPRD`). [Download via NSIDC](https://data.nsidc.earthdatacloud.nasa.gov/nsidc-cumulus-prod-protected/SMAP/SPL3SMP_E/006/2026/07/02/SMAP_L3_SM_P_E_20260702_R19240_004.h5)

Raw files require Earthdata login and are intentionally not committed. The verified local copies were `.tools/downloads/fmw/nisar_20260620.h5`, `nisar_20260702.h5`, and `smap_20260702.h5`.

## Observations and limits

Both NISAR SME2 HDF5 files opened; each has a 1935 × 1530 `soilMoisture` grid in m³/m³ and `retrievalQualityFlag` values. Product metadata says bit 0 = 0 is recommended. In a 0.3° × 0.3° window centered near 79.84°E, 10.77°N, 10,890 recommended pixels matched between dates. Median July 2 minus June 20 change was −0.0282 m³/m³; 10th/90th percentiles were −0.0625 / 0.0009 m³/m³. This box spans many fields and is not a farm-level result.

The July 2 SMAP file opened with 1624 × 3856 AM arrays. NSIDC defines recommended, attempted retrievals by `retrieval_qual_flag` bits 0 and 1 both zero; reject fill values. No recommended retrieval pixels fell inside the same Nagapattinam window. The nearest recommended pixel was about 267 km away. CMR point queries returned this same granule for all three city candidates, so the CMR hit is not proof of useful local SMAP coverage.

Next: check nearby SMAP dates and pixel geolocation/QC for the selected Nagapattinam window. Omit SMAP anomaly from the demo while quality-valid same-cell seasonal history remains unavailable. No S-band file was opened.

## Reproduction

Install `h5py` and `numpy` in the analysis environment. Copy the two SME2 files to an accessible local folder and run:

```powershell
python data/pilot/verify_pair.py earlier.h5 later.h5 --bbox 79.70 10.60 80.00 10.90
```

The script reports counts and change for the supplied geographic box and labels the result as not field validation. Keep downloaded HDF5 files and credentials out of Git.

## Pair-verifier regression check (2026-11-14)

The verifier now rejects mismatched full coordinate axes even when window shapes
match, differing product/track/frame/pass/band/look metadata, unexpected moisture
units, reversed acquisition dates, and invalid geographic bounds. Both the
per-date summaries and matched mask exclude nonfinite values and each dataset's
own fill value. Coordinate axes must be finite, one-dimensional and monotonic.

Run `python -m unittest discover -s data/pilot -p test_verify_pair.py`.
Eleven HDF5 regression tests pass, including shifted same-size grids, independent
fill values, NaN/Infinity, quality failures and empty coverage.

Rerunning the actual downloaded June 20/July 2 pair with
`--bbox 79.74 10.70 79.80 10.76` reproduces 1,073 cells per window,
920 matched recommended cells, median change -0.01749463379383087 m3/m3,
and 10th/90th percentiles -0.04788471907377243 / +0.006342715024948121.
This confirms the existing development-window evidence; it does not establish
SMAP history, crop identity, field boundaries, or irrigation need.
