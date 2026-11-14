const STAGE_POINTS = Object.freeze({ unknown: 0, planting: 1, vegetative: 1, flowering: 2, harvest: 0 });

function validObservation(observation, source, metric) {
  return observation.source === source && observation.metric === metric &&
    observation.quality === 'valid' && typeof observation.value === 'number' &&
    Number.isFinite(observation.value) && observation.unit === 'm3/m3';
}

function latest(observations) {
  return [...observations].sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0] ?? null;
}

function rankOne(area, withNisar) {
  const observations = area.observations ?? [];
  const nisar = withNisar ? latest(observations.filter(o => validObservation(o, 'NISAR_SME2', 'soil_moisture_change') && o.spatial_scale === 'local')) : null;
  const smap = latest(observations.filter(o => validObservation(o, 'SMAP', 'seasonal_baseline') && o.spatial_scale === 'regional'));
  // An illustrative ranking heuristic, not a calibrated crop-water model.
  const drying = nisar && nisar.value < 0 ? Math.min(5, Math.abs(nisar.value) / 0.01) : 0;
  const priority = Math.round(drying * 100) / 100;
  const evidence = [];
  if (nisar) evidence.push({ source: nisar.source, observation_id: nisar.observation_id, observed_at: nisar.observed_at, value: nisar.value, unit: nisar.unit, quality: nisar.quality, data_status: nisar.data_status, source_ref: nisar.source_ref, role: 'local_drying_signal' });
  if (smap) evidence.push({ source: smap.source, observation_id: smap.observation_id, observed_at: smap.observed_at, value: smap.value, unit: smap.unit, quality: smap.quality, data_status: smap.data_status, source_ref: smap.source_ref, role: 'regional_context_only' });
  return {
    area_id: area.area_id,
    label: area.label,
    priority_points: priority,
    eligible_for_first_stop: Boolean(nisar) && drying > 0,
    basis: nisar ? 'local_surface_drying' : 'insufficient_local_evidence',
    explanation: nisar
      ? `Local surface moisture changed by ${nisar.value} m3/m3. Drying contributes ${Math.round(drying * 100) / 100} illustrative inspection points. Historical risk is unavailable until a seasonal baseline is verified. SMAP stays regional context.`
      : 'Not enough local moisture evidence to choose an irrigation inspection stop. Crop stage does not affect priority.',
    evidence,
    evidence_status: evidence.some(o => o.data_status === 'sample') ? 'sample' : nisar ? 'observed' : 'scenario_only'
  };
}

export function rankAreas(collection, withNisar = true) {
  if (collection?.schema_version !== '1.0.0' || !Array.isArray(collection.areas) || collection.areas.length === 0) {
    throw new TypeError('Expected a nonempty area collection with schema_version 1.0.0');
  }
  const ids = new Set();
  for (const area of collection.areas) {
    if (typeof area.area_id !== 'string' || !area.area_id || ids.has(area.area_id) || !Array.isArray(area.observations) || !(area.crop_stage in STAGE_POINTS)) {
      throw new TypeError('Each area needs a unique area_id, known crop_stage, and observations array');
    }
    for (const observation of area.observations) {
      if (!observation || !['sample', 'observed'].includes(observation.data_status) ||
          !['valid', 'suspect', 'missing'].includes(observation.quality) ||
          typeof observation.observed_at !== 'string' || Number.isNaN(Date.parse(observation.observed_at)) ||
          typeof observation.source_ref !== 'string' || !observation.source_ref) {
        throw new TypeError('Every observation needs labeled status, quality, timestamp, and source_ref');
      }
    }
    ids.add(area.area_id);
  }
  return collection.areas.map(area => rankOne(area, withNisar))
    .sort((a, b) => b.priority_points - a.priority_points || a.area_id.localeCompare(b.area_id))
    .map((area, index) => ({ rank: index + 1, ...area }));
}

export function compareScoutingStops(collection) {
  const withNisar = rankAreas(collection, true);
  const withoutNisar = rankAreas(collection, false);
  const withFirst = withNisar.find(area => area.eligible_for_first_stop)?.area_id ?? null;
  const withoutFirst = withoutNisar.find(area => area.eligible_for_first_stop)?.area_id ?? null;
  return {
    schema_version: '1.0.0',
    method: 'illustrative_surface_drying_priority_v2',
    warning: 'Scenario priority points are illustrative, not calibrated irrigation advice. Sample inputs are synthetic.',
    with_nisar: { first_stop: withFirst, ranking: withNisar },
    without_nisar: { first_stop: withoutFirst, ranking: withoutNisar },
    first_stop_changes: withFirst !== null && withoutFirst !== null && withFirst !== withoutFirst
  };
}
