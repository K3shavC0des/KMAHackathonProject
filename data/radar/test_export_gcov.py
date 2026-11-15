"""Synthetic raster checks; these are not observed NISAR evidence."""
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform_geom
from export_gcov import export


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manifest = self.root / 'manifest.json'
        self.areas = self.root / 'areas.json'
        geometry = transform_geom('EPSG:32644', 'EPSG:4326', dict(type='Polygon', coordinates=[[[500000,1200000],[500160,1200000],[500160,1199840],[500000,1199840],[500000,1200000]]]))
        self.areas.write_text(json.dumps(dict(areas=[dict(area_id='synthetic-test', geometry=geometry)])))
        self.entries = []
        for band in ('L', 'S'):
            for i, day in enumerate(('02', '14')):
                name = f'{band}-{day}.tif'
                values = np.full((2, 2), 1 if i == 0 else 10, dtype='float32')
                if band == 'S' and i == 1:
                    values[0, 0] = -9999
                with rasterio.open(self.root / name, 'w', driver='GTiff', width=2, height=2, count=1, dtype='float32', crs='EPSG:32644', transform=from_origin(500000,1200000,80,80), nodata=-9999) as ds:
                    ds.write(values, 1)
                self.entries.append(dict(path=name, band=band, polarization='HH', observed_at=f'2026-07-{day}T00:15:00Z', track=84,
                                         **{'pass': 'Ascending'}, look='Right', convention='gamma0', effective_resolution_m=80,
                                         source_ref=f'NISAR_{band}2_PR_GCOV_TEST_{day}', processing_baseline='TEST',
                                         quality_note='Synthetic mask', reviewed_calibration_and_mask=True))

    def run_export(self):
        self.manifest.write_text(json.dumps(dict(rasters=self.entries)))
        return export(self.manifest, self.areas)

    def test_common_mask_db_and_change(self):
        result = self.run_export()
        self.assertEqual(result['status'], 'paired')
        for band in result['areas'][0]['bands']:
            self.assertEqual(band['samples'][0]['matched_cells'], 3)
            self.assertEqual(band['samples'][0]['coverage'], .75)
            self.assertAlmostEqual(band['samples'][1]['mean_db'] - band['samples'][0]['mean_db'], 10)

    def test_average_power_before_db(self):
        for e in self.entries:
            with rasterio.open(self.root / e['path'], 'r+') as ds:
                ds.write(np.array([[1, 1], [1, 100]], dtype='float32'), 1)
            e['effective_resolution_m'] = 160
        result = self.run_export()
        sample = result['areas'][0]['bands'][0]['samples'][0]
        self.assertAlmostEqual(sample['mean_db'], 10 * np.log10(25.75), places=6)
        self.assertEqual(sample['matched_cells'], 1)

    def test_single_date(self):
        self.entries = [self.entries[0], self.entries[2]]
        self.assertEqual(self.run_export()['status'], 'single_date')

    def test_reject_unreviewed_mismatched_and_incomplete(self):
        originals = json.loads(json.dumps(self.entries))
        for key, value in [('reviewed_calibration_and_mask', False), ('polarization', 'HV'), ('convention', 'sigma0'), ('processing_baseline', 'DIFFERENT'), ('observed_at', '2026-07-20T00:15:00Z')]:
            self.entries = json.loads(json.dumps(originals))
            self.entries[-1][key] = value
            with self.assertRaises(ValueError):
                self.run_export()
        self.entries = originals[:3]
        with self.assertRaises(ValueError):
            self.run_export()


if __name__ == '__main__':
    unittest.main()
