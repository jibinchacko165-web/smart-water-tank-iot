import { getLatestReading } from '../_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const latest = getLatestReading();
  if (!latest) {
    return res.status(404).json({ message: "No readings recorded yet.", data: null });
  }

  return res.status(200).json(latest);
}
