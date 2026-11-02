import { proxyToBackend } from '../_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const liveStatus = await proxyToBackend('/api/device/status/');
  if (liveStatus) {
    return res.status(200).json(liveStatus);
  }

  return res.status(200).json({
    device_id: "ESP32_WATER_001",
    status: "OFFLINE",
    connectivity: "DISCONNECTED",
    message: "Live IoT backend temporarily unreachable.",
    last_seen: null,
    seconds_since_last_reading: null,
    heartbeat_threshold_seconds: 15,
    latest_reading: null
  });
}
