export function usableObservation(area, source) {
  return area.observations
    .filter(item => item.source === source && item.quality === 'valid' &&
      typeof item.value === 'number' && Number.isFinite(item.value))
    .sort((a, b) => (Date.parse(b.observed_at) || 0) - (Date.parse(a.observed_at) || 0))[0] ?? null;
}
