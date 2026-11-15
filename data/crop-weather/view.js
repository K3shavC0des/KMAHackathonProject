const $ = id => document.getElementById(id);
const report = await fetch('./nagapattinam-report.json').then(r => { if (!r.ok) throw new Error('Risk report unavailable'); return r.json(); });
const image = await fetch('./nisar-image-cells.json').then(r => { if (!r.ok) throw new Error('NISAR cells unavailable'); return r.json(); });
const pct = value => `${Math.round(value * 100)}%`;
const cropNote = () => {
  const crop = report.crop_context.candidates.find(item => item.name === $('crop').value);
  $('crop-note').textContent = `${crop.name}: ${crop.season_possible ? 'local cropping guidance includes this season' : 'this date is outside the cited local season'}. Crop presence and growth stage in these cells are unknown.`;
};
$('crop').addEventListener('change', cropNote);
cropNote();
$('concern').textContent = report.concern === 'watch' ? 'Watch — confirm locally' : report.concern;
$('meaning').textContent = report.meaning;
$('heat').textContent = `${report.temperature.seven_day_mean_daily_max_c.toFixed(1)}°C`;
$('heat-note').textContent = `${report.temperature.percentile === 1 ? 'Higher than all' : `Higher than ${pct(report.temperature.percentile)} of`} ${report.temperature.baseline_years} matching baseline weeks; median ${report.temperature.baseline_median_c.toFixed(1)}°C.`;
$('humidity').textContent = `${report.temperature.seven_day_mean_humidity_percent.toFixed(0)}% humidity`;
$('rain').textContent = `${report.temperature.seven_day_rain_mm.toFixed(1)} mm rain in seven days; baseline median ${report.temperature.baseline_rain_median_mm.toFixed(1)} mm.`;
$('moisture').textContent = `${Math.abs(report.nisar.median_change_m3m3 * 100).toFixed(1)} points lower`;
$('nisar-note').textContent = `${report.nisar.matched_cells.toLocaleString()} matched cells; ${pct(report.nisar.fraction_at_least_2_points_drier)} fell at least 2 points. ${report.nisar.earlier_date} to ${report.nisar.later_date}.`;
$('uncertainty').textContent = report.nisar.uncertainty
  ? `Typical uncertainty is about ${(report.nisar.uncertainty.median_per_date_uncertainty_m3m3[0]*100).toFixed(1)} points per date. Only ${(report.nisar.uncertainty.fraction_change_exceeds_sum_of_uncertainties*100).toFixed(1)}% of cell changes exceed both dates' uncertainty added together.`
  : 'NISAR uncertainty has not been checked.';
const canvas = $('nisar-image'), ctx = canvas.getContext('2d');
const bounds = {west:79.68,east:79.86,south:10.64,north:10.82};
for (const [west, south, east, north, change] of image.cells) {
  const x = (west-bounds.west)/(bounds.east-bounds.west)*canvas.width;
  const y = (bounds.north-north)/(bounds.north-bounds.south)*canvas.height;
  const w = (east-west)/(bounds.east-bounds.west)*canvas.width;
  const h = (north-south)/(bounds.north-bounds.south)*canvas.height;
  ctx.fillStyle = change <= -.02 ? '#e86958' : change >= .02 ? '#6bbd9a' : '#edd38b';
  ctx.fillRect(x,y,Math.max(1,w),Math.max(1,h));
}
$('status').textContent = `Experimental city-scale screen · ${image.cells.length.toLocaleString()} measured NISAR cells · crop stage unknown`;
