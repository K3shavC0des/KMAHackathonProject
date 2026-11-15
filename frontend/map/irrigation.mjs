// Field measurements drive the conditional result; radar is explanatory context.
export function evaluateField(input, now = new Date()) {
  const missing = message => ({ status: 'insufficient', title: 'More information needed', message });
  if (!input.crop?.trim() || !input.triggerSource?.trim()) return missing('Enter the crop and the source of its soil-specific irrigation trigger.');
  if (input.regime !== 'non_flooded') return missing('Flooded rice and unknown irrigation regimes need a documented water-management rule. This calculator supports non-flooded crops.');
  if (input.unit !== 'm3/m3' || !input.sameBasis) return missing('Confirm that the measurement and trigger use volumetric water content and represent the same root-zone depth and soil.');
  if (!input.current || input.changed !== 'no') return missing('Confirm the measurement represents current field conditions and that no rain or irrigation has superseded it.');
  const at = Date.parse(input.measuredAt);
  if (!Number.isFinite(at) || at > now.getTime()) return missing('Enter a valid measurement time that is not in the future.');
  if (![input.moisture, input.trigger, input.depthCm].every(v => typeof v === 'number' && Number.isFinite(v)) || input.moisture < 0 || input.moisture > 1 || input.trigger <= 0 || input.trigger > 1 || input.depthCm <= 0) return missing('Enter moisture and trigger as fractions from 0 to 1, and a positive representative root-zone depth.');
  const below = input.moisture < input.trigger;
  return {
    status: below ? 'consider' : 'not_crossed',
    title: below ? 'Consider irrigation after confirming field conditions' : 'Entered measurement has not crossed the trigger',
    message: `Entered root-zone moisture ${input.moisture.toFixed(3)} m³/m³ is ${below ? 'below' : 'at or above'} the supplied trigger ${input.trigger.toFixed(3)} m³/m³ at ${input.depthCm} cm. Trigger source: ${input.triggerSource}. Confirm crop management and weather before acting.`,
  };
}
