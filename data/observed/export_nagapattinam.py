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
# Development analysis grid only: this is not a farm-boundary dataset.
REGION_BOUNDS = (79.68, 10.64, 79.86, 10.82)
TILE_DEGREES = 0.03
CITY_BOUNDS = {
    'nagapattinam': REGION_BOUNDS,
    'ludhiana': (75.76, 30.81, 75.94, 30.99),
    'ahmedabad': (72.49, 22.93, 72.67, 23.11),
    'nairobi': (36.70, -1.40, 36.95, -1.15),
}


def analysis_tiles(bounds=REGION_BOUNDS, tile_degrees=TILE_DEGREES):
    """Return stable west-to-east, south-to-north regional analysis squares."""
    west, south, east, north = bounds
    columns = round((east - west) / tile_degrees)
    rows = round((north - south) / tile_degrees)
    if columns <= 0 or rows <= 0 or abs(west + columns * tile_degrees - east) > 1e-9 or abs(south + rows * tile_degrees - north) > 1e-9:
        raise ValueError('Region bounds must divide evenly into analysis squares')
    return [
        (f'r{row + 1:02}c{column + 1:02}', round(west + column * tile_degrees, 6), round(south + row * tile_degrees, 6), round(west + (column + 1) * tile_degrees, 6), round(south + (row + 1) * tile_degrees, 6))
        for row in range(rows) for column in range(columns)
    ]


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


def native_cell_tiles(lat, lon, bounds):
    """Pixel footprints from axis midpoints; retain real grid spacing and gaps."""
    def edges(axis):
        axis = np.sort(axis.astype(float))
        if len(axis) < 2:
            raise ValueError('Need at least two coordinates to infer cell edges')
        return axis, np.r_[axis[0] - (axis[1] - axis[0]) / 2,
                           (axis[:-1] + axis[1:]) / 2,
                           axis[-1] + (axis[-1] - axis[-2]) / 2]
    ys, ye = edges(lat)
    xs, xe = edges(lon)
    west, south, east, north = bounds
    for row in np.flatnonzero((ys >= south) & (ys < north)):
        for col in np.flatnonzero((xs >= west) & (xs < east)):
            yield (f'r{row + 1:02}c{col + 1:02}', float(xe[col]), float(ye[row]),
                   float(xe[col + 1]), float(ye[row + 1]))


def export(earlier, later, city='nagapattinam', skip_unavailable=False, pixel_cells=False):
    import h5py

    bounds = CITY_BOUNDS[city]
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
        for axis in (lat, lon):
            if not np.isfinite(axis).all() or not (np.all(np.diff(axis) > 0) or np.all(np.diff(axis) < 0)):
                raise ValueError('Expected finite strictly monotonic coordinate axes')
        # NISAR zero-Doppler acquisition times are UTC; some files omit the Z.
        dates = [utc_timestamp(scalar(handle, 'zeroDopplerStartTime')) for handle in [before, after]]
        if datetime.fromisoformat(dates[0].replace('Z', '+00:00')) >= datetime.fromisoformat(dates[1].replace('Z', '+00:00')):
            raise ValueError('Inputs must be in chronological order')
        ids = [scalar(handle, 'granuleId') for handle in [before, after]]
        # Cache each raster once: reading HDF5 compressed chunks per pixel is costly.
        cached_values = [handle[GRID + 'soilMoisture'][:] for handle in [before, after]]
        cached_flags = [handle[GRID + 'retrievalQualityFlag'][:] for handle in [before, after]]
        tiles = native_cell_tiles(lat, lon, bounds) if pixel_cells else analysis_tiles(bounds)
        for tile, west, south, east, north in tiles:
            # Half-open bounds prevent shared-edge cells from appearing twice.
            rows = np.flatnonzero((lat >= south) & (lat < north))
            cols = np.flatnonzero((lon >= west) & (lon < east))
            if not len(rows) or not len(cols):
                if skip_unavailable:
                    continue
                raise ValueError(f'No grid coverage for tile {tile}')
            region = np.s_[rows.min():rows.max()+1, cols.min():cols.max()+1]
            values, masks = [], []
            for index, handle in enumerate([before, after]):
                dataset = handle[GRID + 'soilMoisture']
                unit = dataset.attrs['units']
                if isinstance(unit, bytes):
                    unit = unit.decode()
                if unit != 'meter^3/meter^3':
                    raise ValueError('Unexpected soil moisture units')
                value = cached_values[index][region]
                quality = handle[GRID + 'retrievalQualityFlag']
                flag = cached_flags[index][region]
                masks.append(np.isfinite(value) & (value != dataset.attrs['_FillValue'])
                             & (flag != quality.attrs.get('_FillValue', -9999)) & ((flag & 1) == 0))
                values.append(value)
            matched = masks[0] & masks[1]
            count = int(matched.sum())
            if not count:
                if skip_unavailable:
                    continue
                raise ValueError(f'No matched recommended cells in tile {tile}')
            delta = float(np.median(values[1][matched] - values[0][matched]))
            area_id = f'{city}-{"pixel" if pixel_cells else "analysis"}-{tile}'
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
            row, column = map(int, tile[1:].split('c'))
            label_kind = 'pixel' if pixel_cells else 'analysis square'
            if pixel_cells:
                note = note.replace('Analysis tile,', 'Native grid cell; footprint inferred from coordinate midpoints,')
                for item in observations:
                    item['note'] = note
            areas.append(dict(area_id=area_id, label=f'{city.title()} satellite {label_kind} — row {row}, column {column}',
                geometry=dict(type='Polygon', coordinates=[[[west, south], [east, south], [east, north], [west, north], [west, south]]]),
                crop_stage='unknown', observations=observations))
    if not areas:
        raise ValueError('No matched recommended cells in city window')
    return dict(schema_version='1.0.0', areas=areas)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('earlier', type=Path)
    parser.add_argument('later', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--city', choices=CITY_BOUNDS, default='nagapattinam')
    parser.add_argument('--skip-unavailable', action='store_true', help='Omit tiles without matched recommended cells; never impute values')
    parser.add_argument('--pixel-cells', action='store_true', help='Export each matched native pixel instead of 0.03 degree aggregates')
    parser.add_argument('--schema', type=Path, default=Path(__file__).resolve().parents[2] / 'contracts/area.schema.json')
    args = parser.parse_args()
    collection = validate_collection(export(args.earlier, args.later, args.city, args.skip_unavailable, args.pixel_cells), args.schema)
    if args.pixel_cells:
        # One compact record per line keeps large derived grids reviewable.
        serialized = '{"schema_version":"1.0.0","areas":[\n' + ',\n'.join(
            json.dumps(area, separators=(',', ':'), allow_nan=False)
            for area in collection['areas']) + '\n]}\n'
    else:
        serialized = json.dumps(collection, indent=2, allow_nan=False) + '\n'
    args.output.write_text(serialized, encoding='utf-8')
