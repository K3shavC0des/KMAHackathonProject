"""Read-only CMR coverage preflight for SMAP SPL3SMP_E v6 at the pilot date.

Catalog entries are not quality-checked measurements. No HDF5 file is opened.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta
import json
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


CMR_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
PRODUCT = "SPL3SMP_E"
VERSION = "006"
PILOT_DATE = date(2026, 7, 2)
HISTORICAL_YEARS = range(2016, 2026)
WINDOW_DAYS = 15


def cmr_query(start: date, end: date) -> str:
    temporal = f"{start.isoformat()}T00:00:00Z,{end.isoformat()}T23:59:59Z"
    return f"{CMR_URL}?{urlencode({'short_name': PRODUCT, 'version': VERSION, 'temporal': temporal, 'page_size': 200})}"


def get_entries(url: str) -> tuple[list[dict], int]:
    request = Request(url, headers={"User-Agent": "FarmMoistureWatch-smap-preflight/1"})
    with urlopen(request, timeout=25) as response:
        payload = json.load(response)
        entries = payload["feed"]["entry"]
        hits = int(response.headers.get("CMR-Hits", len(entries)))
    if hits > len(entries):
        raise RuntimeError(f"CMR returned {len(entries)} of {hits} hits; narrow the window")
    return entries, hits


def entry_date(entry: dict) -> date | None:
    try:
        return datetime.fromisoformat(entry["time_start"].replace("Z", "+00:00")).date()
    except (KeyError, ValueError):
        return None


def entry_summary(entry: dict) -> dict:
    data_urls = sorted({
        link["href"] for link in entry.get("links", [])
        if "/data#" in link.get("rel", "")
        and link.get("href")
        and urlsplit(link["href"]).path.lower().endswith(".h5")
    })
    return {
        "granule_title": entry.get("title"),
        "cmr_concept_id": entry.get("id"),
        "producer_granule_id": entry.get("producer_granule_id"),
        "start_utc": entry.get("time_start"),
        "end_utc": entry.get("time_end"),
        "data_urls": data_urls,
    }


def summarize_window(year: int) -> dict:
    center = PILOT_DATE.replace(year=year)
    start, end = center - timedelta(days=WINDOW_DAYS), center + timedelta(days=WINDOW_DAYS)
    url = cmr_query(start, end)
    entries, hits = get_entries(url)
    dated = sorted(((entry_date(item), item) for item in entries if entry_date(item)), key=lambda pair: pair[0])
    distinct_dates = sorted({day.isoformat() for day, _ in dated})
    samples = []
    if dated:
        samples.append(entry_summary(dated[0][1]))
        if len(dated) > 1:
            samples.append(entry_summary(dated[-1][1]))
    return {
        "year": year,
        "query_url": url,
        "cmr_hits": hits,
        "distinct_catalog_dates": len(distinct_dates),
        "first_date": distinct_dates[0] if distinct_dates else None,
        "last_date": distinct_dates[-1] if distinct_dates else None,
        "first_last_granules": samples,
    }


def nearby_current() -> dict:
    """Catalog nearby dates for follow-up; availability is not retrieval quality."""
    start = PILOT_DATE - timedelta(days=WINDOW_DAYS)
    end = PILOT_DATE + timedelta(days=WINDOW_DAYS)
    url = cmr_query(start, end)
    entries, hits = get_entries(url)
    dated = sorted(((entry_date(item), item) for item in entries if entry_date(item)),
                   key=lambda pair: (abs((pair[0] - PILOT_DATE).days), pair[0]))
    return {
        "query_url": url,
        "cmr_hits": hits,
        "closest_granules": [entry_summary(item) for _, item in dated[:7]],
        "evidence_status": "catalog_only",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current-only", action="store_true", help="Query only the pilot date")
    parser.add_argument("--nearby", action="store_true", help="List closest catalog granules within 15 days of the pilot date")
    args = parser.parse_args()

    if args.nearby:
        print(json.dumps(nearby_current(), indent=2))
        return

    current_url = cmr_query(PILOT_DATE, PILOT_DATE)
    current_entries, current_hits = get_entries(current_url)
    output = {
        "evidence_status": "catalog_only",
        "product": PRODUCT,
        "version": VERSION,
        "pilot_date": PILOT_DATE.isoformat(),
        "current": {
            "query_url": current_url,
            "cmr_hits": current_hits,
            "granules": [entry_summary(entry) for entry in current_entries],
        },
        "historical_window_days_each_side": WINDOW_DAYS,
        "historical": [] if args.current_only else [summarize_window(year) for year in HISTORICAL_YEARS],
        "unverified": ["HDF5 pixels", "AM retrieval and quality flags", "Nagapattinam grid cell", "usable seasonal baseline"],
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
