import type { MinorATC } from './models';

function assertMinorATC(value: number): asserts value is MinorATC {
  if (!Number.isSafeInteger(value)) {
    throw new Error('ATC amount must use safe integer minor units');
  }
}

export function atc(units: number): MinorATC {
  if (!Number.isFinite(units)) {
    throw new Error('ATC units must be finite');
  }

  const scaled = units * 100;
  const minor = Math.round(scaled);
  const floatingPointTolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (!Number.isSafeInteger(minor) || Math.abs(scaled - minor) > floatingPointTolerance) {
    throw new Error('ATC units must have at most two decimals');
  }

  return minor as MinorATC;
}

export function addATC(left: MinorATC, right: MinorATC): MinorATC {
  const result = left + right;
  assertMinorATC(result);
  return result;
}

export function subtractATC(left: MinorATC, right: MinorATC): MinorATC {
  const result = left - right;
  assertMinorATC(result);
  return result;
}

export function formatATC(amount: MinorATC): string {
  assertMinorATC(amount);
  const units = amount / 100;
  const hasFraction = Math.abs(amount % 100) > 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(units);
  return `${formatted} ATC`;
}
