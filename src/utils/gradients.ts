export const GRADIENTS = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
] as const;

export type GradientKey = typeof GRADIENTS[number];

export const GRADIENT_STYLES: Record<GradientKey, string> = {
  'gradient-1': '#e11d48',
  'gradient-2': '#7c3aed',
  'gradient-3': '#2563eb',
  'gradient-4': '#0891b2',
  'gradient-5': '#059669',
  'gradient-6': '#d97706',
  'gradient-7': '#dc2626',
  'gradient-8': '#475569',
};
