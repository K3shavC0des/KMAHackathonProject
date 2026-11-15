import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestReading, inspectionBand, inspectionSummary } from './map-data.mjs';

test('headline selects newest valid change, never a moisture level or suspect reading', () => {
  const area = { area_id: 'a', observations: [
    { source: 'NISAR_SME2', metric: 'soil_moisture', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value: 0.2, observed_at: '2026-07-03T00:00:00Z' },
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value: -0.01, observed_at: '2026-07-01T00:00:00Z' },
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value: -0.03, observed_at: '2026-07-02T00:00:00Z' },
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'suspect', value: -0.09, observed_at: '2026-07-04T00:00:00Z' },
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'regional', unit: 'm3/m3', quality: 'valid', value: -0.2, observed_at: '2026-07-05T00:00:00Z' }
  ] };
  assert.equal(latestReading(area, 'NISAR_SME2', 'soil_moisture_change').value, -0.03);
  assert.equal(inspectionSummary([area]).area.area_id, 'a');
});

test('no local drying yields no inspection candidate', () => {
  assert.equal(inspectionSummary([{ area_id: 'a', observations: [] }]), null);
});

test('inspection colour bands use only quality-valid local satellite change', () => {
  const reading = value => ({ source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value, observed_at: '2026-07-02T00:00:00Z' });
  assert.equal(inspectionBand({ observations: [reading(-0.04)] }), 'review');
  assert.equal(inspectionBand({ observations: [reading(-0.02)] }), 'watch');
  assert.equal(inspectionBand({ observations: [reading(-0.01)] }), 'lower');
  assert.equal(inspectionBand({ observations: [reading(0)] }), 'steady');
  assert.equal(inspectionBand({ observations: [{ ...reading(-0.08), quality: 'suspect' }] }), 'unavailable');
});

test('newest reading is selected by instant across UTC offset forms', () => {
  const area = { observations: [
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value: -0.01, observed_at: '2026-07-02T00:30:00+01:00' },
    { source: 'NISAR_SME2', metric: 'soil_moisture_change', spatial_scale: 'local', unit: 'm3/m3', quality: 'valid', value: -0.02, observed_at: '2026-07-01T23:45:00Z' }
  ] };
  assert.equal(latestReading(area, 'NISAR_SME2', 'soil_moisture_change').value, -0.02);
});
