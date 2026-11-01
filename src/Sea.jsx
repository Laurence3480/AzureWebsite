import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mood } from './mood'
import { seaMat } from './materials'

export const SEA_Y = -7.6
const SEG = 6.2
const N = 42 // 42 * 6.2 ≈ 260，覆盖到雾的尽头；面少而大，是有意的艺术化

// 海面跟着视点走：位置按网格步长吸附，海浪用世界坐标计算，所以平移时波纹不会"游动"
// 海浪高度（世界坐标 + 时间）：几组低频大浪叠加，振幅夸张
export const waveH = (x, z, t) =>
  Math.sin(x * 0.16 + t * 0.7) * 0.5 + Math.cos(z * 0.2 + t * 0.55) * 0.46 + Math.sin((x + z) * 0.11 + t * 0.3) * 0.36

export function Sea({ onSeaClick }) {
  const mesh = useRef()
  const controls = useThree((s) => s.controls)
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(SEG * N, SEG * N, N, N)
    g.rotateX(-Math.PI / 2)
    g.userData.base = g.attributes.position.array.slice()
    return g
  }, [])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const tgt = controls?.target
    const ox = tgt ? Math.round(tgt.x / SEG) * SEG : 0
    const oz = tgt ? Math.round(tgt.z / SEG) * SEG : 0
    mesh.current.position.set(ox, SEA_Y, oz)

    const pos = geo.attributes.position
    const base = geo.userData.base
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + ox
      const z = base[i * 3 + 2] + oz
      pos.setY(i, waveH(x, z, t))
    }
    pos.needsUpdate = true
    seaMat.color.copy(mood.water)
    seaMat.emissive.copy(mood.water).multiplyScalar(0.4 + mood.night * 0.2)
  })

  return <mesh ref={mesh} geometry={geo} material={seaMat} position={[0, SEA_Y, 0]} onClick={onSeaClick} />
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
    mesh.current.position.y = SEA_Y + waveH(x, z, s.clock.elapsedTime) + 0.3
  })
  return (
    <mesh ref={mesh} position={[x, SEA_Y + 0.38, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1, 48]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} fog />
    </mesh>
  )
}
