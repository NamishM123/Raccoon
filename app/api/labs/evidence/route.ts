import { buildLabEvidenceQuery, searchPubmed } from "@/lib/external/pubmed";
import { findLabShift } from "@/lib/external/curated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { lab_name?: string; regimen?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const lab = (body.lab_name || "").trim();
  const regimen = (body.regimen || "").trim();
  if (!lab) return json({ citations: [], curated_shift: null, source: "none" });

  const curated_shift = findLabShift(lab, regimen);

  let citations: Awaited<ReturnType<typeof searchPubmed>> = [];
  let query = "";
  try {
    query = buildLabEvidenceQuery(lab, regimen);
    citations = await searchPubmed(query, 3);
    if (citations.length === 0) {
      const fallback = `"${lab}"[tiab] AND (transgender[tiab] OR "gender-affirming"[tiab])`;
      query = fallback;
      citations = await searchPubmed(fallback, 3);
    }
  } catch {
    /* live unavailable */
  }

  const source =
    citations.length && curated_shift
      ? "merged"
      : citations.length
      ? "live"
      : curated_shift
      ? "curated"
      : "none";

  return json({ citations, curated_shift, query, source });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
