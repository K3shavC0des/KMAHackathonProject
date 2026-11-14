import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { compareScoutingStops } from '../../backend/rank.mjs';

const files = new Map([
  ['/frontend/scenario/', ['index.html', 'text/html; charset=utf-8']],
  ['/frontend/scenario/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/frontend/scenario/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/frontend/scenario/scenario.js', ['scenario.js', 'text/javascript; charset=utf-8']],
  ['/frontend/scenario/scenario.mjs', ['scenario.mjs', 'text/javascript; charset=utf-8']],
  ['/backend/rank.mjs', ['../../backend/rank.mjs', 'text/javascript; charset=utf-8']],
  ['/contracts/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/frontend/map/', ['../map/index.html', 'text/html; charset=utf-8']],
  ['/frontend/map/style.css', ['../map/style.css', 'text/css; charset=utf-8']],
  ['/frontend/map/map.js', ['../map/map.js', 'text/javascript; charset=utf-8']],
  ['/frontend/map/map-data.mjs', ['../map/map-data.mjs', 'text/javascript; charset=utf-8']],
  ['/frontend/map/observations.mjs', ['../map/observations.mjs', 'text/javascript; charset=utf-8']],
  ['/frontend/map/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/frontend/map/observed-areas.json', ['../../data/observed/nagapattinam-areas.json', 'application/json; charset=utf-8']]
]);
const root = new URL('./', import.meta.url);
const port = Number(process.env.PORT || 8002);

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  if (request.method !== 'GET') { response.writeHead(405); response.end('Method not allowed'); return; }
  if (path === '/') { response.writeHead(302, { Location: '/frontend/map/' }); response.end(); return; }
  try {
    if (path === '/frontend/map/api/areas') {
      const dataset = url.searchParams.get('dataset') ?? 'sample';
      const source = dataset === 'observed' ? '../../data/observed/nagapattinam-areas.json'
        : dataset === 'sample' ? '../../contracts/sample-areas.json' : null;
      if (!source) { response.writeHead(400); response.end('Unknown dataset'); return; }
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(await readFile(fileURLToPath(new URL(source, root))));
      return;
    }
    if (path === '/frontend/map/api/rank') {
      const collection = JSON.parse(await readFile(fileURLToPath(new URL('../../contracts/sample-areas.json', root)), 'utf8'));
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(compareScoutingStops(collection)));
      return;
    }
    const file = files.get(path);
    if (!file) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(fileURLToPath(new URL(file[0], root))));
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Could not load demo');
  }
}).listen(port, '127.0.0.1', () => console.log(`Scenario demo: http://127.0.0.1:${port}/`));
