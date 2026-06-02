import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const seg = (g, a, b) => clamp((g - a) / (b - a), 0, 1)
const smooth = (t) => t * t * (3 - 2 * t)
const grey = '#6b7280'
const TRUNK = '#8a5a3c'
const GREENS = ['#2b8a3e', '#2f9e44', '#37b24d', '#40c057', '#51cf66', '#66a80f', '#5c940d', '#188a5a']
const BLOOMS = ['#f43f5e', '#fb7185', '#f59e0b', '#fbbf24', '#a855f7', '#c084fc', '#38bdf8', '#f9a8d4', '#ffffff']

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
      color: BLOOMS[Math.floor(r() * BLOOMS.length)],
    }))
  }, [r])
  const size = (0.85 + 0.3 * a) * (dead ? 0.92 : 1)
  const green = dead ? grey : GREENS[Math.floor(cIdx * GREENS.length)]
  const trunkC = dead ? grey : TRUNK
  const g = smooth(clamp(growth, 0, 1))

  let body
  if (type === 'pine') {
    const trunkH = 0.3 + 0.25 * b
    const cones = [0, 1, 2]
    body = (
      <group>
        <mesh position={[0, (trunkH * g) / 2, 0]} scale={[1, g, 1]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, trunkH, 6]} />
          <meshStandardMaterial color={trunkC} flatShading />
        </mesh>
        {cones.map((i) => {
          const s = smooth(seg(growth, 0.2 + i * 0.22, 0.5 + i * 0.22))
          const rad = 0.42 - i * 0.1
          const hh = 0.5
          return (
            <mesh key={i} position={[0, trunkH + i * 0.32 + (hh * s) / 2, 0]} scale={s} castShadow>
              <coneGeometry args={[rad, hh, 8]} />
              <meshStandardMaterial color={green} flatShading />
            </mesh>
          )
        })}
      </group>
    )
  } else if (type === 'tree') {
    const trunkH = 0.5 + 0.4 * b
    const f = smooth(seg(growth, 0.35, 1))
    body = (
      <group>
        <mesh position={[0, (trunkH * g) / 2, 0]} scale={[1, g, 1]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, trunkH, 6]} />
          <meshStandardMaterial color={trunkC} flatShading />
        </mesh>
        <mesh position={[0, trunkH + 0.28 * f, 0]} scale={f} castShadow>
          <icosahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color={green} flatShading />
        </mesh>
        <mesh position={[0.22 * f, trunkH + 0.12 * f, 0.1]} scale={0.7 * f} castShadow>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color={green} flatShading />
        </mesh>
      </group>
    )
  } else if (type === 'bush') {
    body = (
      <group scale={g}>
        {[[0, 0.22, 0, 0.3], [0.22, 0.18, 0.05, 0.24], [-0.2, 0.16, -0.05, 0.22]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} scale={1} castShadow>
            <icosahedronGeometry args={[p[3], 0]} />
            <meshStandardMaterial color={green} flatShading />
          </mesh>
        ))}
      </group>
    )
  } else {
    // flowering plant: a leafy base with SEVERAL blooms (tulip = buds, daisy = petalled)
    const isDaisy = type === 'daisy'
    const f0 = smooth(seg(growth, 0, 0.3))   // base foliage
    const f1 = smooth(seg(growth, 0, 0.55))  // stems
    const f2 = smooth(seg(growth, 0.45, 1))  // blooms open
    body = (
      <group>
        {/* leafy base */}
        {[[0, 0.12, 0, 0.18], [0.15, 0.09, 0.05, 0.13], [-0.14, 0.08, -0.05, 0.12]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1] * f0, p[2]]} scale={f0} castShadow>
            <icosahedronGeometry args={[p[3], 0]} />
            <meshStandardMaterial color={green} flatShading />
          </mesh>
        ))}
        {/* blooms on stems */}
        {blooms.map((bl, i) => {
          const x = Math.cos(bl.ang) * bl.rad
          const z = Math.sin(bl.ang) * bl.rad
          const col = dead ? grey : bl.color
          return (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, (bl.h * f1) / 2, 0]} scale={[1, f1, 1]} castShadow>
                <cylinderGeometry args={[0.022, 0.03, bl.h, 5]} />
                <meshStandardMaterial color={green} flatShading />
              </mesh>
              {isDaisy ? (
                <group position={[0, bl.h * f1, 0]} scale={f2}>
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
                </group>
              ) : (
                <mesh position={[0, bl.h * f1 + 0.06 * f2, 0]} scale={[0.7 * f2, 1.2 * f2, 0.7 * f2]} castShadow>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshStandardMaterial color={col} flatShading />
                </mesh>
              )}
            </group>
          )
        })}
      </group>
    )
  }

  return <group scale={size}>{body}</group>
}

// ---- day / night tint by local hour ----
function useSky() {
  return useMemo(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60
    if (h < 5 || h >= 21) return { sky: '#0b1026', sun: '#5a63a0', sunI: 0.4, amb: 0.4 }       // night
    if (h < 8) return { sky: '#e0a487', sun: '#ffd9a0', sunI: 0.85, amb: 0.55 }                 // dawn
    if (h < 17) return { sky: '#a7d8f0', sun: '#fff6e0', sunI: 1.2, amb: 0.75 }                 // day
    if (h < 19.5) return { sky: '#e8916a', sun: '#ffb27a', sunI: 0.9, amb: 0.6 }                // dusk
    return { sky: '#3a3360', sun: '#8a7fc0', sunI: 0.55, amb: 0.5 }                              // evening
  }, [])
}

function Scenery({ sky }) {
  return (
    <>
      <color attach="background" args={[sky.sky]} />
      <ambientLight intensity={sky.amb} />
      <directionalLight position={[4, 7, 4]} intensity={sky.sunI} color={sky.sun} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -2]} intensity={sky.amb * 0.4} color={sky.sun} />
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

// ---------- Session: one plant growing live ----------
export function FocusScene({ type, progress, dead, seed = 'session' }) {
  const sky = useSky()
  return (
    <div className="h-72 w-full">
      <Canvas dpr={[1, 2]} shadows camera={{ position: [2.4, 2.0, 3.2], fov: 45 }}>
        <Scenery sky={sky} />
        <group rotation={dead ? [0, 0, 1.1] : [0, 0, 0]} position={dead ? [0.3, 0, 0] : [0, 0, 0]}>
          <Plant type={type} growth={progress} dead={dead} seed={seed} />
        </group>
        <Island radius={1.5} />
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={6} blur={2} far={4} />
        <OrbitControls enablePan={false} autoRotate={!dead} autoRotateSpeed={1.1} minPolarAngle={0.5} maxPolarAngle={1.45} target={[0, 0.6, 0]} />
      </Canvas>
    </div>
  )
}

// ---------- Garden: a grove of completed plants ----------
function Bob({ offset, children }) {
  const ref = useRef()
  useFrame((s) => { if (ref.current) ref.current.position.y = Math.sin(s.clock.elapsedTime * 0.8 + offset) * 0.03 })
  return <group ref={ref}>{children}</group>
}

export function GardenScene({ items }) {
  const sky = useSky()
  const list = items.slice(0, 60)
  const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)))
  const spacing = 1.3
  const radius = Math.max(2.5, cols * spacing * 0.72)

  return (
    <div className="h-96 w-full">
      <Canvas dpr={[1, 2]} shadows camera={{ position: [radius * 1.1, radius * 0.85, radius * 1.3], fov: 42 }}>
        <Scenery sky={sky} />
        <Island radius={radius} />
        {list.map((it, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const j = ((i * 53) % 7 - 3) * 0.06
          const x = (col - (cols - 1) / 2) * spacing + j
          const z = (row - (cols - 1) / 2) * spacing - j
          const rotY = ((i * 41) % 360) * (Math.PI / 180)
          return (
            <group key={it.id || i} position={[x, 0, z]} rotation={[0, rotY, 0]} scale={0.7}>
              <Bob offset={i}><Plant type={it.element} growth={1} seed={it.id || i} /></Bob>
            </group>
          )
        })}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={radius * 2.4} blur={2.5} far={6} />
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} minPolarAngle={0.4} maxPolarAngle={1.4} target={[0, 0.4, 0]} />
      </Canvas>
    </div>
  )
}
