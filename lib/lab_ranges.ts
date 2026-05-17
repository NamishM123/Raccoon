// Hard-coded reference ranges for labs commonly monitored on gender-affirming
// HRT. Sources: WPATH SOC-8 monitoring chapter, Endocrine Society 2017
// guideline, UCSF Center of Excellence for Transgender Health protocols.
//
// These are TARGET ranges (what providers aim for on HRT), which is not the
// same as the lab's printed "normal" range. The printed range is usually
// stratified male/female on assigned-at-birth — useless for someone whose
// hormones don't match. The Endocrine Society guidance is to interpret most
// HRT-affected labs against the *affirmed* sex's reference once steady-state
// HRT has been reached, with a handful of HRT-specific targets layered on top.
//
// Every range here is conservative: we'd rather flag a borderline value as
// "monitor" than miss something. Nothing in this file is a substitute for
// a clinician.

import type { HrtDirection, Profile } from "./profile";

export type RangeStatus = "low" | "on-target" | "monitor" | "high" | "unknown";

export interface LabTarget {
  // Canonical name shown to the user.
  display: string;
  // Patterns matched against the lab name the user typed / Claude parsed.
  // First match wins; order matters.
  match: RegExp;
  // Unit we expect the value in. We only interpret if units agree (or are
  // close enough — see normalizeUnit).
  unit: string;
  // The interpretation function gets the numeric value plus the patient
  // context and returns a status + a one-line explanation.
  interpret: (
    value: number,
    ctx: { direction: HrtDirection; profile: Profile }
  ) => { status: RangeStatus; low: number | null; high: number | null; note: string };
  // Optional context shown alongside even when in range.
  context?: string;
}

const FEM = (d: HrtDirection) => d === "feminizing" || d === "nonbinary";
const MASC = (d: HrtDirection) => d === "masculinizing" || d === "nonbinary";

function band(
  value: number,
  low: number,
  high: number,
  note: string
): { status: RangeStatus; low: number; high: number; note: string } {
  if (value < low) return { status: "low", low, high, note };
  if (value > high) return { status: "high", low, high, note };
  return { status: "on-target", low, high, note };
}

export const LAB_TARGETS: LabTarget[] = [
  {
    display: "Estradiol (E2)",
    match: /\b(estradiol|\be2\b|oestradiol)\b/i,
    unit: "pg/mL",
    interpret: (v, { direction }) => {
      if (FEM(direction)) {
        // WPATH/Endo Soc: aim for premenopausal female range, ~100–200 pg/mL.
        const r = band(v, 100, 200, "Target for feminizing HRT: 100–200 pg/mL.");
        if (v > 350) return { ...r, status: "high", note: "Above 350 pg/mL — ask about lowering the dose; higher levels don't add benefit and may raise VTE risk." };
        if (r.status === "on-target") return r;
        if (v >= 50 && v < 100) return { ...r, status: "monitor", note: "Below the usual feminizing target (100–200). Could mean low dose, missed dose, or trough timing on injections." };
        return r;
      }
      if (MASC(direction)) {
        // On testosterone, E2 is usually a downstream aromatization byproduct;
        // <50 is typical, but mid-range can be normal too.
        return band(v, 10, 50, "On testosterone, E2 is usually <50 pg/mL. Higher can mean aromatization — usually not actionable on its own.");
      }
      return { status: "unknown", low: null, high: null, note: "" };
    },
  },
  {
    display: "Total testosterone",
    match: /\b(total\s*)?testosterone\b(?!.*free)/i,
    unit: "ng/dL",
    interpret: (v, { direction }) => {
      if (MASC(direction)) {
        // Endo Soc target: 400–700 ng/dL trough on masc HRT.
        const r = band(v, 400, 700, "Target for masculinizing HRT: 400–700 ng/dL at trough.");
        if (v > 1000) return { ...r, status: "high", note: "Above 1000 ng/dL — usually means dose is too high or labs drawn too close to injection. Higher levels don't speed transition." };
        if (v < 300 && r.status !== "on-target") return { ...r, status: "monitor", note: "Below 300 — could be a low dose, missed dose, or peak-vs-trough timing issue." };
        return r;
      }
      if (FEM(direction)) {
        // On anti-androgens, target is "female range" — usually <55 ng/dL.
        const r = band(v, 0, 55, "Target on feminizing HRT (with anti-androgen): under 55 ng/dL.");
        if (v > 200) return { ...r, status: "high", note: "Anti-androgen may not be working — ask about dose or adherence." };
        return r;
      }
      return { status: "unknown", low: null, high: null, note: "" };
    },
  },
  {
    display: "Potassium",
    match: /\b(potassium|\bk\+?\b|serum\s*k)\b/i,
    unit: "mmol/L",
    interpret: (v, { profile }) => {
      const onSpiro = profile.medications.some((m) => /spirono/i.test(m.description));
      const r = band(v, 3.5, 5.0, onSpiro ? "Spironolactone raises K+. Target: under 5.5." : "Normal range 3.5–5.0 mmol/L.");
      if (onSpiro && v > 5.5) return { ...r, status: "high", note: "Above 5.5 on spironolactone — talk to your doctor about dose or switching to bicalutamide. Risky for the heart at this level." };
      if (onSpiro && v >= 5.0 && v <= 5.5) return { ...r, status: "monitor", note: "Upper-normal on spironolactone — common, but worth watching. Avoid potassium-rich electrolyte powders." };
      return r;
    },
    context: "Spironolactone (a common feminizing anti-androgen) raises potassium. Salt substitutes, ACE inhibitors, and NSAIDs can push it higher.",
  },
  {
    display: "Hematocrit",
    match: /\b(hematocrit|haematocrit|\bhct\b)\b/i,
    unit: "%",
    interpret: (v, { direction }) => {
      if (MASC(direction)) {
        // Testosterone-driven erythrocytosis. Endo Soc: action threshold ~54%.
        const r = band(v, 36, 50, "Testosterone raises hematocrit. Watch over 50%, action over 54%.");
        if (v > 54) return { ...r, status: "high", note: "Above 54% on testosterone is the threshold to act — your doctor may want to lower the dose, switch routes, or do a therapeutic phlebotomy." };
        if (v >= 50 && v <= 54) return { ...r, status: "monitor", note: "Upper-normal on T — common, mention at your next visit and recheck in 3 months." };
        return r;
      }
      if (FEM(direction)) {
        // Estrogen lowers hematocrit toward "female" range.
        return band(v, 35, 45, "On estrogen, hematocrit usually settles in the 35–45% range.");
      }
      return { status: "unknown", low: null, high: null, note: "" };
    },
  },
  {
    display: "Hemoglobin",
    match: /\b(hemoglobin|haemoglobin|\bhgb\b|\bhb\b)\b/i,
    unit: "g/dL",
    interpret: (v, { direction }) => {
      if (MASC(direction)) return band(v, 13, 17, "Testosterone raises Hgb toward 'male' range.");
      if (FEM(direction)) return band(v, 12, 15, "On estrogen, Hgb usually 12–15.");
      return { status: "unknown", low: null, high: null, note: "" };
    },
  },
  {
    display: "Prolactin",
    match: /\b(prolactin|\bprl\b)\b/i,
    unit: "ng/mL",
    interpret: (v, { direction }) => {
      if (FEM(direction)) {
        // Estrogen mildly raises prolactin. Action threshold ~25 ng/mL or
        // doubling without explanation.
        const r = band(v, 0, 25, "Estrogen can raise prolactin slightly. Watch over 25 ng/mL.");
        if (v > 50) return { ...r, status: "high", note: "Above 50 ng/mL — ask about pituitary imaging (rare but checked for) and review estrogen dose." };
        return r;
      }
      return band(v, 2, 18, "Normal prolactin range.");
    },
  },
  {
    display: "Creatinine",
    match: /\b(creatinine|\bcr\b|\bscr\b)\b/i,
    unit: "mg/dL",
    interpret: (v, { direction }) => {
      // Creatinine tracks muscle mass — shifts with HRT direction.
      if (MASC(direction)) return band(v, 0.7, 1.3, "Testosterone tends to raise creatinine via muscle gain — not kidney damage on its own.");
      if (FEM(direction)) return band(v, 0.5, 1.0, "Estrogen tends to lower creatinine via muscle loss.");
      return { status: "unknown", low: null, high: null, note: "" };
    },
  },
  {
    display: "ALT (liver)",
    match: /\b(alt|sgpt|alanine)\b/i,
    unit: "U/L",
    interpret: (v) => band(v, 7, 56, "Most HRT regimens do not meaningfully raise ALT. Sustained elevation deserves a workup."),
  },
  {
    display: "AST (liver)",
    match: /\b(ast|sgot|aspartate)\b/i,
    unit: "U/L",
    interpret: (v) => band(v, 10, 40, ""),
  },
  {
    display: "LDL cholesterol",
    match: /\b(ldl)\b/i,
    unit: "mg/dL",
    interpret: (v, { direction }) => {
      const r = band(v, 0, 100, "Target under 100 mg/dL.");
      if (MASC(direction) && v >= 100) {
        return { ...r, status: "monitor", note: "Testosterone can raise LDL and lower HDL. Worth a recheck and a chat about cardiovascular risk." };
      }
      return r;
    },
  },
  {
    display: "HDL cholesterol",
    match: /\b(hdl)\b/i,
    unit: "mg/dL",
    interpret: (v, { direction }) => {
      if (MASC(direction)) {
        if (v < 40) return { status: "monitor", low: 40, high: 60, note: "Testosterone tends to lower HDL — under 40 deserves attention." };
      }
      return band(v, 40, 100, "Higher is better. Under 40 is a cardiovascular risk factor.");
    },
  },
  {
    display: "Triglycerides",
    match: /\b(triglyceride|trig)\b/i,
    unit: "mg/dL",
    interpret: (v) => band(v, 0, 150, "Oral estrogen can raise triglycerides — transdermal is gentler."),
  },
];

export interface LabReading {
  name: string;
  value: string;
  unit: string;
}

export interface LabInterpretation {
  matched: boolean;
  display: string;
  numericValue: number | null;
  unit: string;
  expectedUnit: string;
  status: RangeStatus;
  low: number | null;
  high: number | null;
  note: string;
  context: string;
}

function normalizeUnit(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, "");
}

function unitsCompatible(provided: string, expected: string): boolean {
  const a = normalizeUnit(provided);
  const b = normalizeUnit(expected);
  if (!a) return true; // user didn't specify, assume default
  if (a === b) return true;
  // A few common variants
  if (a === "mmol/l" && b === "meq/l") return true;
  if (a === "meq/l" && b === "mmol/l") return true;
  return false;
}

export function interpretLab(reading: LabReading, profile: Profile): LabInterpretation {
  const direction = (profile.hrt_direction || "") as HrtDirection;
  const target = LAB_TARGETS.find((t) => t.match.test(reading.name));
  const value = parseFloat(reading.value.replace(/[^\d.+-]/g, ""));
  if (!target) {
    return {
      matched: false,
      display: reading.name,
      numericValue: Number.isFinite(value) ? value : null,
      unit: reading.unit,
      expectedUnit: "",
      status: "unknown",
      low: null,
      high: null,
      note: "",
      context: "",
    };
  }
  if (!Number.isFinite(value) || !unitsCompatible(reading.unit, target.unit)) {
    return {
      matched: true,
      display: target.display,
      numericValue: Number.isFinite(value) ? value : null,
      unit: reading.unit,
      expectedUnit: target.unit,
      status: "unknown",
      low: null,
      high: null,
      note: !Number.isFinite(value)
        ? "Couldn't read the value as a number."
        : `Expected units ${target.unit}, got ${reading.unit}. Skipping interpretation.`,
      context: target.context || "",
    };
  }
  const out = target.interpret(value, { direction, profile });
  return {
    matched: true,
    display: target.display,
    numericValue: value,
    unit: target.unit,
    expectedUnit: target.unit,
    status: out.status,
    low: out.low,
    high: out.high,
    note: out.note,
    context: target.context || "",
  };
}

export function statusLabel(s: RangeStatus): string {
  switch (s) {
    case "on-target":
      return "On target";
    case "monitor":
      return "Monitor";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "No range";
  }
}
