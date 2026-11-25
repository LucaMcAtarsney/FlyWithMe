import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, OrbitControls } from '@react-three/drei'
import './geo'
import { CameraLight } from './CameraLight'
import { Globe } from './globe'
import { Plane, FlightPath, FocusGroup } from './plane'
import { countryAt } from './countries'
import './App.css'
import type { Flight } from './types'

const PLANE = `      __|__
----o--(_)--o----`

// --- value formatting for the data panel ------------------------------------
function fmtAltitude(m: number | null) {
  if (m === null) return '—'
  return `${Math.round(m).toLocaleString()} m · ${Math.round(m * 3.28084).toLocaleString()} ft`
}

function fmtSpeed(ms: number | null) {
  if (ms === null) return '—'
  return `${Math.round(ms * 3.6)} km/h · ${Math.round(ms * 1.94384)} kts`
}

function fmtHeading(deg: number | null) {
  return deg === null ? '—' : `${Math.round(deg)}°`
}

function fmtPosition(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return '—'
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`
}

function fmtLastContact(unix: number) {
  const secs = Math.max(0, Math.round(Date.now() / 1000 - unix))
  if (secs < 60) return `${secs}s ago`
  return `${Math.round(secs / 60)}m ago`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-right text-white/80">{value}</dd>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const raised = searched && query !== ''
  const [flight, setFlight] = useState<Flight | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<Flight[]>([])

  const country = useMemo(
    () =>
      flight && flight.lat !== null && flight.lon !== null
        ? countryAt(flight.lat, flight.lon)
        : null,
    [flight],
  )

  async function loadLive() {
    try {
      const res = await fetch('/api/flights/live')
      if (res.ok) setLive(await res.json())
    } catch {
      /* ignore — list just stays as-is */
    }
  }

  useEffect(() => {
    loadLive()
  }, [])

  async function search(flightNumber: string) {
    if (!flightNumber) return
    setSearched(true)
    const res = await fetch(`/api/flight/${flightNumber}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.detail)
      setFlight(null)
      return
    }
    setError(null)
    setFlight(data)
  }

  // track a flight straight from the live list — no second lookup needed
  function track(f: Flight) {
    setError(null)
    setSearched(true)
    setQuery(f.flight_number)
    setFlight(f)
  }

  function clearFlight() {
    setFlight(null)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    search(query)
  }

  return (
    <main className="relative h-dvh overflow-hidden">
      <title>Fly With Me</title>

      <Canvas flat camera={{ position: [0, 0, 2.5] }}>
        <color attach="background" args={['#0b0b0d']} />
        <Stars radius={50} depth={50} count={300} factor={3} saturation={0} fade />
        <OrbitControls
          autoRotate={!flight}
          autoRotateSpeed={0.3}
          enablePan={false}
          minDistance={1.5}
          maxDistance={5}
        />

        <ambientLight intensity={0.35} />
        <CameraLight />
        <FocusGroup flight={flight}>
          <Globe />
          {flight && flight.lat !== null && flight.lon !== null && (
            <>
              <FlightPath flight={flight} />
              <Plane flight={flight} />
            </>
          )}
        </FocusGroup>
      </Canvas>

      <div className="animate-fade-in pointer-events-none absolute inset-0 z-10">
        <header className="pointer-events-auto absolute top-6 left-6 flex flex-col items-center gap-1.5">
          <pre
            aria-hidden="true"
            className="text-[15px] leading-tight text-white/70 select-none"
          >
            {PLANE}
          </pre>
          <h1 className="text-sm text-white/70">flywithme</h1>
        </header>

        {/* tracked flight data — styled after the search bar */}
        {flight && (
          <div className="animate-fade-in pointer-events-auto absolute top-32 left-6 w-64 rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-xs backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-white">{flight.flight_number}</span>
              <button
                onClick={clearFlight}
                aria-label="Stop tracking"
                className="shrink-0 text-white/40 transition-colors hover:text-white/90"
              >
                ✕
              </button>
            </div>
            <dl className="flex flex-col gap-1">
              <Row label="callsign" value={flight.callsign} />
              <Row label="altitude" value={fmtAltitude(flight.altitude_m)} />
              <Row label="speed" value={fmtSpeed(flight.velocity_ms)} />
              <Row label="heading" value={fmtHeading(flight.heading)} />
              <Row label="position" value={fmtPosition(flight.lat, flight.lon)} />
              <Row label="over" value={country ?? 'open water'} />
              <Row label="status" value={flight.on_ground ? 'on ground' : 'airborne'} />
              <Row label="updated" value={fmtLastContact(flight.last_contact)} />
            </dl>
          </div>
        )}

        {/* live, clickable list so anyone can test tracking right away */}
        <div className="animate-fade-in pointer-events-auto absolute top-6 right-6 w-60 rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-xs backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-white/50 lowercase">flights in the air</span>
            <button
              onClick={loadLive}
              aria-label="Refresh list"
              className="shrink-0 text-white/40 transition-colors hover:text-white/90"
            >
              ↻
            </button>
          </div>
          <ul className="flex flex-col gap-0.5">
            {live.length === 0 && <li className="px-2 py-1 text-white/30">loading…</li>}
            {live.map((f) => (
              <li key={f.callsign}>
                <button
                  onClick={() => track(f)}
                  className={`flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1 text-left transition-colors hover:bg-white/[0.06] ${
                    flight?.callsign === f.callsign ? 'bg-white/[0.06] text-white' : 'text-white/80'
                  }`}
                >
                  <span>{f.flight_number}</span>
                  <span className="text-white/35">{f.callsign}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`pointer-events-auto absolute bottom-10 left-1/2 flex w-[90%] max-w-lg -translate-x-1/2 flex-col items-center gap-5 transition-transform duration-500 ease-out ${
            raised ? '-translate-y-2' : 'translate-y-0'
          }`}
        >
          {!raised && (
            <p className="text-center text-xs text-white/35">
              track any flight, anywhere in the world
            </p>
          )}

          {error && <p className="text-center text-xs text-red-300/70">{error}</p>}

          <form
            onSubmit={handleSubmit}
            className="flex w-full items-center gap-3 rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-white/40"
          >
            <span aria-hidden="true" className="shrink-0 text-white/50 select-none">
              ❯
            </span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-white caret-white outline-none placeholder:text-white/30"
              placeholder="enter a flight number"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              aria-label="Search flight"
              className="shrink-0 text-base text-white/40 transition-colors hover:text-white/90 disabled:opacity-30"
              disabled={!query}
            >
              ↵
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

export default App
