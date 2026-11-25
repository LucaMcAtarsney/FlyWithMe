import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Group, Matrix4, Quaternion, Vector3 } from 'three'
import { greatCirclePoints, latLonToVec } from './geo'
import type { Flight } from './types'

const IDENTITY = new Quaternion()

// How far above the globe surface the plane floats, scaled from barometric
// altitude but kept subtle so it reads as "just above" the surface.
const BASE_RADIUS = 1.02
const ALT_SCALE = 1 / 700_000

function planeRadius(altitude_m: number | null): number {
  return BASE_RADIUS + (altitude_m ?? 0) * ALT_SCALE
}

// Orient the plane so its belly sits on the surface (model +Y = radial out) and
// its nose (model +Z) points along the aircraft's heading.
function usePose(lat: number, lon: number, heading: number, radius: number) {
  return useMemo(() => {
    // centre point + a point just ahead along the heading great circle
    const [, center, ahead] = greatCirclePoints(lat, lon, heading, 2, 2, radius)
    const up = center.clone().normalize()
    let forward = ahead.clone().sub(center)
    // project forward onto the tangent plane so it's perpendicular to up
    forward.sub(up.clone().multiplyScalar(forward.dot(up))).normalize()
    const right = new Vector3().crossVectors(up, forward).normalize()
    const quaternion = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(right, up, forward),
    )
    return { position: center, quaternion }
  }, [lat, lon, heading, radius])
}

// Only rendered for flights with a known position (the parent guards lat/lon).
export function Plane({ flight }: { flight: Flight }) {
  const lat = flight.lat ?? 0
  const lon = flight.lon ?? 0
  const radius = planeRadius(flight.altitude_m)
  const { position, quaternion } = usePose(lat, lon, flight.heading ?? 0, radius)

  // thin stem from the surface up to the plane, a depth cue for altitude
  const stem = useMemo(() => {
    const surface = latLonToVec(lat, lon, 1.001)
    return [surface, position] as [Vector3, Vector3]
  }, [lat, lon, position])

  return (
    <>
      <Line points={stem} color="#9fc2ff" lineWidth={1} transparent opacity={0.4} />

      <group position={position} quaternion={quaternion} scale={0.9}>
        {/* fuselage */}
        <mesh>
          <boxGeometry args={[0.016, 0.016, 0.14]} />
          <meshStandardMaterial color="#ffffff" emissive="#8fb4ff" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
        {/* nose */}
        <mesh position={[0, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.012, 0.04, 12]} />
          <meshStandardMaterial color="#ffffff" emissive="#8fb4ff" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
        {/* main wings */}
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.16, 0.005, 0.032]} />
          <meshStandardMaterial color="#eaf1ff" emissive="#8fb4ff" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* horizontal tailplane */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[0.07, 0.004, 0.02]} />
          <meshStandardMaterial color="#eaf1ff" emissive="#8fb4ff" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* vertical fin */}
        <mesh position={[0, 0.018, -0.06]}>
          <boxGeometry args={[0.004, 0.03, 0.025]} />
          <meshStandardMaterial color="#eaf1ff" emissive="#8fb4ff" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>
    </>
  )
}

// Wraps the globe + tracked flight. When a flight is tracked it smoothly rotates
// the whole group so the aircraft swings round to face the camera; when cleared
// it eases back so the normal auto-rotation can resume.
export function FocusGroup({ flight, children }: { flight: Flight | null; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const target = useRef(new Quaternion())
  const lastKey = useRef<string | null>(null)

  useFrame(({ camera }) => {
    const group = ref.current
    if (!group) return

    const tracking = flight && flight.lat !== null && flight.lon !== null
    if (tracking) {
      const key = `${flight.lat},${flight.lon}`
      if (key !== lastKey.current) {
        lastKey.current = key
        const flightDir = latLonToVec(flight.lat!, flight.lon!, 1).normalize()
        const camDir = camera.position.clone().normalize()
        target.current.setFromUnitVectors(flightDir, camDir)
      }
      group.quaternion.slerp(target.current, 0.08)
    } else {
      lastKey.current = null
      group.quaternion.slerp(IDENTITY, 0.05)
    }
  })

  return <group ref={ref}>{children}</group>
}

export function FlightPath({ flight }: { flight: Flight }) {
  const points = useMemo(() => {
    if (flight.lat === null || flight.lon === null) return []
    return greatCirclePoints(flight.lat, flight.lon, flight.heading ?? 0, 50, 90)
  }, [flight.lat, flight.lon, flight.heading])

  if (points.length === 0) return null

  return <Line points={points} color="#9fc2ff" lineWidth={1.5} transparent opacity={0.6} />
}
