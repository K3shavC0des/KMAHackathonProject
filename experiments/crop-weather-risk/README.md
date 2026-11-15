# Experimental crop and weather risk screen

This branch explores the third planned insight for Nagapattinam on **2026-07-02**.
The browser page is at `experiments/crop-weather-risk/index.html`. From the
project root, run `python -m http.server 8765` and open
`http://127.0.0.1:8765/experiments/crop-weather-risk/`.

The crop selector offers **rice** and **black gram** because public Tamil Nadu
cropping guidance includes Nagapattinam or its district category in the
June–July season. It filters the explanation; it does not label a cell as a
particular crop. Field crop, planting date, and growth stage remain unknown.

The NISAR image is drawn from the 7,415 measured, quality-matched SME2 cells
already in `data/observed/nagapattinam-areas.json`. It shows the June 20 to
July 2 surface-moisture change, not an optical photograph. The report also
opens both source HDF5 files to compare the native `soilMoistureUncertainty`
layer on the same cells. Only 1.3% of changes exceed the **sum** of the two
reported per-date uncertainty estimates. That sum is a conservative screen,
not a calibrated confidence interval.
`nisar-image-cells.json` is a compact derived rendering input from the same
observed cells. It contains coordinates and change values, not source HDF5.

The inspected SME2 granules also contain L-band radar backscatter (`sigma0HH`
and `sigma0HV`), but this experiment does not equate backscatter changes with
crop stress. The product overview lists PMI crop type and vegetation-water
layers for some SME2 products; these two granules only contain the DSG
candidate, so those layers are absent. Land cover is ancillary context, not a
verified crop label. A future vegetation check could use NASA HLS NDVI/NDMI,
with cloud and date matching, after its source pixels are actually retrieved.

NASA POWER daily `T2M_MAX`, `RH2M`, and `PRECTOTCORR` supply seven-day
temperature, humidity, and rainfall at one 0.5° regional grid point. The
2026 temperature is compared with matching seven-day periods in 1991–2020.
POWER weather is regional context and is not attributed to individual NISAR
cells. Rainfall is shown alongside its baseline; it is not treated as a
deficit here because 8.64 mm exceeds the 7.17 mm median. The qualitative
screen is **Watch — confirm locally**: a hot week and many lower NISAR point
estimates warrant a local check, while crop presence and moisture-change
confidence remain unresolved.

Regenerate the derived report with Python, `h5py`, and `numpy` available:

```powershell
python experiments/crop-weather-risk/risk.py --earlier-h5 EARLIER.h5 --later-h5 LATER.h5
```

Inputs and rights:

- [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) and its [daily temperature methodology](https://power.larc.nasa.gov/docs/methodology/data/processing/) are NASA sources.
- [NISAR granule IDs and QC](../../data/observed/CITIES.md) document the NASA–ISRO source products. Raw HDF5 downloads stay outside Git.
- [NISAR SME2 product guide](https://nisar-docs.asf.alaska.edu/sme2/) describes provisional calibration limits and retrieval quality.
- [NASA HLS vegetation indices](https://www.earthdata.nasa.gov/s3fs-public/2025-01/HLSVI_revised_Oct2024.pdf) are a possible future independent vegetation check, not a current input.
- [TNAU rice season guidance](https://www.agritech.tnau.ac.in/expert_system/paddy/seasonvariety.html) and [Tamil Nadu black gram cropping guidance](https://tnagriculture.in/dashboard/report/26_02.pdf) are public state agricultural resources. Their calendars describe possible district seasons, not observed crops.
- [NASA Space Apps legal terms](https://www.spaceappschallenge.org/legal/) permit non-NASA solution materials when they are freely and publicly available without restriction or openly licensed. This branch uses only cited public guidance and NASA/ISRO observations. The challenge page was unavailable during verification, so no challenge-specific claim beyond those legal terms is made.

This experiment has no irrigation recommendation and is intentionally not
merged into the main map or presentation.
