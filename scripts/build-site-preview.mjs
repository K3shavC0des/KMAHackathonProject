// Build only the browser map and derived observations. Never include raw data or tooling.
import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { loadRadar } from '../backend/radar.mjs';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await loadRadar();
for (const name of ['index.html', 'style.css', 'tutorial.css', 'map.js', 'map-data.mjs']) {
  await copyFile(new URL(`frontend/map/${name}`, root), new URL(name, output));
}
for (const [source, name] of [
  ['contracts/sample-areas.json', 'sample-areas.json'],
  ['data/observed/nagapattinam-areas.json', 'observed-areas.json'],
  ['data/observed/ludhiana-areas.json', 'ludhiana-areas.json'],
  ['data/observed/ahmedabad-areas.json', 'ahmedabad-areas.json'],
]) {
  const collection = JSON.parse(await readFile(new URL(source, root), 'utf8'));
  if (!collection.areas?.length) throw new Error(`Empty collection: ${source}`);
  await copyFile(new URL(source, root), new URL(name, output));
}
await copyFile(new URL('data/radar/nagapattinam.json', root), new URL('radar-evidence.json', output));
console.log('Static map preview built in dist/ (10 files; no server, orphaned prototypes, or raw downloads).');
