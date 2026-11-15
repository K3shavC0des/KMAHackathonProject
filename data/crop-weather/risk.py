"""Experimental district screening from NISAR changes and NASA POWER heat."""
import json
import argparse
import statistics
import urllib.request
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AREAS = ROOT / 'data/observed/nagapattinam-areas.json'
POWER = 'https://power.larc.nasa.gov/api/temporal/daily/point'
LAT, LON = 10.73, 79.77


def seven_day_keys(end):
    return [(end - timedelta(days=offset)).strftime('%Y%m%d') for offset in range(6, -1, -1)]


def mean_for(values, end):
    week = [values.get(key) for key in seven_day_keys(end)]
    if any(not isinstance(value, (int, float)) or value <= -900 for value in week):
        return None
    return statistics.mean(week)


def total_for(values, end):
    week = [values.get(key) for key in seven_day_keys(end)]
    if any(not isinstance(value, (int, float)) or value <= -900 for value in week):
        return None
    return sum(week)


def screen(changes, current, historical, clear_change_fraction=None):
    if not changes or current is None or len(historical) < 20:
        raise ValueError('Need matched NISAR cells and at least 20 complete baseline years')
    drying_fraction = sum(value <= -0.02 for value in changes) / len(changes)
    heat_percentile = sum(value <= current for value in historical) / len(historical)
    level = ('elevated' if heat_percentile >= .9 and drying_fraction >= .5
             and clear_change_fraction is not None and clear_change_fraction >= .1 else
             'watch' if heat_percentile >= .75 and drying_fraction >= .3 else 'limited')
    return level, drying_fraction, heat_percentile


def nisar_uncertainty(earlier_path, later_path):
    import h5py
    import numpy as np
    grid = 'science/LSAR/SME2/grids/'
    with h5py.File(earlier_path) as earlier, h5py.File(later_path) as later:
        lat = earlier[grid + 'latitude'][:]
        lon = earlier[grid + 'longitude'][:]
        if not np.array_equal(lat, later[grid + 'latitude'][:]) or not np.array_equal(lon, later[grid + 'longitude'][:]):
            raise ValueError('NISAR uncertainty grids do not match')
        rows = np.flatnonzero((lat >= 10.64) & (lat < 10.82))
        cols = np.flatnonzero((lon >= 79.68) & (lon < 79.86))
        window = np.ix_(rows, cols)
        values, uncertainties, masks = [], [], []
        for handle in (earlier, later):
            soil = handle[grid + 'soilMoisture'][:][window]
            uncertainty = handle[grid + 'soilMoistureUncertainty'][:][window]
            flag = handle[grid + 'retrievalQualityFlag'][:][window]
            valid = (np.isfinite(soil) & np.isfinite(uncertainty) &
                     (soil != handle[grid + 'soilMoisture'].attrs['_FillValue']) &
                     (uncertainty != handle[grid + 'soilMoistureUncertainty'].attrs['_FillValue']) &
                     (flag != handle[grid + 'retrievalQualityFlag'].attrs.get('_FillValue', -9999)) &
                     ((flag & 1) == 0))
            values.append(soil)
            uncertainties.append(uncertainty)
            masks.append(valid)
        matched = masks[0] & masks[1]
        if not matched.any():
            raise ValueError('No quality-matched cells with uncertainty')
        return {'matched_cells': int(matched.sum()),
                'median_per_date_uncertainty_m3m3': [float(np.median(u[matched])) for u in uncertainties],
                'fraction_change_exceeds_sum_of_uncertainties': float(np.mean(
                    np.abs(values[1][matched] - values[0][matched]) >
                    uncertainties[0][matched] + uncertainties[1][matched]))}


def build_report(raw_pair=None):
    collection = json.loads(AREAS.read_text(encoding='utf-8'))
    cells = [area for area in collection['areas'] if area['observations'][0]['source'] == 'NISAR_SME2'
             and len(area['observations']) >= 3]
    readings = [area['observations'][0] for area in cells]
    readings = [item for item in readings if item['source'] == 'NISAR_SME2'
                and item['metric'] == 'soil_moisture_change' and item['quality'] == 'valid'
                and item['data_status'] == 'observed']
    changes = [item['value'] for item in readings]
    dates = {item['observed_at'][:10] for item in readings}
    if len(dates) != 1:
        raise ValueError('Expected one common NISAR comparison date')
    end = date.fromisoformat(dates.pop())
    url = (f'{POWER}?parameters=T2M_MAX,RH2M,PRECTOTCORR&community=AG&longitude={LON}&latitude={LAT}'
           f'&start=19910101&end={end:%Y%m%d}&format=JSON&time-standard=LST')
    with urllib.request.urlopen(url, timeout=45) as response:
        payload = json.load(response)
    expected = {'T2M_MAX': 'C', 'RH2M': '%', 'PRECTOTCORR': 'mm/day'}
    if any(payload.get('parameters', {}).get(key, {}).get('units') != unit for key, unit in expected.items()):
        raise ValueError('Unexpected weather units')
    series = payload['properties']['parameter']
    temperatures = series['T2M_MAX']
    current = mean_for(temperatures, end)
    historical = [mean_for(temperatures, end.replace(year=year)) for year in range(1991, 2021)]
    historical = [value for value in historical if value is not None]
    humidity = mean_for(series['RH2M'], end)
    rain = total_for(series['PRECTOTCORR'], end)
    if humidity is None or rain is None:
        raise ValueError('Missing current humidity or rainfall')
    historical_rain = [total_for(series['PRECTOTCORR'], end.replace(year=year)) for year in range(1991, 2021)]
    historical_rain = [value for value in historical_rain if value is not None]
    rice_season_possible = end.month in (6, 7)
    uncertainty = nisar_uncertainty(*raw_pair) if raw_pair else None
    if uncertainty and uncertainty['matched_cells'] != len(changes):
        raise ValueError('Uncertainty mask does not match exported cells')
    clear_fraction = uncertainty['fraction_change_exceeds_sum_of_uncertainties'] if uncertainty else None
    level, drying_fraction, percentile = screen(changes, current, historical, clear_fraction)
    return {
        'status': 'experimental_screening', 'place': 'Nagapattinam, Tamil Nadu',
        'date': end.isoformat(), 'concern': level,
        'nisar': {'matched_cells': len(changes), 'median_change_m3m3': statistics.median(changes),
                  'median_earlier_m3m3': statistics.median(area['observations'][1]['value'] for area in cells),
                  'median_later_m3m3': statistics.median(area['observations'][2]['value'] for area in cells),
                  'fraction_at_least_2_points_drier': drying_fraction,
                  'earlier_date': cells[0]['observations'][1]['observed_at'][:10],
                  'later_date': end.isoformat(),
                  'uncertainty': uncertainty,
                  'source': 'data/observed/nagapattinam-areas.json'},
        'temperature': {'seven_day_mean_daily_max_c': current,
                        'baseline_median_c': statistics.median(historical),
                        'baseline_years': len(historical), 'percentile': percentile,
                        'seven_day_mean_humidity_percent': humidity,
                        'seven_day_rain_mm': rain,
                        'baseline_rain_median_mm': statistics.median(historical_rain),
                        'point_lat_lon': [LAT, LON], 'source': url},
        'crop_context': {'candidates': [
            {'name': 'Rice', 'season_possible': rice_season_possible,
             'source': 'https://www.agritech.tnau.ac.in/expert_system/paddy/seasonvariety.html'},
            {'name': 'Black gram', 'season_possible': end.month in (6, 7, 8),
             'source': 'https://tnagriculture.in/dashboard/report/26_02.pdf'}],
            'field_crop_verified': False, 'growth_stage': 'unknown'},
        'meaning': ('Hot weather is unusually high for this week. Many NISAR point estimates fell, '
                    'but most changes are smaller than the sum of the two per-date uncertainty estimates. '
                    'Rice or black gram may be in season; confirm the actual crop and soil conditions locally.'),
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--earlier-h5', type=Path)
    parser.add_argument('--later-h5', type=Path)
    args = parser.parse_args()
    if bool(args.earlier_h5) != bool(args.later_h5):
        parser.error('Supply both HDF5 dates for uncertainty, or neither')
    output = Path(__file__).with_name('nagapattinam-report.json')
    pair = (args.earlier_h5, args.later_h5) if args.earlier_h5 else None
    report = build_report(pair)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    collection = json.loads(AREAS.read_text(encoding='utf-8'))
    image_cells = [
        [round(ring[0][0], 6), round(ring[0][1], 6),
         round(ring[2][0], 6), round(ring[2][1], 6),
         round(area['observations'][0]['value'], 6)]
        for area in collection['areas']
        if area['observations'][0]['source'] == 'NISAR_SME2'
        and area['observations'][0]['metric'] == 'soil_moisture_change'
        and area['observations'][0]['data_status'] == 'observed'
        for ring in [area['geometry']['coordinates'][0]]
    ]
    if len(image_cells) != report['nisar']['matched_cells']:
        raise ValueError('Image cells do not match risk report')
    output.with_name('nisar-image-cells.json').write_text(
        json.dumps({'source': 'data/observed/nagapattinam-areas.json', 'cells': image_cells},
                   separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Wrote {output}')
