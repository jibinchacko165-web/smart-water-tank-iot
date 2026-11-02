#!/usr/bin/env python3
"""
Live Telemetry Stream Simulator for Smart Water Tank System with Buzzer Alert.
Continuously feeds realistic sensor readings into the backend REST API
to demonstrate live real-time dashboard updates, wave animations, and buzzer triggers.
"""

import time
import requests
import random
import math

API_URL = "http://localhost:8000/api/readings/"
DEVICE_ID = "ESP32_WATER_001"
TANK_HEIGHT_CM = 100.0
LOW_WATER_THRESHOLD_PCT = 20.0

def get_status(pct):
    if pct < 15.0:
        return "EMPTY"
    elif pct < 35.0:
        return "LOW"
    elif pct < 75.0:
        return "NORMAL"
    elif pct < 95.0:
        return "HIGH"
    else:
        return "FULL"

def run_simulation(interval_seconds=3):
    print("==================================================")
    print("  Live Telemetry Stream Simulator Started        ")
    print(f"  Target: {API_URL} (Interval: {interval_seconds}s)")
    print(f"  Buzzer Trigger Threshold: <= {LOW_WATER_THRESHOLD_PCT}%")
    print("  Open Dashboard at: http://localhost:8000       ")
    print("  Press Ctrl+C to stop simulation                 ")
    print("==================================================")

    step = 0
    while True:
        try:
            # Generate smooth oscillating sinusoidal tank level (between 10% and 95%)
            sine_val = (math.sin(step * 0.15) + 1.0) / 2.0  # 0.0 to 1.0
            water_level_cm = round(10.0 + sine_val * 85.0 + random.uniform(-0.5, 0.5), 1)
            water_level_cm = max(2.0, min(TANK_HEIGHT_CM, water_level_cm))
            
            distance_cm = round(TANK_HEIGHT_CM - water_level_cm, 1)
            percentage = round((water_level_cm / TANK_HEIGHT_CM) * 100.0, 1)
            status = get_status(percentage)
            buzzer_active = bool(percentage <= LOW_WATER_THRESHOLD_PCT)

            payload = {
                "device_id": DEVICE_ID,
                "distance_cm": distance_cm,
                "water_level_cm": water_level_cm,
                "water_percentage": percentage,
                "status": status,
                "tank_status": status,
                "buzzer_status": buzzer_active
            }

            r = requests.post(API_URL, json=payload, timeout=4)
            buzzer_tag = "[BUZZER:ON (ALERT)]" if buzzer_active else "[BUZZER:OFF]"
            if r.status_code == 201:
                print(f"[STREAM] [{time.strftime('%H:%M:%S')}] Distance: {distance_cm:5.1f}cm | Level: {water_level_cm:5.1f}cm | Fill: {percentage:5.1f}% | {status:6s} {buzzer_tag} -> HTTP 201")
            else:
                print(f"[ERROR] HTTP {r.status_code}: {r.text}")

            step += 1
            time.sleep(interval_seconds)

        except KeyboardInterrupt:
            print("\n[!] Simulator stopped by user.")
            break
        except Exception as e:
            print(f"[ERROR] Failed to post telemetry: {e}")
            time.sleep(2)

if __name__ == "__main__":
    run_simulation()
