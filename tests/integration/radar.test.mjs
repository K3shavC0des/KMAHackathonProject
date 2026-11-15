import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateField } from '../../frontend/map/irrigation.mjs';
import { validateRadar, loadRadar } from '../../backend/radar.mjs';
import { makeServer } from '../../frontend/map/serve.mjs';

const input = {crop:'Maize',regime:'non_flooded',moisture:0.18,trigger:0.2,depthCm:40,measuredAt:'2026-11-14T12:00:00Z',triggerSource:'Example adviser rule (synthetic)',unit:'m3/m3',sameBasis:true,current:true,changed:'no'};
const now = new Date('2026-11-14T13:00:00Z');
test('field check uses entered root-zone trigger with conservative missing states', () => {
  assert.equal(evaluateField(input,now).status,'consider');
  assert.equal(evaluateField({...input,moisture:0.2},now).status,'not_crossed');
  assert.equal(evaluateField({...input,moisture:0.3},now).status,'not_crossed');
  for(const patch of [{regime:'flooded'},{regime:'unknown'},{changed:'yes'},{changed:'unknown'},{current:false},{sameBasis:false},{unit:'percent'},{moisture:NaN},{depthCm:0},{trigger:0},{triggerSource:''},{measuredAt:'2026-11-15T12:00:00Z'}]) assert.equal(evaluateField({...input,...patch},now).status,'insufficient');
});
function fixture() {
  const samples = [0,1].map(i=>({observed_at:`2026-07-${i?'14':'02'}T00:15:00Z`,mean_db:-10+i,source_ref:'synthetic-test-only',processing_baseline:'test',matched_cells:10,coverage:0.5,quality_note:'Synthetic test mask'}));
  return {schema_version:'1.0.0',dataset:'observed',status:'paired',reason:'TEST ONLY',areas:[{area_id:'test',geometry:{type:'Polygon',coordinates:[[[79,10],[80,10],[80,11],[79,10]]]},land_cover_source:null,bands:['L','S'].map(band=>({band,polarization:'HH',convention:'gamma0',effective_resolution_m:80,common_grid_m:80,quality:'screened',samples:structuredClone(samples)}))}]};
}
test('radar rejects incompatible pairs, masks, timestamps and nonfinite power', () => {
  assert.equal(validateRadar(fixture()).status,'paired');
  for (const mutate of [x=>x.areas[0].bands[1].band='L',x=>x.areas[0].bands[1].convention='sigma0',x=>x.areas[0].bands[1].samples.pop(),x=>x.areas[0].bands[0].samples[1].mean_db=Infinity,x=>x.areas[0].bands[0].samples[1].processing_baseline='different',x=>x.areas[0].bands[1].samples[0].observed_at='2026-07-02T00:20:00Z',x=>x.areas[0].bands[1].samples[0].matched_cells=9,x=>x.areas[0].bands[0].common_grid_m=10]) {
    const x=fixture();mutate(x);assert.throws(()=>validateRadar(x));
  }
  const single=fixture();single.status='single_date';single.areas[0].bands.forEach(b=>b.samples.pop());assert.equal(validateRadar(single).status,'single_date');
  const malformed=fixture();malformed.areas[0].geometry.coordinates=[];assert.throws(()=>validateRadar(malformed));
});
test('API and static assets expose explicit unavailable evidence without blocking field check', async t => {
  const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const root=`http://127.0.0.1:${server.address().port}`;
  const stored=await loadRadar();
  for(const prefix of ['', '/map']) {
    const r=await fetch(`${root}${prefix}/api/radar-evidence?dataset=observed`);assert.equal(r.status,200);assert.deepEqual(await r.json(),stored);
    for(const asset of ['radar.html','radar.js','radar.css','irrigation.mjs','radar-evidence.json','public-sband-sample.json']) assert.equal((await fetch(`${root}${prefix}/${asset}`)).status,200);
  }
  assert.equal((await fetch(`${root}/api/radar-evidence?dataset=sample`)).status,400);
});
