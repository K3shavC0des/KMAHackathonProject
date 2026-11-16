# SARView

### Satellite radar insights for smarter field checks

**[Open the live SARView app](https://k3shavc0des.github.io/KMAHackathonProject/)**

SARView is a map-based prototype that helps farmers and crop advisers decide where to check soil moisture first. It compares quality-screened NISAR satellite observations and makes the measurements, dates, and data sources visible on the map.

## Explore the app

1. Open the [live app](https://k3shavc0des.github.io/KMAHackathonProject/).
2. Choose a city: Nagapattinam, Ludhiana, Nairobi, or Ahmedabad.
3. Select an analysis square to review its observed moisture change and the supporting readings.

The app also includes a clearly labeled synthetic example for exploring the map experience. It is separate from the observed satellite data.

## How it works

For the observed Nagapattinam analysis, SARView compares two NISAR SME2 acquisitions over matching map squares. It filters the satellite retrievals using their quality flags and calculates the median change from matched valid pixels. Each displayed reading includes its acquisition dates and source details.

## What the results mean

The map helps prioritize areas for field inspection; it does not prescribe irrigation. Analysis squares are not surveyed farm boundaries, and surface-moisture observations do not establish root-zone moisture, crop stress, or crop identity. Results are historical observations and should be considered alongside on-the-ground conditions.

Regional SMAP context and matching radar evidence are shown as unavailable when verified inputs are not available. SARView leaves missing evidence unavailable rather than filling it with estimates.

## Run locally

Requires Node.js 22 or newer. From the repository root:

```sh
node frontend/map/serve.mjs
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000). An internet connection is needed for the OpenStreetMap basemap.

## Project notes

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Observed data and methods](data/observed/README.md)
- [Radar data preparation](data/radar/README.md)
- [License](LICENSE.md)
