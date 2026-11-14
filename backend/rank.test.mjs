import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compareScoutingStops } from './rank.mjs';
import { makeServer } from './server.mjs';

const fixture = JSON.parse(await readFile(new URL('../contracts/sample-areas.json', import.meta.url), 'utf8'));

test('newest observation is selected by instant across timezone offsets', () => {
  const changed = structuredClone(fixture);
  const observation = changed.areas[0].observations.find(item => item.source === 'NISAR_SME2');
  observation.observed_at = '2026-07-02T00:00:00Z';
  changed.areas[0].observations.push({ ...observation, observation_id: 'newer', observed_at: '2026-07-01T23:00:00-02:00', value: .02 });
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
