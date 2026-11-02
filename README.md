# IoT-Based Smart Water Tank Level Monitoring System with Automatic Buzzer Alert

A complete, production-grade IoT monitoring system designed for real-time liquid level acquisition, automatic audible buzzer alerts on low water levels, persistent database storage, and interactive web visualization.

---

## 1. System Architecture

```
+------------------------------------+
|  HC-SR04 Ultrasonic Distance Sensor |
+------------------------------------+
                  |  Echo (5V) -> 1kΩ / 2kΩ Divider -> GPIO 18 (3.3V)
                  |  Trig (3.3V) <- GPIO 5
                  v
+------------------------------------+          +---------------------------+
|        ESP32 Microcontroller       | -------> | 3-Pin Active Buzzer (I/O) |
|  - Multi-sample median filtering   | GPIO 23  | - Triggers on Level <= 20%|
|  - Water level & % calculations    |          | - Independent local alert |
|  - Automatic local buzzer control  |          +---------------------------+
|  - Wi-Fi auto-reconnect client     |
+------------------------------------+
                  |  Wi-Fi / HTTP POST /api/readings/
                  v
+------------------------------------+
|       Docker Container Stack       |
|  +------------------------------+  |
|  |   Django 5.1 + DRF Backend   |  |  (Port 8000)
|  |   - Input validation         |  |
|  |   - Telemetry ingestion      |  |
|  |   - Buzzer status tracking   |  |
|  |   - Analytics aggregation    |  |
|  +------------------------------+  |
|                 |                  |
|                 v                  |
|  +------------------------------+  |
|  |     PostgreSQL 16 Database   |  |  (Port 5432, Persistent Volume)
|  +------------------------------+  |
+------------------------------------+
                  |  HTTP REST Telemetry & Built-In React SPA
                  v
+------------------------------------+
|        React Web Dashboard         |  (Port 8000 / 3000)
|  - Real-time animated water tank   |
|  - Dedicated Buzzer Alert Badge    |
|  - Low Water Warning Banner        |
|  - Telemetry cards & sensor status |
|  - Historical Chart.js trends      |
+------------------------------------+
```

---

## 2. Complete Hardware Connection Table

| Component | Component Pin | ESP32 Connection | Electrical Description |
|---|---|---|---|
| **HC-SR04** | **VCC** | **VIN / 5V** | 5V Power Supply |
| **HC-SR04** | **TRIG** | **GPIO 5** | Direct connection (3.3V logic triggers HC-SR04) |
| **HC-SR04** | **ECHO** | **GPIO 18 via Voltage Divider** | Attenuated from 5V to 3.33V using 1kΩ / 2kΩ resistors |
| **HC-SR04** | **GND** | **GND** | Common Ground |
| **Active Buzzer** | **VCC** | **3.3V** (or 5V if required) | Supply voltage |
| **Active Buzzer** | **I/O** | **GPIO 23** | Digital control output (Active-High/Active-Low) |
| **Active Buzzer** | **GND** | **GND** | Common Ground |

### Echo Voltage Divider Schematic
```
HC-SR04 ECHO (5V) ---> [ 1 kΩ Resistor ] ---> Node (ESP32 GPIO 18)
                                                     |
                                            [ 2 kΩ Resistor ]
                                                     |
                                                   GND
```
$$\text{Calculated } V_{\text{out}} = 5.0\,\text{V} \times \frac{2\,\text{k}\Omega}{1\,\text{k}\Omega + 2\,\text{k}\Omega} \approx 3.33\,\text{V}$$

---

## 3. Automatic Buzzer Alert Specifications

| Water Level (%) | Tank Status | Audible Buzzer (GPIO 23) | Dashboard Indicator |
|---|---|---|---|
| **0 – 20%** | **LOW / EMPTY** | **ACTIVE (ON)** | `LOW WATER: BUZZER ACTIVE` (Flashing Red Alert) |
| **21 – 79%** | **NORMAL** | **INACTIVE (OFF)** | `NORMAL WATER: BUZZER INACTIVE` (Green Standby) |
| **80 – 100%** | **HIGH / FULL** | **INACTIVE (OFF)** | `NORMAL WATER: BUZZER INACTIVE` (Green Standby) |
| **Invalid / Timeout** | **ERROR** | **INACTIVE (OFF)** | `SENSOR REQUIRES ATTENTION` (Amber Warning) |

- **Local Autonomy**: The buzzer operates directly on the ESP32 without requiring Wi-Fi or internet connectivity.
- **Fail-Safe Sensor Protection**: In the event of sensor disconnection, timeout, or specular reflection dropouts, the system **does not** interpret missing data as an empty tank and keeps the buzzer deactivated to prevent false alarms.

---

## 4. Quick Start & Execution

### 1. View the Web Dashboard
Ensure Docker Desktop is running:
```bash
docker compose up -d
```
Open your browser at:
👉 **[http://localhost:8000/](http://localhost:8000/)**

### 2. Flash the ESP32 via Arduino IDE
1. Open [`code.ino`](file:///c:/Users/user/OneDrive/Desktop/Folder/water%20tank%20iot/code.ino) in Arduino IDE.
2. Select Board: **ESP32 Dev Module**.
3. Select Port: **COM9** (close Serial Monitor tab prior to uploading).
4. Click **Upload (➔)**.

### 3. Run Automated Tests
```powershell
python scripts\test_api_integration.py
```

### 4. Run Live Telemetry Simulator (Demo Mode)
```powershell
python scripts\simulate_live_stream.py
```

---

## 5. API Reference

### POST `/api/readings/`
Ingests telemetry from ESP32 with buzzer state.
```json
{
  "device_id": "ESP32_WATER_001",
  "distance_cm": 85.0,
  "water_level_cm": 15.0,
  "water_percentage": 15.0,
  "status": "LOW",
  "tank_status": "LOW",
  "buzzer_status": true
}
```

### GET `/api/readings/latest/`
Returns the latest verified reading including `buzzer_status`.

### GET `/api/readings/history/`
Returns chronological readings and aggregated statistics (min, max, average).

### GET `/api/device/status/`
Heartbeat monitor checking whether ESP32 is `ONLINE` or `OFFLINE`.
