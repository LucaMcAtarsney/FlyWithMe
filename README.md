# Fly With Me

A stylised live flight tracker. Type a flight number (or pick one from the
"flights in the air" list) and watch a 3D aircraft appear on a rotating globe,
following its great-circle path, with live altitude, speed, heading, the country
it's currently over, and the operating airline.

## How it works

- **Backend**: FastAPI service that turns a flight number like `BA123` into
  airline ICAO callsigns (via a seeded SQLite `airlines` table from OpenFlights
  data), then looks the aircraft up in [OpenSky Network](https://opensky-network.org)'s
  live `/states/all` feed and returns its current position/heading/speed.
- **Frontend**: React + [react-three-fiber](https://github.com/pmndrs/react-three-fiber)
  globe. Coastlines and a land texture are drawn from `world-atlas` TopoJSON; a
  Boeing 787 glTF model is placed at the flight's position and oriented to its
  heading, with the flight path drawn as a great circle and the overflown country
  resolved by point-in-polygon.

## Features

- Search any flight number, or click a live one from the auto-refreshing list
  (the ↻ button cycles through a fresh set each time).
- 3D plane on the globe with a great-circle flight path and altitude stem.
- Tracked-flight panel: airline, callsign, altitude, speed, heading, position,
  country overflown, and last-contact time.
- Globe eases round to face the tracked flight.

## Local development

Two processes: the API on `:8000` and the Vite dev server on `:5173` (which
proxies `/api` to the backend).

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed_airlines          # builds flywithme.db from data/airlines.dat
# OpenSky credentials (client_credentials) in backend/.env:
#   CLIENT_ID=...
#   CLIENT_SECRET=...
uvicorn app.main:app --reload
```

Run the tests with `python -m pytest`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## API

| Method | Path                          | Description                                  |
| ------ | ----------------------------- | -------------------------------------------- |
| GET    | `/api/health`                 | Liveness check.                              |
| GET    | `/api/flights/live?limit=8`   | A shuffled spread of currently-airborne flights. |
| GET    | `/api/flight/{flight_number}` | Track one flight (404 if not currently airborne). |

## Deployment

- **Backend → Render** (`backend/render.yaml`): the airlines DB is rebuilt from
  `data/airlines.dat` at build time (it's gitignored). Set `CLIENT_ID`,
  `CLIENT_SECRET`, and `ALLOWED_ORIGINS` as env vars.
- **Frontend → Vercel** (`frontend/vercel.json`): static build with a rewrite
  proxying `/api/*` to the Render backend, so browser calls stay same-origin.

## Data & attribution

- Airline and airport data from [OpenFlights](https://openflights.org/data.html),
  published under the Open Database License (ODbL); attribution required.
- Live aircraft states from the [OpenSky Network](https://opensky-network.org).
- Coastline/country boundaries from [`world-atlas`](https://github.com/topojson/world-atlas)
  (Natural Earth, public domain).
