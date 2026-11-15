import { cropBlocks, cropInspectionBand, inspectionBand, inspectionSummary, latestReading, observationInstant } from './map-data.mjs';

const byId = id => document.getElementById(id);
const pilotBounds = [[79.68, 10.64], [79.86, 10.82]];
const stateBounds = [[79.20, 10.30], [80.35, 11.10]];
const pilotCenter = [79.77, 10.73];
const cityViews = {
  sample: { name: 'Synthetic example', bounds: pilotBounds, region: stateBounds },
  observed: { name: 'Nagapattinam', bounds: pilotBounds, region: stateBounds },
  ludhiana: { name: 'Ludhiana', bounds: [[75.76, 30.81], [75.94, 30.99]], region: [[75.35, 30.4], [76.35, 31.4]] },
  nairobi: { name: 'Nairobi', bounds: [[36.70, -1.40], [36.95, -1.15]], region: [[36.3, -1.8], [37.4, -0.7]] },
  ahmedabad: { name: 'Ahmedabad', bounds: [[72.49, 22.93], [72.67, 23.11]], region: [[72.08, 22.52], [73.08, 23.52]] },
};
const collections = {};
let mode = 'sample';
let areas = [];
let selectedId;
let map;
let maplibregl;
let detailMode = 'easy';
let cropReports = {};
let viewMode = 'moisture';
let cropAreas = [];
let cityNote = '';

function fitRegion(bounds, maxZoom = 13) {
  if (!map) return;
  const desktop = window.innerWidth > 760;
  map.fitBounds(bounds, { padding: desktop ? { top: 130, bottom: 100, left: 70, right: 370 } : { top: 210, bottom: 95, left: 25, right: 25 }, maxZoom, duration: 600 });
}

function setBasemap(dark) {
  if (!map?.getLayer('osm')) return;
  // Reverse and narrow the existing raster luminance; keep evidence colours intact.
  map.setPaintProperty('osm', 'raster-saturation', dark ? -1 : 0);
  map.setPaintProperty('osm', 'raster-brightness-min', dark ? 0.32 : 0);
  map.setPaintProperty('osm', 'raster-brightness-max', dark ? 0.025 : 1);
  byId('dark-view').setAttribute('aria-pressed', String(dark));
  byId('street-view').setAttribute('aria-pressed', String(!dark));
}

function readingText(item) {
  if (!item) return 'Unavailable';
  if (item.metric === 'soil_moisture_change') {
    const direction = item.value < 0 ? 'lower' : item.value > 0 ? 'higher' : 'unchanged';
    return `${Math.abs(item.value * 100).toFixed(1)} percentage points ${direction}`;
  }
  const sign = item.metric === 'soil_moisture_change' && item.value > 0 ? '+' : '';
  return `${sign}${item.value.toFixed?.(3) ?? item.value} ${item.unit}`;
}

function metadata(item) {
  if (!item) return 'No quality-valid reading';
  if (item.data_status === 'derived') return `${item.observed_at.slice(0, 10)} · median of matched satellite cells`;
  return `${item.observed_at.slice(0, 10)} · local satellite measurement`;
}

function labelFor(area) {
  if (mode !== 'sample') return area.label.replace(/^.* satellite (?:analysis square|pixel) — /, '');
  return `Sample ${area.label.match(/field\s+([A-Za-z0-9]+)/i)?.[1] ?? area.area_id}`;
}

function featureCollection() {
  const filter = viewMode === 'crop' ? 'crop-band' : 'band';
  const visibleBands = new Set([...document.querySelectorAll(`input[name="${filter}"]:checked`)].map(input => input.value));
  return {
    type: 'FeatureCollection',
    features: areas.filter(area => visibleBands.has(viewMode === 'crop' ? cropInspectionBand(area) : inspectionBand(area))).map(area => ({ type: 'Feature', properties: { area_id: area.area_id, label: labelFor(area), band: viewMode === 'crop' ? cropInspectionBand(area) : inspectionBand(area) }, geometry: area.geometry }))
  };
}

function visibleAreas() {
  const visibleIds = new Set(featureCollection().features.map(feature => feature.properties.area_id));
  return areas.filter(area => visibleIds.has(area.area_id));
}

function updateMapData() {
  if (!map?.getSource('areas')) return;
  map.getSource('areas')?.setData(featureCollection());
  map.setPaintProperty('area-fill', 'fill-color', viewMode === 'crop'
    ? ['match', ['get', 'band'], 'review', '#f07861', 'watch', '#efb352', 'steady', '#82c7a5', '#8997a8']
    : ['match', ['get', 'band'], 'review', '#f07861', 'watch', '#efb352', 'lower', '#e4d57b', 'steady', '#82c7a5', '#8997a8']);
  map.setPaintProperty('area-fill', 'fill-opacity', ['case', ['==', ['get', 'area_id'], selectedId], 0.72, 0.42]);
  map.setPaintProperty('area-line', 'line-color', ['case', ['==', ['get', 'area_id'], selectedId], '#b9e2ff', '#c8d9e4']);
  map.setPaintProperty('area-line', 'line-width', ['case', ['==', ['get', 'area_id'], selectedId], 2, 0.5]);
}

function render() {
  const select = byId('area-select');
  const shown = visibleAreas();
  byId('visible-count').textContent = `${shown.length} / ${areas.length}`;
  byId('map-status').textContent = `NISAR SME2 · ${cityViews[mode].name} · ${mode === 'sample' ? 'SYNTHETIC EXAMPLE' : 'OBSERVED'} · ${shown.length} visible squares · Analysis areas, not farm boundaries`;
  if (!shown.some(area => area.area_id === selectedId)) selectedId = shown[0]?.area_id;
  const area = areas.find(item => item.area_id === selectedId);
  if (!area) {
    byId('area-description').textContent = 'No squares match the selected colour filters.';
    for (const id of ['sample-badge', 'sme2-meta', 'value-change', 'rank-explanation']) byId(id).textContent = '';
    byId('sme2-value').textContent = 'Unavailable';
    byId('selected-square-name').textContent = 'No square selected';
    updateSelectionSpotlight(null);
    byId('with-first').textContent = 'No visible squares';
    byId('timeline').replaceChildren();
    updateMapData();
    renderCropMode();
    return;
  }
  updateMapData();
  const sme2 = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
  const statuses = new Set(area.observations.map(item => item.data_status));
  byId('sample-badge').textContent = statuses.size === 1 ? [...statuses][0].toUpperCase() : 'MIXED STATUS';
  byId('area-description').textContent = mode !== 'sample'
    ? `${area.label}. Surface soil moisture was lower or higher between the two satellite dates.`
    : `${area.label}. Example data.`;
  byId('sme2-value').textContent = readingText(sme2);
  byId('selected-square-name').textContent = labelFor(area);
  byId('sme2-meta').textContent = metadata(sme2);
  updateSelectionSpotlight(sme2);
  const timeline = byId('timeline');
  timeline.replaceChildren();
  for (const item of [...area.observations].sort((a, b) => observationInstant(b) - observationInstant(a))) {
    const li = document.createElement('li');
    const source = item.source === 'NISAR_SME2' ? 'Satellite' : 'Other source';
    const metric = item.metric === 'soil_moisture_change' ? 'change' : item.metric === 'soil_moisture' ? 'surface moisture' : item.metric.replaceAll('_', ' ');
    li.textContent = `${source} ${metric}: ${item.quality === 'missing' ? 'Unavailable' : readingText(item)}`;
    const meta = document.createElement('span');
    meta.textContent = `${metadata(item)}${item.quality === 'valid' ? '' : ' · excluded from inspection priority'}`;
    li.append(meta);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Satellite source and quality notes';
    const provenance = document.createElement('p');
    provenance.textContent = `Source: ${item.source_ref}. ${item.note ?? ''}`;
    details.append(summary, provenance);
    li.append(details);
    timeline.append(li);
  }
  applyDetailMode();
  renderCropMode();
}

function renderCropMode() {
  const report = cropReports[mode];
  const available = mode !== 'sample' && report?.nisar?.matched_cells === collections[mode]?.areas.length && cropAreas.length > 0;
  byId('view-mode').querySelector('[value="crop"]').disabled = !available;
  if (!available) viewMode = 'moisture';
  byId('view-mode').value = viewMode;
  byId('view-mode-note').textContent = available
    ? `Crop and weather context for ${cityViews[mode].name}. Map blocks summarize measured NISAR cells.`
    : mode === 'sample' ? 'Crop mode needs observed satellite measurements.' : 'Crop context is unavailable for this city.';
  const active = viewMode === 'crop' && available;
  document.body.classList.toggle('crop-mode', active);
  byId('crop-panel').hidden = !active;
  byId('map-heading').textContent = active ? 'Crop + weather map' : 'Soil moisture map';
  byId('map-intro').textContent = active ? 'Click a coloured block to inspect its moisture signal.' : 'Choose a city, zoom in, and click a coloured cell to see its change.';
  byId('selection-label').textContent = active ? 'Selected block' : 'Selected square';
  byId('detail-heading').textContent = active ? 'Block moisture signal' : 'Moisture change';
  byId('mode-note').textContent = active
    ? `${cropAreas.length} roughly 1 km blocks from measured NISAR cells. Select a block to inspect its median change.`
    : cityNote;
  if (!active) return;
  const previousCrop = byId('crop-select').value;
  const candidates = report.crop_context.candidates;
  byId('crop-select').replaceChildren(...candidates.map(item => {
    const option = document.createElement('option'); option.value = item.name; option.textContent = item.name; return option;
  }));
  const crop = candidates.find(item => item.name === previousCrop) ?? candidates[0];
  byId('crop-select').value = crop.name;
  byId('crop-season').textContent = `${crop.name}: ${crop.season}. Crop presence and growth stage are unknown.`;
  byId('crop-concern').textContent = report.concern;
  byId('crop-source').href = crop.source;
  byId('crop-source').textContent = `${cityViews[mode].name} crop guidance`;
  const weather = report.temperature;
  byId('crop-weather').textContent = `${weather.seven_day_mean_daily_max_c.toFixed(1)}°C average daily high · ${weather.seven_day_mean_humidity_percent.toFixed(0)}% humidity · ${weather.seven_day_rain_mm.toFixed(1)} mm rain in seven days.`;
  const nisar = report.nisar;
  const direction = nisar.median_change_m3m3 < 0 ? 'lower' : 'higher';
  const uncertainty = nisar.uncertainty
    ? `Only ${(nisar.uncertainty.fraction_change_exceeds_sum_of_uncertainties * 100).toFixed(1)}% exceed summed per-date uncertainty.`
    : 'NISAR uncertainty was not checked for this city.';
  byId('crop-nisar').textContent = `${nisar.matched_cells.toLocaleString()} matched NISAR cells, median ${Math.abs(nisar.median_change_m3m3 * 100).toFixed(1)} points ${direction}. ${uncertainty}`;
  const fusion = report.fusion;
  byId('fusion-nisar').textContent = `NISAR: ${(nisar.fraction_at_least_2_points_drier * 100).toFixed(0)}% of cells fell at least 2 points; counts at 50% or more. ${fusion.signals.nisar_drying ? 'Cue present.' : 'No cue.'}`;
  byId('fusion-heat').textContent = `Heat: ${Math.round(weather.percentile * 100)}th percentile vs 1991–2020; counts at the 90th percentile or above. ${fusion.signals.unusual_heat ? 'Cue present.' : 'No cue.'}`;
  byId('fusion-rain').textContent = `Rain: ${weather.seven_day_rain_mm.toFixed(1)} mm vs ${weather.baseline_rain_median_mm.toFixed(1)} mm typical; counts below the baseline median. ${fusion.signals.low_rain ? 'Cue present.' : 'No cue.'}`;
  byId('fusion-summary').textContent = `${fusion.count} of ${fusion.total} city-level cues coincide. Check local crop and soil conditions; this is not a crop-specific risk result.`;
  const selected = areas.find(item => item.area_id === selectedId);
  const band = selected ? cropInspectionBand(selected) : null;
  const signal = band === 'review' ? 'Review sooner: strongest drying cue' : band === 'watch' ? 'Watch: drying cue' : band === 'steady' ? 'Lower concern from moisture change; crop risk is still unknown' : 'Select a block';
  byId('crop-block-summary').textContent = selected ? `${signal}. Median of ${selected.cell_count} matched cells; change is uncertain.` : signal;
  byId('area-description').textContent = selected ? `This block summarizes ${selected.cell_count} measured NISAR cells. It is not a farm boundary or identified crop.` : 'No block selected.';
  byId('map-status').textContent = `Crop and weather view · ${cityViews[mode].name} · ${visibleAreas().length} derived blocks shown · Crop presence unknown`;
}

function updateSelectionSpotlight(reading) {
  const spotlight = byId('selection-spotlight');
  spotlight.classList.remove('is-drying', 'is-wetting', 'is-updating');
  if (reading?.value < 0) spotlight.classList.add('is-drying');
  if (reading?.value >= 0) spotlight.classList.add('is-wetting');
  // Restart the short acknowledgement animation even when two nearby squares share a value.
  void spotlight.offsetWidth;
  spotlight.classList.add('is-updating');
}

function applyDetailMode() {
  document.body.classList.toggle('technical-mode', detailMode === 'technical');
  const area = areas.find(item => item.area_id === selectedId);
  const sme2 = area ? latestReading(area, 'NISAR_SME2', 'soil_moisture_change') : null;
  const candidate = inspectionSummary(visibleAreas());
  byId('detail-mode').textContent = detailMode === 'easy' ? 'Easy view' : 'Advanced view';
  byId('detail-mode').setAttribute('aria-pressed', String(detailMode === 'technical'));
  if (detailMode !== 'easy') return;
  byId('map-status').textContent = `NISAR map · ${cityViews[mode].name} · ${visibleAreas().length} areas shown · Not farm boundaries`;
  const direction = sme2?.value < 0 ? 'drier' : sme2?.value > 0 ? 'wetter' : 'about the same';
  byId('area-description').textContent = area ? `This area looks ${direction} at the surface between the two NISAR visits.` : 'No area is selected.';
  byId('value-change').textContent = candidate
    ? `Start here: this area became drier than the others. Look at the soil before deciding what to do.`
    : 'There is not enough usable satellite information to choose a first area.';
  byId('rank-explanation').textContent = 'This map helps you choose where to look. It does not tell you to water.';
}

function selectArea(id, panToArea = false) {
  selectedId = id;
  render();
  if (panToArea) {
    const area = areas.find(item => item.area_id === id);
    const ring = area?.geometry.coordinates[0];
    if (ring) map.easeTo({ center: ring[0], duration: 450 });
  }
}

function useCollection(nextMode) {
  if (!collections[nextMode]) return;
  const keepCropMode = viewMode === 'crop';
  mode = nextMode;
  cropAreas = cropBlocks(collections[mode].areas);
  viewMode = keepCropMode && mode !== 'sample' && cropReports[mode] ? 'crop' : 'moisture';
  areas = viewMode === 'crop' ? cropAreas : collections[mode].areas;
  selectedId = areas[0].area_id;
  byId('data-mode').value = mode;
  const dates = [...new Set(areas.flatMap(area => area.observations.map(item => item.observed_at.slice(0, 10))))].sort();
  cityNote = mode === 'sample'
    ? 'Synthetic example, not satellite measurements. Kept separate from observed cities.'
    : `${cityViews[mode].name} · ${dates.join(' / ')} · ${areas.length} measured squares. ${areas[0].area_id.includes('-pixel-') ? 'One matched satellite pixel per square.' : 'Each square summarizes a larger analysis area.'} Gaps have no usable paired reading.`;
  byId('mode-note').textContent = cityNote;
  byId('map').setAttribute('aria-label', `Interactive map centered on ${cityViews[mode].name}`);
  render();
  map.setMaxBounds(null);
  fitRegion(cityViews[mode].bounds);
  map.setMaxBounds(cityViews[mode].region);
}

async function initializeMap() {
  try {
    maplibregl = await import('https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs');
  } catch (error) {
    byId('map').textContent = `The live basemap could not load: ${error.message}. Check the network connection and refresh.`;
    byId('map').setAttribute('role', 'status');
    return false;
  }
  map = new maplibregl.Map({
    container: 'map', center: pilotCenter, zoom: 11, minZoom: 9, maxZoom: 16,
    maxBounds: stateBounds, bearing: -20, pitch: 45, pitchWithRotate: true,
    style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] }
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');
  await new Promise(resolve => map.once('load', resolve));
  setBasemap(true);
  map.addSource('pilot-window', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[79.74, 10.70], [79.80, 10.70], [79.80, 10.76], [79.74, 10.76], [79.74, 10.70]]] } } });
  map.addLayer({ id: 'pilot-fill', type: 'fill', source: 'pilot-window', paint: { 'fill-color': '#f9ab00', 'fill-opacity': 0.05 } });
  map.addLayer({ id: 'pilot-outline', type: 'line', source: 'pilot-window', paint: { 'line-color': '#f9ab00', 'line-width': 2, 'line-dasharray': [2, 2] } });
  map.addSource('areas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas', paint: { 'fill-color': '#9aa0a6', 'fill-opacity': 0.42 } });
  map.addLayer({ id: 'area-line', type: 'line', source: 'areas', paint: { 'line-color': '#ffffff', 'line-width': 1 } });
  map.on('mouseenter', 'area-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'area-fill', () => { map.getCanvas().style.cursor = ''; });
  map.on('click', 'area-fill', event => selectArea(event.features[0].properties.area_id, true));
  return true;
}

byId('area-select').addEventListener('change', event => selectArea(event.target.value, true));
byId('data-mode').addEventListener('change', event => useCollection(event.target.value));
byId('detail-mode').addEventListener('click', () => {
  detailMode = detailMode === 'easy' ? 'technical' : 'easy';
  applyDetailMode();
  renderCropMode();
});
byId('view-mode').addEventListener('change', event => {
  viewMode = event.target.value;
  areas = viewMode === 'crop' ? cropAreas : collections[mode].areas;
  selectedId = areas[0]?.area_id;
  document.querySelectorAll('input[name="band"]').forEach(input => { input.checked = true; });
  render();
});
byId('crop-select').addEventListener('change', renderCropMode);
document.querySelectorAll('input[name="band"]').forEach(input => input.addEventListener('change', render));
document.querySelectorAll('input[name="crop-band"]').forEach(input => input.addEventListener('change', render));

byId('state-view').addEventListener('click', () => fitRegion(cityViews[mode].region));
byId('pilot-view').addEventListener('click', () => fitRegion(cityViews[mode].bounds));
byId('dark-view').addEventListener('click', () => setBasemap(true));
byId('street-view').addEventListener('click', () => setBasemap(false));
byId('camera-view').textContent = 'Top-down';
byId('camera-view').setAttribute('aria-pressed', 'true');
byId('camera-view').addEventListener('click', () => {
  const tilted = map?.getPitch() > 0;
  map?.easeTo({ pitch: tilted ? 0 : 45, bearing: tilted ? 0 : -20, duration: 600 });
  byId('camera-view').textContent = tilted ? 'Tilt' : 'Top-down';
  byId('camera-view').setAttribute('aria-pressed', String(!tilted));
});

let started = false;
let tourIndex = 0;
let tourPlaying = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let tourTimer;
const tourSteps = [
  { title: 'Choose a city', copy: 'Use Choose a city on the right to switch between Nagapattinam, Ludhiana, Ahmedabad, and Nairobi.', target: 'data-mode' },
  { title: 'See the wider region', copy: 'Region zooms out to show the area around the selected city. Try it to see where the analysis squares sit in the surrounding landscape.', target: 'state-view' },
  { title: 'Return to the squares', copy: 'Fit squares brings all analysis squares for the selected city back into view. Use it whenever you lose your place after panning or zooming.', target: 'pilot-view' },
  { title: 'Change the viewing angle', copy: 'Tilt gives you an angled view of the map. The button then becomes Top-down; press it to return to looking straight down. The measurements stay the same.', target: 'camera-view' },
  { title: 'Choose a map style', copy: 'Dark and Street change the appearance of the background map. The coloured moisture squares and their readings stay the same. Try both to see which is easier to read.', target: 'basemap-controls' },
  { title: 'Look at the squares', copy: 'Each coloured shape is an analysis area, not a farm boundary. Select one on the map to inspect its satellite measurements.', target: 'map-canvas' },
  { title: 'Read the change', copy: 'The selected square shows how surface moisture changed between two NISAR dates. Open the timeline for dates, quality, and source granules.', target: 'detail-heading' },
  { title: 'Filter the colours', copy: 'Warm colours show lower surface moisture; green means steady or higher. Turn colour groups on or off to focus the view.', target: 'filter-heading' },
  { title: 'Choose what to inspect', copy: 'The scouting brief follows the strongest local drying among visible squares. Check local conditions before any water decision.', target: 'value-heading' },
  { title: 'Revisit this guide', copy: 'About takes you back to the NISAR introduction. You can start this guided tour again from there whenever you need a reminder.', target: 'about-view' },
];
function closeTour() {
  clearTimeout(tourTimer);
  byId('map-tour').hidden = true;
  document.querySelectorAll('.tour-target').forEach(element => element.classList.remove('tour-target'));
  if (!byId('map-app').hidden) byId('about-view').focus();
}
function positionTour(target) {
  const card = byId('map-tour');
  if (card.hidden || !target || window.innerWidth <= 760) return;
  const rect = target.getBoundingClientRect();
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
  let left;
  let top;
  let placement;
  if (target.closest('.map-search')) {
    left = clamp(rect.left + rect.width / 2 - width / 2, 18, window.innerWidth - width - 18);
    top = rect.bottom + 22;
    placement = 'below';
    card.style.setProperty('--tour-arrow-left', `${clamp(rect.left + rect.width / 2 - left - 8, 20, width - 36)}px`);
  } else if (target.classList.contains('map-canvas')) {
    const area = areas.find(item => item.area_id === selectedId);
    const ring = area?.geometry.coordinates[0];
    const center = ring && map ? map.project([
      ring.slice(0, -1).reduce((sum, point) => sum + point[0], 0) / (ring.length - 1),
      ring.slice(0, -1).reduce((sum, point) => sum + point[1], 0) / (ring.length - 1)
    ]) : { x: window.innerWidth * .5, y: window.innerHeight * .45 };
    left = clamp(center.x - width - 34, 18, window.innerWidth - width - 18);
    top = clamp(center.y - height - 35, 120, window.innerHeight - height - 54);
    placement = 'map';
  } else if (target.closest('.inspection-summary')) {
    const summary = target.closest('.inspection-summary').getBoundingClientRect();
    left = clamp(summary.left, 18, window.innerWidth - width - 18);
    top = clamp(summary.top - height - 18, 18, window.innerHeight - height - 18);
    placement = 'above';
  } else {
    left = clamp(rect.left - width - 27, 18, window.innerWidth - width - 18);
    top = clamp(rect.top - 18, 18, window.innerHeight - height - 18);
    placement = 'left';
  }
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.dataset.placement = placement;
}
function renderTour() {
  const step = tourSteps[tourIndex];
  byId('tour-title').textContent = step.title;
  byId('tour-copy').textContent = step.copy;
  byId('tour-count').textContent = `${String(tourIndex + 1).padStart(2, '0')} / ${String(tourSteps.length).padStart(2, '0')}`;
  byId('tour-next').textContent = tourIndex === tourSteps.length - 1 ? 'Finish →' : 'Next →';
  byId('tour-play').textContent = tourPlaying ? 'Ⅱ Pause' : '▶ Play';
  byId('tour-play').setAttribute('aria-label', tourPlaying ? 'Pause tutorial' : 'Play tutorial');
  byId('tour-play').setAttribute('aria-pressed', String(tourPlaying));
  byId('tour-state').textContent = tourPlaying ? 'Playing' : 'Paused';
  document.querySelectorAll('.tour-target').forEach(element => element.classList.remove('tour-target'));
  const target = step.target === 'map-canvas' ? document.querySelector('.map-canvas') : byId(step.target);
  target?.classList.add('tour-target');
  if (window.innerWidth <= 760) {
    if (step.target === 'map-canvas') window.scrollTo({ top: 0, behavior: 'smooth' });
    else target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (target?.closest('.inspector')) {
    target.scrollIntoView({ block: 'nearest' });
  }
  requestAnimationFrame(() => positionTour(target));
}
window.addEventListener('resize', () => {
  if (!byId('map-tour').hidden) positionTour(document.querySelector('.tour-target'));
});
function scheduleTour() {
  clearTimeout(tourTimer);
  if (tourPlaying && !byId('map-tour').hidden) tourTimer = setTimeout(() => {
    if (tourIndex < tourSteps.length - 1) {
      tourIndex += 1;
      renderTour();
      scheduleTour();
    } else {
      tourPlaying = false;
      renderTour();
    }
  }, 8000);
}
function moveTour(direction) {
  if (direction > 0 && tourIndex === tourSteps.length - 1) { closeTour(); return; }
  tourIndex = Math.max(0, Math.min(tourSteps.length - 1, tourIndex + direction));
  renderTour();
  scheduleTour();
}
function openTour() {
  tourIndex = 0;
  tourPlaying = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  byId('map-tour').hidden = false;
  renderTour();
  scheduleTour();
  byId('tour-play').focus();
}
byId('tour-back').addEventListener('click', () => moveTour(-1));
byId('tour-next').addEventListener('click', () => moveTour(1));
byId('tour-play').addEventListener('click', () => { tourPlaying = !tourPlaying; renderTour(); scheduleTour(); });
byId('tour-close').addEventListener('click', closeTour);
async function enterMap(withTour) {
  byId('welcome').hidden = true;
  byId('map-app').hidden = false;
  byId('map-app').inert = false;
  byId('map-app').removeAttribute('aria-hidden');
  window.scrollTo(0, 0);
  let ready = true;
  if (!started) {
    started = true;
    ready = await startMap();
  } else {
    map?.resize();
  }
  if (!byId('welcome').hidden) return;
  if (withTour && ready) openTour();
  else byId('about-view').focus();
}
byId('start-tour').addEventListener('click', () => enterMap(true));
byId('skip-tour').addEventListener('click', () => enterMap(false));
byId('about-view').addEventListener('click', () => {
  closeTour();
  byId('map-app').hidden = true;
  byId('map-app').inert = true;
  byId('map-app').setAttribute('aria-hidden', 'true');
  byId('welcome').hidden = false;
  window.scrollTo(0, 0);
  byId('start-tour').focus();
});

async function startMap() {
try {
  const response = await fetch('./crop-reports.json');
  if (response.ok) cropReports = await response.json();
} catch { cropReports = {}; }
const mapReady = await initializeMap();
if (mapReady) {
  try {
    const sampleResponse = await fetch('./sample-areas.json');
    if (!sampleResponse.ok) throw new Error(`Sample HTTP ${sampleResponse.status}`);
    collections.sample = await sampleResponse.json();
    byId('data-mode').querySelector('[value="sample"]').disabled = false;
    try {
      const observedResponse = await fetch('./observed-areas.json');
      if (!observedResponse.ok) throw new Error(`Observed HTTP ${observedResponse.status}`);
      collections.observed = await observedResponse.json();
      cropAreas = cropBlocks(collections.observed.areas);
      byId('data-mode').querySelector('[value="observed"]').disabled = false;
      byId('mode-note').textContent = 'Measured satellite squares are separate from the example data. Long-term regional history is not available yet.';
      useCollection('observed');
    } catch (error) {
      byId('data-mode').querySelector('[value="observed"]').disabled = true;
      byId('mode-note').textContent = `Observed view unavailable: ${error.message}. Synthetic sample is shown.`;
      useCollection('sample');
    }
    await Promise.all(['ludhiana', 'ahmedabad', 'nairobi'].map(async city => {
      const option = byId('data-mode').querySelector(`[value="${city}"]`);
      try {
        const response = await fetch(`./${city}-areas.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const collection = await response.json();
        if (!collection.areas?.length) throw new Error('No usable squares');
        collections[city] = collection;
        option.disabled = false;
      } catch {
        option.textContent = `${cityViews[city].name} · unavailable`;
      }
    }));
  } catch (error) {
    byId('area-description').textContent = `Could not load areas: ${error.message}`;
  }
}
return mapReady;
}
