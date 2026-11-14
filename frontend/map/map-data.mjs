export function latestReading(area, source, metric) {
  const scale = source === 'NISAR_SME2' ? 'local' : source === 'SMAP' ? 'regional' : null;
  return area.observations
    .filter(item => item.source === source && item.metric === metric && item.spatial_scale === scale &&
      item.unit === 'm3/m3' && item.quality === 'valid' && typeof item.value === 'number' && Number.isFinite(item.value))
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0] || null;
}

export function inspectionSummary(areas) {
  const candidates = areas.map(area => ({ area, change: latestReading(area, 'NISAR_SME2', 'soil_moisture_change') }))
    .filter(item => item.change && item.change.value < 0)
    .sort((a, b) => a.change.value - b.change.value);
  return candidates[0] || null;
}
