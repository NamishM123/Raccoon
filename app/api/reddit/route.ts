// Live Reddit experience posts for a given procedure. Hits Reddit's
// public search.json endpoint, restricted to subreddits where patients
// actually post about their experience (asktransgender, MtF, FtM, trans).
// Degrades gracefully to an empty array if Reddit rate-limits us.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBREDDITS = ["asktransgender", "MtF", "FtM", "trans"];

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  if (!query) return json({ posts: [], source: "Reddit" });

  const sub = SUBREDDITS.join("+");
  const url =
    `https://www.reddit.com/r/${sub}/search.json?` +
    new URLSearchParams({
      q: query,
      restrict_sr: "1",
      sort: "relevance",
      t: "year",
      limit: "8",
    });

  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 }, // 30 min cache
      headers: {
        "User-Agent": "Raccoon-Health/1.0 (patient experience search)",
        Accept: "application/json",
      },
    });

    if (!res.ok) return json({ posts: [], source: "Reddit" });

    const data = await res.json();
    const children: any[] = data?.data?.children ?? [];

    const posts: RedditReview[] = children
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
          url: d.permalink ? `https://www.reddit.com${d.permalink}` : String(d.url ?? ""),
          score: Number(d.score ?? 0),
          num_comments: Number(d.num_comments ?? 0),
          created_utc: Number(d.created_utc ?? 0),
        };
      });

    return json({ posts, source: "Reddit" });
  } catch {
    return json({ posts: [], source: "Reddit" });
  }
}
