import { evaluateScenario } from './scenario.mjs';

const byId = id => document.getElementById(id);
const stageLabels = { unknown: 'Unknown', planting: 'Planting', vegetative: 'Vegetative', flowering: 'Flowering', harvest: 'Harvest' };
let fixture;
let stageChanges = {};

function shortLabel(area) { return area.label.split(' (')[0]; }

function renderRankings(name, ranking) {
  const section = document.createElement('section');
  section.className = 'ranking';
  const heading = document.createElement('h3');
  heading.textContent = name;
  const list = document.createElement('ol');
  for (const item of ranking) {
    const entry = document.createElement('li');
    entry.textContent = `${shortLabel(item)} · ${item.priority_points} illustrative points`;
    const explanation = document.createElement('small');
    explanation.textContent = `${item.explanation} Evidence status: ${item.evidence_status}.`;
    entry.append(explanation);
    list.append(entry);
  }
  section.append(heading, list);
  return section;
}

function update() {
  const { comparison } = evaluateScenario(fixture, stageChanges);
  for (const [id, result] of [['with-first', comparison.with_nisar], ['without-first', comparison.without_nisar]]) {
    const stop = result.ranking.find(item => item.area_id === result.first_stop);
    byId(id).textContent = stop ? shortLabel(stop) : 'Insufficient evidence';
  }
  byId('change').textContent = comparison.first_stop_changes
    ? 'Including local NISAR changes the first stop in this sample scenario.'
    : 'Including local NISAR does not change the first stop in this sample scenario.';
  byId('rankings').replaceChildren(
    renderRankings('With NISAR', comparison.with_nisar.ranking),
    renderRankings('Without NISAR', comparison.without_nisar.ranking)
  );
}

function renderControls() {
  const controls = byId('controls');
  controls.replaceChildren();
  for (const area of fixture.areas) {
    const label = document.createElement('label');
    label.textContent = shortLabel(area);
    const note = document.createElement('small');
    note.textContent = `Fixture stage: ${stageLabels[area.crop_stage]}. Observations stay unchanged.`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Crop stage for ${shortLabel(area)}`);
    for (const [value, text] of Object.entries(stageLabels)) select.add(new Option(text, value));
    select.value = stageChanges[area.area_id] ?? area.crop_stage;
    select.addEventListener('change', () => { stageChanges[area.area_id] = select.value; update(); });
    label.append(note, select);
    controls.append(label);
  }
}

byId('reset').addEventListener('click', () => { stageChanges = {}; renderControls(); update(); });
try {
  const response = await fetch('../../contracts/sample-areas.json');
  if (!response.ok) throw new Error(`Fixture HTTP ${response.status}`);
  fixture = await response.json();
  renderControls();
  update();
} catch (error) {
  byId('change').textContent = `Could not load scenario: ${error.message}`;
}
