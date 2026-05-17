import { anthropic, MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You convert a free-text description of someone's trans medical context into structured profile data. The user is filling out their profile and would rather just describe it once in their own words.

Extract what you can. Do not invent things the user didn't say. If a field isn't mentioned, leave it as an empty string or empty array.

Return VALID JSON ONLY with this exact shape:
{
  "regimen_summary": "1 short sentence summarizing their hormone regimen, or empty string",
  "medications": [ { "description": "single line like 'Estradiol 4mg IM weekly since Jan 2022'" } ],
  "surgeries": [ { "description": "procedure name, e.g. 'Top surgery'", "date": "date as written, or empty string" } ],
  "allergies": [ { "substance": "drug or substance name", "reaction": "what happens, or empty string" } ]
}

Rules:
- Each medication is ONE string. Pack dose, route, frequency, and start date into the description naturally.
- Surgery descriptions should be procedure name only; the date goes in its own field.
- If the user mentions blockers (spironolactone, finasteride, bicalutamide, GnRH agonists), list them as separate medications.
- For allergies, capture each as a separate entry with the substance and (if mentioned) the reaction. Do not list current medications as allergies.
- Do NOT add medical advice or commentary. JSON only, no prose.`;

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const text = (body?.text || "").trim();
  if (!text) return json({ error: "text is required" }, 400);
  if (text.length > 4000) return json({ error: "text too long" }, 400);

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const out = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const parsed = extractJson(out);
    if (!parsed) {
      return json({ error: "couldn't structure that, try rephrasing" }, 200);
    }
    return json(parsed, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function extractJson(text: string): null | {
  regimen_summary: string;
  medications: Array<{ description: string }>;
  surgeries: Array<{ description: string; date: string }>;
  allergies: Array<{ substance: string; reaction: string }>;
} {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return {
      regimen_summary: String(obj?.regimen_summary || ""),
      medications: Array.isArray(obj?.medications)
        ? obj.medications
            .map((m: any) => ({ description: String(m?.description || "").trim() }))
            .filter((m: { description: string }) => m.description)
        : [],
      surgeries: Array.isArray(obj?.surgeries)
        ? obj.surgeries
            .map((s: any) => ({
              description: String(s?.description || "").trim(),
              date: String(s?.date || "").trim(),
            }))
            .filter((s: { description: string }) => s.description)
        : [],
      allergies: Array.isArray(obj?.allergies)
        ? obj.allergies
            .map((a: any) => ({
              substance: String(a?.substance || "").trim(),
              reaction: String(a?.reaction || "").trim(),
            }))
            .filter((a: { substance: string }) => a.substance)
        : [],
    };
  } catch {
    return null;
  }
}
