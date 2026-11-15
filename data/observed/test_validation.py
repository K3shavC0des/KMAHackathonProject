"""Run: python -m unittest discover -s data/observed -p test_validation.py."""
import copy
import json
import os
from pathlib import Path
import unittest

from jsonschema import ValidationError
from export_nagapattinam import REGION_BOUNDS, analysis_tiles, validate_collection


class ContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.schema = Path(os.environ.get('FMW_AREA_SCHEMA', root / 'contracts/area.schema.json'))
        self.collection = json.loads((Path(__file__).parent / 'nagapattinam-areas.json').read_text())

    def test_observed_export_passes(self):
        validate_collection(self.collection, self.schema)

    def test_invalid_metadata_rejected(self):
        for key, value in [('unit', 'percent'), ('observed_at', 'yesterday'),
                           ('quality', 'probably'), ('data_status', 'real')]:
            with self.subTest(key=key):
                changed = copy.deepcopy(self.collection)
                changed['areas'][0]['observations'][0][key] = value
                with self.assertRaises(ValidationError):
                    validate_collection(changed, self.schema)

    def test_missing_provenance_rejected(self):
        del self.collection['areas'][0]['observations'][0]['source_ref']
        with self.assertRaises(ValidationError):
            validate_collection(self.collection, self.schema)

    def test_nonfinite_value_rejected(self):
        self.collection['areas'][0]['observations'][0]['value'] = float('nan')
        with self.assertRaises(ValueError):
            validate_collection(self.collection, self.schema)

    def test_unknown_fields_rejected(self):
        self.collection['areas'][0]['unexpected'] = True
        with self.assertRaises(ValidationError):
            validate_collection(self.collection, self.schema)

    def test_regional_grid_is_a_contiguous_six_by_six_analysis_grid(self):
        tiles = analysis_tiles()
        self.assertEqual(len(tiles), 36)
        self.assertEqual(tiles[0], ('r01c01', 79.68, 10.64, 79.71, 10.67))
        self.assertEqual(tiles[-1], ('r06c06', 79.83, 10.79, 79.86, 10.82))
        self.assertEqual(REGION_BOUNDS, (79.68, 10.64, 79.86, 10.82))
