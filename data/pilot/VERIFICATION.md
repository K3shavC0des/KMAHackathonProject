# Nagapattinam candidate data check

**Status: candidate only; pilot not selected.** Verified 2026-11-14 using opened HDF5 files. This is a reproducibility note, not a field-level scouting recommendation.

## Source granules

- NISAR SME2 June 20, 2026: `NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001.h5` (CMR `G4249557322-ASF`). [Download via ASF](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L3_SME2_PROVISIONAL_V1/NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001/NISAR_L3_PR_SME2_023_084_A_007_4005_DHDH_A_20260620T001557_20260620T001631_P05023_N_F_J_001.h5)
- NISAR SME2 July 2, 2026: `NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001.h5` (CMR `G4255109928-ASF`). [Download via ASF](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L3_SME2_PROVISIONAL_V1/NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001/NISAR_L3_PR_SME2_024_084_A_007_4005_DHDH_A_20260702T001556_20260702T001630_P05023_N_F_J_001.h5)
- SMAP SPL3SMP_E v6 July 2, 2026: `SMAP_L3_SM_P_E_20260702_R19240_004.h5` (CMR `G4321334815-NSIDC_CPRD`). [Download via NSIDC](https://data.nsidc.earthdatacloud.nasa.gov/nsidc-cumulus-prod-protected/SMAP/SPL3SMP_E/006/2026/07/02/SMAP_L3_SM_P_E_20260702_R19240_004.h5)

Raw files require Earthdata login and are intentionally not committed. The verified local copies were `.tools/downloads/fmw/nisar_20260620.h5`, `nisar_20260702.h5`, and `smap_20260702.h5`.

## Observations and limits

Both NISAR SME2 HDF5 files opened; each has a 1935 × 1530 `soilMoisture` grid in m³/m³ and `retrievalQualityFlag` values. Product metadata says bit 0 = 0 is recommended. In a 0.3° × 0.3° window centered near 79.84°E, 10.77°N, 10,890 recommended pixels matched between dates. Median July 2 minus June 20 change was −0.0282 m³/m³; 10th/90th percentiles were −0.0625 / 0.0009 m³/m³. This box spans many fields and is not a farm-level result.

The July 2 SMAP file opened with 1624 × 3856 AM arrays. NSIDC defines recommended, attempted retrievals by `retrieval_qual_flag` bits 0 and 1 both zero; reject fill values. No recommended retrieval pixels fell inside the same Nagapattinam window. The nearest recommended pixel was about 267 km away. CMR point queries returned this same granule for all three city candidates, so the CMR hit is not proof of useful local SMAP coverage.

Next: check nearby SMAP dates and pixel geolocation/QC against small agricultural AOIs inside each NISAR pair. Compare Nagapattinam, Ludhiana, and Ahmedabad, then select a pilot only if field-region pixels and crop context are usable. Otherwise omit SMAP anomaly from the demo rather than fabricate local context. No S-band file was opened.

## Reproduction

Install `h5py` and `numpy` in the analysis environment. Copy the two SME2 files to an accessible local folder and run:

```powershell
python data/pilot/verify_pair.py earlier.h5 later.h5 --bbox 79.70 10.60 80.00 10.90
```

The script reports counts and change for the supplied geographic box and labels the result as not field validation. Keep downloaded HDF5 files and credentials out of Git.
