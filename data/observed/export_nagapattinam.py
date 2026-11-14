"""Export observed NISAR tiles; raw HDF5 inputs stay outside Git."""
import argparse
from datetime import datetime, timezone
import json
import re
from pathlib import Path

import numpy as np
from jsonschema import Draft202012Validator, FormatChecker

GRID = 'science/LSAR/SME2/grids/'
IDENT = 'science/LSAR/identification/'
TILES = [('sw', 79.74, 10.70, 79.77, 10.73), ('se', 79.77, 10.70, 79.80, 10.73),
         ('nw', 79.74, 10.73, 79.77, 10.76), ('ne', 79.77, 10.73, 79.80, 10.76)]


def validate_collection(collection, schema_path):
    schema = json.loads(Path(schema_path).read_text(encoding='utf-8-sig'))
    Draft202012Validator.check_schema(schema)
    # JSON serialization rejects NaN/Infinity, which Python's JSON parser permits.
    json.dumps(collection, allow_nan=False)
    checker = FormatChecker()

    @checker.checks('date-time', raises=ValueError)
    def timestamp(value):
        if not isinstance(value, str):
            return True  # JSON Schema's type rule reports nonstrings.
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})', value):
            return False
        datetime.fromisoformat(value.upper().replace('Z', '+00:00'))
        return True

    Draft202012Validator(schema, format_checker=checker).validate(collection)
    return collection


def scalar(handle, name):
    value = handle[IDENT + name][()]
    return value.decode() if isinstance(value, bytes) else value.item() if isinstance(value, np.generic) else value


def utc_timestamp(value):
    """Normalize NISAR's UTC acquisition timestamp for the area contract."""
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def export(earlier, later):
    import h5py

    areas = []
    with h5py.File(earlier) as before, h5py.File(later) as after:
        for key in ['productType', 'trackNumber', 'frameNumber', 'orbitPassDirection', 'radarBand', 'lookDirection']:
            if scalar(before, key) != scalar(after, key):
                raise ValueError(f'Incomparable pair: {key}')
        lat, lon = before[GRID + 'latitude'][:], before[GRID + 'longitude'][:]
        if not all(np.array_equal(before[GRID + key][:], after[GRID + key][:]) for key in ['latitude', 'longitude']):
            raise ValueError('Pair coordinate grids differ')
        if lat.ndim != 1 or lon.ndim != 1:
            raise ValueError('Expected geographic one-dimensional coordinate axes')
        # NISAR zero-Doppler acquisition times are UTC; some files omit the Z.
        dates = [utc_timestamp(scalar(handle, 'zeroDopplerStartTime')) for handle in [before, after]]
        if datetime.fromisoformat(dates[0].replace('Z', '+00:00')) >= datetime.fromisoformat(dates[1].replace('Z', '+00:00')):
            raise ValueError('Inputs must be in chronological order')
        ids = [scalar(handle, 'granuleId') for handle in [before, after]]
        for tile, west, south, east, north in TILES:
            # Half-open bounds prevent shared-edge cells from appearing twice.
            rows = np.flatnonzero((lat >= south) & (lat < north))
            cols = np.flatnonzero((lon >= west) & (lon < east))
            if not len(rows) or not len(cols):
                raise ValueError(f'No grid coverage for tile {tile}')
            region = np.s_[rows.min():rows.max()+1, cols.min():cols.max()+1]
            values, masks = [], []
            for handle in [before, after]:
                dataset = handle[GRID + 'soilMoisture']
                if dataset.attrs['units'].decode() != 'meter^3/meter^3':
                    raise ValueError('Unexpected soil moisture units')
                value = dataset[region]
                flag = handle[GRID + 'retrievalQualityFlag'][region]
                masks.append(np.isfinite(value) & (value != dataset.attrs['_FillValue']) & ((flag & 1) == 0))
                values.append(value)
            matched = masks[0] & masks[1]
            count = int(matched.sum())
            if not count:
                raise ValueError(f'No matched recommended cells in tile {tile}')
            delta = float(np.median(values[1][matched] - values[0][matched]))
            area_id = f'nagapattinam-analysis-{tile}'
            note = (f'{count} identical matched recommended cells; retrievalQualityFlag bit 0=0 on both dates. '
                    'Analysis tile, not a field or verified crop mask. Surface retrieval only. '
                    'Crop stage unknown; SMAP seasonal context unavailable.')

            def observation(suffix, metric, value, date, source):
                return dict(observation_id=f'{area_id}-{suffix}', source='NISAR_SME2', metric=metric,
                            value=value, unit='m3/m3', observed_at=date, spatial_scale='local',
                            quality='valid', data_status='observed', source_ref=source, note=note)

            observations = [observation('change', 'soil_moisture_change', delta, dates[1], ' ; '.join(ids))]
            for index in [0, 1]:
                observations.append(observation(f'date-{index}', 'soil_moisture',
                    float(np.median(values[index][matched])), dates[index], ids[index]))
            areas.append(dict(area_id=area_id, label=f'Nagapattinam analysis tile {tile.upper()} (observed)',
                geometry=dict(type='Polygon', coordinates=[[[west, south], [east, south], [east, north], [west, north], [west, south]]]),
                crop_stage='unknown', observations=observations))
    return dict(schema_version='1.0.0', areas=areas)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('earlier', type=Path)
    parser.add_argument('later', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--schema', type=Path, default=Path(__file__).resolve().parents[2] / 'contracts/area.schema.json')
    args = parser.parse_args()
    collection = validate_collection(export(args.earlier, args.later), args.schema)
    args.output.write_text(json.dumps(collection, indent=2, allow_nan=False) + '\n', encoding='utf-8')
