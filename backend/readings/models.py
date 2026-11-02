from django.db import models
from django.core.exceptions import ValidationError

class SensorReading(models.Model):
    STATUS_CHOICES = [
        ('EMPTY', 'Empty'),
        ('LOW', 'Low'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('FULL', 'Full'),
    ]

    device_id = models.CharField(
        max_length=50,
        db_index=True,
        help_text="ESP32 Unique Hardware Identifier (e.g., ESP32_WATER_001)"
    )
    distance_cm = models.FloatField(
        help_text="Measured acoustic distance from sensor to water surface in cm"
    )
    water_level_cm = models.FloatField(
        help_text="Calculated water column height in cm"
    )
    water_percentage = models.FloatField(
        help_text="Calculated tank fill percentage (0.0 to 100.0)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='NORMAL',
        db_index=True,
        help_text="Tank fill status classification"
    )
    buzzer_status = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Audible high-water buzzer activation state (True when level >= 90%)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="UTC timestamp recorded upon ingestion"
    )

    class Meta:
        db_table = 'sensor_readings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at'], name='reading_created_at_desc_idx'),
            models.Index(fields=['device_id', '-created_at'], name='device_created_idx'),
        ]

    def clean(self):
        super().clean()
        if self.distance_cm is not None and self.distance_cm < 0:
            raise ValidationError({'distance_cm': 'Distance cannot be negative.'})
        if self.water_level_cm is not None and self.water_level_cm < 0:
            raise ValidationError({'water_level_cm': 'Water level cannot be negative.'})
        if self.water_percentage is not None and not (0.0 <= self.water_percentage <= 100.0):
            raise ValidationError({'water_percentage': 'Water percentage must be between 0.0 and 100.0%.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        buzzer_str = "BUZZER:ON" if self.buzzer_status else "BUZZER:OFF"
        return f"[{self.device_id}] {self.water_percentage:.1f}% ({self.status}) [{buzzer_str}] @ {self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else 'pending'}"


class DeviceHeartbeat(models.Model):
    """
    Tracks the latest heartbeat / ping from IoT devices to evaluate genuine real-time connectivity.
    Ensures that offline detection accurately reflects real-time device status even if readings are paused.
    """
    device_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="ESP32 Unique Hardware Identifier (e.g., ESP32_WATER_001)"
    )
    last_seen = models.DateTimeField(
        auto_now=True,
        db_index=True,
        help_text="Timestamp of most recent verified communication"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Reported client LAN IP address"
    )
    wifi_rssi = models.IntegerField(
        null=True,
        blank=True,
        help_text="Reported Wi-Fi signal strength in dBm"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = 'device_heartbeats'
        ordering = ['-last_seen']

    def __str__(self):
        return f"[{self.device_id}] last seen: {self.last_seen.strftime('%Y-%m-%d %H:%M:%S')}"
