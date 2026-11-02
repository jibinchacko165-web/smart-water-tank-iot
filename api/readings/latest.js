import { proxyToBackend } from '../_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const liveData = await proxyToBackend('/api/readings/latest/');
  if (liveData) {
    return res.status(200).json(liveData);
  }

  return res.status(503).json({
    message: "Live IoT backend temporarily unreachable. Check Docker and tunnel.",
    data: null
  });
}
