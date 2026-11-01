// 程序化世界：把无限平面按格子切开，每个格子由坐标决定性地生成（或不生成）一座岛。
// 同样的坐标永远长一样，所以走远了再回来，岛还在原处。
export const CELL = 24
export const RADIUS = 2 // 以视点为中心，向四周生成多少格

export function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FLOWER_COLORS = ['#ff9ec0', '#ffe28a', '#ffffff', '#b9a4ff']
const GRASS = {
  meadow: '#93d17f',
  blossom: '#a9dc8f',
  pine: '#7cc49a',
  rocky: '#9bbd90',
  cabin: '#93d17f',
  tiny: '#98d684',
}
const ROCK = ['#9a8aa8', '#8f93ad', '#a894a0', '#8aa0a8']

const HOME = {
  id: 'home',
  home: true,
  x: 0,
  y: 0,
  z: 0,
  r: 3.6,
  seed: 1,
  phase: 0,
  kind: 'meadow',
  grass: GRASS.meadow,
  rock: ROCK[0],
  cabin: { x: -0.5, z: -0.2, rot: 0.55, light: true },
  trees: [
    { t: 'pine', x: 2.1, z: -1.4, s: 1.15, ry: 0.3, v: 0 },
    { t: 'pine', x: 2.7, z: 0.5, s: 0.8, ry: 1.1, v: 1 },
    { t: 'pine', x: -2.3, z: -1.9, s: 1.0, ry: 2.0, v: 0 },
    { t: 'pine', x: 0.6, z: -2.6, s: 0.9, ry: 0.7, v: 1 },
    { t: 'blossom', x: 1.7, z: 1.9, s: 1.0, ry: 0.4, v: 0 },
    { t: 'blossom', x: -2.7, z: 0.6, s: 1.15, ry: 1.5, v: 1 },
  ],
  rocks: [
    { x: 1.1, z: 2.3, s: 1, v: 0 },
    { x: -2.3, z: 2.0, s: 0.7, v: 1 },
    { x: 2.9, z: -0.6, s: 0.8, v: 0 },
  ],
  flowers: Array.from({ length: 26 }, (_, i) => {
    const a = i * 2.399 + 0.5
    const d = 1.2 + ((i * 53) % 21) / 10
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, c: FLOWER_COLORS[i % 4] }
  }),
  debris: [
    { p: [4.8, 0.6, 1.2], s: 0.7 },
    { p: [-4.6, 1.2, -1.2], s: 0.5 },
    { p: [3.4, -1.4, -3.6], s: 0.4 },
    { p: [-3.0, -0.4, 4.2], s: 0.55 },
  ],
  fireflies: 38,
}

function pick(rand, table) {
  let r = rand()
  for (const [k, w] of table) {
    if ((r -= w) < 0) return k
  }
  return table[0][0]
}

function makeIsland(cx, cz) {
  const rand = mulberry32((cx * 73856093) ^ (cz * 19349663) ^ 0x9e3779b9)
  if (rand() > 0.74) return null

  const x = cx * 24 + (rand() - 0.5) * CELL * 0.5
  const z = cz * 24 + (rand() - 0.5) * CELL * 0.5
  const y = (rand() - 0.5) * 5
  const r = 1.3 + rand() * rand() * 2.6 + rand() * 0.8

  let kind = r < 1.8 ? 'tiny' : pick(rand, [['meadow', 0.32], ['blossom', 0.22], ['pine', 0.24], ['rocky', 0.12], ['cabin', 0.1]])
  if (kind === 'cabin' && r < 2.4) kind = 'meadow'

  const spec = {
    id: `${cx},${cz}`,
    x,
    y,
    z,
    r,
    seed: Math.floor(rand() * 1e6),
    phase: rand() * 6.28,
    kind,
    grass: GRASS[kind],
    rock: ROCK[Math.floor(rand() * ROCK.length)],
    cabin: null,
    trees: [],
    rocks: [],
    flowers: [],
    debris: [],
    fireflies: Math.round(r * 3),
  }

  const placed = []
  const place = (rad) => {
    for (let k = 0; k < 40; k++) {
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * r * 0.78
      const px = Math.cos(a) * d
      const pz = Math.sin(a) * d
      if (placed.every((o) => Math.hypot(o.x - px, o.z - pz) > o.rad + rad)) {
        placed.push({ x: px, z: pz, rad })
        return { x: px, z: pz }
      }
    }
    return null
  }

  if (kind === 'cabin') {
    const ca = rand() * 6.28
    spec.cabin = { x: Math.cos(ca) * r * 0.12, z: Math.sin(ca) * r * 0.12, rot: rand() * 6.28, light: false }
    placed.push({ x: spec.cabin.x, z: spec.cabin.z, rad: 1.15 })
  }

  const treeCount = { tiny: 1, meadow: r * 1.3, blossom: r * 1.4, pine: r * 2, rocky: r * 0.5, cabin: r * 1.1 }[kind]
  const treeMix = { blossom: 0.85, pine: 0.1, meadow: 0.5, cabin: 0.5, tiny: 0.5, rocky: 0.0 }[kind]
  for (let i = 0; i < Math.round(treeCount); i++) {
    const s = (0.75 + rand() * 0.5) * Math.min(1.05, 0.62 + r * 0.14)
    const p = place(0.5 * s)
    if (p) spec.trees.push({ t: rand() < treeMix ? 'blossom' : 'pine', ...p, s, ry: rand() * 6.28, v: rand() < 0.5 ? 0 : 1 })
  }

  const rockCount = kind === 'rocky' ? Math.round(r * 1.6) : rand() < 0.6 ? 1 + Math.floor(rand() * 2) : 0
  for (let i = 0; i < rockCount; i++) {
    const s = 0.6 + rand() * 0.8
    const p = place(0.3 * s)
    if (p) spec.rocks.push({ ...p, s, v: rand() < 0.5 ? 0 : 1 })
  }

  if (kind !== 'rocky') {
    const n = Math.min(24, Math.round(r * r * 0.9))
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.28
      const d = Math.sqrt(rand()) * r * 0.85
      spec.flowers.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, c: FLOWER_COLORS[Math.floor(rand() * 4)] })
    }
  }

  const debrisN = Math.floor(rand() * 3)
  for (let i = 0; i < debrisN; i++) {
    const a = rand() * 6.28
    spec.debris.push({ p: [Math.cos(a) * (r + 1.2), rand() * 1.6 - 0.6, Math.sin(a) * (r + 1.2)], s: 0.3 + rand() * 0.4 })
  }
  return spec
}

const cache = new Map()
export function islandAt(cx, cz) {
  if (cx === 0 && cz === 0) return HOME
  const k = `${cx},${cz}`
  if (!cache.has(k)) cache.set(k, makeIsland(cx, cz))
  return cache.get(k)
}

export function islandsAround(cx, cz, R = RADIUS) {
  const out = []
  for (let i = cx - R; i <= cx + R; i++) {
    for (let j = cz - R; j <= cz + R; j++) {
      const s = islandAt(i, j)
      if (s) out.push(s)
    }
  }
  return out
}
