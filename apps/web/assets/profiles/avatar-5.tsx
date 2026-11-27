import type { SVGProps } from "react";

/**
 * Avatar 5: Violet Sage (Royal Purple / Violet theme)
 */
export function ProfileAvatar5(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar 5 - Violet Sage"
      {...props}
    >
      <defs>
        <linearGradient id="av5_bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#2E1065" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#av5_bg)" />
      <circle cx="60" cy="60" r="52" stroke="#DDD6FE" strokeOpacity="0.3" strokeWidth="2" />
      {/* Back Hair / Braids */}
      <rect x="31" y="42" width="10" height="38" rx="5" fill="#1E1B4B" />
      <rect x="79" y="42" width="10" height="38" rx="5" fill="#1E1B4B" />
      {/* Shoulders */}
      <path
        d="M22 114C26 93 40 84 60 84C80 84 94 93 98 114"
        fill="#1E1B4B"
      />
      {/* Star Emblem */}
      <circle cx="60" cy="98" r="5" fill="#C4B5FD" />
      {/* Neck & Face */}
      <rect x="53" y="72" width="14" height="15" rx="6" fill="#8D5524" />
      <rect x="37" y="34" width="46" height="45" rx="22" fill="#9E6230" />
      {/* Hair Top */}
      <path
        d="M36 48C37 32 47 25 60 25C73 25 83 32 84 48C77 40 68 38 60 38C52 38 43 40 36 48Z"
        fill="#1E1B4B"
      />
      {/* Cyber Monocle on Right Eye */}
      <circle cx="49" cy="55" r="3" fill="#0F172A" />
      <circle
        cx="71"
        cy="55"
        r="8"
        fill="#38BDF8"
        fillOpacity="0.35"
        stroke="#A78BFA"
        strokeWidth="2.5"
      />
      <circle cx="71" cy="55" r="2.8" fill="#FFFFFF" />
      {/* Smile */}
      <path
        d="M53 69C56 72 64 72 67 69"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
