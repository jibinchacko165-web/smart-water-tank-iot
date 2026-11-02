#!/usr/bin/env python3
"""
Integration and End-to-End Test Suite for Smart Water Tank Level Monitoring System with Buzzer Alert.
Tests Django REST APIs, payload validation, database persistence, and simulated sensor streaming.
"""

import time
import requests
import sys

BASE_URL = "http://localhost:8000"

def log(msg, status="INFO"):
    symbol = "✓" if status == "PASS" else "✗" if status == "FAIL" else "ℹ"
    print(f"[{symbol}] [{status}] {msg}")

def test_health():
    url = f"{BASE_URL}/health/"
    try:
        r = requests.get(url, timeout=5)
        if r.status_code == 200 and r.json().get("status") == "healthy":
            log("Health check passed: Backend service is operational.", "PASS")
            return True
        log(f"Health check failed with status {r.status_code}: {r.text}", "FAIL")
        return False
    except Exception as e:
        log(f"Could not connect to {url}: {e}", "FAIL")
        return False

def test_payload_validation():
    endpoint = f"{BASE_URL}/api/readings/"
    log("Testing input validation rules against POST /api/readings/...")

    # Test 1: Negative distance rejection
    bad_payload = {
        "device_id": "ESP32_WATER_001",
        "distance_cm": -10.0,
        "water_level_cm": 110.0,
        "water_percentage": 50.0,
        "status": "NORMAL",
        "buzzer_status": False
    }
    r = requests.post(endpoint, json=bad_payload)
    if r.status_code == 400:
        log("Correctly rejected negative distance with HTTP 400.", "PASS")
    else:
        log(f"Expected HTTP 400 for negative distance, got {r.status_code}", "FAIL")

    # Test 2: Percentage above 100% rejection
    bad_payload = {
        "device_id": "ESP32_WATER_001",
        "distance_cm": 10.0,
        "water_level_cm": 90.0,
        "water_percentage": 105.0,
        "status": "NORMAL",
        "buzzer_status": False
    }
    r = requests.post(endpoint, json=bad_payload)
    if r.status_code == 400:
        log("Correctly rejected percentage > 100% with HTTP 400.", "PASS")
    else:
        log(f"Expected HTTP 400 for percentage > 100%, got {r.status_code}", "FAIL")

    # Test 3: Invalid status string rejection
    bad_payload = {
        "device_id": "ESP32_WATER_001",
        "distance_cm": 10.0,
        "water_level_cm": 90.0,
        "water_percentage": 90.0,
        "status": "FABRICATED",
        "buzzer_status": False
    }
    r = requests.post(endpoint, json=bad_payload)
    if r.status_code == 400:
        log("Correctly rejected illegal status string with HTTP 400.", "PASS")
    else:
        log(f"Expected HTTP 400 for invalid status, got {r.status_code}", "FAIL")

    # Test 4: Blank device id rejection
    bad_payload = {
        "device_id": "   ",
        "distance_cm": 10.0,
        "water_level_cm": 90.0,
        "water_percentage": 90.0,
        "status": "NORMAL",
        "buzzer_status": False
    }
    r = requests.post(endpoint, json=bad_payload)
    if r.status_code == 400:
        log("Correctly rejected blank device_id with HTTP 400.", "PASS")
    else:
        log(f"Expected HTTP 400 for blank device_id, got {r.status_code}", "FAIL")

def simulate_sensor_stream():
    endpoint = f"{BASE_URL}/api/readings/"
    log("Verifying 90% High Water Buzzer Alert logic and heartbeat across all levels...")

    test_steps = [
        {"distance_cm": 50.0, "water_level_cm": 50.0, "water_percentage": 50.0, "status": "NORMAL", "buzzer_status": False},
        {"distance_cm": 20.0, "water_level_cm": 80.0, "water_percentage": 80.0, "status": "NORMAL", "buzzer_status": False},
        {"distance_cm": 11.0, "water_level_cm": 89.0, "water_percentage": 89.0, "status": "NORMAL", "buzzer_status": False},
        {"distance_cm": 10.0, "water_level_cm": 90.0, "water_percentage": 90.0, "status": "HIGH",   "buzzer_status": True},
        {"distance_cm": 5.0,  "water_level_cm": 95.0, "water_percentage": 95.0, "status": "HIGH",   "buzzer_status": True},
        {"distance_cm": 0.0,  "water_level_cm": 100.0,"water_percentage": 100.0,"status": "FULL",   "buzzer_status": True},
    ]

    for i, step in enumerate(test_steps, 1):
        payload = {
            "device_id": "ESP32_WATER_001",
            **step
        }
        r = requests.post(endpoint, json=payload)
        if r.status_code == 201:
            buzzer_str = "BUZZER:ON (HIGH WATER ALERT)" if step["buzzer_status"] else "BUZZER:OFF (NORMAL)"
            log(f"Test Step {i}/6 Ingested: Level {step['water_level_cm']} cm ({step['water_percentage']}%) [{step['status']}] [{buzzer_str}]", "PASS")
        else:
            log(f"Step {i} Failed: {r.status_code} - {r.text}", "FAIL")
        time.sleep(0.3)

def test_data_retrieval():
    log("Verifying latest reading and historical analytics endpoints...")

    # Latest reading
    r = requests.get(f"{BASE_URL}/api/readings/latest/")
    if r.status_code == 200:
        data = r.json()
        log(f"GET /api/readings/latest/ -> Device: {data['device_id']}, Level: {data['water_level_cm']} cm ({data['water_percentage']}%), Buzzer: {data.get('buzzer_status')}", "PASS")
    else:
        log(f"GET /api/readings/latest/ failed: {r.status_code}", "FAIL")

    # Historical readings
    r = requests.get(f"{BASE_URL}/api/readings/history/")
    if r.status_code == 200:
        data = r.json()
        stats = data.get("statistics", {})
        log(f"GET /api/readings/history/ -> Count: {data.get('count')}, Min: {stats.get('min_water_level_cm')}cm, Max: {stats.get('max_water_level_cm')}cm, Avg: {stats.get('avg_water_level_cm')}cm", "PASS")
    else:
        log(f"GET /api/readings/history/ failed: {r.status_code}", "FAIL")

    # Device status
    r = requests.get(f"{BASE_URL}/api/device/status/?device_id=ESP32_WATER_001")
    if r.status_code == 200:
        data = r.json()
        log(f"GET /api/device/status/ -> Connectivity: {data.get('status')} ({data.get('connectivity')}), Seconds Since: {data.get('seconds_since_last_reading')}s", "PASS")
    else:
        log(f"GET /api/device/status/ failed: {r.status_code}", "FAIL")

if __name__ == "__main__":
    print("==================================================")
    print("  End-to-End API and Validation Test Runner       ")
    print("  Testing Water Level & Automatic Buzzer Alert    ")
    print("==================================================")
    if not test_health():
        print("[!] Backend is not reachable at http://localhost:8000. Wait for Docker containers to finish starting.")
        sys.exit(1)

    test_payload_validation()
    simulate_sensor_stream()
    test_data_retrieval()
    print("==================================================")
    print("  All API and validation tests completed!         ")
    print("==================================================")
