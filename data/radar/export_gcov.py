"""Export area summaries from reviewed, calibrated GCOV linear-power GeoTIFFs.

Input rasters must be extracted from the HH diagonal GCOV power layer, with
fill, quality failures and reviewed artifacts masked as nodata. Never use a
browse RGB image, complex covariance term, or a soil-moisture raster here.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import reproject, Resampling, transform_geom
from rasterio.transform import from_origin
from jsonschema import Draft7Validator, FormatChecker


def instant(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Acquisition times require UTC offsets')
    return result


def export(manifest_path, areas_path):
    manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    entries = manifest['rasters']
    if len(entries) not in (2, 4):
        raise ValueError('Supply L and S for one or two dates')
    ordered = {band: sorted([e for e in entries if e['band'] == band], key=lambda e: instant(e['observed_at'])) for band in ('L', 'S')}
    count = len(entries) // 2
    if any(len(v) != count for v in ordered.values()):
        raise ValueError('Both bands need the same number of dates')
    for band, items in ordered.items():
        if count == 2 and (instant(items[0]['observed_at']) >= instant(items[1]['observed_at']) or items[0]['processing_baseline'] != items[1]['processing_baseline']):
            raise ValueError('Each band requires ordered dates and a consistent processing baseline')
        for item in items:
            if item['polarization'] != 'HH' or item['convention'] not in ('gamma0', 'sigma0') or item.get('reviewed_calibration_and_mask') is not True:
                raise ValueError('Reviewed, calibrated and masked HH power is required')
            if not item['source_ref'].startswith(f'NISAR_{band}2_') or '_GCOV_' not in item['source_ref']:
                raise ValueError('Source references must identify GCOV granules')
            if not item['quality_note'].strip() or not item['processing_baseline'].strip():
                raise ValueError('Calibration baseline and actual mask/artifact review notes are required')
    if len({(e['track'], e['pass'], e['look'], e['convention']) for e in entries}) != 1:
        raise ValueError('Tracks, pass, look and backscatter convention must match')
    for i in range(count):
        if abs((instant(ordered['L'][i]['observed_at']) - instant(ordered['S'][i]['observed_at'])).total_seconds()) > 60:
            raise ValueError('L/S acquisitions must be within 60 seconds')
    datasets = []
    try:
        entries = ordered['L'] + ordered['S']
        for e in entries:
            path = (manifest_path.parent / e['path']).resolve()
            ds = rasterio.open(path)
            datasets.append(ds)
            if ds.count != 1 or not ds.crs or not ds.crs.is_projected or ds.crs.linear_units != 'metre' or ds.nodata is None:
                raise ValueError('Single-band projected metre rasters with explicit nodata are required')
        first = datasets[0]
        if any(ds.crs != first.crs for ds in datasets):
            raise ValueError('Prepare all input rasters in the same projected metre CRS')
        resolution = max([float(e['effective_resolution_m']) for e in entries] + [max(abs(ds.res[0]), abs(ds.res[1])) for ds in datasets])
        if not np.isfinite(resolution) or resolution <= 0:
            raise ValueError('Invalid effective resolution')
        width = int(np.ceil((first.bounds.right - first.bounds.left) / resolution))
        height = int(np.ceil((first.bounds.top - first.bounds.bottom) / resolution))
        if width * height > 4_000_000:
            raise ValueError('Subset input rasters to the pilot AOI before export (maximum 4 million common cells)')
        transform = from_origin(first.bounds.left, first.bounds.top, resolution, resolution)
        powers = []
        for ds in datasets:
            source = ds.read(1, masked=True).astype('float64').filled(np.nan)
            source[~np.isfinite(source) | (source <= 0)] = np.nan
            destination = np.full((height, width), np.nan)
            reproject(source, destination, src_transform=ds.transform, src_crs=ds.crs, src_nodata=np.nan,
                      dst_transform=transform, dst_crs=first.crs, dst_nodata=np.nan, resampling=Resampling.average)
            powers.append(destination)
        common = np.logical_and.reduce([np.isfinite(p) & (p > 0) for p in powers])
        areas = json.loads(areas_path.read_text(encoding='utf-8-sig'))['areas']
        output = []
        for area in areas:
            polygon = transform_geom('EPSG:4326', first.crs, area['geometry'])
            inside = geometry_mask([polygon], (height, width), transform, invert=True)
            valid = inside & common
            total, matched = int(inside.sum()), int(valid.sum())
            if not matched:
                continue
            bands = []
            for b, band in enumerate(('L', 'S')):
                samples = []
                for i, e in enumerate(ordered[band]):
                    # Average linear power first; only then convert to dB.
                    db = float(10 * np.log10(powers[b * count + i][valid].mean()))
                    samples.append(dict(observed_at=e['observed_at'], mean_db=db, source_ref=e['source_ref'],
                                        processing_baseline=e['processing_baseline'], matched_cells=matched,
                                        coverage=matched / total, quality_note=e['quality_note']))
                bands.append(dict(band=band, polarization='HH', convention=entries[0]['convention'],
                                  effective_resolution_m=max(float(e['effective_resolution_m']) for e in ordered[band]),
                                  common_grid_m=resolution, quality='screened', samples=samples))
            output.append(dict(area_id=area['area_id'], geometry=area['geometry'],
                               land_cover_source=manifest.get('land_cover_sources', {}).get(area['area_id']), bands=bands))
        if not output:
            raise ValueError('No usable common cells in the selected areas')
        result = dict(schema_version='1.0.0', dataset='observed', status='paired' if count == 2 else 'single_date',
                      reason='Reviewed GCOV HH backscatter on a common grid and common valid-cell mask; historical analysis areas.', areas=output)
        schema = Path(__file__).resolve().parents[2] / 'contracts/radar.schema.json'
        Draft7Validator(json.loads(schema.read_text()), format_checker=FormatChecker()).validate(result)
        return result
    finally:
        for ds in datasets:
            ds.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--areas', type=Path, default=Path('data/observed/nagapattinam-areas.json'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = export(args.manifest.resolve(), args.areas)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
