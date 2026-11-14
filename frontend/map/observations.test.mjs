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
