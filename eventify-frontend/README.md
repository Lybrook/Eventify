# Eventify Web

The Eventify web application is built with Next.js App Router, TypeScript, React, and Tailwind CSS. It is designed for Vercel deployment and communicates with the Django API through `NEXT_PUBLIC_API_URL`.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default local API base is `http://localhost:8000/api/v1`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Editorial landing page and product introduction. |
| `/events` | Search, filter, view, and plan event bookings. |
| `/signin` | Registration and SimpleJWT login. |
| `/tickets` | Authenticated ticket wallet and payment status. |
| `/profile` | Profile, password, and account settings. |
| `/admin/events` | Administrator event CRUD with image upload. |
| `/about` | Product mission and operating principles. |
| `/support` | Contact methods and persisted support requests. |

## Deployment

Create a Vercel project with the project root set to `eventify-frontend`. Set `NEXT_PUBLIC_API_URL` to the deployed Django API base, such as `https://eventify-api.onrender.com/api/v1`. Add the final Vercel domain to the backend’s `CORS_ALLOWED_ORIGINS` environment variable.

Event images are rendered from Supabase Storage URLs returned by Django. The frontend never receives or stores the Supabase service-role key.
