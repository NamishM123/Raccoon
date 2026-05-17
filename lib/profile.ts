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

// Body parts the user is asked to mark as absent. Order matters — it
// is rendered as-is in the UI grid.
export const TRACKABLE_BODY_PARTS = [
  "Breasts / chest tissue",
  "Uterus",
  "Ovaries",
  "Fallopian tubes",
  "Cervix",
  "Vagina",
  "Penis",
  "Testes",
  "Prostate",
  "Adam's apple (laryngeal prominence)",
] as const;

export type BodyPart = typeof TRACKABLE_BODY_PARTS[number];

export interface Profile {
  display_name: string;
  pronouns: string;
  age: string;
  sex_assigned_at_birth: "male" | "female" | "intersex" | "";
  hormone_regimen_summary: string;
  allergies: Allergy[];
  // Free-text notes the user types about anatomy not covered by the
  // structured `missing_anatomy` list.
  anatomical_inventory: string;
  // Body parts the user has marked as absent (surgically removed, or
  // never present). Anything not in this list is assumed present.
  missing_anatomy: string[];
  medications: Medication[];
  surgeries: Surgery[];
  recent_labs: LabValue[];
  share_anonymously: boolean;
}

const STORAGE_KEY = "seagull_profile_v1";

export function emptyProfile(): Profile {
  return {
    display_name: "",
    pronouns: "",
    age: "",
    sex_assigned_at_birth: "",
    hormone_regimen_summary: "",
    allergies: [],
    anatomical_inventory: "",
    missing_anatomy: [],
    medications: [],
    surgeries: [],
    recent_labs: [],
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
  if (!Array.isArray(p.allergies)) p.allergies = [];
  if (typeof p.anatomical_inventory !== "string") p.anatomical_inventory = "";
  if (!Array.isArray(p.missing_anatomy)) p.missing_anatomy = [];
  else p.missing_anatomy = p.missing_anatomy.filter((x: unknown) => typeof x === "string");
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
      const desc = [s?.name, s?.notes].filter(Boolean).join(", ");
      return { id: s?.id || newId(), description: desc, date: s?.date || "" };
    });
  }
  return p as Profile;
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
  if (p.age) lines.push(`- Age: ${p.age}`);
  if (p.sex_assigned_at_birth) lines.push(`- Sex assigned at birth: ${p.sex_assigned_at_birth}`);
  if (p.missing_anatomy?.length) {
    lines.push(`- Body parts absent: ${p.missing_anatomy.join(", ")}`);
  }
  if (p.anatomical_inventory) lines.push(`- Anatomical notes: ${p.anatomical_inventory}`);
  if (p.allergies?.length) {
    lines.push("- Allergies:");
    for (const a of p.allergies) {
      const bits = [a.substance, a.reaction].filter(Boolean).join(" — ");
      if (bits) lines.push(`   · ${bits}`);
    }
  }
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
  return lines.join("\n");
}
