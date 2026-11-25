import { memo } from 'react'
import { Line } from '@react-three/drei'
import { AdditiveBlending, BackSide, Color } from 'three'
import { coastlineSegments, landTexture } from './geo'

// Fresnel glow that sits just behind the planet and brightens toward the
// silhouette, giving the globe a soft atmosphere instead of a hard edge.
const atmosphereUniforms = {
  glowColor: { value: new Color('#dfe6ee') },
}

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const atmosphereFragment = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vView), vNormal)), 6.0);
    gl_FragColor = vec4(glowColor, rim * 0.35);
  }
`

export const Globe = memo(function Globe() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={landTexture} roughness={1} />
      </mesh>

      <Line
        points={coastlineSegments}
        segments
        color="white"
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      <mesh scale={1.035}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={BackSide}
          blending={AdditiveBlending}
          uniforms={atmosphereUniforms}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
        />
      </mesh>
    </>
  )
})
