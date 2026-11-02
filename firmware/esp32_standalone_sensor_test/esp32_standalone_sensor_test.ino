/*
 * ============================================================================
 * ESP32 HC-SR04 Standalone Sensor Hardware Diagnostic Test
 * Purpose: Independent sensor validation without Wi-Fi/Backend dependency
 * ============================================================================
 */

const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const float TANK_HEIGHT_CM = 100.0;
const int FILTER_SAMPLES = 5;

void setup() {
  Serial.begin(115200);
  delay(1000);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  Serial.println("\n--- HC-SR04 Hardware Diagnostic Initialized ---");
  Serial.println("Trig: GPIO 5 | Echo: GPIO 18 (Voltage Divider 1k/2k)");
  Serial.println("Reading sensor once per second with 5-sample median filter...");
}

unsigned long pingSingle() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  return pulseIn(ECHO_PIN, HIGH, 30000);
}

void loop() {
  unsigned long samples[FILTER_SAMPLES];
  int valids = 0;

  for (int i = 0; i < FILTER_SAMPLES; i++) {
    unsigned long d = pingSingle();
    if (d > 0) {
      samples[valids++] = d;
    }
    delay(20);
  }

  if (valids < 3) {
    Serial.println("[FAIL] No Echo pulse detected. Check: 1) 5V to VCC 2) GND common 3) 1k/2k Resistors on ECHO pin 18.");
  } else {
    // Sort
    for (int i = 0; i < valids - 1; i++) {
      for (int j = 0; j < valids - i - 1; j++) {
        if (samples[j] > samples[j + 1]) {
          unsigned long t = samples[j];
          samples[j] = samples[j + 1];
          samples[j + 1] = t;
        }
      }
    }
    unsigned long med = samples[valids / 2];
    float dist = (med * 0.0343) / 2.0;
    float level = TANK_HEIGHT_CM - dist;
    if (level < 0) level = 0;
    if (level > TANK_HEIGHT_CM) level = TANK_HEIGHT_CM;
    float pct = (level / TANK_HEIGHT_CM) * 100.0;

    Serial.print("[PASS] Distance: ");
    Serial.print(dist, 1);
    Serial.print(" cm | Level: ");
    Serial.print(level, 1);
    Serial.print(" cm | Filled: ");
    Serial.print(pct, 1);
    Serial.println(" %");
  }

  delay(1000);
}

