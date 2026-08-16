# Content Safety Review — Brief

Every script, title, and scenario that ships in the catalog (app or web) is reviewed
against this brief before its distribution surface is shared with users or testers.
The review produces findings with proposed dispositions; **a human makes every final
disposition**. Source files are never silently rewritten by a review pass.

## Rules

- **R1 — Pain signals.** Flag instructions to ignore, suppress, relabel, or push
  through pain or unusual physical signals.
- **R2 — Deciding for the user.** Flag language that asserts a sensation is harmless,
  "only effort," or safe to continue through. A script may acknowledge discomfort
  honestly and model choosing to continue; it may not decide on the user's behalf
  that a signal is safe.
- **R3 — Injury / return-to-sport.** Never override a clinician or recovery plan;
  preserve the user's option to stop, slow, or reassess.
- **R4 — Claims.** Flag medical, treatment, injury-prevention, or
  guaranteed-performance claims.
- **R5 — Metadata privacy.** Titles and scenarios render on lock screens and in
  podcast-app sync payloads. Functional is fine ("Mile 20 · Cadence"); diagnostic or
  health-revealing is not ("First Day Back After Injury").

## Calibration

Encouraging steady effort, form cues, holding pace or cadence, acknowledging
discomfort honestly, and choosing to continue are all fine — this is a sports
visualization product for adults. The line is crossed when a script (a) targets
pain or unusual signals specifically, (b) closes the damage-vs-effort question on
the user's behalf, or (c) makes medical or guarantee claims. Precision over volume;
a mostly clean catalog is a valid outcome.

## Output format

A findings table — `catalog_id` · rule · severity (HIGH / MEDIUM / LOW) · exact
quoted passage · proposed disposition (`approve` / `rewrite` / `exclude`) · suggested
rewrite if applicable — plus a per-category clean list so coverage is provable
(every shipped id appears exactly once across the two).

## Release gate

- Every included item has an explicit human-approved disposition.
- Zero unresolved HIGH findings.
- After any text rewrite: re-synthesize the audio **and** its whisper timestamps
  sidecar (audio is pre-baked in Storage — editing the `.ts` text alone desyncs the
  product), then spot-check the rendered audio for omissions, mangled pauses, or
  prosody that changes meaning.

Current findings: `docs/CONTENT_SAFETY_FINDINGS.md`.
