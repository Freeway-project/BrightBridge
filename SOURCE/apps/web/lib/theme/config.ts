export type ThemeType = 'ocean' | 'sunset' | 'monochrome' | 'aurora'

export interface ThemePalette {
  name: string
  description: string
  darkTwilightBase: string // DT-100
  darkTwilightMid: string  // DT-300
  darkTwilightDeep: string // DT-400
  primary: string          // Main action color
  primaryLight: string     // Lighter variant
  secondary: string        // Secondary accent
  accent: string           // Accent highlight
  foreground: string       // Text
  muted: string            // Muted text
}

export const THEME_PALETTES: Record<ThemeType, ThemePalette> = {
  ocean: {
    name: 'Ocean',
    description: 'Cool blues and teals',
    darkTwilightBase: '#010113',
    darkTwilightMid: '#020338',
    darkTwilightDeep: '#02044b',
    primary: '#00b4d8',           // Turquoise Surf
    primaryLight: '#12d8ff',
    secondary: '#0077b6',         // Bright Teal Blue
    accent: '#90e0ef',            // Frosted Blue
    foreground: '#caf0f8',
    muted: '#90e0ef',
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm oranges, purples, reds',
    darkTwilightBase: '#0f0607',
    darkTwilightMid: '#1a0b0e',
    darkTwilightDeep: '#2d1215',
    primary: '#ff6b35',           // Warm orange
    primaryLight: '#ff8c42',
    secondary: '#d62828',         // Red accent
    accent: '#f77f00',            // Golden orange
    foreground: '#fccdc4',        // Light warm
    muted: '#e8a87c',             // Muted warm
  },
  monochrome: {
    name: 'Monochrome',
    description: 'Grayscale minimal',
    darkTwilightBase: '#0a0a0a',
    darkTwilightMid: '#1f1f1f',
    darkTwilightDeep: '#333333',
    primary: '#ffffff',           // Pure white
    primaryLight: '#e0e0e0',
    secondary: '#808080',         // Medium gray
    accent: '#b3b3b3',            // Light gray
    foreground: '#e8e8e8',        // Almost white
    muted: '#666666',             // Dark gray
  },
  aurora: {
    name: 'Aurora',
    description: 'Purples, pinks, cool tones',
    darkTwilightBase: '#0d0621',
    darkTwilightMid: '#1a0f2e',
    darkTwilightDeep: '#2d1b4e',
    primary: '#b565d8',           // Purple
    primaryLight: '#d28ef9',      // Light purple
    secondary: '#e75480',         // Pink
    accent: '#f0a8d8',            // Light pink
    foreground: '#e8c4e8',        // Pale purple
    muted: '#b89fc9',             // Muted purple
  },
}

export const THEME_LIST = Object.entries(THEME_PALETTES).map(([key, value]) => ({
  id: key as ThemeType,
  ...value,
}))
