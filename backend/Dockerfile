# syntax=docker/dockerfile:1

# --- Stage 1: builder -------------------------------------------------------
# Compiles wheels for all dependencies in an image that carries the build
# toolchain, so the final image stays slim and free of compilers.
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Build deps needed to compile psycopg2 and Pillow wheels.
ARG APT_MIRROR=https://deb.debian.org
RUN sed -i "s|http://deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::Retries=3 -o APT::Update::Error-Mode=any update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

ARG PIP_INDEX_URL=https://pypi.org/simple
ENV PIP_INDEX_URL=${PIP_INDEX_URL}

COPY requirements.txt .
RUN pip wheel --wheel-dir /wheels -r requirements.txt


# --- Stage 2: runtime -------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# Runtime-only shared libraries:
#   libmagic1            -> python-magic MIME sniffing (Part 5 §1)
#   libpq5               -> psycopg2 PostgreSQL driver
#   libjpeg              -> Pillow image handling
#   pango/cairo/gdk-pixbuf + fonts -> WeasyPrint PDF rendering (Part 5 §5)
ARG APT_MIRROR=https://deb.debian.org
RUN sed -i "s|http://deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::Retries=3 -o APT::Update::Error-Mode=any update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
        libmagic1 \
        libpq5 \
        libjpeg62-turbo \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libcairo2 \
        libffi8 \
        fonts-vazirmatn \
    && rm -rf /var/lib/apt/lists/*

# Install pre-built wheels (no compiler in this stage).
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

# Application code.
COPY . .

# Run as an unprivileged user.
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Default production command; docker-compose overrides this for local dev.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
