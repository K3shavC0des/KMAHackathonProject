import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compareScoutingStops } from './rank.mjs';
import { makeServer } from './server.mjs';
import { validateCollection } from './validate.mjs';

const fixture = JSON.parse(await readFile(new URL('../contracts/sample-areas.json', import.meta.url), 'utf8'));
const observed = JSON.parse(await readFile(new URL('../data/observed/nagapattinam-areas.json', import.meta.url), 'utf8'));

test('newest observation is selected by instant across UTC timestamp forms', () => {
  const changed = structuredClone(fixture);
  const observation = changed.areas[0].observations.find(item => item.source === 'NISAR_SME2');
  observation.observed_at = '2026-07-02T00:00:00Z';
  changed.areas[0].observations.push({ ...observation, observation_id: 'newer', observed_at: '2026-07-02T00:00:00.500+00:00', value: .02 });
  const result = compareScoutingStops(changed).with_nisar.ranking.find(item => item.area_id === changed.areas[0].area_id);
  assert.equal(result.priority_points, 0);
  assert.equal(result.eligible_for_first_stop, false);
});

test('local drying supports inspection priority while regional context alone does not', () => {
  const result = compareScoutingStops(fixture);
  assert.equal(result.with_nisar.first_stop, 'illustrative-field-a');
  assert.equal(result.without_nisar.first_stop, null);
  assert.equal(result.first_stop_changes, false);
  assert.equal(result.with_nisar.ranking[0].evidence_status, 'sample');
  assert.equal(result.without_nisar.ranking[0].basis, 'insufficient_local_evidence');
  assert.equal(result.without_nisar.ranking[0].evidence_status, 'sample');
  assert.equal(result.with_nisar.ranking[0].evidence.find(e => e.source === 'SMAP').role, 'regional_context_only');
});

test('suspect local observation cannot raise priority', () => {
  const changed = structuredClone(fixture);
  changed.areas[0].observations[0].quality = 'suspect';
  assert.equal(compareScoutingStops(changed).with_nisar.first_stop, 'illustrative-field-b');
});

test('unknown crop stage and absent local evidence cannot nominate a first stop', () => {
  const changed = structuredClone(fixture);
  for (const area of changed.areas) { area.crop_stage = 'unknown'; area.observations = []; }
  const result = compareScoutingStops(changed);
  assert.equal(result.with_nisar.first_stop, null);
  assert.equal(result.without_nisar.first_stop, null);
  assert.equal(result.first_stop_changes, false);
  assert.ok(result.with_nisar.ranking.every(area => !area.eligible_for_first_stop));
});

test('regional context alone cannot nominate a first stop', () => {
  const changed = structuredClone(fixture);
  for (const area of changed.areas) {
    area.crop_stage = 'unknown';
    area.observations = area.observations.filter(item => item.source === 'SMAP');
  }
  assert.equal(compareScoutingStops(changed).with_nisar.first_stop, null);
});

test('crop stage alone and wetting cannot nominate a drying inspection stop', () => {
  const cropOnly = structuredClone(fixture);
  for (const area of cropOnly.areas) area.observations = [];
  assert.equal(compareScoutingStops(cropOnly).with_nisar.first_stop, null);
  const wetting = structuredClone(fixture);
  for (const area of wetting.areas) area.observations[0].value = 0.02;
  assert.equal(compareScoutingStops(wetting).with_nisar.first_stop, null);
});

test('newest local reading is selected by instant across timezone offsets', () => {
  const changed = structuredClone(fixture);
  const earlier = changed.areas[0].observations.find(item => item.source === 'NISAR_SME2');
  changed.areas[0].observations.push({ ...earlier, observation_id: 'newer', observed_at: '2026-07-01T23:00:00-02:00', value: 0.02 });
  const ranked = compareScoutingStops(changed).with_nisar.ranking.find(item => item.area_id === 'illustrative-field-a');
  assert.equal(ranked.priority_points, 0);
  assert.equal(ranked.eligible_for_first_stop, false);
});

test('canonical schema rejects extra fields, malformed geometry, dates and nonfinite values', () => {
  assert.equal(validateCollection(fixture), fixture);
  assert.equal(validateCollection(observed), observed);
  const extra = structuredClone(fixture);
  extra.areas[0].invented_risk_flag = true;
  assert.throws(() => validateCollection(extra), /additional properties/);
  const geometry = structuredClone(fixture);
  geometry.areas[0].geometry.coordinates[0][0][0] = 181;
  assert.throws(() => validateCollection(geometry), /<= 180/);
  const date = structuredClone(fixture);
  date.areas[0].observations[0].observed_at = '2026-07-02T00:00:00';
  assert.throws(() => validateCollection(date), /format/);
  const nonfinite = structuredClone(fixture);
  nonfinite.areas[0].observations[0].value = Infinity;
  assert.throws(() => validateCollection(nonfinite), /Nonfinite number/);
});

test('verified regional anomaly flags below-baseline context without changing field priority', () => {
  const changed = structuredClone(fixture);
  const context = changed.areas[0].observations.find(item => item.source === 'SMAP');
  changed.areas[0].observations.push({
    ...context, observation_id: 'sample-regional-anomaly', metric: 'seasonal_anomaly', value: -0.05,
    seasonal_context: {
      current_m3m3: 0.2, baseline_m3m3: 0.25, grid_center_wgs84: [79.84, 10.77],
      window_days_each_side: 15,
      historical_year_medians_m3m3: { 2021: 0.25, 2022: 0.25, 2023: 0.25, 2024: 0.25, 2025: 0.25 }
    }
  });
  validateCollection(changed);
  const baseline = compareScoutingStops(fixture).with_nisar.ranking[0];
  const result = compareScoutingStops(changed).with_nisar.ranking[0];
  assert.equal(result.priority_points, baseline.priority_points);
  assert.equal(result.regional_below_historical, true);
  assert.equal(result.regional_anomaly_m3m3, -0.05);
  assert.equal(result.evidence.find(item => item.role === 'regional_historical_comparison').seasonal_context.baseline_m3m3, 0.25);

  const inadequate = structuredClone(changed);
  delete inadequate.areas[0].observations.at(-1).seasonal_context.historical_year_medians_m3m3['2021'];
  assert.throws(() => validateCollection(inadequate), /fewer than 5 properties/);
  const inconsistent = structuredClone(changed);
  inconsistent.areas[0].observations.at(-1).value = -0.1;
  assert.throws(() => validateCollection(inconsistent), /Inconsistent seasonal anomaly/);
});

test('observed NISAR analysis tiles keep missing crop and SMAP context unavailable', () => {
  const result = compareScoutingStops(observed);
  assert.equal(observed.areas.length, 36);
  assert.ok(observed.areas.every(area => area.crop_stage === 'unknown' && area.observations.every(item => item.data_status === 'observed' && item.observed_at.endsWith('Z'))));
  assert.equal(result.with_nisar.first_stop, 'nagapattinam-analysis-r01c04');
  assert.equal(result.without_nisar.first_stop, null);
  assert.equal(result.first_stop_changes, false);
  assert.equal(result.with_nisar.ranking[0].regional_below_historical, null);
  assert.match(result.warning, /analysis tiles are not verified fields/);
  assert.ok(result.with_nisar.ranking.every(item => item.evidence.every(evidence => evidence.source !== 'SMAP')));
});

test('ranking rejects timestamps without an explicit timezone', () => {
  const changed = structuredClone(fixture);
  changed.areas[0].observations[0].observed_at = '2026-07-02T00:00:00';
  assert.throws(() => compareScoutingStops(changed), /timestamp/);
});

test('API serves fixture and rejects unlabeled input', async () => {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const demo = await fetch(`${base}/api/rank`);
    assert.equal(demo.status, 200);
    assert.equal((await demo.json()).without_nisar.first_stop, null);
    const bad = structuredClone(fixture);
    delete bad.areas[0].observations[0].data_status;
    const response = await fetch(`${base}/api/rank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bad) });
    assert.equal(response.status, 400);
    const areasResponse = await fetch(`${base}/api/areas?dataset=observed`);
    assert.equal(areasResponse.status, 200);
    assert.equal((await areasResponse.json()).areas.length, 36);
    const observedRank = await fetch(`${base}/api/rank?dataset=observed`);
    assert.equal(observedRank.status, 200);
    assert.equal((await observedRank.json()).without_nisar.first_stop, null);
    assert.equal((await fetch(`${base}/api/areas?dataset=unknown`)).status, 400);
    const extra = structuredClone(fixture);
    extra.areas[0].invented_risk_flag = true;
    const invalidSchema = await fetch(`${base}/api/rank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(extra) });
    assert.equal(invalidSchema.status, 400);
    const nonfiniteBody = JSON.stringify(fixture).replace('"value":-0.04', '"value":1e999');
    assert.equal((await fetch(`${base}/api/rank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: nonfiniteBody })).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('known crop stage without local evidence cannot nominate a stop', () => {
  const changed = structuredClone(fixture);
  for (const area of changed.areas) area.observations = [];
  assert.equal(compareScoutingStops(changed).with_nisar.first_stop, null);
});

test('wetting readings do not nominate a drying inspection stop', () => {
  const changed = structuredClone(fixture);
  for (const area of changed.areas) area.observations[0].value = 0.02;
  assert.equal(compareScoutingStops(changed).with_nisar.first_stop, null);
});
