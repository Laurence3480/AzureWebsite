import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lowpoly, mood } from './mood'

const lp = { flatShading: true, vertexColors: true, roughness: 0.92, metalness: 0 }

function Terrain() {
  const grass = useMemo(
    () => lowpoly(new THREE.CylinderGeometry(3.6, 3.75, 0.45, 11, 1), { color: '#93d17f', variance: 0.05, jitter: 0.16, jitterY: 0.05, seed: 1 }),
    [],
  )
  const dirt = useMemo(
    () => lowpoly(new THREE.CylinderGeometry(3.75, 3.4, 0.7, 11, 1), { color: '#c79a76', variance: 0.05, jitter: 0.14, jitterY: 0.04, seed: 2 }),
    [],
  )
  const rock = useMemo(
    () => lowpoly(new THREE.ConeGeometry(3.45, 4.6, 11, 3), { color: '#9a8aa8', variance: 0.07, jitter: 0.34, jitterY: 0.3, seed: 3 }),
    [],
  )
  return (
    <group>
      <mesh geometry={grass} position={[0, -0.22, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...lp} />
      </mesh>
      <mesh geometry={dirt} position={[0, -0.8, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...lp} />
      </mesh>
      <mesh geometry={rock} position={[0, -3.45, 0]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...lp} />
      </mesh>
    </group>
  )
}

const windowMat = new THREE.MeshStandardMaterial({
  color: '#ffe3b0',
  emissive: new THREE.Color('#ffae55'),
  emissiveIntensity: 0.1,
  roughness: 0.4,
})

function Cabin() {
  const light = useRef()
  useFrame((s) => {
    const flicker = 1 + Math.sin(s.clock.elapsedTime * 7) * 0.03 + Math.sin(s.clock.elapsedTime * 3.1) * 0.03
    windowMat.emissiveIntensity = 0.15 + mood.night * 2.6 * flicker
    light.current.intensity = mood.night * 7 * flicker
  })
  return (
    <group position={[-0.5, 0, -0.2]} rotation={[0, 0.55, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 1.1, 1.4]} />
        <meshStandardMaterial color="#f6e2c8" flatShading roughness={0.9} />
      </mesh>
      {/* 屋顶 */}
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.3, 1, 1.0]} castShadow>
        <coneGeometry args={[1.25, 0.95, 4]} />
        <meshStandardMaterial color="#e0786f" flatShading roughness={0.85} />
      </mesh>
      {/* 烟囱 */}
      <mesh position={[0.5, 1.75, -0.2]} castShadow>
        <boxGeometry args={[0.24, 0.5, 0.24]} />
        <meshStandardMaterial color="#b08c7c" flatShading />
      </mesh>
      {/* 门 */}
      <mesh position={[-0.35, 0.33, 0.71]}>
        <boxGeometry args={[0.38, 0.66, 0.05]} />
        <meshStandardMaterial color="#8c5c46" flatShading />
      </mesh>
      {/* 窗 */}
      <mesh position={[0.35, 0.62, 0.71]} material={windowMat}>
        <boxGeometry args={[0.38, 0.38, 0.05]} />
      </mesh>
      <mesh position={[0.86, 0.62, 0.1]} material={windowMat}>
        <boxGeometry args={[0.05, 0.38, 0.38]} />
      </mesh>
      <pointLight ref={light} position={[0.3, 0.7, 1.5]} color="#ffb467" distance={7} decay={2} />
    </group>
  )
}

function Pine({ position, scale = 1, phase = 0 }) {
  const g = useRef()
  const cones = useMemo(
    () => [
      lowpoly(new THREE.ConeGeometry(0.72, 0.8, 7), { color: '#5fb190', variance: 0.06, jitter: 0.03, seed: phase }),
      lowpoly(new THREE.ConeGeometry(0.56, 0.75, 7), { color: '#68bb98', variance: 0.06, jitter: 0.03, seed: phase + 1 }),
      lowpoly(new THREE.ConeGeometry(0.4, 0.7, 7), { color: '#74c5a2', variance: 0.06, jitter: 0.03, seed: phase + 2 }),
    ],
    [phase],
  )
  useFrame((s) => {
    g.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.9 + phase) * 0.025
  })
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.5, 5]} />
        <meshStandardMaterial color="#8c6a54" flatShading />
      </mesh>
      <group ref={g}>
        {cones.map((geo, i) => (
          <mesh key={i} geometry={geo} position={[0, 0.75 + i * 0.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial {...lp} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Blossom({ position, scale = 1, phase = 0 }) {
  const g = useRef()
  const crown = useMemo(
    () => lowpoly(new THREE.IcosahedronGeometry(0.8, 1), { color: '#ffb7cb', variance: 0.06, jitter: 0.07, seed: phase + 5 }),
    [phase],
  )
  const crown2 = useMemo(
    () => lowpoly(new THREE.IcosahedronGeometry(0.5, 1), { color: '#ffc9d8', variance: 0.06, jitter: 0.05, seed: phase + 6 }),
    [phase],
  )
  useFrame((s) => {
    g.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.8 + phase) * 0.03
  })
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 0.9, 5]} />
        <meshStandardMaterial color="#8c6a54" flatShading />
      </mesh>
      <group ref={g}>
        <mesh geometry={crown} position={[0, 1.25, 0]} scale={[1, 0.85, 1]} castShadow receiveShadow>
          <meshStandardMaterial {...lp} />
        </mesh>
        <mesh geometry={crown2} position={[0.45, 0.95, 0.2]} castShadow>
          <meshStandardMaterial {...lp} />
        </mesh>
      </group>
    </group>
  )
}

function Flowers() {
  const items = useMemo(() => {
    const colors = ['#ff9ec0', '#ffe28a', '#ffffff', '#b9a4ff']
    const out = []
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399 + 0.5
      const r = 1.2 + ((i * 53) % 21) / 10
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, c: colors[i % colors.length] })
    }
    return out
  }, [])
  return (
    <group>
      {items.map((f, i) => (
        <mesh key={i} position={[f.x, 0.06, f.z]}>
          <icosahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color={f.c} flatShading emissive={f.c} emissiveIntensity={0.08} />
        </mesh>
      ))}
    </group>
  )
}

function Rocks() {
  const geo = useMemo(() => lowpoly(new THREE.DodecahedronGeometry(0.3, 0), { color: '#a49cb4', variance: 0.06, jitter: 0.04, seed: 9 }), [])
  return (
    <group>
      {[
        [1.1, 0.1, 2.3, 1],
        [-2.3, 0.1, 2.0, 0.7],
        [2.9, 0.1, -0.6, 0.8],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} geometry={geo} position={[x, y, z]} scale={s} castShadow receiveShadow>
          <meshStandardMaterial {...lp} />
        </mesh>
      ))}
    </group>
  )
}

// 周围缓缓漂浮的小碎岩
function Debris() {
  const refs = useRef([])
  const geo = useMemo(() => lowpoly(new THREE.DodecahedronGeometry(0.4, 0), { color: '#a898b8', variance: 0.07, jitter: 0.07, seed: 11 }), [])
  const items = [
    { p: [4.8, 0.6, 1.2], s: 0.7 },
    { p: [-4.6, 1.2, -1.2], s: 0.5 },
    { p: [3.4, -1.4, -3.6], s: 0.4 },
    { p: [-3.0, -0.4, 4.2], s: 0.55 },
  ]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    items.forEach((it, i) => {
      const m = refs.current[i]
      m.position.y = it.p[1] + Math.sin(t * 0.7 + i * 2) * 0.25
      m.rotation.y = t * 0.2 + i
      m.rotation.x = t * 0.13
    })
  })
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={geo} position={it.p} scale={it.s} castShadow>
          <meshStandardMaterial {...lp} />
        </mesh>
      ))}
    </>
  )
}

export default function Island() {
  const g = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    g.current.position.y = Math.sin(t * 0.55) * 0.18
    g.current.rotation.y = Math.sin(t * 0.12) * 0.06
  })
  return (
    <>
      <group ref={g}>
        <Terrain />
        <Cabin />
        <Pine position={[2.1, 0, -1.4]} scale={1.15} phase={1} />
        <Pine position={[2.7, 0, 0.5]} scale={0.8} phase={2} />
        <Pine position={[-2.3, 0, -1.9]} scale={1.0} phase={3} />
        <Pine position={[0.6, 0, -2.6]} scale={0.9} phase={4} />
        <Blossom position={[1.7, 0, 1.9]} scale={1.0} phase={5} />
        <Blossom position={[-2.7, 0, 0.6]} scale={1.15} phase={6} />
        <Flowers />
        <Rocks />
      </group>
      <Debris />
    </>
  )
}
