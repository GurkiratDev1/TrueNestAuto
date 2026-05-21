# TrueNestAuto Phase 1

A Phase 1 MVP for TrueNestAuto that accepts vehicle submissions, stores raw payloads in PostgreSQL, processes jobs asynchronously, and streams live status updates to a dashboard using Server-Sent Events (SSE).

---

## Features

- Vehicle submission API with Zod validation
- Raw JSON payload storage in PostgreSQL
- Idempotent submissions via `Idempotency-Key` header or body field
- Async job simulation with progress updates
- SSE streaming for real-time job updates
- Frontend UI for VIN or JSON submission
- Resilient invalid input handling on client and server

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Zod
- Server-Sent Events (SSE)
- Tailwind CSS
- `pg` for database access

---

## Architecture Overview

The application is split into:

- `src/app/api/vehicle/submit/route.ts` — receives submissions, validates input, enforces idempotency, writes raw payload to `vehicle_submissions`, and creates a `vehicle_jobs` record.
- `src/app/api/vehicle/jobs/[jobId]/stream/route.ts` — streams job progress via SSE events.
- `src/app/page.tsx` — landing page that accepts VIN or JSON and submits jobs.
- `src/app/dashboard/[jobId]/page.tsx` — dashboard that listens to SSE and shows live progress.
- `src/lib/validations.ts` — Zod schema for request validation.
- `migrations/init.sql` — PostgreSQL schema for `vehicle_submissions` and `vehicle_jobs`.

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- npm
- Docker (for PostgreSQL)

### Start PostgreSQL with Docker

```bash
docker run --name tn-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=truenest -p 5432:5432 -d postgres:15
```

Verify the container is running:

```bash
docker ps
```

### Apply Database Migrations

```bash
psql postgresql://postgres:postgres@localhost:5432/truenest -f migrations/init.sql
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

Update values if needed:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/truenest
PORT=3000
NODE_ENV=development
```

### Run the App

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

---

## API Documentation

### POST `/api/vehicle/submit`

Submits a vehicle payload and creates an async job.

#### Request Example

```json
{
  "submitted_by": "user_123",
  "timestamp": "2026-05-19T12:00:00Z",
  "vehicle": {
    "vin": "1HGCM82633A004352",
    "year": 2018,
    "make": "Honda",
    "model": "Accord",
    "trim": "EX-L",
    "mileage": 45000,
    "asking_price": 17995,
    "location": { "zip": "33060", "lat": 26.12345, "lng": -80.12345 },
    "notes": "Good condition, single owner"
  },
  "meta": { "request_id": "req_abc_001", "client_version": "1.0.0" }
}
```

#### Response Example

```json
{
  "submission_id": "<uuid>",
  "job_id": "<uuid>",
  "status": "pending"
}
```

#### Error Format

```json
{
  "status": 400,
  "error": "validation_error",
  "details": [
    {
      "field": "vehicle.vin",
      "message": "vehicle.vin must be a non-empty string"
    }
  ]
}
```

### SSE Endpoint

`GET /api/vehicle/jobs/:jobId/stream`

Streams job updates using SSE. Supported events:

- `progress`
- `completed`
- `failed`

#### Test with curl

```bash
curl http://localhost:3000/api/vehicle/jobs/<jobId>/stream
```

---

## Usage Instructions

### UI Submission

1. Open the landing page at `http://localhost:3000`.
2. Enter either:
   - a VIN string, or
   - a valid JSON payload.
3. Click **Analyze Inventory**.
4. The app will redirect to `/dashboard/<jobId>`.

### Dashboard Behavior

- The dashboard subscribes to SSE updates.
- It shows live progress messages and a progress bar.
- It displays the final state when the job completes or fails.
- Invalid SSE payloads are ignored safely and logged without crashing the UI.

---

## Testing Guide

### 1. Valid Input

Submit valid payloads through the UI or API and verify the response contains `submission_id`, `job_id`, and `status: pending`.

### 2. Invalid JSON

Submit malformed JSON from the UI or API and verify:

- the UI shows a clear error message
- the API returns `400 validation_error`

Example malformed JSON test:

```bash
curl -X POST http://localhost:3000/api/vehicle/submit \
  -H "Content-Type: application/json" \
  -d '{ invalid json }'
```

### 3. Idempotency Test

Use the same `Idempotency-Key` header twice and confirm the same `submission_id` and `job_id` are returned.

```bash
curl -X POST http://localhost:3000/api/vehicle/submit \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d @sample_vehicle.json
```

### 4. SSE Test

Open the SSE endpoint in curl and watch the events stream:

```bash
curl http://localhost:3000/api/vehicle/jobs/<jobId>/stream
```

You should observe `progress` events followed by `completed`.

---

## Folder Structure

```text
.
├── migrations/
│   └── init.sql
├── package.json
├── README.md
├── sample_vehicle.json
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── vehicle/submit/route.ts
    │   │   └── vehicle/jobs/[jobId]/stream/route.ts
    │   ├── dashboard/[jobId]/page.tsx
    │   └── page.tsx
    └── lib/
        ├── db.ts
        └── validations.ts
```

---

## Production Build

```bash
npm run build
npm start
```

---

## Notes

- The worker is simulated in-process for Phase 1 and updates progress over time.
- Raw JSON payloads are stored in `vehicle_submissions.payload`.
- Idempotency is enforced using the `Idempotency-Key` header or `idempotency_key` in the request body.

---

## Future Improvements

- Add a durable job queue for background processing
- Add authentication and role-based access
- Add full vehicle normalization and lookup
- Expand SSE events with structured analytics data
- Add automated tests for API and UI flows

---

## Time Spent

I spent approximately 6–7 hours completing this task end-to-end. 

This included:
- Setting up the Next.js project and PostgreSQL database
- Implementing the submission API with validation (Zod) and idempotency handling
- Designing and applying database migrations
- Building the SSE-based job streaming mechanism with simulated worker processing
- Developing the frontend flow for VIN/JSON input and real-time dashboard updates
- Debugging edge cases (invalid JSON handling, SSE parsing issues, and PowerShell curl quirks)
- Performing end-to-end testing via UI and curl, including idempotency and streaming validation

Additional time was spent ensuring the implementation aligns closely with the provided technical specification and behaves reliably under different input scenarios.
