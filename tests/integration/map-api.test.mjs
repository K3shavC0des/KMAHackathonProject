import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { makeServer } from '../../frontend/map/serve.mjs';
import { inspectionSummary } from '../../frontend/map/map-data.mjs';

async function withServer(run) {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('map server serves distinct sample and observed collections through both API paths', async () => {
  await withServer(async base => {
    for (const prefix of ['/api', '/map/api']) {
      const sample = await fetch(`${base}${prefix}/areas`);
      assert.equal(sample.status, 200);
      assert.ok((await sample.json()).areas.every(area => area.observations.every(item => item.data_status === 'sample')));

      const observed = await fetch(`${base}${prefix}/areas?dataset=observed`);
      assert.equal(observed.status, 200);
      assert.equal(observed.headers.get('cache-control'), 'no-store');
      const collection = await observed.json();
      assert.equal(collection.areas.length, 7415);
      assert.ok(collection.areas.every(area => area.area_id.startsWith('nagapattinam-pixel-')));
      assert.ok(collection.areas.every(area => area.observations.every(item => item.data_status === 'observed' && item.source === 'NISAR_SME2')));

      const ranked = await fetch(`${base}${prefix}/rank?dataset=observed`);
      assert.equal(ranked.status, 200);
      const ranking = await ranked.json();
      assert.equal(ranking.with_nisar.first_stop, 'nagapattinam-pixel-r961c877');
      assert.equal(ranking.without_nisar.first_stop, null);
      assert.equal(ranking.first_stop_changes, false);
      assert.equal((await fetch(`${base}${prefix}/areas?dataset=unknown`)).status, 400);
      assert.equal((await fetch(`${base}${prefix}/rank?dataset=unknown`)).status, 400);
    }
  });
});

test('city datasets retain distinct provenance and agree with the map inspection priority', async () => {
  await withServer(async base => {
    for (const prefix of ['/api', '/map/api']) {
      for (const [city, dates] of [['ludhiana', ['2025-11-21', '2025-12-03']], ['ahmedabad', ['2025-12-12', '2025-12-24']], ['nairobi', ['2026-06-30', '2026-07-12']]]) {
        const response = await fetch(`${base}${prefix}/areas?dataset=${city}`);
        assert.equal(response.status, 200);
        const collection = await response.json();
        assert.ok(collection.areas.length > 36);
        for (const area of collection.areas) {
          assert.ok(area.area_id.startsWith(`${city}-pixel-`));
          assert.equal(area.crop_stage, 'unknown');
          assert.equal(area.observations.length, 3);
          for (const item of area.observations) {
            assert.equal(item.data_status, 'observed');
            assert.equal(item.quality, 'valid');
            assert.equal(item.source, 'NISAR_SME2');
            assert.ok(dates.includes(item.observed_at.slice(0, 10)));
            assert.ok(item.source_ref.startsWith('NISAR_L3_PR_SME2_'));
          }
        }
        const ranking = await (await fetch(`${base}${prefix}/rank?dataset=${city}`)).json();
        assert.equal(ranking.with_nisar.first_stop, inspectionSummary(collection.areas)?.area.area_id ?? null);
        assert.equal(ranking.without_nisar.first_stop, null);
        assert.ok(ranking.with_nisar.ranking.every(item => item.regional_below_historical === null));
      }
    }
  });
});

test('capped and rounded scores retain the exact drying order used on the map', async () => {
  const fixture = JSON.parse(await readFile(new URL('../../contracts/sample-areas.json', import.meta.url), 'utf8'));
  await withServer(async base => {
    for (const values of [[-.055, -.065], [-.02001, -.02002], [-.000001, 0], [-.02, -.02]]) {
      const collection = structuredClone(fixture);
      collection.areas.forEach((area, index) => {
        area.observations = area.observations.filter(item => item.source === 'NISAR_SME2' && item.metric === 'soil_moisture_change');
        area.observations.forEach(item => { item.value = values[index]; });
      });
      collection.areas.reverse();
      const response = await fetch(`${base}/api/rank`, { method: 'POST', body: JSON.stringify(collection) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).with_nisar.first_stop, inspectionSummary(collection.areas).area.area_id);
    }
  });
});

test('map server forwards API validation errors, POST and preflight to the backend', async () => {
  const fixture = JSON.parse(await readFile(new URL('../../contracts/sample-areas.json', import.meta.url), 'utf8'));
  await withServer(async base => {
    for (const prefix of ['/api', '/map/api']) {
      const valid = await fetch(`${base}${prefix}/rank`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fixture)
      });
      assert.equal(valid.status, 200);
      const invalid = structuredClone(fixture);
      delete invalid.areas[0].observations[0].data_status;
      const rejected = await fetch(`${base}${prefix}/rank`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(invalid)
      });
      assert.equal(rejected.status, 400);
      assert.ok((await rejected.json()).error);
      assert.equal((await fetch(`${base}${prefix}/rank`, { method: 'POST', body: '{' })).status, 400);
      assert.equal((await fetch(`${base}${prefix}/rank`, { method: 'OPTIONS' })).status, 204);
      assert.equal((await fetch(`${base}${prefix}/unknown`)).status, 404);
    }
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

test('map and its module assets still load from root and nested routes', async () => {
  await withServer(async base => {
    for (const path of ['/', '/map/', '/map.js', '/map/map.js', '/observations.mjs', '/map/observations.mjs', '/style.css', '/map/style.css', '/crop-reports.json', '/map/crop-reports.json', '/ludhiana-areas.json', '/map/ludhiana-areas.json', '/ahmedabad-areas.json', '/map/ahmedabad-areas.json']) {
      assert.equal((await fetch(`${base}${path}`)).status, 200, path);
    }
    const reports = await (await fetch(`${base}/crop-reports.json`)).json();
    assert.deepEqual(Object.keys(reports).sort(), ['ahmedabad', 'ludhiana', 'nairobi', 'observed']);
  });
});
