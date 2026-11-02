FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN DJANGO_DEBUG=true \
    DJANGO_SECRET_KEY=build-only-placeholder-secret-not-used-at-runtime-0000000000000000 \
    python manage.py collectstatic --noinput

EXPOSE 8000
CMD gunicorn eventify_api.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 120
