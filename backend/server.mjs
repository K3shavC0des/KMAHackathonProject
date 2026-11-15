import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { compareScoutingStops } from './rank.mjs';
import { validateCollection } from './validate.mjs';

const collections = new Map([
  ['sample', new URL('../contracts/sample-areas.json', import.meta.url)],
  ['observed', new URL('../data/observed/nagapattinam-areas.json', import.meta.url)],
  ['ludhiana', new URL('../data/observed/ludhiana-areas.json', import.meta.url)],
  ['ahmedabad', new URL('../data/observed/ahmedabad-areas.json', import.meta.url)]
]);
const maxBodyBytes = 1024 * 1024;

function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new TypeError('Request body exceeds 1 MiB');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function makeServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' });
        return response.end();
      }
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/health' && request.method === 'GET') return send(response, 200, { ok: true });
      if ((url.pathname === '/api/rank' || url.pathname === '/api/areas') && request.method === 'GET') {
        const dataset = url.searchParams.get('dataset') ?? 'sample';
        if (!collections.has(dataset)) return send(response, 400, { error: 'Unknown dataset' });
        let collection;
        try { collection = validateCollection(JSON.parse(await readFile(collections.get(dataset), 'utf8'))); }
        catch { return send(response, 500, { error: 'Stored area collection failed validation' }); }
        return send(response, 200, url.pathname === '/api/rank' ? compareScoutingStops(collection) : collection);
      }
      if (url.pathname === '/api/rank' && request.method === 'POST') {
        return send(response, 200, compareScoutingStops(validateCollection(await readBody(request))));
      }
      return send(response, 404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) return send(response, 400, { error: error.message });
      return send(response, 500, { error: 'Internal server error' });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT ?? 8787);
  makeServer().listen(port, '127.0.0.1', () => console.log(`Farm Moisture Watch API: http://127.0.0.1:${port}/api/rank`));
}
