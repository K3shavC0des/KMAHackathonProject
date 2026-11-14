# Fusion and value-check API

Run `node backend/server.mjs`, then request `GET http://127.0.0.1:8787/api/rank` for the labeled demo fixture. `POST /api/rank` accepts a JSON area collection matching `contracts/area.schema.json`; `/health` is a simple readiness check. No external API or credentials are required for the sample path.

Select the separately labeled opened-data export with `GET /api/areas?dataset=observed` or `GET /api/rank?dataset=observed`. Omitting `dataset` keeps the synthetic sample. The observed collection contains four Nagapattinam **analysis tiles**, not surveyed fields. It has quality-screened NISAR change, unknown crop stage, and no validated SMAP baseline. The ranking can return `first_stop: null` when a comparison has insufficient evidence. No observed data are substituted into the sample fixture.

Install the pinned Node dependencies with `npm ci` before starting the API. Every posted or stored collection is checked against the shared `contracts/area.schema.json` with date-time formats and finite numbers before ranking. No second contract model is maintained.

The response contains `with_nisar` and `without_nisar`, each with `first_stop` and an explained `ranking`. Valid local NISAR drying adds up to five illustrative inspection points. Crop stage contributes no points. A schema-valid regional `seasonal_anomaly` produces `regional_below_historical: true` or `false`; without one it remains `null`. This regional flag never adds field-scale priority points. Invalid or suspect readings do not add points. If no supported drying evidence exists, `first_stop` is `null` and the interface should say evidence is insufficient.

This is a transparent demo heuristic, **not calibrated irrigation advice**. The fixture is synthetic and cannot establish scientific accuracy or real-world impact. Real data should retain its observation IDs, timestamps, units, quality flags, source references, and `observed` status only after opening and checking the product. Coordinate any schema change with the contract and map owners.
