export function observationInstant(item) {
  const instant = Date.parse(item?.observed_at);
  return Number.isFinite(instant) ? instant : Number.NEGATIVE_INFINITY;
}

export function latestReading(area, source, metric) {
  const scale = source === 'NISAR_SME2' ? 'local' : source === 'SMAP' ? 'regional' : null;
  return area.observations
    .filter(item => item.source === source && item.metric === metric && item.spatial_scale === scale &&
      item.unit === 'm3/m3' && item.quality === 'valid' && typeof item.value === 'number' && Number.isFinite(item.value))
    .sort((a, b) => observationInstant(b) - observationInstant(a))[0] || null;
}

export function inspectionSummary(areas) {
  const candidates = areas.map(area => ({ area, change: latestReading(area, 'NISAR_SME2', 'soil_moisture_change') }))
    .filter(item => item.change && item.change.value < 0)
    .sort((a, b) => a.change.value - b.change.value || a.area.area_id.localeCompare(b.area.area_id));
  return candidates[0] || null;
}

// These are inspection aids based only on the verified local satellite change.
// They are deliberately not crop, drought, or irrigation risk categories.
export function inspectionBand(area) {
  const change = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
  if (!change) return 'unavailable';
  if (change.value <= -0.035) return 'review';
  if (change.value <= -0.020) return 'watch';
  if (change.value < 0) return 'lower';
  return 'steady';
}

export function cropBlocks(areas) {
  const groups = new Map();
  for (const area of areas) {
    const match = /-r(\d+)c(\d+)$/.exec(area.area_id);
    const change = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
    if (!match || !change || change.data_status !== 'observed') continue;
    const key = `${Math.floor(Number(match[1]) / 5)}-${Math.floor(Number(match[2]) / 5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ area, change });
  }
  return [...groups].filter(([, cells]) => cells.length >= 10).map(([key, cells]) => {
    const values = cells.map(item => item.change.value).sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    const rings = cells.map(item => item.area.geometry.coordinates[0]);
    const west = Math.min(...rings.map(ring => ring[0][0]));
    const south = Math.min(...rings.map(ring => ring[0][1]));
    const east = Math.max(...rings.map(ring => ring[2][0]));
    const north = Math.max(...rings.map(ring => ring[2][1]));
    const source = cells[0].change;
    return {
      area_id: `crop-block-${key}`, label: `Crop watch block ${key}`, cell_count: cells.length,
      crop_stage: 'unknown', geometry: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
      observations: [{ ...source, observation_id: `crop-block-${key}-median`, value: median, data_status: 'derived',
        note: `Median of ${cells.length} quality-matched NISAR cells in an approximately 1 km block. Shape may include gaps. Crop presence is unknown.` }]
    };
  });
}
