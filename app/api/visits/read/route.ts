import { anthropic, MODEL } from "@/lib/anthropic";
import { profileForPrompt, type Profile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a clinically careful reader of medical documents for a trans patient. The user has just received an after-visit summary, portal message, lab report annotation, discharge instructions, or similar clinician-authored document. Your job is to translate it AND check it against trans-HRT clinical reality.

You are NOT a doctor. You do not give medical advice. You translate and flag potential gaps, then suggest follow-up questions the patient should bring back to their clinician.

Use the patient's regimen context (provided below) to interpret what the document says. Specifically check for these well-known doctor-miss patterns:

1. TIMING MISREADS on hormone levels.
   - Estradiol: serum level depends heavily on time-since-injection for injectables. A "low" trough is the expected lowest point. A "low" mid-week draw on someone dosed weekly is borderline meaningless without timing.
   - Testosterone: same — peak vs trough differs 2-3x for cypionate/enanthate.
   - If a hormone level is interpreted as low/high without acknowledging draw timing, flag it.

2. EXPECTED-LOW labs misread as deficiency.
   - Testosterone on feminizing HRT SHOULD be in the cisgender-female range (typically <50 ng/dL). Doctors sometimes flag this as "low" and recommend testosterone replacement, which would undo gender-affirming care.
   - LH/FSH on suppressive HRT are expected to be low.

3. EXPECTED-HIGH labs misread as pathology.
   - Hematocrit/hemoglobin on testosterone are expected to rise toward cis-male reference. Values up to 51-52% on T are routine. Sustained >52% is when phlebotomy/dose review enters.
   - Creatinine slightly elevated on spironolactone is a functional shift, not kidney injury.
   - Potassium up to ~5.4 on spiro is common, not an emergency.
   - Prolactin mildly up on estrogen is common.

4. HRT CESSATION RECOMMENDATIONS for non-HRT issues.
   - If the document recommends pausing or stopping HRT for an issue that isn't clearly HRT-related (e.g., chest pain not yet worked up, mild ALT rise, headache), flag it. HRT cessation has documented harm and shouldn't be a reflexive first step.

5. DISMISSIVE LANGUAGE — words like "reassured," "anxiety," "psychosomatic," especially attached to a presenting complaint that doesn't have a clear differential in the document. Trans patients are disproportionately dismissed.

6. DOSE CHANGES on a single data point.
   - Major dose changes (>25%) based on one lab draw, especially without timing context, deserve scrutiny.

7. MISSING FOLLOW-UP. If they ordered a dose change, did they order a repeat lab? If they raised a concern, did they order a workup? If not, that's a flag.

8. DEADNAMING / MISGENDERING in the chart itself, since this becomes part of the permanent record.

OUTPUT FORMAT — RETURN VALID JSON ONLY:
{
  "document_type": "one of: after_visit_summary | portal_message | lab_report | discharge_instructions | referral | other",
  "summary": "2-4 sentences in plain English. What did the doctor actually conclude or recommend? Translate every medical term inline.",
  "flags": [
    {
      "severity": "high" | "medium" | "low",
      "title": "Short label, e.g. 'Trough timing not acknowledged'",
      "finding": "What the document said, quoted briefly.",
      "why": "Why this is a concern in the trans-HRT context, 1-3 sentences.",
      "what_to_ask": "The specific question to bring back to the doctor."
    }
  ],
  "questions": [
    "Short, specific follow-up question 1.",
    "Short, specific follow-up question 2."
  ]
}

If the document looks clean and accurate for this patient, return an empty flags array and a small list of clarifying questions. Do not invent flags to fill space.

If the document is illegible or you can't read it, return document_type "other", a summary saying so, empty flags, and an empty questions array.`;

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
  const pastedText = String(form.get("text") || "").trim();

  let profile: Profile | null = null;
  try {
    profile = profileRaw ? JSON.parse(String(profileRaw)) : null;
  } catch {
    profile = null;
  }

  const ctx = profile ? profileForPrompt(profile) : "";
  const userIntro = [
    "Patient regimen context:",
    ctx || "- (no profile data provided)",
    "",
    "Read the attached document and return the JSON described in the system prompt.",
  ].join("\n");

  let content: any[];

  if (file instanceof File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: `unsupported file type: ${file.type || "unknown"}` }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "file too large (max 8 MB)" }, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const filePart =
      file.type === "application/pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          };
    content = [filePart, { type: "text", text: userIntro }];
  } else if (pastedText) {
    content = [
      {
        type: "text",
        text: `${userIntro}\n\nDOCUMENT (pasted text):\n---\n${pastedText}\n---`,
      },
    ];
  } else {
    return json({ error: "either file or text is required" }, 400);
  }

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: content as any }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const parsed = extractJson(text);
    if (!parsed) {
      return json(
        {
          document_type: "other",
          summary: "Couldn't parse the document confidently. Try a clearer photo, or paste the text directly.",
          flags: [],
          questions: [],
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

function extractJson(text: string): null | {
  document_type: string;
  summary: string;
  flags: Array<{
    severity: string;
    title: string;
    finding: string;
    why: string;
    what_to_ask: string;
  }>;
  questions: string[];
} {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj || typeof obj !== "object") return null;
    return {
      document_type: String(obj.document_type || "other"),
      summary: String(obj.summary || ""),
      flags: Array.isArray(obj.flags)
        ? obj.flags.map((f: any) => ({
            severity: String(f?.severity || "medium"),
            title: String(f?.title || ""),
            finding: String(f?.finding || ""),
            why: String(f?.why || ""),
            what_to_ask: String(f?.what_to_ask || ""),
          }))
        : [],
      questions: Array.isArray(obj.questions)
        ? obj.questions.map((q: any) => String(q || "")).filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}
