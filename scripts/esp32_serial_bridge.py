"""
ESP32 Serial-to-Dashboard Telemetry Bridge
==========================================
Captures live telemetry from physical ESP32 on COM9
and automatically ingests it into the Django REST backend.
This ensures real-time dashboard updates under all network
conditions (including enterprise Wi-Fi with client isolation).
"""

import serial
import json
import time
import requests
import sys

PORT = 'COM9'
BAUD = 115200
BACKEND_URL = 'http://localhost:8000/api/readings/'

def run_bridge():
    print(f"==================================================")
    print(f" ESP32 Live Telemetry Bridge -> React Dashboard  ")
    print(f" Port: {PORT} | Baud: {BAUD}                     ")
    print(f" Target: {BACKEND_URL}                           ")
    print(f"==================================================")

    while True:
        try:
            print(f"[BRIDGE] Connecting to {PORT}...")
            ser = serial.Serial(PORT, BAUD, timeout=1)
            time.sleep(1)
            ser.reset_input_buffer()
            print(f"[BRIDGE] Connected to ESP32! Listening for live telemetry...\n")

            while True:
                if ser.in_waiting:
                    line = ser.readline().decode('utf-8', errors='replace').strip()
                    if line:
                        if "[HTTP] Payload:" in line:
                            payload_str = line.split("[HTTP] Payload:")[1].strip()
                            try:
                                data = json.loads(payload_str)
                                resp = requests.post(BACKEND_URL, json=data, timeout=3)
                                print(f"[ESP32 -> DASHBOARD] Ingested -> HTTP {resp.status_code} | "
                                      f"Dist: {data.get('distance_cm')}cm | "
                                      f"Water: {data.get('water_level_cm')}cm ({data.get('water_percentage')}%) | "
                                      f"Status: {data.get('status')} | Buzzer: {data.get('buzzer_status')}")
                            except Exception as ex:
                                print(f"[BRIDGE] Ingestion error: {ex}")
                time.sleep(0.05)
        except serial.SerialException as se:
            print(f"[BRIDGE] Serial port disconnected or unavailable: {se}")
            print(f"[BRIDGE] Retrying in 3 seconds...")
            time.sleep(3)
        except KeyboardInterrupt:
            print("[BRIDGE] Stopped by user.")
            break
        except Exception as e:
            print(f"[BRIDGE] Unexpected error: {e}. Retrying...")
            time.sleep(2)

if __name__ == '__main__':
    run_bridge()
