import * as THREE from 'three'

// 时间状态：UI 与场景共享（不走 React 状态，避免每帧重渲染）
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
const qh = parseFloat(q.get('t'))

export const clock = {
  hour: Number.isFinite(qh) ? qh : 17.3, // 默认停在黄昏；?t=小时 可指定并暂停
  auto: !Number.isFinite(qh),
  speed: 24 / 150, // 每秒走多少"小时"，150 秒一整天
}

// 每个关键时刻的色调：top 天顶 / hor 地平线 / amb 环境光 / water 海面
const KEYS = [
  { h: 0, top: '#070b24', hor: '#1f2556', amb: '#4a5aa8', ambI: 0.55, water: '#142347' },
  { h: 4.8, top: '#1c2656', hor: '#5a4a8a', amb: '#5a64a8', ambI: 0.6, water: '#233466' },
  { h: 6.4, top: '#8fc0dc', hor: '#ffc9b8', amb: '#cfd8ec', ambI: 0.8, water: '#7fb6c4' },
  { h: 9, top: '#74c6e8', hor: '#dff3ee', amb: '#d6ecff', ambI: 0.95, water: '#58b9c4' },
  { h: 13, top: '#6fc3ec', hor: '#e8f7f2', amb: '#d8eeff', ambI: 1.0, water: '#4fb5c2' },
  { h: 16.5, top: '#7fb0dc', hor: '#ffe0bd', amb: '#f0dccf', ambI: 0.85, water: '#6aa8c0' },
  { h: 17.8, top: '#7a5ca8', hor: '#ff9f80', amb: '#d4a6dc', ambI: 0.72, water: '#8a6fb0' },
  { h: 19.3, top: '#352a6c', hor: '#b2527e', amb: '#8a6cc0', ambI: 0.6, water: '#4a3f86' },
  { h: 21, top: '#12163e', hor: '#2c2f68', amb: '#4a5aa8', ambI: 0.55, water: '#1c2c58' },
  { h: 24, top: '#070b24', hor: '#1f2556', amb: '#4a5aa8', ambI: 0.55, water: '#142347' },
]

const parsed = KEYS.map((k) => ({
  h: k.h,
  top: new THREE.Color(k.top),
  hor: new THREE.Color(k.hor),
  amb: new THREE.Color(k.amb),
  ambI: k.ambI,
  water: new THREE.Color(k.water),
}))

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// 当前时刻的氛围（每帧更新，所有组件读取）
export const mood = {
  top: new THREE.Color(),
  hor: new THREE.Color(),
  amb: new THREE.Color(),
  ambI: 1,
  water: new THREE.Color(),
  sunDir: new THREE.Vector3(),
  moonDir: new THREE.Vector3(),
  sunColor: new THREE.Color(),
  sunI: 0,
  moonI: 0,
  night: 0, // 0 白天 → 1 深夜
  cloud: new THREE.Color(),
}

const WARM = new THREE.Color('#ff9a66')
const WHITE = new THREE.Color('#fff4de')

export function updateMood(hour) {
  let i = 0
  while (i < parsed.length - 2 && hour >= parsed[i + 1].h) i++
  const a = parsed[i]
  const b = parsed[i + 1]
  const t = smooth(0, 1, (hour - a.h) / (b.h - a.h))

  mood.top.copy(a.top).lerp(b.top, t)
  mood.hor.copy(a.hor).lerp(b.hor, t)
  mood.amb.copy(a.amb).lerp(b.amb, t)
  mood.water.copy(a.water).lerp(b.water, t)
  mood.ambI = a.ambI + (b.ambI - a.ambI) * t

  const ang = ((hour - 6) / 24) * Math.PI * 2
  const height = Math.sin(ang)
  mood.sunDir.set(Math.cos(ang) * 0.9, height, -0.2).normalize()
  mood.moonDir.set(-Math.cos(ang) * 0.9, -height, 0.3).normalize()

  mood.night = 1 - smooth(-0.2, 0.25, height)
  mood.sunI = 2.4 * smooth(0, 0.45, height)
  mood.moonI = 0.7 * smooth(0.0, -0.35, height)
  mood.sunColor.copy(WARM).lerp(WHITE, smooth(0.05, 0.6, height))

  // 云：白天偏白，黄昏染上地平线的颜色，夜里变暗
  mood.cloud.copy(mood.hor).lerp(WHITE, 0.55 * (1 - mood.night))
  mood.cloud.multiplyScalar(0.62 + 0.38 * (1 - mood.night))
}

// ---- 低多边形工具 ----
// 对相同坐标的顶点给出相同的抖动，保证网格接缝不裂开
const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

export function lowpoly(geo, { color, variance = 0.06, jitter = 0, jitterY = jitter, seed = 0 }) {
  const g = geo.toNonIndexed()
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    pos.setXYZ(
      i,
      x + (hash3(x + seed, y, z) - 0.5) * 2 * jitter,
      y + (hash3(x, y + seed, z + 1) - 0.5) * 2 * jitterY,
      z + (hash3(x + 2, y, z + seed) - 0.5) * 2 * jitter,
    )
  }
  const base = new THREE.Color(color)
  const hsl = {}
  base.getHSL(hsl)
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let f = 0; f < pos.count; f += 3) {
    const r = hash3(f * 0.37 + seed, f * 1.13, 7.7)
    c.setHSL(hsl.h + (r - 0.5) * 0.02, hsl.s, Math.min(1, Math.max(0, hsl.l + (r - 0.5) * 2 * variance)))
    for (let k = 0; k < 3; k++) c.toArray(colors, (f + k) * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

// 柔光圆点贴图（萤火虫、星星用）
export function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
