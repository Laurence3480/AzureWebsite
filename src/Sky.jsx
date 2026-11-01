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

// ---------- 云：体积感软云（参考 MC 官方光影的质感） ----------
// 边缘按视角柔和渐隐；受光面亮、背光面偏蓝灰；光源在云后面时，边缘透出光（逆光散射）。
const CLOUD_N = 28
const SPAN = 75 // 云在视点周围 ±SPAN 的范围内循环，走远了会自然补上新的

const cloudVert = /* glsl */ `
  varying vec3 vW;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`
const cloudFrag = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uSunCol;
  uniform vec3 uMoonCol;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform float uSunK;
  uniform float uMoonK;
  uniform float uOpacity;
  varying vec3 vW;
  #include <fog_pars_fragment>
  void main() {
    // 用屏幕空间导数求面法线：每个三角面一个明确的亮度，云就有了水晶般的几何切面
    vec3 V = normalize(cameraPosition - vW);
    vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
    if (dot(N, V) < 0.0) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    // 受光：包裹式漫反射，让背光面也不至于死黑
    float s = dot(N, uSunDir) * 0.5 + 0.5;
    float m = dot(N, uMoonDir) * 0.5 + 0.5;
    float lit = clamp(s * s * uSunK + m * m * uMoonK * 0.6, 0.0, 1.0);
    vec3 col = mix(uShade, uLit, 0.12 + 0.88 * lit);

    // 逆光透射：光源在云的后方（相对相机）时，越靠边缘越亮
    float back = pow(max(dot(-V, uSunDir), 0.0), 3.0);
    float rim = pow(1.0 - ndv, 1.4);
    col += uSunCol * uSunK * back * (0.28 + 1.1 * rim);
    float backM = pow(max(dot(-V, uMoonDir), 0.0), 3.0);
    col += uMoonCol * uMoonK * backM * (0.1 + 0.5 * rim);

    float alpha = uOpacity * (0.72 + 0.28 * pow(ndv, 0.6));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

const MOON_TINT = new THREE.Color('#9db4ff')
const cloudGeo = new THREE.IcosahedronGeometry(1, 1) // 细分 1：80 个面，切面分明

export function Clouds() {
  const controls = useThree((s) => s.controls)
  const refs = useRef([])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uSunDir: { value: new THREE.Vector3(0, 1, 0) },
            uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
            uSunCol: { value: new THREE.Color() },
            uMoonCol: { value: new THREE.Color() },
            uLit: { value: new THREE.Color() },
            uShade: { value: new THREE.Color() },
            uSunK: { value: 1 },
            uMoonK: { value: 0 },
            uOpacity: { value: 0.92 },
          },
        ]),
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    [],
  )
  const clouds = useMemo(() => {
    const rand = mulberry32(777)
    return Array.from({ length: CLOUD_N }, () => {
      const w = 2.2 + rand() * 2.2 // 云团长度
      const n = 7 + Math.floor(rand() * 4)
      return {
        x: (rand() - 0.5) * SPAN * 2,
        z: (rand() - 0.5) * SPAN * 2,
        y: -7 + rand() * 11, // 集中在地平线附近的视野里
        s: 1.1 + rand() * 1.5,
        v: 0.12 + rand() * 0.22,
        phase: rand() * 6.28,
        // 中间大、两头小；整体压扁，底部更平
        puffs: Array.from({ length: n }, (_, k) => {
          const u = n === 1 ? 0 : k / (n - 1) - 0.5
          const size = (1 - Math.abs(u) * 1.1) * (0.75 + rand() * 0.45)
          return { x: u * w * 2, y: size * 0.25 + (rand() - 0.3) * 0.25, z: (rand() - 0.5) * 1.3, r: 0.55 + size * 0.7 }
        }),
      }
    })
  }, [])
  useEffect(() => () => mat.dispose(), [mat])

  useFrame((s, delta) => {
    const dt = Math.min(delta, 0.1)
    const tgt = controls?.target ?? ZERO
    const t = s.clock.elapsedTime
    clouds.forEach((c, i) => {
      c.x += c.v * dt
      // 环绕视点循环
      c.x = tgt.x + ((((c.x - tgt.x + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN
      c.z = tgt.z + ((((c.z - tgt.z + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN
      refs.current[i].position.set(c.x, c.y + Math.sin(t * 0.2 + c.phase) * 0.3, c.z)
    })

    const u = mat.uniforms
    const sunUp = THREE.MathUtils.smoothstep(mood.sunDir.y, -0.08, 0.3)
    u.uSunDir.value.copy(mood.sunDir)
    u.uMoonDir.value.copy(mood.moonDir)
    u.uSunCol.value.copy(mood.sunColor)
    u.uMoonCol.value.copy(MOON_TINT)
    u.uSunK.value = sunUp
    u.uMoonK.value = mood.night
    u.uLit.value.copy(mood.cloud).multiplyScalar(1.12)
    // 背光面：取天空环境色，偏蓝灰（MC 光影里云底的颜色）
    u.uShade.value.copy(mood.amb).lerp(mood.top, 0.4).multiplyScalar(0.62 * (0.4 + 0.6 * (1 - mood.night)))
  })

  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={c.s}>
          {c.puffs.map((p, k) => (
            <mesh key={k} geometry={cloudGeo} material={mat} position={[p.x, p.y, p.z]} scale={[p.r * 1.35, p.r * 0.78, p.r]} />
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
