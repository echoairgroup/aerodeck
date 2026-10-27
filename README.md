# AeroDeck

AeroDeck is a flight-simulation workspace for real SimBrief OFPs, live VATSIM data, METARs, personal flight planning, notes and NewSky airline information.

## Integrations

- **SimBrief:** the latest OFP is fetched on demand from the username or numeric Pilot ID you enter. The page displays fields supplied by SimBrief, route/waypoint data when present, fuel and weight data when provided, and an OFP-backed route plot when valid coordinates are included.
- **VATSIM and METAR:** public endpoints proxied by server routes.
- **NewSky:** add `NEWSKY_API_KEY` as a server-side environment variable. The key needs NewSky's `flights` API scope. The integration stays explicitly unconfigured until a key is added and a real response is received.
- **Neon:** the app uses `DATABASE_URL` for cloud state.

## Run locally

```bash
npm install
npx prisma generate
npm run dev
```

Set `DATABASE_URL` in a local `.env` file before using the cloud-state and database health routes. Optionally set `NEWSKY_API_KEY` to use NewSky.

## Deployment and domains

AeroDeck uses Next.js server route handlers and Prisma/PostgreSQL. It needs a Next.js-capable host such as Vercel or Render plus Neon. The build script runs `prisma generate` itself, so a standard `npm run build` works on both hosts. Set `DATABASE_URL` in the host's environment before the production deploy and add `NEWSKY_API_KEY` only if you have the correct NewSky airline API key. **GitHub Pages only serves static output**, so it cannot run these API routes or Prisma itself. A split setup with GitHub Pages for a static frontend and a separate API is possible, but it would require a different frontend/backend architecture.

To use a personal domain, register a domain name with a registrar and point its DNS to the chosen host. Then AeroDeck can use your domain instead of the hosting provider's subdomain. No domain name or DNS settings are hard-coded in this repository.

## Data integrity

- No sample flight is preloaded.
- Callsigns, routes, flight durations, landing rates and NewSky values are shown only when entered by the user or returned by an integration.
- Empty provider fields are displayed as unavailable, not filled with made-up values.
- The production build does not automatically push schema changes to the database. Schema changes should be reviewed and applied deliberately.

AeroDeck is for flight simulation and education. It does not replace official aircraft documentation, charts, ATC instructions or real-world operational training.
