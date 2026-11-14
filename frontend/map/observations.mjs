export function usableObservation(area, source) {
  const metric = source === 'NISAR_SME2' ? 'soil_moisture_change' : 'seasonal_baseline';
  const scale = source === 'NISAR_SME2' ? 'local' : 'regional';
  return area.observations
    .filter(item => item.source === source && item.quality === 'valid' &&
      item.metric === metric && item.spatial_scale === scale && item.unit === 'm3/m3' &&
      typeof item.value === 'number' && Number.isFinite(item.value))
    .sort((a, b) => (Date.parse(b.observed_at) || 0) - (Date.parse(a.observed_at) || 0))[0] ?? null;
}
