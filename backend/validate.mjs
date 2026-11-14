import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(await readFile(new URL('../contracts/area.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictTuples: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function assertFinite(value, path = '') {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`Nonfinite number at ${path || '/'}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFinite(item, `${path}/${index}`));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertFinite(item, `${path}/${key}`);
  }
}

export function validateCollection(collection) {
  assertFinite(collection);
  if (!validateSchema(collection)) {
    const issue = validateSchema.errors[0];
    throw new TypeError(`Invalid area collection at ${issue.instancePath || '/'}: ${issue.message}`);
  }
  for (const area of collection.areas) {
    for (const item of area.observations) {
      if (item.metric !== 'seasonal_anomaly') continue;
      const context = item.seasonal_context;
      const values = Object.values(context.historical_year_medians_m3m3).sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
      if (Math.abs(context.baseline_m3m3 - median) > 0.0001 ||
          Math.abs(item.value - (context.current_m3m3 - context.baseline_m3m3)) > 0.0001) {
        throw new TypeError(`Inconsistent seasonal anomaly in ${area.area_id}`);
      }
    }
  }
  return collection;
}
