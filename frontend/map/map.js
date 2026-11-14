import { inspectionSummary, latestReading, observationInstant } from './map-data.mjs';

const byId = id => document.getElementById(id);
const pilotBounds = [[79.74, 10.70], [79.80, 10.76]];
const stateBounds = [[79.20, 10.30], [80.35, 11.10]];
const pilotCenter = [79.77, 10.73];
const collections = {};
let mode = 'sample';
let areas = [];
let selectedId;
let map;
let maplibregl;

function readingText(item) {
  if (!item) return 'Unavailable';
  const sign = item.metric === 'soil_moisture_change' && item.value > 0 ? '+' : '';
  return `${sign}${item.value} ${item.unit}`;
}

function metadata(item) {
  if (!item) return 'No quality-valid reading';
  return `${item.observed_at.slice(0, 10)} · ${item.spatial_scale} · ${item.quality} · ${item.data_status}`;
}

function labelFor(area) {
  if (mode === 'observed') return area.area_id.split('-').at(-1).toUpperCase();
  return `Sample ${area.label.match(/field\s+([A-Za-z0-9]+)/i)?.[1] ?? area.area_id}`;
}

function displayPilotPanel() {
  byId('pilot-panel').hidden = false;
  byId('pilot-panel').scrollIntoView({ block: 'nearest' });
}

function featureCollection() {
  return {
    type: 'FeatureCollection',
    features: areas.map(area => ({ type: 'Feature', properties: { area_id: area.area_id, label: labelFor(area) }, geometry: area.geometry }))
  };
}

function updateMapData() {
  if (!map?.getSource('areas')) return;
  map.getSource('areas')?.setData(featureCollection());
  map.setPaintProperty('area-fill', 'fill-color', ['case', ['==', ['get', 'area_id'], selectedId], '#ea4335', '#1a73e8']);
  map.setPaintProperty('area-line', 'line-color', ['case', ['==', ['get', 'area_id'], selectedId], '#c5221f', '#1967d2']);
  map.setPaintProperty('area-line', 'line-width', ['case', ['==', ['get', 'area_id'], selectedId], 3, 2]);
}

function render() {
  const select = byId('area-select');
  select.replaceChildren(...areas.map(area => new Option(area.label, area.area_id)));
  select.value = selectedId;
  const area = areas.find(item => item.area_id === selectedId);
  if (!area) return;
  updateMapData();
  const sme2 = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
  const smap = latestReading(area, 'SMAP', 'seasonal_baseline');
  const statuses = new Set(area.observations.map(item => item.data_status));
  byId('sample-badge').textContent = statuses.size === 1 ? [...statuses][0].toUpperCase() : 'MIXED STATUS';
  byId('area-description').textContent = mode === 'observed'
    ? `${area.label}. This is an analysis tile, not a surveyed field or verified crop. Local surface moisture only; crop stage unknown.`
    : `${area.label}. This synthetic fixture area is outside the Nagapattinam development window.`;
  const candidate = inspectionSummary(areas);
  byId('with-first').textContent = candidate ? candidate.area.label.split(' (')[0] : 'Insufficient local evidence';
  byId('value-change').textContent = candidate
    ? `${candidate.area.label.split(' (')[0]} has the strongest quality-valid local drying signal (${readingText(candidate.change)}). Inspect this area first if a visit is needed; this is not a watering decision.`
    : 'No quality-valid local drying signal supports a first inspection area.';
  byId('rank-explanation').textContent = 'A below-historical-standard flag needs quality-valid current and same-cell seasonal SMAP history. That comparison is unavailable, so no historical-risk claim is shown. Crop stage does not set this priority.';
  byId('sme2-value').textContent = readingText(sme2);
  byId('sme2-meta').textContent = metadata(sme2);
  byId('smap-value').textContent = readingText(smap);
  byId('smap-meta').textContent = smap ? `9 km regional context · ${metadata(smap)}` : 'Regional SMAP context unavailable for this area';
  const timeline = byId('timeline');
  timeline.replaceChildren();
  for (const item of [...area.observations].sort((a, b) => observationInstant(b) - observationInstant(a))) {
    const li = document.createElement('li');
    const source = item.source === 'NISAR_SME2' ? 'Local SME2' : item.source === 'SMAP' ? 'Regional SMAP' : 'Crop context';
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
  if (!smap) timeline.append(Object.assign(document.createElement('li'), { textContent: 'Regional SMAP context: unavailable' }));
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
  mode = nextMode;
  areas = collections[mode].areas;
  selectedId = areas[0].area_id;
  byId('data-mode').value = mode;
  render();
  if (mode === 'observed') map.fitBounds(pilotBounds, { padding: 48, maxZoom: 13, duration: 600 });
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
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
  await new Promise(resolve => map.once('load', resolve));
  map.addSource('pilot-window', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[79.74, 10.70], [79.80, 10.70], [79.80, 10.76], [79.74, 10.76], [79.74, 10.70]]] } } });
  map.addLayer({ id: 'pilot-fill', type: 'fill', source: 'pilot-window', paint: { 'fill-color': '#f9ab00', 'fill-opacity': 0.05 } });
  map.addLayer({ id: 'pilot-outline', type: 'line', source: 'pilot-window', paint: { 'line-color': '#f9ab00', 'line-width': 2, 'line-dasharray': [2, 2] } });
  map.addSource('areas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas', paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.30 } });
  map.addLayer({ id: 'area-line', type: 'line', source: 'areas', paint: { 'line-color': '#1967d2', 'line-width': 2 } });
  map.on('mouseenter', 'area-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'area-fill', () => { map.getCanvas().style.cursor = ''; });
  map.on('click', 'area-fill', event => selectArea(event.features[0].properties.area_id, true));
  map.on('click', 'pilot-outline', displayPilotPanel);
  return true;
}

byId('area-select').addEventListener('change', event => selectArea(event.target.value, true));
byId('data-mode').addEventListener('change', event => useCollection(event.target.value));
byId('state-view').addEventListener('click', () => map?.fitBounds(stateBounds, { padding: 48, duration: 600 }));
byId('pilot-view').addEventListener('click', () => map?.fitBounds(pilotBounds, { padding: 48, maxZoom: 13, duration: 600 }));
byId('camera-view').addEventListener('click', () => {
  const tilted = map?.getPitch() > 0;
  map?.easeTo({ pitch: tilted ? 0 : 45, bearing: tilted ? 0 : -20, duration: 600 });
  byId('camera-view').textContent = tilted ? 'Tilt' : 'Top-down';
});

const mapReady = await initializeMap();
if (mapReady) {
  try {
    const sampleResponse = await fetch('./sample-areas.json');
    if (!sampleResponse.ok) throw new Error(`Sample HTTP ${sampleResponse.status}`);
    collections.sample = await sampleResponse.json();
    try {
      const observedResponse = await fetch('./observed-areas.json');
      if (!observedResponse.ok) throw new Error(`Observed HTTP ${observedResponse.status}`);
      collections.observed = await observedResponse.json();
      byId('mode-note').textContent = 'Observed NISAR tiles are separate from the synthetic sample. SMAP history is unavailable.';
      useCollection('observed');
    } catch (error) {
      byId('data-mode').querySelector('[value="observed"]').disabled = true;
      byId('mode-note').textContent = `Observed view unavailable: ${error.message}. Synthetic sample is shown.`;
      useCollection('sample');
    }
  } catch (error) {
    byId('area-description').textContent = `Could not load areas: ${error.message}`;
  }
}
