import { getReadings } from '../_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const allReadings = getReadings();
  const limit = Math.min(Number(req.query?.limit) || 100, 1000);
  const sliced = allReadings.slice(-limit);

  const levels = sliced.map(r => r.water_level_cm);
  const pcts = sliced.map(r => r.water_percentage);
  const dists = sliced.map(r => r.distance_cm);

  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;
  const avg = arr => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

  const statistics = {
    min_water_level_cm: min(levels),
    max_water_level_cm: max(levels),
    avg_water_level_cm: avg(levels),
    min_percentage: min(pcts),
    max_percentage: max(pcts),
    avg_percentage: avg(pcts),
    min_distance_cm: min(dists),
    max_distance_cm: max(dists),
    total_count: allReadings.length
  };

  return res.status(200).json({
    count: sliced.length,
    statistics,
    readings: sliced
  });
}
