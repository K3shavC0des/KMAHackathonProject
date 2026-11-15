import { evaluateField } from './irrigation.mjs';
const el = id => document.getElementById(id);
let evidence, moisture;
async function loadPublicSbandReference() {
  try {
    const response = await fetch('./public-sband-sample.json');
    if (!response.ok) return;
    const sample = await response.json();
    if (sample.status !== 'sample_reference') return;
    el('sband-reference').hidden = false;
    el('sband-reference-summary').textContent = `${sample.title}: ${sample.granule_id}. ${sample.location}; ${sample.observed_at}. HH gamma0 range ${sample.hh_gamma0_dn.min}–${sample.hh_gamma0_dn.max} DN (mean ${sample.hh_gamma0_dn.mean}). This validates that an S-band GCOV can be inspected, but it is not a Nagapattinam observation.`;
    el('sband-reference-notes').textContent = sample.notes.join(' ');
  } catch { /* Reference card is optional. */ }
}
let maps = [];
el('field-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  for (const key of ['moisture', 'trigger', 'depthCm']) data[key] = data[key]?.trim() ? Number(data[key]) : NaN;
  data.sameBasis = form.elements.sameBasis.checked;
  data.current = form.elements.current.checked;
  data.unit = 'm3/m3';
  const result = evaluateField(data);
  el('field-result').textContent = `${data.context === 'scenario' ? 'SCENARIO / ' : 'CURRENT FIELD CHECK / '}${result.title}\n${result.message}\nRadar observations provide historical context and do not set this trigger.`;
});
function render() {
  const area = evidence.areas.find(a => a.area_id === el('radar-area').value);
  if (!area) return;
  const index = Number(el('radar-date').value);
  for (const [i, bandName] of ['L', 'S'].entries()) {
    const band = area.bands.find(b => b.band === bandName);
    const sample = band.samples[index];
    const delta = band.samples.length === 2 ? band.samples[1].mean_db - band.samples[0].mean_db : null;
    el(`${bandName.toLowerCase()}-reading`).textContent = `${sample.mean_db.toFixed(2)} dB · ${sample.observed_at} · ${delta === null ? 'Change unavailable' : `Change ${delta.toFixed(2)} dB`}`;
    const features = evidence.areas.map(a => ({type:'Feature', geometry:a.geometry, properties:{id:a.area_id, db:a.bands.find(b => b.band === bandName).samples[index].mean_db}}));
    const map = maps[i];
    if (map?.getSource('radar')) {
      map.getSource('radar').setData({type:'FeatureCollection',features});
      map.setPaintProperty('outline','line-width',['case',['==',['get','id'],area.area_id],3,1]);
    }
  }
  const sample = area.bands[0].samples[index];
  el('radar-details').textContent = `${sample.matched_cells} common cells · ${(sample.coverage*100).toFixed(1)}% coverage · ${area.bands[0].common_grid_m} m grid. ${area.land_cover_source ? `Land-cover source: ${area.land_cover_source}` : 'Analysis area; agricultural identity unverified.'}`;
  el('radar-sources').textContent = area.bands.map(b => `${b.band} / ${b.polarization} / ${b.convention}\n` + b.samples.map(s => `${s.observed_at}\n${s.source_ref}\nBaseline ${s.processing_baseline}; ${s.quality_note}`).join('\n')).join('\n\n');
  const readings = moisture?.areas.find(a => a.area_id === area.area_id)?.observations.filter(o => o.metric === 'soil_moisture_change' && o.quality === 'valid');
  el('moisture-context').textContent = readings?.length ? `Separate SME2 surface-moisture change: ${readings[0].value.toFixed(4)} m³/m³, dated ${readings[0].observed_at}. Its dates may differ from the radar pair.` : 'No corresponding SME2 moisture change available for this area.';
}
async function start() {
  try {
    await loadPublicSbandReference();
    const response = await fetch('./radar-evidence.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    evidence = await response.json();
    if (evidence.schema_version !== '1.0.0' || !Array.isArray(evidence.areas)) throw new Error('Unsupported evidence format');
    el('evidence-status').textContent = evidence.reason;
    if (evidence.status === 'unavailable' || !evidence.areas.length) {
      for (const id of ['l-map','s-map']) el(id).textContent = 'Verified GCOV data unavailable';
      return;
    }
    el('radar-area').replaceChildren(...evidence.areas.map(a => new Option(a.area_id,a.area_id)));
    const first = evidence.areas[0].bands.find(b => b.band === 'L');
    el('radar-date').replaceChildren(...first.samples.map((s,i) => new Option(s.observed_at,String(i))));
    el('radar-area').disabled = el('radar-date').disabled = false;
    try { const r = await fetch('./observed-areas.json'); if (r.ok) moisture = await r.json(); } catch { /* Separate context is optional. */ }
    render();
    const maplibre = await import('https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs');
    maps = ['l-map','s-map'].map(container => new maplibre.Map({container,center:[79.77,10.73],zoom:11,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#172c36'}}]}}));
    await Promise.all(maps.map(map => new Promise(resolve => map.once('load',resolve))));
    let syncing = false;
    maps.forEach((map,i) => {
      map.addSource('radar',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'power',type:'fill',source:'radar',paint:{'fill-color':['interpolate',['linear'],['get','db'],-30,'#152b49',-15,'#3887a1',0,'#f5e9ab']}});
      map.addLayer({id:'outline',type:'line',source:'radar',paint:{'line-color':'#ffffff','line-width':1}});
      map.addControl(new maplibre.NavigationControl());
      map.on('move',() => {if(syncing)return;syncing=true;maps[1-i].jumpTo({center:map.getCenter(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()});syncing=false;});
      map.on('click','power',e => {el('radar-area').value=e.features[0].properties.id;render();});
    });
    const points=evidence.areas.flatMap(a=>a.geometry.coordinates[0]);
    maps[0].fitBounds([[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]],{padding:30,duration:0});
    render();
  } catch(error) {el('evidence-status').textContent=`Radar comparison unavailable: ${error.message}. The field check remains available.`;}
}
el('radar-area').addEventListener('change',render);
el('radar-date').addEventListener('change',render);
start();
