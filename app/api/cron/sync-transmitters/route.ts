import { NextRequest, NextResponse } from "next/server";
import {
  getSupabase,
  batchUpsert,
  batchInsert,
  batchDelete,
} from "@/lib/supabase";

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

    const { data: existingTransmittersAll } = await supabase
      .from("transmitters")
      .select(
        "id, satellite_id, description, mode, alive, uplink_low, uplink_high, downlink_low, downlink_high"
      )
      .in("satellite_id", satelliteIds);

    const transmittersMap = new Map<string, any[]>();
    for (const tx of existingTransmittersAll || []) {
      if (!transmittersMap.has(tx.satellite_id))
        transmittersMap.set(tx.satellite_id, []);
      transmittersMap.get(tx.satellite_id)!.push(tx);
    }

    const pendingTxInserts: Record<string, unknown>[] = [];
    const pendingTxUpserts: Record<string, unknown>[] = [];
    const pendingTxDeletes: string[] = [];

    const processSatellite = async (satellite: {
      id: string;
      norad_id: number;
      name: string;
    }) => {
      const { id: satelliteId, norad_id: noradId, name } = satellite;
      try {
        const transmitterResponse = await fetchWithRetry(
          `https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${noradId}`,
          3,
          500
        );

        if (!transmitterResponse.ok) return { name, success: false };

        const transmitterData = await transmitterResponse.json();
        const apiTransmitters = Array.isArray(transmitterData)
          ? transmitterData
          : transmitterData.results || [];

        const existingTransmitters = transmittersMap.get(satelliteId) || [];
        const existingMap = new Map(
          (existingTransmitters || []).map((tx: any) => [tx.description, tx])
        );

        const apiMap = new Map(
          apiTransmitters.map((tx: any) => [tx.description || "", tx])
        );

        const toAdd = apiTransmitters.filter(
          (tx: any) => !existingMap.has(tx.description || "")
        );

        if (toAdd.length > 0) {
          const newTransmitters = toAdd.map((tx: any) => ({
            satellite_id: satelliteId,
            description: tx.description || "",
            mode: tx.mode || null,
            alive: tx.alive !== false,
            uplink_low: tx.uplink_low || null,
            uplink_high: tx.uplink_high || null,
            downlink_low: tx.downlink_low || null,
            downlink_high: tx.downlink_high || null,
          }));

          pendingTxInserts.push(...newTransmitters);
        }

        const toUpdate: Record<string, unknown>[] = [];
        for (const apiTx of apiTransmitters) {
          const existing = existingMap.get(apiTx.description || "");
          if (existing) {
            const hasChanged =
              existing.mode !== (apiTx.mode || null) ||
              existing.alive !== (apiTx.alive !== false) ||
              existing.uplink_low !== (apiTx.uplink_low || null) ||
              existing.uplink_high !== (apiTx.uplink_high || null) ||
              existing.downlink_low !== (apiTx.downlink_low || null) ||
              existing.downlink_high !== (apiTx.downlink_high || null);

            if (hasChanged) {
              toUpdate.push({
                id: existing.id,
                mode: apiTx.mode || null,
                alive: apiTx.alive !== false,
                uplink_low: apiTx.uplink_low || null,
                uplink_high: apiTx.uplink_high || null,
                downlink_low: apiTx.downlink_low || null,
                downlink_high: apiTx.downlink_high || null,
                updated_at: new Date().toISOString(),
              });
            }
          }
        }

        if (toUpdate.length > 0) pendingTxUpserts.push(...toUpdate);

        const toRemove = (existingTransmitters || []).filter(
          (tx: any) => !apiMap.has(tx.description)
        );
        if (toRemove.length > 0)
          pendingTxDeletes.push(...toRemove.map((tx: any) => tx.id));

        return { name, success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.log(`Transmitter error for ${name}: ${message}`);
        return { name, success: false, error: message };
      }
    };

    const results: { name: string; success: boolean }[] = [];
    for (let i = 0; i < satellites.length; i += PARALLEL_LIMIT) {
      const batch = satellites.slice(i, i + PARALLEL_LIMIT);
      const batchResults = await Promise.all(batch.map(processSatellite));
      results.push(...batchResults);
    }

    if (pendingTxInserts.length > 0)
      await batchInsert(supabase, "transmitters", pendingTxInserts, 100);
    if (pendingTxUpserts.length > 0)
      await batchUpsert(supabase, "transmitters", pendingTxUpserts, 100);
    if (pendingTxDeletes.length > 0)
      await batchDelete(supabase, "transmitters", pendingTxDeletes, 100);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: results.length,
      inserts: pendingTxInserts.length,
      updates: pendingTxUpserts.length,
      deletes: pendingTxDeletes.length,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Transmitters sync error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
