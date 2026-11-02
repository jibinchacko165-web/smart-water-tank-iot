from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse, HttpResponse, FileResponse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "water-tank-iot-backend",
        "version": "1.0.0"
    })

def serve_react_dashboard(request):
    """
    Serves the compiled React Single Page Application Dashboard.
    """
    index_file = BASE_DIR / 'frontend_dist' / 'index.html'
    if index_file.exists():
        return HttpResponse(index_file.read_text(encoding='utf-8'), content_type='text/html')
    return HttpResponse("Frontend dashboard build not found. Run npm run build.", status=404)

def serve_frontend_assets(request, path):
    """
    Serves static JS/CSS assets compiled by Vite.
    """
    asset_file = BASE_DIR / 'frontend_dist' / 'assets' / path
    if asset_file.exists():
        content_type = 'application/javascript' if path.endswith('.js') else 'text/css' if path.endswith('.css') else 'application/octet-stream'
        return FileResponse(open(asset_file, 'rb'), content_type=content_type)
    return HttpResponse("Asset not found.", status=404)

urlpatterns = [
    path('', serve_react_dashboard, name='react_dashboard'),
    re_path(r'^assets/(?P<path>.*)$', serve_frontend_assets, name='frontend_assets'),
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/', include('readings.urls')),
]
