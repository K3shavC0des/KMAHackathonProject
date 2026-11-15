"""Build observed-city crop context from NASA POWER and existing NISAR exports."""
import json
import statistics
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AREAS = ROOT / 'data/observed'
OUTPUT = Path(__file__).with_name('city-reports.json')
PLACES = {
    'observed': {
        'name': 'Nagapattinam', 'file': 'nagapattinam-areas.json', 'lat': 10.73, 'lon': 79.77,
        'crops': [
            {'name': 'Rice', 'season': 'June–July rice season cited locally', 'source': 'https://www.agritech.tnau.ac.in/agriculture/agri_seasonandvarieties_rice.html'},
            {'name': 'Black gram', 'season': 'June–August season cited locally', 'source': 'https://www.agritech.tnau.ac.in/agriculture/pulses_blackgram.html'},
        ],
    },
    'ludhiana': {
        'name': 'Ludhiana', 'file': 'ludhiana-areas.json', 'lat': 30.90, 'lon': 75.85,
        'crops': [
            {'name': 'Wheat', 'season': 'Common local crop; planting season not checked', 'source': 'https://pmfme.punjabagro.gov.in/wp-content/uploads/2023/03/F1_Final-SLUP-Report-for-Punjab_13.02.23.pdf'},
            {'name': 'Rice', 'season': 'Common local crop; planting season not checked', 'source': 'https://ludhiana.nic.in/departments/state-govt/chief-agri/'},
        ],
    },
    'ahmedabad': {
        'name': 'Ahmedabad', 'file': 'ahmedabad-areas.json', 'lat': 23.02, 'lon': 72.58,
        'crops': [
            {'name': 'Cotton', 'season': 'Common district crop; planting season not checked', 'source': 'https://cgwb.gov.in/old_website/AQM/NAQUIM_REPORT/Gujarat/Ahmedabad%20NAQUIM%20Report.pdf'},
            {'name': 'Wheat', 'season': 'Common district crop; planting season not checked', 'source': 'https://cgwb.gov.in/old_website/AQM/NAQUIM_REPORT/Gujarat/Ahmedabad%20NAQUIM%20Report.pdf'},
        ],
    },
    'nairobi': {
        'name': 'Nairobi', 'file': 'nairobi-areas.json', 'lat': -1.275, 'lon': 36.825,
        'crops': [
            {'name': 'Maize', 'season': 'Common county crop; planting season not checked', 'source': 'https://maarifa.cog.go.ke/sites/default/files/2022-08/CIDP%20Nairobi%20-%202013-2017.pdf'},
            {'name': 'Beans', 'season': 'Common county crop; planting season not checked', 'source': 'https://maarifa.cog.go.ke/sites/default/files/2022-08/CIDP%20Nairobi%20-%202013-2017.pdf'},
        ],
    },
}


def week_keys(end):
    return [(end - timedelta(days=i)).strftime('%Y%m%d') for i in range(6, -1, -1)]


def mean(values, keys):
    data = [values.get(key) for key in keys]
    return statistics.mean(data) if all(isinstance(x, (int, float)) and x > -900 for x in data) else None


def get_weather(place, end):
    url = (f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,RH2M,PRECTOTCORR"
           f"&community=AG&longitude={place['lon']}&latitude={place['lat']}"
           f"&start=19910101&end={end:%Y%m%d}&format=JSON&time-standard=LST")
    with urllib.request.urlopen(url, timeout=45) as response:
        payload = json.load(response)
    expected = {'T2M_MAX': 'C', 'RH2M': '%', 'PRECTOTCORR': 'mm/day'}
    if any(payload.get('parameters', {}).get(key, {}).get('units') != unit for key, unit in expected.items()):
        raise ValueError(f"Unexpected NASA POWER units for {place['name']}")
    series = payload['properties']['parameter']
    keys = week_keys(end)
    temperature = mean(series['T2M_MAX'], keys)
    humidity = mean(series['RH2M'], keys)
    rain = [series['PRECTOTCORR'].get(key) for key in keys]
    if temperature is None or humidity is None or any(not isinstance(x, (int, float)) or x <= -900 for x in rain):
        raise ValueError(f"Incomplete NASA POWER week for {place['name']}")
    baseline = []
    baseline_rain = []
    for year in range(1991, 2021):
        try:
            week = week_keys(end.replace(year=year))
        except ValueError:
            continue
        t = mean(series['T2M_MAX'], week)
        r = [series['PRECTOTCORR'].get(key) for key in week]
        if t is not None:
            baseline.append(t)
        if all(isinstance(x, (int, float)) and x > -900 for x in r):
            baseline_rain.append(sum(r))
    return {
        'seven_day_mean_daily_max_c': temperature,
        'seven_day_mean_humidity_percent': humidity,
        'seven_day_rain_mm': sum(rain),
        'baseline_median_c': statistics.median(baseline),
        'baseline_years': len(baseline),
        'percentile': sum(value <= temperature for value in baseline) / len(baseline),
        'baseline_rain_median_mm': statistics.median(baseline_rain),
        'point_lat_lon': [place['lat'], place['lon']],
        'source': url,
    }


def main():
    result = {}
    for key, place in PLACES.items():
        areas = json.loads((AREAS / place['file']).read_text(encoding='utf-8'))['areas']
        changes = [area['observations'][0]['value'] for area in areas
                   if area['observations'][0]['source'] == 'NISAR_SME2'
                   and area['observations'][0]['data_status'] == 'observed']
        dates = sorted({area['observations'][0]['observed_at'][:10] for area in areas})
        if len(dates) != 1 or not changes:
            raise ValueError(f"Expected one dated observed NISAR change for {place['name']}")
        end = date.fromisoformat(dates[0])
        median = statistics.median(changes)
        dryness = sum(value <= -0.02 for value in changes) / len(changes)
        uncertainty = None
        concern = 'No combined heat and drying signal in this comparison'
        if key == 'observed':
            source_report = json.loads(OUTPUT.with_name('nagapattinam-report.json').read_text(encoding='utf-8'))
            uncertainty = source_report['nisar']['uncertainty']
            concern = 'Watch — confirm locally'
        elif key == 'nairobi' and dryness >= 0.5:
            concern = 'Possible concern — NISAR uncertainty not checked'
        report = {
            'place': place['name'], 'date': end.isoformat(), 'concern': concern,
            'nisar': {'matched_cells': len(changes), 'median_change_m3m3': median,
                      'fraction_at_least_2_points_drier': dryness,
                      'earlier_date': (end - timedelta(days=12)).isoformat(), 'later_date': end.isoformat(),
                      'uncertainty': uncertainty},
            'temperature': get_weather(place, end),
            'crop_context': {'candidates': place['crops'], 'field_crop_verified': False, 'growth_stage': 'unknown'},
        }
        result[key] = report
        print(f"{place['name']}: {len(changes)} cells; {report['temperature']['seven_day_mean_daily_max_c']:.1f} C; {len(place['crops'])} crop options")
    OUTPUT.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
