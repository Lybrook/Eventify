# Eventify

Eventify is an event discovery and ticketing platform for Kenya. The repository now contains a Next.js App Router frontend and a Django REST Framework API backed by Supabase PostgreSQL and Supabase Storage. The frontend is intended for Vercel, while the API can be deployed to Render through the included backend Blueprint.

## Start here

For the complete local setup and production deployment sequence, read [`Eventify_setup_and_deployment_tutorial.md`](./Eventify_setup_and_deployment_tutorial.md). It covers Supabase, Django, Render, Vercel, environment variables, M-Pesa sandbox testing, and post-deployment verification.

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Web application | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS | `eventify-frontend/` |
| API | Django 6.1, Django REST Framework, SimpleJWT | `eventify-backend/` |
| Database | Supabase PostgreSQL through `DATABASE_URL` | Supabase project |
| File storage | Supabase Storage bucket `event-images` | `supabase/storage.sql` |
| Payments | Safaricom Daraja sandbox STK Push | Django API |
| Frontend hosting | Vercel | Configure project root as `eventify-frontend` |
| API hosting | Render | `render.yaml` |

Django is the source of truth for users, passwords, roles, tickets, and payments. Supabase is used as infrastructure for PostgreSQL and object storage; Supabase Auth is not used.

## Local setup

### Backend

```bash
cd eventify-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo --admin-email admin@example.com --admin-password 'choose-a-development-password'
python manage.py runserver
```

The API is available at `http://localhost:8000/api/v1/`. The health endpoint is `GET /api/v1/health/`.

### Frontend

```bash
cd eventify-frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend is available at `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` to the Django API base, for example `http://localhost:8000/api/v1` locally or the Render API URL in Vercel.

## Supabase setup

1. Create or select the Supabase project associated with `https://igyoafdermvrjxsciqoa.supabase.co`.
2. Set the Supabase PostgreSQL connection string as `DATABASE_URL`. The supplied direct connection format is accepted; a Supabase pooler connection is often preferable for hosted application traffic.
3. Run `supabase/storage.sql` once in the Supabase SQL editor. It creates the public `event-images` bucket and a public-read policy.
4. Store `SUPABASE_SERVICE_ROLE_KEY` only in the Django/Render environment. Never expose it through a `NEXT_PUBLIC_*` variable or commit it to Git.
5. Run Django migrations against the configured database.

Event image bytes are uploaded by Django to Supabase Storage. The PostgreSQL event record stores only the image reference and public URL metadata.

## Authentication

The API uses SimpleJWT:

- `POST /api/v1/auth/signup/` creates a regular user. The requested role is not accepted from the client.
- `POST /api/v1/auth/token/` returns `access` and `refresh` tokens.
- `POST /api/v1/auth/token/refresh/` refreshes the access token.
- `GET/PATCH/DELETE /api/v1/auth/me/` reads, updates, or securely deletes the current user.
- `POST /api/v1/auth/change-password/` changes the current password after verifying the old password.

The Next.js client stores JWTs in browser storage and retries a request once after refreshing an expired access token. For higher-security deployments, the token transport can later be moved to an HTTP-only BFF session.

## Events, tickets, and payments

Public visitors can list and retrieve events. Administrators can create, update, delete, and upload event images. Authenticated users can book tickets and view or cancel tickets that are not paid. Ticket booking decrements inventory under a database row lock.

The payment flow is deliberately ticket-specific:

1. The frontend books a ticket and receives its database ID.
2. The frontend requests `POST /api/v1/payments/mpesa/stk-push/` with that ticket ID and phone number.
3. Django creates or reuses a `Payment` row, calls Daraja, and stores merchant/check-out identifiers.
4. Safaricom calls `POST /api/v1/payments/mpesa/callback/`.
5. Django matches the callback to the stored payment, updates the payment status, marks the ticket paid on success, and restores inventory on failure.

The callback is idempotent for completed payments and never relies on an arbitrary callback metadata array position to identify a ticket.

## Render deployment

The root `render.yaml` defines one backend web service named `eventify-api` in the Frankfurt region. It installs `eventify-backend/requirements.txt`, collects static files, applies migrations, starts Gunicorn, and checks `/api/v1/health/`.

Create the Blueprint from the repository and provide the `sync: false` values in Render’s environment dashboard. At minimum, configure `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ALLOWED_ORIGINS`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, and any desired Render hostname overrides. The Blueprint keeps Daraja in sandbox mode initially.

## Vercel deployment

Create a Vercel project with the repository root set to `eventify-frontend`. Vercel will detect Next.js automatically. Set:

```text
NEXT_PUBLIC_API_URL=https://eventify-api.onrender.com/api/v1
```

After the Vercel domain is known, add it to the Django `CORS_ALLOWED_ORIGINS` environment variable on Render. The frontend includes `vercel.json` as a minimal configuration reference.

## Validation

Backend checks:

```bash
cd eventify-backend
python manage.py check
python manage.py test events.tests
```

Frontend checks:

```bash
cd eventify-frontend
npm run typecheck
npm run build
```

The repository includes an API test suite for role boundaries, signup hardening, event access, ticket inventory, payment callback transitions, and support-ticket persistence.
