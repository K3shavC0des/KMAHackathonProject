import { compareScoutingStops } from '../../backend/rank.mjs';

const stages = new Set(['unknown', 'planting', 'vegetative', 'flowering', 'harvest']);

export function evaluateScenario(collection, stageChanges = {}) {
  if (collection?.schema_version !== '1.0.0' || !Array.isArray(collection.areas)) {
    throw new TypeError('Expected area collection v1');
  }
  const areaIds = new Set(collection.areas.map(area => area.area_id));
  for (const [id, stage] of Object.entries(stageChanges)) {
    if (!areaIds.has(id) || !stages.has(stage)) throw new TypeError('Unknown area or crop stage');
  }
  // Create new area records; observation arrays retain their original values and provenance.
  const scenario = {
    ...collection,
    areas: collection.areas.map(area => ({ ...area, crop_stage: stageChanges[area.area_id] ?? area.crop_stage }))
  };
  return { scenario, comparison: compareScoutingStops(scenario) };
}
