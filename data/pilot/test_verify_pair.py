"""Exercise pair rejection and QC using small temporary HDF5 granules."""
import json
from pathlib import Path
import tempfile
import unittest

import h5py
import numpy as np

from verify_pair import GRID, IDENT, verify


class PairTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.before = Path(self.directory.name) / "before.h5"
        self.after = Path(self.directory.name) / "after.h5"
        self.bbox = (79.0, 10.0, 81.0, 12.0)
        for path, date, values in (
            (self.before, "2026-06-20T00:15:57", [[0.3, 0.4], [0.5, 0.6]]),
            (self.after, "2026-07-02T00:15:56Z", [[0.2, 0.3], [0.4, 0.5]]),
        ):
            with h5py.File(path, "w") as handle:
                grid = handle.create_group(GRID)
                grid["latitude"] = [10.5, 11.5]
                grid["longitude"] = [79.5, 80.5]
                moisture = grid.create_dataset("soilMoisture", data=values)
                moisture.attrs["_FillValue"] = -9999.0
                moisture.attrs["units"] = "meter^3/meter^3"
                grid["retrievalQualityFlag"] = np.zeros((2, 2), dtype="uint8")
                grid["ancillaryData/waterbodyFraction"] = np.zeros((2, 2))
                ident = handle.create_group(IDENT)
                for key, value in dict(productType="SME2", trackNumber=84, frameNumber=4005,
                                       orbitPassDirection="Ascending", radarBand="L", lookDirection="Right",
                                       zeroDopplerStartTime=date, granuleId=path.stem).items():
                    ident[key] = value

    def run_pair(self):
        return verify(str(self.before), str(self.after), self.bbox)

    def test_aligned_pair(self):
        result = self.run_pair()
        self.assertEqual(result["matched_recommended_pixels"], 4)
        self.assertAlmostEqual(result["delta_median_m3m3"], -0.1)
        json.dumps(result, allow_nan=False)

    def test_same_shape_shifted_coordinates_rejected(self):
        with h5py.File(self.after, "r+") as handle:
            handle[GRID + "longitude"][:] = [79.6, 80.6]
        with self.assertRaisesRegex(ValueError, "coordinate grids differ"):
            self.run_pair()

    def test_metadata_mismatch_rejected(self):
        for key, value in (("trackNumber", 85), ("frameNumber", 4006), ("radarBand", "S"),
                           ("lookDirection", "Left"), ("productType", "GCOV"), ("orbitPassDirection", "Descending")):
            with self.subTest(key=key):
                with h5py.File(self.after, "r+") as handle:
                    original = handle[IDENT + key][()]
                    del handle[IDENT + key]
                    handle[IDENT + key] = value
                with self.assertRaisesRegex(ValueError, key):
                    self.run_pair()
                with h5py.File(self.after, "r+") as handle:
                    del handle[IDENT + key]
                    handle[IDENT + key] = original

    def test_reverse_dates_rejected(self):
        with self.assertRaisesRegex(ValueError, "chronological"):
            verify(str(self.after), str(self.before), self.bbox)

    def test_units_rejected(self):
        with h5py.File(self.after, "r+") as handle:
            handle[GRID + "soilMoisture"].attrs["units"] = "percent"
        with self.assertRaisesRegex(ValueError, "units"):
            self.run_pair()

    def test_per_dataset_fill_and_nonfinite_excluded(self):
        with h5py.File(self.before, "r+") as handle:
            handle[GRID + "soilMoisture"][0, 0] = -1234
            handle[GRID + "soilMoisture"].attrs["_FillValue"] = -1234
            handle[GRID + "soilMoisture"][1, 0] = np.nan
        with h5py.File(self.after, "r+") as handle:
            handle[GRID + "soilMoisture"][0, 1] = np.inf
        result = self.run_pair()
        self.assertEqual(result["matched_recommended_pixels"], 1)
        self.assertEqual(result["earlier"]["valid_any_pixels"], 2)
        self.assertEqual(result["later"]["valid_any_pixels"], 3)
        self.assertAlmostEqual(result["delta_median_m3m3"], -0.1)
        json.dumps(result, allow_nan=False)

    def test_quality_excluded_on_either_date(self):
        with h5py.File(self.before, "r+") as handle:
            handle[GRID + "retrievalQualityFlag"][0, 0] = 1
        with h5py.File(self.after, "r+") as handle:
            handle[GRID + "retrievalQualityFlag"][0, 1] = 1
        self.assertEqual(self.run_pair()["matched_recommended_pixels"], 2)

    def test_no_valid_matches(self):
        with h5py.File(self.after, "r+") as handle:
            handle[GRID + "retrievalQualityFlag"][:] = 1
        result = self.run_pair()
        self.assertEqual(result["matched_recommended_pixels"], 0)
        self.assertIsNone(result["delta_median_m3m3"])

    def test_quality_fill_excluded_on_either_date(self):
        for path, cell, fill in ((self.before, (0, 0), 254), (self.after, (0, 1), 252)):
            with h5py.File(path, "r+") as handle:
                quality = handle[GRID + "retrievalQualityFlag"]
                quality.attrs["_FillValue"] = fill
                quality[cell] = fill
        result = self.run_pair()
        self.assertEqual(result["matched_recommended_pixels"], 2)
        for date in ("earlier", "later"):
            self.assertEqual(result[date]["valid_recommended_pixels"], 3)
            self.assertEqual(result[date]["valid_any_pixels"], 3)

    def test_no_coverage(self):
        result = verify(str(self.before), str(self.after), (0, 0, 1, 1))
        self.assertEqual(result["evidence_status"], "no_comparable_grid_window")

    def test_invalid_bounds_rejected(self):
        for bounds in ((81, 10, 79, 12), (float("nan"), 10, 79, 12)):
            with self.subTest(bounds=bounds), self.assertRaisesRegex(ValueError, "WGS84"):
                verify(str(self.before), str(self.after), bounds)


if __name__ == "__main__":
    unittest.main()
