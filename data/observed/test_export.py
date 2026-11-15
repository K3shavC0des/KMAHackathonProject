"""Check export masks and acquisition guards with small temporary granules."""
from pathlib import Path
import tempfile
import unittest

import h5py
import numpy as np

from export_nagapattinam import GRID, IDENT, export, validate_collection


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.before = Path(self.temp.name) / 'before.h5'
        self.after = Path(self.temp.name) / 'after.h5'
        for path, date, value in ((self.before, '2026-06-20T00:15:57', .4),
                                  (self.after, '2026-07-02T01:15:56+01:00', .3)):
            with h5py.File(path, 'w') as handle:
                grid = handle.create_group(GRID)
                grid['latitude'] = [10.645 + row * .03 + offset for row in range(6) for offset in (0, .01)]
                grid['longitude'] = [79.685 + col * .03 + offset for col in range(6) for offset in (0, .01)]
                grid['soilMoisture'] = np.full((12, 12), value)
                grid['soilMoisture'].attrs['units'] = 'meter^3/meter^3'
                grid['soilMoisture'].attrs['_FillValue'] = -9999.
                grid['retrievalQualityFlag'] = np.zeros((12, 12), dtype='int16')
                for key, item in dict(productType='SME2', trackNumber=84, frameNumber=4005,
                                      orbitPassDirection='Ascending', radarBand='L', lookDirection='Right',
                                      zeroDopplerStartTime=date, granuleId=path.stem).items():
                    handle[IDENT + key] = item

    def test_export_validates_and_normalizes_utc(self):
        result = export(self.before, self.after)
        schema = Path(__file__).resolve().parents[2] / 'contracts/area.schema.json'
        validate_collection(result, schema)
        self.assertEqual(len(result['areas']), 36)
        for area in result['areas']:
            change = area['observations'][0]
            self.assertAlmostEqual(change['value'], -.1)
            self.assertEqual(change['observed_at'], '2026-07-02T00:15:56Z')
            self.assertIn('4 identical matched', change['note'])

    def test_quality_fill_on_either_date_is_excluded(self):
        for path, cell, fill in ((self.before, (0, 0), -9998), (self.after, (0, 1), -9996)):
            with h5py.File(path, 'r+') as handle:
                quality = handle[GRID + 'retrievalQualityFlag']
                quality.attrs['_FillValue'] = fill
                quality[cell] = fill
        change = export(self.before, self.after)['areas'][0]['observations'][0]
        self.assertIn('2 identical matched', change['note'])
        self.assertAlmostEqual(change['value'], -.1)

    def test_empty_recommended_tile_rejected(self):
        with h5py.File(self.after, 'r+') as handle:
            handle[GRID + 'retrievalQualityFlag'][:2, :2] = 1
        with self.assertRaisesRegex(ValueError, 'No matched recommended'):
            export(self.before, self.after)

    def test_shifted_pair_rejected(self):
        with h5py.File(self.after, 'r+') as handle:
            handle[GRID + 'longitude'][:] += .001
        with self.assertRaisesRegex(ValueError, 'coordinate grids differ'):
            export(self.before, self.after)

    def test_nonmonotonic_pair_rejected(self):
        for path in (self.before, self.after):
            with h5py.File(path, 'r+') as handle:
                axis = handle[GRID + 'latitude'][:]
                axis[[1, 2]] = axis[[2, 1]]
                handle[GRID + 'latitude'][:] = axis
        with self.assertRaisesRegex(ValueError, 'monotonic'):
            export(self.before, self.after)

    def test_reverse_dates_rejected(self):
        with self.assertRaisesRegex(ValueError, 'chronological'):
            export(self.after, self.before)


if __name__ == '__main__':
    unittest.main()
