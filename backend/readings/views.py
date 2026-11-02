from django.utils import timezone
from django.conf import settings
from django.db.models import Min, Max, Avg, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import timedelta

from .models import SensorReading, DeviceHeartbeat
from .serializers import SensorReadingSerializer, DeviceStatusSerializer, DeviceHeartbeatSerializer

# Device is considered OFFLINE if no packet received within 25 seconds (ESP32 interval is 5s)
OFFLINE_HEARTBEAT_THRESHOLD_SECONDS = 25

class SensorReadingListCreateView(APIView):
    """
    POST /api/readings/
    Receives and validates ESP32 sensor readings.
    """
    def post(self, request):
        serializer = SensorReadingSerializer(data=request.data)
        if serializer.is_valid():
            reading = serializer.save()
            
            # Immediately update the device's last_seen heartbeat timestamp
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
            DeviceHeartbeat.objects.update_or_create(
                device_id=reading.device_id,
                defaults={
                    'ip_address': client_ip.split(',')[0].strip() if client_ip else None,
                    'last_seen': timezone.now()
                }
            )

            return Response(
                {
                    "message": "Sensor reading recorded successfully.",
                    "data": SensorReadingSerializer(reading).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(
            {
                "error": "Validation failed for sensor reading.",
                "details": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    def get(self, request):
        """
        Optional listing of all readings with pagination limit.
        """
        limit = min(int(request.query_params.get('limit', 50)), 500)
        readings = SensorReading.objects.all()[:limit]
        serializer = SensorReadingSerializer(readings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LatestReadingView(APIView):
    """
    GET /api/readings/latest/
    Returns the most recent verified sensor reading.
    """
    def get(self, request):
        device_id = request.query_params.get('device_id')
        query = SensorReading.objects.all()
        if device_id:
            query = query.filter(device_id=device_id)

        latest = query.first()
        if not latest:
            return Response(
                {
                    "message": "No sensor readings recorded yet.",
                    "data": None
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SensorReadingSerializer(latest)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HistoricalReadingsView(APIView):
    """
    GET /api/readings/history/
    Returns chronological historical sensor readings and statistical analytics.
    Query parameters:
      - limit: Maximum number of records (default 50, max 1000)
      - hours: Filter to the last N hours
      - device_id: Filter by device identifier
    """
    def get(self, request):
        device_id = request.query_params.get('device_id')
        hours_param = request.query_params.get('hours')
        limit = min(int(request.query_params.get('limit', 100)), 1000)

        query = SensorReading.objects.all()

        if device_id:
            query = query.filter(device_id=device_id)

        if hours_param:
            try:
                hours = float(hours_param)
                cutoff = timezone.now() - timedelta(hours=hours)
                query = query.filter(created_at__gte=cutoff)
            except ValueError:
                pass

        # Calculate summary statistics across the matched range
        stats = query.aggregate(
            min_level=Min('water_level_cm'),
            max_level=Max('water_level_cm'),
            avg_level=Avg('water_level_cm'),
            min_percentage=Min('water_percentage'),
            max_percentage=Max('water_percentage'),
            avg_percentage=Avg('water_percentage'),
            min_distance=Min('distance_cm'),
            max_distance=Max('distance_cm'),
            total_readings=Count('id')
        )

        # Slice latest readings and return in chronological order for graphs
        records = list(query[:limit])
        records.reverse() # chronological order (oldest to newest)
        serializer = SensorReadingSerializer(records, many=True)

        return Response(
            {
                "count": len(records),
                "statistics": {
                    "min_water_level_cm": round(stats['min_level'], 1) if stats['min_level'] is not None else None,
                    "max_water_level_cm": round(stats['max_level'], 1) if stats['max_level'] is not None else None,
                    "avg_water_level_cm": round(stats['avg_level'], 1) if stats['avg_level'] is not None else None,
                    "min_percentage": round(stats['min_percentage'], 1) if stats['min_percentage'] is not None else None,
                    "max_percentage": round(stats['max_percentage'], 1) if stats['max_percentage'] is not None else None,
                    "avg_percentage": round(stats['avg_percentage'], 1) if stats['avg_percentage'] is not None else None,
                    "min_distance_cm": round(stats['min_distance'], 1) if stats['min_distance'] is not None else None,
                    "max_distance_cm": round(stats['max_distance'], 1) if stats['max_distance'] is not None else None,
                    "total_count": stats['total_readings']
                },
                "readings": serializer.data
            },
            status=status.HTTP_200_OK
        )


class DeviceHeartbeatView(APIView):
    """
    POST /api/device/heartbeat/
    Allows the ESP32 to maintain real-time connectivity status even when sensor
    measurements are stationary. Updates the last_seen timestamp in PostgreSQL.
    """
    def post(self, request):
        device_id = request.data.get('device_id', 'ESP32_WATER_001')
        if not device_id or not device_id.strip():
            return Response(
                {"error": "device_id is required for heartbeat."},
                status=status.HTTP_400_BAD_REQUEST
            )

        client_ip = request.data.get('ip_address') or request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if client_ip and ',' in client_ip:
            client_ip = client_ip.split(',')[0].strip()

        wifi_rssi = request.data.get('wifi_rssi')

        heartbeat, created = DeviceHeartbeat.objects.update_or_create(
            device_id=device_id.strip(),
            defaults={
                'ip_address': client_ip,
                'wifi_rssi': wifi_rssi,
                'last_seen': timezone.now()
            }
        )

        threshold = getattr(settings, 'HEARTBEAT_TIMEOUT_SECONDS', 15)

        return Response(
            {
                "status": "success",
                "message": "Heartbeat recorded successfully.",
                "device_id": device_id.strip(),
                "last_seen": heartbeat.last_seen.isoformat(),
                "threshold_seconds": threshold
            },
            status=status.HTTP_200_OK
        )


class DeviceStatusView(APIView):
    """
    GET /api/device/status/
    Evaluates genuine real-time ESP32 connectivity based on the most recent
    successful communication (telemetry reading or heartbeat ping).
    Threshold: Configurable via settings.HEARTBEAT_TIMEOUT_SECONDS (Default: 15s).
    """
    def get(self, request):
        device_id = request.query_params.get('device_id', 'ESP32_WATER_001')
        threshold_seconds = int(request.query_params.get(
            'threshold',
            getattr(settings, 'HEARTBEAT_TIMEOUT_SECONDS', 15)
        ))

        latest_reading = SensorReading.objects.filter(device_id=device_id).first()
        heartbeat = DeviceHeartbeat.objects.filter(device_id=device_id).first()

        timestamps = []
        if latest_reading and latest_reading.created_at:
            timestamps.append(latest_reading.created_at)
        if heartbeat and heartbeat.last_seen:
            timestamps.append(heartbeat.last_seen)

        if not timestamps:
            return Response(
                {
                    "device_id": device_id,
                    "status": "OFFLINE",
                    "connectivity": "DISCONNECTED",
                    "message": "No readings or heartbeats received from this device yet.",
                    "last_seen": None,
                    "seconds_since_last_reading": None,
                    "heartbeat_threshold_seconds": threshold_seconds,
                    "latest_reading": None
                },
                status=status.HTTP_200_OK
            )

        most_recent_time = max(timestamps)
        now = timezone.now()
        seconds_elapsed = max(0, int((now - most_recent_time).total_seconds()))
        is_online = seconds_elapsed <= threshold_seconds

        return Response(
            {
                "device_id": device_id,
                "status": "ONLINE" if is_online else "OFFLINE",
                "connectivity": "CONNECTED" if is_online else "DISCONNECTED",
                "last_seen": most_recent_time.isoformat(),
                "seconds_since_last_reading": seconds_elapsed,
                "heartbeat_threshold_seconds": threshold_seconds,
                "latest_reading": SensorReadingSerializer(latest_reading).data if latest_reading else None
            },
            status=status.HTTP_200_OK
        )

