// Profile data lives entirely in the browser. The whole point of this app is
// "type it once" — nothing gets posted to a server unless the user explicitly
// opts in to anonymous community sharing.

export interface Medication {
  id: string;
  description: string;
}

export interface Surgery {
  id: string;
  description: string;
  date: string;
}

export interface LabValue {
  id: string;
  name: string;
  value: string;
  unit: string;
  date: string;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
}

export type HrtDirection = "" | "feminizing" | "masculinizing" | "nonbinary" | "none";

// Tri-state per organ: present, absent (e.g. removed), or unknown/unspecified.
// "" means the user hasn't answered yet; absent means they explicitly removed it
// (relevant for "don't do a Pap, no cervix"). Doctors need the explicit
// distinction — silence is not the same as "no".
export type AnatomyState = "" | "present" | "absent";
export interface AnatomyInventory {
  cervix: AnatomyState;
  uterus: AnatomyState;
  ovaries: AnatomyState;
  breasts: AnatomyState;
  prostate: AnatomyState;
  testes: AnatomyState;
  penis: AnatomyState;
}

export function emptyAnatomy(): AnatomyInventory {
  return {
    cervix: "",
    uterus: "",
    ovaries: "",
    breasts: "",
    prostate: "",
    testes: "",
    penis: "",
  };
}

export interface Profile {
  display_name: string;
  pronouns: string;
  age: string;
  dob: string;
  sex_assigned_at_birth: "male" | "female" | "intersex" | "";
  hrt_direction: HrtDirection;
  hormone_regimen_summary: string;
  medications: Medication[];
  surgeries: Surgery[];
  recent_labs: LabValue[];
  allergies: Allergy[];
  anatomy: AnatomyInventory;
  emergency_contact: string;
  provider_contact: string;
  share_anonymously: boolean;
}

const STORAGE_KEY = "seagull_profile_v1";

export function emptyProfile(): Profile {
  return {
    display_name: "",
    pronouns: "",
    age: "",
    dob: "",
    sex_assigned_at_birth: "",
    hrt_direction: "",
    hormone_regimen_summary: "",
    medications: [],
    surgeries: [],
    recent_labs: [],
    allergies: [],
    anatomy: emptyAnatomy(),
    emergency_contact: "",
    provider_contact: "",
    share_anonymously: false,
  };
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    return migrate({ ...emptyProfile(), ...parsed });
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Older versions of this app stored medications/surgeries with separate
// dose/route/frequency/notes columns. Fold those into the new single-field
// shape so nobody loses what they typed.
function migrate(p: any): Profile {
  if (Array.isArray(p.medications)) {
    p.medications = p.medications.map((m: any) => {
      if (typeof m?.description === "string") return { id: m.id || newId(), description: m.description };
      const parts = [m?.name, m?.dose, prettyOldRoute(m?.route), m?.frequency, m?.started && `since ${m.started}`]
        .filter(Boolean)
        .join(" · ");
      return { id: m?.id || newId(), description: parts };
    });
  }
  if (Array.isArray(p.surgeries)) {
    p.surgeries = p.surgeries.map((s: any) => {
      if (typeof s?.description === "string") {
        return { id: s.id || newId(), description: s.description, date: s.date || "" };
      }
      const desc = [s?.name, s?.notes].filter(Boolean).join(" — ");
      return { id: s?.id || newId(), description: desc, date: s?.date || "" };
    });
  }
  if (!Array.isArray(p.allergies)) p.allergies = [];
  if (!p.anatomy || typeof p.anatomy !== "object") p.anatomy = emptyAnatomy();
  else p.anatomy = { ...emptyAnatomy(), ...p.anatomy };
  if (typeof p.dob !== "string") p.dob = "";
  if (typeof p.hrt_direction !== "string") p.hrt_direction = "";
  if (typeof p.emergency_contact !== "string") p.emergency_contact = "";
  if (typeof p.provider_contact !== "string") p.provider_contact = "";
  return p as Profile;
}

export function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// Free-text guess at HRT direction from regimen + meds. The user can always
// override it explicitly — this is only the auto-suggestion.
export function inferHrtDirection(p: Profile): HrtDirection {
  if (p.hrt_direction) return p.hrt_direction;
  const blob = [
    p.hormone_regimen_summary,
    ...p.medications.map((m) => m.description),
  ]
    .join(" ")
    .toLowerCase();
  const fem = /(estradiol|estrogen|spirono|bicalutamide|finasteride|progester|cyproterone)/.test(blob);
  const masc = /(testosterone|cypionate|enanthate|nebido|androgel|sustanon)/.test(blob);
  if (fem && !masc) return "feminizing";
  if (masc && !fem) return "masculinizing";
  if (fem && masc) return "nonbinary";
  return "";
}

function prettyOldRoute(r: string): string {
  return (
    {
      injection_im: "IM injection",
      injection_subq: "subQ injection",
      patch: "patch",
      gel: "gel",
      oral: "oral",
      implant: "implant",
      other: "",
    } as Record<string, string>
  )[r] || "";
}

export function profileForPrompt(p: Profile): string {
  const lines: string[] = [];
  const age = ageFromDob(p.dob) ?? (p.age ? Number(p.age) : null);
  if (age) lines.push(`- Age: ${age}`);
  if (p.sex_assigned_at_birth) lines.push(`- Sex assigned at birth: ${p.sex_assigned_at_birth}`);
  const dir = inferHrtDirection(p);
  if (dir) lines.push(`- HRT direction: ${dir}`);
  if (p.hormone_regimen_summary) lines.push(`- Regimen summary: ${p.hormone_regimen_summary}`);
  if (p.medications.length) {
    lines.push("- Medications:");
    for (const m of p.medications) if (m.description.trim()) lines.push(`   · ${m.description}`);
  }
  if (p.surgeries.length) {
    lines.push("- Surgical history:");
    for (const s of p.surgeries) {
      const bits = [s.description, s.date].filter(Boolean).join(" · ");
      if (bits) lines.push(`   · ${bits}`);
    }
  }
  const anatomyLines: string[] = [];
  for (const [k, v] of Object.entries(p.anatomy)) {
    if (v) anatomyLines.push(`   · ${k}: ${v}`);
  }
  if (anatomyLines.length) {
    lines.push("- Anatomy inventory (patient-reported):");
    lines.push(...anatomyLines);
  }
  if (p.allergies.length) {
    lines.push("- Allergies:");
    for (const a of p.allergies) {
      const bits = [a.substance, a.reaction && `(${a.reaction})`].filter(Boolean).join(" ");
      if (bits) lines.push(`   · ${bits}`);
    }
  }
  return lines.join("\n");
}
