"""Summarize a matched NISAR SME2 pair inside a small lon/lat box.

Requires h5py and numpy. The raw NASA HDF5 files are not stored in this repo.
Example:
  python data/pilot/verify_pair.py earlier.h5 later.h5 --bbox 79.70 10.60 80.00 10.90
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime

import h5py
import numpy as np


GRID = "science/LSAR/SME2/grids/"
IDENT = "science/LSAR/identification/"


def scalar(handle, name):
    value = handle[IDENT + name][()]
    return value.decode() if isinstance(value, bytes) else value.item() if isinstance(value, np.generic) else value


def check_pair(earlier: str, later: str) -> None:
    """Reject unrelated, shifted, or reversed acquisitions before differencing."""
    with h5py.File(earlier, "r") as before, h5py.File(later, "r") as after:
        for key in ("productType", "trackNumber", "frameNumber", "orbitPassDirection", "radarBand", "lookDirection"):
            if scalar(before, key) != scalar(after, key):
                raise ValueError(f"Incomparable pair: {key}")
        for key in ("latitude", "longitude"):
            left, right = before[GRID + key][:], after[GRID + key][:]
            if left.ndim != 1 or right.ndim != 1 or not np.isfinite(left).all() or not np.isfinite(right).all():
                raise ValueError(f"Expected finite one-dimensional {key} axes")
            if not np.array_equal(left, right):
                raise ValueError(f"Pair coordinate grids differ: {key}")
            if left.size > 1 and not (np.all(np.diff(left) > 0) or np.all(np.diff(left) < 0)):
                raise ValueError(f"Expected strictly monotonic {key} axis")
        for handle in (before, after):
            unit = handle[GRID + "soilMoisture"].attrs["units"]
            if isinstance(unit, bytes):
                unit = unit.decode()
            if unit != "meter^3/meter^3":
                raise ValueError("Unexpected soil moisture units")
        dates = []
        for handle in (before, after):
            value = scalar(handle, "zeroDopplerStartTime")
            # NISAR acquisition times are UTC, including files lacking a suffix.
            date = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if date.tzinfo is None:
                date = datetime.fromisoformat(value + "+00:00")
            dates.append(date)
        if dates[0] >= dates[1]:
            raise ValueError("Inputs must be in chronological order")


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
        }


def verify(earlier_path: str, later_path: str, bbox: tuple[float, float, float, float]) -> dict:
    west, south, east, north = bbox
    if not all(np.isfinite(bbox)) or not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise ValueError("Expected finite WGS84 bounds WEST SOUTH EAST NORTH")
    check_pair(earlier_path, later_path)
    earlier, later = read(earlier_path, bbox), read(later_path, bbox)
    before, after = earlier.pop("_moisture", None), later.pop("_moisture", None)
    valid0, valid1 = earlier.pop("_recommended", None), later.pop("_recommended", None)
    if before is not None and after is not None and before.shape == after.shape:
        matched = valid0 & valid1
        delta = after[matched] - before[matched]
        return {
            "bbox_wgs84": list(bbox),
            "earlier": earlier,
            "later": later,
            "matched_recommended_pixels": int(matched.sum()),
            "delta_median_m3m3": float(np.median(delta)) if delta.size else None,
            "delta_q10_q90_m3m3": [float(x) for x in np.quantile(delta, [0.1, 0.9])] if delta.size else None,
            "evidence_status": "observed_granule_window_not_field_validation",
        }
    return {"bbox_wgs84": list(bbox), "earlier": earlier, "later": later, "evidence_status": "no_comparable_grid_window"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("earlier")
    parser.add_argument("later")
    parser.add_argument("--bbox", nargs=4, required=True, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    args = parser.parse_args()
    print(json.dumps(verify(args.earlier, args.later, tuple(args.bbox)), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
