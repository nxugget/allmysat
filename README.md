# 🛰️ AllMySat Sync

Backend synchronization service for the **AllMySat** iOS application.

## What is this?

This project automatically fetches and updates satellite data mainly for amateur radio operators:
- 📡 **TLE orbital data** from CelesTrak (every 6h)
- 📻 **Transmitter information** from SatNOGS DB (every 24h)
- 💾 Stores everything in a Supabase PostgreSQL database

## Tech Stack

- **Runtime**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **APIs**: CelesTrak, SatNOGS DB
- **Scheduling**: Github Actions

