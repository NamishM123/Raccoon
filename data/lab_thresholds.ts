// Clinical action thresholds per lab. When a personal trend is projected
// to cross one of these, the trajectory engine alerts. These are
// established cutoffs from major guidelines (Endocrine Society 2017,
// WPATH SOC v8, KDIGO, AASLD), not opinions.

export interface LabThreshold {
  // Lab name matcher (lowercased substring match).
  name: string;
  unit: string;
  // Display label.
  label: string;
  // Direction of concern.
  concern: "above" | "below";
  // Threshold where concern becomes clinically meaningful.
  threshold: number;
  // Short one-line context for the alert.
  note: string;
  // Color for the chart's threshold line.
  tone: "red" | "amber";
}

export const LAB_THRESHOLDS: LabThreshold[] = [
  {
    name: "hematocrit",
    unit: "%",
    label: "Hematocrit",
    concern: "above",
    threshold: 52,
    note: "Above 52% → therapeutic phlebotomy or dose reduction is typically discussed.",
    tone: "red",
  },
  {
    name: "hemoglobin",
    unit: "g/dL",
    label: "Hemoglobin",
    concern: "above",
    threshold: 18,
    note: "Above 18 g/dL → erythrocytosis workup.",
    tone: "red",
  },
  {
    name: "alt",
    unit: "U/L",
    label: "ALT",
    concern: "above",
    threshold: 100,
    note: "Above 3× upper limit (~100 U/L) → hepatology referral typically considered.",
    tone: "red",
  },
  {
    name: "ast",
    unit: "U/L",
    label: "AST",
    concern: "above",
    threshold: 100,
    note: "Above 3× upper limit → hepatology workup typically considered.",
    tone: "red",
  },
  {
    name: "potassium",
    unit: "mEq/L",
    label: "Potassium",
    concern: "above",
    threshold: 5.5,
    note: "Above 5.5 mEq/L → hyperkalemia. Spironolactone dose adjustment often needed.",
    tone: "red",
  },
  {
    name: "creatinine",
    unit: "mg/dL",
    label: "Creatinine",
    concern: "above",
    threshold: 1.3,
    note: "Sustained rise above ~1.3 mg/dL → kidney function review.",
    tone: "amber",
  },
  {
    name: "prolactin",
    unit: "ng/mL",
    label: "Prolactin",
    concern: "above",
    threshold: 50,
    note: "Above 50 ng/mL → pituitary imaging typically considered.",
    tone: "red",
  },
  {
    name: "estradiol",
    unit: "pg/mL",
    label: "Estradiol",
    concern: "above",
    threshold: 350,
    note: "Sustained trough > 350 pg/mL → elevated VTE risk; dose review.",
    tone: "amber",
  },
  {
    name: "testosterone",
    unit: "ng/dL",
    label: "Testosterone",
    concern: "above",
    threshold: 1100,
    note: "Sustained trough > 1100 ng/dL on masculinizing HRT → supraphysiologic; dose review.",
    tone: "amber",
  },
];

export function thresholdFor(labName: string): LabThreshold | null {
  if (!labName) return null;
  const key = labName.toLowerCase().replace(/[^a-z]/g, "");
  for (const t of LAB_THRESHOLDS) {
    const tkey = t.name.replace(/[^a-z]/g, "");
    if (key.includes(tkey) || tkey.includes(key)) return t;
  }
  return null;
}
