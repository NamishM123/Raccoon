// Curated HRT-relevant drug interactions. This is NOT a comprehensive
// interaction database — those exist (Lexicomp, Micromedex) and we shouldn't
// fake it. This is a short list of high-signal, trans-specific combinations
// that come up enough to be worth flagging at the top of the profile page
// before the patient ever talks to a pharmacist.
//
// Each rule fires when ALL `requires` patterns and ANY one of `triggers`
// match the user's med list (case-insensitive substring on a normalized name).
// Severity bands roughly map to UpToDate / Lexicomp categories.

import type { Medication } from "./profile";

export type InteractionSeverity = "watch" | "caution" | "warning";

export interface InteractionRule {
  id: string;
  severity: InteractionSeverity;
  title: string;
  requires: RegExp[];
  triggers: RegExp[];
  explanation: string;
  what_to_do: string;
}

export const HRT_INTERACTIONS: InteractionRule[] = [
  {
    id: "spiro-ace",
    severity: "warning",
    title: "Spironolactone + ACE inhibitor or ARB → hyperkalemia",
    requires: [/spirono/i],
    triggers: [
      /lisinopril|enalapril|ramipril|benazepril|captopril|quinapril|fosinopril/i,
      /losartan|valsartan|olmesartan|irbesartan|candesartan|telmisartan/i,
    ],
    explanation:
      "Both raise serum potassium. The combination meaningfully raises the risk of hyperkalemia and arrhythmia.",
    what_to_do:
      "Check a basic metabolic panel before starting and ~2 weeks after any dose change. Consider bicalutamide as a spiro alternative if K+ keeps creeping up.",
  },
  {
    id: "spiro-nsaid",
    severity: "caution",
    title: "Spironolactone + chronic NSAID → kidney + potassium",
    requires: [/spirono/i],
    triggers: [/ibuprofen|naproxen|diclofenac|meloxicam|celecoxib|ketorolac/i],
    explanation:
      "NSAIDs reduce renal blood flow and can blunt spironolactone's diuretic effect while pushing potassium up further. Short courses are usually fine; daily use is the problem.",
    what_to_do:
      "Acetaminophen for routine aches when possible. If you need a daily NSAID, ask about a K+ check.",
  },
  {
    id: "oral-e-smoking",
    severity: "warning",
    title: "Oral estrogen + smoking → VTE / stroke",
    requires: [/estradiol|estrogen/i, /(oral|pill|tablet|valerate|micronized|premarin)/i],
    triggers: [/(nicotine|cigarette|tobacco|vape|smoking)/i],
    explanation:
      "Oral estrogen makes a first-pass through the liver and meaningfully raises clotting-factor production. Smoking compounds the venous-thromboembolism and stroke risk.",
    what_to_do:
      "Transdermal estradiol (patch or gel) bypasses the liver first-pass and carries a much lower clotting risk. Worth asking your provider about switching routes.",
  },
  {
    id: "oral-e-migraine",
    severity: "caution",
    title: "Oral estrogen + migraine with aura",
    requires: [/estradiol|estrogen/i, /(oral|pill|tablet|valerate|micronized|premarin)/i],
    triggers: [/(sumatriptan|rizatriptan|naratriptan|topiramate|propranolol).*migraine|migraine/i],
    explanation:
      "Migraine with aura is an independent stroke risk factor; oral estrogen raises it further. Transdermal estradiol is the safer route.",
    what_to_do:
      "Mention any history of migraine-with-aura at your next visit. Patch or gel is usually preferred for people with that history.",
  },
  {
    id: "t-warfarin",
    severity: "warning",
    title: "Testosterone + warfarin → bleeding risk",
    requires: [/testosterone|cypionate|enanthate|nebido|androgel|sustanon/i],
    triggers: [/warfarin|coumadin/i],
    explanation:
      "Testosterone potentiates warfarin's anticoagulant effect and can push INR out of range.",
    what_to_do:
      "Closer INR monitoring is needed when starting, stopping, or changing T dose. Tell your anticoagulation clinic about every change.",
  },
  {
    id: "t-erythrocytosis-rivaroxaban",
    severity: "watch",
    title: "Testosterone + any anticoagulant — recheck hematocrit",
    requires: [/testosterone/i],
    triggers: [/apixaban|rivaroxaban|dabigatran|edoxaban|enoxaparin/i],
    explanation:
      "T raises hematocrit; you're already on an anticoagulant for a reason. Make sure your provider knows both, since the risk balance for dose-adjustment changes.",
    what_to_do:
      "Make sure both your prescriber and your anticoagulation provider have the full med list.",
  },
  {
    id: "finasteride-anticonv",
    severity: "watch",
    title: "Finasteride + carbamazepine/phenytoin — reduced finasteride effect",
    requires: [/finasteride|dutasteride/i],
    triggers: [/carbamazepine|phenytoin|rifampin|rifampicin/i],
    explanation:
      "These are strong CYP3A4 inducers and can lower finasteride blood levels — anti-androgen effect may be weaker than expected.",
    what_to_do:
      "Worth a conversation with your prescriber about an alternative anti-androgen or a dose check.",
  },
  {
    id: "bical-statin",
    severity: "watch",
    title: "Bicalutamide + statins — liver enzyme monitoring",
    requires: [/bicalutamide/i],
    triggers: [/atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin/i],
    explanation:
      "Both can raise liver enzymes. Most people tolerate the combo, but it's worth periodic LFT checks.",
    what_to_do:
      "Ask for a baseline ALT/AST and a recheck a few months in.",
  },
  {
    id: "estrogen-st-johns",
    severity: "caution",
    title: "Estrogen + St. John's Wort → reduced HRT levels",
    requires: [/estradiol|estrogen/i],
    triggers: [/st\.?\s*john'?s\s*wort|hypericum/i],
    explanation:
      "St. John's Wort induces estrogen metabolism. Effective hormone dose drops, which can cause breakthrough symptoms.",
    what_to_do:
      "Don't combine. If you're on it for mood, talk about alternatives with your prescriber.",
  },
  {
    id: "estrogen-abx-rifampin",
    severity: "caution",
    title: "Estrogen + rifampin → reduced HRT levels",
    requires: [/estradiol|estrogen/i],
    triggers: [/rifampin|rifampicin|rifabutin/i],
    explanation:
      "Rifampin strongly induces estrogen metabolism. Most other antibiotics do NOT meaningfully reduce HRT levels — this is the real exception.",
    what_to_do:
      "Tell your TB or infectious-disease provider you're on HRT — a temporary dose bump is sometimes used.",
  },
];

export interface InteractionHit {
  rule: InteractionRule;
  matched: string[]; // the descriptions that triggered the rule
}

export function findInteractions(meds: Medication[]): InteractionHit[] {
  const descs = meds
    .map((m) => m.description.trim())
    .filter((d) => d.length > 0);
  if (descs.length < 2) return [];

  const hits: InteractionHit[] = [];
  for (const rule of HRT_INTERACTIONS) {
    const requiredMatches = rule.requires.map((re) => descs.filter((d) => re.test(d)));
    if (requiredMatches.some((arr) => arr.length === 0)) continue;
    const triggered = descs.filter((d) => rule.triggers.some((re) => re.test(d)));
    if (triggered.length === 0) continue;
    const all = Array.from(new Set([...requiredMatches.flat(), ...triggered]));
    hits.push({ rule, matched: all });
  }
  return hits;
}

export const SEVERITY_LABEL: Record<InteractionSeverity, string> = {
  watch: "Worth knowing",
  caution: "Talk to your prescriber",
  warning: "Talk to your prescriber soon",
};
