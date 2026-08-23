# Standalone ownership boundary

```text
eardium-web repository / dedicated web Supabase project
├── static catalog + karaoke player
├── number-only accounts and user-controlled folders
├── private RSS feed generation and poll-retention timestamps
├── waitlist double opt-in → Cloudflare Email Service REST API
└── committed catalog snapshot + enclosure byte manifest
                         │
                         └── read-only public MP3/timestamps origin
                             (currently produced by the native app content pipeline)
```

There is no runtime or build-time import from the native app repository. The audio origin is public by product design and can move without code changes. A catalog refresh is an explicit content release: update the snapshot and manifest, run the safety gate, then merge. Existing feeds change only when their owner explicitly adds or removes an item.

The dedicated web Supabase project avoids importing the native project's migration history, service-role key, auth users, or private tables. Its deny-all RLS tables are reachable only through the four repository-owned Edge Functions.
