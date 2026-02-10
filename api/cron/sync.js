import { createClient } from '@supabase/supabase-js';

const PARALLEL_LIMIT = 30;
const API_TIMEOUT = 5000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = req.headers['authorization']?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    console.log('Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const startTime = Date.now();

    console.log(`[${new Date().toISOString()}] Starting satellite data synchronization`);

    const { data: satellites, error: satellitesError } = await supabase
      .from('satellites')
      .select('id, norad_id, name')
      .not('norad_id', 'is', null);

    if (satellitesError) {
      throw new Error(`Failed to fetch satellites: ${satellitesError.message}`);
    }

    if (!satellites || satellites.length === 0) {
      console.log('No satellites found in database');
      return res.status(200).json({
        success: true,
        message: 'No satellites to sync',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Processing ${satellites.length} satellites`);

    const satelliteIds = satellites.map(s => s.id);

    const { data: existingTLEs } = await supabase
      .from('tle')
      .select('satellite_id, tle_line1, tle_line2')
      .in('satellite_id', satelliteIds);

    const tleMap = new Map((existingTLEs || []).map(t => [t.satellite_id, t]));

    const { data: existingTransmittersAll } = await supabase
      .from('transmitters')
      .select('id, satellite_id, description, mode, alive, uplink_low, uplink_high, downlink_low, downlink_high')
      .in('satellite_id', satelliteIds);

    const transmittersMap = new Map();
    for (const tx of (existingTransmittersAll || [])) {
      if (!transmittersMap.has(tx.satellite_id)) transmittersMap.set(tx.satellite_id, []);
      transmittersMap.get(tx.satellite_id).push(tx);
    }

    const pendingTLEUpserts = [];
    const pendingTxInserts = [];
    const pendingTxUpserts = [];
    const pendingTxDeletes = [];

    const stats = {
      tleUpdated: 0,
      tleUnchanged: 0,
      transmittersAdded: 0,
      transmittersUpdated: 0,
      transmittersRemoved: 0,
      syncErrors: [],
    };

    const processSatellite = async (satellite) => {
      const satStartTime = Date.now();
      const result = { 
        name: satellite.name, 
        success: true, 
        tleUpdated: false,
        transmittersAdded: 0,
        transmittersUpdated: 0,
        transmittersRemoved: 0,
        duration: 0,
      };

      try {
        const { id: satelliteId, norad_id: noradId, name } = satellite;

        const fetchWithTimeout = async (url, timeoutMs = API_TIMEOUT) => {
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
        };

        const delay = ms => new Promise(r => setTimeout(r, ms));

        const fetchWithRetry = async (url, attempts = 3, backoff = 500) => {
          let lastErr = null;
          for (let i = 0; i < attempts; i++) {
            try {
              if (i > 0) console.log(`Retry #${i} for ${url}`);
              const resp = await fetchWithTimeout(url);
              return resp;
            } catch (err) {
              lastErr = err;
              if (err.name === 'AbortError') {
                // timeout - wait a bit and retry
                await delay(backoff * (i + 1));
                continue;
              }
              await delay(backoff * (i + 1));
            }
          }
          throw lastErr;
        };

        const tlePromise = (async () => {
          try {
            const tleResponse = await fetchWithRetry(
              `https://celestrak.com/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`,
              3,
              500
            );
            
            if (!tleResponse.ok) return null;
            
            const tleText = await tleResponse.text();
            const tleLines = tleText.trim().split('\n');

            if (tleLines.length < 2) return null;

            const tleLine1 = tleLines.length === 3 ? tleLines[1].trim() : tleLines[0].trim();
            const tleLine2 = tleLines.length === 3 ? tleLines[2].trim() : tleLines[1].trim();

            if (!tleLine1 || !tleLine2) return null;

            const existingTLE = tleMap.get(satelliteId);

            const tleChanged = !existingTLE ||
              existingTLE.tle_line1 !== tleLine1 ||
              existingTLE.tle_line2 !== tleLine2;

            if (tleChanged) {
              const yearStr = tleLine1.substring(18, 20);
              const dayStr = tleLine1.substring(20, 32);
              const epoch = `20${yearStr}-${dayStr}`;

              pendingTLEUpserts.push({
                satellite_id: satelliteId,
                tle_line1: tleLine1,
                tle_line2: tleLine2,
                epoch: epoch,
                source: 'celestrak',
                updated_at: new Date().toISOString(),
              });

              result.tleUpdated = true;
              return 'updated';
            }
            return 'unchanged';
          } catch (err) {
            console.log(`TLE error for ${name}: ${err.message}`);
            return null;
          }
        })();

        const transmitterPromise = (async () => {
          try {
            const transmitterResponse = await fetchWithRetry(
              `https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${noradId}`,
              3,
              500
            );

            if (!transmitterResponse.ok) return null;

            const transmitterData = await transmitterResponse.json();
            const apiTransmitters = Array.isArray(transmitterData) 
              ? transmitterData 
              : transmitterData.results || [];

            const existingTransmitters = transmittersMap.get(satelliteId) || [];
            const existingMap = new Map((existingTransmitters || []).map(tx => [tx.description, tx]));

            const apiMap = new Map(
              apiTransmitters.map(tx => [tx.description || '', tx])
            );

            let added = 0, updated = 0, removed = 0;

            const toAdd = apiTransmitters.filter(tx => !existingMap.has(tx.description || ''));
            
            if (toAdd.length > 0) {
              const newTransmitters = toAdd.map(tx => ({
                satellite_id: satelliteId,
                description: tx.description || '',
                mode: tx.mode || null,
                alive: tx.alive !== false,
                uplink_low: tx.uplink_low || null,
                uplink_high: tx.uplink_high || null,
                downlink_low: tx.downlink_low || null,
                downlink_high: tx.downlink_high || null,
              }));

              pendingTxInserts.push(...newTransmitters);
              added = toAdd.length;
            }

            const toUpdate = [];
            for (const apiTx of apiTransmitters) {
              const existing = existingMap.get(apiTx.description || '');
              
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

            if (toUpdate.length > 0) {
              pendingTxUpserts.push(...toUpdate);
              updated = toUpdate.length;
            }

            const toRemove = (existingTransmitters || []).filter(
              tx => !apiMap.has(tx.description)
            );

            if (toRemove.length > 0) {
              const idsToRemove = toRemove.map(tx => tx.id);
              pendingTxDeletes.push(...idsToRemove);
              removed = toRemove.length;
            }

            result.transmittersAdded = added;
            result.transmittersUpdated = updated;
            result.transmittersRemoved = removed;

            return { added, updated, removed };
          } catch (err) {
            console.log(`Transmitter error for ${name}: ${err.message}`);
            return null;
          }
        })();

        const [tleResult, transmitterResult] = await Promise.all([tlePromise, transmitterPromise]);

        result.duration = Date.now() - satStartTime;
        return result;

      } catch (err) {
        result.success = false;
        result.error = err.message;
        result.duration = Date.now() - satStartTime;
        return result;
      }
    };

    const results = [];
    for (let i = 0; i < satellites.length; i += PARALLEL_LIMIT) {
      const batch = satellites.slice(i, i + PARALLEL_LIMIT);
      const batchResults = await Promise.all(batch.map(processSatellite));
      results.push(...batchResults);
      
      console.log(`Processed ${Math.min(i + PARALLEL_LIMIT, satellites.length)}/${satellites.length} satellites`);
    }

    for (const result of results) {
      if (result.success) {
        if (result.tleUpdated) stats.tleUpdated++;
        else stats.tleUnchanged++;
        stats.transmittersAdded += result.transmittersAdded;
        stats.transmittersUpdated += result.transmittersUpdated;
        stats.transmittersRemoved += result.transmittersRemoved;
      } else {
        stats.syncErrors.push(`${result.name}: ${result.error}`);
      }
    }

    const batchUpsert = async (table, rows, batchSize = 100) => {
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await supabase.from(table).upsert(batch);
      }
    };

    const batchInsert = async (table, rows, batchSize = 100) => {
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await supabase.from(table).insert(batch);
      }
    };

    const batchDelete = async (table, ids, batchSize = 100) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await supabase.from(table).delete().in('id', batch);
      }
    };

    if (pendingTLEUpserts.length > 0) await batchUpsert('tle', pendingTLEUpserts, 100);
    if (pendingTxInserts.length > 0) await batchInsert('transmitters', pendingTxInserts, 100);
    if (pendingTxUpserts.length > 0) await batchUpsert('transmitters', pendingTxUpserts, 100);
    if (pendingTxDeletes.length > 0) await batchDelete('transmitters', pendingTxDeletes, 100);

    const duration = Date.now() - startTime;

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const slowest = results.reduce((max, r) => r.duration > max.duration ? r : max, results[0]);

    console.log(`\n=== SYNC COMPLETED ===`);
    console.log(`Total duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`Satellites processed: ${results.length}`);
    console.log(`Avg time per satellite: ${avgDuration.toFixed(0)}ms`);
    console.log(`Slowest satellite: ${slowest.name} (${slowest.duration}ms)`);
    console.log(`TLEs updated: ${stats.tleUpdated}`);
    console.log(`TLEs unchanged: ${stats.tleUnchanged}`);
    console.log(`Transmitters added: ${stats.transmittersAdded}`);
    console.log(`Transmitters updated: ${stats.transmittersUpdated}`);
    console.log(`Transmitters removed: ${stats.transmittersRemoved}`);
    console.log(`Errors: ${stats.syncErrors.length}`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      processed: satellites.length,
      avgTimePerSatellite: `${avgDuration.toFixed(0)}ms`,
      stats: {
        tle: {
          updated: stats.tleUpdated,
          unchanged: stats.tleUnchanged,
        },
        transmitters: {
          added: stats.transmittersAdded,
          updated: stats.transmittersUpdated,
          removed: stats.transmittersRemoved,
        },
        errorCount: stats.syncErrors.length,
      },
      errors: stats.syncErrors.length > 0 ? stats.syncErrors : undefined,
    });
  } catch (error) {
    console.error('Critical sync error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
