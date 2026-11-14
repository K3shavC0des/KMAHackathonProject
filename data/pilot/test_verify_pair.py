import json
from pathlib import Path
import tempfile
import unittest

import h5py
import numpy as np

from verify_pair import GRID, verify_pair


class PairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def granule(self, name, moisture, longitude=(79.75, 79.78), fill=-9999., quality=(0, 0)):
        path = self.root / name
        with h5py.File(path, 'w') as file:
            grid = file.create_group(GRID)
            grid['latitude'] = [10.73]
            grid['longitude'] = longitude
            grid['soilMoisture'] = np.array([moisture])
            grid['soilMoisture'].attrs['_FillValue'] = fill
            grid['retrievalQualityFlag'] = np.array([quality], dtype=np.int16)
            grid['retrievalQualityFlag'].attrs['_FillValue'] = -9998
            grid['ancillaryData/waterbodyFraction'] = np.zeros((1, 2))
            file['science/LSAR/identification/granuleId'] = np.bytes_(name)
        return str(path)

    def test_equal_shapes_with_shifted_coordinates_are_not_compared(self):
        before = self.granule('before.h5', [.3, .4])
        after = self.granule('after.h5', [.2, .3], longitude=(79.76, 79.79))
        result = verify_pair(before, after, (79.74, 10.70, 79.80, 10.76))
        self.assertEqual(result['evidence_status'], 'no_comparable_grid_window')
        self.assertNotIn('delta_median_m3m3', result)

    def test_each_products_fill_and_nonfinite_values_are_excluded(self):
        before = self.granule('before.h5', [.3, -8888.], fill=-8888.)
        after = self.granule('after.h5', [.2, .4])
        result = verify_pair(before, after, (79.74, 10.70, 79.80, 10.76))
        self.assertEqual(result['matched_recommended_pixels'], 1)
        self.assertAlmostEqual(result['delta_median_m3m3'], -.1)
        self.granule('before.h5', [.3, float('nan')])
        result = verify_pair(before, after, (79.74, 10.70, 79.80, 10.76))
        self.assertEqual(result['matched_recommended_pixels'], 1)
        json.dumps(result, allow_nan=False)

    def test_quality_fill_is_not_recommended(self):
        before = self.granule('before.h5', [.3, .4], quality=(0, -9998))
        after = self.granule('after.h5', [.2, .3])
        result = verify_pair(before, after, (79.74, 10.70, 79.80, 10.76))
        self.assertEqual(result['matched_recommended_pixels'], 1)

    def test_reversed_bounds_are_rejected(self):
        with self.assertRaises(ValueError):
            verify_pair('unused', 'unused', (80., 10.7, 79., 10.8))


if __name__ == '__main__':
    unittest.main()
