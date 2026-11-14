# Area contract v1

`area.schema.json` defines the JSON exchanged by ingestion, ranking API, and map. `sample-areas.json` contains **synthetic, illustrative** records only; its coordinates do not select or validate an Indian pilot. No NISAR or SMAP pixel values have been opened for this fixture.

- `geometry` is a GeoJSON Polygon in longitude/latitude order (WGS84). Consumers should close rings and preserve the supplied coordinates; this schema checks point ranges and ring length, while geometric validity needs a spatial validator.
- One `area_id` identifies the same area across calls. `observations` may be empty until verified data is available. `observation_id` identifies a reading, and `observed_at` is an ISO 8601 UTC timestamp.
- `NISAR_SME2` describes **local** moisture or change; `SMAP` describes **regional** context or seasonal baseline. Do not render SMAP as field-level evidence. `CROP_CONTEXT` supplies crop stage where sourced.
- `data_status` must remain `sample` for generated values and become `observed` only after a real source is opened and checked. `source_ref` should then point to a reproducible granule, dataset, or source record. `quality` is independent of data status: a synthetic sample can be internally valid without being observed.
- Moisture and baseline are volumetric `m3/m3`; change uses a signed difference in `m3/m3`. `percentage_points` is reserved for explicitly converted differences. `stage` is the crop-stage unit. The API should ignore suspect or missing readings for ranking unless it explicitly explains their treatment.

The fusion API can add a separate ranked response later; it should consume this input without mutating provenance or re-labeling samples. The map can load this fixture immediately and display date, unit, quality, and sample status for every observation.
