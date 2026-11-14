"""Read-only NISAR SME2 catalog preflight for Indian pilot candidates.

This inspects CMR metadata only. It never downloads or evaluates moisture pixels.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen


COLLECTION = "NISAR_L3_SME2_PROVISIONAL_V1"
CMR_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
CANDIDATES = {
    "nagapattinam": (79.84, 10.77, "2026-06-15T00:00:00Z,2026-07-10T23:59:59Z"),
    "ludhiana": (75.85, 30.90, "2025-11-15T00:00:00Z,2025-12-20T23:59:59Z"),
    "ahmedabad": (72.58, 23.02, "2025-12-08T00:00:00Z,2025-12-29T23:59:59Z"),
}


def query_url(lon: float, lat: float, temporal: str) -> str:
    params = {
        "short_name": COLLECTION,
        "point": f"{lon},{lat}",
        "temporal": temporal,
        "page_size": 200,
    }
    return f"{CMR_URL}?{urlencode(params)}"


def fetch_catalog(url: str) -> tuple[list[dict], int]:
    request = Request(url, headers={"User-Agent": "FarmMoistureWatch-catalog-preflight/1"})
    with urlopen(request, timeout=25) as response:
        payload = json.load(response)
        hits = int(response.headers.get("CMR-Hits", len(payload["feed"]["entry"])))
    entries = payload["feed"]["entry"]
    if hits > len(entries):
        raise RuntimeError(f"CMR returned {len(entries)} of {hits} hits; narrow the window")
    return entries, hits


def parse_entry(entry: dict) -> dict | None:
    title = entry.get("title", "")
    parts = title.split("_")
    if len(parts) < 15 or parts[:4] != ["NISAR", "L3", "PR", "SME2"]:
        return None
    try:
        start = datetime.strptime(parts[11], "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return None
    return {
        "title": title,
        "cmr_concept_id": entry.get("id"),
        "start_utc": start.isoformat().replace("+00:00", "Z"),
        "track_frame_mode": "_".join(parts[5:11]),
        "processing_id": parts[13],
        "filename_status_tokens": parts[14:],
        "footprint_polygons": entry.get("polygons", []),
        "_group": tuple(parts[5:11] + [parts[13]]),
        "_time": start,
    }


def candidate_pairs(entries: list[dict]) -> list[dict]:
    parsed = [item for entry in entries if (item := parse_entry(entry)) is not None]
    grouped: dict[tuple[str, ...], list[dict]] = {}
    for item in parsed:
        grouped.setdefault(item["_group"], []).append(item)
    pairs = []
    for group in grouped.values():
        group.sort(key=lambda item: item["_time"])
        for earlier, later in zip(group, group[1:]):
            separation_days = (later["_time"] - earlier["_time"]).total_seconds() / 86400
            if 11 <= separation_days <= 13:
                pairs.append({
                    "separation_days": round(separation_days, 3),
                    "earlier": {k: v for k, v in earlier.items() if not k.startswith("_")},
                    "later": {k: v for k, v in later.items() if not k.startswith("_")},
                    "common_point_is_not_agricultural_aoi_verification": True,
                })
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", choices=sorted(CANDIDATES), action="append")
    args = parser.parse_args()
    names = args.candidate or list(CANDIDATES)
    output = {"evidence_status": "catalog_only", "product": COLLECTION, "candidates": {}}
    for name in names:
        lon, lat, temporal = CANDIDATES[name]
        url = query_url(lon, lat, temporal)
        entries, hits = fetch_catalog(url)
        output["candidates"][name] = {
            "query_url": url,
            "query_point_wgs84": [lon, lat],
            "cmr_hits": hits,
            "repeat_pairs": candidate_pairs(entries),
            "unverified": ["HDF5 moisture pixels", "quality flags", "agricultural AOI coverage", "SMAP", "S-band"],
        }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
