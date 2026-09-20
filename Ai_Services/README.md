# AeroResolve AI Service

The customer-facing AI agent for AeroResolve AI. A FastAPI service that uses a LangGraph
StateGraph and Gemini to understand natural-language disruption requests, then calls the
existing Node/Express backend (`http://localhost:5000`) for every fact and every action.

## Architecture rule

This service never talks to PostgreSQL and never re-implements the airline's policy rules.
The Node backend is the single source of truth for customers, bookings, flights, policy
decisions, actions and escalations. Gemini/LangGraph only understand language, decide which
backend tool to call, and phrase the backend's own response - see `app/services/backend_client.py`
for the one place all HTTP calls to Node happen, and `app/tools/` for the controlled tools built
on top of it.

## Setup

A virtual environment already exists at `venv/` with all dependencies installed. To set up from
scratch elsewhere:

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in:

- `GEMINI_API_KEY` - your Gemini API key (the service runs with safe, deterministic fallback
  responses if this is left blank, so the backend integration can still be tested without one)
- `BACKEND_SERVICE_EMAIL` / `BACKEND_SERVICE_PASSWORD` - credentials for a dedicated Node backend
  account this service authenticates as (auto-registered on first run if it doesn't exist yet).
  The Node backend requires a JWT on every customer/booking/agent/escalation route, so this
  service logs in like any other client - it is never given a bypass.

## Run

```bash
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The service listens on `http://localhost:8000`. The Node backend must already be running on
`http://localhost:5000`.

## API

### `GET /health`

```json
{ "success": true, "service": "AeroResolve AI Service", "status": "healthy" }
```

### `POST /api/ai/chat`

```json
{ "message": "My flight is delayed. I need a hotel.", "pnr": "WL7742" }
```

`conversation_id` is optional - omit it to start a new conversation, or pass one back to
continue an existing one.

```json
{
  "success": true,
  "message": "Hi Meher...",
  "conversation_id": "…",
  "resolution": { "entitlement": "DELAY", "entitlements": [...] }
}
```

## Tests

```bash
venv\Scripts\python -m unittest discover tests
```

Covers: health, chat happy path, missing PNR, unknown PNR, backend connection failure,
the cancellation/4-hour-delay/6-hour-delay assignment scenarios, and escalation.
