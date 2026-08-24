# Eventify API

This directory contains the Django REST Framework API for Eventify. Django owns user authentication, roles, events, tickets, payments, and support requests. Supabase provides PostgreSQL and Storage.

## Commands

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo --admin-email admin@example.com --admin-password 'choose-a-password'
python manage.py runserver
```

Production uses:

```bash
python manage.py collectstatic --noinput
gunicorn eventify_api.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

## API base

The versioned API base is `/api/v1/`.

| Resource | Endpoints |
|---|---|
| Health | `GET /health/` |
| Auth | `POST /auth/signup/`, `POST /auth/token/`, `POST /auth/token/refresh/` |
| Current account | `GET/PATCH/DELETE /auth/me/`, `POST /auth/change-password/` |
| Events | `GET /events/`, `GET /events/<id>/`, admin `POST/PATCH/DELETE` |
| Tickets | authenticated `GET/POST /tickets/`, authenticated `DELETE /tickets/<id>/` |
| Payments | authenticated `GET /payments/`, `POST /payments/mpesa/stk-push/` |
| M-Pesa callback | `POST /payments/mpesa/callback/` |
| Users | admin-only `/users/` resource |
| Support | public create at `/support-tickets/`, admin management thereafter |

## Security notes

Passwords are hashed through Django’s password hasher. Signup always creates a regular user; administrator promotion is an operational action performed through the Django admin, the seed command, or a controlled database migration. The Supabase service-role key is server-only and must never be placed in frontend environment variables.

Ticket inventory is decremented inside a transaction with a row lock. A payment record stores the transaction UUID and Daraja request identifiers. Callback handling matches those identifiers, updates the payment and ticket atomically, and restores inventory exactly once if a payment fails.
