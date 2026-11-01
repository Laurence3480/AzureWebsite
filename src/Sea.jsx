import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mood } from './mood'

export const SEA_Y = -7.6

export function Sea({ onSeaClick }) {
  const mesh = useRef()
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(170, 170, 68, 68)
    g.rotateX(-Math.PI / 2)
    g.userData.base = g.attributes.position.array.slice()
    return g
  }, [])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const pos = geo.attributes.position
    const base = geo.userData.base
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      pos.setY(i, Math.sin(x * 0.32 + t * 0.9) * 0.14 + Math.cos(z * 0.41 + t * 0.7) * 0.14 + Math.sin((x + z) * 0.2 + t * 0.4) * 0.1)
    }
    pos.needsUpdate = true
    mesh.current.material.color.copy(mood.water)
    mesh.current.material.emissive.copy(mood.water).multiplyScalar(0.55 + mood.night * 0.25)
  })

  return (
    <mesh ref={mesh} geometry={geo} position={[0, SEA_Y, 0]} onClick={onSeaClick}>
      <meshStandardMaterial flatShading roughness={0.6} metalness={0} />
    </mesh>
  )
}

export function Ripple({ x, z, onDone }) {
  const mesh = useRef()
  const born = useRef(null)
  useFrame((s) => {
    if (born.current === null) born.current = s.clock.elapsedTime
    const k = (s.clock.elapsedTime - born.current) / 3.2
    if (k >= 1) return onDone()
    const e = 1 - Math.pow(1 - k, 2.2)
    mesh.current.scale.setScalar(0.6 + e * 11)
    mesh.current.material.opacity = (1 - k) * 0.85
  })
  return (
    <mesh ref={mesh} position={[x, SEA_Y + 0.38, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1, 48]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} fog />
    </mesh>
  )
}
