import { proxyToBackend } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const liveHealth = await proxyToBackend('/health/');
  if (liveHealth) {
    return res.status(200).json(liveHealth);
  }

  return res.status(200).json({
    status: "healthy",
    service: "water-tank-iot-vercel-edge",
    backend_proxy: "vegetarian-star-lips-edited.trycloudflare.com",
    version: "1.0.0"
  });
}
