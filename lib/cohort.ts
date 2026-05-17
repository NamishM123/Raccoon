// Synthetic cohort distributions for the "Missing Book" — what's normal
// for someone on a specific HRT regimen. Each entry is a (lab × regimen)
// cell with a published-literature-anchored mean, a realistic SD, and a
// seeded sample size. Real user opt-ins (when the backend is wired up)
// merge into these by re-fitting μ and σ and adding to N.
//
// Reference anchors are pulled from:
//   - Endocrine Society 2017 Guideline for Gender-Dysphoric/-Incongruent
//     Persons (Hembree et al., JCEM)
//   - WPATH SOC v8 monitoring tables
//   - UCSF Center of Excellence for Transgender Health protocols (2016)
//   - Published cohort studies (Defreyne et al. ENIGI, Velho et al.)
//
// None of these papers report the full joint distribution you'd need to
// say "you're in the 73rd percentile of people on EV 4mg IM weekly." We
// fill that gap with reasonable Normals seeded so the percentile answers
// look right at the tails and the center.

export interface CohortCell {
  lab: string;
  // Match against /api/labs/evidence-style regimen text.
  regimen_pattern: RegExp;
  regimen_label: string;
  unit: string;
  mean: number;
  sd: number;
  n: number;
}

export const COHORT: CohortCell[] = [
  // ─── Masculinizing — testosterone ────────────────────────────────────
  {
    lab: "hematocrit",
    regimen_pattern: /testosterone\s*cypionate.*(100|125|150).*weekly|t\s*cyp.*weekly/i,
    regimen_label: "T cypionate 100–150 mg weekly",
    unit: "%",
    mean: 47.2,
    sd: 3.0,
    n: 412,
  },
  {
    lab: "hematocrit",
    regimen_pattern: /testosterone|t\s*cyp|t\s*enan|androgel|t\s*gel/i,
    regimen_label: "Masculinizing HRT (any)",
    unit: "%",
    mean: 46.4,
    sd: 3.4,
    n: 1187,
  },
  {
    lab: "hemoglobin",
    regimen_pattern: /testosterone|t\s*cyp|t\s*enan|androgel/i,
    regimen_label: "Masculinizing HRT (any)",
    unit: "g/dL",
    mean: 15.6,
    sd: 1.1,
    n: 1043,
  },
  {
    lab: "testosterone",
    regimen_pattern: /testosterone\s*cypionate.*100.*weekly|t\s*cyp.*100.*weekly/i,
    regimen_label: "T cypionate 100 mg weekly (trough)",
    unit: "ng/dL",
    mean: 540,
    sd: 165,
    n: 287,
  },
  {
    lab: "testosterone",
    regimen_pattern: /testosterone\s*cypionate.*200.*biweekly|t\s*cyp.*200.*biweekly|every\s*2\s*weeks/i,
    regimen_label: "T cypionate 200 mg every 2 weeks (trough)",
    unit: "ng/dL",
    mean: 360,
    sd: 195,
    n: 196,
  },
  {
    lab: "testosterone",
    regimen_pattern: /testosterone|t\s*cyp|t\s*enan|androgel/i,
    regimen_label: "Masculinizing HRT (any)",
    unit: "ng/dL",
    mean: 510,
    sd: 230,
    n: 894,
  },

  // ─── Feminizing — estradiol + anti-androgen ──────────────────────────
  {
    lab: "estradiol",
    regimen_pattern: /estradiol\s*valerate.*4.*weekly|ev.*4.*weekly/i,
    regimen_label: "EV 4 mg IM weekly (trough)",
    unit: "pg/mL",
    mean: 158,
    sd: 62,
    n: 312,
  },
  {
    lab: "estradiol",
    regimen_pattern: /estradiol\s*cypionate.*5|ec.*5/i,
    regimen_label: "EC 5 mg IM weekly (trough)",
    unit: "pg/mL",
    mean: 142,
    sd: 51,
    n: 198,
  },
  {
    lab: "estradiol",
    regimen_pattern: /estradiol|estrogen|e2|spiro/i,
    regimen_label: "Feminizing HRT (any)",
    unit: "pg/mL",
    mean: 138,
    sd: 76,
    n: 1402,
  },
  {
    lab: "testosterone",
    regimen_pattern: /estradiol.*spironolactone|estradiol.*spiro|spiro.*estradiol/i,
    regimen_label: "Estradiol + spironolactone",
    unit: "ng/dL",
    mean: 28,
    sd: 19,
    n: 287,
  },
  {
    lab: "testosterone",
    regimen_pattern: /estradiol|estrogen|spiro|finasteride/i,
    regimen_label: "Feminizing HRT (any)",
    unit: "ng/dL",
    mean: 35,
    sd: 28,
    n: 612,
  },
  {
    lab: "potassium",
    regimen_pattern: /spironolactone|spiro/i,
    regimen_label: "On spironolactone",
    unit: "mEq/L",
    mean: 4.5,
    sd: 0.42,
    n: 743,
  },
  {
    lab: "creatinine",
    regimen_pattern: /spironolactone|spiro/i,
    regimen_label: "On spironolactone",
    unit: "mg/dL",
    mean: 0.88,
    sd: 0.16,
    n: 712,
  },
  {
    lab: "prolactin",
    regimen_pattern: /estradiol|estrogen|spiro/i,
    regimen_label: "Feminizing HRT (any)",
    unit: "ng/mL",
    mean: 18,
    sd: 12,
    n: 519,
  },
  {
    lab: "alt",
    regimen_pattern: /estradiol|estrogen|testosterone|t\s*cyp|bicalutamide/i,
    regimen_label: "On HRT (any)",
    unit: "U/L",
    mean: 24,
    sd: 11,
    n: 1322,
  },
];

export interface PercentileResult {
  cell: CohortCell;
  percentile: number;
  z: number;
  // The user's value normalized for the chart (0..1 across mean ± 3σ).
  position_norm: number;
}

const erf = (x: number): number => {
  // Abramowitz & Stegun 7.1.26 — sufficient for our display use.
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
};

const normalCdf = (value: number, mean: number, sd: number): number => {
  return 0.5 * (1 + erf((value - mean) / (sd * Math.SQRT2)));
};

export function findPercentile(
  labName: string,
  regimen: string,
  value: number
): PercentileResult | null {
  const labKey = labName.toLowerCase().replace(/[^a-z]/g, "");
  const candidates = COHORT.filter((c) => {
    const cLab = c.lab.replace(/[^a-z]/g, "");
    return labKey.includes(cLab) || cLab.includes(labKey);
  });
  if (candidates.length === 0) return null;
  // Pick the most specific match (longest matching regimen_pattern source)
  // whose pattern actually matches the regimen text. Fall back to "any HRT"
  // catch-alls when nothing more specific hits.
  const ranked = candidates
    .map((c) => ({ c, matches: c.regimen_pattern.test(regimen || "") }))
    .sort((a, b) => {
      if (a.matches !== b.matches) return a.matches ? -1 : 1;
      // Longer regex source ≈ more specific.
      return b.c.regimen_pattern.source.length - a.c.regimen_pattern.source.length;
    });
  const best = ranked[0]?.c;
  if (!best) return null;

  const cdf = normalCdf(value, best.mean, best.sd);
  const percentile = Math.round(cdf * 100);
  const z = (value - best.mean) / best.sd;
  const position_norm = Math.max(0, Math.min(1, (z + 3) / 6));

  return { cell: best, percentile, z, position_norm };
}

export function totalSampleSize(): number {
  return COHORT.reduce((acc, c) => acc + c.n, 0);
}

export function uniqueRegimens(): number {
  const set = new Set(COHORT.map((c) => c.regimen_label));
  return set.size;
}
