# syntax=docker/dockerfile:1
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
# Optional combined CA for managed proxies; never disable TLS validation.
RUN --mount=type=secret,id=proxy_ca,target=/run/proxy-ca.pem \
    if [ -f /run/proxy-ca.pem ]; then PIP_CERT=/run/proxy-ca.pem pip install --no-cache-dir -r requirements.txt; \
    else pip install --no-cache-dir -r requirements.txt; fi
COPY . .
RUN DEBUG=1 python manage.py collectstatic --noinput \
    && useradd --system --uid 10001 --no-create-home app \
    && mkdir -p /app/media /app/private-media \
    && chown app /app/media /app/private-media \
    && chmod 700 /app/private-media
ENV DEBUG=0
USER 10001
EXPOSE 8000
# Migrate and secure_documents are deployment steps, not concurrent worker startup tasks.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "30", "--access-logfile", "-", "--access-logformat", "%(h)s %(m)s %(U)s %(s)s %(L)s"]
