"""Inspect local SPL3SMP_E v6 AM files at one 9 km cell; never download data."""

from __future__ import annotations

import argparse
from datetime import date, datetime
import json
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
import re
from statistics import median

import h5py
import numpy as np


GROUP = "Soil_Moisture_Retrieval_Data_AM"
DATE = re.compile(r"SMAP_L3_SM_P_E_(\d{8})_")


def file_date(path: Path) -> date:
    match = DATE.search(path.name)
    if not match:
        raise ValueError(f"Expected a dated SPL3SMP_E filename: {path.name}")
    return datetime.strptime(match.group(1), "%Y%m%d").date()


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    a = sin(radians(lat2 - lat1) / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ** 2
    return 12742 * asin(sqrt(a))


def cell_for_point(path: Path, latitude: float, longitude: float) -> tuple[tuple[int, int], float, float, float]:
    with h5py.File(path, "r") as file:
        group = file[GROUP]
        lats = group["latitude"][:]
        lons = group["longitude"][:]
    if lats.shape != lons.shape or lats.ndim != 2:
        raise ValueError("AM latitude/longitude grids must be matching 2D arrays")
    # Shortlist a local box before the precise great-circle distance check.
    candidates = np.argwhere(np.isfinite(lats) & np.isfinite(lons) & (np.abs(lats - latitude) < 0.25) & (np.abs(lons - longitude) < 0.25))
    if not len(candidates):
        raise ValueError("No SMAP grid center near the requested point")
    row, col = min(candidates, key=lambda item: distance_km(latitude, longitude, float(lats[tuple(item)]), float(lons[tuple(item)])))
    cell_lat, cell_lon = float(lats[row, col]), float(lons[row, col])
    return (int(row), int(col)), cell_lat, cell_lon, distance_km(latitude, longitude, cell_lat, cell_lon)


def read_cell(path: Path, cell: tuple[int, int]) -> dict:
    with h5py.File(path, "r") as file:
        group = file[GROUP]
        moisture = float(group["soil_moisture"][cell])
        flag = int(group["retrieval_qual_flag"][cell])
        lat = float(group["latitude"][cell])
        lon = float(group["longitude"][cell])
    valid = flag in (0, 8) and np.isfinite(moisture) and 0 <= moisture <= 1
    return {"date": file_date(path).isoformat(), "granule": path.name, "soil_moisture_m3m3": moisture if valid else None,
            "retrieval_qual_flag": flag, "recommended": bool(valid), "cell_center_wgs84": [lon, lat]}


def baseline(current_file: Path, historical_files: list[Path], latitude: float, longitude: float, max_distance_km: float = 15) -> dict:
    cell, cell_lat, cell_lon, distance = cell_for_point(current_file, latitude, longitude)
    current = read_cell(current_file, cell)
    result = {"product": "SPL3SMP_E", "version": "006", "spatial_scale": "regional_9km", "evidence_status": "observed",
              "query_point_wgs84": [longitude, latitude], "grid_cell": list(cell), "grid_center_wgs84": [cell_lon, cell_lat],
              "distance_km": round(distance, 2), "current": current, "historical_valid_years": 0,
              "baseline_m3m3": None, "anomaly_m3m3": None, "status": "unavailable", "reason": None}
    if distance > max_distance_km:
        result["reason"] = "nearest grid center exceeds allowed distance"
        return result
    if not current["recommended"]:
        result["reason"] = "current AM retrieval is not recommended quality"
        return result
    values_by_year: dict[int, list[float]] = {}
    current_date = file_date(current_file)
    for path in historical_files:
        day = file_date(path)
        if not 2016 <= day.year <= 2025 or abs((day.replace(year=current_date.year) - current_date).days) > 15:
            continue
        reading = read_cell(path, cell)
        if distance_km(cell_lat, cell_lon, reading["cell_center_wgs84"][1], reading["cell_center_wgs84"][0]) > 0.1:
            raise ValueError(f"Grid cell differs in {path.name}")
        if reading["recommended"]:
            values_by_year.setdefault(day.year, []).append(reading["soil_moisture_m3m3"])
    year_values = [median(values) for values in values_by_year.values()]
    result["historical_valid_years"] = len(year_values)
    if len(year_values) < 5:
        result["reason"] = "fewer than five quality-valid historical years"
        return result
    baseline_value = median(year_values)
    result.update(status="usable", reason=None, baseline_m3m3=round(baseline_value, 5),
                  anomaly_m3m3=round(current["soil_moisture_m3m3"] - baseline_value, 5),
                  historical_year_medians_m3m3={str(year): round(median(values), 5) for year, values in sorted(values_by_year.items())})
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current", type=Path, required=True)
    parser.add_argument("--historical", type=Path, nargs="*", default=[])
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    args = parser.parse_args()
    print(json.dumps(baseline(args.current, args.historical, args.lat, args.lon), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
