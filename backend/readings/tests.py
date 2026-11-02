from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from .models import SensorReading

class SensorReadingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.valid_payload = {
            "device_id": "ESP32_WATER_001",
            "distance_cm": 25.5,
            "water_level_cm": 74.5,
            "water_percentage": 74.5,
            "status": "NORMAL",
            "buzzer_status": False
        }

    def test_post_valid_reading(self):
        response = self.client.post('/api/readings/', self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SensorReading.objects.count(), 1)
        reading = SensorReading.objects.first()
        self.assertEqual(reading.device_id, "ESP32_WATER_001")
        self.assertEqual(reading.water_percentage, 74.5)
        self.assertEqual(reading.status, "NORMAL")
        self.assertFalse(reading.buzzer_status)

    def test_buzzer_active_on_low_water(self):
        payload = {
            "device_id": "ESP32_WATER_001",
            "distance_cm": 85.0,
            "water_level_cm": 15.0,
            "water_percentage": 15.0,
            "status": "LOW",
            "buzzer_status": True
        }
        response = self.client.post('/api/readings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        reading = SensorReading.objects.first()
        self.assertTrue(reading.buzzer_status)

    def test_buzzer_auto_derived_when_omitted(self):
        # Water level >= 90% should auto-derive buzzer_status=True
        high_payload = {
            "device_id": "ESP32_WATER_001",
            "distance_cm": 8.0,
            "water_level_cm": 92.0,
            "water_percentage": 92.0,
            "status": "HIGH"
        }
        res_high = self.client.post('/api/readings/', high_payload, format='json')
        self.assertEqual(res_high.status_code, status.HTTP_201_CREATED)
        reading_high = SensorReading.objects.filter(water_percentage=92.0).first()
        self.assertTrue(reading_high.buzzer_status)

        # Water level < 90% should auto-derive buzzer_status=False
        normal_payload = {
            "device_id": "ESP32_WATER_001",
            "distance_cm": 50.0,
            "water_level_cm": 50.0,
            "water_percentage": 50.0,
            "status": "NORMAL"
        }
        res_norm = self.client.post('/api/readings/', normal_payload, format='json')
        self.assertEqual(res_norm.status_code, status.HTTP_201_CREATED)
        reading_norm = SensorReading.objects.filter(water_percentage=50.0).first()
        self.assertFalse(reading_norm.buzzer_status)

    def test_heartbeat_updates_device_status(self):
        # Initial status should be offline without communication
        response = self.client.get('/api/device/status/?device_id=NEW_DEVICE_001')
        self.assertEqual(response.data['status'], "OFFLINE")

        # Post heartbeat
        hb_res = self.client.post('/api/device/heartbeat/', {
            "device_id": "NEW_DEVICE_001",
            "wifi_rssi": -55
        }, format='json')
        self.assertEqual(hb_res.status_code, status.HTTP_200_OK)

        # Device should now be ONLINE
        response = self.client.get('/api/device/status/?device_id=NEW_DEVICE_001')
        self.assertEqual(response.data['status'], "ONLINE")

    def test_reject_negative_distance(self):
        payload = dict(self.valid_payload)
        payload["distance_cm"] = -5.0
        response = self.client.post('/api/readings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SensorReading.objects.count(), 0)

    def test_reject_percentage_over_100(self):
        payload = dict(self.valid_payload)
        payload["water_percentage"] = 105.0
        response = self.client.post('/api/readings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SensorReading.objects.count(), 0)

    def test_reject_invalid_status_enum(self):
        payload = dict(self.valid_payload)
        payload["status"] = "FABRICATED_STATUS"
        response = self.client.post('/api/readings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SensorReading.objects.count(), 0)

    def test_reject_blank_device_id(self):
        payload = dict(self.valid_payload)
        payload["device_id"] = "   "
        response = self.client.post('/api/readings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_latest_reading(self):
        self.client.post('/api/readings/', self.valid_payload, format='json')
        response = self.client.get('/api/readings/latest/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_id'], "ESP32_WATER_001")
        self.assertEqual(response.data['water_level_cm'], 74.5)
        self.assertIn('buzzer_status', response.data)

    def test_get_history_and_stats(self):
        readings = [
            {"device_id": "ESP32_WATER_001", "distance_cm": 80.0, "water_level_cm": 20.0, "water_percentage": 20.0, "status": "LOW", "buzzer_status": True},
            {"device_id": "ESP32_WATER_001", "distance_cm": 50.0, "water_level_cm": 50.0, "water_percentage": 50.0, "status": "NORMAL", "buzzer_status": False},
            {"device_id": "ESP32_WATER_001", "distance_cm": 10.0, "water_level_cm": 90.0, "water_percentage": 90.0, "status": "HIGH", "buzzer_status": False},
        ]
        for r in readings:
            self.client.post('/api/readings/', r, format='json')

        response = self.client.get('/api/readings/history/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(response.data['statistics']['min_water_level_cm'], 20.0)
        self.assertEqual(response.data['statistics']['max_water_level_cm'], 90.0)
        self.assertEqual(response.data['statistics']['avg_water_level_cm'], 53.3)

    def test_device_online_status(self):
        self.client.post('/api/readings/', self.valid_payload, format='json')
        response = self.client.get('/api/device/status/?device_id=ESP32_WATER_001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], "ONLINE")

    def test_device_offline_status_when_stale(self):
        r = SensorReading.objects.create(
            device_id="ESP32_WATER_001",
            distance_cm=30.0,
            water_level_cm=70.0,
            water_percentage=70.0,
            status="NORMAL",
            buzzer_status=False
        )
        SensorReading.objects.filter(id=r.id).update(created_at=timezone.now() - timedelta(seconds=60))

        response = self.client.get('/api/device/status/?device_id=ESP32_WATER_001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], "OFFLINE")
