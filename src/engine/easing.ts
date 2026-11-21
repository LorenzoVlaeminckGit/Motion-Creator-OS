import type { EasingType } from '../types/motion';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function applyEasing(t: number, easing: EasingType): number {
  const x = clamp(t, 0, 1);

  switch (easing) {
    case 'linear':
      return x;
    case 'easeInQuad':
      return x * x;
    case 'easeOutQuad':
      return 1 - (1 - x) * (1 - x);
    case 'easeInOutCubic':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    case 'easeOutExpo':
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    case 'springElastic': {
      if (x === 0 || x === 1) return x;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
    case 'bounceOut': {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        const u = x - 1.5 / d1;
        return n1 * u * u + 0.75;
      } else if (x < 2.5 / d1) {
        const u = x - 2.25 / d1;
        return n1 * u * u + 0.9375;
      } else {
        const u = x - 2.625 / d1;
        return n1 * u * u + 0.984375;
      }
    }
    default:
      return x;
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  let r = 255;
  let g = 255;
  let b = 255;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) || 0;
    g = parseInt(clean[1] + clean[1], 16) || 0;
    b = parseInt(clean[2] + clean[2], 16) || 0;
  } else if (clean.length >= 6) {
    r = parseInt(clean.slice(0, 2), 16) || 0;
    g = parseInt(clean.slice(2, 4), 16) || 0;
    b = parseInt(clean.slice(4, 6), 16) || 0;
  }

  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}
