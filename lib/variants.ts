export interface Variant {
  id: string;
  label: string;
  verticalAlign: 'center' | 'bottom' | 'top';
  fontScale: number; // Multiplier relative to screen width
  fontWeight: "normal" | "bold";
  opacity: number;
  letterSpacing: string;
  offsetY: number; // % of height
  lineHeight: number;
}

export const VARIANTS: Record<string, Variant> = {
  'center-soft': {
    id: 'center-soft',
    label: 'Soft',
    verticalAlign: 'center',
    fontScale: 1.0, 
    fontWeight: "normal",
    opacity: 0.9,
    letterSpacing: '0.02em',
    offsetY: 0,
    lineHeight: 1.4,
  },
  'center-bold': {
    id: 'center-bold',
    label: 'Bold',
    verticalAlign: 'center',
    fontScale: 1.2,
    fontWeight: "bold",
    opacity: 1.0,
    letterSpacing: '0.05em',
    offsetY: 0,
    lineHeight: 1.2,
  },
  'bottom-subtle': {
    id: 'bottom-subtle',
    label: 'Subtle',
    verticalAlign: 'bottom',
    fontScale: 0.8,
    fontWeight: "normal",
    opacity: 0.8,
    letterSpacing: '0.05em',
    offsetY: -15, // Lift up by 15%
    lineHeight: 1.5,
  },
  'top-minimal': {
    id: 'top-minimal',
    label: 'Minimal',
    verticalAlign: 'top',
    fontScale: 0.7,
    fontWeight: "normal",
    opacity: 0.85,
    letterSpacing: '0.1em',
    offsetY: 15, // Push down by 15%
    lineHeight: 1.4,
  },
};

export const getVariant = (id: string): Variant => VARIANTS[id] || VARIANTS['center-soft'];
