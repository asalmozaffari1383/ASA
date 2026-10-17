# ASA Safety Consulting System (سامانه مشاوران ایمنی آسا)

A full-stack platform for managing industrial **fire-safety inspections** end-to-end:
intake (public website **or** Bale messenger bot) → two-stage receipt-based payments →
expert on-site inspection with a parallel **defect-fixing workflow** → CEO verification →
a gated, Persian/RTL **PDF safety certificate**.

The system is built around a strict, test-enforced set of guarantees: real MIME-type
file validation, dynamic Role-Based Access Control, rate-limited public endpoints, an
atomic status state machine with transactional SMS, and N+1-safe data access.

---

## 1. Architecture & Monorepo Layout

Three decoupled components share one repository:

| Component | Stack | Role |
|-----------|-------|------|
| **Backend** | Django 5.2 + DRF, PostgreSQL, S3 (ArvanCloud/MinIO) | Core API, business logic, PDF engine |
| **Frontend** | Vite + React + TypeScript + Tailwind (RTL/Farsi PWA) | Public site + staff dashboards |
| **Bot** | `python-bale-bot` (async) | Bale intake state machine |

```
asa/
├── docker-compose.yml          # db · minio · minio-init · web · bot
├── .env.example                # all environment variables
├── backend/                    # Django + DRF
│   ├── config/                 # settings (base/dev/prod), urls, wsgi/asgi
│   ├── apps/
│   │   ├── common/             # validators, storages, SMS, throttles, permissions
│   │   ├── users/              # custom User + dynamic RBAC
│   │   ├── requests/           # InspectionRequest, intake, tracking, state machine
│   │   ├── financials/         # payments + SystemConfiguration singleton
│   │   ├── inspections/        # reports, photos, defect/certificate services
│   │   └── certificates/       # WeasyPrint HTML→PDF engine
│   ├── tests/                  # 20-test hardening suite
│   ├── Dockerfile              # multi-stage (slim runtime + WeasyPrint libs)
│   └── requirements.txt
├── frontend/                   # Vite + React + TS + Tailwind (RTL)
│   └── src/{api,auth,components,pages,lib,types}
└── bot/                        # python-bale-bot service
    ├── main.py                 # conversation state machine
    ├── api_client.py           # resilient multipart upload
    └── Dockerfile
```

### Request lifecycle (status state machine)

```
bale_photo_uploaded ─▶ pending_payment ─▶ scheduled ─▶ under_review ─▶ completed
        (secretary)        (stage-1 approved)   (report)    (cert issued)
```

All status changes flow through `apps/requests/services.transition_to()` — atomic, row-locked,
and firing transactional SMS on commit (`under_review` → *report ready*, `completed` → *certificate ready*).

---

## 2. Environment Variables

Copy `.env.example` → `.env` and adjust. Docker Compose reads `.env` automatically.

### Django core
| Variable | Dev default | Notes |
|----------|-------------|-------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` | `config.settings.prod` in production |
| `DJANGO_SECRET_KEY` | insecure dev key | **Required** in prod; long & random |
| `DJANGO_DEBUG` | `true` | Must be `false` in prod |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated; required in prod |
| `DATABASE_URL` | `postgres://postgres:postgres@db:5432/asa` | PostgreSQL DSN |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Frontend origin(s) |

### Object storage (S3-compatible)
| Variable | Dev (MinIO) | Prod (ArvanCloud) |
|----------|-------------|-------------------|
| `USE_S3` | `true` | `true` |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | ArvanCloud access key |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | ArvanCloud secret key |
| `AWS_STORAGE_BUCKET_NAME` | `asa-media` | your bucket |
| `AWS_S3_ENDPOINT_URL` | `http://minio:9000` | `https://s3.ir-thr-at1.arvanstorage.ir` |
| `AWS_S3_REGION_NAME` | — | e.g. `ir-thr-at1` |
| `AWS_S3_ADDRESSING_STYLE` | `path` | `path` |

> Set `USE_S3=false` to fall back to local-filesystem media (no object store needed).

### SMS (pluggable)
| Variable | Dev | Prod |
|----------|-----|------|
| `SMS_BACKEND` | `console` | `kavenegar` |
| `KAVENEGAR_API_KEY` | — | your API key |
| `KAVENEGAR_SENDER` | — | your line number |
| `SMS_TEMPLATE_REPORT_READY` | `asa-report-ready` | Kavenegar template name |
| `SMS_TEMPLATE_CERTIFICATE_READY` | `asa-certificate-ready` | Kavenegar template name |

### JWT (optional overrides)
| Variable | Default |
|----------|---------|
| `JWT_ACCESS_MINUTES` | `30` |
| `JWT_REFRESH_DAYS` | `7` |

### Bale bot
| Variable | Notes |
|----------|-------|
| `BALE_BOT_TOKEN` | **Required** to run the bot |
| `BACKEND_API_URL` | `http://web:8000/api` (set by compose) |
| `CEO_CARD_NUMBER` | Bank card shown to users for the stage-1 payment |

### Frontend
| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_API_BASE_URL` | `/api` | Vite dev server proxies `/api` → `:8000` |

---

## 3. Quick Start — Local Development

For the verified macOS setup and package-network troubleshooting, see [RUN-LOCAL.md](RUN-LOCAL.md).

### Prerequisites
Docker + Docker Compose. (Node 20+ only needed to run the frontend dev server.)

### Spin up the backend stack
```bash
cp .env.example .env          # then edit secrets as needed

# Build & start PostgreSQL and Django web. The Bale bot is optional.
docker compose up --build
```
Health-check gating ensures `web` only starts migrating once Postgres is ready.
The `web` service **auto-runs migrations** on start. Local media uses the filesystem;
MinIO is not part of the current Compose stack. To explicitly run the Bale bot, use
`docker compose --profile bot up -d --build bot` with a valid `BALE_BOT_TOKEN`.

Services:
- API → http://localhost:8000  (admin at `/admin/`)
- Public website → http://localhost:5174 (run `npm install` and `npm run dev` in `public-site/`)

### Database & superuser
Migrations run automatically. To create the initial **CEO superuser**:
```bash
docker compose exec web python manage.py createsuperuser
```
> 🛡 **Auto-granting permission matrix:** the custom `UserManager.create_superuser` sets
> `role=ceo` and switches **all four dynamic permissions on** (`can_manage_financial`,
> `can_fill_bale_forms`, `can_do_inspection`, `can_issue_certificate`) — so your first
> account can immediately reach every panel. Grant narrower staff via the CEO user-management
> screen or the Django admin.

### Collect static files (production assets)
Not needed for the dev server, but for a prod-style run:
```bash
docker compose exec web python manage.py collectstatic --noinput
```

### Seed payment amounts
Log into `/admin/` (or the CEO settings screen) and set the **System Configuration**
stage-1 / stage-2 amounts and the CEO card number — the public wizard and bot read these live.

### Run the frontend (Vite dev server)
The SPA runs outside compose for fast HMR:
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api and /media to :8000)
```
Production build: `npm run build` → static `dist/` to serve from any CDN/host.

---

## 4. Running the Automated Test Suite

The full **20-test** hardening suite (file-security, throttling, RBAC, certificate
guardrail, N+1) runs inside the web container:

```bash
docker compose exec web python manage.py test tests
```

Expected: `Ran 20 tests ... OK`. The suite covers spoofed-MIME rejection, the 5/min
tracking throttle (`429`), the permission matrix (`401/403`), certificate gating
(`400` + Persian reasons / `200` + real PDF), and constant query counts.

Frontend type-safety check:
```bash
cd frontend && npm run typecheck      # tsc --noEmit, strict
```

---

## 5. Production Deployment & Fine-Tuning Checklist

Before going live, work through the following.

### ✅ Settings & secrets
- [ ] `DJANGO_SETTINGS_MODULE=config.settings.prod`, `DJANGO_DEBUG=false`.
- [ ] Strong `DJANGO_SECRET_KEY`; real `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
- [ ] TLS terminated upstream (prod settings already trust `X-Forwarded-Proto` and enable HSTS).

### ✅ ArvanCloud object storage
- [ ] Create the production bucket (e.g. `asa-media`) on ArvanCloud Object Storage.
- [ ] Set `USE_S3=true`, `AWS_S3_ENDPOINT_URL=https://s3.ir-thr-at1.arvanstorage.ir`,
      region, and access/secret keys.
- [ ] Keep the bucket **private** — the app serves short-lived signed URLs
      (`MediaS3Storage` uses `default_acl="private"`); do not make it public.

### ✅ Kavenegar SMS
- [ ] Set `SMS_BACKEND=kavenegar` and `KAVENEGAR_API_KEY` (+ `KAVENEGAR_SENDER` for free-text).
- [ ] Register the **exact lookup templates** in the Kavenegar panel — the template names
      must match the env values:
  - `asa-report-ready` → fired when a report is submitted (request enters *under review*).
  - `asa-certificate-ready` → fired when the certificate is issued (*completed*).
- [ ] Each template's single `%token%` placeholder receives the **tracking code**.

### ✅ Certificate PDF fine-tuning
- [ ] Upload each staff member's **transparent `signature_image`** (PNG with alpha) via
      user management.
- [ ] Tune the absolute-CSS coordinates in
      `backend/apps/certificates/templates/certificates/certificate.html` —
      the `.signatures` overlay band and `.sign-slot` / `.seal` positions are set against
      the placeholder; adjust `bottom`/`start`/`left` and image `max-height` so the real
      signatures and **corporate seal** sit cleanly without overlapping dynamic text.
- [ ] Replace the CSS-drawn `.seal` with the official seal image asset if available.
- [ ] The runtime image bundles `fonts-vazirmatn` for pixel-perfect Persian rendering;
      add any additional brand fonts to the Dockerfile if needed.

### ✅ Bale bot
- [ ] Set a real `BALE_BOT_TOKEN` and verify `BACKEND_API_URL` reaches the API.
- [ ] Replace the placeholder `bot/assets/application_form.pdf` with the official blank form.
- [ ] Run a live smoke conversation against the bot before launch (the automated tests
      stub the network).

### ✅ Operations
- [ ] Swap the dev `runserver` command for the image's default **gunicorn** entrypoint.
- [ ] Run `collectstatic` and serve `STATIC_ROOT` (or push to S3/CDN).
- [ ] Back up PostgreSQL and the media bucket; monitor the `asa.sms` / `weasyprint` logs.

---

*Built with Django, React, and python-bale-bot. Core development phase complete.* 🛡
