import { adverseEventSnapshot, recentRecalls } from "@/lib/external/openfda";
import { findCuratedDrug } from "@/lib/external/curated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { drugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const drugs = (body.drugs || []).map((d) => String(d || "").trim()).filter(Boolean);
  if (!drugs.length) return json({ items: [] });

  const items = await Promise.all(
    drugs.map(async (drug) => {
      const curated = findCuratedDrug(drug);
      // If the user typed a brand or alias, search FDA against the generic too.
      const search_terms = curated
        ? Array.from(new Set([drug, curated.generic, ...curated.brand_names]))
        : [drug];
      try {
        const recallLists = await Promise.all(search_terms.map((t) => recentRecalls(t, 3)));
        const recalls = dedupeRecalls(recallLists.flat()).slice(0, 5);
        const adverseList = await Promise.all(search_terms.map((t) => adverseEventSnapshot(t)));
        const adverse = mergeAdverse(adverseList);
        const live = recalls.length > 0 || (adverse?.total_reports || 0) > 0;
        return {
          drug,
          recalls,
          adverse,
          curated: curated && {
            rxcui: curated.rxcui,
            generic: curated.generic,
            brand_names: curated.brand_names,
            monitoring_note: curated.monitoring_note,
            watches: curated.watches,
          },
          source: live && curated ? "merged" : live ? "live" : curated ? "curated" : "none",
        };
      } catch {
        return {
          drug,
          recalls: [],
          adverse: null,
          curated: curated && {
            rxcui: curated.rxcui,
            generic: curated.generic,
            brand_names: curated.brand_names,
            monitoring_note: curated.monitoring_note,
            watches: curated.watches,
          },
          source: curated ? "curated" : "none",
        };
      }
    })
  );

  return json({ items });
}

function dedupeRecalls<T extends { recall_number: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of arr) {
    if (!r.recall_number || seen.has(r.recall_number)) continue;
    seen.add(r.recall_number);
    out.push(r);
  }
  return out;
}

function mergeAdverse(
  list: Array<Awaited<ReturnType<typeof adverseEventSnapshot>>>
): Awaited<ReturnType<typeof adverseEventSnapshot>> {
  const nonNull = list.filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (!nonNull.length) return null;
  const byTerm = new Map<string, number>();
  let total = 0;
  for (const a of nonNull) {
    total += a.total_reports;
    for (const r of a.top_reactions) byTerm.set(r.term, (byTerm.get(r.term) || 0) + r.count);
  }
  const top = Array.from(byTerm.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return { drug: nonNull[0].drug, total_reports: total, top_reactions: top };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
