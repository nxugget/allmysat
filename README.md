<h1 align="center">🛰️ AllMySat</h1>

<p align="center">
  <strong>Your companion app for satellite lovers</strong><br/>
  Track 10,000+ satellites in real-time with precise orbital data.<br/>
  <em>Built for radio amateurs and space enthusiasts.</em>
</p>

---

## 📸 Features

<p align="center">
  <img src="public/carousel/globe-view.webp" width="180" alt="3D Globe Tracking" />
  &nbsp;&nbsp;
  <img src="public/carousel/satellite.webp" width="180" alt="Satellite Details" />
  &nbsp;&nbsp;
  <img src="public/carousel/polar-chart.webp" width="180" alt="Pass Predictions" />
  &nbsp;&nbsp;
  <img src="public/carousel/grid-square.webp" width="180" alt="Grid Square Locator" />
</p>

- **3D Globe Tracking** — Interactive visualization of satellite positions and ground tracks
- **10,000+ Satellites** — Complete orbital database with real-time TLE updates
- **Pass Predictions** — Upcoming satellite passes with elevation & azimuth data
- **Grid Square Locator** — Automatic Maidenhead calculation for amateur radio contacts
- **Transmitter Info** — Downlink frequencies and modes for each satellite

---


### Sync Jobs

| Route | Schedule | Description |
|-------|----------|-------------|
| `/api/cron/sync-tle` | Every 6h | Sync TLE orbital data from CelesTrak |
| `/api/cron/sync-transmitters` | Daily | Sync transmitter data from SatNOGS |
| `/api/cron/decayed` | Weekly | Mark decayed satellites |


## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **3D Globe** | three-globe + React Three Fiber |
| **Animations** | Framer Motion |
| **Database** | Supabase (PostgreSQL) |
| **Hosting** | Vercel |