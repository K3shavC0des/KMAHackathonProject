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
        valid = (moisture != grid["soilMoisture"].attrs["_FillValue"])
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
            "_quality": quality,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("earlier")
    parser.add_argument("later")
    parser.add_argument("--bbox", nargs=4, required=True, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    args = parser.parse_args()
    earlier, later = read(args.earlier, tuple(args.bbox)), read(args.later, tuple(args.bbox))
    before, after = earlier.pop("_moisture", None), later.pop("_moisture", None)
    q0, q1 = earlier.pop("_quality", None), later.pop("_quality", None)
    if before is not None and after is not None and before.shape == after.shape:
        fill = -9999.0
        matched = (before != fill) & (after != fill) & ((q0 & 1) == 0) & ((q1 & 1) == 0)
        delta = after[matched] - before[matched]
        result = {
            "bbox_wgs84": args.bbox,
            "earlier": earlier,
            "later": later,
            "matched_recommended_pixels": int(matched.sum()),
            "delta_median_m3m3": float(np.median(delta)) if delta.size else None,
            "delta_q10_q90_m3m3": [float(x) for x in np.quantile(delta, [0.1, 0.9])] if delta.size else None,
            "evidence_status": "observed_granule_window_not_field_validation",
        }
    else:
        result = {"bbox_wgs84": args.bbox, "earlier": earlier, "later": later, "evidence_status": "no_comparable_grid_window"}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
