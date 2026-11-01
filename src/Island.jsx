import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lowpoly, mood } from './mood'
import { landMat, windowMat, flowerMat } from './materials'
import { Fireflies } from './Magic'

// ---------- 可复用的树/石头模板（只建一次，每棵树克隆变换后合并进岛屿网格） ----------
let T = null
function templates() {
  if (T) return T
  const lp = (geo, color, jitter, seed, variance = 0.06) => lowpoly(geo, { color, variance, jitter, seed })
  const pine = (v) => {
    const k = v * 7
    return [
      lp(new THREE.CylinderGeometry(0.07, 0.11, 0.5, 5), '#8c6a54', 0, 0, 0.03).translate(0, 0.25, 0),
      lp(new THREE.ConeGeometry(0.72, 0.8, 7), v ? '#5aae96' : '#5fb190', 0.03, k + 1).translate(0, 0.75, 0),
      lp(new THREE.ConeGeometry(0.56, 0.75, 7), v ? '#63b89f' : '#68bb98', 0.03, k + 2).translate(0, 1.25, 0),
      lp(new THREE.ConeGeometry(0.4, 0.7, 7), v ? '#6ec2a9' : '#74c5a2', 0.03, k + 3).translate(0, 1.75, 0),
    ]
  }
  const blossom = (v) => {
    const k = v * 7 + 20
    return [
      lp(new THREE.CylinderGeometry(0.07, 0.13, 0.9, 5), '#8c6a54', 0, 0, 0.03).translate(0, 0.45, 0),
      lp(new THREE.IcosahedronGeometry(0.8, 1), v ? '#ffa9c2' : '#ffb7cb', 0.07, k + 5).scale(1, 0.85, 1).translate(0, 1.25, 0),
      lp(new THREE.IcosahedronGeometry(0.5, 1), v ? '#ffbdd0' : '#ffc9d8', 0.05, k + 6).translate(0.45, 0.95, 0.2),
    ]
  }
  const rock = (v) => [lp(new THREE.DodecahedronGeometry(0.3, 0), v ? '#a49cb4' : '#9a94ac', 0.04, 9 + v)]
  T = { pine: [pine(0), pine(1)], blossom: [blossom(0), blossom(1)], rock: [rock(0), rock(1)] }
  return T
}

function addPart(out, parts, { x, y = 0, z, s = 1, ry = 0 }) {
  for (const p of parts) {
    const g = p.clone()
    g.rotateY(ry)
    g.scale(s, s, s)
    g.translate(x, y, z)
    out.push(g)
  }
}

function buildGeometry(spec) {
  const { r, seed } = spec
  const tp = templates()
  const out = []

  const grass = lowpoly(new THREE.CylinderGeometry(r, r * 1.04, 0.45, 11, 1), {
    color: spec.grass,
    variance: 0.05,
    jitter: r * 0.045,
    jitterY: 0.05,
    seed,
  })
  out.push(grass.translate(0, -0.225, 0))

  const dirt = lowpoly(new THREE.CylinderGeometry(r * 1.04, r * 0.94, 0.7, 11, 1), {
    color: '#c79a76',
    variance: 0.05,
    jitter: r * 0.04,
    jitterY: 0.04,
    seed: seed + 1,
  })
  out.push(dirt.translate(0, -0.8, 0))

  const rockH = r * 1.28
  const rock = lowpoly(new THREE.ConeGeometry(r * 0.96, rockH, 11, 3), {
    color: spec.rock,
    variance: 0.07,
    jitter: r * 0.095,
    jitterY: r * 0.083,
    seed: seed + 2,
  })
  out.push(rock.rotateX(Math.PI).translate(0, -1.15 - rockH / 2, 0))

  for (const t of spec.trees) addPart(out, tp[t.t][t.v], t)
  for (const k of spec.rocks) addPart(out, tp.rock[k.v], { ...k, y: 0.1 })

  const merged = mergeGeometries(out, false)
  out.forEach((g) => g.dispose())
  return merged
}

// ---------- 小木屋 ----------
function Cabin({ cabin }) {
  const light = useRef()
  useFrame((s) => {
    if (!light.current) return
    const f = 1 + Math.sin(s.clock.elapsedTime * 7) * 0.03 + Math.sin(s.clock.elapsedTime * 3.1) * 0.03
    light.current.intensity = mood.night * 7 * f
  })
  return (
    <group position={[cabin.x, 0, cabin.z]} rotation={[0, cabin.rot, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 1.1, 1.4]} />
        <meshStandardMaterial color="#f6e2c8" flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.3, 1, 1.0]} castShadow>
        <coneGeometry args={[1.25, 0.95, 4]} />
        <meshStandardMaterial color="#e0786f" flatShading roughness={0.85} />
      </mesh>
      <mesh position={[0.5, 1.75, -0.2]} castShadow>
        <boxGeometry args={[0.24, 0.5, 0.24]} />
        <meshStandardMaterial color="#b08c7c" flatShading />
      </mesh>
      <mesh position={[-0.35, 0.33, 0.71]}>
        <boxGeometry args={[0.38, 0.66, 0.05]} />
        <meshStandardMaterial color="#8c5c46" flatShading />
      </mesh>
      <mesh position={[0.35, 0.62, 0.71]} material={windowMat}>
        <boxGeometry args={[0.38, 0.38, 0.05]} />
      </mesh>
      <mesh position={[0.86, 0.62, 0.1]} material={windowMat}>
        <boxGeometry args={[0.05, 0.38, 0.38]} />
      </mesh>
      {cabin.light && <pointLight ref={light} position={[0.3, 0.7, 1.5]} color="#ffb467" distance={7} decay={2} />}
    </group>
  )
}

// ---------- 野花（实例化：一个绘制调用） ----------
const flowerGeo = new THREE.IcosahedronGeometry(0.07, 0)
function Flowers({ items }) {
  const ref = useRef()
  useLayoutEffect(() => {
    if (!ref.current) return // 没有花的岛（岩石岛）不渲染实例网格
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    items.forEach((f, i) => {
      ref.current.setMatrixAt(i, m.setPosition(f.x, 0.06, f.z))
      ref.current.setColorAt(i, c.set(f.c))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return <instancedMesh ref={ref} args={[flowerGeo, flowerMat, items.length]} />
}

// 周围缓缓漂浮的小碎岩
const debrisGeo = lowpoly(new THREE.DodecahedronGeometry(0.4, 0), { color: '#a898b8', variance: 0.07, jitter: 0.07, seed: 11 })
function Debris({ items }) {
  const refs = useRef([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    items.forEach((it, i) => {
      const m = refs.current[i]
      if (!m) return
      m.position.y = it.p[1] + Math.sin(t * 0.7 + i * 2) * 0.25
      m.rotation.y = t * 0.2 + i
      m.rotation.x = t * 0.13
    })
  })
  return items.map((it, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={debrisGeo} material={landMat} position={it.p} scale={it.s} castShadow />
  ))
}

export default function Island({ spec }) {
  const g = useRef()
  const born = useRef(null)
  const geo = useMemo(() => buildGeometry(spec), [spec])
  useLayoutEffect(() => () => geo.dispose(), [geo])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (born.current === null) born.current = t
    const k = Math.min(1, (t - born.current) / 1.8)
    g.current.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - k, 3)))
    g.current.position.y = spec.y + Math.sin(t * 0.55 + spec.phase) * 0.18
    g.current.rotation.y = Math.sin(t * 0.12 + spec.phase) * 0.06
  })

  return (
    <group ref={g} position={[spec.x, spec.y, spec.z]}>
      <mesh geometry={geo} material={landMat} castShadow receiveShadow />
      {spec.cabin && <Cabin cabin={spec.cabin} />}
      <Flowers items={spec.flowers} />
      <Debris items={spec.debris} />
      <Fireflies count={spec.fireflies} radius={spec.r} />
    </group>
  )
}
