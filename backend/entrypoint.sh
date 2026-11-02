#!/bin/sh
set -e

echo "[Entrypoint] Checking PostgreSQL database availability at ${DB_HOST:-db}:${DB_PORT:-5432}..."

# Wait for PostgreSQL to accept socket connections
while ! nc -z "${DB_HOST:-db}" "${DB_PORT:-5432}"; do
  echo "[Entrypoint] Waiting for database to become available..."
  sleep 1
done

echo "[Entrypoint] Database is ready! Running migrations..."
python manage.py makemigrations readings --noinput || true
python manage.py migrate --noinput

echo "[Entrypoint] Collecting static assets (including DRF styling)..."
python manage.py collectstatic --noinput || true

echo "[Entrypoint] Starting application process..."
exec "$@"
