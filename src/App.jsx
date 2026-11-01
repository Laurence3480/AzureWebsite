import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { actions, clock } from './mood'
import { Rig, SkyDome, Clouds, SkyEnv } from './Sky'
import Island from './Island'
import { Sea, Ripple } from './Sea'
import { Lantern } from './Magic'
import { CELL, RADIUS, islandsAround } from './world'
import Drive from './Drive'
import './App.css'

let uid = 0
const HOME_TARGET = [0, -1.6, 0]
const HOME_CAM = [10.5, 3.2, 12.5]

// 以视点所在格子为中心，动态生成/回收周围的岛
function Islands() {
  const controls = useThree((s) => s.controls)
  const [cell, setCell] = useState([0, 0])
  const last = useRef('0,0')
  useFrame(() => {
    if (!controls) return
    const cx = Math.round(controls.target.x / CELL)
    const cz = Math.round(controls.target.z / CELL)
    const k = `${cx},${cz}`
    if (k !== last.current) {
      last.current = k
      setCell([cx, cz])
    }
  })
  const specs = useMemo(() => islandsAround(cell[0], cell[1], RADIUS), [cell])
  return specs.map((s) => <Island key={s.id} spec={s} />)
}

function World() {
  const [ripples, setRipples] = useState([])
  const [lanterns, setLanterns] = useState([])
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const ctl = useRef()

  const onSea = useCallback((e) => {
    if (e.delta > 4) return // 拖动旋转视角时不算点击
    setRipples((r) => [...r.slice(-6), { id: ++uid, x: e.point.x, z: e.point.z }])
  }, [])

  const onSky = useCallback(
    (e) => {
      if (e.delta > 4) return
      const c = controls?.target
      const bx = c ? c.x : 0
      const bz = c ? c.z : 0
      setLanterns((l) => [
        ...l.slice(-11),
        { id: ++uid, x: bx + (Math.random() - 0.5) * 4, y: 1.8 + Math.random() * 0.6, z: bz + (Math.random() - 0.5) * 3 },
      ])
    },
    [controls],
  )

  useEffect(() => {
    if (!ctl.current) return
    ctl.current.listenToKeyEvents(window) // 方向键平移
    actions.goHome = () => {
      ctl.current.target.set(...HOME_TARGET)
      camera.position.set(...HOME_CAM)
      ctl.current.update()
    }
    return () => {
      delete actions.goHome
    }
  }, [camera])

  return (
    <>
      <Rig />
      <SkyEnv />
      <SkyDome onSkyClick={onSky} />
      <Clouds />
      <Islands />
      <Sea onSeaClick={onSea} />
      {ripples.map((r) => (
        <Ripple key={r.id} x={r.x} z={r.z} onDone={() => setRipples((a) => a.filter((i) => i.id !== r.id))} />
      ))}
      {lanterns.map((l) => (
        <Lantern key={l.id} x={l.x} y={l.y} z={l.z} onDone={() => setLanterns((a) => a.filter((i) => i.id !== l.id))} />
      ))}
      <OrbitControls
        ref={ctl}
        makeDefault
        target={HOME_TARGET}
        enablePan
        screenSpacePanning={false}
        keyPanSpeed={24}
        enableDamping
        dampingFactor={0.06}
        minDistance={9}
        maxDistance={36}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2 - 0.04}
        rotateSpeed={0.5}
        panSpeed={0.9}
        autoRotate
        autoRotateSpeed={0.25}
      />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette offset={0.32} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

const PRESETS = [
  ['清晨', 6.6],
  ['正午', 12],
  ['黄昏', 17.4],
  ['深夜', 23],
]
const SPEEDS = [1, 4, 16]

const fmt = (h) => {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function Controls() {
  const [hour, setHour] = useState(clock.hour)
  const [auto, setAuto] = useState(clock.auto)
  const [mul, setMul] = useState(clock.mul)
  const dragging = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      if (!dragging.current) setHour(clock.hour)
    }, 80)
    return () => clearInterval(id)
  }, [])

  const set = (h) => {
    clock.hour = h
    setHour(h)
  }

  return (
    <div className="panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="row">
        <span className="time">{fmt(hour)}</span>
        <input
          type="range"
          min="0"
          max="24"
          step="0.01"
          value={hour}
          onPointerDown={() => (dragging.current = true)}
          onPointerUp={() => (dragging.current = false)}
          onChange={(e) => set(parseFloat(e.target.value) % 24)}
          aria-label="时间"
        />
        <button
          className={auto ? 'on' : ''}
          onClick={() => {
            clock.auto = !clock.auto
            setAuto(clock.auto)
          }}
        >
          {auto ? '流动中' : '已暂停'}
        </button>
        <button
          title="时间流动速度"
          onClick={() => {
            clock.mul = SPEEDS[(SPEEDS.indexOf(clock.mul) + 1) % SPEEDS.length]
            setMul(clock.mul)
          }}
        >
          ×{mul}
        </button>
      </div>
      <div className="row presets">
        {PRESETS.map(([name, h]) => (
          <button key={name} onClick={() => set(h)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [driveOpen, setDriveOpen] = useState(() => location.hash === '#drive')
  const toggle = useCallback((open) => {
    setDriveOpen(open)
    history.replaceState(null, '', open ? '#drive' : location.pathname + location.search)
  }, [])

  return (
    <div className="app">
      <Canvas shadows dpr={[1, 2]} camera={{ position: HOME_CAM, fov: 42, near: 0.1, far: 400 }}>
        <World />
      </Canvas>
      <header className="title">
        <h1>漂浮小岛</h1>
        <p>拖动旋转 · 右键 / 双指拖动去远方 · 点天空放灯 · 点海面泛涟漪</p>
      </header>
      <div className="topbar" onPointerDown={(e) => e.stopPropagation()}>
        <button className="drive-btn" onClick={() => actions.goHome?.()}>
          回小屋
        </button>
        <button className="drive-btn" onClick={() => toggle(true)}>
          岛上仓库
        </button>
      </div>
      <Controls />
      {driveOpen && <Drive onClose={() => toggle(false)} />}
    </div>
  )
}
