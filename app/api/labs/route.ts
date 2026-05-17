import { anthropic, MODEL } from "@/lib/anthropic";
import { profileForPrompt, type Profile } from "@/lib/profile";
import { interpretLab, statusLabel } from "@/lib/lab_ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a careful, friendly lab-value interpreter for trans patients on hormone therapy. The user gives you a single lab result and the medications/surgeries they're on. You explain whether that number is expected for someone with their hormonal profile, or whether it looks like a genuine concern worth raising with their doctor.

GROUND RULES:
- You are NOT a doctor and you do NOT give medical advice. Always say so. Your job is to translate "this number is weird" into "here is what context is missing."
- Be SHORT. Three to five sentences total in the interpretation, plus a clear one-line verdict.
- Reference well-established physiology: e.g. testosterone raises hemoglobin and hematocrit; estrogen + spironolactone shifts potassium and creatinine slightly; orchiectomy or testosterone-blocker therapy lowers reference testosterone toward "female" ranges; long-term HRT shifts the BMP/lipid panel in predictable ways.
- If the value is in a range that's known to shift on the user's regimen, lead with that. Example: "Slightly high hematocrit is the most common lab change on testosterone — it follows the dose."
- If the value is genuinely outside what HRT alone explains, say so plainly and recommend they ask the doctor.
- Do NOT invent precise reference ranges you don't actually know. If a number is borderline, say "borderline, ask your doctor" rather than "exactly 0.3 above normal."
- Tone: calm. The user is probably anxious. Lead with the most likely explanation, then the safety net.

OUTPUT FORMAT — RETURN VALID JSON ONLY, NO PROSE BEFORE OR AFTER, with these keys:
{
  "verdict": one of "likely_normal_for_regimen" | "borderline_ask_doctor" | "outside_hrt_explanation",
  "headline": one short sentence the user will read first,
  "explanation": 2-4 sentences explaining the physiology,
  "ask_doctor_about": optional short string — if there IS something specific they should ask about, what it is. Empty string otherwise.
}`;

type Payload = {
  lab_name: string;
  value: string;
  unit: string;
  profile: Profile;
};

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.lab_name || !body.value) {
    return new Response(JSON.stringify({ error: "lab_name and value are required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Deterministic interpretation against our hard-coded WPATH targets,
  // independent of the LLM. The LLM gets to see this and explain it in plain
  // language — but the verdict is anchored to a real reference.
  const ranged = interpretLab(
    { name: body.lab_name, value: body.value, unit: body.unit },
    body.profile as Profile
  );

  const userContent = buildUserPrompt(body, ranged);

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const parsed = extractJson(text);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          verdict: "borderline_ask_doctor",
          headline: "I couldn't make a confident call on that one.",
          explanation:
            "The model didn't return a clean answer. That's on us, not you. When in doubt, ask your doctor — and consider rephrasing the lab name (e.g. \"hematocrit\" rather than \"HCT %\").",
          ask_doctor_about: "",
          range: ranged,
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ...parsed, range: ranged }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: e?.message || "Server error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

function buildUserPrompt(p: Payload, ranged: ReturnType<typeof interpretLab>): string {
  const ctx = profileForPrompt(p.profile as Profile);
  const rangeBlock = ranged.matched
    ? [
        `Deterministic target check for ${ranged.display}:`,
        `- Status: ${statusLabel(ranged.status)}`,
        ranged.low !== null && ranged.high !== null
          ? `- Target range: ${ranged.low}–${ranged.high} ${ranged.expectedUnit}`
          : null,
        ranged.note ? `- Note: ${ranged.note}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No hard-coded target range matched this lab.";
  return [
    `Lab: ${p.lab_name}`,
    `Value: ${p.value}${p.unit ? " " + p.unit : ""}`,
    "",
    "Patient context:",
    ctx || "- (no profile data provided)",
    "",
    rangeBlock,
    "",
    "Interpret this result. Use the deterministic check above as your anchor — don't contradict it without good reason. Return JSON only.",
  ].join("\n");
}

function extractJson(text: string): null | {
  verdict: string;
  headline: string;
  explanation: string;
  ask_doctor_about: string;
} {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj || typeof obj !== "object") return null;
    return {
      verdict: String(obj.verdict || "borderline_ask_doctor"),
      headline: String(obj.headline || ""),
      explanation: String(obj.explanation || ""),
      ask_doctor_about: String(obj.ask_doctor_about || ""),
    };
  } catch {
    return null;
  }
}
