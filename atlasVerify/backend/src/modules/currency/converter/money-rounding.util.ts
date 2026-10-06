import { roundTo } from '@common/utils';
import { RoundingMode } from '../interfaces';

/**
 * Rounds a monetary amount to `decimals` places using the given mode.
 * The HALF_UP case delegates to the shared `roundTo()` utility rather than
 * re-implementing it; every other mode is implemented here since
 * `common/utils` only covers the single default rounding behavior.
 */
export function roundMoney(amount: number, decimals: number, mode: RoundingMode): number {
  if (mode === RoundingMode.HALF_UP) {
    return roundTo(amount, decimals);
  }

  const factor = Math.pow(10, decimals);
  const scaled = amount * factor;
  const sign = scaled < 0 ? -1 : 1;
  const abs = Math.abs(scaled);

  let rounded: number;
  switch (mode) {
    case RoundingMode.UP:
      rounded = Math.ceil(abs);
      break;
    case RoundingMode.DOWN:
      rounded = Math.floor(abs);
      break;
    case RoundingMode.CEILING:
      rounded = sign > 0 ? Math.ceil(abs) : Math.floor(abs);
      break;
    case RoundingMode.FLOOR:
      rounded = sign > 0 ? Math.floor(abs) : Math.ceil(abs);
      break;
    case RoundingMode.HALF_DOWN: {
      const frac = abs - Math.floor(abs);
      rounded = frac <= 0.5 ? Math.floor(abs) : Math.ceil(abs);
      break;
    }
    case RoundingMode.HALF_EVEN: {
      const floor = Math.floor(abs);
      const frac = abs - floor;
      if (frac < 0.5) rounded = floor;
      else if (frac > 0.5) rounded = floor + 1;
      else rounded = floor % 2 === 0 ? floor : floor + 1;
      break;
    }
    default:
      rounded = Math.round(abs);
  }

  // CEILING/FLOOR already apply sign-aware rounding above; the rest round the
  // magnitude then reapply sign.
  const signed = mode === RoundingMode.CEILING || mode === RoundingMode.FLOOR ? rounded : sign * rounded;
  return signed / factor;
}
