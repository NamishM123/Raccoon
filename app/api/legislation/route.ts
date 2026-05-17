// Live trans legislation data via the Trans Legislation Tracker public API.
// Falls back to an empty bills array so the UI degrades gracefully if
// the tracker is unavailable.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKER_API = "https://api.translegislation.com/bills";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface Bill {
  id: string;
  state: string;
  bill_number: string;
  title: string;
  status: string;
  category: string;
  url: string;
  last_action_date: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state")?.toUpperCase();

  try {
    const params = new URLSearchParams({ year: "2025", per_page: "50" });
    if (state) params.set("state", state);

    const res = await fetch(`${TRACKER_API}?${params}`, {
      next: { revalidate: 3600 }, // cache 1 hour
      headers: { "User-Agent": "Seagull-Health/1.0" },
    });

    if (!res.ok) return json({ bills: [], source: "Trans Legislation Tracker" });

    const data = await res.json();

    // Normalise — the tracker returns an array of bill objects
    const raw: any[] = Array.isArray(data) ? data : (data?.bills ?? data?.results ?? []);

    const bills: Bill[] = raw.map((b: any) => ({
      id: String(b.id ?? b.bill_id ?? ""),
      state: String(b.state ?? ""),
      bill_number: String(b.bill_number ?? b.identifier ?? ""),
      title: String(b.title ?? b.name ?? ""),
      status: String(b.status ?? b.bill_status ?? ""),
      category: String(b.category ?? b.type ?? ""),
      url: String(b.url ?? b.state_link ?? ""),
      last_action_date: String(b.last_action_date ?? b.updated_at ?? ""),
    }));

    return json({ bills, source: "Trans Legislation Tracker" });
  } catch {
    return json({ bills: [], source: "Trans Legislation Tracker" });
  }
}
