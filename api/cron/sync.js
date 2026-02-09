import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier l'authentification CRON_SECRET
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    console.log('Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialiser le client Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const startTime = new Date();

    console.log(`[${startTime.toISOString()}] Starting satellite data synchronization`);

    // Récupérer tous les satellites
    const { data: satellites, error: satellitesError } = await supabase
      .from('satellites')
      .select('id, norad_id, name');

    if (satellitesError) {
      throw new Error(`Failed to fetch satellites: ${satellitesError.message}`);
    }

    if (!satellites || satellites.length === 0) {
      console.log('No satellites found in database');
      return res.status(200).json({
        success: true,
        message: 'No satellites to sync',
        timestamp: startTime.toISOString(),
      });
    }

    console.log(`Found ${satellites.length} satellites to sync`);

    let tleCount = 0;
    let transmitterCount = 0;
    const syncErrors = [];

    // Traiter chaque satellite
    for (const satellite of satellites) {
      try {
        const { id: satelliteId, norad_id: noradId, name } = satellite;

        if (!noradId) {
          console.log(`Skipping satellite ${satelliteId} (${name}) - no NORAD ID`);
          continue;
        }

        console.log(`\nProcessing satellite: ${name} (NORAD: ${noradId})`);

        // ========== FETCH TLE ==========
        try {
          const tleFetchUrl = `https://celestrak.com/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`;
          console.log(`Fetching TLE from: ${tleFetchUrl}`);

          const tleResponse = await fetch(tleFetchUrl);
          if (!tleResponse.ok) {
            throw new Error(`CelesTrak responded with status ${tleResponse.status}`);
          }

          const tleText = await tleResponse.text();
          const tleLines = tleText.trim().split('\n');

          if (tleLines.length < 2) {
            console.log(`No TLE data found for satellite ${noradId}`);
          } else {
            // Le format TLE standard : nom, ligne 1, ligne 2
            let tleLine1, tleLine2;

            if (tleLines.length === 3) {
              // Format avec nom + 2 lignes
              tleLine1 = tleLines[1].trim();
              tleLine2 = tleLines[2].trim();
            } else if (tleLines.length === 2) {
              // Format avec 2 lignes directement
              tleLine1 = tleLines[0].trim();
              tleLine2 = tleLines[1].trim();
            }

            if (tleLine1 && tleLine2) {
              // Extraire l'epoch de la ligne 1 (format: year + day of year)
              // Position 18-20: année (derniers 2 chiffres), 20-32: jour de l'année
              const yearStr = tleLine1.substring(18, 20);
              const dayStr = tleLine1.substring(20, 32);
              const epoch = `20${yearStr}-${dayStr}`;

              console.log(`TLE found - Epoch: ${epoch}`);

              // Insérer ou mettre à jour le TLE
              const { error: tleError } = await supabase
                .from('tle')
                .upsert(
                  {
                    satellite_id: satelliteId,
                    tle_line1: tleLine1,
                    tle_line2: tleLine2,
                    epoch: epoch,
                    source: 'celestrak',
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'satellite_id' }
                );

              if (tleError) {
                throw new Error(`Failed to insert TLE: ${tleError.message}`);
              }

              tleCount++;
              console.log(`TLE updated for ${name}`);
            }
          }
        } catch (tleErr) {
          const errMsg = `TLE sync error for ${name}: ${tleErr.message}`;
          console.log(errMsg);
          syncErrors.push(errMsg);
        }

        // ========== FETCH TRANSMITTERS ==========
        try {
          const transmitterUrl = `https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${noradId}`;
          console.log(`Fetching transmitters from: ${transmitterUrl}`);

          const transmitterResponse = await fetch(transmitterUrl);
          if (!transmitterResponse.ok) {
            throw new Error(`SatNOGS API responded with status ${transmitterResponse.status}`);
          }

          const transmitterData = await transmitterResponse.json();
          const transmitters = Array.isArray(transmitterData) ? transmitterData : transmitterData.results || [];

          if (transmitters.length === 0) {
            console.log(`No transmitters found for satellite ${noradId}`);
          } else {
            // Supprimer les anciens transmitters pour ce satellite
            const { error: deleteError } = await supabase
              .from('transmitters')
              .delete()
              .eq('satellite_id', satelliteId);

            if (deleteError) {
              throw new Error(`Failed to delete old transmitters: ${deleteError.message}`);
            }

            console.log(`Deleted old transmitters for ${name}`);

            // Préparer les nouveaux transmitters
            const newTransmitters = transmitters.map((tx) => ({
              satellite_id: satelliteId,
              description: tx.description || '',
              mode: tx.mode || null,
              alive: tx.alive !== false, // Default to true if not specified
              uplink_low: tx.uplink_low || null,
              uplink_high: tx.uplink_high || null,
              downlink_low: tx.downlink_low || null,
              downlink_high: tx.downlink_high || null,
              created_at: new Date().toISOString(),
            }));

            // Insérer les nouveaux transmitters
            const { error: insertError } = await supabase
              .from('transmitters')
              .insert(newTransmitters);

            if (insertError) {
              throw new Error(`Failed to insert transmitters: ${insertError.message}`);
            }

            transmitterCount += transmitters.length;
            console.log(`Inserted ${transmitters.length} transmitters for ${name}`);
          }
        } catch (transmitterErr) {
          const errMsg = `Transmitter sync error for ${name}: ${transmitterErr.message}`;
          console.log(errMsg);
          syncErrors.push(errMsg);
        }
      } catch (satelliteErr) {
        const errMsg = `Error processing satellite ${satellite.name}: ${satelliteErr.message}`;
        console.log(errMsg);
        syncErrors.push(errMsg);
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(`\n=== SYNC COMPLETED ===`);
    console.log(`Duration: ${duration}ms`);
    console.log(`TLEs synced: ${tleCount}`);
    console.log(`Transmitters synced: ${transmitterCount}`);
    console.log(`Errors: ${syncErrors.length}`);

    return res.status(200).json({
      success: true,
      timestamp: endTime.toISOString(),
      duration: `${duration}ms`,
      stats: {
        tleCount,
        transmitterCount,
        errorCount: syncErrors.length,
      },
      errors: syncErrors.length > 0 ? syncErrors : undefined,
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
