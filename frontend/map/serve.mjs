import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { makeServer as makeApiServer } from '../../backend/server.mjs';

const root = new URL('./', import.meta.url);
const files = new Map([
  ['/radar-evidence.json', ['../../data/radar/nagapattinam.json', 'application/json; charset=utf-8']],
  ['/map/radar-evidence.json', ['../../data/radar/nagapattinam.json', 'application/json; charset=utf-8']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/tutorial.css', ['tutorial.css', 'text/css; charset=utf-8']],
  ['/map.js', ['map.js', 'text/javascript; charset=utf-8']],
  ['/map-data.mjs', ['map-data.mjs', 'text/javascript; charset=utf-8']],
  ['/observations.mjs', ['observations.mjs', 'text/javascript; charset=utf-8']],
  ['/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/observed-areas.json', ['../../data/observed/nagapattinam-areas.json', 'application/json; charset=utf-8']],
  ['/ludhiana-areas.json', ['../../data/observed/ludhiana-areas.json', 'application/json; charset=utf-8']],
  ['/ahmedabad-areas.json', ['../../data/observed/ahmedabad-areas.json', 'application/json; charset=utf-8']],
  ['/map/', ['index.html', 'text/html; charset=utf-8']],
  ['/map/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/map/tutorial.css', ['tutorial.css', 'text/css; charset=utf-8']],
  ['/map/map.js', ['map.js', 'text/javascript; charset=utf-8']],
  ['/map/map-data.mjs', ['map-data.mjs', 'text/javascript; charset=utf-8']],
  ['/map/observations.mjs', ['observations.mjs', 'text/javascript; charset=utf-8']],
  ['/map/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']],
  ['/map/observed-areas.json', ['../../data/observed/nagapattinam-areas.json', 'application/json; charset=utf-8']],
  ['/map/ludhiana-areas.json', ['../../data/observed/ludhiana-areas.json', 'application/json; charset=utf-8']],
  ['/map/ahmedabad-areas.json', ['../../data/observed/ahmedabad-areas.json', 'application/json; charset=utf-8']],
  ['/scenario/', ['../scenario/index.html', 'text/html; charset=utf-8']],
  ['/scenario/style.css', ['../scenario/style.css', 'text/css; charset=utf-8']],
  ['/scenario/scenario.js', ['../scenario/scenario.js', 'text/javascript; charset=utf-8']],
  ['/scenario/scenario.mjs', ['../scenario/scenario.mjs', 'text/javascript; charset=utf-8']],
  ['/backend/rank.mjs', ['../../backend/rank.mjs', 'text/javascript; charset=utf-8']],
  ['/contracts/sample-areas.json', ['../../contracts/sample-areas.json', 'application/json; charset=utf-8']]
]);

export function makeServer() {
  // Use the backend's collection selection and validation at every map API path.
  // This server is only a request dispatcher; it never opens a second listener.
  const api = makeApiServer();
  return createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path.startsWith('/api/') || path.startsWith('/map/api/') || path === '/health') {
    if (path.startsWith('/map/api/')) request.url = request.url.slice('/map'.length);
    response.setHeader('Cache-Control', 'no-store');
    api.emit('request', request, response);
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
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 8000);
  makeServer().listen(port, '127.0.0.1', () => console.log(`Scouting map listening on http://127.0.0.1:${port}/`));
}
