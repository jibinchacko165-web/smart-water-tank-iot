#include <Arduino.h>

const int PINS_TO_TEST[] = {5, 18, 19, 21, 22, 23, 4, 2, 13, 12, 14, 27};
const int NUM_PINS = sizeof(PINS_TO_TEST) / sizeof(PINS_TO_TEST[0]);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== HC-SR04 PIN DIAGNOSTIC SCANNER ===");
}

void testTrigEchoPair(int trig, int echo) {
  pinMode(trig, OUTPUT);
  pinMode(echo, INPUT);

  digitalWrite(trig, LOW);
  delayMicroseconds(4);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  unsigned long dur = pulseIn(echo, HIGH, 35000);
  if (dur > 0) {
    float dist = (dur * 0.0343) / 2.0;
    Serial.printf(">>> MATCH FOUND! Trig=GPIO %d, Echo=GPIO %d -> Duration: %lu us, Distance: %.1f cm <<<\n", trig, echo, dur, dist);
  }
}

void loop() {
  pinMode(5, INPUT_PULLDOWN);
  int val_in = digitalRead(5);

  pinMode(5, OUTPUT);
  digitalWrite(5, LOW);
  delay(1);
  pinMode(5, INPUT);
  int val_after_low = digitalRead(5);

  Serial.printf("IO5 read: %d | after low pulse: %d | IO18: %d | IO23: %d\n", 
    val_in, val_after_low, digitalRead(18), digitalRead(23));

  delay(1000);
}
