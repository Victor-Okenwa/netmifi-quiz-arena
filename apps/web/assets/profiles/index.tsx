import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";
import { ProfileAvatar1 } from "./avatar-1";
import { ProfileAvatar2 } from "./avatar-2";
import { ProfileAvatar3 } from "./avatar-3";
import { ProfileAvatar4 } from "./avatar-4";
import { ProfileAvatar5 } from "./avatar-5";

export type AvatarNumber = 1 | 2 | 3 | 4 | 5;

export interface ProfileAvatarPreset {
  number: AvatarNumber;
  name: string;
  tagline: string;
  accentLabel: string;
  Component: ComponentType<SVGProps<SVGSVGElement>>;
}

export const PROFILE_AVATAR_PRESETS: ProfileAvatarPreset[] = [
  {
    number: 1,
    name: "Crimson Vanguard",
    tagline: "Visor Scholar • Crimson Red",
    accentLabel: "Crimson",
    Component: ProfileAvatar1,
  },
  {
    number: 2,
    name: "Emerald Alchemist",
    tagline: "Golden Frames • Emerald Green",
    accentLabel: "Emerald",
    Component: ProfileAvatar2,
  },
  {
    number: 3,
    name: "Cobalt Strategist",
    tagline: "Audio Tactician • Electric Blue",
    accentLabel: "Cobalt",
    Component: ProfileAvatar3,
  },
  {
    number: 4,
    name: "Amber Champion",
    tagline: "Crown Laureate • Solar Gold",
    accentLabel: "Amber",
    Component: ProfileAvatar4,
  },
  {
    number: 5,
    name: "Violet Sage",
    tagline: "Quantum Lens • Royal Purple",
    accentLabel: "Violet",
    Component: ProfileAvatar5,
  },
];

export function normalizeAvatarNumber(value?: number | null): AvatarNumber {
  if (value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }
  return 1;
}

export function getAvatarPreset(value?: number | null): ProfileAvatarPreset {
  const num = normalizeAvatarNumber(value);
  return (
    PROFILE_AVATAR_PRESETS.find((preset) => preset.number === num) ??
    PROFILE_AVATAR_PRESETS[0]!
  );
}

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  avatarNumber?: number | null;
  displayName?: string;
  className?: string;
}

/**
 * Renders the user's `avatarUrl` image if present, or falls back to the numbered
 * character avatar (`1` to `5`, defaulting to `1`).
 */
export function ProfileAvatar({
  avatarUrl,
  avatarNumber = 1,
  displayName = "Student",
  className,
}: ProfileAvatarProps) {
  const trimmedUrl = avatarUrl?.trim();

  if (trimmedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmedUrl}
        alt={displayName}
        className={cn(
          "size-10 shrink-0 rounded-full object-cover ring-2 ring-border",
          className
        )}
      />
    );
  }

  const preset = getAvatarPreset(avatarNumber);
  const AvatarSvg = preset.Component;

  return (
    <AvatarSvg
      className={cn(
        "size-10 shrink-0 rounded-full ring-2 ring-border",
        className
      )}
    />
  );
}

export {
  ProfileAvatar1,
  ProfileAvatar2,
  ProfileAvatar3,
  ProfileAvatar4,
  ProfileAvatar5,
};
