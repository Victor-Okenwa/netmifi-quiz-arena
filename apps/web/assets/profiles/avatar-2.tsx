import type { SVGProps } from "react";

/**
 * Avatar 2: Emerald Alchemist (Emerald / Teal theme)
 */
export function ProfileAvatar2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar 2 - Emerald Alchemist"
      {...props}
    >
      <defs>
        <linearGradient id="av2_bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#av2_bg)" />
      <circle cx="60" cy="60" r="52" stroke="#6EE7B7" strokeOpacity="0.3" strokeWidth="2" />
      {/* Afro Puffs Back */}
      <circle cx="34" cy="40" r="14" fill="#18181B" />
      <circle cx="86" cy="40" r="14" fill="#18181B" />
      {/* Shoulders / Jacket */}
      <path
        d="M22 114C26 93 40 84 60 84C80 84 94 93 98 114"
        fill="#0F172A"
      />
      <path d="M50 84H70V114H50V84Z" fill="#34D399" />
      {/* Neck & Face */}
      <rect x="53" y="72" width="14" height="15" rx="6" fill="#6F3E1D" />
      <rect x="37" y="35" width="46" height="45" rx="22" fill="#7C4722" />
      {/* Front Hair */}
      <path
        d="M37 49C38 35 47 28 60 28C73 28 82 35 83 49C77 41 69 39 60 39C51 39 43 41 37 49Z"
        fill="#18181B"
      />
      {/* Gold Headband */}
      <path
        d="M38 45C46 41 74 41 82 45"
        stroke="#FBBF24"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="49" cy="55" r="3.5" fill="#FFFFFF" />
      <circle cx="49" cy="55" r="1.8" fill="#0F172A" />
      <circle cx="71" cy="55" r="3.5" fill="#FFFFFF" />
      <circle cx="71" cy="55" r="1.8" fill="#0F172A" />
      {/* Round Frame Glasses */}
      <circle cx="49" cy="55" r="7.5" stroke="#FDE68A" strokeWidth="2" />
      <circle cx="71" cy="55" r="7.5" stroke="#FDE68A" strokeWidth="2" />
      <path d="M56.5 55H63.5" stroke="#FDE68A" strokeWidth="2" />
      {/* Smile */}
      <path
        d="M52 69C55 73 65 73 68 69"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
