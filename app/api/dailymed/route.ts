// DailyMed drug label lookup via NLM DailyMed API.
// Given a drug name, returns the label's key sections (warnings, adverse reactions,
// lab interactions) so the Lab Check can surface medication context.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const drug = searchParams.get("drug")?.trim();
  if (!drug) return json({ error: "drug param required" }, 400);

  try {
    // Step 1: find matching SPL set IDs
    const searchRes = await fetch(
      `${BASE}/spls.json?drug_name=${encodeURIComponent(drug)}&pagesize=3`,
      { next: { revalidate: 86400 } }
    );
    if (!searchRes.ok) return json({ label: null });
    const searchData = await searchRes.json();
    const setId: string | undefined = searchData?.data?.[0]?.setid;
    if (!setId) return json({ label: null });

    // Step 2: fetch the full structured label
    const labelRes = await fetch(`${BASE}/spls/${setId}.json`, {
      next: { revalidate: 86400 },
    });
    if (!labelRes.ok) return json({ label: null });
    const labelData = await labelRes.json();

    const sections: Array<{ title: string; text: string }> =
      labelData?.data?.sections ?? [];

    // Extract the sections most relevant to lab interpretation
    const RELEVANT = [
      "warnings and precautions",
      "adverse reactions",
      "drug interactions",
      "laboratory",
      "clinical pharmacology",
      "warnings",
    ];

    const relevant = sections
      .filter(s =>
        RELEVANT.some(r => s.title?.toLowerCase().includes(r))
      )
      .slice(0, 4)
      .map(s => ({
        title: s.title,
        // Strip HTML tags, collapse whitespace
        text: s.text
          ?.replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim()
          .slice(0, 600) ?? "",
      }))
      .filter(s => s.text);

    const name: string = labelData?.data?.title ?? drug;

    return json({ label: { name, setId, sections: relevant } });
  } catch (e: any) {
    return json({ error: e?.message ?? "DailyMed error" }, 500);
  }
}
