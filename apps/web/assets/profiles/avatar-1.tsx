import type { SVGProps } from "react";

/**
 * Avatar 1: Crimson Vanguard (Coral / Crimson theme)
 */
export function ProfileAvatar1(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar 1 - Crimson Vanguard"
      {...props}
    >
      <defs>
        <linearGradient
          id="av1_bg"
          x1="0"
          y1="0"
          x2="120"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E11D48" />
          <stop offset="1" stopColor="#881337" />
        </linearGradient>
        <linearGradient
          id="av1_visor"
          x1="34"
          y1="52"
          x2="86"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#av1_bg)" />
      <circle
        cx="60"
        cy="60"
        r="52"
        stroke="#FDA4AF"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      {/* Shoulders / Hoodie */}
      <path d="M22 114C25 93 40 84 60 84C80 84 95 93 98 114" fill="#1E293B" />
      <path
        d="M46 84L60 98L74 84"
        stroke="#FB7185"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Neck & Head */}
      <rect x="52" y="72" width="16" height="16" rx="6" fill="#8D5524" />
      <rect x="35" y="34" width="50" height="46" rx="22" fill="#A16232" />
      {/* Hair / High-top fade */}
      <path
        d="M35 50C35 33 44 23 60 23C76 23 85 33 85 50C81 42 73 38 60 38C47 38 39 42 35 50Z"
        fill="#0F172A"
      />
      {/* Cyber Visor Glasses */}
      <rect
        x="33"
        y="49"
        width="54"
        height="15"
        rx="7.5"
        fill="url(#av1_visor)"
        stroke="#F8FAFC"
        strokeWidth="2.5"
      />
      <path
        d="M42 54L49 54"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Confident Smile */}
      <path
        d="M52 70C55 73 65 73 68 70"
        stroke="#F8FAFC"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
