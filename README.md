# Farm Moisture Watch

Farm Moisture Watch is a map-based prototype that helps farmers and crop advisers decide which areas may be worth inspecting first for surface-moisture change. It uses quality-screened NISAR observations and shows the dates, measurements, and data limits behind each result.

The map includes observed analysis squares for Nagapattinam, Ludhiana, and Ahmedabad, plus a separately labeled synthetic example. The squares are not verified farm boundaries, and the rankings are not irrigation advice.

## Run locally

Requires Node.js 22 or newer. From the repository root, run:

```sh
node frontend/map/serve.mjs
```

Then open `http://127.0.0.1:8000/` in a browser. The map uses OpenStreetMap tiles, so an internet connection is needed for the basemap.

## Data and methods

The map keeps observed NISAR data separate from the synthetic example. Each observed reading reports its acquisition dates and source details. Regional SMAP context and matching L/S-band radar evidence remain unavailable unless the required quality-checked inputs are present.

See [the project overview](docs/PROJECT_OVERVIEW.md), [observed data notes](data/observed/README.md), and [radar data preparation](data/radar/README.md) for more detail. The repository is distributed under the license in [LICENSE.md](LICENSE.md).
