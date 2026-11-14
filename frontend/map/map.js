const byId = id => document.getElementById(id);
const svgNs = 'http://www.w3.org/2000/svg';
let areas = [];
let selectedId;
let comparison;

function observation(area, source) {
  return area.observations.find(item => item.source === source && item.quality !== 'missing') || null;
}

function readingText(item) {
  if (!item) return 'Unavailable';
  const sign = item.metric === 'soil_moisture_change' && item.value > 0 ? '+' : '';
  return `${sign}${item.value} ${item.unit}`;
}

function metadata(item) {
  if (!item) return 'No quality-valid reading for this area';
  return `${item.observed_at.slice(0, 10)} · ${item.spatial_scale} · ${item.quality} · ${item.data_status} · ${item.source_ref}`;
}

function addSvg(tag, attributes, parent) {
  const element = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  parent.append(element);
  return element;
}

function drawMap() {
  const map = byId('map');
  map.replaceChildren();
  addSvg('rect', { width: 640, height: 390, fill: '#e6e9df' }, map);
  const points = areas.flatMap(area => area.geometry.coordinates.flat(1));
  const longitudes = points.map(point => point[0]);
  const latitudes = points.map(point => point[1]);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const lonRange = Math.max(maxLon - minLon, 0.01);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const x = lon => 80 + 480 * (lon - minLon) / lonRange;
  const y = lat => 320 - 250 * (lat - minLat) / latRange;
  for (const area of areas) {
    const ring = area.geometry.coordinates[0];
    const group = addSvg('g', { class: 'marker', tabindex: 0, role: 'button',
      'aria-label': `Select ${area.label}`, 'aria-current': area.area_id === selectedId }, map);
    addSvg('polygon', { points: ring.map(point => `${x(point[0])},${y(point[1])}`).join(' ') }, group);
    const midLon = ring.reduce((total, point) => total + point[0], 0) / ring.length;
    const midLat = ring.reduce((total, point) => total + point[1], 0) / ring.length;
    addSvg('text', { x: x(midLon) - 55, y: y(midLat) - 72 }, group).textContent = area.label.split(' (')[0];
    group.addEventListener('click', () => selectArea(area.area_id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectArea(area.area_id); }
    });
  }
}

function render() {
  const select = byId('area-select');
  select.replaceChildren(...areas.map(area => new Option(area.label, area.area_id)));
  select.value = selectedId;
  drawMap();
  const area = areas.find(item => item.area_id === selectedId);
  const sme2 = observation(area, 'NISAR_SME2');
  const smap = observation(area, 'SMAP');
  const statuses = new Set(area.observations.map(item => item.data_status));
  byId('sample-badge').textContent = statuses.size === 1 ? [...statuses][0].toUpperCase() : 'MIXED STATUS';
  byId('area-description').textContent = `${area.label}. Crop stage: ${area.crop_stage}. Polygon coordinates are from the sample fixture; no pilot has been selected.`;
  if (comparison) {
    const withArea = comparison.with_nisar.ranking.find(item => item.area_id === selectedId);
    const withoutArea = comparison.without_nisar.ranking.find(item => item.area_id === selectedId);
    byId('with-first').textContent = comparison.with_nisar.ranking[0].label.split(' (')[0];
    byId('without-first').textContent = comparison.without_nisar.ranking[0].label.split(' (')[0];
    byId('value-change').textContent = comparison.first_stop_changes
      ? 'Adding NISAR changes the first stop in this synthetic example.'
      : 'Adding NISAR does not change the first stop in this example.';
    byId('rank-explanation').textContent = `${area.label.split(' (')[0]} ranks ${withArea.rank} with NISAR and ${withoutArea.rank} without it. ${withArea.explanation}`;
  }
  byId('sme2-value').textContent = readingText(sme2);
  byId('sme2-meta').textContent = metadata(sme2);
  byId('smap-value').textContent = readingText(smap);
  byId('smap-meta').textContent = smap ? `9 km regional context · ${metadata(smap)}` : '9 km regional context unavailable · no quality-valid SMAP reading';
  const timeline = byId('timeline');
  timeline.replaceChildren();
  const events = area.observations.filter(item => item.quality !== 'missing')
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at));
  for (const item of events) {
    const li = document.createElement('li');
    const label = item.source === 'NISAR_SME2' ? 'Local SME2' : item.source === 'SMAP' ? 'Regional SMAP (9 km)' : 'Crop context';
    li.textContent = `${label}: ${readingText(item)}`;
    const meta = document.createElement('span');
    meta.textContent = metadata(item);
    li.append(meta);
    timeline.append(li);
  }
  if (!smap) {
    const li = document.createElement('li');
    li.textContent = 'Regional SMAP (9 km): unavailable';
    timeline.append(li);
  }
}

function selectArea(id) { selectedId = id; render(); }
byId('area-select').addEventListener('change', event => selectArea(event.target.value));

export function setAreas(collection) {
  if (collection?.schema_version !== '1.0.0' || !Array.isArray(collection.areas) || !collection.areas.length) {
    throw new Error('Expected area collection v1');
  }
  areas = collection.areas;
  selectedId = areas[0].area_id;
  render();
}

try {
  const [fixtureResponse, rankingResponse] = await Promise.all([fetch('./sample-areas.json'), fetch('./api/rank')]);
  if (!fixtureResponse.ok || !rankingResponse.ok) throw new Error(`Fixture or ranking request failed`);
  comparison = await rankingResponse.json();
  setAreas(await fixtureResponse.json());
} catch (error) {
  byId('area-description').textContent = `Could not load sample areas: ${error.message}`;
}
