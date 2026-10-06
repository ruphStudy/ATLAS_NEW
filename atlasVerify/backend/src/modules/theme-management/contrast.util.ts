import { IThemeModeTokens, IContrastWarning } from './interfaces';
import { CONTRAST_TOKEN_PAIRS, MIN_CONTRAST_RATIO_NORMAL_TEXT } from './constants';

/** Relative luminance per the WCAG 2.x formula. */
function relativeLuminance(hex: string): number | null {
  const normalized = hex.replace('#', '');
  if (![3, 6].includes(normalized.length)) {
    return null;
  }
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  if (rgb.some((v) => Number.isNaN(v))) {
    return null;
  }

  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, in the range [1, 21]. Returns null if either color is unparseable. */
export function calculateContrastRatio(foreground: string, background: string): number | null {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === null || l2 === null) {
    return null;
  }
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Advisory-only — validates the conventional token pairs configured for this mode and reports anything under the minimum ratio. Never blocks a save; callers decide what to do with the warnings. */
export function validateModeContrast(mode: 'light' | 'dark', tokens: IThemeModeTokens): IContrastWarning[] {
  const warnings: IContrastWarning[] = [];
  for (const [foregroundToken, backgroundToken] of CONTRAST_TOKEN_PAIRS) {
    const foreground = tokens.colors[foregroundToken];
    const background = tokens.colors[backgroundToken];
    if (!foreground || !background) {
      continue;
    }
    const ratio = calculateContrastRatio(foreground, background);
    if (ratio !== null && ratio < MIN_CONTRAST_RATIO_NORMAL_TEXT) {
      warnings.push({
        pair: `${foregroundToken}/${backgroundToken}`,
        ratio: Math.round(ratio * 100) / 100,
        minimumRequired: MIN_CONTRAST_RATIO_NORMAL_TEXT,
        mode,
      });
    }
  }
  return warnings;
}
