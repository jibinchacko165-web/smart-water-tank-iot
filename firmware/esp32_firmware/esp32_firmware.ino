/*
 * ============================================================================
 * IoT-Based Smart Water Tank Level Monitoring System with Automatic Buzzer Alert
 * ============================================================================
 * 
 * Hardware Configuration:
 *   - ESP32 DevKit V1
 *   - HC-SR04 Ultrasonic Distance Sensor:
 *       VCC  -> 5V / VIN
 *       TRIG -> GPIO 5
 *       ECHO -> GPIO 18 (via 1 kΩ / 2 kΩ resistor voltage divider: 5V -> 3.33V)
 *       GND  -> GND
 *   - Three-Pin Active Buzzer Module:
 *       VCC  -> 3.3V / 5V
 *       I/O  -> GPIO 23 (Active-LOW: LOW = Sound ON, HIGH = Sound OFF)
 *       GND  -> GND
 * 
 * Logic Specifications:
 *   - Water Level < 90%: NORMAL MONITORING -> Buzzer OFF (GPIO 23 = HIGH)
 *   - Water Level >= 90%: HIGH WATER / OVERFLOW ALERT -> Buzzer ON (GPIO 23 = LOW)
 *   - Sensor Disconnected / Timeout: SENSOR ERROR -> Buzzer OFF (GPIO 23 = HIGH)
 *   - Local Autonomy: Buzzer logic runs directly on ESP32 independent of Wi-Fi.
 *   - Telemetry: Automatic HTTP POST to Django REST API & Periodic Heartbeats.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. PIN CONFIGURATION
// ==========================================
const int TRIG_PIN   = 5;
const int ECHO_PIN   = 18;
const int BUZZER_PIN = 23;  // Three-pin active buzzer signal pin
const int LED_PIN    = 2;   // Onboard LED for status feedback

// ==========================================
// 2. BUZZER HARDWARE LOGIC LEVEL (ACTIVE-LOW)
// ==========================================
// 3-pin buzzer breakout modules with onboard PNP/inverter circuitry
// sound when the I/O line is pulled LOW (0V) and remain silent when HIGH (3.3V).
const int BUZZER_ACTIVE_LEVEL   = LOW;   // LOW  = Sound ON (High Water / Overflow Alert)
const int BUZZER_INACTIVE_LEVEL = HIGH;  // HIGH = Sound OFF (Normal Water Level)

// ==========================================
// 3. TANK CALIBRATION & THRESHOLD SPECIFICATIONS
// ==========================================
// Total calibrated height of the water tank (in cm)
const float TANK_HEIGHT_CM = 100.0;

// High-water alert buzzer activation threshold (90.0%)
const float HIGH_WATER_BUZZER_THRESHOLD = 90.0;

// Physical sensor limits: blind zone is 2.0 cm; maximum valid echo distance is tank height + 15 cm margin
const float MIN_VALID_DISTANCE_CM = 2.0;
const float MAX_VALID_DISTANCE_CM = TANK_HEIGHT_CM + 15.0;

// Tank status classifications
const float THRESHOLD_EMPTY  = 15.0; // <= 15% is EMPTY
const float THRESHOLD_LOW    = 35.0; // 15% - 35% is LOW
const float THRESHOLD_NORMAL = 89.9; // 35% - 89.9% is NORMAL
const float THRESHOLD_HIGH   = 95.0; // 90.0% - 95.0% is HIGH
                                     // > 95% is FULL

// ==========================================
// 4. NETWORK & BACKEND CONFIGURATION
// ==========================================
// Active network SSID and Password
const char* WIFI_SSID     = "Keralavision";
const char* WIFI_PASSWORD = "jobin7454";

// Django Backend REST API endpoints (Local LAN IP of host PC running Docker backend)
const char* BACKEND_URL   = "http://192.168.1.7:8000/api/readings/";
const char* HEARTBEAT_URL = "http://192.168.1.7:8000/api/device/heartbeat/";
const char* DEVICE_ID     = "ESP32_WATER_001";

// Reading and transmission intervals
const unsigned long TRANSMIT_INTERVAL_MS   = 3000;  // Telemetry sent every 3 seconds
const unsigned long HEARTBEAT_INTERVAL_MS  = 10000; // Standalone heartbeat every 10 seconds
const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;  // Wi-Fi check every 5 seconds

// ==========================================
// 5. GLOBAL STATE & FILTERING VARIABLES
// ==========================================
unsigned long lastTransmitTime  = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastWifiRetryTime = 0;
bool isBuzzerCurrentlyActive    = false;

// Median filter sample count (5 samples for acoustic spike rejection)
const int FILTER_SAMPLES = 5;

// Diagnostic raw distance tracking
float lastRawDistance = -1.0;

// Exponential smoothing filter to prevent sudden unrealistic percentage changes
float smoothedPercentage = -1.0;

// ==========================================
// 6. BUZZER CONTROL FUNCTIONS (LOCAL AUTONOMY)
// ==========================================

/**
 * Activate the audible alert (Drive GPIO 23 LOW).
 * Works strictly locally on the ESP32 without requiring Wi-Fi.
 */
void activateBuzzer() {
  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_LEVEL);
  isBuzzerCurrentlyActive = true;
}

/**
 * Deactivate the audible alert (Drive GPIO 23 HIGH).
 */
void deactivateBuzzer() {
  digitalWrite(BUZZER_PIN, BUZZER_INACTIVE_LEVEL);
  isBuzzerCurrentlyActive = false;
}

// ==========================================
// 7. SENSOR ACQUISITION & FILTERING
// ==========================================

unsigned long measureSingleRawDuration() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // 38 ms timeout covers maximum HC-SR04 hardware failsafe pulse width
  return pulseIn(ECHO_PIN, HIGH, 38000);
}

void sortDurations(unsigned long arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        unsigned long temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
}

float getFilteredDistance() {
  unsigned long durations[FILTER_SAMPLES];
  int validCount = 0;

  for (int i = 0; i < FILTER_SAMPLES; i++) {
    unsigned long dur = measureSingleRawDuration();
    if (dur > 0) {
      float singleDist = (dur * 0.0343) / 2.0;
      // Reject physically impossible readings
      if (singleDist >= MIN_VALID_DISTANCE_CM && singleDist <= MAX_VALID_DISTANCE_CM) {
        durations[validCount++] = dur;
        lastRawDistance = singleDist;
      }
    }
    delay(60); // At least 50 ms settling time between acoustic samples
  }

  // If majority of samples failed (fewer than 3 out of 5), return invalid flag
  if (validCount < (FILTER_SAMPLES / 2 + 1)) {
    return -1.0;
  }

  // Sort valid durations and pick median
  sortDurations(durations, validCount);
  unsigned long medianDuration = durations[validCount / 2];

  float distance = (medianDuration * 0.0343) / 2.0;
  return distance;
}

String determineTankStatus(float percentage) {
  if (percentage <= THRESHOLD_EMPTY) {
    return "EMPTY";
  } else if (percentage <= THRESHOLD_LOW) {
    return "LOW";
  } else if (percentage < HIGH_WATER_BUZZER_THRESHOLD) {
    return "NORMAL";
  } else if (percentage < THRESHOLD_HIGH) {
    return "HIGH";
  } else {
    return "FULL";
  }
}

// Exponential moving average to dampen surface ripples and acoustic fluctuations
float applySmoothing(float currentPercentage) {
  if (smoothedPercentage < 0.0) {
    smoothedPercentage = currentPercentage; // Initial seeding
  } else {
    smoothedPercentage = (0.70 * currentPercentage) + (0.30 * smoothedPercentage);
  }
  return smoothedPercentage;
}

// ==========================================
// 8. WI-FI & HTTP TELEMETRY
// ==========================================

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("\n[Wi-Fi] Connecting to: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 8000) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] Assigned IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[Wi-Fi] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Connection in progress... Operating locally; will retry in background.");
    digitalWrite(LED_PIN, LOW);
  }
}

bool sendReadingToBackend(float distance, float waterLevel, float percentage, String status, bool buzzerActive) {
  // Always print the exact JSON payload for local bridge ingestion
  char payload[300];
  snprintf(payload, sizeof(payload),
    "{\"device_id\":\"%s\",\"distance_cm\":%.1f,\"water_level_cm\":%.1f,\"water_percentage\":%.1f,\"status\":\"%s\",\"tank_status\":\"%s\",\"buzzer_status\":%s}",
    DEVICE_ID, distance, waterLevel, percentage, status.c_str(), status.c_str(), buzzerActive ? "true" : "false");

  Serial.println("[HTTP] POST " + String(BACKEND_URL));
  Serial.print("[HTTP] Payload: ");
  Serial.println(payload);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi offline - Telemetry logged locally.");
    return false;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int httpResponseCode = http.POST(payload);

  bool success = false;
  if (httpResponseCode > 0) {
    Serial.print("[HTTP] Response Code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("[HTTP] Server Response: " + response);

    if (httpResponseCode == 200 || httpResponseCode == 201) {
      success = true;
    }
  } else {
    Serial.print("[HTTP] POST Failed: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  return success;
}

bool sendHeartbeatToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  http.begin(HEARTBEAT_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  char hbPayload[120];
  snprintf(hbPayload, sizeof(hbPayload),
    "{\"device_id\":\"%s\",\"wifi_rssi\":%d}",
    DEVICE_ID, WiFi.RSSI());

  int code = http.POST(hbPayload);
  bool success = (code == 200 || code == 201);
  if (!success) {
    Serial.printf("[HEARTBEAT] Ping failed: %s (code %d)\n", http.errorToString(code).c_str(), code);
  } else {
    Serial.println("[HEARTBEAT] Device ping confirmed with Django backend.");
  }
  http.end();
  return success;
}

// ==========================================
// 9. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000);

  Serial.println("\n========================================================");
  Serial.println("  IoT Smart Water Tank Level System with Automatic Buzzer ");
  Serial.println("  HC-SR04: Trig(GPIO 5), Echo(GPIO 18 via 1k/2k Divider)  ");
  Serial.println("  Active-LOW Buzzer: GPIO 23 (LOW = Sound ON, HIGH = OFF) ");
  Serial.println("  Alert Logic: Water Level >= 90% -> Buzzer ON            ");
  Serial.println("========================================================");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Guarantee clean initial pin states
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // CRITICAL: Ensure buzzer starts SILENT (Active-LOW: HIGH = OFF)
  deactivateBuzzer();

  // Initialize network connection
  connectToWiFi();
}

// ==========================================
// 10. MAIN LOOP
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // Background Wi-Fi reconnection check
  if (WiFi.status() != WL_CONNECTED && (currentMillis - lastWifiRetryTime >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetryTime = currentMillis;
    connectToWiFi();
  }

  // Periodic measurement and control cycle
  if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = currentMillis;

    float distance = getFilteredDistance();

    // SENSOR ERROR & TIMEOUT HANDLING:
    // If reading is invalid or sensor disconnected, DO NOT interpret as empty or full.
    // Keep the buzzer OFF and report the error cleanly.
    if (distance < 0.0) {
      deactivateBuzzer();
      Serial.println("\n==========================================");
      Serial.println("RAW DISTANCE: N/A");
      Serial.println("FILTERED DISTANCE: N/A");
      Serial.printf("EMPTY TANK REFERENCE: %.1f cm\n", TANK_HEIGHT_CM);
      Serial.println("WATER LEVEL: N/A");
      Serial.println("WATER PERCENTAGE: N/A");
      Serial.println("TANK STATUS: UNKNOWN");
      Serial.println("BUZZER GPIO: HIGH");
      Serial.println("BUZZER STATUS: OFF");
      Serial.println("SENSOR STATUS: INVALID");
      Serial.println("==========================================");
      Serial.println("[ERROR] Sensor timeout or disconnected! HC-SR04 requires attention.");
      Serial.println("[SAFETY] Buzzer kept OFF to prevent false alarms from missing data.");

      // Send heartbeat even when sensor has an error so backend knows ESP32 is online
      sendHeartbeatToBackend();
      return;
    }

    // Formulas:
    // Tank height = 100 cm.
    // Water level height = Tank height - Measured distance.
    // Water percentage = (Water level height / Tank height) * 100.
    float waterLevel = TANK_HEIGHT_CM - distance;

    if (waterLevel < 0.0) waterLevel = 0.0;
    if (waterLevel > TANK_HEIGHT_CM) waterLevel = TANK_HEIGHT_CM;

    float rawPercentage = (waterLevel / TANK_HEIGHT_CM) * 100.0;
    if (rawPercentage < 0.0) rawPercentage = 0.0;
    if (rawPercentage > 100.0) rawPercentage = 100.0;

    // Apply ripple/fluctuation damping
    float finalPercentage = applySmoothing(rawPercentage);

    String tankStatus = determineTankStatus(finalPercentage);

    // ==========================================
    // AUTOMATIC HIGH WATER BUZZER CONTROL LOGIC
    // ==========================================
    // Water level < 90%  -> LOW/NORMAL                 -> Buzzer OFF (GPIO 23 = HIGH)
    // Water level >= 90% -> HIGH/FULL/OVERFLOW ALERT   -> Buzzer ON  (GPIO 23 = LOW)
    // Invalid / timeout  -> SENSOR ERROR               -> Buzzer OFF (GPIO 23 = HIGH)
    bool buzzerShouldBeActive = false;
    if (finalPercentage >= HIGH_WATER_BUZZER_THRESHOLD) {
      buzzerShouldBeActive = true;
      activateBuzzer();
    } else {
      buzzerShouldBeActive = false;
      deactivateBuzzer();
    }

    // Diagnostic Output in Mandatory Format (Section 5)
    Serial.println("\n==========================================");
    if (lastRawDistance >= 0.0) {
      Serial.printf("RAW DISTANCE: %.1f cm\n", lastRawDistance);
    } else {
      Serial.printf("RAW DISTANCE: %.1f cm\n", distance);
    }
    Serial.printf("FILTERED DISTANCE: %.1f cm\n", distance);
    Serial.printf("EMPTY TANK REFERENCE: %.1f cm\n", TANK_HEIGHT_CM);
    Serial.printf("WATER LEVEL: %.1f cm\n", waterLevel);
    Serial.printf("WATER PERCENTAGE: %.1f%%\n", finalPercentage);
    Serial.printf("TANK STATUS: %s\n", tankStatus.c_str());
    Serial.printf("BUZZER GPIO: %s\n", buzzerShouldBeActive ? "LOW" : "HIGH");
    Serial.printf("BUZZER STATUS: %s\n", buzzerShouldBeActive ? "ON" : "OFF");
    Serial.println("SENSOR STATUS: VALID");
    Serial.println("==========================================");

    // Transmit telemetry to Django REST backend
    sendReadingToBackend(distance, waterLevel, finalPercentage, tankStatus, buzzerShouldBeActive);
  }

  // Periodic heartbeat transmission (keeps device marked ONLINE even if readings are stationary)
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeatToBackend();
  }
}
