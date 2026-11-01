import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { clock } from './mood'
import { Rig, SkyDome, Stars, Clouds } from './Sky'
import Island from './Island'
import { Sea, Ripple } from './Sea'
import { Fireflies, Lantern } from './Magic'
import Drive from './Drive'
import './App.css'

let uid = 0

function World() {
  const [ripples, setRipples] = useState([])
  const [lanterns, setLanterns] = useState([])

  const onSea = useCallback((e) => {
    if (e.delta > 4) return // 拖动旋转视角时不算点击
    setRipples((r) => [...r.slice(-6), { id: ++uid, x: e.point.x, z: e.point.z }])
  }, [])

  const onSky = useCallback((e) => {
    if (e.delta > 4) return
    setLanterns((l) => [
      ...l.slice(-11),
      { id: ++uid, x: (Math.random() - 0.5) * 3, y: 1.8 + Math.random() * 0.6, z: (Math.random() - 0.5) * 2.5 },
    ])
  }, [])

  return (
    <>
      <Rig />
      <SkyDome onSkyClick={onSky} />
      <Stars />
      <Clouds />
      <Island />
      <Sea onSeaClick={onSea} />
      <Fireflies />
      {ripples.map((r) => (
        <Ripple key={r.id} x={r.x} z={r.z} onDone={() => setRipples((a) => a.filter((i) => i.id !== r.id))} />
      ))}
      {lanterns.map((l) => (
        <Lantern key={l.id} x={l.x} y={l.y} z={l.z} onDone={() => setLanterns((a) => a.filter((i) => i.id !== l.id))} />
      ))}
      <OrbitControls
        target={[0, -1.6, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={9}
        maxDistance={24}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2 - 0.04}
        rotateSpeed={0.5}
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

const fmt = (h) => {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function Controls() {
  const [hour, setHour] = useState(clock.hour)
  const [auto, setAuto] = useState(clock.auto)
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
      <Canvas shadows dpr={[1, 2]} camera={{ position: [10.5, 3.2, 12.5], fov: 42, near: 0.1, far: 400 }}>
        <World />
      </Canvas>
      <header className="title">
        <h1>漂浮小岛</h1>
        <p>拖动旋转 · 点击天空放飞孔明灯 · 点击海面泛起涟漪</p>
      </header>
      <button className="drive-btn" onClick={() => toggle(true)} onPointerDown={(e) => e.stopPropagation()}>
        岛上仓库
      </button>
      <Controls />
      {driveOpen && <Drive onClose={() => toggle(false)} />}
    </div>
  )
}
