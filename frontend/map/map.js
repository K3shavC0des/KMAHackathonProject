import { inspectionSummary, latestReading } from './map-data.mjs';

const byId = id => document.getElementById(id);
const svgNs = 'http://www.w3.org/2000/svg';
const pilotBounds = [79.74, 10.70, 79.80, 10.76];
const collections = {};
let mode = 'sample';
let areas = [];
let selectedId;
let viewport = [0, 0, 640, 390];
let drag;

function addSvg(tag, attributes, parent) {
  const element = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  parent.append(element);
  return element;
}

function readingText(item) {
  if (!item) return 'Unavailable';
  const sign = item.metric === 'soil_moisture_change' && item.value > 0 ? '+' : '';
  return `${sign}${typeof item.value === 'number' ? item.value.toFixed(4) : item.value} ${item.unit}`;
}

function metadata(item) {
  if (!item) return 'No quality-valid reading';
  return `${item.observed_at.slice(0, 10)} · ${item.spatial_scale} · ${item.quality} · ${item.data_status}`;
}

function labelFor(area) {
  if (mode === 'observed') return area.area_id.split('-').at(-1).toUpperCase();
  return `Sample ${area.label.match(/field\s+([A-Za-z0-9]+)/i)?.[1] ?? area.area_id}`;
}

function setViewport() { byId('map').setAttribute('viewBox', viewport.join(' ')); }

function zoom(factor) {
  const nextWidth = Math.max(80, Math.min(640, viewport[2] * factor));
  const ratio = nextWidth / viewport[2];
  const nextHeight = viewport[3] * ratio;
  viewport = [viewport[0] + (viewport[2] - nextWidth) / 2,
    viewport[1] + (viewport[3] - nextHeight) / 2, nextWidth, nextHeight];
  setViewport();
}

function drawMap() {
  const map = byId('map');
  map.replaceChildren();
  addSvg('rect', { width: 640, height: 390, fill: '#e6e9df' }, map);
  const points = areas.flatMap(area => area.geometry.coordinates.flat(1)).concat([
    [pilotBounds[0], pilotBounds[1]], [pilotBounds[2], pilotBounds[3]]
  ]);
  const longitudes = points.map(point => point[0]);
  const latitudes = points.map(point => point[1]);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const lonRange = Math.max(maxLon - minLon, 0.01);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const x = lon => 80 + 480 * (lon - minLon) / lonRange;
  const y = lat => 320 - 250 * (lat - minLat) / latRange;
  const pilot = addSvg('g', { class: 'pilot-window', role: 'button', tabindex: 0,
    'aria-label': 'Show Nagapattinam development window evidence' }, map);
  addSvg('rect', { x: x(pilotBounds[0]), y: y(pilotBounds[3]),
    width: x(pilotBounds[2]) - x(pilotBounds[0]), height: y(pilotBounds[1]) - y(pilotBounds[3]) }, pilot);
  addSvg('text', { x: x(pilotBounds[0]) + 5, y: y(pilotBounds[3]) - 12 }, pilot).textContent = 'Nagapattinam window';
  const showPilot = () => { byId('pilot-panel').hidden = false; byId('pilot-panel').scrollIntoView({ block: 'nearest' }); };
  pilot.addEventListener('click', showPilot);
  pilot.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showPilot(); }
  });
  for (const area of areas) {
    const ring = area.geometry.coordinates[0];
    const group = addSvg('g', { class: 'marker', tabindex: 0, role: 'button',
      'aria-label': `Show evidence for ${area.label}`, 'aria-current': area.area_id === selectedId }, map);
    addSvg('polygon', { points: ring.map(point => `${x(point[0])},${y(point[1])}`).join(' ') }, group);
    const midLon = ring.reduce((total, point) => total + point[0], 0) / ring.length;
    const midLat = ring.reduce((total, point) => total + point[1], 0) / ring.length;
    addSvg('text', { x: x(midLon), y: y(midLat) - 58, 'text-anchor': 'middle' }, group).textContent = labelFor(area);
    const select = () => selectArea(area.area_id, true);
    group.addEventListener('click', select);
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
    });
  }
  setViewport();
}

function render() {
  const select = byId('area-select');
  select.replaceChildren(...areas.map(area => new Option(area.label, area.area_id)));
  select.value = selectedId;
  drawMap();
  const area = areas.find(item => item.area_id === selectedId);
  const sme2 = latestReading(area, 'NISAR_SME2', 'soil_moisture_change');
  const smap = latestReading(area, 'SMAP', 'seasonal_baseline');
  const statuses = new Set(area.observations.map(item => item.data_status));
  byId('sample-badge').textContent = statuses.size === 1 ? [...statuses][0].toUpperCase() : 'MIXED STATUS';
  byId('area-description').textContent = mode === 'observed'
    ? `${area.label}. This is an analysis tile, not a surveyed field or verified crop. Local surface moisture only; crop stage unknown.`
    : `${area.label}. This synthetic fixture area is outside the Nagapattinam development window.`;
  const candidate = inspectionSummary(areas);
  byId('with-first').textContent = candidate ? candidate.area.label.split(' (')[0] : 'Insufficient local evidence';
  byId('without-first').textContent = 'Unavailable';
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
  for (const item of [...area.observations].sort((a, b) => b.observed_at.localeCompare(a.observed_at))) {
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
  if (!smap) {
    const li = document.createElement('li');
    li.textContent = 'Regional SMAP context: unavailable';
    timeline.append(li);
  }
}

function selectArea(id, scroll = false) {
  selectedId = id;
  render();
  if (scroll) byId('detail-heading').scrollIntoView({ block: 'nearest' });
}

function useCollection(nextMode) {
  mode = nextMode;
  areas = collections[mode].areas;
  selectedId = areas[0].area_id;
  viewport = [0, 0, 640, 390];
  byId('data-mode').value = mode;
  document.querySelector('.eyebrow').textContent = mode === 'observed'
    ? 'Farm Moisture Watch · observed NISAR development data'
    : 'Farm Moisture Watch · synthetic sample demonstration';
  document.querySelector('.notice').textContent = mode === 'observed'
    ? 'These four Nagapattinam analysis tiles use opened NISAR observations. They are not surveyed fields or a crop mask. SMAP seasonal history and an irrigation-risk flag are unavailable.'
    : 'The selectable field areas and inspection order use synthetic sample data. Nagapattinam is a separate development window with opened NISAR evidence.';
  byId('map').setAttribute('aria-label', mode === 'observed' ? 'Observed Nagapattinam analysis tiles' : 'Synthetic sample area polygons');
  byId('map-note').textContent = mode === 'observed'
    ? 'Four observed NISAR analysis tiles divide the Nagapattinam window. They are not surveyed fields. Drag to pan; scroll or use buttons to zoom.'
    : 'Dashed outline: Nagapattinam development window. Solid polygons: synthetic sample areas outside it. Drag to pan; scroll or use buttons to zoom.';
  render();
}

byId('area-select').addEventListener('change', event => selectArea(event.target.value));
byId('data-mode').addEventListener('change', event => useCollection(event.target.value));
byId('zoom-in').addEventListener('click', () => zoom(0.75));
byId('zoom-out').addEventListener('click', () => zoom(1.25));
byId('reset-view').addEventListener('click', () => { viewport = [0, 0, 640, 390]; setViewport(); });
const map = byId('map');
map.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.85 : 1.15); }, { passive: false });
map.addEventListener('pointerdown', event => {
  if (event.target.parentNode !== map) return;
  drag = { x: event.clientX, y: event.clientY, view: [...viewport] };
  map.setPointerCapture(event.pointerId);
});
map.addEventListener('pointermove', event => {
  if (!drag) return;
  const rect = map.getBoundingClientRect();
  viewport[0] = drag.view[0] - (event.clientX - drag.x) * drag.view[2] / rect.width;
  viewport[1] = drag.view[1] - (event.clientY - drag.y) * drag.view[3] / rect.height;
  setViewport();
});
map.addEventListener('pointerup', () => { drag = null; });
map.addEventListener('pointercancel', () => { drag = null; });

async function loadCollection(dataset) {
  const response = await fetch(`./api/areas?dataset=${dataset}`);
  if (!response.ok) throw new Error(`${dataset} API HTTP ${response.status}`);
  const collection = await response.json();
  if (collection?.schema_version !== '1.0.0' || !Array.isArray(collection.areas) || !collection.areas.length ||
      collection.areas.some(area => !area.area_id || !area.geometry?.coordinates?.[0] || !Array.isArray(area.observations))) {
    throw new Error(`${dataset} API returned an unsupported area contract`);
  }
  return collection;
}

try {
  collections.sample = await loadCollection('sample');
  try {
    collections.observed = await loadCollection('observed');
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
