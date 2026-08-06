export const colors = {
  primary: '#F2233C',
  primaryPressed: '#D91D34',
  primarySoft: '#FFF0F3',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#15171A',
  textMuted: '#69707A',
  border: '#E7E9ED',
  success: '#117A55',
  successSoft: '#EAF8F2',
  warning: '#A65C00',
  warningSoft: '#FFF4E5',
  danger: '#B42318',
  dangerSoft: '#FFF0EE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 39, fontWeight: '800' as const },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '800' as const },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;
