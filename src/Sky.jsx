import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clock, mood, updateMood, makeGlowTexture } from './mood'

// 驱动时间、光照、雾色的总控
export function Rig({ onSky }) {
  const scene = useThree((s) => s.scene)
  const sun = useRef()
  const moon = useRef()
  const hemi = useRef()

  useEffect(() => {
    scene.fog = new THREE.Fog('#ffffff', 26, 88)
    scene.background = new THREE.Color('#000000')
  }, [scene])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1)
    if (clock.auto) clock.hour = (clock.hour + dt * clock.speed) % 24
    updateMood(clock.hour)

    scene.fog.color.copy(mood.hor)
    scene.background.copy(mood.hor)

    sun.current.position.copy(mood.sunDir).multiplyScalar(34)
    sun.current.intensity = mood.sunI
    sun.current.color.copy(mood.sunColor)

    moon.current.position.copy(mood.moonDir).multiplyScalar(34)
    moon.current.intensity = mood.moonI
    moon.current.color.set('#9db4ff')

    hemi.current.color.copy(mood.amb)
    hemi.current.groundColor.copy(mood.water).lerp(mood.hor, 0.5)
    hemi.current.intensity = mood.ambI * (1 + mood.night * 0.5)
    onSky?.()
  })

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <directionalLight ref={moon} />
    </>
  )
}

const domeVert = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const domeFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uGlow;
  varying vec3 vPos;
  void main() {
    vec3 d = normalize(vPos);
    float t = smoothstep(-0.05, 0.65, d.y);
    vec3 c = mix(uHor, uTop, t);
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    c += uSunColor * (pow(s, 28.0) * 0.55 + pow(s, 5.0) * 0.16) * uGlow;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function SkyDome({ onSkyClick }) {
  const mat = useRef()
  const sunDisc = useRef()
  const moonDisc = useRef()
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uSunColor: { value: new THREE.Color() },
      uGlow: { value: 1 },
    }),
    [],
  )

  useFrame(() => {
    const u = mat.current.uniforms
    u.uTop.value.copy(mood.top)
    u.uHor.value.copy(mood.hor)
    u.uSunDir.value.copy(mood.sunDir)
    u.uSunColor.value.copy(mood.sunColor)
    u.uGlow.value = Math.min(1, Math.max(0, (mood.sunDir.y + 0.25) / 0.35))

    sunDisc.current.position.copy(mood.sunDir).multiplyScalar(88)
    moonDisc.current.position.copy(mood.moonDir).multiplyScalar(88)
    moonDisc.current.material.opacity = mood.night
  })

  return (
    <group>
      <mesh renderOrder={-10} onClick={onSkyClick}>
        <sphereGeometry args={[100, 32, 20]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={domeVert}
          fragmentShader={domeFrag}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh ref={sunDisc} renderOrder={-9}>
        <icosahedronGeometry args={[3.6, 1]} />
        <meshBasicMaterial color={new THREE.Color('#ffe2b0').multiplyScalar(1.6)} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={moonDisc} renderOrder={-9}>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial
          color={new THREE.Color('#fff1d0').multiplyScalar(1.4)}
          toneMapped={false}
          fog={false}
          transparent
        />
      </mesh>
    </group>
  )
}

export function Stars() {
  const mat = useRef()
  const tex = useMemo(() => makeGlowTexture(), [])
  const geo = useMemo(() => {
    const n = 420
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = Math.random()
      const v = Math.random()
      const th = u * Math.PI * 2
      const y = 0.08 + v * 0.92 // 只在上半球
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
    <points geometry={geo} renderOrder={-8}>
      <pointsMaterial
        ref={mat}
        map={tex}
        size={3}
        sizeAttenuation={false}
        transparent
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </points>
  )
}

const CLOUD_SEEDS = [
  { r: 12, a: 0.3, y: 2.6, s: 1.0, v: 0.016 },
  { r: 18, a: 1.4, y: 5, s: 1.6, v: 0.01 },
  { r: 14, a: 2.5, y: 0.8, s: 1.0, v: 0.018 },
  { r: 22, a: 3.4, y: 6, s: 2.0, v: 0.008 },
  { r: 11, a: 4.3, y: 3.8, s: 0.9, v: 0.014 },
  { r: 16, a: 5.2, y: -0.6, s: 1.3, v: 0.012 },
  { r: 24, a: 0.9, y: 3, s: 2.2, v: 0.007 },
  { r: 13, a: 3.9, y: -2.4, s: 1.1, v: 0.013 },
]

const cloudMat = new THREE.MeshLambertMaterial({ flatShading: true, fog: true })

export function Clouds() {
  const refs = useRef([])
  const puffs = useMemo(
    () =>
      CLOUD_SEEDS.map((c, i) =>
        [0, 1, 2, 3, 4].map((k) => ({
          x: (k - 2) * 0.9 + Math.sin(i * 7 + k) * 0.3,
          y: Math.cos(k * 1.7 + i) * 0.25 + (k === 2 ? 0.35 : 0),
          z: Math.sin(k * 2.3 + i * 3) * 0.5,
          s: 0.8 + ((k * 37 + i * 11) % 10) / 14 - (k === 0 || k === 4 ? 0.25 : 0),
        })),
      ),
    [],
  )
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1)
    cloudMat.color.copy(mood.cloud)
    cloudMat.emissive.copy(mood.cloud).multiplyScalar(0.45)
    CLOUD_SEEDS.forEach((c, i) => {
      c.a += c.v * dt
      const g = refs.current[i]
      if (!g) return
      g.position.set(Math.cos(c.a) * c.r, c.y + Math.sin(c.a * 9 + i) * 0.25, Math.sin(c.a) * c.r)
      g.rotation.y = -c.a
    })
  })
  return (
    <group>
      {CLOUD_SEEDS.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={c.s}>
          {puffs[i].map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} scale={[p.s * 1.25, p.s * 0.8, p.s]} material={cloudMat}>
              <icosahedronGeometry args={[0.9, 1]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
