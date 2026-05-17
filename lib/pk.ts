// Pharmacokinetics for the most-used HRT injectables, patches, and gels.
//
// One-compartment model with first-order absorption (Bateman equation).
// For a dose D given at time t0, serum concentration at time t > t0 is:
//
//   C(t) = scale_per_mg * D * (e^(-ke*(t-t0)) - e^(-ka*(t-t0)))
//
// `scale_per_mg`, `ka`, and `ke` are calibrated so the single-dose peak
// height and time match published mean values for each ester. This is a
// teaching/visualization model, not a clinical decision tool — peak time
// and steady-state behavior are the right shape, but inter-patient
// variability is enormous and the absolute numbers are population means.
//
// Sources for the calibration anchors:
//   - Testosterone cypionate/enanthate: AACE/ES guidelines, ~1100 ng/dL
//     peak from 200 mg IM, ~3 day t_max, ~8 day apparent t½.
//   - Estradiol valerate 4 mg IM: ~600–800 pg/mL peak ~24–72 h, ~4–5 d t½.
//   - Estradiol cypionate 5 mg IM: ~300–400 pg/mL peak ~3–5 d.
//   - Transdermal estradiol patch & gel: modeled as steady release while
//     applied (zero-order); we approximate steady-state level given the
//     daily delivered dose.

export type HormoneKind = "estradiol" | "testosterone";
export type RouteKind = "im_oil" | "subq_oil" | "patch" | "gel" | "oral_sublingual";

export interface DrugSpec {
  id: string;
  label: string;
  short: string;
  hormone: HormoneKind;
  route: RouteKind;
  units: "pg/mL" | "ng/dL";
  ka: number;
  ke: number;
  scale_per_mg: number;
  default_dose_mg: number;
  default_interval_days: number;
  // Clinical target window. Values are heuristics for "expected to keep
  // most patients in the gender-affirming target range."
  target_min: number;
  target_max: number;
  note: string;
}

export const DRUGS: DrugSpec[] = [
  {
    id: "ev_im",
    label: "Estradiol valerate (IM/SubQ)",
    short: "EV",
    hormone: "estradiol",
    route: "im_oil",
    units: "pg/mL",
    ka: 1.5,
    ke: 0.16,
    scale_per_mg: 275,
    default_dose_mg: 4,
    default_interval_days: 7,
    target_min: 100,
    target_max: 200,
    note: "Common starting regimen. Trough drawn just before next dose.",
  },
  {
    id: "ec_im",
    label: "Estradiol cypionate (IM/SubQ)",
    short: "EC",
    hormone: "estradiol",
    route: "im_oil",
    units: "pg/mL",
    ka: 0.4,
    ke: 0.069,
    scale_per_mg: 115,
    default_dose_mg: 5,
    default_interval_days: 7,
    target_min: 100,
    target_max: 200,
    note: "Smoother curve than EV. Longer half-life means biweekly dosing is possible.",
  },
  {
    id: "ee_im",
    label: "Estradiol enanthate (IM/SubQ)",
    short: "EEn",
    hormone: "estradiol",
    route: "im_oil",
    units: "pg/mL",
    ka: 0.6,
    ke: 0.10,
    scale_per_mg: 220,
    default_dose_mg: 10,
    default_interval_days: 14,
    target_min: 100,
    target_max: 200,
    note: "Long-acting; commonly dosed every 7–14 days.",
  },
  {
    id: "e_patch",
    label: "Estradiol patch",
    short: "E2 patch",
    hormone: "estradiol",
    route: "patch",
    units: "pg/mL",
    ka: 100,
    ke: 0.7,
    scale_per_mg: 1500,
    default_dose_mg: 0.1,
    default_interval_days: 3.5,
    target_min: 100,
    target_max: 200,
    note: "0.1 mg/day patch ≈ ~80–100 pg/mL steady state. Lower VTE risk than oral.",
  },
  {
    id: "tc_im",
    label: "Testosterone cypionate (IM/SubQ)",
    short: "T cyp",
    hormone: "testosterone",
    route: "im_oil",
    units: "ng/dL",
    ka: 0.35,
    ke: 0.087,
    scale_per_mg: 11.6,
    default_dose_mg: 100,
    default_interval_days: 7,
    target_min: 320,
    target_max: 1000,
    note: "Standard masculinizing dose. Weekly = smoother trough than biweekly.",
  },
  {
    id: "te_im",
    label: "Testosterone enanthate (IM/SubQ)",
    short: "T enan",
    hormone: "testosterone",
    route: "im_oil",
    units: "ng/dL",
    ka: 0.5,
    ke: 0.154,
    scale_per_mg: 13.4,
    default_dose_mg: 100,
    default_interval_days: 7,
    target_min: 320,
    target_max: 1000,
    note: "Slightly faster decay than cypionate; weekly trough lower.",
  },
  {
    id: "t_gel",
    label: "Testosterone gel (transdermal)",
    short: "T gel",
    hormone: "testosterone",
    route: "gel",
    units: "ng/dL",
    ka: 12,
    ke: 0.7,
    scale_per_mg: 8.5,
    default_dose_mg: 50,
    default_interval_days: 1,
    target_min: 320,
    target_max: 1000,
    note: "Daily application — steady levels but transference risk to others.",
  },
];

export interface DosePoint {
  day: number;
  mg: number;
}

export interface SimulationPoint {
  day: number;
  level: number;
}

export interface SimulationResult {
  drug: DrugSpec;
  series: SimulationPoint[];
  doses: DosePoint[];
  // Useful summary readouts.
  next_dose_day: number;
  peak_value: number;
  peak_day: number;
  trough_value: number;
  trough_day: number;
  best_lab_day: number;
  steady_state: boolean;
}

// Generate a dose schedule starting `lookback_days` ago and projecting
// `lookahead_days` into the future at fixed intervals.
export function buildSchedule(
  intervalDays: number,
  doseMg: number,
  lookbackDays: number,
  lookaheadDays: number
): DosePoint[] {
  const doses: DosePoint[] = [];
  // Lay down 10 historical doses so steady-state is achieved before day 0.
  for (let i = -10; i * intervalDays <= lookaheadDays; i++) {
    const day = i * intervalDays;
    if (day < -lookbackDays - 90) continue;
    doses.push({ day, mg: doseMg });
  }
  return doses;
}

// Concentration at time `t` (days from now) given a dose schedule.
export function concentrationAt(drug: DrugSpec, doses: DosePoint[], t: number): number {
  let total = 0;
  for (const { day: t0, mg } of doses) {
    const dt = t - t0;
    if (dt <= 0) continue;
    const contribution =
      drug.scale_per_mg *
      mg *
      (Math.exp(-drug.ke * dt) - Math.exp(-drug.ka * dt));
    if (contribution > 0) total += contribution;
  }
  return total;
}

export function simulate(
  drug: DrugSpec,
  doseMg: number,
  intervalDays: number,
  windowDays = 30,
  resolution = 200
): SimulationResult {
  const doses = buildSchedule(intervalDays, doseMg, 14, windowDays);
  const series: SimulationPoint[] = [];
  for (let i = 0; i <= resolution; i++) {
    const t = -14 + (i / resolution) * (windowDays + 14);
    series.push({ day: t, level: concentrationAt(drug, doses, t) });
  }

  // Look at the forward window only for peak/trough labels.
  const forward = series.filter((p) => p.day >= 0 && p.day <= windowDays);
  let peak = forward[0];
  let trough = forward[0];
  for (const p of forward) {
    if (p.level > peak.level) peak = p;
    if (p.level < trough.level) trough = p;
  }

  // Next dose = smallest dose-day > 0
  const futureDoses = doses.filter((d) => d.day > 0).sort((a, b) => a.day - b.day);
  const next_dose_day = futureDoses[0]?.day ?? intervalDays;

  // "Best lab day" = right before next dose (trough draw).
  const best_lab_day = Math.max(0, next_dose_day - 0.5);

  // Approximate steady-state check: compare two consecutive intervals.
  const winA = forward.filter((p) => p.day >= 0 && p.day < intervalDays);
  const winB = forward.filter(
    (p) => p.day >= intervalDays && p.day < 2 * intervalDays
  );
  const auc = (arr: SimulationPoint[]) => arr.reduce((a, p) => a + p.level, 0);
  const steady_state =
    winB.length > 0 && Math.abs(auc(winB) - auc(winA)) / Math.max(1, auc(winA)) < 0.05;

  return {
    drug,
    series,
    doses,
    next_dose_day,
    peak_value: peak.level,
    peak_day: peak.day,
    trough_value: trough.level,
    trough_day: trough.day,
    best_lab_day,
    steady_state,
  };
}

export function getDrug(id: string): DrugSpec | null {
  return DRUGS.find((d) => d.id === id) || null;
}
