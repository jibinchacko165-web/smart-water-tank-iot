from django.urls import path
from .views import (
    SensorReadingListCreateView,
    LatestReadingView,
    HistoricalReadingsView,
    DeviceStatusView,
    DeviceHeartbeatView,
)

urlpatterns = [
    path('readings/', SensorReadingListCreateView.as_view(), name='readings_list_create'),
    path('readings/latest/', LatestReadingView.as_view(), name='readings_latest'),
    path('readings/history/', HistoricalReadingsView.as_view(), name='readings_history'),
    path('device/status/', DeviceStatusView.as_view(), name='device_status'),
    path('device/heartbeat/', DeviceHeartbeatView.as_view(), name='device_heartbeat'),
]

