# NISAR catalog preflight

Run `python data/pilot/catalog.py` to search NASA CMR for repeat NISAR SME2 catalog entries near Nagapattinam, Ludhiana, and Ahmedabad. Add `--candidate nagapattinam` to limit the search. Python standard library only; network access to NASA CMR is required. The output is JSON and includes the exact query URL, metadata identifiers, dates, returned footprint polygons, and candidate pairs with matching filename track/frame/mode/processing tokens approximately 12 days apart.

**This is catalog metadata, not ingested soil moisture.** A shared query point implies each returned footprint contains that point, but does not establish valid agricultural pixels or quality in a field AOI. Before pilot selection, download and inspect both HDF5 files, align valid cells, inspect exact product flags, then ingest SMAP observations and a local crop calendar. S-band coverage must be checked as a separate experiment; GCOV backscatter is not volumetric SME2 moisture.

API: [NASA CMR Search documentation](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html). Product: [ASF NISAR SME2 guide](https://nisar-docs.asf.alaska.edu/sme2/). Pilot gate: [project plan](../../docs/hackathon/PLAN.md).

Run `python data/pilot/smap_catalog.py` to check the July 2, 2026 SMAP SPL3SMP_E v6 catalog granule and the ±15-day historical windows in 2016–2025. `--current-only` limits it to the current granule. This lists catalog availability and protected HDF5 URLs; it does not establish valid AM retrievals or a usable seasonal baseline. See the [NSIDC product guide](https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf) for the HDF5 fields and quality flags.
