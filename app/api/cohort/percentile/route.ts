import { findPercentile, totalSampleSize, uniqueRegimens } from "@/lib/cohort";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { lab_name?: string; value?: string | number; regimen?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const lab = String(body.lab_name || "").trim();
  const regimen = String(body.regimen || "").trim();
  const value = Number(body.value);
  if (!lab || !Number.isFinite(value)) {
    return json({ result: null });
  }
  const result = findPercentile(lab, regimen, value);
  if (!result) return json({ result: null });
  return json({
    result: {
      lab: result.cell.lab,
      regimen_label: result.cell.regimen_label,
      unit: result.cell.unit,
      mean: result.cell.mean,
      sd: result.cell.sd,
      n: result.cell.n,
      percentile: result.percentile,
      z: result.z,
      position_norm: result.position_norm,
      user_value: value,
    },
  });
}

export async function GET() {
  return json({
    total_observations: totalSampleSize(),
    unique_regimens: uniqueRegimens(),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
