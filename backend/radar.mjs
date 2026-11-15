import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(await readFile(new URL('../contracts/radar.schema.json', import.meta.url), 'utf8')));
export function validateRadar(value) {
  if (!validate(value)) throw new TypeError('Radar evidence failed schema validation');
  if (value.status === 'unavailable') {
    if (value.areas.length) throw new TypeError('Unavailable evidence must have no measurements');
    return value;
  }
  if (!value.areas.length) throw new TypeError('Radar evidence has no usable overlap');
  const ids = new Set();
  let reference;
  for (const area of value.areas) {
    if (ids.has(area.area_id)) throw new TypeError('Duplicate radar area');
    ids.add(area.area_id);
    const [l, s] = ['L', 'S'].map(b => area.bands.find(x => x.band === b));
    if (!l || !s || l.convention !== s.convention || l.common_grid_m !== s.common_grid_m) throw new TypeError('Comparable L/S bands are required');
    const rings = area.geometry.coordinates;
    if (!rings.length || rings.some(ring => !Array.isArray(ring) || ring.length < 4 || ring.some(p => !Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1)))) throw new TypeError('Invalid WGS84 polygon');
    const signature = JSON.stringify(area.bands.slice().sort((a,b)=>a.band.localeCompare(b.band)).map(b=>[b.band,b.convention,b.common_grid_m,b.samples.map(s=>[s.observed_at,s.source_ref,s.processing_baseline])]));
    if (reference && reference !== signature) throw new TypeError('All areas must share acquisition products and grid');
    reference = signature;
    const count = value.status === 'paired' ? 2 : 1;
    for (const band of [l, s]) {
      if (band.samples.length !== count || band.common_grid_m < band.effective_resolution_m) throw new TypeError('Incomplete pair or excessive output resolution');
      const samples = band.samples;
      if (count === 2 && (Date.parse(samples[1].observed_at) <= Date.parse(samples[0].observed_at) || samples[0].processing_baseline !== samples[1].processing_baseline)) throw new TypeError('Dates or processing baselines differ within a band');
      if (samples.some(x => !Number.isFinite(x.mean_db))) throw new TypeError('Nonfinite radar power');
    }
    for (let i = 0; i < count; i++) {
      if (Math.abs(Date.parse(l.samples[i].observed_at) - Date.parse(s.samples[i].observed_at)) > 60000 || l.samples[i].matched_cells !== s.samples[i].matched_cells || l.samples[i].coverage !== s.samples[i].coverage) throw new TypeError('L/S acquisition or common mask mismatch');
    }
  }
  return value;
}
export async function loadRadar() {
  return validateRadar(JSON.parse(await readFile(new URL('../data/radar/nagapattinam.json', import.meta.url), 'utf8')));
}
