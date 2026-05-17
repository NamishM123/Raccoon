// Drug interaction checker via NLM RxNav.
// 1. Extract first token (drug name) from each free-text medication description
// 2. Resolve each name to an RxCUI via RxNorm
// 3. Pass all RxCUIs to the RxNav interaction list endpoint
// 4. Return structured interactions with severity

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

async function resolveRxCUI(name: string): Promise<string | null> {
  try {
    const url = `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(name)}&search=1`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    return data?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchInteractions(rxcuis: string[]) {
  if (rxcuis.length < 2) return [];
  try {
    const url = `${RXNORM_BASE}/interaction/list.json?rxcuis=${rxcuis.join("+")}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const groups: any[] = data?.fullInteractionTypeGroup ?? [];
    const out: Array<{
      drug1: string; drug2: string;
      severity: string; description: string;
      sourceUrl: string;
    }> = [];
    for (const g of groups) {
      for (const type of g?.fullInteractionType ?? []) {
        for (const pair of type?.interactionPair ?? []) {
          const concepts = pair?.interactionConcept ?? [];
          const drug1 = concepts[0]?.minConceptItem?.name ?? "";
          const drug2 = concepts[1]?.minConceptItem?.name ?? "";
          const severity = pair?.severity ?? "unknown";
          const description = pair?.description ?? "";
          const sourceUrl = g?.sourceDisclaimer ?? "";
          if (drug1 && drug2) out.push({ drug1, drug2, severity, description, sourceUrl });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  let body: { meds?: string[] };
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }

  const meds = Array.isArray(body.meds) ? body.meds : [];
  if (meds.length < 2) return json({ interactions: [] });

  // Extract first word from each free-text description as the drug name
  const names = meds
    .map(m => m.trim().split(/[\s,·]+/)[0])
    .filter(Boolean)
    .slice(0, 10);

  const rxcuiResults = await Promise.all(names.map(resolveRxCUI));
  const rxcuis = rxcuiResults.filter((id): id is string => id !== null);

  const interactions = await fetchInteractions(rxcuis);
  return json({ interactions });
}
