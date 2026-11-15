import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { makeServer } from '../../frontend/map/serve.mjs';

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
      assert.equal(collection.areas.length, 36);
      assert.ok(collection.areas.every(area => area.area_id.startsWith('nagapattinam-analysis-')));
      assert.ok(collection.areas.every(area => area.observations.every(item => item.data_status === 'observed' && item.source === 'NISAR_SME2')));

      const ranked = await fetch(`${base}${prefix}/rank?dataset=observed`);
      assert.equal(ranked.status, 200);
      const ranking = await ranked.json();
      assert.equal(ranking.with_nisar.first_stop, 'nagapattinam-analysis-r01c03');
      assert.equal(ranking.without_nisar.first_stop, null);
      assert.equal(ranking.first_stop_changes, false);
      assert.equal((await fetch(`${base}${prefix}/areas?dataset=unknown`)).status, 400);
      assert.equal((await fetch(`${base}${prefix}/rank?dataset=unknown`)).status, 400);
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
    for (const path of ['/', '/map/', '/map.js', '/map/map.js', '/observations.mjs', '/map/observations.mjs', '/style.css', '/map/style.css']) {
      assert.equal((await fetch(`${base}${path}`)).status, 200, path);
    }
  });
});
