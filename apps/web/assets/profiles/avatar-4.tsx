import type { SVGProps } from "react";

/**
 * Avatar 4: Amber Champion (Amber / Gold theme)
 */
export function ProfileAvatar4(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar 4 - Amber Champion"
      {...props}
    >
      <defs>
        <linearGradient
          id="av4_bg"
          x1="0"
          y1="0"
          x2="120"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#av4_bg)" />
      <circle
        cx="60"
        cy="60"
        r="52"
        stroke="#FDE68A"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      {/* Shoulders / Jersey */}
      <path d="M22 114C26 93 40 84 60 84C80 84 94 93 98 114" fill="#18181B" />
      <path
        d="M44 86C50 93 70 93 76 86"
        stroke="#FBBF24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Neck & Head */}
      <rect x="52" y="72" width="16" height="16" rx="6" fill="#5C3317" />
      <rect x="36" y="34" width="48" height="46" rx="22" fill="#6E3F1D" />
      {/* Crown Hair /waves */}
      <path
        d="M36 46C36 31 46 24 60 24C74 24 84 31 84 46C76 41 68 39 60 39C52 39 44 41 36 46Z"
        fill="#09090B"
      />
      {/* Champion Crown Band */}
      <rect x="37" y="40" width="46" height="6" rx="3" fill="#FDE047" />
      <circle cx="60" cy="43" r="2.5" fill="#DC2626" />
      {/* Eyes */}
      <circle cx="49" cy="56" r="3.2" fill="#FFFFFF" />
      <circle cx="49" cy="56" r="1.6" fill="#09090B" />
      <circle cx="71" cy="56" r="3.2" fill="#FFFFFF" />
      <circle cx="71" cy="56" r="1.6" fill="#09090B" />
      {/* Bright Grin */}
      <path d="M50 67C53 73 67 73 70 67Z" fill="#FFFFFF" />
    </svg>
  );
}
