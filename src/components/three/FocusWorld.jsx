import { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Stars } from '@react-three/drei'

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const seg = (g, a, b) => clamp((g - a) / (b - a), 0, 1)
const smooth = (t) => t * t * (3 - 2 * t)
const grey = '#6b7280'
const TRUNK = '#8a5a3c'
const GREENS = ['#2b8a3e', '#2f9e44', '#37b24d', '#40c057', '#51cf66', '#66a80f', '#5c940d', '#188a5a']
const BLOOMS = ['#f43f5e', '#fb7185', '#f59e0b', '#fbbf24', '#a855f7', '#c084fc', '#38bdf8', '#f9a8d4', '#ffffff']
const AUTUMN = ['#e8590c', '#f76707', '#f08c00', '#e67700', '#d9480f', '#fab005'] // maple foliage
const SAKURA = ['#f9a8d4', '#fbc4d4', '#fda4af', '#f4a6c0', '#ffd6e8']           // cherry blossom
const ROSE = ['#e11d48', '#f43f5e', '#fb7185', '#be123c', '#fda4af']             // rose blooms
const PURPLE = ['#7c3aed', '#8b5cf6', '#a855f7', '#9333ea', '#c084fc']           // lavender

// deterministic per-plant variation from a seed string
function makeRng(seed) {
  let h = 2166136261
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

// ---- a single plant, driven by `growth` (0..1) ----
function Plant({ type, growth = 1, dead = false, seed = 'x' }) {
  const r = useMemo(() => makeRng(seed), [seed])
  const [a, b, cIdx] = useMemo(() => [r(), r(), r()], [r])
  // several blooms per flowering plant (position, height, own colour)
  const blooms = useMemo(() => {
    const n = 4 + Math.floor(r() * 3) // 4..6
    return Array.from({ length: n }, () => ({
      ang: r() * Math.PI * 2,
      rad: 0.08 + r() * 0.2,
      h: 0.4 + r() * 0.45,
      t: r(),
    }))
  }, [r])
  const size = (0.85 + 0.3 * a) * (dead ? 0.92 : 1)
  const g = smooth(clamp(growth, 0, 1))
  const trunkC = dead ? grey : TRUNK
  const green = dead ? grey : GREENS[Math.floor(cIdx * GREENS.length)]
  const foliageSet = type === 'maple' ? AUTUMN : type === 'sakura' ? SAKURA : GREENS
  const foliage = dead ? grey : foliageSet[Math.floor(cIdx * foliageSet.length)]

  let body
  if (type === 'pine') {
    const trunkH = 0.3 + 0.25 * b
    body = (
      <group>
        <mesh position={[0, (trunkH * g) / 2, 0]} scale={[1, g, 1]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, trunkH, 6]} />
          <meshStandardMaterial color={trunkC} flatShading />
        </mesh>
        {[0, 1, 2].map((i) => {
          const s = smooth(seg(growth, 0.2 + i * 0.22, 0.5 + i * 0.22))
          return (
            <mesh key={i} position={[0, trunkH + i * 0.32 + (0.5 * s) / 2, 0]} scale={s} castShadow>
              <coneGeometry args={[0.42 - i * 0.1, 0.5, 8]} />
              <meshStandardMaterial color={foliage} flatShading />
            </mesh>
          )
        })}
      </group>
    )
  } else if (type === 'bush') {
    body = (
      <group scale={g}>
        {[[0, 0.22, 0, 0.3], [0.22, 0.18, 0.05, 0.24], [-0.2, 0.16, -0.05, 0.22]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
            <icosahedronGeometry args={[p[3], 0]} />
            <meshStandardMaterial color={foliage} flatShading />
          </mesh>
        ))}
      </group>
    )
  } else if (type === 'tree' || type === 'maple' || type === 'sakura') {
    const isSak = type === 'sakura'
    const trunkH = 0.5 + 0.4 * b + (isSak ? 0.25 : 0)
    const f = smooth(seg(growth, 0.35, 1))
    const clumps = isSak
      ? [[0, 0.32, 0, 0.4], [0.26, 0.16, 0.08, 0.3], [-0.24, 0.18, -0.06, 0.3], [0.04, 0.34, -0.22, 0.26]]
      : [[0, 0.28, 0, 0.42], [0.22, 0.12, 0.1, 0.3]]
    body = (
      <group>
        <mesh position={[0, (trunkH * g) / 2, 0]} scale={[1, g, 1]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, trunkH, 6]} />
          <meshStandardMaterial color={trunkC} flatShading />
        </mesh>
        {clumps.map((p, i) => (
          <mesh key={i} position={[p[0] * f, trunkH + p[1] * f, p[2] * f]} scale={f} castShadow>
            <icosahedronGeometry args={[p[3], 0]} />
            <meshStandardMaterial color={foliage} flatShading />
          </mesh>
        ))}
      </group>
    )
  } else if (type === 'clover') {
    // clover patch: short stems, each topped with 3 leaflets (one lucky 4th)
    const f1 = smooth(seg(growth, 0, 0.55))
    const f2 = smooth(seg(growth, 0.4, 1))
    body = (
      <group>
        {blooms.map((bl, i) => {
          const x = Math.cos(bl.ang) * bl.rad
          const z = Math.sin(bl.ang) * bl.rad
          const h = bl.h * 0.55
          const leaves = i === 0 ? 4 : 3 // first one is a lucky four-leaf
          const leafC = dead ? grey : i === 0 ? '#2f9e44' : '#3fae5a'
          return (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, (h * f1) / 2, 0]} scale={[1, f1, 1]} castShadow>
                <cylinderGeometry args={[0.018, 0.022, h, 5]} />
                <meshStandardMaterial color={dead ? grey : '#37b24d'} flatShading />
              </mesh>
              <group position={[0, h * f1, 0]} scale={f2}>
                {Array.from({ length: leaves }).map((_, k) => {
                  const ang = (k / leaves) * Math.PI * 2
                  return (
                    <mesh key={k} position={[Math.cos(ang) * 0.07, 0, Math.sin(ang) * 0.07]} scale={[1, 0.35, 1]} castShadow>
                      <sphereGeometry args={[0.06, 7, 6]} />
                      <meshStandardMaterial color={leafC} flatShading />
                    </mesh>
                  )
                })}
              </group>
            </group>
          )
        })}
      </group>
    )
  } else {
    // flowering plant: leafy base + SEVERAL blooms; bloom style by species
    const palette = type === 'rose' ? ROSE : type === 'lavender' ? PURPLE : BLOOMS
    const isLav = type === 'lavender'
    const f0 = smooth(seg(growth, 0, 0.3))
    const f1 = smooth(seg(growth, 0, 0.55))
    const f2 = smooth(seg(growth, 0.45, 1))
    body = (
      <group>
        {[[0, 0.12, 0, 0.18], [0.15, 0.09, 0.05, 0.13], [-0.14, 0.08, -0.05, 0.12]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1] * f0, p[2]]} scale={f0} castShadow>
            <icosahedronGeometry args={[p[3], 0]} />
            <meshStandardMaterial color={green} flatShading />
          </mesh>
        ))}
        {blooms.map((bl, i) => {
          const x = Math.cos(bl.ang) * bl.rad
          const z = Math.sin(bl.ang) * bl.rad
          const h = bl.h * (isLav ? 1.35 : 1)
          const col = dead ? grey : palette[Math.floor(bl.t * palette.length)]
          return (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, (h * f1) / 2, 0]} scale={[1, f1, 1]} castShadow>
                <cylinderGeometry args={[0.022, 0.03, h, 5]} />
                <meshStandardMaterial color={green} flatShading />
              </mesh>
              <group position={[0, h * f1, 0]} scale={f2}>
                {type === 'daisy' && (
                  <>
                    <mesh castShadow>
                      <sphereGeometry args={[0.05, 8, 6]} />
                      <meshStandardMaterial color={dead ? grey : '#fbbf24'} flatShading />
                    </mesh>
                    {[0, 1, 2, 3, 4, 5].map((k) => {
                      const a2 = (k / 6) * Math.PI * 2
                      return (
                        <mesh key={k} position={[Math.cos(a2) * 0.09, 0, Math.sin(a2) * 0.09]} scale={[1, 0.3, 1]}>
                          <sphereGeometry args={[0.045, 6, 5]} />
                          <meshStandardMaterial color={col} flatShading />
                        </mesh>
                      )
                    })}
                  </>
                )}
                {type === 'rose' && [0, 1, 2].map((k) => (
                  <mesh key={k} position={[0, k * 0.045, 0]} scale={1 - k * 0.28} castShadow>
                    <sphereGeometry args={[0.085, 8, 7]} />
                    <meshStandardMaterial color={col} flatShading />
                  </mesh>
                ))}
                {isLav && [0, 1, 2, 3, 4].map((k) => (
                  <mesh key={k} position={[0, k * 0.07, 0]} scale={1 - k * 0.14}>
                    <sphereGeometry args={[0.05, 7, 6]} />
                    <meshStandardMaterial color={col} flatShading />
                  </mesh>
                ))}
                {type === 'tulip' && (
                  <mesh position={[0, 0.06, 0]} scale={[0.7, 1.2, 0.7]} castShadow>
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshStandardMaterial color={col} flatShading />
                  </mesh>
                )}
              </group>
            </group>
          )
        })}
      </group>
    )
  }

  return <group scale={size}>{body}</group>
}

// ---- procedural building (city biome) ----
const LANDMARK_TYPES = ['burj', 'eiffel', 'bigben', 'liberty', 'pyramid']
const BUILD_TYPES = ['house', 'shop', 'tower', 'skyscraper', 'hospital', 'school', 'powerplant', 'park', 'mall', 'watertreatment', ...LANDMARK_TYPES]
export const isBuilding = (t) => BUILD_TYPES.includes(t)
const CITY = ['#5c6470', '#6b7280', '#7b8290', '#4b5563', '#8d99ae', '#646e82']
const ROOFS = ['#b3543f', '#c0392b', '#2c6e91', '#3a7d44', '#7d5a3c', '#8e44ad', '#d68910', '#566573', '#1f6f78']

function Building({ type, growth = 1, dead = false, seed = 'x', night = false }) {
  const r = useMemo(() => makeRng(seed), [seed])
  const [, , cIdx, roofIdx] = useMemo(() => [r(), r(), r(), r()], [r])
  const winC = dead ? '#3b3f46' : '#ffd97a'
  const winE = night && !dead ? 1.3 : 0.12
  const g = smooth(clamp(growth, 0, 1))

  // ----- iconic landmarks (bespoke, 60+ min reward) -----
  if (type === 'pyramid') {
    return (
      <group scale={[1, g, 1]}>
        <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.95, 1.1, 4]} />
          <meshStandardMaterial color={dead ? grey : '#d9b382'} flatShading />
        </mesh>
      </group>
    )
  }
  if (type === 'burj') {
    const segs = 6
    let y = 0
    const m = []
    for (let i = 0; i < segs; i++) {
      const w = 0.5 - 0.07 * i
      const hh = 0.5
      const s = smooth(seg(growth, (i / segs) * 0.8, (i / segs) * 0.8 + 0.3))
      const cy = y + (hh * s) / 2
      m.push(
        <group key={i}>
          <mesh position={[0, cy, 0]} scale={[1, s, 1]} castShadow>
            <boxGeometry args={[w, hh, w]} />
            <meshStandardMaterial color={dead ? grey : '#7fa8c9'} flatShading />
          </mesh>
          {s > 0.5 && <mesh position={[0, cy, w / 2]}><boxGeometry args={[w * 0.7, hh * 0.5, 0.02]} /><meshStandardMaterial color={winC} emissive={winC} emissiveIntensity={winE} /></mesh>}
        </group>,
      )
      y += hh
    }
    return (
      <group>
        {m}
        {growth > 0.85 && <mesh position={[0, y + 0.4, 0]}><cylinderGeometry args={[0.008, 0.04, 0.8, 6]} /><meshStandardMaterial color={dead ? grey : '#9fb0c3'} /></mesh>}
      </group>
    )
  }
  if (type === 'eiffel') {
    return (
      <group scale={[1, g, 1]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <coneGeometry args={[0.5, 1.8, 4, 1, true]} />
          <meshStandardMaterial color={dead ? grey : '#7a5a3c'} wireframe />
        </mesh>
        {[0.55, 1.05].map((py, i) => (
          <mesh key={i} position={[0, py, 0]}><boxGeometry args={[0.46 - i * 0.18, 0.04, 0.46 - i * 0.18]} /><meshStandardMaterial color={dead ? grey : '#6b4f32'} flatShading /></mesh>
        ))}
        <mesh position={[0, 1.88, 0]}><cylinderGeometry args={[0.008, 0.02, 0.3, 6]} /><meshStandardMaterial color={dead ? grey : '#6b4f32'} /></mesh>
      </group>
    )
  }
  if (type === 'bigben') {
    return (
      <group scale={[1, g, 1]}>
        <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.5, 1.4, 0.5]} /><meshStandardMaterial color={dead ? grey : '#c9a36a'} flatShading /></mesh>
        <mesh position={[0, 1.2, 0.26]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 16]} /><meshStandardMaterial color={dead ? grey : '#f4ecd8'} emissive={dead ? '#000' : '#f4ecd8'} emissiveIntensity={night ? 0.6 : 0.1} /></mesh>
        <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.32, 0.4, 4]} /><meshStandardMaterial color={dead ? grey : '#2f4f43'} flatShading /></mesh>
      </group>
    )
  }
  if (type === 'liberty') {
    const st = dead ? grey : '#3aa17e'
    return (
      <group scale={g}>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.6, 0.5, 0.6]} /><meshStandardMaterial color={dead ? grey : '#8d8377'} flatShading /></mesh>
        <mesh position={[0, 0.86, 0]} castShadow><cylinderGeometry args={[0.16, 0.26, 0.72, 8]} /><meshStandardMaterial color={st} flatShading /></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color={st} flatShading /></mesh>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2
          return <mesh key={i} position={[Math.cos(a) * 0.13, 1.4, Math.sin(a) * 0.13]}><coneGeometry args={[0.02, 0.1, 4]} /><meshStandardMaterial color={st} flatShading /></mesh>
        })}
        <mesh position={[0.2, 1.2, 0]} rotation={[0, 0, -0.7]}><cylinderGeometry args={[0.028, 0.028, 0.4, 6]} /><meshStandardMaterial color={st} flatShading /></mesh>
        <mesh position={[0.33, 1.4, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#ffd97a" emissive="#ffd97a" emissiveIntensity={1.6} /></mesh>
      </group>
    )
  }

  if (type === 'park') {
    const trees = [[-0.22, 0.18], [0.24, -0.16], [0.06, 0.3]]
    return (
      <group>
        <mesh position={[0, 0.01, 0]} receiveShadow><cylinderGeometry args={[0.55, 0.55, 0.04, 20]} /><meshStandardMaterial color={dead ? grey : '#3a7d44'} flatShading /></mesh>
        {trees.map((p, i) => {
          const s = smooth(seg(growth, i * 0.2, i * 0.2 + 0.45))
          return (
            <group key={i} position={[p[0], 0, p[1]]} scale={s}>
              <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 0.3, 5]} /><meshStandardMaterial color={dead ? grey : '#8a5a3c'} /></mesh>
              <mesh position={[0, 0.4, 0]} castShadow><icosahedronGeometry args={[0.18, 0]} /><meshStandardMaterial color={dead ? grey : '#2f9e44'} flatShading /></mesh>
            </group>
          )
        })}
        <mesh position={[0, 0.06, -0.28]} scale={g}><boxGeometry args={[0.22, 0.04, 0.07]} /><meshStandardMaterial color={dead ? grey : '#7d5a3c'} /></mesh>
      </group>
    )
  }
  if (type === 'watertreatment') {
    const tanks = [[0.22, 0.18], [0.22, -0.28], [-0.02, -0.06]]
    return (
      <group scale={[1, g, 1]}>
        <mesh position={[-0.38, 0.2, 0.05]} castShadow><boxGeometry args={[0.4, 0.4, 0.5]} /><meshStandardMaterial color={dead ? grey : '#aeb4bd'} flatShading /></mesh>
        {tanks.map((p, i) => (
          <group key={i} position={[p[0], 0, p[1]]}>
            <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.24, 16]} /><meshStandardMaterial color={dead ? grey : '#9aa1ad'} flatShading /></mesh>
            <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 16]} /><meshStandardMaterial color={dead ? grey : '#4dabf7'} transparent opacity={0.9} /></mesh>
          </group>
        ))}
      </group>
    )
  }

  // ----- regular stacked buildings -----
  const wall = dead ? grey
    : type === 'hospital' ? '#e8eaed'
    : type === 'school' ? '#b5734a'
    : type === 'powerplant' ? '#aeb4bd'
    : type === 'mall' ? '#8d99ae'
    : CITY[Math.floor(cIdx * CITY.length)]
  const roofColor = dead ? grey : ROOFS[Math.floor(roofIdx * ROOFS.length)]

  let floors = []
  let roof = false
  let antenna = false
  if (type === 'house') { floors = [[0.7, 0.6, 0.5]]; roof = true }
  else if (type === 'shop') { floors = [[0.95, 0.7, 0.5], [0.8, 0.6, 0.28]] }
  else if (type === 'tower') { floors = [[0.6, 0.6, 0.5], [0.58, 0.58, 0.5], [0.56, 0.56, 0.5]] }
  else if (type === 'skyscraper') { floors = [[0.62, 0.62, 0.5], [0.55, 0.55, 0.5], [0.48, 0.48, 0.5], [0.4, 0.4, 0.5], [0.32, 0.32, 0.45]]; antenna = true }
  else if (type === 'hospital') { floors = [[1.0, 0.8, 0.5], [0.9, 0.7, 0.5]] }
  else if (type === 'school') { floors = [[1.1, 0.7, 0.5], [0.7, 0.5, 0.4]] }
  else if (type === 'powerplant') { floors = [[1.0, 0.8, 0.5]] }
  else if (type === 'mall') { floors = [[1.3, 1.0, 0.5], [1.05, 0.8, 0.26]] }
  else { floors = [[0.6, 0.6, 0.5]] }

  const n = floors.length
  let y = 0
  const meshes = floors.map((fl, i) => {
    const [w, d, hh] = fl
    const s = smooth(seg(growth, (i / n) * 0.8, (i / n) * 0.8 + 0.35))
    const cy = y + (hh * s) / 2
    y += hh
    return (
      <group key={i}>
        <mesh position={[0, cy, 0]} scale={[1, s, 1]} castShadow>
          <boxGeometry args={[w, hh, d]} />
          <meshStandardMaterial color={wall} flatShading />
        </mesh>
        {s > 0.5 && [1, -1].map((dir) => (
          <mesh key={dir} position={[0, cy, dir * (d / 2)]}>
            <boxGeometry args={[w * 0.7, hh * 0.55, 0.02]} />
            <meshStandardMaterial color={winC} emissive={winC} emissiveIntensity={winE} />
          </mesh>
        ))}
      </group>
    )
  })

  const topY = y
  const dx = floors[0][1] / 2 // front depth of base floor
  return (
    <group scale={dead ? 0.9 : 1}>
      {meshes}
      {roof && growth > 0.6 && (
        <mesh position={[0, topY + 0.18, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.55, 0.35, 4]} />
          <meshStandardMaterial color={roofColor} flatShading />
        </mesh>
      )}
      {antenna && growth > 0.9 && (
        <group position={[0, topY, 0]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.015, 0.015, 0.4, 6]} /><meshStandardMaterial color={dead ? grey : '#9aa1ad'} /></mesh>
          <mesh position={[0, 0.42, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={1.5} /></mesh>
        </group>
      )}
      {type === 'hospital' && growth > 0.5 && (
        <group position={[0, topY * 0.62, dx + 0.01]}>
          <mesh><boxGeometry args={[0.26, 0.08, 0.02]} /><meshStandardMaterial color={dead ? grey : '#e03131'} emissive={dead ? '#000' : '#e03131'} emissiveIntensity={0.3} /></mesh>
          <mesh><boxGeometry args={[0.08, 0.26, 0.02]} /><meshStandardMaterial color={dead ? grey : '#e03131'} emissive={dead ? '#000' : '#e03131'} emissiveIntensity={0.3} /></mesh>
        </group>
      )}
      {type === 'school' && growth > 0.6 && (
        <group position={[0.5, topY, 0]}>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.012, 0.012, 0.5, 6]} /><meshStandardMaterial color={dead ? grey : '#8a8f98'} /></mesh>
          <mesh position={[0.1, 0.42, 0]}><boxGeometry args={[0.18, 0.12, 0.01]} /><meshStandardMaterial color={dead ? grey : '#f43f5e'} /></mesh>
        </group>
      )}
      {type === 'powerplant' && (
        <group scale={[1, g, 1]}>
          {[-0.18, 0.18].map((x, i) => (
            <mesh key={i} position={[x, 0.35, -0.08]} castShadow><cylinderGeometry args={[0.16, 0.22, 0.7, 12]} /><meshStandardMaterial color={dead ? grey : '#cbd0d6'} flatShading /></mesh>
          ))}
          <mesh position={[-0.4, 0.5, 0.22]} castShadow><cylinderGeometry args={[0.05, 0.06, 1.0, 8]} /><meshStandardMaterial color={dead ? grey : '#9aa1ad'} flatShading /></mesh>
          <mesh position={[-0.4, 0.95, 0.22]}><cylinderGeometry args={[0.052, 0.052, 0.1, 8]} /><meshStandardMaterial color={dead ? grey : '#e03131'} /></mesh>
        </group>
      )}
      {type === 'mall' && growth > 0.6 && (
        <mesh position={[0, topY * 0.7, dx + 0.01]}>
          <boxGeometry args={[0.5, 0.12, 0.02]} />
          <meshStandardMaterial color={dead ? grey : '#f43f5e'} emissive={dead ? '#000' : '#f43f5e'} emissiveIntensity={night ? 1.2 : 0.4} />
        </mesh>
      )}
    </group>
  )
}

// dispatch: building types -> Building, everything else -> Plant
function Element({ type, ...props }) {
  return isBuilding(type) ? <Building type={type} {...props} /> : <Plant type={type} {...props} />
}

// ---- day / night tint + sun/moon position by local hour ----
function useSky() {
  return useMemo(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60
    let base
    if (h < 5 || h >= 21) base = { sky: '#0b1026', sun: '#5a63a0', sunI: 0.4, amb: 0.4 }        // night
    else if (h < 8) base = { sky: '#e0a487', sun: '#ffd9a0', sunI: 0.85, amb: 0.55 }             // dawn
    else if (h < 17) base = { sky: '#a7d8f0', sun: '#fff6e0', sunI: 1.2, amb: 0.75 }             // day
    else if (h < 19.5) base = { sky: '#e8916a', sun: '#ffb27a', sunI: 0.9, amb: 0.6 }            // dusk
    else base = { sky: '#3a3360', sun: '#8a7fc0', sunI: 0.55, amb: 0.5 }                          // evening

    // sun up 6→18, moon otherwise; both arc east→west across the sky
    const isSun = h >= 6 && h < 18
    const frac = isSun ? (h - 6) / 12 : h < 6 ? (h + 6) / 12 : (h - 18) / 12
    const ang = frac * Math.PI
    const bodyPos = [-Math.cos(ang) * 16, Math.sin(ang) * 12 + 0.5, -6]
    return { ...base, isSun, bodyPos, bodyColor: isSun ? '#ffe6a0' : '#e6ecf7', bodyR: isSun ? 1.2 : 0.85 }
  }, [])
}

function SkyBody({ sky }) {
  return (
    <group position={sky.bodyPos}>
      <mesh><sphereGeometry args={[sky.bodyR, 24, 24]} /><meshBasicMaterial color={sky.bodyColor} /></mesh>
      <mesh><sphereGeometry args={[sky.bodyR * 1.6, 16, 16]} /><meshBasicMaterial color={sky.bodyColor} transparent opacity={0.16} /></mesh>
      {!sky.isSun && [[0.25, 0.15], [-0.2, 0.3], [0.15, -0.25]].map((c, i) => (
        <mesh key={i} position={[c[0], c[1], sky.bodyR * 0.78]}><sphereGeometry args={[0.13, 8, 8]} /><meshBasicMaterial color="#c4ccdb" /></mesh>
      ))}
    </group>
  )
}

function Scenery({ sky }) {
  return (
    <>
      <color attach="background" args={[sky.sky]} />
      {!sky.isSun && <Stars radius={60} depth={25} count={700} factor={2.5} fade speed={0} />}
      <ambientLight intensity={sky.amb} />
      <directionalLight position={sky.bodyPos} intensity={sky.sunI} color={sky.sun} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -2]} intensity={sky.amb * 0.4} color={sky.sun} />
      <SkyBody sky={sky} />
    </>
  )
}

function Island({ radius }) {
  return (
    <mesh position={[0, -0.15, 0]} receiveShadow>
      <cylinderGeometry args={[radius, radius * 0.9, 0.3, 48]} />
      <meshStandardMaterial color="#6b4f2e" flatShading />
    </mesh>
  )
}

function CityGround({ size, blocks = 2, spacing = 1.4, lines }) {
  const ls = lines || Array.from({ length: blocks + 1 }, (_, i) => (i - blocks / 2) * spacing)
  return (
    <group position={[0, -0.15, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[size * 2, 0.3, size * 2]} />
        <meshStandardMaterial color="#2c2f36" flatShading />
      </mesh>
      {ls.map((p, i) => (
        <group key={i}>
          <mesh position={[p, 0.16, 0]}><boxGeometry args={[0.14, 0.02, size * 2]} /><meshStandardMaterial color="#474c57" /></mesh>
          <mesh position={[0, 0.16, p]}><boxGeometry args={[size * 2, 0.02, 0.14]} /><meshStandardMaterial color="#474c57" /></mesh>
        </group>
      ))}
    </group>
  )
}

// ---- moving cars + walking people (city only) ----
const CAR_COLORS = ['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#ae3ec9', '#343a40', '#e8e8e8', '#0ca678']
const PEEP_COLORS = ['#f43f5e', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ced4da', '#ff922b']

const LIGHT_CYCLE = 7 // seconds per green phase
const greenAxisAt = (t) => (Math.floor(t / LIGHT_CYCLE) % 2 === 0 ? 'x' : 'z')

function Mover({ road, extent, render, y = 0.04 }) {
  const ref = useRef()
  const pRef = useRef((Math.random() * 2 - 1) * extent)
  const phase = useRef(Math.random() * 10) // de-sync individual gait/speed
  useFrame((s, dt) => {
    const d = Math.min(dt, 0.05)
    const t = s.clock.elapsedTime
    let p = pRef.current
    let speed = road.speed
    // cars: ease + stop at a red light when approaching an intersection
    if (road.stops) {
      if (road.axis !== greenAxisAt(t)) {
        const ahead = p + road.dir * 0.16
        const near = Math.min(...road.cross.map((l) => Math.abs(ahead - l)))
        if (near < 0.18) speed = 0
      }
    } else {
      // people: gentle variable pace (occasional dawdle), never fully stop
      speed *= 0.55 + 0.45 * Math.abs(Math.sin(t * 0.6 + phase.current))
    }
    p += road.dir * speed * d
    if (p > extent) p = -extent
    if (p < -extent) p = extent
    pRef.current = p
    const el = ref.current
    if (!el) return
    const bob = road.stops ? 0 : Math.abs(Math.sin(t * 5 + phase.current)) * 0.012
    if (road.axis === 'x') el.position.set(p, y + bob, road.fixed + road.offset)
    else el.position.set(road.fixed + road.offset, y + bob, p)
  })
  const rotY = (road.axis === 'x' ? 0 : Math.PI / 2) + (road.dir < 0 ? Math.PI : 0)
  return <group ref={ref} rotation={[0, rotY, 0]}>{render}</group>
}

// traffic-signal phase (re-renders only the light meshes, ~ aligned with cars)
function useTrafficPhase() {
  const [g, setG] = useState('x')
  useEffect(() => {
    const id = setInterval(() => setG((p) => (p === 'x' ? 'z' : 'x')), LIGHT_CYCLE * 1000)
    return () => clearInterval(id)
  }, [])
  return g
}

// traffic lights + street lamps at a subset of intersections
function StreetFurniture({ lines, night }) {
  const green = useTrafficPhase()
  const step = Math.max(1, Math.ceil(lines.length / 6))
  const pts = lines.filter((_, i) => i % step === 0)
  const lampE = night ? 2.4 : 0
  // green when that axis has right of way, red otherwise
  const sig = (on) => { const c = on ? '#37d36b' : '#e03131'; return { color: c, emissive: c, emissiveIntensity: 1.3 } }
  return (
    <>
      {pts.map((x, xi) => pts.map((z, zi) => (
        <group key={`${xi}-${zi}`} position={[x + 0.2, 0, z + 0.2]}>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.012, 0.012, 0.5, 5]} /><meshStandardMaterial color="#2f343d" /></mesh>
          <mesh position={[0, 0.54, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#fff4c2" emissive="#fff4c2" emissiveIntensity={lampE} /></mesh>
          <mesh position={[0.045, 0.42, 0]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial {...sig(green === 'z')} /></mesh>
          <mesh position={[0.045, 0.37, 0]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial {...sig(green === 'x')} /></mesh>
        </group>
      )))}
    </>
  )
}

function CityLife({ extent, lines, cars, peeps, night }) {
  const carDefs = useMemo(() => Array.from({ length: cars }, (_, i) => {
    const axis = i % 2 ? 'x' : 'z'
    const line = lines[(i * 3 + 1) % lines.length] || 0
    const dir = (Math.random() < 0.5 ? 1 : -1)
    return { axis, fixed: line, dir, speed: 0.22 + Math.random() * 0.26, offset: dir > 0 ? 0.16 : -0.16, color: CAR_COLORS[i % CAR_COLORS.length], stops: true, cross: lines }
  }), [cars, lines])

  const peepDefs = useMemo(() => Array.from({ length: peeps }, (_, i) => {
    const axis = i % 2 ? 'z' : 'x'
    const line = lines[(i * 5 + 2) % lines.length] || 0
    const dir = (Math.random() < 0.5 ? 1 : -1)
    return { axis, fixed: line, dir, speed: 0.055 + Math.random() * 0.06, offset: dir > 0 ? 0.32 : -0.32, color: PEEP_COLORS[i % PEEP_COLORS.length], stops: false }
  }), [peeps, lines])

  return (
    <>
      <StreetFurniture lines={lines} night={night} />
      {carDefs.map((road, i) => (
        <Mover key={`c${i}`} road={road} extent={extent} y={0.04} render={
          <group>
            <mesh position={[0, 0.04, 0]} castShadow><boxGeometry args={[0.22, 0.08, 0.11]} /><meshStandardMaterial color={road.color} flatShading /></mesh>
            <mesh position={[-0.01, 0.11, 0]} castShadow><boxGeometry args={[0.11, 0.06, 0.1]} /><meshStandardMaterial color={road.color} flatShading /></mesh>
            {night && <mesh position={[0.12, 0.04, 0]}><boxGeometry args={[0.02, 0.03, 0.09]} /><meshStandardMaterial color="#fff7cc" emissive="#fff7cc" emissiveIntensity={2} /></mesh>}
          </group>
        } />
      ))}
      {peepDefs.map((road, i) => (
        <Mover key={`p${i}`} road={road} extent={extent} y={0} render={
          <group>
            <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.08, 5]} /><meshStandardMaterial color={road.color} flatShading /></mesh>
            <mesh position={[0, 0.11, 0]}><sphereGeometry args={[0.022, 6, 6]} /><meshStandardMaterial color="#e8c8a0" flatShading /></mesh>
          </group>
        } />
      ))}
    </>
  )
}

// ---------- Session: one element growing live ----------
export function FocusScene({ type, progress, dead, seed = 'session', world = 'garden' }) {
  const sky = useSky()
  const night = sky.sunI < 0.7
  const isCity = world === 'city'
  return (
    <div className="h-72 w-full">
      <Canvas dpr={[1, 2]} shadows camera={{ position: [2.4, 2.0, 3.2], fov: 45 }}>
        <Scenery sky={sky} />
        <group rotation={dead ? [0, 0, 1.1] : [0, 0, 0]} position={dead ? [0.3, 0, 0] : [0, 0, 0]}>
          <Element type={type} growth={progress} dead={dead} seed={seed} night={night} />
        </group>
        {isCity ? <CityGround size={1.4} blocks={2} spacing={1.4} /> : <Island radius={1.5} />}
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={6} blur={2} far={4} />
        <OrbitControls enablePan={false} autoRotate={!dead} autoRotateSpeed={1.1} minPolarAngle={0.5} maxPolarAngle={1.45} target={[0, 0.6, 0]} />
      </Canvas>
    </div>
  )
}

// ---- garden wildlife + grass ----
function Flyer({ def }) {
  const g = useRef()
  const w = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const { cx, cz, wr, sp, ph, h, freq } = def
    const a = t * sp + ph
    const x = cx + Math.cos(a) * wr * (0.6 + 0.4 * Math.sin(t * 0.7 + ph))
    const z = cz + Math.sin(a * 1.3 + ph) * wr
    const y = h + Math.sin(t * (def.kind === 'bee' ? 9 : 4) + ph) * 0.08
    if (g.current) { g.current.position.set(x, y, z); g.current.rotation.y = a + Math.PI / 2 }
    if (w.current) w.current.rotation.x = Math.sin(t * freq + ph) * 0.9
  })
  const isBee = def.kind === 'bee'
  const wScale = isBee ? [0.03, 0.006, 0.02] : [0.05, 0.005, 0.038]
  return (
    <group ref={g}>
      <mesh castShadow><sphereGeometry args={[isBee ? 0.028 : 0.016, 8, 6]} /><meshStandardMaterial color={def.bodyC} flatShading /></mesh>
      <group ref={w} position={[0, 0.008, 0]}>
        {[-1, 1].map((d) => (
          <mesh key={d} position={[d * (isBee ? 0.03 : 0.05), 0, 0]} scale={wScale}>
            <sphereGeometry args={[1, 6, 5]} /><meshStandardMaterial color={def.wingC} transparent opacity={0.85} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Critter({ def, radius }) {
  const g = useRef()
  const st = useRef({ x: (Math.random() * 2 - 1) * radius * 0.6, z: (Math.random() * 2 - 1) * radius * 0.6, h: Math.random() * 6.28 })
  useFrame((s, dt) => {
    const d = Math.min(dt, 0.05)
    const t = s.clock.elapsedTime
    const p = st.current
    p.x += Math.cos(p.h) * def.sp * d
    p.z += Math.sin(p.h) * def.sp * d
    if (Math.hypot(p.x, p.z) > radius * 0.82) p.h = Math.atan2(-p.z, -p.x) + (Math.random() - 0.5) * 0.6
    else if (Math.random() < 0.012) p.h += (Math.random() - 0.5) * 0.9
    const hop = def.kind === 'rabbit' ? Math.abs(Math.sin(t * 6 + def.ph)) * 0.06 : Math.abs(Math.sin(t * 3.5 + def.ph)) * 0.015
    if (g.current) { g.current.position.set(p.x, hop, p.z); g.current.rotation.y = -p.h + Math.PI / 2 }
  })
  if (def.kind === 'rabbit') {
    const c = '#a17b5d'
    return (
      <group ref={g}>
        <mesh position={[0, 0.05, 0]} scale={[1, 0.85, 1.3]} castShadow><sphereGeometry args={[0.06, 8, 7]} /><meshStandardMaterial color={c} flatShading /></mesh>
        <mesh position={[0, 0.09, 0.06]} castShadow><sphereGeometry args={[0.04, 8, 7]} /><meshStandardMaterial color={c} flatShading /></mesh>
        {[-1, 1].map((s2) => <mesh key={s2} position={[s2 * 0.015, 0.16, 0.06]} rotation={[0.2, 0, s2 * 0.12]}><coneGeometry args={[0.012, 0.07, 4]} /><meshStandardMaterial color={c} flatShading /></mesh>)}
        <mesh position={[0, 0.05, -0.07]}><sphereGeometry args={[0.022, 6, 6]} /><meshStandardMaterial color="#fff" /></mesh>
      </group>
    )
  }
  const c = '#b5793f'
  return (
    <group ref={g}>
      <mesh position={[0, 0.17, 0]} scale={[1, 1, 1.7]} castShadow><boxGeometry args={[0.08, 0.09, 0.1]} /><meshStandardMaterial color={c} flatShading /></mesh>
      {[[-0.03, 0.06], [0.03, 0.06], [-0.03, -0.06], [0.03, -0.06]].map((l, i) => (
        <mesh key={i} position={[l[0], 0.06, l[1]]}><cylinderGeometry args={[0.012, 0.012, 0.13, 5]} /><meshStandardMaterial color={c} /></mesh>
      ))}
      <mesh position={[0, 0.26, 0.1]} castShadow><boxGeometry args={[0.05, 0.06, 0.06]} /><meshStandardMaterial color={c} flatShading /></mesh>
      {[-1, 1].map((s2) => <mesh key={s2} position={[s2 * 0.02, 0.32, 0.1]} rotation={[0.3, 0, s2 * 0.4]}><coneGeometry args={[0.01, 0.06, 4]} /><meshStandardMaterial color="#8a5a3c" /></mesh>)}
    </group>
  )
}

function GrassField({ count, radius }) {
  const tufts = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = makeRng('g' + i)
    const ang = r() * 6.2832
    const rad = Math.sqrt(r()) * radius * 0.92
    return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, s: 0.6 + r() * 0.8, c: GREENS[Math.floor(r() * GREENS.length)] }
  }), [count, radius])
  return tufts.map((t, i) => (
    <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * 6.2832
        return <mesh key={k} position={[Math.cos(a) * 0.02, 0.04, Math.sin(a) * 0.02]} rotation={[0, 0, (k - 1) * 0.25]}><coneGeometry args={[0.012, 0.1, 4]} /><meshStandardMaterial color={t.c} flatShading /></mesh>
      })}
    </group>
  ))
}

function GardenLife({ n, radius }) {
  const flyers = useMemo(() => {
    const bees = Math.min(8, Math.max(0, Math.round(n / 3)))
    const butter = Math.min(10, Math.max(1, Math.round(n / 2)))
    const mk = (kind, count) => Array.from({ length: count }, () => ({
      kind,
      cx: (Math.random() * 2 - 1) * radius * 0.7,
      cz: (Math.random() * 2 - 1) * radius * 0.7,
      wr: 0.35 + Math.random() * 0.5,
      sp: (kind === 'bee' ? 0.8 : 0.4) + Math.random() * 0.5,
      ph: Math.random() * 6.28,
      h: (kind === 'bee' ? 0.35 : 0.45) + Math.random() * 0.35,
      freq: kind === 'bee' ? 26 : 9,
      bodyC: kind === 'bee' ? '#f5b800' : '#333333',
      wingC: kind === 'bee' ? '#ffffff' : BLOOMS[Math.floor(Math.random() * BLOOMS.length)],
    }))
    return [...mk('bee', bees), ...mk('butterfly', butter)]
  }, [n, radius])

  const critters = useMemo(() => {
    const rabbits = Math.min(6, Math.max(0, Math.round(n / 4)))
    const deers = Math.min(4, Math.max(0, Math.round(n / 6)))
    const mk = (kind, count, sp) => Array.from({ length: count }, () => ({ kind, sp: sp + Math.random() * 0.05, ph: Math.random() * 6.28 }))
    return [...mk('rabbit', rabbits, 0.22), ...mk('deer', deers, 0.16)]
  }, [n])

  const grass = Math.min(140, n * 6)

  return (
    <>
      <GrassField count={grass} radius={radius} />
      {flyers.map((def, i) => <Flyer key={`f${i}`} def={def} />)}
      {critters.map((def, i) => <Critter key={`c${i}`} def={def} radius={radius} />)}
    </>
  )
}

// ---------- Garden: a grove of completed plants ----------
function Bob({ offset, children }) {
  const ref = useRef()
  useFrame((s) => { if (ref.current) ref.current.position.y = Math.sin(s.clock.elapsedTime * 0.8 + offset) * 0.03 })
  return <group ref={ref}>{children}</group>
}

// ---------- Collection: grove of plants OR a cityscape ----------
export function CollectionScene({ items, world = 'garden' }) {
  const sky = useSky()
  const night = sky.sunI < 0.7
  const isCity = world === 'city'
  const list = items.filter((it) => (isCity ? isBuilding(it.element) : !isBuilding(it.element))).slice(0, 60)
  const cols = Math.max(1, Math.ceil(Math.sqrt(list.length || 1)))
  const spacing = isCity ? 1.5 : 1.3
  const radius = Math.max(2.5, cols * spacing * 0.72)
  const lines = Array.from({ length: cols + 1 }, (_, i) => (i - cols / 2) * spacing)
  // traffic + crowd scale with city size
  // scale with city size; capped for performance (each is its own animated object)
  const carCount = isCity ? Math.min(30, Math.max(3, Math.round(list.length / 2) + 2)) : 0
  const peepCount = isCity ? Math.min(45, Math.max(4, list.length + 3)) : 0

  return (
    <div className="h-96 w-full">
      <Canvas dpr={[1, 2]} shadows camera={{ position: [radius * 1.1, radius * 0.85, radius * 1.3], fov: 42 }}>
        <Scenery sky={sky} />
        {isCity ? <CityGround size={radius} lines={lines} /> : <Island radius={radius} />}
        {isCity && <CityLife extent={radius} lines={lines} cars={carCount} peeps={peepCount} night={night} />}
        {!isCity && list.length > 0 && <GardenLife n={list.length} radius={radius} />}
        {list.map((it, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const j = isCity ? 0 : ((i * 53) % 7 - 3) * 0.06
          const x = (col - (cols - 1) / 2) * spacing + j
          const z = (row - (cols - 1) / 2) * spacing - j
          const rotY = isCity ? (i % 4) * (Math.PI / 2) : ((i * 41) % 360) * (Math.PI / 180)
          const content = <Element type={it.element} growth={1} seed={it.id || i} night={night} />
          return (
            <group key={it.id || i} position={[x, 0, z]} rotation={[0, rotY, 0]} scale={0.7}>
              {isCity ? content : <Bob offset={i}>{content}</Bob>}
            </group>
          )
        })}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={radius * 2.4} blur={2.5} far={6} />
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} minPolarAngle={0.4} maxPolarAngle={1.4} target={[0, 0.4, 0]} />
      </Canvas>
    </div>
  )
}
