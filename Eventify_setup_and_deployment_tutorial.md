# Eventify Setup and Deployment Tutorial

**Repository:** [Lybrook/Eventify](https://github.com/Lybrook/Eventify)
**Latest migration commit:** `558bb83`
**Frontend:** Next.js 16.3.2, App Router, TypeScript, Tailwind CSS
**Backend:** Django 6.1, Django REST Framework 3.18, SimpleJWT
**Infrastructure:** Supabase PostgreSQL and Storage, Django API on Render, Next.js frontend on Vercel

This guide starts after cloning the repository and takes you through local development first, then production deployment. Django is the source of truth for users, roles, passwords, events, tickets, support requests, and payments. Supabase supplies PostgreSQL and Storage; Supabase Auth is not used. The frontend must never receive the Supabase service-role key.

> **Important:** The connection string you provided contains `[YOUR-PASSWORD]`. Replace that placeholder with the real database password before using it. If the password contains characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode those characters first.

## 1. Prerequisites

Install Git, Node.js 22 or newer, npm, Python 3.12, and a PostgreSQL-capable Supabase project. You will also need accounts for [Supabase](https://supabase.com/), [Render](https://render.com/), and [Vercel](https://vercel.com/). M-Pesa checkout requires a [Safaricom Daraja](https://developer.safaricom.co.ke/) application; the repository is configured for the Daraja sandbox initially.

| Tool or service | Why it is needed |
|---|---|
| Git | Clone and update the repository. |
| Node.js and npm | Install and run the Next.js frontend. |
| Python 3.12 | Run Django locally and match the backend Dockerfile. |
| Supabase | Host PostgreSQL and the `event-images` Storage bucket. |
| Render | Host the Django API using the committed Blueprint. |
| Vercel | Host the Next.js frontend. |
| Daraja sandbox | Test M-Pesa STK Push and callbacks. |

## 2. Clone the repository

Clone the repository and enter the project directory:

```bash
git clone https://github.com/Lybrook/Eventify.git
cd Eventify
git checkout main
git pull origin main
```

The repository is a two-application layout:

```text
Eventify/
├── eventify-backend/       # Django REST API
├── eventify-frontend/      # Next.js web application
├── supabase/storage.sql    # Supabase Storage bucket setup
└── render.yaml             # Render Blueprint for Django
```

## 3. Configure Supabase before running Django

Open the Supabase project connected to `https://igyoafdermvrjxsciqoa.supabase.co`. Supabase exposes connection strings from the project dashboard through the **Connect** action. The direct connection format is:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.igyoafdermvrjxsciqoa.supabase.co:5432/postgres
```

For local development, the direct connection is usually sufficient if your network can reach the database. For Render, use the Supabase connection option appropriate for your network. Supabase documents direct connections for native Postgres commands and migrations, and Supavisor session mode for persistent application traffic on IPv4-only networks.[1]

Next, open the Supabase SQL editor and run the repository file `supabase/storage.sql`. It creates a public `event-images` bucket and a policy allowing public reads. Django uploads images with the server-only Supabase service-role key; visitors retrieve only the public image URL. Supabase Storage access is controlled by policies, so do not skip this step.[2]

The SQL file is safe to run once. If the bucket already exists, its `public` setting is updated rather than creating a duplicate. Do not put the service-role key in a frontend `.env.local` file or in any variable beginning with `NEXT_PUBLIC_`.

## 4. Run the Django backend locally

Open a terminal in the repository root and create a Python virtual environment:

```bash
cd eventify-backend
python3 -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell, use:

```powershell
cd eventify-backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies and create the local environment file:

```bash
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` through File Explorer or use:

```powershell
Copy-Item .env.example .env
```

### 4.1 Local backend variables

Edit `eventify-backend/.env`. The following values are required or recommended for the local API:

| Variable | Local value or action |
|---|---|
| `DJANGO_SECRET_KEY` | Replace with a long random value. Never use the example value outside a disposable local environment. |
| `DJANGO_DEBUG` | Set to `true` locally. |
| `DJANGO_ALLOWED_HOSTS` | Use `localhost,127.0.0.1`. |
| `DJANGO_TIME_ZONE` | Keep `Africa/Nairobi` unless your operating timezone differs. |
| `DATABASE_URL` | Replace `[YOUR-PASSWORD]` in the supplied Supabase PostgreSQL URL with the real password. |
| `SUPABASE_URL` | Keep `https://igyoafdermvrjxsciqoa.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Add the server-only Supabase service-role key if you want image uploads to work locally. |
| `SUPABASE_STORAGE_BUCKET` | Keep `event-images`, matching `supabase/storage.sql`. |
| `CORS_ALLOWED_ORIGINS` | Set to `http://localhost:3000`. |
| `CSRF_TRUSTED_ORIGINS` | Leave empty for the current JWT-only API, or set `http://localhost:3000` if you later add cookie-based admin flows. |
| `SECURE_SSL_REDIRECT` | Set to `false` locally. |
| `MPESA_ENVIRONMENT` | Keep `sandbox`. |
| `MPESA_CONSUMER_KEY` | Add the Daraja sandbox consumer key, or leave blank until payment testing. |
| `MPESA_CONSUMER_SECRET` | Add the Daraja sandbox consumer secret, or leave blank until payment testing. |
| `MPESA_SHORTCODE` | Keep `174379` for the Daraja sandbox unless your sandbox account specifies another value. |
| `MPESA_PASSKEY` | Add the Daraja sandbox passkey, or leave blank until payment testing. |
| `MPESA_CALLBACK_URL` | Set this to a public HTTPS callback URL when testing M-Pesa; `localhost` will not work for Safaricom callbacks. |
| `MPESA_ACCOUNT_REFERENCE` | Keep `Eventify` or choose a short account reference. |
| `MPESA_TRANSACTION_DESCRIPTION` | Keep the example description or customize it. |
| `JWT_ACCESS_MINUTES` | Keep `30` unless you need a different access-token lifetime. |
| `JWT_REFRESH_DAYS` | Keep `7` unless you need a different refresh-token lifetime. |

A minimal local file for browsing, authentication, events, tickets, and support can look like this. Payment variables can remain blank until Daraja is configured:

```dotenv
DJANGO_SECRET_KEY=replace-with-a-long-random-local-secret
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_TIME_ZONE=Africa/Nairobi

DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.igyoafdermvrjxsciqoa.supabase.co:5432/postgres
SUPABASE_URL=https://igyoafdermvrjxsciqoa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-your-server-only-key
SUPABASE_STORAGE_BUCKET=event-images

CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=
SECURE_SSL_REDIRECT=false

MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=174379
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_ACCOUNT_REFERENCE=Eventify
MPESA_TRANSACTION_DESCRIPTION=Eventify ticket payment
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
```

### 4.2 Apply migrations and seed development data

Run the Django checks and database migrations:

```bash
python manage.py check
python manage.py migrate
```

The repository includes an idempotent seed command. It creates six Nairobi-focused demo events, the development administrator `admin@example.com`, and the regular user `user@example.com`. Always provide development passwords explicitly rather than relying on the command’s placeholders:

```bash
python manage.py seed_demo \
  --admin-email admin@example.com \
  --admin-password 'choose-a-local-admin-password' \
  --user-email user@example.com \
  --user-password 'choose-a-local-user-password'
```

The seed command hashes both passwords through Django. It can be run again to update the demo account passwords and refresh event records. It does not delete production data.

### 4.3 Start and verify Django

Start the development API:

```bash
python manage.py runserver 127.0.0.1:8000
```

In another terminal, verify the health endpoint:

```bash
curl http://127.0.0.1:8000/api/v1/health/
```

You should receive:

```json
{"status":"ok","service":"eventify-api"}
```

The main API base is `http://127.0.0.1:8000/api/v1/`. Public event requests use `GET /api/v1/events/`; authentication uses `/api/v1/auth/`; tickets use `/api/v1/tickets/`; payments use `/api/v1/payments/`.

## 5. Run the Next.js frontend locally

Keep the Django terminal running and open a second terminal from the repository root:

```bash
cd eventify-frontend
npm install
cp .env.example .env.local
```

Edit `eventify-frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Only public frontend configuration belongs in this file. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DJANGO_SECRET_KEY`, or Daraja secrets to the frontend environment.

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The primary routes are `/`, `/events`, `/signin`, `/tickets`, `/profile`, `/admin/events`, `/about`, and `/support`.

### 5.1 Local smoke test

Use the following sequence to verify the application:

| Step | Action | Expected result |
|---:|---|---|
| 1 | Open `/events` | The six seeded events load from Django. |
| 2 | Open `/signin` and create a new account | The account is created as a regular user. |
| 3 | Sign in as the seeded regular user | The user is routed to the event discovery page. |
| 4 | Add an event to the plan | The checkout drawer shows the selected event and total. |
| 5 | If M-Pesa is not configured, stop before payment | Ticket browsing and support still work. |
| 6 | Open `/tickets` after booking | Ticket status and payment status are loaded from Django. |
| 7 | Sign in as `admin@example.com` | The navigation exposes Manage events. |
| 8 | Open `/admin/events` | Admin event CRUD and image upload are available. |
| 9 | Submit `/support` | A support request is persisted in Django. |

### 5.2 Local M-Pesa testing

Safaricom cannot call `localhost` directly. To test the full STK Push callback locally, expose the Django port through an HTTPS tunnel such as ngrok or Cloudflare Tunnel. For example, after installing and authenticating ngrok, run:

```bash
ngrok http 8000
```

Set `MPESA_CALLBACK_URL` to the generated HTTPS URL plus the callback path:

```dotenv
MPESA_CALLBACK_URL=https://your-public-tunnel.example/api/v1/payments/mpesa/callback/
```

Restart Django after changing `.env`. The full payment sequence is ticket-specific: Django creates a ticket, creates a `Payment` row, stores the Daraja request identifiers, and only marks the ticket paid when the callback matches the stored payment. If the callback reports failure, the payment is marked failed and ticket inventory is restored exactly once.

Do not use a real customer phone number or production Daraja credentials in local sandbox testing.

## 6. Production preparation in Supabase

Before deploying, repeat the Storage setup in the production Supabase project if necessary by running `supabase/storage.sql`. Confirm that the `event-images` bucket exists and that public image reads work. Keep the service-role key private and use the Supabase dashboard’s Connect dialog to retrieve the database connection string.[1][2]

For Render, choose a connection method compatible with the Render network. Supabase documents direct, Supavisor session, and Supavisor transaction connection modes. Django migrations and a persistent Render web service generally fit a direct or session-style connection, while serverless clients are more likely to use transaction pooling.[1]

Confirm that database backups and the project’s access policies are appropriate before using real user or payment data. The Render service should be the only application that receives the Supabase service-role key.

## 7. Deploy the Django API to Render

The repository contains a backend-only Render Blueprint at the root: `render.yaml`. It defines the `eventify-api` web service in the Frankfurt region, installs `eventify-backend/requirements.txt`, collects static files, applies migrations, starts Gunicorn, and checks `/api/v1/health/`. Render Blueprints are YAML infrastructure definitions, and non-Docker services require build and start commands; environment variables can be hardcoded, generated, or prompted as secrets.[3]

### 7.1 Create the Render Blueprint

1. Sign in to Render and choose **New → Blueprint**.
2. Connect GitHub and select `Lybrook/Eventify`.
3. Select the `main` branch.
4. Confirm that Render detects the root `render.yaml`.
5. Review the proposed `eventify-api` service.
6. Create/apply the Blueprint.

The Blueprint’s `sync: false` variables will require values in Render’s environment dashboard. Do not commit them to YAML or Git. Render’s environment-variable guidance recommends managing secrets in the service environment rather than source control.[4]

### 7.2 Render backend variables

Set or confirm these values in the `eventify-api` service. Replace every placeholder with a real value:

| Variable | Production setting |
|---|---|
| `DJANGO_SECRET_KEY` | Use the generated value created by the Blueprint, or replace it with a long random secret. |
| `DJANGO_DEBUG` | `false`. |
| `DJANGO_ALLOWED_HOSTS` | `eventify-api.onrender.com` plus any custom API domain, comma separated. |
| `DATABASE_URL` | Your Supabase PostgreSQL connection string with the real password. |
| `SUPABASE_URL` | `https://igyoafdermvrjxsciqoa.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only service-role key. |
| `SUPABASE_STORAGE_BUCKET` | `event-images`. |
| `CORS_ALLOWED_ORIGINS` | Your exact Vercel production origin, for example `https://eventify-web.vercel.app`; add localhost only if intentionally needed. |
| `CSRF_TRUSTED_ORIGINS` | Your HTTPS frontend/API origins if you later use cookie-based Django admin forms. |
| `SECURE_SSL_REDIRECT` | `true`. |
| `MPESA_ENVIRONMENT` | `sandbox` initially. |
| `MPESA_CONSUMER_KEY` | Daraja sandbox consumer key. |
| `MPESA_CONSUMER_SECRET` | Daraja sandbox consumer secret. |
| `MPESA_SHORTCODE` | `174379` for the Daraja sandbox setup, unless your account requires another value. |
| `MPESA_PASSKEY` | Daraja sandbox passkey. |
| `MPESA_CALLBACK_URL` | `https://eventify-api.onrender.com/api/v1/payments/mpesa/callback/`, or your custom API domain equivalent. |
| `MPESA_ACCOUNT_REFERENCE` | `Eventify`. |
| `MPESA_TRANSACTION_DESCRIPTION` | `Eventify ticket payment`. |
| `JWT_ACCESS_MINUTES` | `30`. |
| `JWT_REFRESH_DAYS` | `7`. |

After the first deployment, open:

```text
https://eventify-api.onrender.com/api/v1/health/
```

A successful response confirms that Render can start Django. If Render reports a database connection error, verify the Supabase password, URL-encode special characters, and consider switching from the direct connection to the appropriate Supavisor session connection.

### 7.3 Seed the production administrator safely

Do not put the administrator password in `render.yaml`. Once the service is running, open the Render service Shell or run an authenticated one-off command:

```bash
cd eventify-backend
python manage.py seed_demo \
  --admin-email admin@example.com \
  --admin-password 'use-a-unique-production-password'
```

If you do not want the regular demo account or demo events in production, create only the administrator through Django’s `createsuperuser` command and create real events from the admin interface. The `seed_demo` command is primarily intended for development and initial demonstrations.

## 8. Deploy the Next.js frontend to Vercel

Vercel supports importing an existing Next.js repository from a Git provider and configuring project environment variables in the dashboard.[5]

1. Sign in to Vercel and choose **Add New → Project**.
2. Import `Lybrook/Eventify` from GitHub.
3. Set **Root Directory** to `eventify-frontend`.
4. Confirm the framework is **Next.js**.
5. Keep the build command as `npm run build`.
6. Keep the install command as `npm install`.
7. Add the production environment variable:

```dotenv
NEXT_PUBLIC_API_URL=https://eventify-api.onrender.com/api/v1
```

8. Deploy the project.
9. Copy the final Vercel production domain, for example `https://eventify-web.vercel.app`.
10. Return to Render and set `CORS_ALLOWED_ORIGINS` to that exact origin without a trailing slash.
11. Redeploy the Django service after changing CORS.

The repository includes `eventify-frontend/vercel.json`, but Vercel can also deploy the project through its normal Next.js detection. Do not add Django, Supabase, or Daraja secrets to Vercel; the Next.js client only needs the public Django API URL.

## 9. Production M-Pesa checklist

Keep `MPESA_ENVIRONMENT=sandbox` while validating the production wiring. Confirm all of the following before testing:

| Check | Requirement |
|---|---|
| Callback URL | Public HTTPS URL pointing to `/api/v1/payments/mpesa/callback/`. |
| Render reachability | The callback URL returns through the Render service without authentication. |
| CORS | CORS affects browsers; Daraja callbacks are server-to-server and require the URL to be reachable, not a browser CORS rule. |
| Credentials | Daraja consumer key, consumer secret, shortcode, and passkey are stored only in Render. |
| Database | Payment and ticket tables exist after Django migrations. |
| Matching | The callback includes request identifiers that match the stored `Payment` record. |
| Idempotency | Replayed successful callbacks do not duplicate payment state or release inventory. |

Only after the sandbox flow has been validated should you switch to Daraja production credentials and the production Daraja host. Treat that change as a separate release and test the callback again with a controlled transaction.

## 10. Production verification checklist

Django’s deployment checklist recommends checking deployment settings, avoiding `runserver`, protecting the secret key, disabling debug, configuring allowed hosts, collecting static files, protecting HTTPS cookies, and keeping database credentials confidential.[6]

Run these checks after deployment:

```bash
# From eventify-backend with production-like environment variables
python manage.py check --deploy
```

Then verify the application in the browser:

1. Open the Vercel URL and confirm the landing page renders.
2. Open `/events` and confirm Django event records load.
3. Create a normal account and confirm login redirects to event discovery.
4. Confirm an attempted administrator role in signup still creates a regular user.
5. Sign in as `admin@example.com` and confirm `/admin/events` is available.
6. Create an event and upload an image; confirm the image appears from Supabase Storage.
7. Book a test event and confirm the ticket is created with a durable ID.
8. Start an M-Pesa sandbox prompt and confirm a `Payment` record is created.
9. Send or wait for the Daraja callback and confirm the ticket moves to `paid` only after a successful matching callback.
10. Submit a support request and confirm it appears in Django admin.
11. Try the same flow from a non-Vercel origin only if you intentionally allow that origin.

## 11. Common problems and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `DisallowedHost` | The API hostname is missing from `DJANGO_ALLOWED_HOSTS`. | Add the exact Render/custom API hostname and redeploy. |
| Browser CORS error | The Vercel origin is missing or has a trailing slash in `CORS_ALLOWED_ORIGINS`. | Use the exact origin such as `https://example.vercel.app`, separated by commas. |
| Django cannot connect to Supabase | Incorrect password, unencoded password characters, or incompatible connection mode. | Retrieve the string again from Supabase Connect, URL-encode the password, and try the appropriate pooler mode. |
| Event images fail to upload | The bucket does not exist or `SUPABASE_SERVICE_ROLE_KEY` is missing/incorrect. | Run `supabase/storage.sql` and set the key only on Django/Render. |
| Images upload but do not display | The bucket is private or the returned URL is not publicly readable. | Confirm the bucket is public and the read policy exists. |
| M-Pesa returns payment-initiation failure | Daraja secrets or callback URL are absent/incorrect. | Check all `MPESA_*` variables and ensure the callback is public HTTPS. |
| Callback is never received locally | Safaricom cannot reach localhost. | Use an HTTPS tunnel or test against the deployed Render callback. |
| Vercel displays events as empty | `NEXT_PUBLIC_API_URL` is missing, points to localhost, or lacks `/api/v1`. | Set the production API base and redeploy Vercel. |
| Render service starts but admin login fails | Administrator was not seeded or the password is wrong. | Run `seed_demo` or `createsuperuser` from Render Shell with a new password. |
| Static files warning | `collectstatic` has not run. | Confirm the Render build command includes `python eventify-backend/manage.py collectstatic --noinput`. |
| A paid ticket cannot be deleted | This is intentional in the migrated API to preserve payment history. | Keep paid tickets and use payment/ticket status for historical integrity. |

## 12. Recommended secret-handling rules

Never commit `.env`, `.env.local`, database passwords, Supabase service-role keys, Daraja credentials, or production administrator passwords. The repository contains `.env.example` templates only. Use local untracked environment files for development and Render/Vercel environment dashboards for deployment. Rotate any credential that has accidentally appeared in a terminal transcript, commit, issue, or chat.

Use exact origins for CORS rather than `*`. Keep Django `DEBUG=false` in Render. Use HTTPS for both Vercel and Render. Use a production WSGI server such as Gunicorn rather than `python manage.py runserver`. Keep Supabase backups and operational access restricted to the people who need them.

## References

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase: Connect to your database"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[3]: https://render.com/docs/blueprint-spec "Render: Blueprint YAML reference"
[4]: https://render.com/docs/configure-environment-variables "Render: Environment variables and secrets"
[5]: https://vercel.com/docs/frameworks/full-stack/nextjs "Vercel: Next.js on Vercel"
[6]: https://docs.djangoproject.com/en/6.1/howto/deployment/checklist/ "Django 6.1: Deployment checklist"
