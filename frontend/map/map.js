import { inspectionSummary, latestReading, observationInstant } from './map-data.mjs';

const byId = id => document.getElementById(id);
const pilotBounds = [[10.70, 79.74], [10.76, 79.80]];
const indiaCenter = [22.6, 79.7];
const pilotCenter = [10.73, 79.77];
const collections = {};
let mode = 'sample';
let areas = [];
let selectedId;
let map;
let overlayLayer;

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

function toLatLngs(ring) { return ring.map(([longitude, latitude]) => [latitude, longitude]); }

function displayPilotPanel() {
  byId('pilot-panel').hidden = false;
  byId('pilot-panel').scrollIntoView({ block: 'nearest' });
}

function drawOverlays() {
  if (!map || !window.L) return;
  overlayLayer?.clearLayers();
  overlayLayer = window.L.layerGroup().addTo(map);
  const pilot = window.L.rectangle(pilotBounds, { color: '#f9ab00', weight: 2, dashArray: '6 5', fillOpacity: 0.05 });
  pilot.bindTooltip('Nagapattinam development window', { className: 'area-tooltip', sticky: true });
  pilot.on('click', displayPilotPanel);
  pilot.addTo(overlayLayer);
  for (const area of areas) {
    const selected = area.area_id === selectedId;
    const polygon = window.L.polygon(toLatLngs(area.geometry.coordinates[0]), {
      color: selected ? '#c5221f' : '#1967d2', weight: selected ? 3 : 2,
      fillColor: selected ? '#ea4335' : '#1a73e8', fillOpacity: selected ? 0.42 : 0.28
    });
    polygon.bindTooltip(labelFor(area), { className: 'area-tooltip', sticky: true });
    polygon.on('click', () => selectArea(area.area_id, true));
    polygon.addTo(overlayLayer);
  }
}

function render() {
  const select = byId('area-select');
  select.replaceChildren(...areas.map(area => new Option(area.label, area.area_id)));
  select.value = selectedId;
  const area = areas.find(item => item.area_id === selectedId);
  if (!area) return;
  drawOverlays();
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
  const area = areas.find(item => item.area_id === id);
  if (panToArea && map && area) map.panTo(window.L.polygon(toLatLngs(area.geometry.coordinates[0])).getBounds().getCenter());
}

function useCollection(nextMode) {
  mode = nextMode;
  areas = collections[mode].areas;
  selectedId = areas[0].area_id;
  byId('data-mode').value = mode;
  render();
  if (mode === 'observed') map.fitBounds(pilotBounds, { padding: [38, 38] });
}

function initializeMap() {
  if (!window.L) {
    byId('map').textContent = 'The live basemap could not load. Check the network connection and refresh.';
    byId('map').setAttribute('role', 'status');
    return false;
  }
  map = window.L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView(pilotCenter, 11);
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return true;
}

byId('area-select').addEventListener('change', event => selectArea(event.target.value, true));
byId('data-mode').addEventListener('change', event => useCollection(event.target.value));
byId('india-view').addEventListener('click', () => map?.setView(indiaCenter, 5));
byId('pilot-view').addEventListener('click', () => map?.fitBounds(pilotBounds, { padding: [38, 38] }));

const mapReady = initializeMap();
try {
  const sampleResponse = await fetch('./sample-areas.json');
  if (!sampleResponse.ok) throw new Error(`Sample HTTP ${sampleResponse.status}`);
  collections.sample = await sampleResponse.json();
  try {
    const observedResponse = await fetch('./observed-areas.json');
    if (!observedResponse.ok) throw new Error(`Observed HTTP ${observedResponse.status}`);
    collections.observed = await observedResponse.json();
    byId('mode-note').textContent = 'Observed NISAR tiles are separate from the synthetic sample. SMAP history is unavailable.';
    if (mapReady) useCollection('observed');
  } catch (error) {
    byId('data-mode').querySelector('[value="observed"]').disabled = true;
    byId('mode-note').textContent = `Observed view unavailable: ${error.message}. Synthetic sample is shown.`;
    if (mapReady) useCollection('sample');
  }
} catch (error) {
  byId('area-description').textContent = `Could not load areas: ${error.message}`;
}
