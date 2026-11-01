import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clock, mood, updateMood, makeGlowTexture } from './mood'
import { makeSkyMaterial, applySkyUniforms } from './skyShader'
import { mulberry32 } from './world'
import { envMats, timeUniform, windowMat } from './materials'
import { updateFireflies } from './Magic'

const ZERO = new THREE.Vector3()

// 驱动时间、光照、雾色的总控。太阳和月亮各是一盏方向光，都能投射阴影，并跟随视点移动
export function Rig() {
  const scene = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls)
  const sun = useRef()
  const moon = useRef()
  const sunT = useRef()
  const moonT = useRef()
  const hemi = useRef()

  useEffect(() => {
    scene.fog = new THREE.Fog('#ffffff', 30, 100)
    scene.background = new THREE.Color('#000000')
    sun.current.target = sunT.current
    moon.current.target = moonT.current
  }, [scene])

  useFrame((s, dt) => {
    dt = Math.min(dt, 0.1)
    if (clock.auto) clock.hour = (clock.hour + dt * clock.speed * clock.mul) % 24
    updateMood(clock.hour)

    const tgt = controls?.target ?? ZERO
    scene.fog.color.copy(mood.hor)
    scene.background.copy(mood.hor)

    sunT.current.position.copy(tgt)
    sun.current.position.copy(mood.sunDir).multiplyScalar(34).add(tgt)
    sun.current.intensity = mood.sunI
    sun.current.color.copy(mood.sunColor)

    moonT.current.position.copy(tgt)
    moon.current.position.copy(mood.moonDir).multiplyScalar(34).add(tgt)
    moon.current.intensity = mood.moonI
    moon.current.color.set('#9db4ff')

    hemi.current.color.copy(mood.amb)
    hemi.current.groundColor.copy(mood.water).lerp(mood.hor, 0.5)
    hemi.current.intensity = mood.ambI * (1 + mood.night * 0.5)

    const t = s.clock.elapsedTime
    timeUniform.value = t
    windowMat.emissiveIntensity = 0.15 + mood.night * 2.6 * (1 + Math.sin(t * 7) * 0.03)
    updateFireflies(t)
  })

  const shadow = {
    castShadow: true,
    'shadow-mapSize': [2048, 2048],
    'shadow-camera-left': -14,
    'shadow-camera-right': 14,
    'shadow-camera-top': 14,
    'shadow-camera-bottom': -14,
    'shadow-camera-near': 1,
    'shadow-camera-far': 80,
    'shadow-bias': -0.0004,
    'shadow-normalBias': 0.04,
  }

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} {...shadow} />
      <directionalLight ref={moon} {...shadow} />
      <object3D ref={sunT} />
      <object3D ref={moonT} />
    </>
  )
}

// 天空穹顶 + 日月圆盘 + 星星：整体跟着相机走，永远不会"走出"天空
export function SkyDome({ onSkyClick }) {
  const group = useRef()
  const sunDisc = useRef()
  const moonDisc = useRef()
  const camera = useThree((s) => s.camera)
  const mat = useMemo(() => makeSkyMaterial(), [])

  useFrame(() => {
    group.current.position.copy(camera.position)
    applySkyUniforms(mat)
    sunDisc.current.position.copy(mood.sunDir).multiplyScalar(88)
    moonDisc.current.position.copy(mood.moonDir).multiplyScalar(88)
    moonDisc.current.material.opacity = mood.night
  })

  return (
    <group ref={group}>
      <mesh renderOrder={-10} onClick={onSkyClick}>
        <sphereGeometry args={[100, 32, 20]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh ref={sunDisc} renderOrder={-9}>
        <icosahedronGeometry args={[3.6, 1]} />
        <meshBasicMaterial color={new THREE.Color('#ffe2b0').multiplyScalar(1.6)} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={moonDisc} renderOrder={-9}>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial color={new THREE.Color('#fff1d0').multiplyScalar(1.4)} toneMapped={false} fog={false} transparent />
      </mesh>
      <Stars />
    </group>
  )
}

function Stars() {
  const mat = useRef()
  const tex = useMemo(() => makeGlowTexture(), [])
  const geo = useMemo(() => {
    const n = 420
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2
      const y = 0.08 + Math.random() * 0.92 // 只在上半球
      const r = Math.sqrt(1 - y * y)
      arr.set([Math.cos(th) * r * 92, y * 92, Math.sin(th) * r * 92], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((s) => {
    mat.current.opacity = Math.pow(mood.night, 1.6) * (0.8 + Math.sin(s.clock.elapsedTime * 1.3) * 0.1)
  })
  return (
    <points geometry={geo} renderOrder={-8} frustumCulled={false}>
      <pointsMaterial ref={mat} map={tex} size={3} sizeAttenuation={false} transparent depthWrite={false} fog={false} toneMapped={false} />
    </points>
  )
}

// ---------- 云：半透明，太阳/月亮在云后面时，光会从云里透出来 ----------
const CLOUD_N = 18
const SPAN = 85 // 云在视点周围 ±SPAN 的范围内循环，走远了会自然补上新的
const tmpDir = new THREE.Vector3()
const tmpGlow = new THREE.Color()
const MOON_TINT = new THREE.Color('#9db4ff')

export function Clouds() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  const refs = useRef([])
  const clouds = useMemo(() => {
    const rand = mulberry32(777)
    return Array.from({ length: CLOUD_N }, (_, i) => ({
      x: (rand() - 0.5) * SPAN * 2,
      z: (rand() - 0.5) * SPAN * 2,
      y: -3 + rand() * 12,
      s: 1 + rand() * 1.4,
      v: 0.15 + rand() * 0.25,
      mat: new THREE.MeshLambertMaterial({ flatShading: true, transparent: true, opacity: 0.78, depthWrite: false }),
      puffs: [0, 1, 2, 3, 4].map((k) => ({
        x: (k - 2) * 0.9 + (rand() - 0.5) * 0.5,
        y: Math.cos(k * 1.7 + i) * 0.25 + (k === 2 ? 0.35 : 0),
        z: (rand() - 0.5) * 1.0,
        s: 0.8 + rand() * 0.5 - (k === 0 || k === 4 ? 0.25 : 0),
      })),
    }))
  }, [])
  useEffect(() => () => clouds.forEach((c) => c.mat.dispose()), [clouds])

  useFrame((s, dt) => {
    dt = Math.min(dt, 0.1)
    const tgt = controls?.target ?? ZERO
    const t = s.clock.elapsedTime
    clouds.forEach((c, i) => {
      c.x += c.v * dt
      // 环绕视点循环
      c.x = tgt.x + ((((c.x - tgt.x + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN
      c.z = tgt.z + ((((c.z - tgt.z + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN
      refs.current[i].position.set(c.x, c.y + Math.sin(t * 0.2 + i) * 0.25, c.z)

      // 透光：光源在云的背面（相对相机）时，云被照亮
      tmpDir.set(c.x, c.y, c.z).sub(camera.position).normalize() // 相机 → 云
      const sunBack = Math.pow(Math.max(0, tmpDir.dot(mood.sunDir)), 3) * THREE.MathUtils.smoothstep(mood.sunDir.y, -0.08, 0.3)
      const moonBack = Math.pow(Math.max(0, tmpDir.dot(mood.moonDir)), 3) * mood.night

      c.mat.color.copy(mood.cloud)
      c.mat.emissive.copy(mood.cloud).multiplyScalar(0.4)
      tmpGlow.copy(mood.sunColor).multiplyScalar(sunBack * 0.95)
      c.mat.emissive.add(tmpGlow)
      tmpGlow.copy(MOON_TINT).multiplyScalar(moonBack * 0.3)
      c.mat.emissive.add(tmpGlow)
    })
  })

  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={c.s}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} scale={[p.s * 1.25, p.s * 0.8, p.s]} material={c.mat}>
              <icosahedronGeometry args={[0.9, 1]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ---------- 天空环境贴图：让海面等材质反射天空、太阳、月亮 ----------
export function SkyEnv() {
  const gl = useThree((s) => s.gl)
  const st = useRef({ pmrem: null, rt: null, acc: 99 })
  const env = useMemo(() => {
    const scene = new THREE.Scene()
    const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 16), makeSkyMaterial())
    const sun = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.6, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2b0').multiplyScalar(9), toneMapped: false }),
    )
    const moon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d0').multiplyScalar(5), toneMapped: false }),
    )
    scene.add(dome, sun, moon)
    return { scene, dome, sun, moon }
  }, [])

  useEffect(() => {
    const s = st.current
    s.pmrem = new THREE.PMREMGenerator(gl)
    return () => {
      s.pmrem.dispose()
      s.rt?.dispose()
      s.pmrem = s.rt = null
      s.acc = 99
    }
  }, [gl])

  useFrame((_, dt) => {
    const s = st.current
    s.acc += dt
    if (!s.pmrem || s.acc < 0.5) return // 天色变化缓慢，半秒更新一次足够
    s.acc = 0
    applySkyUniforms(env.dome.material)
    env.sun.position.copy(mood.sunDir).multiplyScalar(88)
    env.sun.visible = mood.sunDir.y > -0.1
    env.moon.position.copy(mood.moonDir).multiplyScalar(88)
    env.moon.visible = mood.night > 0.2
    const rt = s.pmrem.fromScene(env.scene, 0, 0.1, 300)
    const old = s.rt
    s.rt = rt
    envMats.forEach((m) => {
      if (!m.envMap) m.needsUpdate = true
      m.envMap = rt.texture
    })
    old?.dispose()
  })
  return null
}
