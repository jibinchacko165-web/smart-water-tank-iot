import { getReadings, addReading } from '../_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validation
    if (body.distance_cm < 0) {
      return res.status(400).json({ error: "Distance cannot be negative." });
    }
    if (body.water_percentage < 0 || body.water_percentage > 100) {
      return res.status(400).json({ error: "Water percentage must be between 0 and 100." });
    }

    const saved = addReading(body);
    return res.status(201).json({
      message: "Sensor reading recorded successfully.",
      data: saved
    });
  }

  // GET: list readings
  return res.status(200).json(getReadings().slice(-50));
}
