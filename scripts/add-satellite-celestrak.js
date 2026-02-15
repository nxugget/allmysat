import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Parse TLE
function parseTLEFile(tleText) {
  const lines = tleText.trim().split('\n');
  const satellites = [];
  
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length) {
      const rawName = lines[i].trim();
      const line1 = lines[i + 1].trim();
      const line2 = lines[i + 2].trim();
      const noradId = parseInt(line1.substring(2, 7));
      
      let name = rawName;
      let alternateName = null;
      
      const match = rawName.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        name = match[1].trim();
        alternateName = match[2].trim();
      }
      
      if (!isNaN(noradId) && name && line1 && line2) {
        satellites.push({ 
          noradId, 
          name,
          alternateName,
          tle_line1: line1,
          tle_line2: line2
        });
      }
    }
  }
  
  return satellites;
}

// Upsert satellite (plus de main_category/subcategory)
async function upsertSatellite(sat) {
  try {
    // Use upsert with onConflict to make this safe under concurrency
    const payload = {
      norad_id: sat.noradId,
      name: sat.name,
      alternate_names: sat.alternateName ? [sat.alternateName] : null,
      status: 'Unknown'
    };

    const { data, error } = await supabase
      .from('satellites')
      .upsert(payload, { onConflict: 'norad_id' })
      .select('id, norad_id, name')
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error(`❌ Error: ${sat.name}`, error.message);
    return null;
  }
}

// Link satellite to category
async function linkSatelliteToCategory(satelliteId, categoryId, subcategoryId) {
  try {
    const { data: existing } = await supabase
      .from('satellite_categories')
      .select('*')
      .eq('satellite_id', satelliteId)
      .eq('category_id', categoryId)
      .eq('subcategory_id', subcategoryId)
      .single();

    if (existing) return 'exists';

    const { error } = await supabase
      .from('satellite_categories')
      .insert({
        satellite_id: satelliteId,
        category_id: categoryId,
        subcategory_id: subcategoryId
      });

    if (error) throw error;
    return 'linked';

  } catch (error) {
    console.error(`❌ Link error:`, error.message);
    return 'error';
  }
}

// Upsert TLE
async function upsertTLE(satelliteId, sat) {
  try {
    const { data: existing } = await supabase
      .from('tle')
      .select('id')
      .eq('satellite_id', satelliteId)
      .single();

    const tleData = {
      satellite_id: satelliteId,
      tle_line1: sat.tle_line1,
      tle_line2: sat.tle_line2,
      source: 'celestrak',
    };

    if (existing) {
      const { error } = await supabase
        .from('tle')
        .update(tleData)
        .eq('satellite_id', satelliteId);
      
      if (error) throw error;
      return 'updated';
    } else {
      const { error } = await supabase
        .from('tle')
        .insert(tleData);
      
      if (error) throw error;
      return 'inserted';
    }

  } catch (error) {
    console.error(`❌ TLE error:`, error);
    return 'error';
  }
}

// Main
async function main() {
  const url = process.argv[2];
  const categoryId = parseInt(process.argv[3]);
  const subcategoryId = process.argv[4] ? parseInt(process.argv[4]) : null;

  if (!url || !categoryId) {
    console.error('❌ Usage: node import-tle.js <URL> <CATEGORY_ID> [SUBCATEGORY_ID]');
    console.error('Example: node import-tle.js "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle" 2 7');
    console.error('\nCategory IDs: 1=Ham Radio, 2=Weather, 3=Earth Resources, 4=Communications, 5=GNSS, 6=Scientific');
    process.exit(1);
  }

  console.log(`\n🛰️  Importing from: ${url}`);
  console.log(`📁 Category ID: ${categoryId}${subcategoryId ? ` / Subcategory ID: ${subcategoryId}` : ''}\n`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.status}`);
      process.exit(1);
    }

    const tleText = await response.text();
    const satellites = parseTLEFile(tleText);

    console.log(`📡 Found ${satellites.length} satellites\n`);

    let inserted = 0;
    let linked = 0;
    let tleInserted = 0;
    let tleUpdated = 0;
    let errors = 0;

    // Process with controlled concurrency
    const concurrency = parseInt(process.env.CONCURRENCY || '10', 10);
    const queue = [...satellites];

    async function worker() {
      while (queue.length) {
        const sat = queue.shift();
        if (!sat) break;

        const satellite = await upsertSatellite(sat);

        if (satellite && satellite.id) {
          console.log(`✅ ${sat.name} [${sat.noradId}]`);
          inserted++;

          const linkResult = await linkSatelliteToCategory(satellite.id, categoryId, subcategoryId);
          if (linkResult === 'linked') linked++;

          const tleResult = await upsertTLE(satellite.id, sat);
          if (tleResult === 'inserted') tleInserted++;
          if (tleResult === 'updated') tleUpdated++;
          if (tleResult === 'error') errors++;
        } else {
          errors++;
        }
      }
    }

    // Start workers
    const workers = [];
    for (let i = 0; i < Math.min(concurrency, satellites.length); i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Satellites: ${inserted} processed`);
    console.log(`🔗 Categories linked: ${linked}`);
    console.log(`📍 TLE inserted: ${tleInserted}`);
    console.log(`📍 TLE updated: ${tleUpdated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

main();
