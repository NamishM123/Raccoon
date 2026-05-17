import { CARE_STATUS_BY_CODE } from "@/data/care_status";
import type { CareStatus, ProcedureKey } from "@/types";

// Per-state posture of common insurance funding sources toward gender
// affirming care. Sources, current as of 2026-05-16:
//   - MAP "Medicaid Coverage of Transgender-Related Health Care"
//   - MAP "State Laws & Policies: Healthcare Laws & Policies / Insurance"
//   - KFF Gender-Affirming Care Policy Tracker
//   - CMS Medicare NCD 140.3 (rescinded 2014); MAC discretion since
//
// What the status means here:
//   PROTECTED       Insurance affirmatively covers the care by state law or
//                   binding regulation/court order.
//   LEGAL           Care is legal and this funding source generally covers it
//                   without state interference (no explicit ban or carve-out).
//   RESTRICTED      Coverage is uncertain, varies by plan, or has gaps
//                   (no state law, hostile signals, or known exclusions).
//   BANNED          Funding source explicitly excludes the care, or the care
//                   itself is banned (so funding is moot).
//   IN_LITIGATION   Status is actively contested in court.

export const INSURANCE_KEYS = [
  "employer",
  "marketplace",
  "medicaid",
  "medicare",
  "self_pay",
] as const;
export type InsuranceKey = (typeof INSURANCE_KEYS)[number];

export const INSURANCE_LABELS: Record<InsuranceKey, string> = {
  employer: "Employer",
  marketplace: "Marketplace",
  medicaid: "Medicaid",
  medicare: "Medicare",
  self_pay: "Self Pay",
};

// Plain English description of how each funding source generally works. Shown
// in the legend so users understand why the map shifts when they pick one.
export const INSURANCE_BLURB: Record<InsuranceKey, string> = {
  employer:
    "Fully-insured employer plans follow state non-discrimination law. Self-insured (ERISA) plans are governed federally and depend on the employer.",
  marketplace:
    "ACA exchange plans. Federal Section 1557 broadly prohibits discrimination; states with insurance non-discrimination laws have the firmest protections.",
  medicaid:
    "State-administered. The biggest source of state-by-state variation — some states affirmatively cover, others affirmatively exclude.",
  medicare:
    "Federal. HRT and medically necessary surgery for adults are covered nationally since 2014; coverage for minors is rare because minors are seldom enrolled.",
  self_pay:
    "Out of pocket. Insurance is not the constraint — only the legality of the care itself.",
};

// ── Medicaid ─────────────────────────────────────────────────────────────
// Per MAP "Medicaid Coverage of Transgender-Related Health Care".
const MEDICAID: Record<string, CareStatus> = {
  // Affirmative coverage (law, regulation, or binding case order)
  CA: "PROTECTED",
  CO: "PROTECTED",
  CT: "PROTECTED",
  DC: "PROTECTED",
  HI: "PROTECTED",
  IL: "PROTECTED",
  MA: "PROTECTED",
  MD: "PROTECTED",
  ME: "PROTECTED",
  MN: "PROTECTED",
  NH: "PROTECTED",
  NJ: "PROTECTED",
  NM: "PROTECTED",
  NV: "PROTECTED",
  NY: "PROTECTED",
  OR: "PROTECTED",
  PA: "PROTECTED",
  RI: "PROTECTED",
  VT: "PROTECTED",
  WA: "PROTECTED",
  WI: "PROTECTED",
  // Covers in practice but no explicit law
  AK: "LEGAL",
  DE: "LEGAL",
  // No explicit policy; case-by-case adjudication
  ID: "RESTRICTED",
  IN: "RESTRICTED",
  KS: "RESTRICTED",
  LA: "RESTRICTED",
  MI: "RESTRICTED",
  MT: "RESTRICTED",
  VA: "RESTRICTED",
  // Affirmative exclusion by law or regulation
  AL: "BANNED",
  AR: "BANNED",
  AZ: "BANNED",
  FL: "BANNED",
  GA: "BANNED",
  IA: "BANNED",
  KY: "BANNED",
  MO: "BANNED",
  MS: "BANNED",
  NE: "BANNED",
  NC: "BANNED",
  ND: "BANNED",
  OH: "BANNED",
  OK: "BANNED",
  SC: "BANNED",
  SD: "BANNED",
  TN: "BANNED",
  TX: "BANNED",
  UT: "BANNED",
  WV: "IN_LITIGATION", // adult coverage limit being litigated
  WY: "BANNED",
};

// ── Marketplace (ACA Exchange) ───────────────────────────────────────────
// Federal Section 1557 sits on top; per-state status reflects added state-law
// non-discrimination protections OR explicit state restrictions.
const MARKETPLACE: Record<string, CareStatus> = {
  CA: "PROTECTED",
  CO: "PROTECTED",
  CT: "PROTECTED",
  DC: "PROTECTED",
  DE: "PROTECTED",
  HI: "PROTECTED",
  IL: "PROTECTED",
  MA: "PROTECTED",
  MD: "PROTECTED",
  ME: "PROTECTED",
  MN: "PROTECTED",
  NH: "PROTECTED",
  NJ: "PROTECTED",
  NM: "PROTECTED",
  NV: "PROTECTED",
  NY: "PROTECTED",
  OR: "PROTECTED",
  PA: "PROTECTED",
  RI: "PROTECTED",
  VA: "PROTECTED",
  VT: "PROTECTED",
  WA: "PROTECTED",
  WI: "PROTECTED",
  // States with hostile signals on insurance non-discrimination
  AR: "RESTRICTED",
  AL: "RESTRICTED",
  FL: "RESTRICTED",
  GA: "RESTRICTED",
  ID: "RESTRICTED",
  IA: "RESTRICTED",
  IN: "RESTRICTED",
  KY: "RESTRICTED",
  MS: "RESTRICTED",
  MO: "RESTRICTED",
  MT: "RESTRICTED",
  NC: "RESTRICTED",
  ND: "RESTRICTED",
  NE: "RESTRICTED",
  OH: "RESTRICTED",
  OK: "RESTRICTED",
  SC: "RESTRICTED",
  SD: "RESTRICTED",
  TN: "RESTRICTED",
  TX: "RESTRICTED",
  UT: "RESTRICTED",
  WV: "RESTRICTED",
  WY: "RESTRICTED",
  // No explicit state law either direction — federal floor only
  AK: "LEGAL",
  AZ: "LEGAL",
  KS: "LEGAL",
  LA: "LEGAL",
  MI: "LEGAL",
};

// ── Employer ─────────────────────────────────────────────────────────────
// Mirrors marketplace for fully-insured plans. Self-insured ERISA plans are
// federal and depend on the employer — so non-protected states are at best
// RESTRICTED for the employer category.
const EMPLOYER: Record<string, CareStatus> = Object.fromEntries(
  Object.entries(MARKETPLACE).map(([code, status]) => [
    code,
    status === "LEGAL" ? "RESTRICTED" : status,
  ])
);

// ── Medicare ─────────────────────────────────────────────────────────────
// Federal program with uniform baseline. Adult HRT and medically necessary
// adult surgery are covered nationally. Minor enrollees are rare (Medicare
// is 65+ / disability), so minor procedures are downstream of the underlying
// state legality of the procedure plus the rarity caveat.
function medicareFor(_state: string): CareStatus {
  return "LEGAL";
}

// ── Self Pay ────────────────────────────────────────────────────────────
// Insurance is not the constraint — the procedure's own status decides.
function selfPayFor(_state: string): CareStatus {
  return "PROTECTED"; // funding source is unconstrained; legality cap will dominate
}

export const INSURANCE_COVERAGE: Record<
  InsuranceKey,
  (stateCode: string) => CareStatus
> = {
  employer: (s) => EMPLOYER[s] ?? "RESTRICTED",
  marketplace: (s) => MARKETPLACE[s] ?? "LEGAL",
  medicaid: (s) => MEDICAID[s] ?? "RESTRICTED",
  medicare: medicareFor,
  self_pay: selfPayFor,
};

// Procedures the insurance dimension does not apply to.
const NON_MEDICAL: ProcedureKey[] = ["id_marker_change", "shield_law"];

// Ordering used to take the worse (more restrictive) of two statuses.
const ORDER: Record<CareStatus, number> = {
  PROTECTED: 4,
  LEGAL: 3,
  RESTRICTED: 2,
  IN_LITIGATION: 1,
  BANNED: 0,
};

function worse(a: CareStatus, b: CareStatus): CareStatus {
  return ORDER[a] <= ORDER[b] ? a : b;
}

/**
 * Combined map color for (state, insurance, procedure):
 *   - Care that's banned at the procedure level stays BANNED (insurance moot).
 *   - ID changes and shield laws are not insurance dimensions — return the
 *     procedure status as-is.
 *   - Otherwise: take the worse of the procedure status and the insurance's
 *     posture in that state.
 *   - Medicare for minors is downgraded to RESTRICTED (rare enrollment).
 */
export function getCombinedStatus(
  stateCode: string,
  insurance: InsuranceKey,
  procedure: ProcedureKey
): CareStatus {
  const state = CARE_STATUS_BY_CODE[stateCode];
  if (!state) return "IN_LITIGATION";
  const procStatus = state.procedures[procedure].status;

  if (procStatus === "BANNED" || procStatus === "IN_LITIGATION") {
    return procStatus;
  }
  if (NON_MEDICAL.includes(procedure)) {
    return procStatus;
  }

  let insStatus = INSURANCE_COVERAGE[insurance](stateCode);

  if (
    insurance === "medicare" &&
    (procedure === "hrt_minor" ||
      procedure === "surgery_minor" ||
      procedure === "puberty_blockers")
  ) {
    insStatus = "RESTRICTED";
  }

  return worse(procStatus, insStatus);
}

// One-line rationale shown in the drawer for a (state, insurance, procedure)
// triple. Distilled from the same sources as the data above.
export function getCombinedRationale(
  stateCode: string,
  insurance: InsuranceKey,
  procedure: ProcedureKey
): string {
  const state = CARE_STATUS_BY_CODE[stateCode];
  if (!state) return "";
  const procStatus = state.procedures[procedure].status;

  if (procStatus === "BANNED") {
    return "Care itself is banned in this state, so no funding source can cover it.";
  }
  if (procStatus === "IN_LITIGATION") {
    return "Status of this procedure is actively contested in court.";
  }
  if (NON_MEDICAL.includes(procedure)) {
    return "ID changes and shield laws are not insurance questions.";
  }
  if (insurance === "self_pay") {
    return "Self-pay is not insurance-constrained — only the procedure's legality matters.";
  }

  const insStatus = INSURANCE_COVERAGE[insurance](stateCode);
  if (insurance === "medicaid") {
    if (insStatus === "PROTECTED") return "Medicaid affirmatively covers gender-affirming care in this state.";
    if (insStatus === "LEGAL") return "Medicaid covers in practice; no explicit state policy.";
    if (insStatus === "RESTRICTED") return "No explicit Medicaid policy — coverage is case-by-case.";
    if (insStatus === "BANNED") return "Medicaid in this state explicitly excludes gender-affirming care.";
    if (insStatus === "IN_LITIGATION") return "Medicaid coverage is actively being litigated here.";
  }
  if (insurance === "marketplace") {
    if (insStatus === "PROTECTED") return "State insurance non-discrimination law protects ACA marketplace coverage.";
    if (insStatus === "RESTRICTED") return "No state protection; hostile signals make coverage uncertain.";
    return "Federal Section 1557 applies; no added state protection.";
  }
  if (insurance === "employer") {
    if (insStatus === "PROTECTED") return "State law requires fully-insured employer plans to cover this care.";
    if (insStatus === "RESTRICTED") return "Depends on the employer; self-insured (ERISA) plans bypass state mandates.";
    return "Federal floor applies; coverage depends on plan design.";
  }
  if (insurance === "medicare") {
    if (
      procedure === "hrt_minor" ||
      procedure === "surgery_minor" ||
      procedure === "puberty_blockers"
    ) {
      return "Medicare enrolls few minors; coverage for pediatric gender care is rare.";
    }
    return "Medicare covers HRT and medically necessary adult surgery nationally since 2014.";
  }
  return "";
}
