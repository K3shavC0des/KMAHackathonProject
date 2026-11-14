import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compareScoutingStops } from './rank.mjs';
import { makeServer } from './server.mjs';

const fixture = JSON.parse(await readFile(new URL('../contracts/sample-areas.json', import.meta.url), 'utf8'));
const observed = JSON.parse(await readFile(new URL('../data/observed/nagapattinam-areas.json', import.meta.url), 'utf8'));

test('labeled fixture changes first stop when local NISAR signal is removed', () => {
  const result = compareScoutingStops(fixture);
  assert.equal(result.with_nisar.first_stop, 'illustrative-field-a');
  assert.equal(result.without_nisar.first_stop, 'illustrative-field-b');
  assert.equal(result.first_stop_changes, true);
  assert.equal(result.with_nisar.ranking[0].evidence_status, 'sample');
  assert.equal(result.without_nisar.ranking[0].basis, 'crop_stage_scenario_only');
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

test('observed NISAR analysis tiles keep missing crop and SMAP context unavailable', () => {
  const result = compareScoutingStops(observed);
  assert.equal(observed.areas.length, 4);
  assert.ok(observed.areas.every(area => area.crop_stage === 'unknown' && area.observations.every(item => item.data_status === 'observed' && item.observed_at.endsWith('Z'))));
  assert.equal(result.with_nisar.first_stop, 'nagapattinam-analysis-sw');
  assert.equal(result.without_nisar.first_stop, null);
  assert.equal(result.first_stop_changes, false);
  assert.match(result.warning, /analysis tiles are not verified fields/);
  assert.ok(result.with_nisar.ranking.every(item => item.evidence.every(evidence => evidence.source !== 'SMAP')));
});

test('ranking rejects timestamps without an explicit UTC timezone', () => {
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
    assert.equal((await demo.json()).first_stop_changes, true);
    const bad = structuredClone(fixture);
    delete bad.areas[0].observations[0].data_status;
    const response = await fetch(`${base}/api/rank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bad) });
    assert.equal(response.status, 400);
    const areasResponse = await fetch(`${base}/api/areas?dataset=observed`);
    assert.equal(areasResponse.status, 200);
    assert.equal((await areasResponse.json()).areas.length, 4);
    const observedRank = await fetch(`${base}/api/rank?dataset=observed`);
    assert.equal(observedRank.status, 200);
    assert.equal((await observedRank.json()).without_nisar.first_stop, null);
    assert.equal((await fetch(`${base}/api/areas?dataset=unknown`)).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
