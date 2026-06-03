// Zoho-style time-of-day greeting with a blended sky scene on the right.
function phaseOf(h) {
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}
const GREET = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Working late' }
const SUB = {
  morning: 'Have a productive day!',
  afternoon: 'Keep the momentum going.',
  evening: 'Wind down and reflect.',
  night: 'Rest well — tomorrow’s a fresh page.',
}
const GRAD = {
  morning: 'linear-gradient(120deg, #ffe3b3, #ffb27a)',
  afternoon: 'linear-gradient(120deg, #bfe7fb, #7ec8e3)',
  evening: 'linear-gradient(120deg, #f6a085, #9b6a9e)',
  night: 'linear-gradient(120deg, #243056, #0c1330)',
}

function Sky({ phase }) {
  const isNight = phase === 'night'
  const sunY = phase === 'afternoon' ? 34 : 52 // higher at midday, lower at dawn/dusk
  const sunColor = phase === 'evening' ? '#ffcaa0' : '#fff1c9'
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
      {isNight ? (
        <>
          {[[150, 30], [120, 22], [170, 50], [135, 60], [185, 75], [110, 45], [160, 85]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#fff" opacity={0.85} />
          ))}
          {/* moon */}
          <circle cx="150" cy="48" r="22" fill="#e7ecf7" />
          <circle cx="158" cy="42" r="4" fill="#cfd6e6" />
          <circle cx="143" cy="55" r="3" fill="#cfd6e6" />
          <circle cx="152" cy="58" r="2.2" fill="#cfd6e6" />
        </>
      ) : (
        <>
          {/* sun + glow */}
          <circle cx="150" cy={sunY} r="34" fill={sunColor} opacity="0.25" />
          <circle cx="150" cy={sunY} r="22" fill={sunColor} />
          {/* clouds */}
          <g fill="#ffffff" opacity="0.9">
            <ellipse cx="108" cy="84" rx="20" ry="11" />
            <ellipse cx="126" cy="80" rx="16" ry="12" />
            <ellipse cx="92" cy="80" rx="13" ry="9" />
          </g>
          <g fill="#ffffff" opacity="0.65">
            <ellipse cx="176" cy="98" rx="16" ry="8" />
            <ellipse cx="190" cy="95" rx="12" ry="9" />
          </g>
        </>
      )}
    </svg>
  )
}

export default function GreetingBanner({ name, action }) {
  const phase = phaseOf(new Date().getHours())
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
      {/* sky scene, blended into the card from the right */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 sm:w-1/2"
        style={{
          background: GRAD[phase],
          maskImage: 'linear-gradient(to right, transparent, #000 45%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 45%)',
        }}
      >
        <Sky phase={phase} />
      </div>

      <div className="relative flex items-center justify-between gap-4 px-6 py-7">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {GREET[phase]}, {name}
          </h1>
          <p className="mt-1 text-sm text-muted">{SUB[phase]}</p>
        </div>
        {action}
      </div>
    </div>
  )
}
