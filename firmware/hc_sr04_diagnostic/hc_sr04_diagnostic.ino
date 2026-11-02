/*
 * ============================================================================
 * Project: HC-SR04 Ultrasonic Sensor Independent Diagnostic
 * Target: ESP32 DevKit V1
 * Purpose: Isolate and test HC-SR04 ultrasonic distance sensor hardware
 *          without Wi-Fi, Django, database, or buzzer dependencies.
 *
 * Hardware Pin Connections:
 *   - HC-SR04 VCC  -> ESP32 VIN / 5V (Must be 5V rail)
 *   - HC-SR04 GND  -> ESP32 GND (Common Ground)
 *   - HC-SR04 TRIG -> ESP32 GPIO 5
 *   - HC-SR04 ECHO -> Voltage Divider (1 kΩ / 2 kΩ) -> ESP32 GPIO 18
 *
 * Voltage Divider Arrangement:
 *   HC-SR04 ECHO (5V) --- [ 1 kΩ ] ---+--- ESP32 GPIO 18 (Input)
 *                                     |
 *                                  [ 2 kΩ ]
 *                                     |
 *                                 ESP32 GND
 *   V_out = 5.0V * (2000 / (1000 + 2000)) = 3.33V (Safe logic level for ESP32)
 * ============================================================================
 */

#include <Arduino.h>

// 1. PIN CONFIGURATION
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// 2. TIMING & PHYSICAL CONSTANTS
const unsigned long ECHO_TIMEOUT_US = 30000; // 30 ms timeout (~5 meters max range)
const float SOUND_SPEED_CM_PER_US   = 0.0343;

// Diagnostic cycle counter
unsigned long cycleCount = 0;

void setup() {
  // Initialize Serial Monitor at 115200 baud
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("     HC-SR04 ULTRASONIC SENSOR INDEPENDENT DIAGNOSTIC    ");
  Serial.println("========================================================");
  Serial.println("Configuration:");
  Serial.println("  - Trigger Pin : GPIO 5  (OUTPUT)");
  Serial.println("  - Echo Pin    : GPIO 18 (INPUT via 1k/2k Divider)");
  Serial.println("  - Echo Timeout: 30,000 microseconds (30 ms)");
  Serial.println("  - Measurement : 1 sample per second");
  Serial.println("--------------------------------------------------------\n");

  // Pin initialization
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Ensure trigger starts in a clean LOW state
  digitalWrite(TRIG_PIN, LOW);
  delay(50);
}

void loop() {
  cycleCount++;

  // Step 1: Record initial idle pin states prior to triggering
  int trigIdleState = digitalRead(TRIG_PIN);
  int echoIdleState = digitalRead(ECHO_PIN);

  // Step 2: Ensure trigger pin is LOW for at least 4 us to ensure a clean pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);

  // Step 3: Emit 10-microsecond HIGH trigger pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Step 4: Measure Echo duration using pulseIn() with 30,000 us timeout
  unsigned long echoDuration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);

  // Step 5: Capture post-measurement pin states
  int trigPostState = digitalRead(TRIG_PIN);
  int echoPostState = digitalRead(ECHO_PIN);

  // Step 6: Calculate distance and evaluate status
  float distanceCm = 0.0;
  String sensorStatus = "";

  if (echoDuration > 0) {
    // Formula: Distance (cm) = Echo Duration (us) * 0.0343 / 2
    distanceCm = (echoDuration * SOUND_SPEED_CM_PER_US) / 2.0;
    sensorStatus = "OK - ECHO RECEIVED";
  } else {
    distanceCm = 0.0;
    sensorStatus = "NO ECHO (TIMEOUT - No pulse returned within 30,000 us)";
  }

  // Step 7: Output structured diagnostic telemetry
  Serial.println("--------------------------------------------------------");
  Serial.printf("Sample #%lu\n", cycleCount);
  Serial.printf("  Trigger Pin (GPIO %d) State : Idle=%d | Post=%d\n", TRIG_PIN, trigIdleState, trigPostState);
  Serial.printf("  Echo Pin    (GPIO %d) State : Idle=%d | Post=%d\n", ECHO_PIN, echoIdleState, echoPostState);
  Serial.printf("  Echo Duration              : %lu us\n", echoDuration);

  if (echoDuration > 0) {
    Serial.printf("  Calculated Distance        : %.2f cm\n", distanceCm);
    Serial.printf("  Sensor Status              : %s\n", sensorStatus.c_str());
  } else {
    Serial.println("  Calculated Distance        : N/A (Sensor timeout)");
    Serial.printf("  Sensor Status              : *** %s ***\n", sensorStatus.c_str());
    
    // Hardware diagnostics feedback
    if (echoIdleState == HIGH) {
      Serial.println("  [HARDWARE WARNING] Echo pin is STUCK HIGH before pulse! Check for short to 3.3V/5V or swapped Trig/Echo.");
    }
    if (trigIdleState == HIGH) {
      Serial.println("  [HARDWARE WARNING] Trig pin is STUCK HIGH! Check for short to 3.3V/5V.");
    }
  }
  Serial.println("--------------------------------------------------------");

  // Step 8: Repeat once per second
  delay(1000);
}

