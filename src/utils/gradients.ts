export const GRADIENTS = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
] as const;

export type GradientKey = typeof GRADIENTS[number];

export const GRADIENT_STYLES: Record<GradientKey, string> = {
  'gradient-1': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
  'gradient-2': 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)',
  'gradient-3': 'linear-gradient(135deg, #fb923c 0%, #f472b6 100%)',
  'gradient-4': 'linear-gradient(135deg, #e879f9 0%, #818cf8 100%)',
  'gradient-5': 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
  'gradient-6': 'linear-gradient(135deg, #c084fc 0%, #f9a8d4 100%)',
  'gradient-7': 'linear-gradient(135deg, #fbbf24 0%, #f472b6 100%)',
  'gradient-8': 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)',
};
