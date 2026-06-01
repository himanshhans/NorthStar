// NorthStar mark: 4-point sparkle star inside a thin orbit ring, with an orbit dot.
const STAR =
  'M12 3.6 C12.6 9.3 14.7 11.4 20.4 12 C14.7 12.6 12.6 14.7 12 20.4 C11.4 14.7 9.3 12.6 3.6 12 C9.3 11.4 11.4 9.3 12 3.6 Z'

export function Logo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="NorthStar logo"
    >
      <defs>
        <linearGradient id="nsStarGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {/* orbit ring */}
      <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeOpacity="0.4" strokeWidth="1.1" />
      {/* sparkle star */}
      <path d={STAR} fill="url(#nsStarGrad)" />
      {/* orbit dot (top-right, 45° on the ring) */}
      <circle cx="19.07" cy="4.93" r="1.5" fill="#a855f7" />
    </svg>
  )
}

export function LogoWord({ size = 28, className = '', textClass = 'text-xl' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span className={`font-display font-semibold tracking-tight ${textClass}`}>NorthStar</span>
    </span>
  )
}
