// Trajectory math for longitudinal labs. Pure functions, no React.
//
// We do three things:
//   1. Personal noise band — your μ ± 2σ across your own history.
//   2. Linear regression — slope (units/month), intercept, R².
//   3. Threshold projection — months until the regression line crosses a
//      clinically meaningful threshold, given current slope.
//
// None of this needs a doctor. None of this needs a server. It's just the
// math the medical system structurally fails to do for you.

export interface LabPoint {
  // Days since epoch (chosen because Date math is awful and floats are fine).
  t: number;
  value: number;
  // Display passthrough.
  date: string;
  id: string;
}

export interface Regression {
  slope: number; // units per day
  intercept: number;
  r2: number;
  n: number;
}

export interface NoiseBand {
  mean: number;
  sd: number;
  lo: number; // mean - 2σ
  hi: number; // mean + 2σ
}

export interface ThresholdCrossing {
  threshold: number;
  direction: "above" | "below";
  // Days from "now" (the latest point) until the regression line crosses.
  // Null if the slope is going the wrong way or already crossed.
  days_until: number | null;
  already_crossed: boolean;
}

export function parseDate(s: string): number | null {
  if (!s) return null;
  // Accept YYYY-MM-DD, YYYY-MM, YYYY, or anything Date can parse.
  let d: Date;
  if (/^\d{4}$/.test(s)) d = new Date(`${s}-06-15`);
  else if (/^\d{4}-\d{2}$/.test(s)) d = new Date(`${s}-15`);
  else d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 86400000);
}

export function regress(points: LabPoint[]): Regression | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (const p of points) {
    sumX += p.t;
    sumY += p.value;
    sumXY += p.t * p.value;
    sumXX += p.t * p.t;
    sumYY += p.value * p.value;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const ssTot = sumYY - (sumY * sumY) / n;
  const ssRes = points.reduce((acc, p) => {
    const pred = slope * p.t + intercept;
    return acc + (p.value - pred) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2, n };
}

export function noiseBand(points: LabPoint[]): NoiseBand | null {
  if (points.length === 0) return null;
  const mean = points.reduce((a, p) => a + p.value, 0) / points.length;
  const variance =
    points.reduce((a, p) => a + (p.value - mean) ** 2, 0) / Math.max(1, points.length - 1);
  const sd = Math.sqrt(variance);
  return { mean, sd, lo: mean - 2 * sd, hi: mean + 2 * sd };
}

export function projectThreshold(
  reg: Regression,
  latestPoint: LabPoint,
  threshold: number,
  direction: "above" | "below"
): ThresholdCrossing {
  const latestValue = reg.slope * latestPoint.t + reg.intercept;
  const alreadyCrossed = direction === "above" ? latestValue >= threshold : latestValue <= threshold;
  if (alreadyCrossed) {
    return { threshold, direction, days_until: 0, already_crossed: true };
  }
  // Will slope ever reach threshold?
  const movingTowards = direction === "above" ? reg.slope > 0 : reg.slope < 0;
  if (!movingTowards) {
    return { threshold, direction, days_until: null, already_crossed: false };
  }
  const tCross = (threshold - reg.intercept) / reg.slope;
  const days = tCross - latestPoint.t;
  return {
    threshold,
    direction,
    days_until: days > 0 ? days : null,
    already_crossed: false,
  };
}

// Convert days to a friendly "in N months" string.
export function describeDays(d: number): string {
  if (d <= 0) return "now";
  if (d < 14) return `${Math.round(d)} days`;
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  if (d < 365) return `${Math.round(d / 30.4)} months`;
  return `${(d / 365.25).toFixed(1)} years`;
}

export function slopePerMonth(reg: Regression): number {
  return reg.slope * 30.4;
}
