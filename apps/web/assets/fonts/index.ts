/**
 * Font assets for the NetMifi design system.
 * Add font files to this directory and export their paths here.
 *
 * @example
 * // Add font files like:
 * // - Inter-Regular.woff2
 * // - Inter-Bold.woff2
 * // - JetBrainsMono-Regular.woff2
 *
 * // Then export them:
 * // export { default as InterRegular } from "./Inter-Regular.woff2";
 */

/**
 * Font family names used in the design system.
 * These correspond to CSS variable names in globals.css.
 */
export const fontFamilies = {
	sans: "Inter",
	mono: "JetBrains Mono",
} as const;

/**
 * Font weights available in the design system.
 */
export const fontWeights = {
	regular: 400,
	medium: 500,
	semibold: 600,
	bold: 700,
} as const;

export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
