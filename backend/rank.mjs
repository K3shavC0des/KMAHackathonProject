const STAGE_POINTS = Object.freeze({ unknown: 0, planting: 1, vegetative: 1, flowering: 2, harvest: 0 });

function validObservation(observation, source, metric) {
  return observation.source === source && observation.metric === metric &&
    observation.quality === 'valid' && typeof observation.value === 'number' &&
    Number.isFinite(observation.value) && observation.unit === 'm3/m3';
}

function latest(observations) {
  return [...observations].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0] ?? null;
}

function rankOne(area, withNisar) {
  const observations = area.observations ?? [];
  const nisar = withNisar ? latest(observations.filter(o => validObservation(o, 'NISAR_SME2', 'soil_moisture_change') && o.spatial_scale === 'local')) : null;
  const smap = latest(observations.filter(o => validObservation(o, 'SMAP', 'seasonal_baseline') && o.spatial_scale === 'regional'));
  const anomaly = latest(observations.filter(o => validObservation(o, 'SMAP', 'seasonal_anomaly') &&
    o.spatial_scale === 'regional' && o.seasonal_context &&
    Object.keys(o.seasonal_context.historical_year_medians_m3m3 ?? {}).length >= 5));
  // An illustrative inspection heuristic, not a calibrated crop-water model.
  const drying = nisar && nisar.value < 0 ? Math.min(5, Math.abs(nisar.value) / 0.01) : 0;
  const priority = Math.round(drying * 100) / 100;
  const evidence = [];
  if (nisar) evidence.push({ source: nisar.source, observation_id: nisar.observation_id, observed_at: nisar.observed_at, value: nisar.value, unit: nisar.unit, quality: nisar.quality, data_status: nisar.data_status, source_ref: nisar.source_ref, role: 'local_drying_signal' });
  if (smap) evidence.push({ source: smap.source, observation_id: smap.observation_id, observed_at: smap.observed_at, value: smap.value, unit: smap.unit, quality: smap.quality, data_status: smap.data_status, source_ref: smap.source_ref, role: 'regional_context_only' });
  if (anomaly) evidence.push({ source: anomaly.source, observation_id: anomaly.observation_id, observed_at: anomaly.observed_at, value: anomaly.value, unit: anomaly.unit, quality: anomaly.quality, data_status: anomaly.data_status, source_ref: anomaly.source_ref, role: 'regional_historical_comparison', seasonal_context: anomaly.seasonal_context });
  const regionalSummary = anomaly
    ? `Regional SMAP is ${anomaly.value < 0 ? 'below' : 'at or above'} its verified seasonal baseline by ${Math.abs(anomaly.value)} m3/m3; this does not set field priority.`
    : 'Regional historical comparison is unavailable.';
  return {
    area_id: area.area_id,
    label: area.label,
    priority_points: priority,
    eligible_for_first_stop: Boolean(nisar) && drying > 0,
    basis: nisar ? drying > 0 ? 'local_surface_drying' : 'local_no_drying' : 'insufficient_local_evidence',
    regional_below_historical: anomaly ? anomaly.value < 0 : null,
    regional_anomaly_m3m3: anomaly?.value ?? null,
    explanation: nisar
      ? `Local surface moisture changed by ${nisar.value} m3/m3. Drying contributes ${Math.round(drying * 100) / 100} illustrative inspection points. ${regionalSummary}`
      : `Not enough local moisture evidence to choose an irrigation inspection stop. Crop stage does not affect priority. ${regionalSummary}`,
    evidence,
    evidence_status: evidence.some(o => o.data_status === 'sample') ? 'sample' : nisar ? 'observed' : evidence.length ? 'observed_context_only' : 'insufficient_evidence'
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
          typeof observation.observed_at !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(observation.observed_at) ||
          Number.isNaN(Date.parse(observation.observed_at)) ||
          typeof observation.source_ref !== 'string' || !observation.source_ref) {
        throw new TypeError('Every observation needs labeled status, quality, timestamp, and source_ref');
      }
    }
    ids.add(area.area_id);
  }
  return collection.areas.map(area => rankOne(area, withNisar))
    .sort((a, b) => Number(b.eligible_for_first_stop) - Number(a.eligible_for_first_stop) ||
      b.priority_points - a.priority_points ||
      (a.eligible_for_first_stop && b.eligible_for_first_stop
        ? a.evidence.find(item => item.role === 'local_drying_signal').value - b.evidence.find(item => item.role === 'local_drying_signal').value
        : 0) || a.area_id.localeCompare(b.area_id))
    .map((area, index) => ({ rank: index + 1, ...area }));
}

export function compareScoutingStops(collection) {
  const withNisar = rankAreas(collection, true);
  const withoutNisar = rankAreas(collection, false);
  const withFirst = withNisar.find(area => area.eligible_for_first_stop)?.area_id ?? null;
  const withoutFirst = withoutNisar.find(area => area.eligible_for_first_stop)?.area_id ?? null;
  const hasObserved = collection.areas.some(area => area.observations.some(item => item.data_status === 'observed'));
  return {
    schema_version: '1.0.0',
    method: 'illustrative_surface_drying_priority_v2',
    warning: hasObserved
      ? 'Inspection points are illustrative, not calibrated irrigation advice. Observed NISAR analysis tiles are not verified fields; missing SMAP or crop context remains unavailable.'
      : 'Inspection points are illustrative, not calibrated irrigation advice. Sample inputs are synthetic.',
    with_nisar: { first_stop: withFirst, ranking: withNisar },
    without_nisar: { first_stop: withoutFirst, ranking: withoutNisar },
    first_stop_changes: withFirst !== null && withoutFirst !== null && withFirst !== withoutFirst
  };
}
