# Eardium Web

The standalone web and private-RSS product for Eardium.

It lets someone browse the reviewed catalog, play sessions with timed transcript text, place sessions in user-controlled folders, and subscribe to each folder as a private podcast feed. Catalog use and folder accounts require no email; the optional customisation waitlist is stored separately and confirmed by double opt-in.

## Ownership boundary

This repository owns:

- the Vite + React static site and hash routes;
- number-only accounts, folders, private RSS feeds, poll-retention timestamps, and waitlist tables;
- all four Supabase Edge Functions and their deployment configuration;
- Cloudflare Email Service integration for confirmation mail;
- a committed, build-independent snapshot of catalog text and RSS metadata;
- the content-safety release gate and deployment documentation.

The native app repository is not a package, workspace, build, or deployment dependency. The only shared production surface is the existing public catalog-audio origin (MP3 and timestamp sidecars), configured through `CATALOG_AUDIO_BASE_URL`. Catalog updates are explicit snapshot updates reviewed in this repository; they never enter an existing user folder automatically.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

The catalog and player work with the public audio origin. Account, folder, feed, and waitlist actions require `VITE_FUNCTIONS_BASE_URL` to point to the dedicated web Supabase project.

```bash
npm run check
```

## Backend

The `supabase/` directory is complete for a fresh dedicated project. Apply the migration, deploy `web-account`, `web-folders`, `web-waitlist`, and `feed`, then set the secrets and public URLs listed in [Deployment](docs/DEPLOYMENT.md).

## Release gate

Do not enable or share the GitHub Pages deployment until the catalog dispositions in [Content Safety Findings](docs/CONTENT_SAFETY_FINDINGS.md) are human-approved, required scripts/audio/timestamps are replaced, and the rendered audio is spot-checked. The deploy workflow is committed so the release is reproducible; merging is the gate.
