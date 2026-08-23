# Eardium Web — MVP Product Plan

> Source product document retained for decision history. `PLAN_WEB_P1.md` is
> the current implementation plan where the two differ.

**Version:** 0.1 · 15 Aug 2026
**Status:** Pre-build. Decision gates defined; commitment deferred until Gate A.

---

## 1. Thesis

Eardium's iOS app answers "can we build a PETTLEP rehearsal product." The open question is different: **do athletes want personalised mental rehearsal audio enough to change behaviour?**

A web wedge answers that faster than an app release, because it removes three bottlenecks at once: App Store review latency, install friction, and the native audio stack. The wedge is:

> Desktop web surface that generates PETTLEP rehearsal scripts, synthesises them to audio, and delivers them to the athlete's existing podcast app via a private RSS feed.

**Why this shape wins:**

- No client to install. The player already exists on every phone — three of them.
- No App Store review in the iteration loop. Prompt changes ship in minutes.
- Delivery is solved by a 30-year-old open standard, not by us.
- Privacy becomes a defensible claim rather than a marketing line.

**Non-goal:** replacing the iOS app. The web wedge is a validation instrument and an acquisition surface. Measurement and long-term retention live in native.

---

## 2. Scope

### In

| Item | Rationale |
|---|---|
| Desktop web app (generate → preview → approve → publish) | The iteration loop |
| Pre-built script library, SOTA-generated | Cold-start fix + quality floor |
| Private RSS feed, one per user | Zero-build delivery |
| QR + deep-link handoff page | Desktop → phone transfer |
| Email capture on "customise" intent | Demand signal for Phase 2 |

### Out (explicitly, for MVP)

| Item | Reason |
|---|---|
| **Spotify support** | No external private RSS support. Accepted gap. |
| **PWA** | Justified only by reach (Spotify) or telemetry. Both ruled out. |
| **User image upload** | UGC triggers App Store 1.2, DSA hosting duties, CSAM scanning. Disproportionate for a solo Einzelunternehmen. |
| **Completion / adherence telemetry** | Structurally impossible over RSS. Deferred to native. |
| **Mobile web** | Handoff page only. Generation is a sit-down task. |
| **Non-English** | Small models degrade sharply; TTS phonemiser may be remote. |

### Deferred behind a gate

- Client-side script generation (local LLM)
- Client-side TTS
- Per-slot regeneration UI

---

## 3. Architecture

```
DESKTOP BROWSER                    SERVER                  ATHLETE'S PHONE
─────────────────                  ──────                  ───────────────
Library browse
Slot editor          ──prompt──▶   LLM proxy
                     ◀──JSON───
Preview <audio>      ──MP3────▶    Object storage
Approve                            └─ feed.xml    ◀─poll──  Podcast app
                                                  ──GET──▶  (auto-download)
QR / deep link       ─────────────────────────────────────▶ Subscribe
```

**Server responsibilities (deliberately minimal):**
- Proxy LLM calls (hide key, no logging of script text)
- Accept MP3 upload under a random key
- Serve `feed.xml` per user token
- Serve enclosure MP3s
- Count events (Section 8)

**Server explicitly does NOT:**
- Store script text
- Run TTS
- Retain access logs beyond truncated-IP counters

This is the privacy claim, and it is architectural rather than promissory.

### Shared code with the iOS app

Extract as a **pure TypeScript workspace package** — no React, no React Native imports:

- PETTLEP schema + types
- Prompt assembly
- Output validation
- Feed/XML generation
- Coaching-cue library

Do **not** attempt component sharing via `react-native-web`. It constrains desktop layout to RN's model — exactly the surface where design quality matters — and saves less than it costs at this size.

**Audio playback shares nothing.** `<audio controls>` is the entire desktop player for MVP. Browsers ship scrubbing, volume, keyboard control, and speed. Web Audio only if waveform display or programmatic pause insertion becomes necessary.

---

## 4. Content model

### The unit is a race, not an episode

Nobody wants "an episode." They want a race prepared for. Configure once, generate a set:

```
Berlin Marathon · 3:45 target · flat asphalt · thin crowd
  1. Start corral      — nerves, holding back
  2. Mile 13           — settling, it feels easy, don't chase
  3. Mile 20           — quadriceps, the wall
  4. Mile 24           — it's a 2-mile race now
  5. Finish chute
```

Five items, one action, shared parameters. Batching becomes the product's noun rather than a UI concession.

### PETTLEP slot schema

Generation targets a JSON object, not prose. Composition and coverage in one pass is what breaks small models; slot-filling does not.

| Slot | Nature | Notes |
|---|---|---|
| `physical` | descriptive | Named muscles, not "your body" |
| `environment` | descriptive | Surface, sound, weather, crowd |
| `task` | mild imperative | The action, in motion |
| `timing` | mild imperative | A number: cadence, split |
| `learning` | **instruction** | The only genuinely imperative slot |
| `emotion` | descriptive | Named honestly, not cheerleading |
| `perspective` | descriptive | First-person internal view |

**Prompt hygiene (learned the hard way):** the schema must be internally airtight. Small models resolve contradictions by picking whichever instruction sits nearer the slot being written, then bleed that choice across every other slot. A person/tense mismatch between header and slot description propagated through all seven fields in testing.

### Safety constraint

One line in the system prompt: **never instruct ignoring, suppressing, or pushing through pain signals.** No output filter, no templating, no legal architecture.

Rationale: this is a product-quality constraint, not a compliance one. Adults choosing their own training content, reviewing before hearing it, with no medical claim anywhere in the product. A visualisation script saying "hold your cadence" is not a defective product. But a running app should not tell someone to run through a knee signal, so we simply don't build one that does.

*Not legal advice. If revenue scales, an hour with a Produkthaftung/AGB lawyer is worth buying — later-stage, not an MVP blocker.*

### Cover art

Derived from session parameters, never uploaded. Distance + moment + emotion + time-of-day → deterministic palette and geometry seed → 3000×3000.

Personal-feeling, on-brand, unique per user, zero moderation surface.

**Episode titles are a privacy surface.** They render on lock screens, in notifications, and in podcast-app sync payloads. Functional only: `Mile 20 · Cadence`. Never diagnostic: `Fear of blowing up again`.

---

## 5. Generation — two phases

### Phase 1 (ships): remote, curated

Library scripts written by SOTA models, human-reviewed, fixed. User picks a race pack; audio is pre-rendered.

TTS: **Kokoro-82M** (Apache 2.0, ~80 MB fp32, near real-time on CPU) run server-side in batch. Not in-browser — no latency benefit when producing a file, and 80 MB × every user is a pointless cost.

Prosody note: Kokoro has weak SSML. Control pacing by chunking at sentence boundaries and inserting explicit silence between chunks during assembly. This is also how timing cues land — wall-clock gaps we control, not gaps the model infers.

### Phase 2 (gated): local, personal

Only if Gate B fires.

| Component | Size (q4) |
|---|---|
| Qwen3.5-2B | ~1.4 GB |
| Kokoro q8 | ~40–80 MB |
| **First load** | **~1.5 GB**, cached after |

**Why local is viable despite model size:** the approval gate absorbs the weakness. Small models don't fail on average quality — they fail on *variance*. Good 70% of the time, strange 30%. Fatal in auto-publish; a non-issue when regenerate costs two seconds. The loop we want for product reasons happens to be the loop that makes a 2B usable.

**Why the download is acceptable:** it's opt-in, triggered by "edit this," not by "use this product." Library users never load it. Framed explicitly as the privacy trade — *nothing you write leaves this browser*.

**Model choice caveat:** benchmark shapes differ sharply at this size. Gemma writes; Qwen complies. If prose warmth matters more than schema compliance, re-test — the two families invert on Creative Writing vs. tool-use benchmarks.

**Publish the system prompt.** Not a leak. It makes the privacy claim auditable. The moat is the PETTLEP decomposition and the curated cue library, never the prompt text.

**Keep a remote path in the code, dark.** Needed the moment German or Russian scripts are on the table.

---

## 6. Delivery — private RSS

### Mechanism

There is no private-podcast standard. A private feed is a **capability URL** — ordinary RSS 2.0 at an unguessable address. Knowledge of the URL is the credential. No login; podcast apps handle auth inconsistently and it's why nobody uses it.

**One feed per user, created at first use.** Every session appends an `<item>`. Subscribe once; session #7 arrives with a notification. A link per session is a download button with extra steps and discards the only thing RSS is good at.

### Feed requirements

- `itunes:block` — keep out of directories
- `enclosure length` must be the true byte count or some apps refuse the download
- `guid` stable — changing it forces re-download
- `<itunes:type>serial</itunes:type>` on the channel, or stagger `pubDate` — otherwise apps present the finish line before the start

### Handoff

QR codes cannot encode custom schemes reliably (iOS Camera won't route `overcast://`). Pattern:

```
Desktop QR  →  https://eardium.app/s/{token}  →  UA detect  →  scheme buttons
```

| App | Scheme | Platform |
|---|---|---|
| Apple Podcasts | `podcast://` — works pre-submission | iOS, macOS |
| Overcast | `overcast://x-callback-url/add?url=…` — documented for private feeds | iOS |
| Pocket Casts | `pktc://subscribe/…` | iOS, Android |
| AntennaPod | `antennapod-subscribe://` | Android |
| Podcast Addict | `podcastaddict://` | Android |
| Castro | `castro://subscribe/…` | iOS |

**Trap:** Overcast requires the `https://` prefix in the feed URL; Pocket Casts requires it omitted. Build per-target, don't template one string.

**Always render a copy-URL fallback.** Custom schemes fail silently when the app isn't installed — nothing happens, and the user concludes the product is broken.

### Known limits

| Limit | Impact |
|---|---|
| Spotify unsupported | Accepted. Monitor in Gate A. |
| Variable-speed playback | Many apps default to 1.2×. Silently breaks the Timing element. Undetectable. |
| No revocation of downloaded files | Once on the device, permanent. |
| Poll lag (hourly→daily) | "Generate and hear in 30s" is not supported. |

---

## 7. Privacy & compliance

Privacy is the positioning, so the honest accounting matters.

### What RSS costs us

- Plaintext MP3 at a fetchable URL
- Episode titles rendered in an app we don't control
- **The feed token is stored on third-party sync servers.** Overcast syncs feed URLs across a user's devices — meaning Overcast's infrastructure holds a working credential to our users' audio. Same for Pocket Casts. We never contracted with them.

This is the trade for zero-build delivery. It should be stated plainly in the privacy copy rather than papered over.

### Mitigations, in order of effect

1. **Don't retain script text server-side.** Generate → synthesise → write MP3 → discard. Nothing to breach.
2. **Neutral episode titles.** (Section 4)
3. **Truncate IPs in access logs**, or don't log.
4. **30-day auto-delete** on MP3s; items drop from the feed. TTL is retention hygiene, not access control.

### What TTL does not do

It never protects the downloaded copy. Reframe as "how long do we hold this," never "how long can they reach it." Single-use links are also unreliable — one download is 1–10 HTTP requests (HEAD, ranged GETs, retries), so a per-request counter burns the link mid-download.

### German specifics

- **Feed URL is personal data** under GDPR — a persistent unique identifier tied to one person, regardless of whether it contains a name. Needs a retention period and legal basis in the Verzeichnis von Verarbeitungstätigkeiten (records of processing activities).
- **Double opt-in on email capture** — confirmed subscription, timestamp, IP retained as proof of consent. Standard German practice under UWG. Cheap now, painful to retrofit.
- **US TTS/LLM providers** add a transfer question. Fine, but needs the paperwork. Local Phase 2 removes it for TTS entirely.
- **§309 Nr. 7 BGB** voids AGB clauses excluding liability for injury to life, body, or health. User approval of a script does not transfer that. Disclaimers set expectations; they don't move liability.

---

## 8. Measurement

Four server-side events. No client instrumentation.

| Event | Signal quality |
|---|---|
| Feed URL generated | Weak — trivially inflated, our own clicks count |
| First enclosure GET | Moderate — confirms handoff worked |
| **Repeat feed polls over weeks** | **Strong — the best number available** |
| Edit/generate click → email | Moderate — fake-door, discount heavily |

### The one to misread

**Enclosure GETs are not intent.** Most apps auto-download on poll with no human involved. A download proves the plumbing worked, nothing more. Do not build a conversion story on it.

### The one to undervalue

**Poll cadence is free retention data.** Subscribed apps hit the feed on a schedule. When someone unsubscribes or deletes the app, polls stop. Zero instrumentation yields: feeds still live at day 7/30, decay curve by cohort, rough churn timing.

### The qualitative gate

On "customise" intent, capture email **plus one free-text field**: *what would you change?*

Ten answers there beat a hundred clicks, because they separate:

- **Different moments** → expand the library. Cheap.
- **Different voice/phrasing** → needs the local model. Expensive.

That distinction alone determines whether Phase 2 gets built.

### Sample size

Below ~30 subscribers these ratios are noise. Treat the first cohort as qualitative and talk to people directly. The funnel becomes a funnel north of 100.

---

## 9. Build sequence

### Stage 0 — Content audit *(days)*

Run existing Eardium scripts through Kokoro. Scripts written for on-screen reading often carry structure that doesn't survive TTS — headers, parentheticals, bullet fragments. Fix before assuming the library is ready.

### Stage 1 — Library + feed *(1–2 weeks)*

- 2–3 complete race packs, SOTA-generated, human-reviewed
- Static feed generation
- Handoff page with QR + deep links + copy fallback
- Landing page with "customise this" waitlist button

**Ship here. Everything after is gated.**

### Stage 2 — Desktop harness *(gated on Gate A)*

- Slot editor
- Remote generation
- `<audio>` preview
- Approve → append to feed

### Stage 3 — Local pipeline *(gated on Gate B)*

- Qwen3.5-2B in-browser
- Kokoro client-side
- Per-slot regeneration
- Progressive rendering — show each episode as it completes; Kokoro's streaming API allows playing episode 1 while 4 synthesises

---

## 10. Decision gates

| Gate | Test | Threshold |
|---|---|---|
| **A — Delivery works** | 30 subscribers; feeds still polling at day 30 | >40% retained → proceed |
| **B — Personalisation wanted** | Edit-click → email conversion; free-text answers | Majority want *phrasing*, not just *more moments* |
| **C — Local quality sufficient** | 20 realistic scenarios; regenerations until keepable | ≤2 avg → local. 3–4 → tolerable. 5+ → remote only. |

Gate C is a one-afternoon test and settles empirically what is otherwise an argument. Prior estimate based on early Gemma 3 1B output: ~2.

---

## 11. Open risks

| Risk | Severity | Note |
|---|---|---|
| Spotify share of target users | **High** | If >60% of Australian runners use Spotify, the handoff dead-ends. Poll first ten testers before building the handoff layer. |
| Nobody edits | Medium | Then the local model is a minority feature. Gate B exists for this. |
| Variable-speed playback | Medium | Undetectable, unfixable over RSS. Timing element degrades silently. |
| 1.5 GB download abandonment | Medium | Opt-in framing mitigates; measure abandonment at Stage 3. |
| Third-party token storage | Low–Medium | Overcast/Pocket Casts hold feed credentials. Disclose plainly. |
| Model architecture support lag | Low | Verify ONNX/WebGPU exports exist before committing to any model. |

---

## 12. One-paragraph summary

Ship a desktop web surface with 2–3 pre-built PETTLEP race packs, delivered to athletes' existing podcast apps via per-user private RSS. No install, no App Store review, no client build — the phone already has a player. Measure delivery success through feed poll retention and personalisation demand through a fake-door email capture with one free-text question. Only build the client-side generation pipeline (Qwen3.5-2B + Kokoro, ~1.5 GB, opt-in) if athletes say they want different *phrasing* rather than simply more *moments*. Privacy is architectural rather than promissory: the server never holds script text, never runs TTS, and retains nothing beyond truncated counters — which is also why the system prompt can be published openly.
