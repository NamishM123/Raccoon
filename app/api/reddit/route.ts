// Live Reddit experience posts for a given procedure. The client passes
// one or more `?q=` queries; we try each in turn — first against the
// trans-specific subreddit cluster, then unrestricted — and return the
// first non-empty result set. Falls back to an empty array so the UI can
// substitute curated samples without throwing.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBREDDIT_CLUSTER = ["asktransgender", "MtF", "FtM", "trans", "transgender"];

const UA =
  "Raccoon-Health/1.0 (+https://github.com/NamishM123/Raccoon; patient-experience-search)";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface RedditReview {
  id: string;
  title: string;
  snippet: string;
  author: string;
  subreddit: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

function normalizeChildren(children: any[]): RedditReview[] {
  return children
    .map((c) => c?.data)
    .filter((d) => d && !d.over_18 && !d.stickied)
    .map((d) => {
      const text: string = String(d.selftext ?? "");
      const snippet =
        text.length > 280 ? text.slice(0, 277).trimEnd() + "…" : text;
      return {
        id: String(d.id ?? ""),
        title: String(d.title ?? ""),
        snippet,
        author: String(d.author ?? ""),
        subreddit: String(d.subreddit ?? ""),
        url: d.permalink
          ? `https://www.reddit.com${d.permalink}`
          : String(d.url ?? ""),
        score: Number(d.score ?? 0),
        num_comments: Number(d.num_comments ?? 0),
        created_utc: Number(d.created_utc ?? 0),
      };
    })
    .filter((p) => p.title);
}

async function tryFetch(url: string): Promise<RedditReview[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const children: any[] = data?.data?.children ?? [];
    return normalizeChildren(children);
  } catch {
    return [];
  }
}

async function searchOnce(
  query: string,
  scope: "cluster" | "all",
  timeRange: "year" | "all"
): Promise<RedditReview[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
    t: timeRange,
    limit: "12",
  });
  if (scope === "cluster") {
    params.set("restrict_sr", "1");
    const sub = SUBREDDIT_CLUSTER.join("+");
    return tryFetch(`https://www.reddit.com/r/${sub}/search.json?${params}`);
  }
  return tryFetch(`https://www.reddit.com/search.json?${params}`);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queries = searchParams
    .getAll("q")
    .map((q) => q.trim())
    .filter(Boolean);
  if (queries.length === 0) return json({ posts: [], source: "Reddit" });

  // Strategy ladder: cluster + year → cluster + all → unrestricted + year.
  // First strategy with results wins.
  for (const q of queries) {
    const a = await searchOnce(q, "cluster", "year");
    if (a.length > 0) return json({ posts: a.slice(0, 8), source: "Reddit", query: q });
  }
  for (const q of queries) {
    const b = await searchOnce(q, "cluster", "all");
    if (b.length > 0) return json({ posts: b.slice(0, 8), source: "Reddit", query: q });
  }
  for (const q of queries) {
    const c = await searchOnce(q, "all", "year");
    if (c.length > 0) return json({ posts: c.slice(0, 8), source: "Reddit", query: q });
  }

  return json({ posts: [], source: "Reddit" });
}
