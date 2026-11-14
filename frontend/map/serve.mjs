import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { compareScoutingStops } from '../../backend/rank.mjs';

const root = new URL('./', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/map.js', ['map.js', 'text/javascript; charset=utf-8']],
  ['/map-data.mjs', ['map-data.mjs', 'text/javascript; charset=utf-8']],
  ['/observations.mjs', ['observations.mjs', 'text/javascript; charset=utf-8']],
  ['/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/observed-areas.json', ['../../data/observed/nagapattinam-areas.json', 'application/json; charset=utf-8']],
  ['/map/', ['index.html', 'text/html; charset=utf-8']],
  ['/map/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/map/map.js', ['map.js', 'text/javascript; charset=utf-8']],
  ['/map/map-data.mjs', ['map-data.mjs', 'text/javascript; charset=utf-8']],
  ['/map/observations.mjs', ['observations.mjs', 'text/javascript; charset=utf-8']],
  ['/map/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/map/observed-areas.json', ['../../data/observed/nagapattinam-areas.json', 'application/json; charset=utf-8']],
  ['/scenario/', ['../scenario/index.html', 'text/html; charset=utf-8']],
  ['/scenario/style.css', ['../scenario/style.css', 'text/css; charset=utf-8']],
  ['/scenario/scenario.js', ['../scenario/scenario.js', 'text/javascript; charset=utf-8']],
  ['/scenario/scenario.mjs', ['../scenario/scenario.mjs', 'text/javascript; charset=utf-8']],
  ['/backend/rank.mjs', ['../../backend/rank.mjs', 'text/javascript; charset=utf-8']],
  ['/contracts/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']]
]);

export function makeServer() { return createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  if ((path === '/api/areas' || path === '/map/api/areas') && request.method === 'GET') {
    const dataset = url.searchParams.get('dataset') ?? 'sample';
    const source = dataset === 'observed' ? '../../data/observed/nagapattinam-areas.json'
      : dataset === 'sample' ? '../../contracts/sample-areas.json' : null;
    if (!source) { response.writeHead(400); response.end('Unknown dataset'); return; }
    try {
      const body = await readFile(fileURLToPath(new URL(source, root)));
      const collection = JSON.parse(body.toString('utf8'));
      if (collection.schema_version !== '1.0.0') throw new Error('Unsupported area contract');
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Could not load area collection');
    }
    return;
  }
  if ((path === '/api/rank' || path === '/map/api/rank') && request.method === 'GET') {
    try {
      const collection = JSON.parse(await readFile(fileURLToPath(new URL('../../contracts/sample-areas.json', root)), 'utf8'));
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(compareScoutingStops(collection)));
    } catch {
      response.writeHead(500); response.end('Could not calculate ranking');
    }
    return;
  }
  const file = files.get(path);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(file[0], root)));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Could not load page');
  }
}); }

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 8000);
  makeServer().listen(port, '127.0.0.1', () => console.log(`Scouting map listening on http://127.0.0.1:${port}/`));
}
