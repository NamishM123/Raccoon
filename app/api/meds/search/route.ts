import { approximateMatch } from "@/lib/external/rxnorm";
import { searchCuratedDrugs } from "@/lib/external/curated";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q || q.length < 2) {
    return json({ candidates: [], source: "none" });
  }

  // Curated hits go to the top — they're trans-HRT-specific and authoritative
  // about which brands map to which generics. Live RxNorm adds the long tail.
  const curated = searchCuratedDrugs(q, 4).map((d) => ({
    rxcui: d.rxcui,
    name: `${d.generic[0].toUpperCase()}${d.generic.slice(1)}`,
    score: 100,
    curated: true,
  }));

  let live: Array<{ rxcui: string; name: string; score: number; curated: boolean }> = [];
  try {
    const matches = await approximateMatch(q, 6);
    live = matches.map((m) => ({ rxcui: m.rxcui, name: m.name, score: m.score, curated: false }));
  } catch {
    /* live unavailable — curated only */
  }

  // Dedupe by rxcui, curated wins.
  const seen = new Set<string>(curated.map((c) => c.rxcui));
  const combined = [...curated];
  for (const m of live) {
    if (m.rxcui && !seen.has(m.rxcui)) {
      seen.add(m.rxcui);
      combined.push(m);
    }
  }
  const source = curated.length && live.length ? "merged" : live.length ? "live" : curated.length ? "curated" : "none";
  return json({ candidates: combined.slice(0, 8), source });
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}
