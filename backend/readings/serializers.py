from rest_framework import serializers
from .models import SensorReading, DeviceHeartbeat

class SensorReadingSerializer(serializers.ModelSerializer):
    tank_status = serializers.CharField(source='status', required=False)

    class Meta:
        model = SensorReading
        fields = [
            'id',
            'device_id',
            'distance_cm',
            'water_level_cm',
            'water_percentage',
            'status',
            'tank_status',
            'buzzer_status',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_device_id(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Device ID cannot be blank.")
        return value.strip()

    def validate_distance_cm(self, value):
        if value < 0:
            raise serializers.ValidationError("Measured distance cannot be negative.")
        if value > 500:
            raise serializers.ValidationError("Distance exceeds realistic sensor limits (max 500 cm).")
        return round(value, 2)

    def validate_water_level_cm(self, value):
        if value < 0:
            raise serializers.ValidationError("Calculated water level cannot be negative.")
        return round(value, 2)

    def validate_water_percentage(self, value):
        if value < 0.0 or value > 100.0:
            raise serializers.ValidationError("Water percentage must be strictly between 0.0 and 100.0%.")
        return round(value, 2)

    def validate_status(self, value):
        valid_statuses = [choice[0] for choice in SensorReading.STATUS_CHOICES]
        upper_val = value.upper().strip()
        if upper_val not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Must be one of: {', '.join(valid_statuses)}."
            )
        return upper_val

    def validate(self, attrs):
        # Auto-compute or align buzzer_status if not explicitly provided
        if 'buzzer_status' not in attrs:
            pct = attrs.get('water_percentage', 0.0)
            attrs['buzzer_status'] = bool(pct >= 90.0)
        return attrs


class DeviceHeartbeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceHeartbeat
        fields = ['device_id', 'last_seen', 'ip_address', 'wifi_rssi']
        read_only_fields = ['last_seen']


class DeviceStatusSerializer(serializers.Serializer):
    device_id = serializers.CharField()
    status = serializers.ChoiceField(choices=['ONLINE', 'OFFLINE', 'UNKNOWN'])
    last_seen = serializers.DateTimeField(allow_null=True)
    seconds_since_last_reading = serializers.IntegerField(allow_null=True)
    heartbeat_threshold_seconds = serializers.IntegerField(default=15)
    latest_reading = SensorReadingSerializer(allow_null=True)
