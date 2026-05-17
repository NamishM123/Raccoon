// Drug interaction checker via the Claude API.
//
// The previous version of this route used NLM RxNav's interaction list,
// which has been incomplete since the National Library of Medicine
// retired the Drug Interaction API in early 2024 — many real
// interactions were not being reported. We now ask Claude to evaluate
// the medication list directly and return a structured assessment.
//
// IMPORTANT: this is decision support, not medical advice. Both the UI
// and the response carry a disclaimer.

import { anthropic, MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a clinical pharmacology assistant evaluating a list of medications for drug-drug interactions. Be conservative — surface interactions that have meaningful clinical consequences, including ones specific to gender-affirming hormone therapy (estradiol, testosterone, spironolactone, finasteride, bicalutamide, GnRH agonists, progesterone, etc.).

Input: a JSON object with a "medications" array of free-text medication descriptions. The first word is usually the drug name; dose, route, and frequency may follow.

Return VALID JSON ONLY with this exact shape:
{
  "interactions": [
    {
      "drug1": "Drug A (generic name, lowercase)",
      "drug2": "Drug B (generic name, lowercase)",
      "severity": "major" | "moderate" | "minor",
      "description": "One or two sentences explaining the mechanism and what could happen clinically.",
      "advice": "One short sentence on what the patient should do (e.g. 'separate doses by 4 hours', 'monitor potassium', 'avoid combining - ask prescriber for an alternative')."
    }
  ]
}

Rules:
- Only include pairs with a real, documented interaction. Do not invent interactions to fill the list.
- If the same drug appears twice, ignore the duplicate.
- If there are no clinically meaningful interactions, return { "interactions": [] }.
- "severity" must be exactly one of "major", "moderate", or "minor". Use "major" for combinations that can cause serious harm (QT prolongation, serotonin syndrome, dangerous hyperkalemia, bleeding risk, etc.). Use "moderate" for ones requiring dose adjustment or monitoring. Use "minor" for low-impact pharmacokinetic interactions.
- Output JSON only, no prose, no markdown fences.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface RawInteraction {
  drug1?: unknown;
  drug2?: unknown;
  severity?: unknown;
  description?: unknown;
  advice?: unknown;
}

function normalize(raw: RawInteraction[]): Array<{
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
  sourceUrl: string;
}> {
  const out: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    sourceUrl: string;
  }> = [];
  for (const r of raw) {
    const drug1 = String(r?.drug1 ?? "").trim();
    const drug2 = String(r?.drug2 ?? "").trim();
    if (!drug1 || !drug2) continue;
    const sev = String(r?.severity ?? "moderate").trim().toLowerCase();
    const severity =
      sev === "major" || sev === "moderate" || sev === "minor" ? sev : "moderate";
    const description = String(r?.description ?? "").trim();
    const advice = String(r?.advice ?? "").trim();
    const fullDescription = advice ? `${description} ${advice}` : description;
    out.push({
      drug1,
      drug2,
      severity,
      description: fullDescription,
      sourceUrl: "",
    });
  }
  return out;
}

function extractJson(text: string): RawInteraction[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (Array.isArray(obj?.interactions)) return obj.interactions as RawInteraction[];
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { meds?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const meds = Array.isArray(body.meds)
    ? body.meds
        .map((m) => String(m || "").trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  if (meds.length < 2) return json({ interactions: [] });

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ medications: meds }),
        },
      ],
    });

    const out = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const raw = extractJson(out);
    if (!raw) {
      return json({ interactions: [], source: "Claude" });
    }

    return json({
      interactions: normalize(raw),
      source: "Claude",
      disclaimer:
        "AI-generated interaction check. Decision support only - confirm with a pharmacist or prescriber before acting.",
    });
  } catch (e: any) {
    return json(
      { error: e?.message || "Server error", interactions: [] },
      500,
    );
  }
}
