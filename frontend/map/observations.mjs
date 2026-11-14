export function usableObservation(area, source) {
  return area.observations.find(item => item.source === source && item.quality === 'valid') || null;
}
