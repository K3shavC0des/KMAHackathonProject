export function usableObservation(area, source) {
  return area.observations
    .filter(item => item.source === source && item.quality === 'valid' && Number.isFinite(item.value))
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0] || null;
}
