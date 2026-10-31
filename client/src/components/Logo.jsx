import { useId } from 'react'

function Logo({ size = 32 }) {
  // Unique gradient id per logo, so two logos on one page can't clash
  const gradientId = `documind-logo-${useId().replace(/:/g, '')}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DocuMind logo"
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#203b37" />
          <stop offset="55%" stopColor="#2f5952" />
          <stop offset="100%" stopColor="#b88f4d" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill={`url(#${gradientId})`} />
      <path
        d="M13 12.5h10.5a4.5 4.5 0 0 1 4.5 4.5v10.5a1 1 0 0 1-1 1H16.5A4.5 4.5 0 0 1 12 24V13.5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="#fdf8ef"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="15.6" y1="17.2" x2="23.4" y2="17.2" stroke="#fdf8ef" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="15.6" y1="20.4" x2="23.4" y2="20.4" stroke="#fdf8ef" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="15.6" y1="23.6" x2="20" y2="23.6" stroke="#fdf8ef" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="27" cy="27" r="3.4" fill="#f2d18b" stroke="#fdf8ef" strokeWidth="1" />
    </svg>
  )
}

export default Logo