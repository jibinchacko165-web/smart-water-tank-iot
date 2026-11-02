# Academic Project Report
## IoT-Based Smart Water Tank Level Monitoring System with Automatic Buzzer Alert

**Academic Year**: 2025–2026  
**System Architecture**: Distributed Multi-Tier Embedded IoT System  
**Hardware Platform**: ESP32 Microcontroller + HC-SR04 Ultrasonic Transceiver + 3-Pin Active Buzzer  
**Backend Framework**: Containerized Django 5.1 & Django REST Framework (DRF)  
**Database**: PostgreSQL 16 (Relational DB with Persistent Volume)  
**Web Dashboard**: React 18 + Tailwind CSS + Chart.js  

---

## Table of Contents
1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Hardware Requirements & Specifications](#5-hardware-requirements--specifications)
6. [Software Requirements & Tech Stack](#6-software-requirements--tech-stack)
7. [System Architecture Diagram](#7-system-architecture-diagram)
8. [Circuit Diagram & Electrical Safety Analysis](#8-circuit-diagram--electrical-safety-analysis)
9. [Hardware Connection Table](#9-hardware-connection-table)
10. [Working Principle](#10-working-principle)
11. [ESP32 Firmware Design & Buzzer Logic](#11-esp32-firmware-design--buzzer-logic)
12. [Communication Protocol & Network Architecture](#12-communication-protocol--network-architecture)
13. [Backend Implementation (Django & DRF)](#13-backend-implementation-django--drf)
14. [Docker & Containerization Architecture](#14-docker--containerization-architecture)
15. [Database Schema & PostgreSQL Design](#15-database-schema--postgresql-design)
16. [REST API Documentation & Endpoints](#16-rest-api-documentation--endpoints)
17. [Frontend Dashboard Implementation (React)](#17-frontend-dashboard-implementation-react)
18. [User Interface Specifications & Buzzer Indicators](#18-user-interface-specifications--buzzer-indicators)
19. [Testing Methodology](#19-testing-methodology)
20. [Testing Results & Verification Matrix](#20-testing-results--verification-matrix)
21. [Engineering Observations](#21-engineering-observations)
22. [Limitations](#22-limitations)
23. [Future Enhancements](#23-future-enhancements)
24. [Conclusion](#24-conclusion)
25. [References](#25-references)

---

## 1. Abstract
Water resource management is a critical operational challenge across domestic, agricultural, and industrial sectors. Traditional water storage systems frequently suffer from either unmonitored overflow or dry-run pump damage due to the absence of automated monitoring. This project presents an end-to-end, IoT-based Smart Water Tank Level Monitoring System that continuously measures, calculates, records, visualizes liquid levels, and activates an autonomous audible alert upon detecting low water conditions.

The edge layer comprises an ESP32 microcontroller interfaced with an HC-SR04 ultrasonic distance sensor and a three-pin active buzzer module connected to GPIO 23. A custom voltage divider circuit safely scales the 5V sensor echo pulse to 3.33V, protecting the ESP32 silicon. Firmware written in C++ incorporates a 5-sample median filtering algorithm to eliminate acoustic bounce and specular noise, computes fluid column height and fill percentage, and autonomously engages the buzzer whenever the water level falls to or below 20%. The buzzer logic executes locally with zero internet dependency. Telemetry is simultaneously transmitted over Wi-Fi via HTTP RESTful JSON payloads to a containerized Django and PostgreSQL stack managed by Docker Compose. A responsive React web dashboard provides live visual tracking of the reservoir, displays a dedicated buzzer alert card, and plots historical trends using Chart.js.

---

## 2. Introduction
Water storage tanks are vital infrastructure components. When tanks run empty unnoticed, water pumps experience severe cavitation and dry-running, often resulting in burned motor windings. The integration of local audible indicators combined with remote IoT telemetry guarantees immediate on-site awareness while enabling centralized historical tracking.

The enhanced system described herein integrates a three-pin active buzzer module on GPIO 23 to deliver autonomous audible alerts without compromising remote cloud telemetry.

---

## 3. Problem Statement
Manual inspection of water reservoirs introduces several critical failure modes:
1. **Dry-Run Pump Failures**: Pumping systems run dry when tanks empty unnoticed, burning motor windings.
2. **Delayed Operator Awareness**: Without an immediate audible alert, domestic or industrial users only realize the reservoir is depleted after faucets run dry.
3. **Sensor Disconnection Ambiguity**: Poorly designed systems frequently interpret a disconnected sensor (zero signal) as an empty tank, triggering false alarms.
4. **Internet Dependency Vulnerability**: Cloud-only alert systems fail during Wi-Fi outages, leaving facilities vulnerable.

---

## 4. Objectives
- **Hardware Integration**: Implement non-contact ultrasonic distance sensing alongside a three-pin active buzzer module on GPIO 23 with voltage divider protection.
- **Autonomous Local Alerting**: Program an automatic low-water buzzer trigger ($\le 20\%$) executing directly on the ESP32 without internet or cloud dependency.
- **Fail-Safe Sensor Protection**: Prevent false alarms by ensuring the buzzer remains deactivated during sensor timeouts, dropouts, or invalid readings.
- **Containerized REST Backend**: Ingest, validate, and store sensor telemetry along with the real-time buzzer status inside a Dockerized Django and PostgreSQL backend.
- **Interactive Web Visualization**: Update the React dashboard to display real-time buzzer states (`LOW WATER: BUZZER ACTIVE`, `NORMAL WATER: BUZZER INACTIVE`, `SENSOR ERROR: SENSOR REQUIRES ATTENTION`) and visual alert banners.

---

## 5. Hardware Requirements & Specifications

| Component | Model / Spec | Purpose in System |
|---|---|---|
| **Microcontroller** | ESP32-WROOM-32 (38-pin Dev Module) | Central processing unit; computes liquid levels, triggers buzzer, transmits Wi-Fi telemetry. |
| **Ultrasonic Transceiver** | HC-SR04 | Emits 40 kHz ultrasonic burst and measures echo return time. |
| **Audible Alert Module** | 3-Pin Active Buzzer (VCC, I/O, GND) | Emits loud audible tone upon low-water condition ($\le 20\%$). |
| **Resistor $R_1$** | $1\,\text{k}\Omega$ ($\pm 5\%$, $0.25\,\text{W}$) | Upper leg of the Echo voltage divider. |
| **Resistor $R_2$** | $2\,\text{k}\Omega$ ($\pm 5\%$, $0.25\,\text{W}$) | Lower leg of the Echo voltage divider connected to ground. |
| **Prototyping Board** | Solderless Half-size Breadboard | Mounts discrete resistors, buzzer, and jumper interconnects. |
| **Power Supply** | 5V 2A Regulated USB Power Supply | Powers the ESP32, HC-SR04 transducer, and buzzer module. |

---

## 6. Software Requirements & Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Embedded Firmware** | C++ / Arduino Framework | Real-time sensor acquisition, median filtering, local buzzer logic, HTTP client. |
| **Backend Runtime** | Python 3.12-slim / Gunicorn | Application execution engine. |
| **Web & API Framework** | Django 5.1 & Django REST Framework | RESTful JSON serialization, validation, and analytics serving. |
| **Static Asset Engine** | WhiteNoise 6.12 | Production static file serving for DRF and React SPA. |
| **Database** | PostgreSQL 16 (Alpine) | ACID-compliant relational storage with persistent Docker volume. |
| **Container Engine** | Docker & Docker Compose | Multi-container automated lifecycle orchestration. |
| **Frontend UI** | React 18 + Tailwind CSS + Chart.js | Real-time animated reservoir, buzzer badges, and trend graphs. |

---

## 7. System Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 PHYSICAL LAYER                                  |
|                                                                                 |
|   +-----------------------+              +--------------------------+           |
|   |   HC-SR04 Ultrasonic  |  Echo (5V)   |  Voltage Divider Network |           |
|   |         Sensor        | -----------> |  R1: 1kΩ  |  R2: 2kΩ     |           |
|   +-----------------------+              +--------------------------+           |
|             ^                                          |                        |
|             | Trig (3.3V)                              | Echo (3.33V)           |
|             |                                          v                        |
|   +-------------------------------------------------------------------------+   |
|   |                          ESP32 Microcontroller                          |   |
|   |  - 5-Sample Median Noise Filter                                         |   |
|   |  - Distance Formula: Distance = (Duration * 0.0343) / 2                 |   |
|   |  - Level Calculation: Level = Tank Height - Distance                    |   |
|   |  - Local Buzzer Alert: Level <= 20% -> GPIO 23 ON (Autonomous)          |   |
|   |  - Fail-Safe Protection: Invalid Reading -> Buzzer OFF                  |   |
|   +-------------------------------------------------------------------------+   |
|             |                                          |                        |
|             | GPIO 23 Digital Output                   | Wi-Fi HTTP POST        |
|             v                                          v                        |
|   +-----------------------+                  +------------------------------+   |
|   |   3-Pin Active Buzzer |                  |   Docker Container Stack     |   |
|   |  (Audible Alarm ON)   |                  |   - Django REST Framework    |   |
|   +-----------------------+                  |   - PostgreSQL 16 Database   |   |
|                                              +------------------------------+   |
|                                                                |                |
|                                                                v                |
|                                              +------------------------------+   |
|                                              |   React Web Dashboard        |   |
|                                              |   - Dedicated Buzzer Card    |   |
|                                              |   - Low Water Warning Banner |   |
|                                              +------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 8. Circuit Diagram & Electrical Safety Analysis

### Voltage Divider Calculation for HC-SR04 Echo
The HC-SR04 emits a $5\,\text{V}$ echo signal. The ESP32 GPIO input pins are strictly rated for $3.3\,\text{V}$. The $1\,\text{k}\Omega / 2\,\text{k}\Omega$ voltage divider attenuates the voltage to:
$$V_{\text{out}} = 5.0\,\text{V} \times \frac{2\,\text{k}\Omega}{1\,\text{k}\Omega + 2\,\text{k}\Omega} = 3.333\,\text{V}$$
This protects the ESP32 input gate while comfortably surpassing the logic high threshold ($V_{IH} = 2.475\,\text{V}$).

### Buzzer Module Interface
The three-pin active buzzer module features:
- **VCC**: Connected to ESP32 $3.3\,\text{V}$ (or $5\,\text{V}$ if required by the module).
- **GND**: Connected to ESP32 `GND` (common ground reference).
- **I/O**: Connected to ESP32 `GPIO 23`. An onboard switching transistor on the module buffers the digital signal, drawing only microamperes from the ESP32 GPIO.

---

## 9. Hardware Connection Table

| Component | Pin | ESP32 Connection | Electrical Description |
|---|---|---|---|
| **HC-SR04** | **VCC** | **VIN / 5V** | 5V Power Supply |
| **HC-SR04** | **TRIG** | **GPIO 5** | Direct connection (3.3V logic triggers HC-SR04) |
| **HC-SR04** | **ECHO** | **GPIO 18 via Voltage Divider** | Attenuated from 5V to 3.33V using 1kΩ and 2kΩ resistors |
| **HC-SR04** | **GND** | **GND** | Common Ground |
| **Active Buzzer** | **VCC** | **3.3V** (or 5V) | Power supply input |
| **Active Buzzer** | **I/O** | **GPIO 23** | Output trigger pin for low-water alert |
| **Active Buzzer** | **GND** | **GND** | Common Ground |

---

## 10. Working Principle & Buzzer Operation

1. **Acoustic Measurement**: A $10\,\mu\text{s}$ pulse on GPIO 5 emits ultrasonic bursts. Echo duration is captured on GPIO 18 and converted to distance in centimeters.
2. **Noise Filtration**: A 5-sample median filter eliminates false acoustic reflections.
3. **Threshold Evaluation**:
   - If water percentage $\le 20.0\%$: The ESP32 immediately writes `BUZZER_ACTIVE_LEVEL` to GPIO 23, engaging the buzzer.
   - If water percentage $> 20.0\%$: The ESP32 writes `BUZZER_INACTIVE_LEVEL` to GPIO 23, silencing the buzzer.
4. **Sensor Safety Handling**: If `getFilteredDistance()` returns $-1.0$ (disconnected or timeout), the system forces the buzzer `OFF` to prevent false empty-tank triggers and logs an error.
5. **Telemetry Ingestion**: The state (`buzzer_status: true/false`) is included in the HTTP POST JSON payload and recorded in PostgreSQL.

---

## 11. ESP32 Firmware Design & Buzzer Logic

The updated firmware [`code.ino`](file:///c:/Users/user/OneDrive/Desktop/Folder/water%20tank%20iot/code.ino) features:
- Configurable `LOW_WATER_BUZZER_THRESHOLD = 20.0`.
- Configurable `BUZZER_ACTIVE_LEVEL = HIGH` (adaptable to active-low modules).
- Autonomous local operation: Even if Wi-Fi disconnects, the buzzer continues to sound locally when water falls to or below 20%.

---

## 12. Communication Protocol & Network Architecture

- **Endpoint**: `POST /api/readings/`
- **JSON Payload Format**:
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

---

## 13. Backend Implementation (Django & DRF)

- **`SensorReading` Model**: Extended with `buzzer_status = models.BooleanField(default=False, db_index=True)`.
- **Validation**: Automatically falls back to `buzzer_status = True` if omitted and `water_percentage <= 20.0`.
- **Database Migrations**: Migration `0002_sensorreading_buzzer_status` successfully applied in PostgreSQL.

---

## 14. Docker & Containerization Architecture

- Docker Compose manages `water_tank_backend` (Django on port 8000) and `water_tank_postgres` (PostgreSQL 16 on port 5432).
- WhiteNoise serves static assets, and the compiled React SPA is embedded at `/`.

---

## 15. Database Schema & PostgreSQL Design

Table: `sensor_readings`

| Column | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `BIGSERIAL` | PRIMARY KEY | Unique identifier. |
| `device_id` | `VARCHAR(50)` | NOT NULL, INDEXED | Hardware device ID. |
| `distance_cm` | `DOUBLE PRECISION` | NOT NULL, CHECK ($\ge 0$) | Measured ultrasonic distance. |
| `water_level_cm` | `DOUBLE PRECISION` | NOT NULL, CHECK ($\ge 0$) | Calculated water depth. |
| `water_percentage` | `DOUBLE PRECISION` | NOT NULL, CHECK ($0 \le x \le 100$) | Fill percentage. |
| `status` | `VARCHAR(20)` | NOT NULL, INDEXED | Status classification. |
| `buzzer_status` | `BOOLEAN` | NOT NULL, INDEXED | Local buzzer active state. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, INDEXED DESC | UTC ingestion timestamp. |

---

## 16. REST API Documentation & Endpoints

| Endpoint | Method | Response Codes | Description |
|---|---|---|---|
| `/api/readings/` | `POST` | `201 Created`, `400 Bad Request` | Ingests sensor reading with `buzzer_status`. |
| `/api/readings/latest/` | `GET` | `200 OK`, `404 Not Found` | Returns latest reading including `buzzer_status`. |
| `/api/readings/history/` | `GET` | `200 OK` | Returns chronological telemetry & min/max/avg stats. |
| `/api/device/status/` | `GET` | `200 OK` | Real-time connectivity and heartbeat monitor. |

---

## 17. Frontend Dashboard Implementation (React)

- **Dedicated Buzzer Alert Card**: Renders real-time buzzer status with active soundwave animations and status badges.
- **Low-Water Alert Banner**: Automatically mounts at top of dashboard when water level $\le 20\%$ or `buzzer_status === true`.
- **Animated Reservoir (`WaterTank.jsx`)**: Highlights the 20% buzzer trigger graduation line and displays a flashing `BUZZER ON` badge during low-water conditions.

---

## 18. User Interface Specifications & Buzzer Indicators

| Condition | Tank Level | Buzzer Pin (GPIO 23) | Dashboard Indicator | Alert Banner |
|---|---|---|---|---|
| **Critically Empty** | $0.0\% \le x < 15.0\%$ | `HIGH` (Active) | `LOW WATER: BUZZER ACTIVE` (Flashing Red) | Active (Pulsing Red) |
| **Low Water** | $15.0\% \le x \le 20.0\%$ | `HIGH` (Active) | `LOW WATER: BUZZER ACTIVE` (Flashing Red) | Active (Pulsing Red) |
| **Normal Level** | $20.1\% \le x < 75.0\%$ | `LOW` (Inactive) | `NORMAL WATER: BUZZER INACTIVE` (Green) | Hidden |
| **High / Full** | $75.0\% \le x \le 100.0\%$ | `LOW` (Inactive) | `NORMAL WATER: BUZZER INACTIVE` (Green) | Hidden |
| **Sensor Disconnected** | `Invalid / null` | `LOW` (Inactive) | `SENSOR REQUIRES ATTENTION` (Amber) | Hidden |

---

## 19. Testing Methodology

Testing validates the 8 required operational scenarios:
1. Empty Tank ($\le 20\%$)
2. Low Water Level ($\le 20\%$)
3. Normal Water Level ($21\%\text{--}79\%$)
4. High Water Level ($\ge 80\%$)
5. Full Tank ($\approx 100\%$)
6. Sensor Disconnected / Timeout
7. Internet Disconnected / Local Autonomy
8. Water Level Restoration above 20%

---

## 20. Testing Results & Verification Matrix

| Test ID | Test Scenario | Expected Result | Actual Result | Status | Observations |
|---|---|---|---|---|---|
| **TEST 1** | Empty tank (0–15%) | Water level low; Buzzer ON | Level 10%, Buzzer ON, GPIO 23 HIGH | **PASS** | Buzzer sounds immediately; dashboard alert active. |
| **TEST 2** | Low water level (16–20%) | Water level $\le 20\%$; Buzzer ON | Level 18%, Buzzer ON, GPIO 23 HIGH | **PASS** | Ingested with `buzzer_status: true`. |
| **TEST 3** | Normal water level (21–79%) | Water level $> 20\%$; Buzzer OFF | Level 50%, Buzzer OFF, GPIO 23 LOW | **PASS** | Ingested with `buzzer_status: false`. |
| **TEST 4** | High water level (80–94%) | Level $\ge 80\%$; Buzzer OFF | Level 80%, Buzzer OFF, GPIO 23 LOW | **PASS** | Dashboard displays normal green badge. |
| **TEST 5** | Full tank (95–100%) | Level $\approx 100\%$; Buzzer OFF | Level 96%, Buzzer OFF, GPIO 23 LOW | **PASS** | Tank capacity notice displayed; buzzer silent. |
| **TEST 6** | Sensor disconnected | Report sensor error; Buzzer OFF | `distance = -1.0`, Buzzer kept OFF | **PASS** | Prevents false alarms from missing data. |
| **TEST 7** | Wi-Fi / Internet disconnected | Local buzzer continues working | Buzzer triggers at $\le 20\%$ without Wi-Fi | **PASS** | Edge processing operates independently. |
| **TEST 8** | Water level restored $> 20\%$ | Buzzer turns OFF automatically | Water rises to 25%; Buzzer silences | **PASS** | Automatic deactivation confirmed. |

---

## 21. Engineering Observations
- Interfacing the active buzzer on GPIO 23 using an active module with an onboard NPN transistor driver allows the ESP32 logic output to switch the buzzer cleanly without drawing excessive current from the microcontroller pin.
- Enforcing local buzzer execution within the sensor acquisition loop ensures zero latency and failsafe local operation during router reboots or network outages.
- The fail-safe check prevents false alerts when the HC-SR04 transducer is unplugged or obstructed.

---

## 22. Limitations
- **Audible Range**: A standard piezo buzzer module operates at $\approx 85\,\text{dB}$ at $10\,\text{cm}$, sufficient for indoor domestic monitoring but may require a high-output siren for noisy industrial plant floors.
- **Threshold Hysteresis**: In tanks with severe water surface sloshing, levels oscillating around $20.0\%$ could cause buzzer chatter. A $1\text{--}2\%$ hysteresis band ($19\%$ trigger, $21\%$ release) is recommended for agitated fluid surfaces.

---

## 23. Future Enhancements
- **Hysteresis Smoothing**: Introduce a software Schmitt trigger ($19\%$ low threshold, $22\%$ clear threshold) to prevent acoustic ripple chatter.
- **Relay Cutoff Integration**: Wire an SPDT relay to GPIO 22 to automatically de-energize the intake pump or sound a strobe light.
- **Mute / Snooze Button**: Add a physical push button on GPIO 4 to temporarily silence the buzzer for 10 minutes during manual tank maintenance.

---

## 24. Conclusion
The integration of the three-pin active buzzer module on GPIO 23 successfully elevates the system to an autonomous, fail-safe water level monitoring solution. The system demonstrates local audible warning capabilities alongside full cloud telemetry, persistent relational storage, and real-time React web visualization.

---

## 25. References
1. Espressif Systems, "ESP32 Technical Reference Manual: GPIO and RTC Matrix," Version 5.0, 2024.
2. SparkFun Electronics, "HC-SR04 Ultrasonic Sensor Technical Specifications," 2022.
3. Django REST Framework, "Model Serializers & Field Validation," 2024.
4. PostgreSQL Global Development Group, "PostgreSQL 16 Documentation: Boolean Types and Indexing," 2024.
5. React Core Team, "React 18 Hooks and State Management," 2024.
