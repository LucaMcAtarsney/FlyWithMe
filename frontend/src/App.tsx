import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, OrbitControls } from '@react-three/drei'
import './geo'
import { CameraLight } from './CameraLight'
import { Globe } from './globe'
import './App.css'

const PLANE = `      __|__
----o--(_)--o----`

function App() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const raised = searched && query !== ''

  async function search(flight: string) {
    if (!flight) return
    setSearched(true)
    const res = await fetch(`/api/flight/${flight}`)
    const data = await res.json()
    console.log(res.status, data)
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
          autoRotate
          autoRotateSpeed={0.3}
          enablePan={false}
          minDistance={1.5}
          maxDistance={5}
        />

        <ambientLight intensity={0.35} />
        <CameraLight />
        <Globe />
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
