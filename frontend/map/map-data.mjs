export function latestReading(area, source, metric) {
  return area.observations
    .filter(item => item.source === source && item.metric === metric && item.quality === 'valid' && Number.isFinite(item.value))
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0] || null;
}

export function inspectionSummary(areas) {
  const candidates = areas.map(area => ({ area, change: latestReading(area, 'NISAR_SME2', 'soil_moisture_change') }))
    .filter(item => item.change && item.change.value < 0)
    .sort((a, b) => a.change.value - b.change.value);
  return candidates[0] || null;
}
