// Curated trans-HRT knowledge that the generic FDA/NLM APIs don't carry well.
// Every entry here is general clinical knowledge — drug names, RxCUIs (the
// real NLM identifiers), and well-known monitoring concerns from the
// Endocrine Society and WPATH SOC. The point is to make the app useful even
// when openFDA returns empty for an obscure drug, and to fold in trans-HRT
// context the generic FDA reports don't surface.

export interface CuratedDrug {
  // Canonical RxCUI from RxNorm. Real identifiers — these resolve at
  // https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm={rxcui}
  rxcui: string;
  generic: string;
  brand_names: string[];
  // Why a clinician monitors this in someone on HRT. One short line.
  monitoring_note: string;
  // Common HRT-relevant labs this drug shifts. Display as chips.
  watches: string[];
  // Aliases the user might type.
  aliases: string[];
}

export const CURATED_DRUGS: CuratedDrug[] = [
  {
    rxcui: "4083",
    generic: "estradiol",
    brand_names: ["Estrace", "Climara", "Vivelle-Dot", "Divigel"],
    monitoring_note:
      "Estradiol level guides dose. Watch liver enzymes with oral routes; transdermal has lower VTE risk than oral.",
    watches: ["Estradiol", "ALT", "AST", "Prolactin"],
    aliases: ["estradiol", "e2", "estrogen"],
  },
  {
    rxcui: "4100",
    generic: "estradiol valerate",
    brand_names: ["Delestrogen", "Progynova"],
    monitoring_note:
      "Long-acting injectable. Trough estradiol drawn just before next dose; peak ~24–72h after IM injection.",
    watches: ["Estradiol", "Hematocrit"],
    aliases: ["estradiol valerate", "ev", "delestrogen"],
  },
  {
    rxcui: "4124",
    generic: "estradiol cypionate",
    brand_names: ["Depo-Estradiol"],
    monitoring_note:
      "Long-acting injectable. Peak around 3–7 days post-injection; dose around the trough.",
    watches: ["Estradiol"],
    aliases: ["estradiol cypionate", "ec", "depo-estradiol"],
  },
  {
    rxcui: "9997",
    generic: "spironolactone",
    brand_names: ["Aldactone", "CaroSpir"],
    monitoring_note:
      "Potassium-sparing diuretic. Check potassium and creatinine at baseline, ~4 weeks after a dose change, then every 6–12 months. Mild creatinine rise is expected.",
    watches: ["Potassium", "Creatinine", "BUN", "Sodium"],
    aliases: ["spironolactone", "spiro", "aldactone"],
  },
  {
    rxcui: "4337",
    generic: "finasteride",
    brand_names: ["Proscar", "Propecia"],
    monitoring_note:
      "5α-reductase inhibitor. Lowers DHT. Generally well-tolerated; mood effects reported.",
    watches: ["Testosterone", "DHT"],
    aliases: ["finasteride", "fin", "propecia"],
  },
  {
    rxcui: "2069",
    generic: "bicalutamide",
    brand_names: ["Casodex"],
    monitoring_note:
      "Non-steroidal anti-androgen. Liver toxicity is the headline concern — check ALT/AST every 1–3 months early on.",
    watches: ["ALT", "AST", "Bilirubin"],
    aliases: ["bicalutamide", "bical", "casodex"],
  },
  {
    rxcui: "10379",
    generic: "testosterone cypionate",
    brand_names: ["Depo-Testosterone"],
    monitoring_note:
      "Long-acting injectable. Trough testosterone before next injection; expected to raise hematocrit. Check CBC at 3, 6, 12 months then yearly.",
    watches: ["Testosterone", "Hematocrit", "Hemoglobin", "ALT"],
    aliases: ["testosterone cypionate", "test cyp", "depo-t", "cypionate"],
  },
  {
    rxcui: "10387",
    generic: "testosterone enanthate",
    brand_names: ["Delatestryl", "Xyosted"],
    monitoring_note:
      "Long-acting injectable. Similar PK to cypionate — slightly faster decay. Watch hematocrit.",
    watches: ["Testosterone", "Hematocrit", "Hemoglobin"],
    aliases: ["testosterone enanthate", "test e", "enanthate"],
  },
  {
    rxcui: "37798",
    generic: "testosterone (transdermal)",
    brand_names: ["AndroGel", "Testim", "Fortesta"],
    monitoring_note:
      "Steady-state levels are smoother than injections. Watch for transference to others.",
    watches: ["Testosterone", "Hematocrit"],
    aliases: ["testosterone gel", "androgel", "transdermal testosterone"],
  },
  {
    rxcui: "8727",
    generic: "progesterone",
    brand_names: ["Prometrium"],
    monitoring_note:
      "Use in feminizing regimens is off-label and controversial; evidence for breast development is limited.",
    watches: ["Progesterone"],
    aliases: ["progesterone", "prog", "prometrium"],
  },
  {
    rxcui: "4179",
    generic: "leuprolide",
    brand_names: ["Lupron Depot", "Eligard"],
    monitoring_note:
      "GnRH agonist. Suppresses endogenous sex hormones. Bone density monitoring matters with long-term use without replacement.",
    watches: ["Testosterone", "Estradiol", "DXA"],
    aliases: ["leuprolide", "lupron"],
  },
  {
    rxcui: "30125",
    generic: "histrelin",
    brand_names: ["Supprelin LA"],
    monitoring_note:
      "GnRH agonist implant. Same monitoring concerns as leuprolide.",
    watches: ["Testosterone", "Estradiol"],
    aliases: ["histrelin", "supprelin"],
  },
];

// HRT-induced lab shifts a clinician would expect. These power the "expected
// for your regimen" verdict so the app can be assertive even when no PubMed
// citation comes back live.
export interface LabShift {
  // Lab name, lowercased for matching.
  name: string;
  // Which regimen pattern triggers the shift.
  regimen: "feminizing" | "masculinizing" | "blockers" | "any-hrt";
  direction: "up" | "down" | "shifts-to-natal-opposite";
  // Plain-language note.
  note: string;
}

export const LAB_SHIFTS: LabShift[] = [
  {
    name: "hematocrit",
    regimen: "masculinizing",
    direction: "up",
    note: "Testosterone raises hematocrit — a 3–5 percentage-point rise is typical and dose-dependent. Sustained values >52% warrant a dose review.",
  },
  {
    name: "hemoglobin",
    regimen: "masculinizing",
    direction: "up",
    note: "Hemoglobin tracks hematocrit on testosterone — expect a parallel rise.",
  },
  {
    name: "estradiol",
    regimen: "feminizing",
    direction: "shifts-to-natal-opposite",
    note: "Target trough is regimen-dependent — typical clinical aim is 100–200 pg/mL. Draw at the trough for injectables.",
  },
  {
    name: "testosterone",
    regimen: "masculinizing",
    direction: "shifts-to-natal-opposite",
    note: "Trough total testosterone targets the cisgender male physiological range (~300–1000 ng/dL). Draw just before the next injection.",
  },
  {
    name: "testosterone",
    regimen: "feminizing",
    direction: "down",
    note: "Suppressed testosterone is the expected effect of an anti-androgen plus estradiol. Anything in the cis-female range is the goal.",
  },
  {
    name: "potassium",
    regimen: "feminizing",
    direction: "up",
    note: "Spironolactone retains potassium. Mild elevations (5.0–5.4) are common; >5.5 is when dose adjustment gets discussed.",
  },
  {
    name: "creatinine",
    regimen: "feminizing",
    direction: "up",
    note: "Spironolactone causes a small functional rise in creatinine that doesn't reflect kidney injury.",
  },
  {
    name: "prolactin",
    regimen: "feminizing",
    direction: "up",
    note: "Estrogen mildly elevates prolactin. Persistent levels >50 ng/mL or symptoms (galactorrhea, headache, vision changes) get worked up.",
  },
  {
    name: "alt",
    regimen: "any-hrt",
    direction: "up",
    note: "Mild ALT elevation can occur with oral estrogens and bicalutamide. Sustained >3× upper limit warrants investigation.",
  },
  {
    name: "ast",
    regimen: "any-hrt",
    direction: "up",
    note: "Like ALT — small elevations are common, sustained large ones are not.",
  },
];

export function classifyRegimen(text: string): "feminizing" | "masculinizing" | "blockers" | "any-hrt" {
  const t = text.toLowerCase();
  if (/\btestosterone|test\s*cyp|test\s*e\b|androgel|cypionate|enanthate/.test(t)) return "masculinizing";
  if (/\bestradiol|estrogen|e2\b|spironolactone|spiro|bicalutamide|finasteride/.test(t)) return "feminizing";
  if (/\bleuprolide|lupron|histrelin|gnrh|blocker/.test(t)) return "blockers";
  return "any-hrt";
}

export function findCuratedDrug(term: string): CuratedDrug | null {
  if (!term) return null;
  const t = term.toLowerCase().trim();
  // Exact match on aliases first.
  for (const d of CURATED_DRUGS) {
    if (d.aliases.some((a) => a === t)) return d;
  }
  // Substring fallback.
  for (const d of CURATED_DRUGS) {
    if (d.aliases.some((a) => t.includes(a) || a.includes(t))) return d;
  }
  return null;
}

export function searchCuratedDrugs(prefix: string, limit = 6): CuratedDrug[] {
  const p = prefix.toLowerCase().trim();
  if (!p) return [];
  const hits: CuratedDrug[] = [];
  for (const d of CURATED_DRUGS) {
    if (d.generic.startsWith(p) || d.aliases.some((a) => a.startsWith(p))) {
      hits.push(d);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export function findLabShift(labName: string, regimen: string): LabShift | null {
  const lab = labName.toLowerCase().trim();
  const key = lab.replace(/[^a-z]/g, "");
  const reg = classifyRegimen(regimen);
  const hits = LAB_SHIFTS.filter(
    (s) => key.includes(s.name.replace(/[^a-z]/g, "")) &&
      (s.regimen === reg || s.regimen === "any-hrt")
  );
  if (hits.length === 0) return null;
  const preferred = hits.find((h) => h.regimen === reg);
  return preferred || hits[0];
}
