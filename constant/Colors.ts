import { DeviceEventEmitter, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure Colors object contains at least these keys across the app:
// background, surface, border, textPrimary, textSecondary, primary

export type ThemeName = 'light' | 'dark' | 'system';

// Use current Colors.primary as base to keep your brand color consistent
const BRAND_PRIMARY: string = '#3B82F6';

const LIGHT_PALETTE = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  primary: BRAND_PRIMARY,
  // New: hero background for weather section
  heroBg: '#D0E4FF',
};

const DARK_PALETTE = {
  background: '#0B0F14',
  surface: '#141A22',
  border: '#2B3440',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
  primary: BRAND_PRIMARY,
  // New: hero background for weather section
  heroBg: '#0F172A',
};

let currentTheme: ThemeName = 'light';
let followSystem = true;

export const applyTheme = (name: ThemeName) => {
  currentTheme = name;
  const mode = name === 'system'
    ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
    : name;
  const pal = mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  // Mutate the shared Colors object so all imports see the new palette
  Object.assign(Colors as any, pal, { heroBg: pal.heroBg });
};

// React to SettingsScreen/theme changes (supports 'system')
DeviceEventEmitter.addListener('appThemeChanged', (name: ThemeName) => {
  followSystem = name === 'system';
  applyTheme(name);
});

// Initialize from persisted preference or system at startup
(async () => {
  try {
    const saved = await AsyncStorage.getItem('themePreference');
    if (saved === 'dark' || saved === 'light') {
      followSystem = false;
      applyTheme(saved as ThemeName);
    } else {
      followSystem = true;
      applyTheme('system');
    }
  } catch {
    followSystem = true;
    applyTheme('system');
  }
})();

// Follow OS changes when in 'system' mode
Appearance.addChangeListener(() => {
  if (followSystem || currentTheme === 'system') {
    applyTheme('system');
  }
});

export const Colors = {
  // Static brand + light defaults (will be mutated by applyTheme)
  primary: '#4eb2f5',
  primaryDark: '#1E40AF',
  onPrimary: '#FFFFFF',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  error: '#ef4444',
  shadow: '#00000033',
  // New: explicit hero backgrounds
  heroBg: '#D0E4FF',
  heroBgLight: LIGHT_PALETTE.heroBg,
  heroBgDark: DARK_PALETTE.heroBg,
  // New: expose dark variants for screens that read *Dark keys
  backgroundDark: DARK_PALETTE.background,
  surfaceDark: DARK_PALETTE.surface,
  borderDark: DARK_PALETTE.border,
  textPrimaryDark: DARK_PALETTE.textPrimary,
  textSecondaryDark: DARK_PALETTE.textSecondary,
};

export const Font = {
  light: 'Dongle-Light',
  regular: 'Dongle-Regular',
  bold: 'Dongle-Bold',
  medium: 'Dongle-Regular', // fallback to regular for now
};

export const Spacing = (multiplier = 1) => 4 * multiplier;
export const Radius = 12;