import assert from 'node:assert/strict';
import { test } from 'node:test';
import { usableObservation } from './observations.mjs';

test('suspect and missing readings never become headline values', () => {
  const area = { observations: [
    { source: 'SMAP', quality: 'suspect', value: 0.1 },
    { source: 'SMAP', quality: 'missing', value: null },
    { source: 'NISAR_SME2', quality: 'valid', value: -0.04 }
  ] };
  assert.equal(usableObservation(area, 'SMAP'), null);
  assert.equal(usableObservation(area, 'NISAR_SME2')?.value, -0.04);
});

test('headline selects newest valid numeric reading without mutating source order', () => {
  const older = { source: 'NISAR_SME2', quality: 'valid', value: -0.01, observed_at: '2026-07-01T00:00:00Z' };
  const newer = { ...older, value: -0.03, observed_at: '2026-07-02T00:00:00Z' };
  const area = { observations: [older, newer, { ...newer, value: null, observed_at: '2026-07-03T00:00:00Z' }] };
  assert.equal(usableObservation(area, 'NISAR_SME2'), newer);
  assert.equal(area.observations[0], older);
});
