import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateScenario } from './scenario.mjs';

const fixture = JSON.parse(await readFile(new URL('../../contracts/sample-areas.json', import.meta.url), 'utf8'));

test('changing crop stage changes priority without changing observations', () => {
  const before = JSON.stringify(fixture.areas.map(area => area.observations));
  const original = evaluateScenario(fixture);
  const changed = evaluateScenario(fixture, { 'illustrative-field-b': 'harvest' });
  assert.notDeepEqual(changed.comparison.without_nisar.ranking, original.comparison.without_nisar.ranking);
  assert.equal(JSON.stringify(changed.scenario.areas.map(area => area.observations)), before);
  assert.equal(JSON.stringify(fixture.areas.map(area => area.observations)), before);
  assert.equal(fixture.areas[1].crop_stage, 'flowering');
  assert.equal(changed.scenario.areas[1].crop_stage, 'harvest');
});

test('unknown stage or area is rejected', () => {
  assert.throws(() => evaluateScenario(fixture, { 'illustrative-field-a': 'fake' }), /Unknown area or crop stage/);
  assert.throws(() => evaluateScenario(fixture, { missing: 'flowering' }), /Unknown area or crop stage/);
});
