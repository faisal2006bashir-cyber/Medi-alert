import { Platform, useColorScheme } from 'react-native';

const light = {
  bg: '#f2f6f5', surface: '#ffffff', surfaceAlt: '#e9f1ef', ink: '#10302a', muted: '#5b7771', line: '#dbe6e2',
  brand: '#0f7b6c', brandInk: '#ffffff', brandSoft: '#dff2ed', okBg: '#e0f3ed', warn: '#8f5400', warnBg: '#fff1d6',
  alert: '#b73a27', alertBg: '#fde9e5', scrim: 'rgba(8, 24, 21, 0.5)'
};

const dark = {
  bg: '#0c1816', surface: '#15282a', surfaceAlt: '#1c3335', ink: '#e7f2ee', muted: '#9bb5ae', line: '#28423c',
  brand: '#3fc7ae', brandInk: '#06201b', brandSoft: '#16403a', okBg: '#153a31', warn: '#f0b04a', warnBg: '#3a2c10',
  alert: '#ff917e', alertBg: '#3e1d18', scrim: 'rgba(0, 0, 0, 0.65)'
};

export const radius = { sm: 10, md: 14, lg: 22, pill: 999 };

/** Returns the color palette that matches the device appearance setting. */
export function useColors() {
  return useColorScheme() === 'dark' ? dark : light;
}

/** A soft shadow that works on both platforms. */
export const softShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 }
});
