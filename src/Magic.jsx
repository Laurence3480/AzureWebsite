import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mood, makeGlowTexture } from './mood'

export function Fireflies({ count = 38 }) {
  const mat = useRef()
  const tex = useMemo(() => makeGlowTexture(), [])
  const { geo, seeds } = useMemo(() => {
    const seeds = Array.from({ length: count }, (_, i) => {
      const a = i * 2.399
      const r = 1.2 + ((i * 37) % 25) / 8
      return {
        cx: Math.cos(a) * r,
        cz: Math.sin(a) * r,
        cy: 0.4 + ((i * 17) % 20) / 9,
        f: [0.3 + (i % 5) * 0.09, 0.4 + (i % 7) * 0.07, 0.25 + (i % 4) * 0.1],
        p: [i * 1.7, i * 2.9, i * 0.7],
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return { geo: g, seeds }
  }, [count])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const pos = geo.attributes.position
    seeds.forEach((d, i) => {
      pos.setXYZ(
        i,
        d.cx + Math.sin(t * d.f[0] + d.p[0]) * 0.6,
        d.cy + Math.sin(t * d.f[1] + d.p[1]) * 0.35,
        d.cz + Math.cos(t * d.f[2] + d.p[2]) * 0.6,
      )
    })
    pos.needsUpdate = true
    mat.current.opacity = Math.min(1, mood.night * 1.25)
    mat.current.size = 0.3 + Math.sin(t * 2.2) * 0.04
  })

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        ref={mat}
        map={tex}
        color={new THREE.Color('#e8ff8a').multiplyScalar(2.2)}
        size={0.3}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

// 点击天空放飞的孔明灯
export function Lantern({ x, y, z, onDone }) {
  const g = useRef()
  const mat = useRef()
  const born = useRef(null)
  const seed = useMemo(() => Math.random() * 10, [])
  const life = 16

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (born.current === null) born.current = t
    const k = (t - born.current) / life
    if (k >= 1) return onDone()
    const a = t - born.current
    g.current.position.set(
      x + Math.sin(a * 0.5 + seed) * 0.6 + a * 0.12,
      y + a * 0.55,
      z + Math.cos(a * 0.4 + seed) * 0.5,
    )
    g.current.rotation.y = a * 0.3
    g.current.rotation.z = Math.sin(a * 0.9 + seed) * 0.06
    const fadeIn = Math.min(1, a / 1.2)
    const fadeOut = Math.min(1, (1 - k) / 0.25)
    mat.current.opacity = fadeIn * fadeOut
    mat.current.emissiveIntensity = (2.2 + Math.sin(a * 6 + seed) * 0.25) * (0.35 + 0.65 * (0.5 + mood.night * 0.5))
  })

  return (
    <group ref={g} position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 6]} />
        <meshStandardMaterial
          ref={mat}
          color="#ffd7a0"
          emissive="#ff9440"
          emissiveIntensity={2.2}
          flatShading
          transparent
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.2, 0.12, 6]} />
        <meshBasicMaterial color="#ffb878" toneMapped={false} />
      </mesh>
    </group>
  )
}
