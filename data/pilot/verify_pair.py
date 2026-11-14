"""Summarize a matched NISAR SME2 pair inside a small lon/lat box.

Requires h5py and numpy. The raw NASA HDF5 files are not stored in this repo.
Example:
  python data/pilot/verify_pair.py earlier.h5 later.h5 --bbox 79.70 10.60 80.00 10.90
"""

from __future__ import annotations

import argparse
import json

import h5py
import numpy as np


GRID = "science/LSAR/SME2/grids/"


def read(path: str, bbox: tuple[float, float, float, float]) -> dict:
    west, south, east, north = bbox
    with h5py.File(path, "r") as handle:
        grid = handle[GRID]
        lat = grid["latitude"][:]
        lon = grid["longitude"][:]
        rows = np.flatnonzero((lat >= south) & (lat <= north))
        cols = np.flatnonzero((lon >= west) & (lon <= east))
        if rows.size == 0 or cols.size == 0:
            return {"path": path, "inside_pixels": 0}
        region = np.s_[rows.min():rows.max() + 1, cols.min():cols.max() + 1]
        moisture = grid["soilMoisture"][region]
        quality = grid["retrievalQualityFlag"][region]
        water = grid["ancillaryData/waterbodyFraction"][region]
        # NISAR flag bit 0: 0 recommended; 1 not recommended.
        valid = np.isfinite(moisture) & (moisture != grid["soilMoisture"].attrs["_FillValue"])
        valid &= quality != grid["retrievalQualityFlag"].attrs.get("_FillValue", -9999)
        recommended = valid & ((quality & 1) == 0)
        return {
            "path": path,
            "granule_id": handle["science/LSAR/identification/granuleId"][()].decode(),
            "shape": list(moisture.shape),
            "inside_pixels": int(moisture.size),
            "valid_recommended_pixels": int(recommended.sum()),
            "valid_any_pixels": int(valid.sum()),
            "median_m3m3": float(np.median(moisture[recommended])) if recommended.any() else None,
            "waterbody_fraction_median": float(np.median(water[recommended])) if recommended.any() else None,
            "quality_flag_counts": {str(int(k)): int(v) for k, v in zip(*np.unique(quality, return_counts=True))},
            "_moisture": moisture,
            "_recommended": recommended,
            "_latitude": lat[rows.min():rows.max() + 1],
            "_longitude": lon[cols.min():cols.max() + 1],
        }


def verify_pair(earlier_path: str, later_path: str, bbox: tuple[float, float, float, float]) -> dict:
    west, south, east, north = bbox
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise ValueError("Expected ordered WGS84 bounds WEST SOUTH EAST NORTH")
    earlier, later = read(earlier_path, bbox), read(later_path, bbox)
    before, after = earlier.pop("_moisture", None), later.pop("_moisture", None)
    valid0, valid1 = earlier.pop("_recommended", None), later.pop("_recommended", None)
    lat0, lat1 = earlier.pop("_latitude", None), later.pop("_latitude", None)
    lon0, lon1 = earlier.pop("_longitude", None), later.pop("_longitude", None)
    result = {"bbox_wgs84": list(bbox), "earlier": earlier, "later": later,
              "evidence_status": "no_comparable_grid_window"}
    if (before is not None and after is not None and before.shape == after.shape
            and np.array_equal(lat0, lat1) and np.array_equal(lon0, lon1)):
        matched = valid0 & valid1
        delta = after[matched] - before[matched]
        result.update(
            matched_recommended_pixels=int(matched.sum()),
            delta_median_m3m3=float(np.median(delta)) if delta.size else None,
            delta_q10_q90_m3m3=[float(x) for x in np.quantile(delta, [0.1, 0.9])] if delta.size else None,
            evidence_status="observed_granule_window_not_field_validation",
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("earlier")
    parser.add_argument("later")
    parser.add_argument("--bbox", nargs=4, required=True, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    args = parser.parse_args()
    print(json.dumps(verify_pair(args.earlier, args.later, tuple(args.bbox)), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
