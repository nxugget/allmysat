import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function fetchDecayedSatellites(): Promise<number[]> {
  return new Promise((resolve, reject) => {
    fetch("https://celestrak.org/satcat/decayed-with-last.php?FORMAT=csv")
      .then((res) => {
        if (!res.ok) {
          reject(new Error(`Unexpected status code ${res.status}`));
          return;
        }
        return res.text();
      })
      .then((data) => {
        if (!data) return resolve([]);
        const lines = data.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) return resolve([]);
        const rows = lines.slice(1);
        const noradIds = rows
          .map((line) => {
            const cols = line.split(",");
            if (!cols[0]) return null;
            const raw = cols[0].trim().replace(/^"|"$/g, "");
            const id = parseInt(raw, 10);
            return Number.isNaN(id) ? null : id;
          })
          .filter((id): id is number => id !== null);
        resolve(noradIds);
      })
      .catch(reject);
  });
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

    console.log("Fetching decayed satellites from CelesTrak...");
    const decayedNoradIds = await fetchDecayedSatellites();
    console.log(`Found ${decayedNoradIds.length} decayed satellites`);

    if (!decayedNoradIds.length) {
      return NextResponse.json({
        success: true,
        message: "No decayed satellites to update.",
      });
    }

    // Supabase .in() has a limit of ~1000 items, so batch the updates
    const BATCH_SIZE = 500;
    let totalUpdated = 0;

    for (let i = 0; i < decayedNoradIds.length; i += BATCH_SIZE) {
      const batch = decayedNoradIds.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("satellites")
        .update({
          status: "decayed",
          updated_at: new Date().toISOString(),
        })
        .in("norad_id", batch)
        .neq("status", "decayed")
        .select("id");

      if (error) {
        console.error(`Error updating batch ${i / BATCH_SIZE + 1}:`, error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      totalUpdated += data ? data.length : 0;
    }

    console.log(`Successfully updated ${totalUpdated} satellites`);

    return NextResponse.json({ success: true, updated: totalUpdated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to update decayed satellites:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
