import { NextRequest, NextResponse } from "next/server";
import { getSupabase, batchUpsert } from "@/lib/supabase";

const PARALLEL_LIMIT = 30;
const API_TIMEOUT = 5000;

async function fetchWithTimeout(url: string, timeoutMs = API_TIMEOUT) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, attempts = 3, backoff = 500) {
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) console.log(`Retry #${i} for ${url}`);
      const resp = await fetchWithTimeout(url);
      return resp;
    } catch (err) {
      lastErr = err as Error;
      await delay(backoff * (i + 1));
    }
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const startTime = Date.now();

    const { data: satellites, error: satellitesError } = await supabase
      .from("satellites")
      .select("id, norad_id, name")
      .not("norad_id", "is", null);

    if (satellitesError)
      throw new Error(
        `Failed to fetch satellites: ${satellitesError.message}`
      );
    if (!satellites || satellites.length === 0)
      return NextResponse.json({
        success: true,
        message: "No satellites to sync",
      });

    const satelliteIds = satellites.map(
      (s: { id: string }) => s.id
    );
    const { data: existingTLEs } = await supabase
      .from("tle")
      .select("satellite_id, tle_line1, tle_line2")
      .in("satellite_id", satelliteIds);

    const tleMap = new Map(
      (existingTLEs || []).map(
        (t: { satellite_id: string; tle_line1: string; tle_line2: string }) => [
          t.satellite_id,
          t,
        ]
      )
    );
    const pendingTLEUpserts: Record<string, unknown>[] = [];

    const processSatellite = async (satellite: {
      id: string;
      norad_id: number;
      name: string;
    }) => {
      const { id: satelliteId, norad_id: noradId, name } = satellite;
      try {
        const tleResponse = await fetchWithRetry(
          `https://celestrak.com/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`,
          3,
          500
        );

        if (!tleResponse.ok) return { name, success: false };

        const tleText = await tleResponse.text();
        const tleLines = tleText.trim().split("\n");
        if (tleLines.length < 2) return { name, success: false };

        const tleLine1 =
          tleLines.length === 3 ? tleLines[1].trim() : tleLines[0].trim();
        const tleLine2 =
          tleLines.length === 3 ? tleLines[2].trim() : tleLines[1].trim();

        if (!tleLine1 || !tleLine2) return { name, success: false };

        const existingTLE = tleMap.get(satelliteId) as
          | { tle_line1: string; tle_line2: string }
          | undefined;
        const tleChanged =
          !existingTLE ||
          existingTLE.tle_line1 !== tleLine1 ||
          existingTLE.tle_line2 !== tleLine2;

        if (tleChanged) {
          const yearStr = tleLine1.substring(18, 20);
          const dayStr = tleLine1.substring(20, 32);
          const yearNum = parseInt(yearStr, 10);
          const century = yearNum >= 57 ? "19" : "20";
          const epoch = `${century}${yearStr}-${dayStr}`;

          pendingTLEUpserts.push({
            satellite_id: satelliteId,
            tle_line1: tleLine1,
            tle_line2: tleLine2,
            epoch: epoch,
            source: "celestrak",
          });

          return { name, success: true, updated: true };
        }

        return { name, success: true, updated: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.log(`TLE error for ${name}: ${message}`);
        return { name, success: false, error: message };
      }
    };

    const results: { name: string; success: boolean; updated?: boolean }[] = [];
    for (let i = 0; i < satellites.length; i += PARALLEL_LIMIT) {
      const batch = satellites.slice(i, i + PARALLEL_LIMIT);
      const batchResults = await Promise.all(batch.map(processSatellite));
      results.push(...batchResults);
    }

    if (pendingTLEUpserts.length > 0)
      await batchUpsert(supabase, "tle", pendingTLEUpserts, 100);

    const duration = Date.now() - startTime;
    const updatedCount = results.filter(
      (r) => r.success && r.updated
    ).length;

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      processed: results.length,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("TLE sync error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
