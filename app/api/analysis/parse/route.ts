import { anthropic, MODEL } from "@/lib/anthropic";
import { profileForPrompt, type Profile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SYSTEM_PROMPT = `You are a plain-language medical translator for trans patients on hormone therapy. The user uploads a doctor's after-visit summary (PDF or photo) and provides their health profile. Return structured JSON with two parts.

PART 1 — TIMELINE
Break the visit notes into chronological sections (as the doctor presents them, top to bottom). For each section:
- "heading": a 3-6 word title
- "plain": simplified explanation in direct, accessible language. No jargon. Max 3 sentences. Wrap the single most important conclusion or action item in **double asterisks** — e.g. **Recheck in 4 weeks.**, **No medication changes at this time.**, **All values are normal.** — so it can be bolded for the reader.
- "terms": medical words, drug names, or technical terms that appear exactly as written in "plain". For each: { "word": exact substring from plain, "explanation": 1-2 sentence tooltip }
- "category": classify this section as one of three values:
  - "hrt_related" — this section is specifically about gender-affirming hormone therapy (HRT), hormone levels, puberty blockers, or medications/dosing used exclusively in the patient's transition
  - "unrelated" — this section is about a condition, symptom, screening, or treatment that exists independently of the patient's HRT (e.g. a cold, blood pressure, cholesterol, an injury, dental referral)
  - "may_interact" — this section is about something that is not exclusively HRT but the patient's HRT regimen may meaningfully affect it (e.g. potassium on spironolactone, liver enzymes on oral estrogen, red blood cell counts on testosterone, a new prescription that could interact with hormones)

PART 2 — COMPARISONS
CONSOLIDATE related recommendations into single entries — for example, combine multiple minerals or supplements into one "Supplementation" entry, combine multiple lab rechecks into one "Lab monitoring" entry, etc. Aim for the fewest meaningful entries rather than one per sentence.

For each consolidated comparison entry:
- "recommendation": one concise sentence summarizing the consolidated recommendation(s)
- "alignment": "aligned" if this makes sense given the patient data and should help them | "concern" if this is complicated by or in tension with their existing data | "neutral" if there is not enough profile data to evaluate
- "headline": ONE sentence describing WHAT this recommendation is about (e.g. "Bone density monitoring is being added" or "Your hormone levels are being maintained at the current dose") — describe the topic, not the alignment
- "detail": 2-4 sentences of reasoning. Reference specific values from the patient profile (lab numbers, med names, surgery dates) wherever possible. Wrap the most important conclusion in **double asterisks** — e.g. "**Your dosage will remain the same.**" or "**This does not change your HRT regimen.**" — so it can be bolded for the reader.
- "terms": medical words or drug names that appear exactly as written in "detail". For each: { "word": exact substring, "explanation": 1-2 sentence tooltip }
- "category": classify this recommendation using the same three values as above:
  - "hrt_related" — the recommendation is specifically about the patient's hormone therapy or transition-related medications
  - "unrelated" — the recommendation is about an independent condition or concern that exists regardless of HRT
  - "may_interact" — the recommendation is not directly about HRT but the patient's current regimen may affect it or be affected by it

RULES:
- Mention once (in the first timeline item only) that you are not a doctor and this is not medical advice.
- Do not invent information not in the document. If something is unclear, omit it.
- Be calm and direct. Patients are often anxious.
- When in doubt between "unrelated" and "may_interact", choose "may_interact" — it is better to flag a possible connection than to miss one.

OUTPUT FORMAT — VALID JSON ONLY, NO PROSE BEFORE OR AFTER:
{
  "visit_date": "YYYY-MM-DD or empty string",
  "provider": "name and specialty or empty string",
  "timeline": [
    {
      "heading": "...",
      "plain": "...",
      "terms": [{ "word": "exact word as written in plain", "explanation": "..." }],
      "category": "hrt_related" | "unrelated" | "may_interact"
    }
  ],
  "comparisons": [
    {
      "recommendation": "...",
      "alignment": "aligned" | "concern" | "neutral",
      "headline": "...",
      "detail": "...",
      "terms": [{ "word": "exact word as written in detail", "explanation": "..." }],
      "category": "hrt_related" | "unrelated" | "may_interact"
    }
  ]
}

If the file cannot be read, return {"visit_date":"","provider":"","timeline":[{"heading":"Could not read this file","plain":"The file was unreadable or not a medical document. Try a clearer photo or a PDF with selectable text.","terms":[]}],"comparisons":[]}.`;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  const profileRaw = form.get("profile");
  if (!(file instanceof File)) return json({ error: "file is required" }, 400);
  if (!ALLOWED_TYPES.has(file.type))
    return json({ error: `unsupported file type: ${file.type || "unknown"}` }, 400);
  if (file.size > MAX_BYTES)
    return json({ error: "file too large (max 8 MB)" }, 400);

  let profile: Profile | null = null;
  try {
    profile = profileRaw ? JSON.parse(String(profileRaw)) : null;
  } catch {
    profile = null;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const ctx = profile ? profileForPrompt(profile) : "";

  const userText = [
    "Patient profile context:",
    ctx || "- (no profile data provided — use neutral comparisons)",
    "",
    "Read the attached after-visit summary and return the JSON structure described in the system prompt.",
  ].join("\n");

  const filePart =
    file.type === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        } as const);

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [filePart as any, { type: "text", text: userText }],
        },
      ],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const parsed = extractJson(text);
    if (!parsed) {
      return json(
        {
          visit_date: "",
          provider: "",
          timeline: [
            {
              heading: "Couldn't parse the response",
              plain: "The AI returned an unexpected format. Try a clearer photo or a PDF with selectable text.",
              terms: [],
            },
          ],
          comparisons: [],
        },
        200
      );
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

function extractJson(text: string): AnalysisResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj || typeof obj !== "object") return null;
    return {
      visit_date: String(obj.visit_date || ""),
      provider: String(obj.provider || ""),
      timeline: Array.isArray(obj.timeline)
        ? obj.timeline.map((item: any) => ({
            heading: String(item?.heading || ""),
            plain: String(item?.plain || ""),
            terms: Array.isArray(item?.terms)
              ? item.terms.map((t: any) => ({
                  word: String(t?.word || ""),
                  explanation: String(t?.explanation || ""),
                })).filter((t: { word: string }) => t.word)
              : [],
            category: (["hrt_related", "unrelated", "may_interact"] as const).includes(item?.category)
              ? item.category as "hrt_related" | "unrelated" | "may_interact"
              : "unrelated",
          }))
        : [],
      comparisons: Array.isArray(obj.comparisons)
        ? obj.comparisons.map((c: any) => ({
            recommendation: String(c?.recommendation || ""),
            alignment: ["aligned", "concern", "neutral"].includes(c?.alignment)
              ? c.alignment
              : "neutral",
            headline: String(c?.headline || ""),
            detail: String(c?.detail || ""),
            terms: Array.isArray(c?.terms)
              ? c.terms.map((t: any) => ({
                  word: String(t?.word || ""),
                  explanation: String(t?.explanation || ""),
                })).filter((t: { word: string }) => t.word)
              : [],
            category: (["hrt_related", "unrelated", "may_interact"] as const).includes(c?.category)
              ? c.category as "hrt_related" | "unrelated" | "may_interact"
              : "unrelated",
          }))
        : [],
    };
  } catch {
    return null;
  }
}

interface TermDef {
  word: string;
  explanation: string;
}

interface TimelineItem {
  heading: string;
  plain: string;
  terms: TermDef[];
  category: "hrt_related" | "unrelated" | "may_interact";
}

interface Comparison {
  recommendation: string;
  alignment: "aligned" | "concern" | "neutral";
  headline: string;
  detail: string;
  terms: TermDef[];
  category: "hrt_related" | "unrelated" | "may_interact";
}

interface AnalysisResult {
  visit_date: string;
  provider: string;
  timeline: TimelineItem[];
  comparisons: Comparison[];
}
