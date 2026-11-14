import tempfile
import unittest
from pathlib import Path

import h5py
import numpy as np

from smap_baseline import baseline


class BaselineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def granule(self, year, moisture, quality=0):
        path = self.root / f"SMAP_L3_SM_P_E_{year}0702_R19240_004.h5"
        with h5py.File(path, "w") as file:
            group = file.create_group("Soil_Moisture_Retrieval_Data_AM")
            group["latitude"] = np.array([[10.77, 10.77], [10.86, 10.86]])
            group["longitude"] = np.array([[79.84, 79.93], [79.84, 79.93]])
            group["soil_moisture"] = np.full((2, 2), moisture)
            group["retrieval_qual_flag"] = np.full((2, 2), quality, dtype=np.int16)
        return path

    def test_five_years_and_quality_valid_current(self):
        current = self.granule(2026, 0.20, quality=8)
        history = [self.granule(year, 0.25) for year in range(2021, 2026)]
        result = baseline(current, history, 10.77, 79.84)
        self.assertEqual(result["status"], "usable")
        self.assertEqual(result["historical_valid_years"], 5)
        self.assertEqual(result["anomaly_m3m3"], -0.05)

    def test_bad_current_quality_does_not_make_anomaly(self):
        current = self.granule(2026, 0.20, quality=1)
        result = baseline(current, [], 10.77, 79.84)
        self.assertEqual(result["status"], "unavailable")
        self.assertIsNone(result["anomaly_m3m3"])

    def test_missing_history_does_not_make_baseline(self):
        current = self.granule(2026, 0.20)
        history = [self.granule(year, 0.25) for year in range(2022, 2026)]
        result = baseline(current, history, 10.77, 79.84)
        self.assertEqual(result["historical_valid_years"], 4)
        self.assertEqual(result["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
