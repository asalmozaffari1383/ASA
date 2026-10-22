# ASA Bale bot service.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BOT_STATE_DIR=/app/state

WORKDIR /app

ARG PIP_INDEX_URL=https://pypi.org/simple
ENV PIP_INDEX_URL=${PIP_INDEX_URL}

COPY bot/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the bot package (kept as a package so `python -m bot.main` works).
COPY bot/ ./bot/

# Run as an unprivileged user.
RUN useradd --create-home --uid 1000 appuser && mkdir -p /app/state && chown -R appuser:appuser /app
USER appuser

CMD ["python", "-m", "bot.main"]
