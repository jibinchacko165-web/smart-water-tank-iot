/*
 * ============================================================================
 * Project: Three-Pin Buzzer Module Hardware Polarity Diagnostic
 * Target: ESP32 DevKit V1
 * Pin: GPIO 23 (Buzzer Signal / I/O)
 * Purpose: Alternate GPIO 23 HIGH (2s) and LOW (2s) to definitively determine
 *          whether the connected 3-pin buzzer module is ACTIVE-HIGH or ACTIVE-LOW.
 * ============================================================================
 */

#include <Arduino.h>

const int BUZZER_PIN = 23;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("       3-PIN BUZZER HARDWARE POLARITY DIAGNOSTIC        ");
  Serial.println("========================================================");
  Serial.println("Testing Pin: GPIO 23");
  Serial.println("Procedure: 2 seconds HIGH, then 2 seconds LOW.");
  Serial.println("Observe when the buzzer physically produces sound.");
  Serial.println("--------------------------------------------------------\n");

  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  // Phase 1: Drive GPIO 23 HIGH for 2 seconds
  Serial.println("[TEST PHASE] GPIO 23 -> HIGH (3.3V)");
  Serial.println("  >>> If buzzer is SOUNDING right now: Module is ACTIVE-HIGH.");
  Serial.println("  >>> If buzzer is SILENT right now  : Module is ACTIVE-LOW.");
  digitalWrite(BUZZER_PIN, HIGH);
  delay(2000);

  // Phase 2: Drive GPIO 23 LOW for 2 seconds
  Serial.println("[TEST PHASE] GPIO 23 -> LOW (0.0V / GND)");
  Serial.println("  >>> If buzzer is SOUNDING right now: Module is ACTIVE-LOW.");
  Serial.println("  >>> If buzzer is SILENT right now  : Module is ACTIVE-HIGH.");
  digitalWrite(BUZZER_PIN, LOW);
  delay(2000);

  Serial.println("--------------------------------------------------------");
}

