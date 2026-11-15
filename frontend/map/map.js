import { inspectionBand, inspectionSummary, latestReading, observationInstant } from './map-data.mjs';

const byId = id => document.getElementById(id);
const pilotBounds = [[79.68, 10.64], [79.86, 10.82]];
const stateBounds = [[79.20, 10.30], [80.35, 11.10]];
const pilotCenter = [79.77, 10.73];
const cityViews = {
  sample: { name: 'Synthetic example', bounds: pilotBounds, region: stateBounds },
  observed: { name: 'Nagapattinam', bounds: pilotBounds, region: stateBounds },
  ludhiana: { name: 'Ludhiana', bounds: [[75.76, 30.81], [75.94, 30.99]], region: [[75.35, 30.4], [76.35, 31.4]] },
  ahmedabad: { name: 'Ahmedabad', bounds: [[72.49, 22.93], [72.67, 23.11]], region: [[72.08, 22.52], [73.08, 23.52]] },
};
const collections = {};
let mode = 'sample';
let areas = [];
let selectedId;
let map;
let maplibregl;

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
  return `${item.observed_at.slice(0, 10)} · local satellite measurement`;
}

function labelFor(area) {
  if (mode !== 'sample') return area.label.replace(/^.* satellite analysis square — /, '');
  return `Sample ${area.label.match(/field\s+([A-Za-z0-9]+)/i)?.[1] ?? area.area_id}`;
}

function featureCollection() {
  const visibleBands = new Set([...document.querySelectorAll('input[name="band"]:checked')].map(input => input.value));
  return {
    type: 'FeatureCollection',
    features: areas.filter(area => visibleBands.has(inspectionBand(area))).map(area => ({ type: 'Feature', properties: { area_id: area.area_id, label: labelFor(area), band: inspectionBand(area) }, geometry: area.geometry }))
  };
}

function visibleAreas() {
  const visibleIds = new Set(featureCollection().features.map(feature => feature.properties.area_id));
  return areas.filter(area => visibleIds.has(area.area_id));
}

function updateMapData() {
  if (!map?.getSource('areas')) return;
  map.getSource('areas')?.setData(featureCollection());
  map.setPaintProperty('area-fill', 'fill-color', ['match', ['get', 'band'], 'review', '#f07861', 'watch', '#efb352', 'lower', '#e4d57b', 'steady', '#82c7a5', '#8997a8']);
  map.setPaintProperty('area-fill', 'fill-opacity', ['case', ['==', ['get', 'area_id'], selectedId], 0.72, 0.42]);
  map.setPaintProperty('area-line', 'line-color', ['case', ['==', ['get', 'area_id'], selectedId], '#b9e2ff', '#c8d9e4']);
  map.setPaintProperty('area-line', 'line-width', ['case', ['==', ['get', 'area_id'], selectedId], 3, 1]);
}

function render() {
  const select = byId('area-select');
  const shown = visibleAreas();
  byId('visible-count').textContent = `${shown.length} / ${areas.length}`;
  byId('map-status').textContent = `NISAR SME2 · ${cityViews[mode].name} · ${mode === 'sample' ? 'SYNTHETIC EXAMPLE' : 'OBSERVED'} · ${shown.length} visible squares · Analysis areas, not farm boundaries`;
  if (!shown.some(area => area.area_id === selectedId)) selectedId = shown[0]?.area_id;
  select.replaceChildren(...shown.map(area => new Option(area.label, area.area_id)));
  select.value = selectedId;
  const area = areas.find(item => item.area_id === selectedId);
  if (!area) {
    byId('area-description').textContent = 'No squares match the selected colour filters.';
    for (const id of ['sample-badge', 'sme2-meta', 'value-change', 'rank-explanation']) byId(id).textContent = '';
    byId('sme2-value').textContent = 'Unavailable';
    byId('with-first').textContent = 'No visible squares';
    byId('timeline').replaceChildren();
    updateMapData();
    return;
  }
  updateMapData();
  const sme2 = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
  const statuses = new Set(area.observations.map(item => item.data_status));
  byId('sample-badge').textContent = statuses.size === 1 ? [...statuses][0].toUpperCase() : 'MIXED STATUS';
  byId('area-description').textContent = mode !== 'sample'
    ? `${area.label}. Surface soil moisture was lower or higher between the two satellite dates.`
    : `${area.label}. Example data.`;
  const candidate = inspectionSummary(shown);
  byId('with-first').textContent = candidate ? candidate.area.label.split(' (')[0] : 'Insufficient local evidence';
  byId('value-change').textContent = candidate
    ? `${candidate.area.label.split(' (')[0]} had the largest moisture decrease (${readingText(candidate.change)}). Check this square first.`
    : 'No local measurement suggests a first square to check.';
  byId('rank-explanation').textContent = 'Among visible squares, priority follows local surface moisture change. Colour bands are inspection guides, not calibrated irrigation thresholds.';
  byId('sme2-value').textContent = readingText(sme2);
  byId('sme2-meta').textContent = metadata(sme2);
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
  mode = nextMode;
  areas = collections[mode].areas;
  selectedId = areas[0].area_id;
  byId('data-mode').value = mode;
  const dates = [...new Set(areas.flatMap(area => area.observations.map(item => item.observed_at.slice(0, 10))))].sort();
  byId('mode-note').textContent = mode === 'sample'
    ? 'Synthetic example, not satellite measurements. Kept separate from observed cities.'
    : `${cityViews[mode].name} · ${dates.join(' / ')}. ${areas.length} of 36 analysis squares have matched usable cells; gaps are omitted. SMAP history and crop evidence unavailable.`;
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
    maxBounds: stateBounds, bearing: 0, pitch: 0, pitchWithRotate: true,
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
document.querySelectorAll('input[name="band"]').forEach(input => input.addEventListener('change', render));
byId('state-view').addEventListener('click', () => fitRegion(cityViews[mode].region));
byId('pilot-view').addEventListener('click', () => fitRegion(cityViews[mode].bounds));
byId('dark-view').addEventListener('click', () => setBasemap(true));
byId('street-view').addEventListener('click', () => setBasemap(false));
byId('camera-view').addEventListener('click', () => {
  const tilted = map?.getPitch() > 0;
  map?.easeTo({ pitch: tilted ? 0 : 45, bearing: tilted ? 0 : -20, duration: 600 });
  byId('camera-view').textContent = tilted ? 'Tilt' : 'Top-down';
  byId('camera-view').setAttribute('aria-pressed', String(!tilted));
});

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
      byId('data-mode').querySelector('[value="observed"]').disabled = false;
      byId('mode-note').textContent = 'Measured satellite squares are separate from the example data. Long-term regional history is not available yet.';
      useCollection('observed');
    } catch (error) {
      byId('data-mode').querySelector('[value="observed"]').disabled = true;
      byId('mode-note').textContent = `Observed view unavailable: ${error.message}. Synthetic sample is shown.`;
      useCollection('sample');
    }
    await Promise.all(['ludhiana', 'ahmedabad'].map(async city => {
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
