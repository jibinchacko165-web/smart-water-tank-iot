export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: "healthy",
    service: "water-tank-iot-backend",
    version: "1.0.0"
  });
}
