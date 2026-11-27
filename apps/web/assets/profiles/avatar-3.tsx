import type { SVGProps } from "react";

/**
 * Avatar 3: Cobalt Strategist (Electric Blue / Indigo theme)
 */
export function ProfileAvatar3(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar 3 - Cobalt Strategist"
      {...props}
    >
      <defs>
        <linearGradient id="av3_bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#av3_bg)" />
      <circle cx="60" cy="60" r="52" stroke="#93C5FD" strokeOpacity="0.3" strokeWidth="2" />
      {/* Headphone Arc */}
      <path
        d="M29 58C29 36 42 23 60 23C78 23 91 36 91 58"
        stroke="#38BDF8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Shoulders */}
      <path
        d="M22 114C26 93 40 84 60 84C80 84 94 93 98 114"
        fill="#0F172A"
      />
      <path
        d="M57 90L53 98H61L57 106"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Neck & Head */}
      <rect x="52" y="72" width="16" height="16" rx="6" fill="#B47B4E" />
      <rect x="36" y="34" width="48" height="46" rx="21" fill="#C68B59" />
      {/* Locs / Hair */}
      <path
        d="M36 47C38 33 48 27 60 27C72 27 82 33 84 47C76 41 68 38 60 38C52 38 44 41 36 47Z"
        fill="#1E293B"
      />
      {/* Headphone Ear Cups */}
      <rect x="26" y="48" width="10" height="20" rx="5" fill="#38BDF8" />
      <rect x="84" y="48" width="10" height="20" rx="5" fill="#38BDF8" />
      {/* Eyes & Brows */}
      <path d="M44 49L53 51" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M76 49L67 51" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="49" cy="56" r="3" fill="#0F172A" />
      <circle cx="71" cy="56" r="3" fill="#0F172A" />
      {/* Smirk */}
      <path
        d="M52 70C57 72 64 71 69 67"
        stroke="#0F172A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
