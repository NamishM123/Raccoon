import type { ProcedureKey } from "@/types";

export interface VerifiedSource {
  title: string;
  publisher: string;
  url: string;
  note?: string;
}

// Curated, hand-vetted sources per procedure. These are the links we'd
// hand a patient asking "where do I read the actual clinical / legal
// guidance instead of a stranger's anecdote?" Keep this list short and
// authoritative — quality over quantity.
export const VERIFIED_SOURCES_BY_PROCEDURE: Record<ProcedureKey, VerifiedSource[]> = {
  hrt_adult: [
    {
      title: "Standards of Care, Version 8",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
      note: "International clinical guideline for transgender health.",
    },
    {
      title: "Endocrine Treatment of Gender-Dysphoric/Gender-Incongruent Persons",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
      note: "Peer-reviewed clinical practice guideline.",
    },
    {
      title: "Transgender Hormone Therapy Overview",
      publisher: "UCSF Gender Affirming Health Program",
      url: "https://transcare.ucsf.edu/guidelines",
      note: "Patient-facing primary-care protocols.",
    },
    {
      title: "Hormone Therapy",
      publisher: "Planned Parenthood",
      url: "https://www.plannedparenthood.org/learn/gender-identity/transgender/what-do-i-need-know-about-trans-and-gender-nonconforming-identities",
    },
  ],
  hrt_minor: [
    {
      title: "Standards of Care, Version 8 — Adolescents",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "AAP Policy on Gender-Affirming Care",
      publisher: "American Academy of Pediatrics",
      url: "https://publications.aap.org/pediatrics/article/142/4/e20182162/37381",
    },
    {
      title: "Endocrine Society Guideline (Adolescents)",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
    },
  ],
  puberty_blockers: [
    {
      title: "GnRH Analogs (Puberty Blockers) — Clinical Overview",
      publisher: "Mayo Clinic",
      url: "https://www.mayoclinic.org/diseases-conditions/gender-dysphoria/in-depth/pubertal-blockers/art-20459075",
    },
    {
      title: "Endocrine Society Guideline — Pubertal Suppression",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
    },
    {
      title: "Puberty Blockers Explainer",
      publisher: "Yale School of Medicine",
      url: "https://medicine.yale.edu/news-article/transgender-youth-puberty-blockers/",
    },
  ],
  surgery_adult: [
    {
      title: "Gender Confirmation Surgery — Procedure Library",
      publisher: "American Society of Plastic Surgeons (ASPS)",
      url: "https://www.plasticsurgery.org/reconstructive-procedures/gender-confirmation-surgeries",
    },
    {
      title: "WPATH SOC-8 — Surgery Chapter",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "Surgical Options Overview",
      publisher: "UCSF Gender Affirming Health Program",
      url: "https://transcare.ucsf.edu/surgical-options",
    },
  ],
  surgery_minor: [
    {
      title: "WPATH SOC-8 — Adolescent Surgery",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "AAP Policy on Gender-Affirming Care",
      publisher: "American Academy of Pediatrics",
      url: "https://publications.aap.org/pediatrics/article/142/4/e20182162/37381",
    },
  ],
  id_marker_change: [
    {
      title: "ID Documents Center",
      publisher: "Advocates for Trans Equality (A4TE / NCTE)",
      url: "https://transequality.org/documents",
      note: "State-by-state guide to changing name and gender markers.",
    },
    {
      title: "Changing Your Federal ID Documents",
      publisher: "Lambda Legal",
      url: "https://www.lambdalegal.org/know-your-rights/article/trans-changing-id-documents",
    },
    {
      title: "U.S. Passport Gender Marker Policy",
      publisher: "U.S. Department of State",
      url: "https://travel.state.gov/content/travel/en/passports/need-passport/selecting-your-gender-marker.html",
    },
  ],
  shield_law: [
    {
      title: "Trans Shield Law Map",
      publisher: "Movement Advancement Project",
      url: "https://www.mapresearch.org/equality-maps/healthcare/trans_shield_laws",
    },
    {
      title: "Shield Law Case Tracker",
      publisher: "Lambda Legal",
      url: "https://lambdalegal.org/cases/",
    },
    {
      title: "Legislative Attacks on LGBTQ Rights",
      publisher: "ACLU",
      url: "https://www.aclu.org/legislative-attacks-on-lgbtq-rights",
    },
  ],
};

// Reddit search query per procedure. Tuned to surface first-person
// experience posts (recovery, side effects, what it felt like) rather
// than news or policy debate.
export const REDDIT_QUERY_BY_PROCEDURE: Record<ProcedureKey, string> = {
  hrt_adult: "HRT experience changes",
  hrt_minor: "HRT teen experience",
  puberty_blockers: "puberty blockers experience",
  surgery_adult: "gender affirming surgery recovery experience",
  surgery_minor: "top surgery teen experience",
  id_marker_change: "name change gender marker experience",
  shield_law: "shield law moved state experience",
};
