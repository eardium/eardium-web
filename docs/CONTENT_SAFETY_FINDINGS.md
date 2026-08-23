# Content Safety Findings — Catalog (46 candidates → 37 shipped)

Reviewed 2026-08-15 and tightened 2026-08-16 against `docs/CONTENT_SAFETY_REVIEW.md`.
All 46 candidate entries covered: 10 ids in the findings table below, 36 clean.

Severity counts at review: 1 HIGH · 8 MEDIUM · 6 LOW.

## Resolution — applied 2026-08-21

**Every entry with a flagged passage in its script was excluded from the shipped
catalog rather than rewritten.** Rewriting would have required re-synthesising
ElevenLabs audio and whisper timestamp sidecars for nine sessions; excluding
resolves the gate immediately and carries no risk of a rewrite drifting back
toward the flagged framing.

- **9 entries removed** from `src/shared/content/catalog/*.ts` and from
  `supabase/functions/_shared/catalog-manifest.json`: `catalog-running-wall-calm-001`,
  `catalog-running-kick-lfg-005`, `catalog-running-comeback-calm-006`,
  `catalog-gym-comeback-calm-008`, `catalog-exams-nightbefore-calm-006`,
  `catalog-exams-finalpush-energetic-007`, `catalog-foundations-how-calm-001`,
  `catalog-foundations-first-calm-002`, `catalog-foundations-practice-calm-003`.
- **1 entry kept with a metadata-only fix**: `catalog-exams-general-calm-000`. Its
  sole finding was the R5 scenario string, which is web UI text and never reaches
  audio or the RSS feed. Scenario now reads "Settling in at the desk — steady
  breath, clear head". The script itself was clean.
- **Catalog: 46 → 37.** The surviving manifest byte sizes are untouched and still
  true; no audio was re-synthesised, so no audio spot-check is outstanding.
- **Foundations is now empty** (all three of its entries were R4 claim findings).
  The category still renders its coming-soon placeholder. Replacement foundations
  content is a content-production task, not a release blocker.
- `tests/catalog.test.ts` asserts the 37-entry count *and* that none of the nine
  excluded ids can reappear in the catalog or the manifest without a fresh review.

The table below is retained as the review record. The `suggested rewrite` column
documents what a rewrite *would* have said — it is not shipped copy, and any
future attempt to restore one of these sessions needs a new review pass plus
fresh audio.

## Findings

| catalog_id | rule | severity | exact passage (trimmed) | disposition applied | suggested rewrite (not shipped) |
|---|---|---|---|---|---|
| `catalog-running-wall-calm-001` | R2 | **HIGH** | "You've trained past this sensation in long runs and tempo blocks, and you know the difference between pain that signals damage and discomfort that simply signals effort. This is effort." | **excluded** (whole entry) | "…you know the difference between pain that signals damage and discomfort that signals effort — you check in with your body, and if what you find is the effort you've trained for, you continue." |
| `catalog-running-wall-calm-001` | R1 | MEDIUM | "Your mind offers a story — that this is too much, that the pace needs to drop, that the body has limits. You hear the story. You don't have to believe it." | **excluded** (whole entry) | "Your mind offers a story — that you can't hold this. You hear the story. You don't have to believe it — and you stay honest with your body as you go." |
| `catalog-running-wall-calm-001` | R1 | LOW | "The legs are heavy. That's a fact. … You allow the weight to be there, and you run through it anyway" | **excluded** (whole entry) | "The legs are heavy. That's a fact. You check in without denying or dramatizing it. If it feels like the familiar fatigue you've trained for, you keep the turnover…" |
| `catalog-running-kick-lfg-005` | R1/R2 | MEDIUM | "The burn is real. Lactic acid, quads screaming, lungs at capacity. You know this feeling — you've trained for exactly this. Not to avoid it. To run through it." | **excluded** (whole entry) | "The effort is intense — quads working hard, breath near its limit. You check in: if this is the familiar finish effort you've trained for, stay tall and commit to the line. If something feels wrong, respond." |
| `catalog-running-comeback-calm-006` | R2 | LOW | "The legs begin to feel the distance the way they always do at this point in a long race. Not a breakdown — just the weight of miles." | **excluded** (whole entry) | "The legs begin to feel the distance. You register what you feel without deciding what it means, and adjust or continue according to the signal." |
| `catalog-gym-comeback-calm-008` | R5 | MEDIUM | title: "First Day Back After Injury"; scenario: "First day back after injury — trusting the body again" | **excluded** (whole entry) | Title: "First Day Back"; scenario: "Returning to training — trusting the body again". |
| `catalog-gym-comeback-calm-008` | R3/R4 | LOW | "Time away changes nothing that matters. The body heals, and then you return" | **excluded** (whole entry) | "Time away changes things, and the return can be gradual. When recovery and your plan allow, you rebuild — one rep, then another." |
| `catalog-exams-general-calm-000` | R5 | MEDIUM | scenario: "Sitting down, letting worry settle — your mind knows more than your anxiety" | **kept, metadata fixed** | Scenario: "Settling in at the desk — steady breath, clear head". |
| `catalog-exams-finalpush-energetic-007` | R1 | LOW | "There's a low-level energy in your chest — not anxiety, just activation." | **excluded** (whole entry) | "There's a low-level energy in your chest — perhaps anxiety, activation, or both. You notice it without needing to relabel it." |
| `catalog-exams-nightbefore-calm-006` | R4 | LOW | "More reading doesn't fix anxiety at 10 p.m. What fixes it is sleep, and tomorrow morning, and showing up." | **excluded** (whole entry) | "More reading may not be useful at 10 p.m. Rest, tomorrow morning, and showing up can support what you've already prepared." |
| `catalog-foundations-how-calm-001` | R4 | MEDIUM | "The motor cortex fires. Muscles receive faint electrical signals. Your body begins to learn, without moving. … The more real it feels, the more your brain encodes it as genuine experience. … Your nervous system does the rest." | **excluded** (whole entry) | "Mental rehearsal can engage some of the same planning and movement-related networks as physical practice. Repetition can support familiarity and preparation, while your attention and judgment remain part of the practice." |
| `catalog-foundations-how-calm-001` | R4 | MEDIUM | "Your brain doesn't fully distinguish between a moment vividly rehearsed and one you've actually lived." | **excluded** (whole entry) | "Imagined and physical practice can overlap in limited, task-dependent ways; imagining a moment is not the same as having performed it." |
| `catalog-foundations-first-calm-002` | R4 | MEDIUM | "You walk through it, sensation by sensation, and your brain records it as experience." | **excluded** (whole entry) | "You walk through it, sensation by sensation, and build familiarity with the sequence." |
| `catalog-foundations-practice-calm-003` | R4 | MEDIUM | "Twice a day is ideal … even a few sessions a week will build the neural pathways. … Three minutes, reliably, is worth more than twenty minutes once." | **excluded** (whole entry) | "There is no single ideal schedule. Choose a short, repeatable cadence that fits your preparation; consistency may help the sequence become more familiar." |
| `catalog-foundations-practice-calm-003` | R4 | LOW | "Over weeks … The moments you've rehearsed start to feel less like imagination and more like memory. You've been there before. Your body knows the way." | **excluded** (whole entry) | "With repetition, the moment may begin to feel more familiar — not a memory of having done it, but a sequence you've considered before." |

## Assessment notes

- **The HIGH was the release blocker** — resolved by exclusion. `catalog-running-wall-calm-001` decides *for*
  the listener that a mid-race sensation is effort ("This is effort."), in a script
  plausibly playing during an actual run (background playback is a product feature),
  and it is free-tier + the flagship marketing demo — maximum reach. The MEDIUM
  "story" passage two paragraphs earlier compounds the same failure mode (dismissing
  "the pace needs to drop, the body has limits" as a disbelievable story) and should
  be rewritten in the same pass.
- **Rewrites require re-synthesis** — which is why none were taken. Every
  script-text change means new ElevenLabs audio + a new whisper timestamps
  sidecar, not just a `.ts` edit. Only `catalog-exams-general-calm-000` was
  fixable without touching audio (R5 scenario string, web UI only), so it is the
  single entry kept.
- **The injury script was mostly a positive model, but not fully clean.**
  `catalog-gym-comeback-calm-008` framed lighter weight as "a decision made with
  intelligence," modelled listening to the body, and emphasised patience. But its
  title exposed injury history (R5) and "the body heals, and then you return"
  overgeneralised recovery timing (R3/R4) — a script-text finding, so it was
  excluded with the rest. It is the strongest candidate for a reviewed rewrite if
  return-to-training content is reinstated later.
- Performance-domain content is largely careful: nerves are usually acknowledged,
  judgment stays with the user, and "I don't know" is modeled. Tennis, interviews,
  and speaking have zero findings; the two Exams passages above need narrow rewrites.

## Clean list (36 — no findings; all shipped)

These, plus the metadata-fixed `catalog-exams-general-calm-000`, are the 37 shipped entries.

- **foundations (0/3):** —
- **gym (8/9):** general-calm-000, squat-calm-001, squat-energetic-002, deadlift-energetic-003, deadlift-lfg-004, bench-calm-005, competition-energetic-006, olympic-calm-007
- **running (4/7):** general-calm-000, racestart-energetic-002, morning-calm-003, hills-energetic-004
- **tennis (6/6):** general-calm-000, serve-calm-001, return-energetic-002, comeback-energetic-003, breakpoint-calm-004, tiebreak-energetic-005
- **exams (5/8):** morning-calm-001, opening-calm-002, hardquestion-calm-003, essay-energetic-004, oral-calm-005 — plus general-calm-000 shipped after its metadata fix (6 shipped)
- **interviews (6/6):** general-calm-000, walkin-calm-001, tellme-energetic-002, hardest-calm-003, technical-calm-004, postinterview-calm-005
- **speaking (7/7):** general-calm-000, conference-calm-001, meeting-energetic-002, qa-calm-003, board-calm-004, allhands-energetic-005, wedding-calm-006

(Ids abbreviated to the stem after `catalog-<category>-`.)

## Release-gate status

**BLOCKED** until: (1) the HIGH and companion Wall findings are dispositioned;
(2) the `running-kick-lfg-005` and other sensation-relabeling rewrites are approved
or declined; (3) the two R5 metadata rewrites are approved or declined; and (4)
the Foundations claims are rewritten or explicitly approved. Every script-text
rewrite requires re-synthesis, new timestamps, and an audio spot-check before live
staging. Clean entries and unchanged passages in flagged entries remain proposed
approve-as-is; a human records the final decision.
