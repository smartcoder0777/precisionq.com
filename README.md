# Roswell's Medical Center (precisionq.com)

A full-stack web application for managing clinic operations, patient-facing content, surveys, billing-related settings, and staff administration. The public site shows a configurable landing experience; authenticated staff use an admin console under `/admin`.

## What this application does

### Public site (`/`)

The home route renders a marketing-style landing page driven by database settings: background image or video, footer text, and animated “word” labels (managed in admin). Visitors can use the contact flow on that page.

### Admin console (`/admin`)

Staff sign in at `/admin/login`, complete security verification when required, and then access role-guarded areas. Typical modules include:

- **Dashboard** — operational overview and contact tracking.
- **Tickets** — support or internal ticket handling.
- **Community services** — categories and service rows for community programs.
- **Patient services** — categories, services, and patient profiles nested under categories.
- **Clinics** and **Insurance** — clinic directory and insurance relationships.
- **Education** — educational content and category settings.
- **Agreements** — agreement records tied to your workflows.
- **Announcements** — site or portal announcements.
- **Surveys** — survey list, per-survey **builder** and **preview**, sending invitations, and **survey settings** (categories, types, questions, expirations, and related configuration).
- **Products & services** and **Payments** — catalog-style product/services data and payment cycle tooling (including pay types and billing cycle categories where configured).
- **Users** and **Profile** — user administration and the signed-in user’s profile.
- **Settings** — general settings, “QP” branding/landing settings, roles and permissions, security questions, and other grouped configuration screens.

REST-style **API routes** live under `/api/*` and back the admin UI and integrations (including some **external** endpoints for contact tracking and insurance reads).

### URL compatibility

Older bookmarks used paths like `/dashboard` or `/login` at the site root. [Middleware](src/middleware.ts) issues a **308 redirect** to the same path under `/admin/...`, so existing links keep working.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 15 (App Router) |
| UI | React 18, [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [shadcn-style](https://ui.shadcn.com/) primitives under `src/components/ui` |
| Forms & validation | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/), [@hookform/resolvers](https://github.com/react-hook-form/resolvers) |
| Data fetching | [@tanstack/react-query](https://tanstack.com/query) |
| Database | [MySQL](https://www.mysql.com/) via [mysql2](https://github.com/sidorares/node-mysql2), schema and queries with [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | Cookie-based sessions (see `src/lib/auth-session.ts`) |
| Email / SMS (surveys) | [Nodemailer](https://nodemailer.com/) (SMTP), [Twilio](https://www.twilio.com/) REST for SMS |
| Tooling | TypeScript, ESLint (`eslint-config-next`) |

## Prerequisites

- **Node.js** — use a current LTS release compatible with Next.js 15 (for example 20.x or 22.x).
- **MySQL** — a reachable server and a database the app user can access.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file and edit values for your machine:

```bash
cp .env.example .env
```

See [Environment variables](#environment-variables) below for the full picture.

### 3. Database schema

Schema files live under `src/db/schema/`. After MySQL credentials are set, apply the schema to your database (Drizzle Kit **push** is the usual workflow during development):

```bash
npm run db:push
```

Other database scripts:

| Script | Purpose |
| --- | --- |
| `npm run db:generate` | Generate SQL migrations from schema changes into `drizzle/` |
| `npm run db:studio` | Open Drizzle Studio against the configured database |

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin UI is under [http://localhost:3000/admin](http://localhost:3000/admin).

### 5. Production build

```bash
npm run build
```

**Starting in production:**

- `npm run start` — runs the custom [server.js](server.js) entry (loads `.env*` like Next, binds `0.0.0.0`, port from `PORT` or **3000**). Intended for hosts such as **cPanel / Phusion Passenger** where the application startup file must be `server.js`.
- `npm run start:next` — standard `next start` if you do not need the custom server.

## Environment variables

Values are read from `.env`, `.env.local`, and related files the way Next.js expects. The repository includes [.env.example](.env.example) with commented templates.

### Core

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | *One of URL or discrete vars* | Full MySQL URL, e.g. `mysql://USER:PASSWORD@HOST:3306/DATABASE` |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | If no `DATABASE_URL` | Discrete MySQL settings (aliases `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` are also supported) |
| `MYSQL_CONNECTION_LIMIT`, `MYSQL_MAX_IDLE` | No | Connection pool tuning (defaults apply) |
| `SESSION_SECRET` | **Strongly recommended in production** | Secret for signing session cookies. If unset in development, a placeholder is used (not safe for production). |

### Public URL (optional)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public site URL when behind a proxy or for absolute links |

### Survey delivery (optional)

Email and SMS are only needed if you use survey invitation features that send mail or text.

**SMTP** (also accepts `MAIL_*` names for host, port, secure, user, pass, from):

| Variable | Description |
| --- | --- |
| `SMTP_HOST` | SMTP hostname |
| `SMTP_PORT` | Port (default treated as 587) |
| `SMTP_SECURE` | `1` / `true` for TLS |
| `SMTP_USER`, `SMTP_PASS` | Auth when required |
| `SMTP_FROM` | From address / display name |

**Twilio (SMS):**

| Variable | Description |
| --- | --- |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | API credentials |
| `TWILIO_PHONE_NUMBER` or `TWILIO_SMS_FROM` | E.164 sender number |

### Custom server (`server.js`) — hosting

| Variable | Description |
| --- | --- |
| `PORT` | Listen port (default `3000`) |
| `NEXT_HOST`, `HOSTNAME`, `HOST_URL`, `HOST` | Hostname used by Next for URL generation |
| `BIND_HOST`, `LISTEN_HOST` | Address to bind (default `0.0.0.0`) |
| `NODE_ENV` | `production` or development |

## Project layout (high level)

```
src/
  app/                 # Next.js App Router: pages, layouts, API route handlers
  components/          # Shared UI (including Radix-based primitives)
  controllers/         # Server-side request orchestration for APIs
  db/schema/           # Drizzle table definitions
  hooks/               # React hooks
  lib/                 # DB pool, auth, formatting, survey delivery, etc.
  models/              # Data access patterns / CRUD helpers
  server/              # Page-level server data loaders
  views/               # Larger page/view components
  routes/index.ts      # Central route and API path constants
drizzle/               # Generated migrations (when using db:generate)
server.js              # Production/cPanel-friendly custom Next server
drizzle.config.ts      # Drizzle Kit configuration (MySQL)
```

## Scripts reference

| Command | Description |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Production server via `server.js` |
| `npm run start:next` | Production server via `next start` |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to the database (Drizzle Kit) |
| `npm run db:generate` | Generate migration files from schema |
| `npm run db:studio` | Drizzle Studio |

## Deployment notes (cPanel / Passenger)

On **Setup Node.js App**, set the **application startup file** to `server.js` so the platform starts the same entry point as `npm run start`. That file uses `@next/env` to load environment files in production and aligns listen/bind behavior with typical Next hosting expectations. Ensure `SESSION_SECRET`, database variables, and any SMTP/Twilio variables are set in the host’s environment or env file as supported by your panel.

## License and origin

This project was bootstrapped with [Lovable](https://lovable.dev/) tooling and evolved into the Roswell's Medical Center application described above. Add your organization’s license terms here if you distribute the code.
