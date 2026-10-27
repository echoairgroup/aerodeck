# AeroDeck

AeroDeck is a professional flight-simulation command center built with Next.js.

## Online stack

- **GitHub**: source code and version history
- **Render**: production web hosting and automatic deploys
- **Neon**: PostgreSQL cloud database
- **VATSIM**: live network, events and METAR
- **SimBrief**: on-demand latest OFP import

## Run locally

```bash
npm ci
npx prisma generate
npm run dev
```

## Production

```bash
npx prisma generate
npm run build
npm run start
```

## Environment

Set `DATABASE_URL` to your Neon PostgreSQL connection string.

## Render

The repository includes `render.yaml`. Create a Render Web Service from the GitHub repository and add `DATABASE_URL` as an environment variable.

## Live integrations

VATSIM's public Data API provides live pilots/controllers and refreshes the network feed about every 15 seconds. Its Events API provides current/upcoming events, and its METAR service provides current airport weather. SimBrief's latest-OFP endpoint is used only when the user clicks the import action.

## Safety

AeroDeck is for flight simulation and education. It does not replace official aircraft documentation, charts, ATC instructions or real-world operational training.
