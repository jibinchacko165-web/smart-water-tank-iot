// In-memory telemetry data store for Vercel Serverless Functions

const initialReadings = [
  { id: 750, device_id: "ESP32_WATER_001", distance_cm: 65.0, water_level_cm: 35.0, water_percentage: 35.0, status: "LOW", tank_status: "LOW", buzzer_status: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 751, device_id: "ESP32_WATER_001", distance_cm: 55.0, water_level_cm: 45.0, water_percentage: 45.0, status: "NORMAL", tank_status: "NORMAL", buzzer_status: false, created_at: new Date(Date.now() - 2700000).toISOString() },
  { id: 752, device_id: "ESP32_WATER_001", distance_cm: 45.0, water_level_cm: 55.0, water_percentage: 55.0, status: "NORMAL", tank_status: "NORMAL", buzzer_status: false, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 753, device_id: "ESP32_WATER_001", distance_cm: 35.0, water_level_cm: 65.0, water_percentage: 65.0, status: "NORMAL", tank_status: "NORMAL", buzzer_status: false, created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 754, device_id: "ESP32_WATER_001", distance_cm: 20.0, water_level_cm: 80.0, water_percentage: 80.0, status: "NORMAL", tank_status: "NORMAL", buzzer_status: false, created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 755, device_id: "ESP32_WATER_001", distance_cm: 8.0,  water_level_cm: 92.0, water_percentage: 92.0, status: "HIGH",   tank_status: "HIGH",   buzzer_status: true,  created_at: new Date(Date.now() - 60000).toISOString() },
  { id: 756, device_id: "ESP32_WATER_001", distance_cm: 15.0, water_level_cm: 85.0, water_percentage: 85.0, status: "NORMAL", tank_status: "NORMAL", buzzer_status: false, created_at: new Date(Date.now() - 30000).toISOString() },
  { id: 757, device_id: "ESP32_WATER_001", distance_cm: 89.5, water_level_cm: 10.5, water_percentage: 10.5, status: "EMPTY",  tank_status: "EMPTY",  buzzer_status: false, created_at: new Date().toISOString() },
];

let readings = [...initialReadings];
let lastHeartbeat = new Date();
const HEARTBEAT_THRESHOLD_SECONDS = 15;

export function getReadings() {
  return readings;
}

export function getLatestReading() {
  return readings[readings.length - 1];
}

export function addReading(reading) {
  const newId = readings.length > 0 ? readings[readings.length - 1].id + 1 : 1;
  const isHighWater = reading.water_percentage >= 90.0;
  
  let status = "NORMAL";
  if (reading.water_percentage <= 15.0) status = "EMPTY";
  else if (reading.water_percentage <= 35.0) status = "LOW";
  else if (reading.water_percentage >= 95.0) status = "FULL";
  else if (reading.water_percentage >= 90.0) status = "HIGH";

  const saved = {
    id: newId,
    device_id: reading.device_id || "ESP32_WATER_001",
    distance_cm: Number(reading.distance_cm),
    water_level_cm: Number(reading.water_level_cm),
    water_percentage: Number(reading.water_percentage),
    status: reading.status || status,
    tank_status: reading.tank_status || status,
    buzzer_status: reading.buzzer_status !== undefined ? Boolean(reading.buzzer_status) : isHighWater,
    created_at: new Date().toISOString()
  };

  readings.push(saved);
  lastHeartbeat = new Date();
  return saved;
}

export function updateHeartbeat(deviceId, wifiRssi) {
  lastHeartbeat = new Date();
  return {
    device_id: deviceId || "ESP32_WATER_001",
    last_seen: lastHeartbeat.toISOString(),
    threshold_seconds: HEARTBEAT_THRESHOLD_SECONDS
  };
}

export function getDeviceStatus() {
  const latest = getLatestReading();
  const now = new Date();
  const lastSeen = lastHeartbeat || (latest ? new Date(latest.created_at) : now);
  const secondsElapsed = Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / 1000));
  const isOnline = secondsElapsed <= HEARTBEAT_THRESHOLD_SECONDS;

  return {
    device_id: "ESP32_WATER_001",
    status: isOnline ? "ONLINE" : "OFFLINE",
    connectivity: isOnline ? "CONNECTED" : "DISCONNECTED",
    last_seen: lastSeen.toISOString(),
    seconds_since_last_reading: secondsElapsed,
    heartbeat_threshold_seconds: HEARTBEAT_THRESHOLD_SECONDS,
    latest_reading: latest
  };
}
