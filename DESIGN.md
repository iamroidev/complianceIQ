# ComplianceIQ — DESIGN.md v2 (binding spec for the coding agent)

Read fully before writing UI code. Where this conflicts with your defaults, this file wins.

## 0. What this product feels like

**A well-run audit firm's case briefing, made interactive.** Calm, spacious, readable at a glance by a
tired compliance officer at 4pm. Closest references: Mercury and Stripe Dashboard (clarity, whitespace),
Notion (plain language), a Big-4 audit report (hierarchy, restraint), Linear (keyboard speed, only in the queue).

It is NOT: a terminal, cockpit, console, command center, mission control, hacker tool, SOC wall display,
or "telemetry dashboard". Those words are banned in UI copy, component names, class names, and comments.

The one idea: **every decision can be proven.** The UI shows where each number came from, which rule fired,
which policy applies, and that the record has not been altered. Say all of that in plain English.

## 1. Plain-language rules (highest priority)

1. A first-year compliance analyst must understand every label with no training. If a label needs a glossary, rewrite it.
2. Sentence case everywhere. No ALL-CAPS labels, no `SEV-1` style codes, no snake_case or event-type enums shown to users.
3. Labels are 1–4 words. Descriptions are one plain sentence. No acronyms unless the person already uses them daily (AML, SAR, HIPAA, SOC 2 are fine; expand on first use per page).
4. Every case starts with **one plain sentence saying what happened**, before any table:
   "Kofi Adjei-Boateng made two cash deposits just under the USD 10,000 reporting limit within 48 hours."
5. Never explain the technology in the product UI. No "deterministic AST evaluator", "SHA-256 chained", "RAG". Those belong only on the architecture page.
6. Buttons are verbs the officer would say aloud: "File report", "Dismiss alert", "Escalate to manager".
7. Numbers get units and context: "USD 9,800.00", "2 of 3 deposits", "34 minutes left", not bare values.

### Vocabulary map (use the right column in the UI)

| Never show | Show instead |
|---|---|
| Cockpit / console / terminal / command center | Workspace |
| Triage queue | Alerts |
| SEV-1 … SEV-4 | Critical · High · Medium · Low |
| Chain OK / Chain broken | Records verified · Records altered |
| Ledger / block / hash chain | Audit record · Entry · Tamper check |
| Provenance | Source |
| Inject anomaly | Run a scenario |
| Commit receipt / OFFICER_REVIEWED | Saved to audit record |
| Rule AST / evaluator | How this alert was triggered |
| Risk score 87/100 shown alone | "High risk" with the score beside it, and the top 3 reasons |
| RAG citation | Policy reference |
| Payload / event stream | Activity |

## 2. BANNED visuals

- Dense walls of monospaced text. **Mono font is allowed only for hashes and record IDs (<10% of visible text).** Amounts, dates and tables use the normal sans with tabular figures.
- Terminal green, neon, matrix aesthetics, scanline or glow effects, ASCII boxes, blinking cursors, fake log scrolling.
- Glassmorphism, neon glow, floating gradient blobs, violet/indigo, AI sparkle icons, cards with large soft drop shadows. (Artwork follows the illustration rules in §16, which allow flat tonal fills, grain and hard offset shadows inside illustrations only.)
- KPI tile grids (big number + sparkline + arrow), donut charts, equal-size card grids, icon-in-circle feature grids.
- Emoji, stock or AI-generated illustrations, clip-art, 3D blobs, generic shield-and-padlock imagery, hooded hackers, people-with-laptops scenes, fake logos/testimonials, "Welcome back" greetings, "Supercharge/seamless/unlock/powerful".
- Pills for everything. Status is shown with a small dot plus a word, not a filled pill.
- Placeholder data ("John Doe", "Lorem", "Acme"). Use §9 seed data.

## 3. Tokens (`src/styles/tokens.css`; no raw hex elsewhere)

Product default is **light**; dark is an optional toggle.

**Theme (owner directive, 60/30/10 — five palettes, chosen on `/styleguide` and remembered per device; `?theme=` overrides):**

| Palette | Canvas (60%) | Structure (30%) | Accent (10%) |
|---|---|---|---|
| **Mist blue (default)** | `#F2F5F9` cool grey-blue | `#12263F` deep navy | `#D64045` signal red |
| Butter | `#FEFAD4` butter yellow | `#002B5B` marine blue | `#E63946` bright red |
| Warm paper | `#FAF9F6` off-white | `#1F3A5F` navy (charcoal type) | `#C23B3B` muted red |
| Sand | `#F6F1E9` warm sand | `#4A342A` espresso | `#C0453B` terracotta |
| Dark | `#101214` near-black | `#0C1A2E` ink nav (`#8FB1E3` accent) | `#E63946` bright red |

Same rule in every palette: one canvas colour, one structure colour for type and navigation, one accent used sparingly. Full alternates live as `[data-theme]` blocks in `tokens.css`.

```css
:root {
  /* ── Mist blue (default) ── */
  /* 60% canvas */
  --bg:        #F2F5F9;   /* cool grey-blue — primary background */
  --surface:   #FFFFFF;   /* cards, tables, drawers (white in every light palette) */
  --surface-2: #E9EEF5;   /* panels, hover rows, sunken areas */

  /* 30% structure */
  --text:      #12263F;   /* deep navy — all typography */
  --text-2:    #3A4F68;   /* secondary text */
  --text-3:    #5C7086;   /* labels, metadata (AA on --bg) */
  --line:      rgba(18, 38, 63, 0.14); /* data grid lines */
  --accent:    #1D4E89;   /* primary buttons, links, selection */
  --nav-bg:    #12263F;   /* sidebar and top bar */
  --nav-text:  #EAF1F8;   /* nav labels */
  --nav-text-2:#93A8C0;   /* inactive nav labels */

  /* 10% accent (used sparingly) */
  --cta:       #D64045;   /* THE one primary call-to-action per view + notification badges */
  --critical:  #D22F35;   /* Critical severity and "Records altered" only (darkened for ≥ 4.5:1, §30.1 gate) */
  --high:      #9F610E;
  --medium:    #3D6FB5;
  --low:       #63676D;

  --verified:  #0F6B5E;   /* ONLY for "verified / unaltered / proven" */
  --verified-bg:#E2F0EC;

  /* solid-button text */
  --cta-solid: #D13D42;   /* solid red buttons/badges with white text — AA ≥ 4.5:1
                              (--cta at #D64045 measures 4.49:1, so white text uses this);
                              --cta stays the brand red for dots and marks */
  --on-cta:    #FFFFFF;   /* light palettes; white on --cta-solid */
  --on-accent: #FFFFFF;   /* dark palette overrides with dark ink (#0C1A2E) */
}
[data-theme="dark"] {
  --bg:#101214; --surface:#16191C; --surface-2:#1C2024;
  --text:#ECEAE5; --text-2:#B0B3B8; --text-3:#9BA0A6;
  --line:#2A2E33; --verified:#56C9B0; --verified-bg:#12302B;
  --accent:#8FB1E3; --nav-bg:#0C1A2E; --nav-text:#ECEAE5; --nav-text-2:#8A93A0;
  --cta:#E63946; --critical:#E63946; --high:#C77A12; --medium:#3D6FB5; --low:#9BA0A6;
}
```

`src/styles/tokens.css` is the living source of truth (five selectable palettes: mist, butter, paper, sand, dark — each obeying the 60/30/10 rule). The block above shows the default mist palette; every palette is gated by `scripts/check-contrast.ts` (§30.1) — **204/204 pairs pass**.

**Accent usage rule:** the palette's accent red appears only on (a) the single primary call-to-action of a view
("File report", "Submit SAR", "Generate audit pack"), (b) notification badges, (c) Critical severity,
(d) "Records altered". Never decorative, never on secondary buttons, never more than one red CTA per view.
Everything else primary uses `--accent` (structure colour). Severity = colored dot + word.
Green (`--verified`) means verified/unaltered/proven only.
Solid red surfaces carrying white text (primary buttons, badges) use `--cta-solid`, a hair darker than `--cta` so text clears WCAG AA (≥ 4.5:1); a unit test enforces this for every palette.

## 4. Type and density

- Landing headlines: **Newsreader** (serif) 400, sizes 56/40/28. Everything else: **Geist Sans**.
- Product base **16px / 24px, rows 52px** (owner-approved uplift from the original 14px, M12 review: the app must not read as "zoomed out"). Section gaps 32–48px. Whitespace is a feature.
- Page titles 22px/600. Labels 13px/500 in `--text-3` **sentence case** (no uppercase tracking).
- Max line length 68ch for prose. One primary action per view, styled as the only solid button.
- Hashes: Geist Mono 12.5px, shortened `9f3a…c21e`, click to copy.

## 5. Layout

- Product: 248px expanded navigation with labels, top bar 64px (`--nav-bg`), content area **at full width (no centred max-width box; inner prose keeps 68ch caps)**, optional 360px right panel.
- Top bar contains: page title, domain filter (plain tabs), search, and a **"Records verified" status** (small green dot, plain text, "Check now" link). Not a bottom status strip.
- Hierarchy rule for every screen: **(1) headline sentence, (2) one visual, (3) supporting detail.** If a screen opens with a table, redo it.
- Each screen has exactly one visual anchor: a timeline, a threshold chart, a flow diagram. Text-only screens are rejected.

## 6. Signature elements (built first, as isolated components)

1. **Source links.** Every derived number has a subtle dotted underline. Hover: "Source: 2 deposits, Rule AML-001". Click: highlights the underlying activity in the side panel.
2. **Policy reference notes.** In the case view, the report draft sits in a readable column. Policy references appear in the margin as short notes: clause name, one-line plain summary, and the matching sentence highlighted. Title: "Why this applies".
3. **Audit record timeline.** A simple vertical timeline: each entry reads like a sentence ("R. Mensah filed this report · 14:05"), with a small "Verified" tick. A "Show technical details" toggle reveals hashes. Default is OFF.
4. **Saved confirmation.** After an action, show an inline row: "Saved to audit record · 14:05 · Entry 1285". Not a toast.
5. **AI-assisted marking.** AI-drafted paragraphs get a thin green-grey left rule and a small "Drafted by AI, review before filing" label. It disappears once the officer edits the paragraph.
6. **Tamper check.** A button "Run tamper check" shows steady progress, then a plain result: "All 1,284 entries verified" or "Entry 812 was altered. 472 later entries can no longer be trusted." A demo-only "Simulate tampering" lives in the demo panel.

## 7. Screens

**Alerts (list):** a clean table, 52px rows. Columns: severity (dot + word), what happened (short sentence), who, time left (e.g. "3h 20m left"), status. No codes in the main column; the rule ID is secondary grey text. Keyboard shortcuts exist but are hinted only on hover and in a "?" sheet.

**Case workbench:**
1. Headline sentence + severity + time left + assignee.
2. **Visual:** timeline of the activity with threshold band (e.g. deposits as marks against the USD 10,000 line).
3. Tabs, plain names: **Summary · Activity · How it was triggered · Policy · Report draft · History**.
4. "How it was triggered": three short rows: "What we looked for", "What we found", "Why that matters". Technical rule view behind a "Show rule details" link.
5. Sticky bottom bar: **File report**, **Dismiss alert** (asks for a reason from a plain list), **Escalate to manager**. Each confirms in one sentence what will be saved.

**Overview:** top: one sentence ("14 alerts need attention. 3 are due within 4 hours."). Then a simple table "Where attention is needed" by domain, with small inline bars. Click-through on every number. No KPI tiles.

**Audit record page:** the timeline from §6.3 plus "Run tamper check". Hash details collapsed by default.

**Rules and Policies:** two simple lists with search; rule detail shows plain description first, parameters second, "Try it on a sample" third.

**Reports:** list of exports with one line each; each export mentions "Includes proof the record is unaltered".

**Demo panel:** collapsible side drawer titled "Demo scenarios" (not a bottom dock of controls). Buttons: "Run scenario: structured deposits", etc. After running, it opens the new alert and walks through: activity, rule, policy, saved record, with a small caption at each step.

## 8. Landing page (light, spacious, editorial)

12-col grid, 1360px max (illustrations may bleed past it). Left-aligned. Section choreography, illustrations and motion are defined in §16–§19, which supersede this list where they differ.

1. **Header:** wordmark, 4 links, "Open live demo" (solid marine blue).
2. **Hero:** serif headline "Compliance decisions you can prove." One-sentence subhead in plain English: "Every alert shows what happened, which policy applies, and a record that can't be quietly changed." Right side: the real tamper-check component working on sample entries, with a "Try changing a record" button.
3. **Three plain statements** (not icon cards), each a short heading + one sentence: "See why every alert fired", "Cite the exact policy", "Keep a record nobody can quietly edit."
4. **How it works:** four horizontal steps with the real mini-component under each: Spot it, Explain it, Decide, Prove it.
5. **Five areas:** tabs (Anti-money laundering, Access and SOC 2, Healthcare privacy, Expense policy, Code security), each showing one real case summary exactly as in the product.
6. **Where AI is used:** one clear diagram: "Rules decide what to flag. AI only helps draft the report, and a person always signs off."
7. **Comparison:** honest table versus checklist tools and transaction-monitoring tools. Only claims the demo proves.
8. **Footer:** demo link, technical write-up. (The former "Final-year project…" credit was removed by owner decision: the product must present itself as a professional application.)

## 9. Seed data (realistic)

People: Kofi Adjei-Boateng, Ama Serwaa Owusu, R. Mensah (compliance officer), A. Owusu (developer).
Entities: Meridian Freight Ltd, svc-deploy-prod. Amounts: USD 9,800.00 and USD 9,400.00 (reporting limit USD 10,000).
Times: "Mar 14, 09:12" with full ISO timestamp on hover. Never round to look neat.

## 10. Process (mandatory)

1. Write `tokens.css` and a `/styleguide` page: type scale, table row, severity dot+word, source link, saved confirmation, AI-draft marking, verified status. Screenshot, then stop and wait for review.
2. Build the six signature elements in isolation.
3. Screens in order: shell → alerts list → case workbench → audit record → demo panel → overview → landing.
4. After each screen: Playwright screenshots at 1440x900 and 390x844; critique against §1, §2 and §11; fix before continuing.
5. Do not add features, cards, charts or copy that are not in this file.

## 11. Acceptance checklist (every screen)

- [ ] Opens with a plain sentence, then one visual, then detail.
- [ ] No banned words (cockpit, console, terminal, telemetry, payload, provenance, ledger spine, etc.) and no all-caps codes in visible copy.
- [ ] Mono text is under 10% of the screen. Rows are 52px with generous spacing.
- [ ] Every label passes the "first-year analyst understands it" test.
- [ ] Product UI: no drop shadows (except drawer and menus), radius ≤ 6px (2px controls, 6px containers), no gradients, no raw hex outside tokens.css. Illustrations follow §16.
- [ ] Green means verified only; red means the one primary CTA, a badge, Critical, or Records altered only.
- [ ] Empty, loading (skeleton rows) and error states exist.
- [ ] Keyboard operable, visible focus ring, AA contrast.
- [ ] If it could be a screenshot of a generic admin template or a hacker dashboard, redo it.

## 12. Precedence over the other plan files (IMPORTANT)

The master plan, teardown and implementation plan were written before this spec and use words that pull
agents back into a terminal look ("cockpit", "high-density", "deep slate/zinc", "monospaced everything",
"non-repudiation dashboard", "inject"). **For anything visual or any user-facing wording, this file wins.**
Those files still win for architecture, rules, data schemas and test requirements.

Rename before building (code, folders, comments, UI):

| In the plan files | Use instead |
|---|---|
| `src/components/cockpit/` | `src/components/workspace/` |
| "Interactive Cockpit" / "Event Simulator Cockpit" | "Demo scenarios" panel |
| "High-Density Cockpit" (Phase 5 goal) | "Clear, readable case workspace" |
| "Deep slate/zinc dark aesthetic" | Light default theme per §3, dark optional |
| "Monospaced tabular figures for amounts and timestamps" | Sans with tabular figures; mono only for hashes and IDs |
| "Non-Repudiation Dashboard" / "Verify Ledger Integrity" | "Audit record" page / "Run tamper check" |
| "Inject Smurfing Attack ($9.5k/48h)" | "Run scenario: structured deposits" |
| "Approve & File" | "File report" |
| "Triage queue", "severity badges" | "Alerts", severity dot + word |

### Honest claims (trust rule)

Never write "SEC 17a-4 compliant" or "FINRA compliant" anywhere in the UI or landing page. A hash chain gives
**tamper evidence**; it is not by itself regulatory compliance. Use: "Designed to support tamper-evident
record keeping." Same for "zero hallucination": say "Rules decide what gets flagged. AI never makes that call."
Do not name the AI vendor in the UI; say "AI-assisted draft".

## 13. Screens added for the master plan's emerging focus areas

These had no UI in the earlier sections. Same rules apply: one plain sentence, one visual, then detail.

**Connected sources** (nav label: "Sources")
- Headline: "4 sources are reporting. 1 needs attention."
- Visual: simple left-to-right flow, "Your systems → Local agent → ComplianceIQ", with a labelled boundary
  "Stays inside your network" around the first two. Under the agent: "Sends fingerprints of records, never the records themselves."
- Detail: table of sources (GitHub, identity provider, hospital records system, expense tool, local agent).
  Columns: name, what we watch (plain sentence), status dot + word ("Reporting", "Delayed", "Disconnected"), last check ("2 min ago").
- Everything here is a clearly labelled **demo connection**; do not imply real integrations exist.

**Automatic responses** (nav label: "Responses")
- Headline: "2 responses are on. Both are set to suggest only."
- List of responses; each row reads as a sentence: "If someone turns off two-step sign-in, suspend their access token."
  Control per row: segmented choice **Off · Suggest only · Automatic**. Default for every response: **Suggest only**.
- Switching to Automatic opens a confirmation stating plainly what will happen without a person approving it.
- In a case, a taken response appears in the timeline: "Access token for a.owusu suspended · Undo" with the entry saved to the audit record. Provide Undo wherever the action is reversible; say so when it is not.
- Visual anchor: for the selected response, a three-step strip "Trigger → Action → Recorded".

**AI data governance** (nav label: "Training readiness")
- Headline example: "Training run blocked: 3 columns still contain personal data."
- Visual: pipeline strip "Data → Personal data check → Consent check → Training", the failing gate marked, passing gates marked verified.
- Detail: checklist of controls with pass/blocked, the plain reason, and a "View policy reference" link (EU AI Act and internal policy notes use the same margin-note pattern as §6.2).
- Wording: "readiness" and "checks", never "compliant with the EU AI Act".

## 14. Replacement text for Phase 5 of the implementation plan

**Phase 5: Clear case workspace and demo scenarios.** Goal: a calm, readable interface that an examiner
understands without explanation, following DESIGN.md.
1. Build `tokens.css` and `/styleguide`; stop for review.
2. Build the six signature elements (§6) in isolation.
3. Build screens in the order in §10, then Sources, Responses and Training readiness (§13).
4. Build the Demo scenarios side panel with five scenarios (structured deposits, separation-of-duties breach,
   restricted patient record access, split expense receipt, leaked secret in code), plus play, pause, step.
   Running a scenario opens the new alert and walks through activity, rule, policy, saved record with a caption at each step.
5. Playwright screenshots at 1440x900 and 390x844 for every screen; verify against §11.

## 15. Additions for MASTER.md v0.2 (broader compliance scope)

Tiers: screens marked (T2) or (T3) are built only if the owner approves that tier. Same rules apply everywhere: one plain sentence, one visual, then detail.

### 15.1 Vocabulary additions

| Never show | Show instead |
|---|---|
| Evidence locker / locker | Evidence |
| Register | People and certifications · Vendors (name the actual thing) |
| Obligation extraction / NLP | "Found in your policy" |
| Coverage gap (jargon) | "No automated check" |
| State rule / event rule | Never shown |
| Check run | "Checks completed" |
| Auto-resolve | "Closed automatically" |
| Priority suggestion | Suggested order |

### 15.2 New and changed screens

**Policy coverage** (nav: "Policy coverage"; the headline feature for gap G1)
- Headline: "31 of 38 obligations are checked automatically. 7 have no check."
- Visual: one horizontal bar split into Checked · Partly checked · No automated check. Not a donut. Each segment filters the list below.
- List: obligation sentence, the exact quote from the policy (quoted, grey), status dot + word, rule name or "No automated check", last passed date.
- Suggestions for gaps appear under an "AI-assisted suggestions" section with the AI-draft marking from §6.5; never mixed into the confirmed list.

**Obligations** (upload and review)
- "Upload a policy" → shows "Found in your policy: 9 items" as a review list. Each item: the quote highlighted inside the policy text on the right (like §6.2 margin notes, mirrored), buttons **Confirm**, **Edit**, **Not an obligation**. Nothing counts until confirmed. Confirmed items show "Saved to audit record".

**People and certifications; Vendors**
- Plain tables with status dot + word: "Valid", "Expires in 12 days", "Expired 19 days ago". Row click opens the record with its history and any related alert.
- Visual anchor: a simple timeline strip per person or vendor showing when each item expires against today.

**Deadlines**
- Headline: "3 deadlines in the next 30 days. 1 is overdue."
- Visual: a month-by-month timeline with markers; overdue in the Critical colour with the word "Overdue".

**Evidence**
- Headline: "412 pieces of evidence. All verified." (or the failure sentence).
- Table: title, source, collected, Verified tick, linked alert or obligation. Hashes only under "Show technical details".
- Evidence is snapshots; label them "Snapshot taken when the alert was raised".

**Alerts: Suggested order** (gap G4)
- A toggle above the list: **Score order · Suggested order (AI-assisted)**. In Suggested order, rows that moved show a small "moved up" or "moved down" word and a one-line "Why". A note: "Suggested order is advice. Risk scores are calculated by rules and are not changed."

**Reports: Audit pack**
- A short form: period, areas, then **Generate audit pack**. Result card: file names, "Records verified at generation", the head hash under technical details, and an "Open verification steps" link explaining how an auditor can re-check.
- Include a plain "How this report was produced" panel stating what is automated and where AI is used.

**Demo panel additions**
- **Move date forward** control: "Move date forward by 7 / 30 / 90 days" with the new date shown, followed by a caption of what changed ("2 certifications expired, 1 deadline missed").
- Scenarios listed by plain titles: "Structured deposits", "Payment without approver", "Separation of duties breach", "Restricted record access", "Leaked secret", "Expired certification", "Missed deadline", "Vendor document lapsed".

**Case view addition for state-based alerts**
- Visual is a **date timeline** (issued → expires → today) instead of the deposits chart. Tab "How it was triggered" reads: What we looked for ("A valid First Aid certificate for this role"), What we found ("Expired 12 Mar 2026"), Why that matters (policy note).
- When closed automatically, the History tab shows: "Closed automatically · renewal attached · 14:05" with the evidence item.

**(T2) Questionnaires:** upload, confirm the detected question/answer columns in a plain preview table, review answers one by one. Each answer shows "Based on:" with the policy quote and evidence items with Verified ticks; unanswerable ones read "No evidence found. Needs your answer." Download filled file.
**(T2) CI gate:** headline "Last deploy check: blocked, 1 secret found in a commit." Timeline of checks with Blocked/Passed and fix entries; link to the evidence.
**(T3) Sources and Training readiness:** as in §13.

### 15.3 Landing page copy updates
- Hero subhead: "ComplianceIQ checks your company against its own policies and the regulations it must follow, explains every finding, and keeps a record nobody can quietly change."
- Three statements: "Turn your policies into checks" · "See why every alert fired, with the exact policy wording" · "Hand auditors a report they can verify themselves".
- Section "Five areas" becomes "What it checks": Certifications and training, Payments and thresholds, Regulatory deadlines, Data access, Vendors, Code and secrets.

---

# PART II — CRAFT LAYER (illustration, motion, HCI). Supersedes §2 and §8 where they conflict.

Goal: the visual and interaction quality of an Awwwards-recognised site, **without** losing the plain-language, readable, trustworthy character of §0–§1. Craft serves comprehension. If an effect does not explain something, speed something up, or build trust, remove it.

Self-review rubric (score each 1–10 in `PROGRESS.md` before every design GATE; below 8 means redo): **Design** (hierarchy, type, composition, rhythm), **Usability** (tasks are obvious, errors prevented, accessible), **Creativity** (the four signature moments below land), **Content** (plain, precise, no jargon).

## 16. Art direction and illustration system: "Paper and thread"

**Idea.** Compliance is paperwork made provable. The visual language is **paper, thread and seals**: layered paper documents, a teal thread that connects a fact to its policy to its proof, wax-seal style verification marks, and a chain of paper strips for the audit record. Friendly and crafted like Vanta's marketing illustration, but with our own metaphor and no generic security clichés.

**Four signature moments** (used consistently across landing and product; each has one component and one motion spec in §17):
1. **The thread:** a teal line draws from a figure to its policy clause to its proof. Used in Source links, Policy notes, hero and "How it works".
2. **The seal:** a circular seal stamps when something is saved to the audit record.
3. **The tear:** when a record is tampered, one paper link tears and every later link turns Critical-red. Used in the Tamper check and hero.
4. **The time slide:** moving the date forward slides certificates and deadlines along their strips until they run out and flip to "Expired".

**Illustration tokens (add to `tokens.css`; artwork may only use these):**
```css
:root{
  --ill-ink:#002B5B;  --ill-paper:#FFFDF8;  --ill-cream:#F2EBDD;
  --ill-teal:#2E9E8A; --ill-ochre:#E2B04A; --ill-terracotta:#D4694E;
  --ill-sage:#9FBFA8; --ill-sky:#B7CDE6;
  --ill-stroke:2px;   --ill-shadow:4px 4px 0 rgba(0,43,91,.14);
}
```
Illustrations always sit on a paper or cream tile, in both themes, so they never need recolouring for dark mode.

**Style rules:**
- Flat fills from the tokens above, uniform **2px ink outline**, rounded joins, 6px corner radius on paper shapes.
- Depth only by a hard offset shadow (`--ill-shadow`) and overlap. A very light paper grain (SVG `feTurbulence`, ≤ 6% opacity) is allowed on large illustrations. Tonal two-stop washes within one hue (≤ 10% lightness change) are allowed. No other gradients.
- People, if used, are abstract: round head, no facial features, simple torso. Prefer none.
- Teal is reserved for the thread, seals and "verified" things. Terracotta is reserved for torn, altered, expired and critical things. Ochre, sage and sky are neutral accents. Same colour meanings as the product UI.
- **Banned:** padlocks, shields with ticks, glowing circuits, isometric server racks, hooded hackers, stock people with laptops, brain/robot AI imagery, floating blobs.

**Illustration kit (build first as React SVG components in `src/components/illustration/kit/`, each with named layers via `id`s so they can be animated):**
`Paper` (with optional folded corner, lines, highlight), `PaperStack`, `Certificate`, `Calendar`, `Receipt`, `Invoice`, `CoinStack`, `Seal` (verified and broken variants), `Thread` (cubic path with draw-on prop), `ChainLink` (intact, torn), `Magnifier`, `Stamp`, `Key`, `CodeCard` (curly braces, a key leaking), `Handshake` is NOT allowed (cliché); use `VendorBox` (a labelled parcel) instead.
Scenes are **composed from kit parts on an 8px grid**, never freehand paths. Every scene has a spec: canvas size, parts, z-order, which layers animate.

**Scene library (all required, built from the kit):**
- `HeroCaseFile` (900×640): an open case file with three pinned sheets (alert, policy, evidence); a teal thread runs from the highlighted amount on the evidence sheet, through a policy clause, to a seal; below, a chain of six paper links (the real Tamper check logic drives it).
- `StepDetect`, `StepExplain`, `StepDecide`, `StepProve` (480×360): the four "How it works" vignettes, sharing one composition so they can morph.
- Six spot illustrations (160×160) for "What it checks": `SpotCertificate`, `SpotPayment`, `SpotDeadline`, `SpotAccess`, `SpotVendor`, `SpotCode`.
- `PolicyToChecks` (scroll scene): a policy sheet with one sentence highlighted; a thread pulls it into a check card with a toggle.
- `AuditPackFan`: a fanned stack of report pages with a seal on the top page.
- Empty states (240×160): `EmptyAlerts` ("Nothing needs attention" with a sealed folder), `EmptyEvidence`, `EmptyObligations`, `EmptySearch`, `EmptyCoverageGap` (not an empty state: an unconnected thread end), `Error` (a dropped paper link), `NotFound`.
- Moments (96×96): `SealedConfirmation`, `TamperDetected`, `RecordsVerified`.

**Where illustration appears in the product (restrained):** empty states, first-run guidance, success and error moments, and one 96px spot on top of Overview. Never in tables, never in the Case workbench body.

**Illustration review loop:** after drawing each scene, render at 2× and 1×, critique against the rules above, and fix. If a scene still looks amateur after two passes, stop and ask the owner, who may redraw it in Figma and hand over SVG. Do not ship a weak scene.

## 17. Motion system

**Principles:** motion explains cause and effect, confirms actions, guides attention, and never delays work. Product is quick and quiet; landing is expressive but never blocks reading.

**Tokens (in `tokens.css`):**
```css
:root{
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* small overshoot, seals and toggles only */
  --dur-instant: 90ms;  --dur-fast: 160ms;  --dur-base: 240ms;  --dur-slow: 420ms;  --dur-scene: 800ms;
}
```
Libraries: `motion` (Framer Motion) for components and layout transitions; **GSAP ScrollTrigger only on the landing page** for scroll scenes; CSS for hover and focus. No Lenis or scroll-jacking: native scrolling always. No WebGL or Three.js.

**Rules:**
- Animate only `transform`, `opacity` and SVG `stroke-dashoffset`. Never animate width, height, top or left of large layouts (use layout animations from `motion`).
- Product transitions ≤ 240ms; nothing blocks input; anything that takes >1s shows progress; >10s offers cancel.
- Loops longer than 5s need a pause control; landing has none that autoplay forever.
- Stagger ≤ 80ms between items, max 8 staggered items.

**Product choreography (exact):**
| Moment | Motion |
|---|---|
| New alert arrives | Row expands 200ms `--ease-out`, background highlight fades over 1.2s; does not move the selected row; announced via `aria-live="polite"` |
| Open case | List-to-detail: detail fades and rises 8px, 160ms |
| Tabs | Underline slides between tabs (shared layout), 200ms |
| Drawer / policy note open | Slide 240ms `--ease-out`; focus moves in; Esc closes and returns focus |
| **The seal** (saved to audit record) | Seal scales 0.8→1.06→1 with `--ease-spring` 360ms, check stroke draws 240ms, "Saved to audit record" text fades in; no toast |
| **The thread** (Source link click) | Teal thread draws from the figure to the highlighted evidence row, 420ms; row pulses once |
| **Tamper check** | Progress travels down the audit timeline, 60ms per entry (cap 1.2s total); each entry gets a tick; on failure, **the tear:** the link rips (translate+rotate 6°, 300ms), later entries fade to Critical colour with a 40ms stagger, result sentence appears |
| **Time slide** | Date counter ticks; certificate and deadline strips slide left proportionally over 900ms `--ease-in-out`; items that pass today flip to "Expired" with a 160ms colour change; new alerts then enter as above |
| Numbers on Overview | Count up once on first view, 400ms; never on refresh |
| Skeleton loaders | Soft shimmer 1.4s, opacity only |
| Toggles and segmented controls | 160ms, `--ease-spring` allowed |
| Buttons | Hover: background shift 90ms. Press: translateY(1px). Focus ring appears instantly |

**Landing choreography:**
- **Load:** headline reveals line by line (mask + rise 24px, 700ms, stagger 80ms); the underline under the italic word draws (stroke, 600ms); `HeroCaseFile` assembles over ~1.4s: sheets drop and settle (stagger 90ms), thread draws (1.2s), seal stamps (spring); chain links slide in last. Interactive from the first frame; assembly never blocks the CTA.
- **Hero interaction:** "Try changing a record" tears a link live using the real ledger code; a one-line caption below updates ("Entry 3 was altered. 3 later entries can no longer be trusted."); a "Restore" link reverses it.
- **Scroll scenes (GSAP ScrollTrigger, play once unless pinned):** sections fade up 16px over 500ms when 20% visible; **How it works** is pinned for four steps (≈ 100vh each of scroll), the illustration morphs between `StepDetect → StepExplain → StepDecide → StepProve` with the thread continuing across steps and a step indicator that is also clickable; **Policy to checks** pulls the highlighted sentence along a thread into a check card and fills a coverage bar; **Audit pack** fans pages out as it enters.
- **Parallax:** at most 24px on illustration layers, desktop only.
- **Dark proof band:** one full-width inverted (ink background) section with the large interactive Tamper check; the background transition is a simple colour change, no wipes.
- **No** custom cursors, magnetic buttons, cursor trails, text scrambles, marquees of logos, or autoplay video.

**Reduced motion (`prefers-reduced-motion: reduce`):** all transforms and parallax off; reveals become 150ms opacity fades; threads render fully drawn; seal and tear states change instantly with colour and text; scroll scenes are unpinned and render as a normal vertical sequence. A visible "Reduce motion" toggle in the footer and settings overrides the OS setting both ways.

**Performance budget:** animate on the compositor only, 60fps on a mid-range laptop; landing LCP < 2.5s, CLS 0, INP < 200ms; landing JS ≤ 250KB gzipped (GSAP loaded only on landing, below-fold scenes lazy-hydrated); each inline SVG scene ≤ 30KB; fonts subset and preloaded with `font-display: swap`.

## 18. HCI principles as enforceable rules

Every screen is reviewed against this table in the §11 checklist.

| Principle | Rule in this product |
|---|---|
| **Visibility of system status** (Nielsen) | "Records verified" status always in the top bar; SLA countdown on every alert; progress for checks and exports; saved confirmations; loading skeletons |
| **Match with the real world** | Plain-language vocabulary map (§1, §15.1); dates as "in 12 days"; amounts with currency |
| **User control and freedom** | Undo wherever reversible (responses, dismiss within 10s with "Undo"); Esc closes drawers and dialogs; every dialog has Cancel; wizards have Back |
| **Consistency and standards** | One component per pattern (status = dot + word everywhere; one table; one drawer); list-and-detail layout like email (Jakob's law) |
| **Error prevention** | Confirm dialogs state exactly what will be saved; Dismiss requires a reason; destructive or irreversible actions are visually and spatially separated from the primary action; disabled buttons explain why |
| **Recognition over recall** | Filters and active filters always visible; command palette (`⌘K`) lists recent items; labels beside icons, icons never alone except universal ones with tooltips |
| **Flexibility and efficiency** | Keyboard shortcuts in the alerts list (hint on hover and in a "?" sheet); saved filters; bulk actions |
| **Aesthetic and minimalist** | One primary action per view; hierarchy: sentence, visual, detail; technical detail behind "Show technical details" |
| **Help recognise and recover from errors** | Messages say what happened and the fix, never codes ("We couldn't verify entry 812. Run the check again or contact an admin.") |
| **Help and documentation** | Inline "Why?" links on every score, rule and policy reference; first-run tour ≤ 4 steps, skippable and re-openable |
| **Fitts's law** | Primary targets ≥ 40px tall on desktop, ≥ 44px on touch; sticky action bar within thumb reach on mobile; no tiny icon-only targets |
| **Hick's law** | ≤ 5 top-level nav items visible plus "More"; ≤ 3 actions in the case action bar; choices grouped |
| **Miller / chunking** | Tables show ≤ 6 columns by default; long forms split into steps of ≤ 7 fields |
| **Gestalt** | Proximity groups related facts; consistent 8px grid; similar things look the same, different things look different (colour meanings are fixed) |
| **Doherty threshold** | Respond to input in < 400ms; optimistic UI for decisions with rollback on failure |
| **Progressive disclosure** | Summary first, evidence second, technical third |
| **Peak-end rule** | The sealed confirmation after a decision is the designed "end"; the first screen after the demo login shows something meaningful, not an empty page |
| **Cognitive load** | Plain sentences, no jargon, no more than one new concept per screen, defaults chosen so the safe option needs no configuration |
| **Trust cues** | Who did it, when, based on what: every decision and AI output shows actor, time, sources, and "AI-assisted" when applicable |
| **Accessibility (WCAG 2.2 AA)** | Contrast AA (4.5:1 text, 3:1 UI); never colour alone; full keyboard operation with visible focus not obscured by sticky bars (2.4.11); targets ≥ 24px minimum (2.5.8); drag has a non-drag alternative (2.5.7); no redundant re-entry (3.3.7); semantic HTML, labelled controls, `aria-live` for incoming alerts and check results, `lang` set, zoom to 200% without loss, reduced-motion support (§17) |

**Evaluation plan (also feeds the written report):**
1. Heuristic evaluation by the owner against the table above, logged with screenshots.
2. **Five-second test** of the landing page with 5 people: can they say what the product does and who it is for?
3. **Task-based usability test** with 5 participants on 5 tasks (find the overdue certification and explain why it was flagged; file a report; run a tamper check; upload a policy and confirm obligations; generate an audit pack). Record completion, time and errors; finish with the **System Usability Scale** questionnaire. Target: ≥ 90% completion and SUS ≥ 80.
4. Automated: axe-core in Playwright on every route, Lighthouse accessibility ≥ 95.

## 19. Landing page v2 (replaces the section list in §8; copy from §15.3 and §8 still applies)

Rhythm: canvas → white → canvas → **ink band** → canvas (canvas = `--bg` of the selected palette). Type scale: headline `clamp(44px, 6.2vw, 80px)` Newsreader, one italic word per headline set in `--verified` with a hand-drawn SVG underline that draws on load.

1. **Header:** wordmark, 4 text links, "Open live demo" (solid marine blue). Sticky, shrinks to 56px on scroll, border appears.
2. **Hero:** left: headline "Compliance decisions you can *prove*.", subhead, one primary CTA, text link "See how it works". Right: `HeroCaseFile`, bleeding past the container to the viewport edge; interactive tamper control beneath. Below: a thin facts row with honest, counted-up values.
3. **Policies into checks:** `PolicyToChecks` scroll scene with the coverage sentence ("31 of 38 obligations are checked automatically").
4. **How it works:** pinned four-step scene with the morphing illustration (Spot it, Explain it, Decide, Prove it), each step a plain sentence.
5. **What it checks:** a bento layout (varied tile sizes, not equal cards) with the six spot illustrations; each tile has a small hover animation (certificate stamp turns terracotta and reads "Expired", calendar page flips, parcel gains a missing-document tag, key leaks from the code card).
6. **Ink band, "A record nobody can quietly change":** large interactive tamper check; caption explains in plain sentences; secondary line "Designed to support tamper-evident record keeping."
7. **Where AI is used:** two animated lanes, "Rules decide" and "AI helps", with the thread showing AI output passing a "checked against sources" gate before reaching a person.
8. **Audit pack:** `AuditPackFan` and a plain list of what is inside, with the sentence "An auditor can re-verify it themselves."
9. **Honest comparison:** ruled table versus "checklist tools" and "transaction-monitoring tools"; only claims the demo proves; footnote "Based on public product information; verify before relying on it."
10. **Closing CTA + footer:** short serif line, "Open live demo", links, Reduce motion toggle. (No academic-project credit — owner decision, §8.8.)

## 20. Product craft details (applies on top of §5–§7)
- **Overview header:** one plain sentence, a 96px spot illustration at the right (not decoration only: it changes with state: sealed folder when all is verified, dropped link when a check failed).
- **Onboarding:** after demo login, a 4-step guided overlay with the thread drawing from one UI element to the next; skippable; "Reopen guide" in help.
- **Micro-copy moments:** empty states say what is good ("Nothing needs attention. Last checked 2 minutes ago.") and what to do next.
- **Density toggle:** Comfortable (default) and Compact (44px rows) in settings.
- **Theme:** Mist blue default (60/30/10 per §3), four alternates selectable on `/styleguide`; illustrations stay on paper tiles in dark mode.
- **Sound, haptics, confetti:** none.

## 21. Process additions (mandatory order)
1. `tokens.css` including illustration and motion tokens → `/styleguide` (type, colour, status, components).
2. **Illustration kit** at `/styleguide/illustrations`: every kit part and every scene at 1× and 2×. **GATE: owner reviews illustrations.**
3. **Motion lab** at `/styleguide/motion`: each choreography item from §17 as a replayable demo with a reduced-motion toggle. Capture Playwright frames at 0%, 25%, 50%, 75% and 100% of each animation plus a short video; critique against §17. **GATE: owner reviews motion.**
4. Build the four signature moments as isolated components, then the screens in §10 order, then the landing page v2.
5. For every screen: screenshots (1440×900, 390×844), reduced-motion run, axe-core run, keyboard-only run, and the §18 table, before moving on.
6. Do not add effects not listed here. If an idea seems better, propose it in `PROGRESS.md` and wait.

## 22. Scale and fill (OVERRIDES every smaller number in this file and in MASTER.md)

Why this exists: earlier numbers (14px body, 12px labels, 40px rows, 56px nav) were tuned for a dense admin tool.
Combined with a centered wrapper, content looked tiny inside a big empty container. The product is NOT dense.
It is large, confident and fills the screen, like Stripe Dashboard or Mercury on a 27-inch monitor.

### 22.1 Fill rules
- **No `max-w-*` and no `mx-auto` on the app shell, page wrappers or content regions.** Layouts fill the viewport width.
  Only a prose column (report draft) may cap at 72ch, and it sits beside other panels, never centered in empty space.
- Every page = page header (title 28–32px + one plain sentence + primary action) + content that fills the viewport.
- **No dead space test:** at 1440x900 and 1920x1080, at least 80% of the main area must contain content (text, table,
  chart, illustration), not empty background. A page with fewer than 3 distinct content regions is unfinished.
- The visual anchor is big: charts and timelines are full-width of their panel and **at least 320px tall**, labels 13px+.

### 22.2 Type scale (rem; root font-size 16px, 17.5px at ≥1680px, 19px at ≥1920px, so everything scales with the screen)
| Token | Size / line | Use |
|---|---|---|
| `--fs-number` | 2.25rem / 2.5rem | key numbers |
| `--fs-title` | 1.75rem / 2.25rem | page titles |
| `--fs-sentence` | 1.5rem / 2rem | the case headline sentence (prominent) |
| `--fs-section` | 1.25rem / 1.75rem | section headings |
| `--fs-body` | 1rem / 1.5rem | body, buttons, nav labels |
| `--fs-table` | 0.9375rem / 1.375rem | table cells |
| `--fs-meta` | 0.8125rem / 1.125rem | labels, timestamps. **Nothing in the product is smaller than 13px** (hash chips 12.5px mono only) |

Use these through tokens or utility classes (`.t-body`, `.t-table`, `.t-meta`…). **Banned in product components:** `text-xs`, and `text-sm`
for anything except `--fs-meta`-sized secondary text.

### 22.3 Dimensions
- Left navigation: **248px expanded with labels (icons 20px, labels 16px)** at ≥1280px, collapsible to 72px; top bar **64px**.
- Table rows **52px**, header 44px, cell padding 14px 20px. Buttons 44px tall (primary 48px), inputs 44px, icons 20px (nav 24px), stroke 1.75.
- Panel padding 24–32px, gaps 24–32px, section gaps 40–48px.
- Spot illustrations 120–160px in page headers; empty states 280×200.

### 22.4 Layouts that fill
- **Alerts + case:** at 1440: nav 248 | list ~440 | case workbench fluid (~750). Inspector opens as a 420px side panel.
  At 1920: nav 248 | list ~480 | workbench fluid (~800) | inspector 392 always visible.
- **Case workbench:** headline sentence at `--fs-sentence`, then the 320px+ visual full-width, then tabs, then content. Action bar sticky at the bottom.
- **Overview (12-col grid, full width):** header with sentence + 120px spot. Row 1: "Where attention is needed" table (8 cols) + "Due soon" deadlines timeline (4 cols).
  Row 2: "Recent audit record" timeline (6 cols) + "Policy coverage" bar and list (6 cols).
- **Lists and registers:** full-width table, ≥ 8 rows visible on first screen at 1440x900, filters bar above, detail panel on the right.

### 22.5 Mechanical checks (add to `scripts/check-scale.ts`, run in CI and before each milestone)
Fail if any file under `src/app/(app)` or `src/components/workspace` contains `text-xs`, `max-w-` on a page or shell wrapper,
`mx-auto` on a page wrapper, or a hard-coded font size below 13px. Playwright test: screenshot 1440x900 and 1920x1080 for each route; assert
computed body font-size ≥ 16px at 1440, table cell ≥ 15px, row height ≥ 52px, and that the main content bounding box spans ≥ 90% of the
width between nav and viewport edge.

## 23. Screen specifications

### 23.1 Reports
Mobile 390: header (title + one short sentence), period presets (horizontal chips), area chips wrapping, preview line, sticky "Generate audit pack"
above the tab bar; "What's inside" becomes a collapsible section; previous exports render as stacked rows (name, date, Verified, ⋯ menu).
Area chips use plain names: Payments and thresholds · People and certifications · Vendors · Data access · Code and secrets · Regulatory deadlines · AI governance.
Empty history shows `EmptyEvidence`-style illustration with "No exports yet. Generate your first audit pack."

### 23.3 Screen spec template (required for every screen before building)
Purpose sentence (≤ 12 words) · 1440 wireframe · 390 wireframe · the one visual anchor · primary action · empty, loading and error states · the exact copy · the signature moment used (if any).

## 24. Screen specs (one per screen; build exactly these)

Common to every screen: §22 sizes, §1 vocabulary, one visual anchor, "Records verified" in the top bar, designed loading/empty/error states (24.30).
Notation: **1440** = desktop wireframe, **390** = phone behaviour, **Visual** = the anchor, **Primary** = the one solid navy button, **Moment** = signature moment used.

### 24.0 Global shell
- **1440:** sidebar 248px (grouped, labels 16px), top bar 64px: page title left; centre search "Search alerts, people, policies  ⌘K"; right: "Records verified · Check now", role chip, avatar.
- Sidebar groups (four lifecycle groups): **Work** (Overview, Alerts, Deadlines) · **What we watch** (Policy coverage, Policies, Obligations, People, Vendors) · **How it checks** (Rules, Sources, Responses) · **The record** (Evidence, Audit record, Reports). Active item: navy text, 3px navy left bar, tinted background. **Settings** and the **Demo scenarios** button are pinned at the bottom of the sidebar.
- **390:** no sidebar. Bottom tab bar, 5 slots: Overview, Alerts, Evidence, Reports, More (More = sheet with everything else). Top bar: title + verified dot only.
- Sidebar is `sticky`, `height: 100dvh`. Content area scrolls independently.

### 24.1 Demo sign-in
- **Purpose:** "Choose how you want to look at ComplianceIQ."
- **1440:** left 5 cols: serif headline, one sentence, small `HeroCaseFile` on a cream tile. Right 7 cols: three large role cards stacked: **Compliance officer** ("Review alerts, make decisions, file reports"), **Auditor** ("Read everything, verify records, export reports. Cannot decide"), **Administrator** ("Manage responses, rules and demo settings"). Each card has one button "Continue as …".
- **390:** cards stacked under a short headline. **Visual:** the illustrated tile. **States:** error "We couldn't sign you in. Try again." **Moment:** none.

### 24.2 First-run guide
- 4 steps as an overlay with the thread drawing from one UI element to the next: 1 "This is where alerts appear", 2 "Every alert explains itself", 3 "Your decision is saved to a record nobody can quietly change", 4 "Try the demo: run a scenario". Buttons: Next, Skip. Reopen from the help menu. **Moment:** thread.

### 24.3 Overview
- **Purpose:** "Where attention is needed today." Sentence is dynamic: "14 alerts need attention. 3 are due within 4 hours."
- **1440 (12-col):** header row: title, sentence, 120px spot illustration right (sealed folder if all verified, dropped link if a check failed), primary **Review critical alerts**.
  Row 1: **Where attention is needed** table (8 cols; rows = areas; columns: area, open, critical, due soon, oldest; small inline bars; every number links to the filtered list) + **Due soon** (4 cols; next 6 deadlines/expiries with "in 3 days" and an owner).
  Row 2: **Recent activity** (6 cols; last 8 audit-record entries as sentences with Verified ticks) + **Policy coverage** (6 cols; the stacked bar, sentence "31 of 38 obligations are checked automatically", link to the screen).
- **390:** header + sentence, primary button, then the four sections stacked; the table becomes a list of area rows with a count.
- **Visual:** the coverage bar plus the due-soon timeline. **Moment:** count-up on first load only. **States:** empty = `EmptyAlerts` "Nothing needs attention. Last checked 2 minutes ago."

### 24.4 Alerts (list + case, one screen)
- **Purpose:** "Review what was flagged and decide."
- **1440:** header: title, sentence "14 open · 3 due today", segmented **Score order | Suggested order (AI-assisted)**. Filter bar: domain tabs (All, Payments, People, Vendors, Access, Code, Deadlines), Severity, Status, Assignee, search. Below: **list ~440px** (52px rows: severity dot + word, one-sentence summary clamped to 2 lines, subject, "3h 20m left") and **case workbench** filling the rest (24.5). In Suggested order a row that moved shows "Moved up · why" (tooltip + one line); note: "Suggested order is advice. Risk scores are calculated by rules and never change."
- Keyboard: `j/k` move, `Enter` focus case, `e` escalate, `d` dismiss, `?` shortcut sheet. Selected row has navy left bar.
- **390:** list only; tap opens the case full-screen with a Back button; filters in a sheet; segmented control stays on top.
- **Visual:** the selected case's visual. **States:** empty = `EmptyAlerts`; filtered empty = "No alerts match. Clear filters".

### 24.5 Case workbench
- **Header block:** severity dot + word, "High · due in 3h 20m", assignee, back (mobile). **Headline sentence** at `--fs-sentence`. Then the **visual (≥ 320px tall, full width)**, then tabs, then tab content, then a sticky action bar.
- **Visual by alert type:** *Structured deposits:* timeline of deposits as marks against the USD 10,000 line, 48h window shaded. *Payment without approver:* approval chain diagram (requester → approver → payer) with the missing step drawn as a dashed gap. *Separation of duties:* one timeline with two actions by the same person highlighted. *Restricted record:* care-team circle with the viewer outside it. *Leaked secret:* the code lines with the matching line shown and the secret masked. *Expired certification:* date strip (issued → expires → today). *Deadline:* calendar strip with today and due date. *Vendor document:* document checklist with the missing/expired item marked.
- **Tabs:** Summary · Activity · How it was triggered · Policy · Report draft · History.
  - **Summary:** "Why this was flagged" (AI-assisted explanation, 2 short paragraphs, with the AI marking), **Risk reasons** (3 plain lines + score "High risk · 78"), Who/When/Time left, top 2 policy references, related alerts.
  - **Activity:** table of events/records (time, what happened, amount or detail, source); triggering rows have a left bar; every figure is a Source link.
  - **How it was triggered:** three blocks: *What we looked for*, *What we found*, *Why that matters*. "Show rule details" expands parameters and the rule as a sentence (24.13). "Try this rule on a sample" link.
  - **Policy:** the thread layout: the report/explanation text left, margin notes right (clause name, one-line summary, "Summary of …" or "Text of …", match strength, highlighted span). Click a note: full clause in a drawer.
  - **Report draft:** paragraphs with headings per dossier kind; AI paragraphs marked; click to edit (becomes "Edited"); each paragraph has "Evidence (3)" footnote. Check line above: "All 6 policy references were found. All numbers match the evidence." or the failure sentence with the offending paragraph highlighted.
  - **History:** audit timeline for this case (sentences + Verified ticks, "Show technical details" toggle off by default).
- **Action bar (sticky):** left **File report** (navy), then **Escalate to manager** (outline), far right **Dismiss alert** (text button, separated). Each opens a dialog (24.29). After saving: **seal** moment and the row "Saved to audit record · 14:05 · Entry 1285".
- **390:** visual shrinks to full-width 220px; tabs become a horizontal scroller; action bar is a sticky bottom bar above the tab bar with File report as the main button and ⋯ for the others.
- **State-based alerts** (certificate, deadline, vendor): extra banner when closed automatically: "Closed automatically · renewal attached · 14:05" with the evidence link. **Moment:** thread, seal, time slide.

### 24.6 Audit record
- **Purpose:** "Every decision and piece of evidence, with proof nothing was changed."
- Sentence: "1,284 entries. All verified." (or "Entry 812 was altered. 472 later entries can no longer be trusted.")
- **1440:** header with primary **Run tamper check**. Visual: **the chain**: a horizontal strip of paper links (latest 24 visible, scrollable, click a link to jump), 200px tall. Below: filter bar (event type in plain names, case, person, date) and the **timeline** (sentence rows: "R. Mensah filed this report · 14:05", "Alert closed automatically · renewal attached", each with a Verified tick and a link to the case or evidence). Right panel (380px) on selecting an entry: what was recorded in plain key-values, "Verified" status, **Show technical details** (hashes with copy).
- **Tamper check:** progress travels along the chain, then result sentence. Demo mode only: "Simulate tampering" and "Restore" buttons appear next to it.
- **390:** chain strip 120px, timeline list, details as a sheet. **Moment:** tear (on failure), seal on success. **Empty:** `RecordsVerified` "No entries yet."

### 24.7 Policy coverage
- **Purpose:** "See which of your policy obligations are checked automatically."
- **1440:** header + sentence "31 of 38 obligations are checked automatically. 7 have no check." + primary **Upload a policy**. Visual: stacked bar (Checked · Partly checked · No automated check), 32px tall, full width, segments filter the list. Filter chips: policy document, owner. **Obligation list** (full width, 52px rows → expandable): obligation in plain words, the exact quote in grey, status dot + word, rule name or "No automated check", last passed date. Selecting a row opens a right panel: policy text with the quote highlighted, the matched rule (or a dropdown "Choose a rule" for unmapped ones), and an **AI-assisted suggestions** block: "A check that would cover this: …", clearly separated and never counted.
- **390:** bar on top, list rows stack (obligation, status), details as a sheet. **Moment:** bar fills on load (once). **Empty:** `EmptyObligations` "Upload a policy and we'll find the obligations in it."

### 24.8 Obligations review (after upload)
- **Purpose:** "Confirm what we found in your policy."
- Stepper: Upload → Review → Done.
- **1440:** left 60%: the policy text with each proposed obligation's quote highlighted (click to focus); right 40%: **Found in your policy: 9 items** list, each with the sentence, a type chip (Recurring, Deadline, Requirement…), suggested rule (if any) as a labelled suggestion, buttons **Confirm · Edit · Not an obligation**. Sticky bottom bar: "6 confirmed · 3 left" + **Save confirmed items** (navy). Saving: "Saved to audit record" row for each.
- **390:** tabs "Policy text | Found items". **Visual:** highlighted policy text. **States:** extraction failing → "We couldn't read this file. Try a PDF or text file." **Moment:** seal on save.

### 24.9 People and certifications
- **Purpose:** "Know who is qualified to do their job, today."
- Sentence: "47 people. 3 certifications expired and 5 expire within 30 days."
- **1440:** header + **Add certification**. Visual: **expiry strips**: one row per certification type (First aid, AML training, Fire safety…), a 90-day horizontal strip with a marker per expiring certificate and today line; clicking a marker filters. Filters: department, certification, status. Table (52px): person, role, certification, status ("Valid", "Expires in 12 days", "Expired 19 days ago") dot + word, expiry date, related alert. Right panel: person's certificates with strips, required-by-role list, related alert link, **Attach renewal** (upload → evidence recorded → alert closes automatically with the seal and a "Closed automatically" confirmation).
- **390:** strips become a compact list; table rows as stacked cards. **Moment:** time slide, seal. **Empty:** "No people yet. Import a list or use the demo data."

### 24.10 Vendors
- **Purpose:** "Check that every vendor has the paperwork we require."
- Sentence: "2 vendors are missing a required document."
- **1440:** primary **Add document**. Visual: **document matrix**: rows = vendors, columns = required documents for their tier (Security report, Data agreement, Insurance), cells = icon + word ("Valid · Dec 2026", "Expires in 9 days", "Missing"), full width. Table below for details (tier, owner, last review "11 months ago"). Right panel: vendor documents with expiry strips, review history, related alerts, **Request renewal** (drafts a message; "Draft only, nothing is sent").
- **390:** matrix becomes per-vendor rows with three small status chips. **Moment:** seal on attaching a document.

### 24.11 Deadlines
- **Purpose:** "Never miss a regulatory or policy deadline."
- Sentence: "3 deadlines in the next 30 days. 1 is overdue."
- **1440:** Visual: **3-month timeline** with today line, markers coloured by status (overdue in Critical colour with the word "Overdue"), hover shows the obligation. Below, grouped lists: **Overdue**, **Next 14 days**, **Later**. Row: obligation, owner, due date, "in 6 days", status. Right panel: obligation quote and source policy, owner, history of completions, **Mark as completed** (requires attaching evidence; seal).
- **390:** timeline condenses to a vertical agenda list. **Moment:** time slide (when the demo clock moves). **Empty:** "No deadlines in the next 30 days."

### 24.12 Evidence
- **Purpose:** "Everything we rely on, saved and verifiable."
- Sentence: "412 pieces of evidence. All verified."
- **1440:** primary **Add evidence** (upload). Visual: horizontal stacked bar by kind (Snapshots, Documents, Check runs, Decisions, Code checks) that filters. Filters: kind, date, linked alert. Table: title, source, collected, linked item, Verified tick. Right panel: plain key-value preview of the content, "Snapshot taken when the alert was raised" note where relevant, linked alert/obligation, **Show technical details** (hash, entry number).
- **390:** stacked rows, details as a sheet. **Empty:** `EmptyEvidence`.

### 24.13 Rules
- **Purpose:** "See exactly what the system checks, and try it."
- Sentence: "8 checks run automatically."
- **1440:** list left (rule name in plain words, area, on/off dot, last triggered), detail right. Detail: **the rule as a sentence with slots** (e.g. "If **the same person** makes **2 or more cash deposits** each between **USD 9,000 and 9,999** within **48 hours**, flag it as **High**."). Below: "What it protects against" (policy references), "Settings" (read-only values; admins edit, every change recorded), and **Try it on a sample**: choose a sample event set, press **Run**, see "Would flag" or "Would not flag" with what matched. Technical rule tree only under Show technical details.
- **390:** list then detail as a pushed page. **Visual:** the sentence-with-slots diagram.

### 24.14 Policies
- **Purpose:** "Read the policies and regulations the checks are based on."
- **1440:** left: document list grouped (Your policies · Regulations), search. Centre: reader (72ch column) with a clause outline in a sticky right rail. Each clause shows its label ("Demo policy document", "Summary of 31 CFR § 1020.320"), "Used by these checks" chips, and "Obligations found here: 4". Visual: the document itself with obligation highlights toggle.
- **390:** list → reader. **Empty:** "No policies yet. Upload one."

### 24.15 Reports
As §23.2: generator (period presets, area chips, live preview "14 alerts · 412 evidence items · 9 decisions"), What's inside with `AuditPackFan`, Previous exports table, SAR-style drafts list, "How this report was produced". **Moment:** seal when generated.

### 24.16 Sources (demo connections)
- **Purpose:** "See what feeds ComplianceIQ."
- Sentence: "4 sources are reporting. 1 needs attention." Badge: "Demo connections".
- **1440:** Visual: flow "Your systems → Local agent → ComplianceIQ" with the boundary "Stays inside your network" and the line "Sends fingerprints of records, never the records themselves." Table: source, what we watch, status dot + word, last check. Row click: panel with recent activity count and a "Simulate a delayed source" demo button.
- **390:** flow stacks vertically; table rows as cards.

### 24.17 Responses
- **Purpose:** "Decide what happens automatically when something is flagged."
- Sentence: "2 responses are on. Both only suggest."
- **1440:** list of responses, each a sentence ("If someone turns off two-step sign-in, suspend their access token") with a segmented control **Off · Suggest only · Automatic** (default Suggest only). Selecting a response shows Visual: strip **Trigger → Action → Recorded**, and a history table of times it ran with **Undo** where possible. Switching to Automatic opens a dialog stating plainly what will happen without approval.
- **390:** list rows with the segmented control below each sentence. **States:** "Nothing has run yet."

### 24.18 Settings
- **Sections (left tabs on desktop, list on phone):** *Profile and role* · *Appearance* (theme, row density Comfortable/Compact, **Reduce motion**) · *AI-assisted writing* (status: "On" / "Using saved examples" / "Off"; plain explanation of what AI does and cannot do) · *Demo data* (admin: **Reset demo**, current simulated date) · *Keyboard shortcuts*.
- Primary: none (changes apply instantly with a quiet "Saved" row); Reset demo needs a confirm dialog.

### 24.19 Demo panel
- **Purpose:** "Run the demo without leaving the app."
- **1440:** right drawer 440px, opened from the Demo button. Sections: **Run a scenario** (8 cards: plain title, one sentence of what will happen, **Run**), **Time** ("Today in the demo: 14 Mar 2026", chips Move forward 7 / 30 / 90 days, caption of what changed after), **Tampering** (Simulate tampering, Restore), **Reset demo**.
- After a scenario runs: a **walkthrough strip** (bottom of the workspace, 72px) shows 4 steps with captions ("1 Activity · 2 Rule · 3 Policy · 4 Saved record"); each step highlights the matching region with the thread. Controls: Back, Next, Close.
- **390:** bottom sheet instead of drawer. **Moment:** time slide, thread.

### 24.20 Command palette
- `⌘K`: centred 640px panel; sections **Recent**, **Go to**, **Alerts**, **People**, **Policies**; arrow keys + Enter; Esc closes. Empty query shows Recent and Go to. No results: "Nothing matches. Try fewer words."

### 24.21 Landing page (sections from §19, layouts)
| Section | 1440 composition | 390 |
|---|---|---|
| Header | wordmark left, 4 links, "Open live demo" button; sticky | wordmark + menu button |
| Hero | 6-col text (headline up to 80px, subhead, CTA) / 6-col `HeroCaseFile` bleeding right, tamper control under it, facts row beneath | headline, CTA, scene (scaled), tamper control, facts in 2×2 |
| Policies into checks | 5-col copy / 7-col `PolicyToChecks` scene | copy, then scene scaled, simplified |
| How it works | pinned: left step list (4, clickable), right morphing scene | unpinned vertical sequence of 4 scenes |
| What it checks | bento: 2 large + 4 small tiles with spot illustrations | single column tiles |
| Ink band | full-bleed navy; large interactive chain, caption below | chain scrolls horizontally |
| Where AI is used | two lanes with animated thread and gate | lanes stacked |
| Audit pack | 6-col `AuditPackFan` / 6-col contents list | stacked |
| Comparison | full-width ruled table | table becomes 3 stacked comparison blocks |
| Closing + footer | big serif line, CTA, links, Reduce motion toggle | same, stacked |

### 24.22 (Tier 2) Questionnaires
- **Purpose:** "Answer a customer's security questionnaire from your own evidence."
- Stepper: Upload → Check columns → Review answers → Download.
- **Check columns:** a preview table of the sheet with detected Question and Answer columns highlighted; dropdowns to change them; tab selector for sheets.
- **Review answers (1440):** left list of questions with status (Answered · No evidence found), right panel: the answer text, **Based on:** the policy quote and evidence items with Verified ticks and last-verified date; Edit, Accept. Unanswerable: "No evidence found. Needs your answer."; sticky bar "Accept all answered (24)" + **Download filled file**.
- **390:** list → detail pages. **Moment:** thread (answer to evidence).

### 24.23 (Tier 2) CI gate
- **Purpose:** "Stop risky code before it ships."
- Sentence: "Last deploy check: blocked. 1 secret found in a commit."
- **1440:** Visual: timeline of recent checks (Blocked / Passed / Fixed). Table: repo, branch, result, reason in plain words, time. Right panel: the finding (masked secret line), the evidence item, the audit-record entry, and "Fixed in a later check · 14:20" once resolved. Setup block: "Add this check to GitHub" with the short workflow snippet and **Copy**.
- **390:** list rows; snippet scrolls.

### 24.24 (Tier 3) Training readiness
- **Purpose:** "Check AI data and models before they are used."
- Sentence: "Training run blocked: 3 columns still contain personal data."
- **1440:** Visual: pipeline strip Data → Personal data check → Consent check → Training, failing gate marked. Checklist table of controls (pass / blocked, plain reason, policy reference link). Wording is "readiness", never "compliant".

### 24.29 Dialogs (all share one pattern)
- Title as a verb phrase; one plain sentence of exactly what will be saved ("This will save your decision and the report to the audit record. It can't be edited afterwards."); fields only if required (Dismiss: reason list: Reviewed and not suspicious · Duplicate · Approved exception · Data error, plus optional note); buttons: **Cancel** (outline) left, confirm right (navy; red only for destructive/irreversible). Esc cancels; focus returns to the trigger. After confirming: dialog closes and the seal row appears; Dismiss shows "Undo" for 10 seconds.

### 24.30 States and system pages
- **Loading:** skeleton rows with the real row height and column widths (never a spinner on a blank page); shimmer opacity only.
- **Empty:** illustration (280×200) + one sentence saying what is good or what to do + one action.
- **Error:** `Error` illustration + "We couldn't load alerts. Try again." + **Try again**; details under "Show technical details".
- **Offline demo:** a thin banner "Running without a network. Demo data only."
- **404:** `NotFound` + "That page doesn't exist." + **Go to Overview**.
- **Forbidden (auditor on a decision):** buttons absent, not disabled, with a line "Auditors can read and verify. Only officers can decide."


## 25. Dashboard and data visualisation style ("editorial dashboard")

The Overview and every chart read like a well-edited report page, not a monitoring wall. Sentence first, then evidence, with charts that label themselves.

### 25.1 Panel anatomy (every dashboard panel)
- Surface: `--surface` on `--bg`, 1px `--line` border, 6px radius, padding 24–32px, no shadow. Panels in a row have equal height and fill the grid (12 columns, 24px gutters, no max-width).
- Header: title at `--fs-section`, one-line sentence beneath in `--text-2` ("3 are due within 4 hours"), optional link on the right ("View all").
- Body: one visual or one table, never both competing.
- Footer (optional): "Source: 14 alerts · rule AML-001" as a Source link. Every panel can answer "where does this come from?".

### 25.2 Numbers
- Key numbers at `--fs-number`, tabular figures, unit and context beside them ("14 alerts", "3h 20m left"). No bare numbers.
- Change is written in words: "2 more than last week". A small arrow may sit before the words, never alone, never green-up/red-down colouring.
- Every number is a link to the filtered list behind it, and has the dotted Source underline.

### 25.3 Chart language
- **Allowed:** threshold timelines, date strips, single stacked bars, simple horizontal bars, small matrices (vendor × document), calendar/agenda strips, small multiples, inline bars inside tables.
- **Banned:** pie and donut, gauges, radar, 3D, dual y-axes, gradient area fills, rainbow palettes, legends when direct labels fit.
- Hand-built SVG (or a library fully restyled to this section); default library styling is not accepted.
- Chart title is a **sentence stating the finding** ("Two deposits sat just under the limit"), not a label ("Deposits").
- **Direct labelling:** label the threshold, today line and key points on the chart itself (≥ 13px). Horizontal gridlines only, 1px `--line`; no vertical grid, no chart borders.
- Colour: neutral data in `--accent` or `--text-2`; verified in `--verified`; critical/altered/expired in `--critical`; at most 3 colours per chart. Never colour alone: pair with a word, icon or pattern.
- Sizes: minimum height 320px for the anchor chart on desktop, 200px on phone; axis and label text 13px minimum; marks at least 10px for touch.
- Tooltips are plain sentences ("Deposit of USD 9,800.00 on 12 Mar, 09:12") and appear on hover and keyboard focus.

### 25.4 Interaction
- Every mark is clickable: it filters the list or opens the evidence in the side panel (thread moment). Hover cross-highlights the matching table row and policy note.

## 26. Anti-clutter rules (apply to every screen; override §24.3 Overview and §25 where they add density)

**One question per screen.** The Overview answers "What do I need to do now?" and nothing else. Detail lives on the screen that owns it.

**Overview content budget (1440):**
1. Headline sentence + one primary button + 80px spot illustration.
2. "Do these first": 4–5 alert rows (severity dot, one sentence, time left). 60px rows, hairline separators, no panel border.
3. "Coming up": one 30-day strip with at most 4 markers and one line of text under it.
4. A footer row of three quiet links, each a label plus one fact (Policy coverage, Audit record, Trend).
Nothing else. The attention table, coverage bar, trend chart and activity feed move to Alerts, Policy coverage, the Trend page and Audit record.

**Budgets for any screen:**
- Content regions above the fold: ≤ 3. Text sizes: ≤ 3 (sentence, body, meta). Accent colours in view: ≤ 2 plus severity.
- At most one solid button. No panel gets a title, a subtitle **and** a link; pick the one that earns its place.
- Panels are separated by whitespace and a hairline, not by boxes, unless the box holds an editable form or a floating layer.
- Do not repeat a fact: a number appears once per screen. If it is in the headline, it is not also in a table, tile and chart.
- Prefer a sentence to a chart when the sentence says the same thing ("Open alerts down for 5 weeks"); the chart lives one click away.
- Dots, ticks and icons appear only when they carry state; never as decoration next to every row.
- Whitespace target: at 1440×900, 35–45% of the main area is empty background. Fewer than 25% means the screen is too dense.

**Checklist addition (§11):** [ ] Passes the §26 budgets. [ ] Squint test: with the screen blurred, the headline and the primary list are still the two things you see.


## 27. The signed-in app: how it all works

### 27.1 Information architecture
Sidebar groups (fixed order, plain names; four lifecycle groups since the clarity-layer revamp):
- **Work:** Overview · Alerts · Deadlines
- **What we watch:** Policy coverage · Policies · Obligations · People · Vendors
- **How it checks:** Rules · Sources · Responses
- **The record:** Evidence · Audit record · Reports
Pinned at the bottom: **Settings** and **Demo scenarios**. Alerts shows an open-count badge. Mobile: bottom tabs Overview · Alerts · Evidence · Reports · More (the More sheet opens Help & shortcuts, the guided tour and Demo scenarios).
Top bar (64px): page title, search (`⌘K`), **Records verified** status (click = run tamper check), tour/help button, role chip.

### 27.2 Five page templates (every screen is one of these; no custom layouts)
1. **Briefing** (Overview): headline sentence, primary button, "Do these first" list, "Coming up" strip, footer links. Budgets from §26.
2. **List + detail** (Alerts, Deadlines, Evidence, People, Vendors, Rules, Sources, Responses): filter bar, list left, detail right; on narrow screens the detail is a pushed page with a Back link.
3. **Record** (Audit record, Evidence item, Case history): sentence, the chain or timeline visual, entries as sentences, technical details collapsed.
4. **Workflow** (Obligations review, Questionnaires, Reports, Upload): stepper at top, one task per step, sticky bottom action bar.
5. **Reader** (Policies): document column plus an outline rail.

### 27.3 Shell behaviours
- Sidebar is `sticky` full height; active item = tinted background + navy text; collapses to 72px (icons with labels under) below 1280px.
- Live updates never move what the user is looking at: new alerts raise a "2 new alerts" chip at the top of the list and update the badge; `aria-live="polite"`.
- Records verified status states: *Records verified* (green dot), *Checking…*, *Records altered* (red, links to the exact entry).
- Demo mode: a thin line in the top bar "Demo data" with the simulated date; "Demo scenarios" opens the drawer (§24.19). Role chip switches role (officer, auditor, admin) and the sidebar and actions change accordingly.
- Search (`⌘K`): recent items, Go to, then results across alerts, people, vendors, policies, evidence.

### 27.4 Daily journeys (design each screen so these take the fewest steps)
- **Compliance officer:** Overview → click an alert in "Do these first" → read the sentence, the visual, "Why this was flagged" → check the Policy tab → edit the draft → **File report** (or Dismiss with a reason, or Escalate) → the seal confirmation → next alert.
- **Auditor:** Audit record → Run tamper check → Evidence (open items, see the snapshot and the Verified tick) → Reports → Generate audit pack → verify the head hash. Never sees decision buttons.
- **Administrator:** Policy coverage → Upload a policy → confirm obligations → map rules; Responses (set modes); Settings; Demo reset.

### 27.5 Guided tour (first sign-in; replay from the help menu)
- Non-modal coachmarks: the target gets a 2px accent outline, a 262px popover sits beside it (right for the sidebar and demo button, below for others). Controls: Back, Next, Skip tour; `Esc` ends it; focus moves to the popover and back to the target on exit; fully keyboard-operable and announced to screen readers.
- Steps (plain copy): 1 Sidebar: "Everything is grouped by what you are doing: work on alerts, check the records, set things up." 2 First alert row: "Each alert is one plain sentence with the time left. Open one to see why it was flagged." 3 Records verified: "Every decision is saved to a record nobody can quietly change. This shows it is intact." 4 Search: "Jump to any alert, person or policy. Press Ctrl+K or Cmd+K." 5 Demo scenarios: "Try it yourself: run a scenario and watch an alert appear."
- Role variants: the auditor's step 2 points at Evidence ("Open any item to see its snapshot and proof"), step 5 at Reports. The admin's step 2 points at Policy coverage.
- Visual: the teal thread draws between the previous and next target (400ms; instant under reduced motion). Progress dots are not used; text says "Step 2 of 5".
- After step 5, a short "Run your first scenario" prompt opens the demo drawer. The tour never reappears automatically after Skip or Done; "Take the tour" stays in the top bar for the first week, then moves into the help menu.
- Contextual help: every score, rule and policy reference has a "Why?" link (a one-sentence popover). `?` opens the keyboard shortcuts sheet.

### 27.6 Shared patterns (one implementation each)
- **Filter bar:** visible filters, active filters shown as removable chips, "Clear filters".
- **Table:** ≤ 6 columns by default, 52px rows, sortable headers, row click opens the detail panel, whole row focusable.
- **Side panel:** 380–420px, opens from the right, Esc closes, focus returns to the row.
- **Decision flow:** action → one-sentence confirm dialog → seal → inline "Saved to audit record" row → Undo available for 10 seconds where reversible.
- **Status:** dot + word everywhere. **Time:** relative with absolute on hover ("in 4 days", "12 Mar 2026, 09:12 UTC").
- **Notifications:** in-app only (badge, "n new" chip). No toasts for saves; no email.
- **Empty / loading / error:** per §24.30.

### 27.7 Acceptance for the signed-in app
- [ ] Every screen uses one of the five templates and the §26 budgets.
- [ ] Both journeys (officer, auditor) can be completed by keyboard alone.
- [ ] The tour works at 1440 and 390, per role, and can be skipped, resumed and replayed.
- [ ] "Records verified" status is on every screen and its failure state links to the altered entry.
- [ ] No screen requires the user to know any term outside the vocabulary map (§1, §15.1).

## 28. The signed-in app, creative direction: "The case room"

Supersedes §24.3, §26 (Overview budget) and §27.5 (tour) where they differ. §26's budgets limit **text and controls**; they do not limit illustration. In this app the illustrated objects carry the information that tables and tiles carry elsewhere.

### 28.1 Concept
The app is a warm, orderly **case room**: a desk of case folders, a pinboard, a filing cabinet, a wall calendar, a chain of sealed records. Everything you need is an object you can read at a glance and open. Same "paper and thread" language as the landing page (§16), so the product feels like the same brand, not a different tool.

### 28.2 Two surface types
1. **Data surfaces** (tables, forms, timelines): flat, hairline borders, 6px radius, readable and dense enough to work in.
2. **Paper surfaces** (the hero object on each screen, empty states, tour notes, confirmations, onboarding): cream `--ill-paper`, 12px radius, 1.5px `--ill-ink` outline, hard offset shadow `--ill-shadow`, optional paper grain. Paper surfaces are where the personality lives; there is at most **one hero object per screen** plus small paper moments.
In dark mode, paper surfaces stay cream (like a framed picture on a dark wall).

### 28.3 Identity in the shell
- **Sidebar:** deep navy (`--ill-ink`), cream labels 16px; the **active item is a cream paper tab** that extends into the content area with rounded left corners (like a folder tab). The wordmark has a small teal seal mark. Group labels in sage.
- **Page title:** Newsreader serif 36px; the headline sentence under it in Newsreader 24px. Everything else Geist.
- **Background:** warm off-white with a barely visible paper grain on the content area (≤ 4% opacity).
- **Top bar:** transparent over the grain; "Records verified" is a small round seal icon with the words; it flips to a torn seal in red when altered.

### 28.4 Hero objects per screen (each built from the illustration kit, bound to real data)
| Screen | Hero object (at 1440, 240–420px tall, fills its panel) | How it works |
|---|---|---|
| **Overview** | **The desk**: six case folders (Payments, People, Vendors, Access, Code, Deadlines) on a cream desk with a lamp edge and a desk calendar. Folder paper thickness shows the number of open alerts (1–5 sheets). A critical alert gives the folder a terracotta tab; due-soon adds a small clock tag; zero alerts shows a closed folder with a teal seal. | Hover lifts a folder 4px and draws the thread to its top alert; click opens Alerts filtered to it. "Do these first" appear as 4 clipped slips beside the desk, each with a paperclip (terracotta critical, ochre high) and the time left. |
| **Alerts** | **Case file tabs:** each list row is a paper slip; the selected one "pulls out" and becomes the open case file on the right. Filter chips are index tabs. | Selection animates the slip sliding right into the workbench (240ms). |
| **Case workbench** | **The open case file spread:** left page evidence and visual, right page report draft; the margin carries policy notes joined by teal threads; tab dividers along the edge are Summary, Activity, How it was triggered, Policy, Report draft, History. | Thread draws on Source and Policy clicks; File report ends with the seal stamping onto the page corner. |
| **Audit record** | **The chain band:** a full-width chain of paper links across the top, newest on the right, scroll or drag to move; each link shows its entry number; teal ticks when verified. | Tamper check sends a pulse along the chain; failure tears a link and turns the rest terracotta. |
| **Policy coverage** | **The pinboard:** obligation cards pinned to a cork-free cream board; checked ones have a teal thread to a small rule tag; partly checked have a thread that stops halfway; **gaps are loose cards with a dangling thread end**. | Click a card to open details; a "Connect to a rule" action animates the thread to the rule tag. |
| **Deadlines** | **The wall calendar** with tear-off month pages and flags; overdue days have a terracotta flag. | Moving the date forward flips pages and slides flags; hover a flag for the obligation. |
| **Evidence** | **The filing cabinet:** drawers labelled Snapshots, Documents, Check runs, Decisions, Code checks, each showing item counts; opening a drawer slides it out to reveal the table. | Verified items carry a small seal. |
| **People and certifications** | **Certificate ribbons:** each certification type is a ribbon strip across the top with person badges positioned by expiry date; expired ones have a terracotta end. | Click a badge to open the person. |
| **Vendors** | **The shelf:** each vendor a labelled parcel; missing documents show as empty slots on the parcel's tag, expired ones as faded tags. | Click a parcel to open its documents. |
| **Reports** | **The stack:** pages fan out as a report is composed; a seal drops on the top page when ready. | Previous exports sit in a drawer of sealed packs. |
| **Rules** | **Recipe cards:** each rule is a card with the sentence-with-slots; "Try it on a sample" slides a sample slip through the card. | Result stamps "Would flag" or "Would not flag". |
| **Sources** | **The mailroom:** envelopes travel from "Your systems" through the local agent (inside a dashed "stays inside your network" boundary) into ComplianceIQ. | A delayed source shows an envelope stuck at the boundary. |
| **Responses** | **Switch cards:** each response is a card with a three-position switch (Off, Suggest only, Automatic); the Trigger → Action → Recorded strip is drawn as a thread through three small stamps. | Switching to Automatic stamps a red-edged "Acts without approval" note. |
| **Settings, Policies** | No hero object: calm data surfaces, serif titles, one small paper moment (e.g. an illustrated reader's desk in Policies). | |
| **Demo scenarios** | A **director's clipboard** with scenario cards you tear off to run; the time control is a small desk calendar with a dial. | |

Illustrations bind to real data (counts, dates, statuses) and are rebuilt from components, never static images.

### 28.5 Motion in the app (on top of §17)
- **Arrival:** each screen's hero object assembles in 500–700ms: folders slide onto the desk with 60ms stagger, pages settle, threads draw. Played once per visit; reduced motion shows the final state.
- **Hover:** objects lift 4px and their tab wiggles 3° (160ms); no hover effect on table rows beyond a background shift.
- **Navigation:** the paper tab slides to the new item (shared layout, 200ms).
- **Numbers:** folder thickness and badges animate when a count changes; the new-alert chip slides in.
- **Moments:** the seal, the tear, the thread and the time slide as in §17.
- **Calm rule:** never more than two things moving at once, and nothing loops.

### 28.6 Delight without clutter
- Text stays lean (§26 budgets for text and controls). Delight comes from the hero object, the serif voice, and well-timed paper moments, not from extra widgets.
- **State-driven illustration instead of greetings:** the Overview desk changes with state: tidy and sealed when all is clear, papers piled with a terracotta clip when critical alerts exist, a lamp "turned off" when everything is verified and closed.
- **Peak-end:** the first filed report triggers a larger one-time seal moment: "Your first decision is on the record."
- Empty states are small scenes with one sentence: a tidy desk with a plant (`EmptyAlerts`), an empty drawer (`EmptyEvidence`), a blank pinboard (`EmptyObligations`), a dropped link (`Error`).
- Microcopy has a warm, plain voice; no jokes, no exclamation marks.

### 28.7 Onboarding and tour: "Follow the thread" (replaces §27.5 visuals; copy and controls stay)
1. **Opening moment (≤ 2.5s, skippable):** a closed folder labelled with the person's role slides to the centre, opens, and the desk appears. Shown once after first sign-in.
2. **Tour:** five stops. At each stop the app dims slightly, the target gets a 2px teal outline, and a **paper note** (paper surface, 262px, small illustration of what it explains at the top, one plain sentence, Back / Next / Skip tour) sits beside it. A **teal thread** draws from the previous target to the next, with a knot at each stop; progress is read from the knots (also "Step 2 of 5" in text).
   - Stop 1: the sidebar (mini illustration: three folder tabs). Stop 2: a folder on the desk or "Do these first" slip (mini slip with clip). Stop 3: Records verified seal (mini seal). Stop 4: search (mini magnifier on a paper slip). Stop 5: Demo scenarios (mini clipboard).
3. **Finish:** the thread ties into a seal stamp ("You're set"), then a paper note: "Run your first scenario" with a button that opens the demo drawer.
4. Role variants as in §27.5; reduced motion shows static threads and instant stamps.

### 28.8 Illustration additions to the kit and scene library (§16)
Kit: `Folder` (with tab, sheet-count prop, closed/seal variants), `DeskSurface`, `Lamp`, `Clip`, `Slip`, `Pin`, `Drawer`, `Ribbon`, `Parcel`, `Envelope`, `WallCalendar`, `Clipboard`, `Plant`.
Scenes: `OverviewDesk` (1100×420, six folders + calendar), `CaseFileSpread`, `ChainBand`, `CoveragePinboard`, `EvidenceCabinet`, `CertificateRibbons`, `VendorShelf`, `ReportStack`, `RecipeCard`, `Mailroom`, `SwitchCard`, `DirectorClipboard`, `WelcomeFolder`, and five tour mini-illustrations (96×96). Each has a spec (canvas, parts, z-order, data bindings, animated layers) before it is drawn. Same review loop as §16: render at 1× and 2×, critique, two passes, then ask the owner.

### 28.9 Acceptance (add to §11)
- [ ] Each screen has its hero object (or is listed as "none" in 28.4), bound to real data.
- [ ] Logo-hidden test: a screenshot is recognisable as ComplianceIQ by the serif sentence, the paper tab, and the folder/thread/seal language.
- [ ] Text and controls still meet §22 sizes and §26 budgets; the screen is readable when the illustration is ignored (every fact in it is also available as text or in the table view).
- [ ] The hero object has a text or table alternative for screen readers and a "view as list" option where it holds data.
- [ ] Reduced-motion run and keyboard-only run pass.

## 29. Screen-by-screen: layouts and copy for "The case room"

### 29.0 Page frame (every signed-in screen)
```
| sidebar 248 (navy, cream labels, active = cream paper tab) | top bar 64 (transparent, grain)           |
|                                                            | Page title (serif 36)      [primary button] |
|                                                            | Headline sentence (serif 24, ≤ 2 lines)     |
|                                                            | hero object / content, padding 40, gutter 32 |
```
No max-width; at 1920 the hero object and tables widen, and §22 scales type. Paper surfaces: hero objects, notes, confirmations. Data surfaces: tables, forms, timelines. One primary (solid navy) button per screen, top right of the page header.
Severity words everywhere: Critical · High · Medium · Low. Status words: Open · In review · Filed · Dismissed · Escalated · Closed automatically.

---

### 29.1 Demo sign-in
- **Purpose/copy:** title "Choose how you want to look around". Subtitle "This is demo data. Pick a role to see what each person sees."
- **1440:** left half navy panel with `WelcomeFolder` (a closed case folder with a teal seal, a thread looping off the edge) and the serif line "Compliance decisions you can prove." Right half cream: three paper **role cards** stacked, each with a small illustration, a one-line description and a button. Officer (clipboard): "Review alerts, decide, file reports." Auditor (magnifier on a seal): "Read everything, verify records, export reports. Cannot decide." Administrator (key ring): "Manage checks, responses and demo settings." Buttons: "Continue as officer / auditor / administrator".
- **Realized:** `src/components/welcome/WelcomeGate.tsx`, served at `/register` (and `/demo`) — three persona cards (named: Mara Osei, Idris Bello, Sofia Lindqvist) with detail lines and "Continue as …" buttons; the choice persists the role in `role-context` and lands on that role's first screen (officer → Alerts, auditor → Audit record, admin → Overview).
- **Interactions:** card lifts 4px on hover; selecting one slides the folder open into the opening moment (§28.7).
- **390:** navy panel shrinks to a 160px banner; cards stacked. **Error:** "We couldn't sign you in. Try again." with the `Error` link illustration.

### 29.2 Opening moment and tour
- Opening (first sign-in only, ≤ 2.5s, skippable with any key): the folder slides to centre, opens, the desk appears. Caption by role: "Your desk is ready." (officer) · "Your records are ready to check." (auditor) · "Your setup is ready." (admin).
- Tour copy and stops per §27.5 and §28.7. Notes are paper surfaces with a 96px mini-illustration. Controls: Back, Next, Skip tour. Final note: "You're set. Run your first scenario?" with button **Open demo scenarios** and link "Not now".
- Replay: help menu → "Take the tour". A small "Tour" button sits in the top bar for the first 7 days.

---

### 29.3 Overview — "The desk"
- **Copy (state-driven headline):** critical present: "14 alerts need attention. 3 are due within 4 hours." · nothing urgent: "Nothing is due today. 5 alerts are waiting." · all clear: "All clear. Everything is checked and verified." · integrity failure: "Records altered. Entry 812 doesn't match. Start there." Primary button: **View all 14 alerts** (changes to **Run tamper check** on integrity failure; hidden when all clear).
```
| Overview                                                       [View all 14 alerts] |
| 14 alerts need attention. 3 are due within 4 hours.                                 |
|-------------------------------------------------------------------------------------|
| THE DESK  (~740 x 420, paper)                    | Do these first  (380)            |
|  6 folders, desk calendar, lamp                  |  slip · Critical · 3h 20m left   |
|  folder thickness = open alerts                  |  slip · Critical · 2h 10m left   |
|  terracotta tab = critical, clock tag = due soon |  slip · High · 3h 50m left       |
|                                                  |  slip · High · Overdue           |
|-------------------------------------------------------------------------------------|
| Next: first aid renewals in 4 days.     [Policy coverage 27/38] [Audit record] [Trend]|
```
- **Hero object:** `OverviewDesk`: folders labelled Payments and thresholds · People and certifications · Vendors · Data access · Code and secrets · Regulatory deadlines. Desk calendar shows today with a flag on the next deadline. Lamp off when all clear. Hover/focus a folder → thread draws to its top alert; click → Alerts filtered to that area. Each folder has an accessible label ("Payments and thresholds, 4 open, 1 critical").
- **Do these first:** 4 paper slips with a paperclip (terracotta Critical, ochre High), one sentence (16px, 2 lines max), time left in meta. Click opens the case.
- **Footer tags:** three small paper tags (label + one fact): "Policy coverage · 27 of 38 checked", "Audit record · 1,284 entries verified", "Trend · Open alerts down for 5 weeks" (the trend is a sentence, the chart lives on the Alerts screen under "Trend").
- **Motion:** arrival assembly (§28.5); a new critical alert drops a slip onto the pile and the folder's tab turns terracotta.
- **390:** desk becomes a horizontally snapping row of folders (160px tall); slips stack below; footer tags wrap into a 2-column list.
- **States:** loading = outline folders with shimmer; empty/all clear = lamp off, plant, copy above, no button. Error: `Error` + "We couldn't load your desk. Try again."

---

### 29.4 Alerts — "Case slips"
- **Copy:** title "Alerts"; sentence "14 open. 3 due today."; segmented **Score order | Suggested order (AI-assisted)**; note under suggested: "Suggested order is advice. Risk scores come from rules and don't change."
- **1440:** filter row of index tabs (All · Payments · People · Vendors · Access · Code · Deadlines) with Severity, Status, Assignee dropdowns and search at right. Below: **slip list 440px** | **case workbench** (29.5).
- **Slip (72px, paper):** left paperclip colour by severity, sentence (16px, 2 lines), meta line "Kofi Adjei-Boateng · Structured deposits", right "3h 20m left" (terracotta under 4h). Selected slip is "pulled out": offset 8px right, outlined navy, with a teal thread to the workbench header.
- **Suggested order:** a moved slip shows "Moved up" or "Moved down" and a one-line "Why" (13px). Slips that match the score order show nothing extra.
- **Keyboard:** `j/k`, `Enter`, `e`, `d`, `/`, `?`. **Bulk:** hover reveals a checkbox; selection shows a bar "3 selected · Assign · Escalate".
- **Trend link** (top right text link): opens a sentence-titled column chart "Open alerts have fallen for five weeks" with "View as table" (per §25).
- **390:** list only; opening a case pushes a full page with a Back link; filters in a sheet.
- **Empty:** `EmptyAlerts` + "Nothing needs attention. Last checked 2 minutes ago." Filtered empty: "No alerts match these filters." + **Clear filters**.

---

### 29.5 Case workbench — "The open case file"
```
| slips 440 | Critical · 3h 20m left · Assigned to R. Mensah                          |
|           | Kofi Adjei-Boateng made 2 cash deposits just under the USD 10,000 limit |
|           | within 34 hours.                                                         |
|           | +-- paper visual (≥ 320px, full width) ------------------------------+  |
|           | Summary | Activity | How it was triggered | Policy | Draft | History |
|           |  tab content (≈ 2/3)                    | margin notes (≈ 1/3)         |
|           |-------------------------------------------------------------------- |
|           | [File report]  [Escalate to manager]                 [Dismiss alert] |
```
- **Visual per alert type (paper objects, drawn from kit parts, bound to data):**
  | Type | Object |
  |---|---|
  | Structured deposits | Two receipts standing against a ruler with a red-lined "USD 10,000" mark; a shaded 48h band between them; amounts and times on the receipts |
  | Payment without approver | A row of approval stamps (requester, approver, payer); the missing approver is an empty dashed stamp slot |
  | Separation of duties | Two sticky notes ("Wrote the change", "Applied to production") joined by a thread to the same person badge |
  | Restricted record | A chart folder with a care-team circle of badges and one badge outside the circle |
  | Leaked secret | A code card with the matching line highlighted and the key masked as a tag |
  | Expired certification | A certificate with a ribbon, issued and expiry stamps, and today's date on a strip; terracotta "Expired 19 days ago" stamp |
  | Missed deadline | A calendar page with the due date circled and today flagged |
  | Vendor document | A parcel with a tag listing required documents; missing item is an empty slot, expired item a faded tag |
- **Tabs (edge dividers):**
  - **Summary:** "Why this was flagged" (AI-assisted, 2 short paragraphs, green-grey left rule, label "AI-assisted explanation"), "Risk" ("High risk · 78" with 3 plain reasons), "Who and when", "Related alerts" (2 mini slips).
  - **Activity:** data table of events/records (when, what happened, detail, source); triggering rows have a left bar; every figure is a Source link.
  - **How it was triggered:** three paper cards in a row: "What we looked for", "What we found", "Why that matters". Link "Show rule details" expands the rule sentence and parameters; link "Try this rule on a sample".
  - **Policy:** reading column with margin notes on the right; each note: clause name, "Summary of …" or "Text of …", one plain line, match strength, highlighted span, connected to the text by a teal thread; click opens the full clause in a side panel.
  - **Report draft:** editable paragraphs with headings per report type; AI paragraphs carry the "Drafted by AI, review before filing" label until edited, then "Edited"; each paragraph has "Evidence (3)". Check line above: "All 6 policy references were found. All numbers match the evidence." (failure: "2 numbers don't match the evidence. Check paragraphs 3 and 5.")
  - **History:** the case's audit timeline (sentences + Verified ticks), "Show technical details" off by default.
- **Actions:** File report (navy) · Escalate to manager (outline) · Dismiss alert (text, separated). Dialogs per 29.20. After saving: seal stamps onto the page corner, then the inline row "Saved to audit record · 14:05 · Entry 1285". Dismiss shows an "Undo" link for 10 seconds.
- **State-based alerts:** banner "Closed automatically · renewal attached · 14:05" with a link to the evidence.
- **1680+:** margin notes stay as a right column on every tab; at 1440 they appear in the Policy tab and as a drawer elsewhere.
- **390:** visual 220px full width; tabs scroll horizontally; action bar sticks above the bottom tabs (File report main, ⋯ for the rest).
- **Loading:** skeleton page with the visual's outline. **Error:** "We couldn't open this alert. Try again."

---

### 29.6 Audit record — "The chain"
- **Copy:** title "Audit record"; sentence "1,284 entries. All verified." (failure: "Entry 812 was altered. 472 later entries can no longer be trusted."). Primary: **Run tamper check**.
- **1440:** `ChainBand` across the top (full width, 180px): paper links with entry numbers, newest at right, drag or scroll, mini-map under it. Below: filter chips (What happened · Case · Person · Date) and the **timeline** (data surface): sentence entries with Verified ticks and links to the case or evidence ("R. Mensah filed this report · 14:05"). Right detail panel 400px: plain key-values of what was recorded, Verified status, **Show technical details** (hash, previous entry, copy buttons).
- **Event names (plain):** Alert raised · Evidence saved · Report drafted · Decision recorded · Report filed · Alert dismissed · Alert escalated · Alert closed automatically · Obligation confirmed · Checks completed · Response taken · Response undone · Audit pack created.
- **Tamper check:** pulse travels the chain; on success a seal stamps on the band; on failure the tear (§17) and a red link at the exact entry with "Go to entry 812".
- **Demo mode extras:** "Simulate tampering" / "Restore" beside the primary button.
- **390:** band 120px; timeline stacked; detail as a sheet. **Empty:** "No entries yet." + sealed folder.

---

### 29.7 Policy coverage — "The pinboard"
- **Copy:** title "Policy coverage"; sentence "27 of 38 obligations are fully checked. 7 have no check."; primary **Upload a policy**.
- **1440:** a thin full-width stacked bar (Checked · Partly checked · No automated check) acts as the filter; below, `CoveragePinboard` (≈ 480px): obligation cards pinned to a cream board. Checked = teal thread to a small rule tag; partly = thread stops halfway with a knot; gaps = loose card with a dangling thread end and the words "No automated check". Toggle **Pinboard | List** (list = §24.7 table).
- **Card:** obligation in plain words (16px, 3 lines), the policy it comes from (13px), status word. Selecting a card opens a **pinned note** on the right (400px): the policy text with the quote highlighted, rule (or "Choose a rule" dropdown for gaps), last passed date, and an **AI-assisted suggestions** block ("A check that would cover this: …") visibly separate from findings.
- **Interactions:** "Connect to a rule" animates the thread to the chosen tag and writes "Saved to audit record".
- **390:** list view by default; pinboard hidden. **Empty:** blank pinboard + "Upload a policy and we'll find the obligations in it."

### 29.8 Obligations review — "Follow the thread" workflow
- **Frame:** stepper drawn as a thread with three knots: **Upload · Review · Done**. Page title "Review what we found".
- **Upload step:** a paper dropzone (illustrated sheet sliding into a folder). Copy: "Drop a policy here. PDF, Word or text." Error: "We couldn't read this file. Try a PDF or a text file."
- **Review (1440):** left (60%) the policy as a paper page with each proposed obligation highlighted; right (40%) **Found in your policy: 9 items** as slips with type chip (Recurring, Deadline, Requirement, Threshold, Prohibition), the sentence, suggested rule (labelled as a suggestion), buttons **Confirm · Edit · Not an obligation**. Sticky bar: "6 confirmed · 3 left" + **Save confirmed items** (navy). Click a slip ↔ highlight scrolls and pulses.
- **Done:** a seal stamps; summary "6 obligations saved to the audit record. 4 are checked automatically, 2 have no check yet." Buttons: **See coverage** (navy), "Upload another".
- **390:** tabs Policy text | Found items; sticky bottom bar.

---

### 29.9 Deadlines — "The wall calendar"
- **Copy:** title "Deadlines"; sentence "3 deadlines in the next 30 days. 1 is overdue."; primary **Add a deadline**.
- **1440:** left (≈ 720px): `WallCalendar` month page with tear-off paging; flags on dates (terracotta Overdue, ochre due within 14 days, navy later). Right (≈ 440px): agenda grouped **Overdue · Next 14 days · Later** as data rows (obligation, owner, due date, "in 6 days"). Select a flag or row → side panel: obligation quote and source policy, owner, completion history, **Mark as completed** (requires evidence upload, then seal).
- **Interaction:** demo "Move date forward" flips pages and slides flags; flags that pass today turn terracotta with a 160ms colour change.
- **390:** agenda list with a small month strip on top. **Empty:** "No deadlines in the next 30 days." + a tidy calendar illustration.

### 29.10 Evidence — "The filing cabinet"
- **Copy:** title "Evidence"; sentence "412 pieces of evidence. All verified."; primary **Add evidence**.
- **1440:** `EvidenceCabinet` (≈ 260px tall): five drawers (Snapshots · Documents · Checks · Decisions · Code checks) each with a count. Selected drawer slides open, revealing the table below it (data surface): title, source, collected, linked alert or obligation, Verified tick. Right panel 400px: readable key-values of the content, "Snapshot taken when the alert was raised" where relevant, linked items, **Show technical details**.
- **390:** drawers become 5 chips; table as stacked rows. **Empty:** open empty drawer + "Nothing saved here yet."

### 29.11 People and certifications — "Ribbons"
- **Copy:** title "People and certifications"; sentence "47 people. 3 certifications expired and 5 expire within 30 days."; primary **Add certification**.
- **1440:** `CertificateRibbons`: one ribbon per certification type (First aid, AML training, Fire safety …) across a 90-day span with person badges placed by expiry date; expired badges sit at the terracotta end; today is a pinned flag. Below: table (person, role, certification, status "Valid · Expires in 12 days · Expired 19 days ago", expiry, related alert). Right panel: person's certificates, what their role requires, related alert, **Attach renewal** (upload → evidence saved → alert closes automatically → seal + "Closed automatically").
- **390:** ribbons collapse to a list of "Needs attention" people; table as stacked rows. **Empty:** "No people yet. Import a list or use the demo data."

### 29.12 Vendors — "The shelf"
- **Copy:** title "Vendors"; sentence "2 vendors are missing a required document."; primary **Add document**.
- **1440:** `VendorShelf`: two shelves (Critical, Standard); each vendor a labelled parcel with a tag listing required documents (Security report, Data agreement, Insurance): filled slot = valid, faded = expiring, empty slot = missing. Below: table (vendor, tier, owner, last review "11 months ago", status). Right panel: documents with expiry strips, review history, related alerts, **Request renewal** ("Draft only. Nothing is sent.").
- **390:** per-vendor rows with three small status chips.

### 29.13 Reports — "The stack"
- As §23.2 with the creative layer: generator on the left (period presets Last 30 days · This quarter · Custom; area chips; live preview "14 alerts · 412 evidence items · 9 decisions"; primary **Generate audit pack**). Right: `ReportStack` (pages fan out as options are chosen; a seal drops on the top page when generated). Below: **Previous exports** as a drawer of sealed packs (table: name, period, created by, date, Verified, Download, Verify). Panel "How this report was produced" (plain: what is automated, where AI helps, what it can't do). SAR-style drafts: "3 ready. Open them from the case."
- **390:** presets as chips, sticky **Generate audit pack**.

### 29.14 Rules — "Recipe cards"
- **Copy:** title "Rules"; sentence "8 checks run automatically."
- **1440:** left list of rule cards (name, area, on/off dot, last triggered). Right detail on a large paper card: the rule as a serif sentence with slot chips ("If **the same person** makes **2 or more cash deposits** each between **USD 9,000 and 9,999** within **48 hours**, flag it as **High**."), "What it protects against" (policy references), "Settings" (read-only; admins can edit, every change is recorded), **Try it on a sample** (choose a sample, **Run**; a slip slides through the card and stamps "Would flag" or "Would not flag" with what matched). Technical rule tree under Show technical details.
- **390:** list → pushed detail.

### 29.15 Policies — "The reading desk"
- **Layout:** left list (Your policies · Regulations, search). Centre a paper page (72ch, serif 18px/28px) with the clause outline in a sticky rail on the right. Labels: "Demo policy document", "Summary of 31 CFR § 1020.320". Under each clause: "Used by these checks" chips and "Obligations found here: 4". Toggle "Show obligations" highlights quotes.
- **Empty:** "No policies yet. Upload one." with an empty reading desk.

### 29.16 Sources — "The mailroom"
- **Copy:** title "Sources"; sentence "4 sources are reporting. 1 needs attention." Badge "Demo connections".
- **Hero:** `Mailroom`: envelopes travel from "Your systems" through the local agent inside a dashed "Stays inside your network" boundary into ComplianceIQ; caption "Sends fingerprints of records, never the records themselves." A delayed source shows an envelope stuck at the boundary with "Delayed".
- **Below:** table (source, what we watch, status dot + word, last check). Row panel: recent activity, **Simulate a delayed source** (demo).

### 29.17 Responses — "Switch cards"
- **Copy:** title "Responses"; sentence "2 responses are on. Both only suggest."
- **Layout:** stack of paper cards. Each: the response as a sentence ("If someone turns off two-step sign-in, suspend their access token"), a three-position switch **Off · Suggest only · Automatic** (default Suggest only), and the **Trigger → Action → Recorded** strip as a thread through three stamps. Choosing Automatic opens a dialog: "This will act without anyone approving it. Actions are saved to the audit record and can be undone." Below: **What happened** table (when, what, result, **Undo** where possible).
- **Empty:** "Nothing has run yet."

### 29.18 Settings — calm
- Left tabs (desktop) / list (phone): **Profile and role · Appearance** (theme, row density Comfortable/Compact, **Reduce motion**) · **AI-assisted writing** (status "On", "Using saved examples" or "Off"; plain paragraph on what AI does and cannot do) · **Demo data** (admin: **Reset demo**; "Today in the demo: 14 Mar 2026") · **Keyboard shortcuts**.
- One small paper moment at the top (a tidy desk lamp illustration). Changes apply instantly with a quiet "Saved" row; Reset demo needs a confirm dialog.

### 29.19 Demo scenarios — "The clipboard"
- Right drawer 440px (bottom sheet on phone), a paper clipboard. **Run a scenario:** eight tear-off cards (Structured deposits · Payment without approver · Separation of duties breach · Restricted record access · Leaked secret · Expired certification · Missed deadline · Vendor document lapsed), each with one sentence ("Two deposits just under the limit, 34 hours apart") and **Run**. **Time:** a small desk calendar with a dial, chips Move forward 7 / 30 / 90 days, caption after ("2 certifications expired, 1 deadline missed"). **Tampering:** Simulate tampering, Restore. **Reset demo**.
- After a run: bottom walkthrough strip (72px) with four numbered stamps and captions, "1 Activity · 2 Rule · 3 Policy · 4 Saved record", Back/Next/Close; each step highlights the matching region with the thread.

### 29.20 Dialogs, command palette, help
- **Dialog pattern (paper surface, 480px):** verb title; one sentence of exactly what will be saved; optional fields; Cancel (left) and the confirm (navy; red only if destructive). File report: "This saves your decision and the report to the audit record. It can't be edited afterwards." Dismiss alert: reason list (Reviewed and not suspicious · Duplicate · Approved exception · Data error) + optional note; "You can undo this for 10 seconds." Escalate: "Choose who should look at this next." + person dropdown.
- **Command palette (`⌘K`):** paper panel 640px; sections Recent · Go to · Alerts · People · Policies; no results: "Nothing matches. Try fewer words."
- **Help menu (`?`):** Take the tour · Keyboard shortcuts · What do these words mean? (opens the vocabulary list) · Send feedback.

### 29.21 Tier 2 and 3 screens
- **Questionnaires — "The forms desk" (T2):** stepper thread Upload · Check columns · Review answers · Download. Review shows each question as a slip with its answer on a paper card, **Based on:** policy quote and evidence items with Verified ticks and date; unanswerable: "No evidence found. Needs your answer."; bar "Accept all answered (24)" + **Download filled file**.
- **CI gate — "The gatehouse" (T2):** a barrier-gate illustration (down = Blocked, up = Passed). Sentence "Last deploy check: blocked. 1 secret found in a commit." Timeline of checks, finding panel with the masked line, evidence and audit entry, "Fixed in a later check · 14:20". Setup block "Add this check to GitHub" with a copyable snippet.
- **Training readiness — "The conveyor" (T3):** Data → Personal data check → Consent check → Training drawn as three gates on a conveyor; the failing gate is closed with a terracotta tag. Sentence "Training run blocked: 3 columns still contain personal data." Checklist below with plain reasons and policy links. Wording: "readiness", never "compliant".

### 29.22 Empty, loading and error scenes (one per screen, small illustration + one sentence + one action)
| Screen | Empty | Loading | Error sentence |
|---|---|---|---|
| Overview | tidy desk, lamp off, plant: "All clear. Everything is checked and verified." | outline folders shimmer | "We couldn't load your desk. Try again." |
| Alerts | tidy desk: "Nothing needs attention." | slip skeletons | "We couldn't load alerts. Try again." |
| Audit record | sealed folder: "No entries yet." | chain skeleton | "We couldn't verify the record. Run the check again." |
| Policy coverage | blank pinboard: "Upload a policy and we'll find the obligations in it." | pins skeleton | "We couldn't read this policy. Try a PDF or text file." |
| Deadlines | tidy calendar: "No deadlines in the next 30 days." | calendar skeleton | "We couldn't load deadlines. Try again." |
| Evidence | empty drawer: "Nothing saved here yet." | drawer skeleton | "We couldn't load evidence. Try again." |
| People, Vendors, Reports, Rules, Policies, Sources, Responses | one scene each from the kit with an invitation sentence and a verb button | skeleton in the hero's shape | "We couldn't load this page. Try again." |
Error pages use the dropped-link `Error` scene with **Try again** and "Show technical details".

### 29.23 Responsive summary (390)
Bottom tabs (Overview · Alerts · Evidence · Reports · More). Hero objects simplify: Overview desk = horizontal folder scroller; Pinboard/Calendar/Cabinet/Ribbons/Shelf collapse to lists with a small illustrated header (120px). Case: visual 220px, tabs scroll, sticky action bar. Dialogs become bottom sheets. Tour notes anchor to the bottom with the thread drawn to the target.

### 29.24 Per-screen done checklist (copy into the agent's checklist)
- [ ] Layout matches the 1440 sketch and the 390 behaviour; sizes per §22.
- [ ] Hero object built from kit parts, bound to real data, has a list/table alternative and an accessible name.
- [ ] Copy matches this section word for word (change only with owner approval).
- [ ] Empty, loading and error scenes exist.
- [ ] Seal, thread, tear or time slide used where specified, and not elsewhere.
- [ ] Screenshots at 1440×900, 1920×1080 and 390×844; reduced-motion and keyboard-only runs pass.

## 30. Legibility, urgency, lists and first-run guidance (OVERRIDES conflicting rules above)

Audience reminder: users include older and less technical people, on ordinary screens, in bright rooms. Design for the slowest reader, not the fastest.

### 30.1 Legibility fix (colour, weight, size)
- **Remove `--text-3` for text.** Light theme tokens: `--text:#14171A` (≈ 16:1), `--text-2:#43484E` (≈ 8.8:1). Dark: `--text:#F2F0EB`, `--text-2:#C9CBCF` (≥ 9:1). Nothing lighter may be used for any text. `--text-3` survives only for disabled controls and decorative icons.
- **Contrast rules:** body and meta text ≥ 7:1; large text and UI parts ≥ 4.5:1. Status text uses darker variants on light backgrounds: `--critical-text:#8B1E1E`, `--high-text:#6B3500`, `--ok-text:#08483E`, `--info-text:#142C4C`. Never grey text on a grey or tinted panel.
- **Weight:** meta and labels 500 (not 400); obligation and alert sentences 500–600 so the eye lands on them first; quotes and secondary text 400 in `--text-2`.
- **Minimum sizes:** body 16px, meta 14px (replaces 13px), table cells 16px, buttons 16px; hit targets 48px.
- **Settings > Appearance:** **Text size** Standard · Large · Extra large (root 16 / 18 / 20px) and a **High contrast** theme (black on white, 2px borders, no tints). Applies instantly, remembered per user.
- **Check:** `scripts/check-contrast.ts` computes the ratio of every text-token/background pair and fails the build under 7:1 (body/meta) or 4.5:1 (large). axe-core runs on every route. **Status: 204/204 pairs pass** (unit test `tests/unit/contrast.test.ts`).

### 30.2 Urgency system (so nothing important is easy to miss)
Every date or time left in the app uses one component, `<Due />`, with four levels computed from time left:
| Level | When | Treatment |
|---|---|---|
| Calm | > 7 days | Plain text: "Due 24 Oct" |
| Soon | ≤ 7 days | Ochre clock icon + "Due in 5 days" (600 weight) |
| Urgent | ≤ 24 hours | Light-terracotta chip, clock icon, bold "Due in 6 hours" (18px); 4px terracotta bar on the row |
| Now | ≤ 4 hours or overdue | **Solid terracotta chip, cream text, 18px bold**: "Due in 38 minutes" or "Overdue by 3 days"; row tinted terracotta 8%; one-time pulse on first view and when crossing the threshold |
Always an icon + words + colour (never colour alone). Time shown human-style ("3 hours 20 minutes"), absolute time beside it ("Today 17:30"), no seconds.

**Where urgency must surface (so it finds the user):**
- **Due-now banner:** a sticky paper strip under the top bar on every screen while any item is at Now level: "1 alert is due in 38 minutes." + **Open it**. Cannot be closed permanently; **Remind me in 30 minutes** snoozes it.
- **Sign-in note:** if any item is Urgent or Now, a paper note appears once after sign-in: "Before you start: 2 items are due within 4 hours." with an **Open** button per item and **Go to Overview**.
- **Top bar:** a "Next deadline" chip with the nearest due item and countdown, always visible (hidden only when nothing is due within 7 days).
- **Browser tab:** title prefix "(2 due now)" and a favicon badge.
- **Overview:** the desk's calendar flag and the folder's clock tag follow the levels; "Do these first" sorts by Now → Urgent → severity; each slip has a 4px **time bar** along its bottom edge that fills as the due time approaches (colour follows the level).
- **Deadlines screen:** a large **Next deadline** card at the top (paper surface, 140px): serif countdown at 40px ("2 days 3 hours"), what it is, owner, and the one action (**Open** or **Mark as completed**), above the wall calendar.
- **Case header:** the time chip sits top right at 20px; at Now level the whole header gets a terracotta 4px top rule.
- Optional (needs owner approval, out of scope in MASTER §13): a daily digest email. In demo it is drawn as a "Draft digest" preview only.

### 30.3 Policy coverage, redesigned (no text walls)
Why it failed: plain list, faint text, no hierarchy, no illustration, no paging.
```
| Policy coverage                                              [Upload a policy] |
| 27 of 38 obligations are fully checked. 7 have no check.                        |
|---------------------------------------------------------------------------------|
| [ banner: 7 obligations have no check. Start with the 2 with the highest risk.  |
|   [Review gaps] ]                                                               |
| +-------------------+ +-------------------+ +---------------------------+       |
| | seal on a thread  | | thread stops mid  | | loose card, dangling end  |       |
| | 27  Fully checked | | 4  Partly checked | | 7  No automated check     |       |
| | "Checked daily."  | | "Some evidence    | | "Nothing watches these."  |       |
| |                   | |  is missing."     | | [Fix these first]         |       |
| +-------------------+ +-------------------+ +---------------------------+       |
|---------------------------------------------------------------------------------|
| Grouped by policy   [search] [Status ▾] [Owner ▾]       view: Groups | Pinboard | List |
| ▾ Access Control Policy  9 obligations   ████████▒░  (8 checked, 1 gap)         |
|    row · row · row (gaps open by default)                  Show 8 more          |
| ▸ Payment Approval Policy 7 obligations  ███████                                |
| ▸ Vendor Management Policy ...                                                  |
|                                       Showing 1–25 of 38   ‹ 1 2 ›   25 per page ▾|
```
- **Three status cards** (paper surfaces with illustration, 48px serif number, plain label, one-line meaning): Fully checked (teal seal on a thread to a rule tag), Partly checked (thread that stops with a knot), **No automated check** (loose card with a dangling thread end, terracotta border, button **Fix these first**). They act as filters (selected state = navy outline + tint). These are illustrated status filters, not KPI tiles: no sparklines, no trend arrows.
- **Gap banner:** one sentence, one button. Ranking of gaps is deterministic (obligation type Deadline/Threshold first, then Requirement, then Recurring; then policy criticality), never AI.
- **Groups by policy:** accordion per document with a 12px segmented bar (checked / partly / none) and counts. Groups with gaps start open, all others closed. Each group shows 8 rows then **Show 8 more**.
- **Obligation row (72px):** left a 32px state icon (seal · half-thread · loose end); the obligation in plain words at 17px/600 in `--text`; under it the policy quote in serif 16px italic in `--text-2` with the matching phrase **highlighted** (`mark`: ochre 35% background, 2px ochre underline), e.g. "…must be completed **every January**…"; right: status word chip and for gaps a button **Connect to a rule**; for checked rows a teal chip "Checked daily · Payment approval check".
- **Pinboard view:** cards pinned on the board with the same threads; 24 cards per board page with pagination.
- **Detail panel (420px):** the policy text with the quote highlighted, the rule or "Choose a rule", last passed date, and the **AI-assisted suggestions** block (labelled, separate, never counted).
- Empty: blank pinboard + the three-step guide from 30.5.

### 30.4 Lists and pagination (applies everywhere)
- **Any list over 25 items paginates:** default 25 per page (options 10/25/50/100), "Showing 1–25 of 312", Previous · numbers · Next, keyboard operable, state kept in the URL and preserved when you return from a detail. **No infinite scroll.**
- **Group before you page:** Alerts group by urgency with sticky headers ("Due now (3)", "Due today (4)", "This week (5)", "Later (2)"); People by department; Evidence by drawer; Policy coverage by policy; Deadlines by Overdue / Next 14 days / Later.
- **Tables:** sticky header, sortable columns, search, filter chips, row count always visible, 48–52px rows, zebra none, `--text` on `--surface` only.
- **Audit record (can reach thousands):** timeline shows 50 entries with **Load earlier entries** and a **Jump to date** control; chain band stays full length.
- **Previous reports:** 10 per page. **Pinboard:** 24 cards per page. **Evidence drawer:** 25 per page.
- **Saved views:** "Due today", "Critical", "Mine" as one-click chips.

### 30.5 Zero-data start: guidance on every screen
Assume the app opens **empty** (a real organisation, no demo data).
**A. Start choice** (first sign-in of an admin): two paper cards: **Explore with sample company data** (demo data) · **Set up my own** (empty, with import templates). Switchable later in Settings > Demo data.
**B. Setup guide (replaces the desk on Overview until finished):** a paper "blueprint" with a thread through six steps, each a card with a small illustration, a time estimate and one button; the next step is highlighted, others dimmed but openable; progress "2 of 6":
1. Add your policies ("About 5 minutes") → Upload a policy
2. Confirm what we found ("About 10 minutes") → Review obligations
3. Add people and certifications ("About 5 minutes") → Import a list (CSV template download with example rows and column help)
4. Add vendors ("About 5 minutes") → Import or add one
5. Connect sources ("About 10 minutes") → Connect (demo connections labelled)
6. Run your first check ("1 minute") → Run checks now
When finished, a seal stamps ("You're set up") and the desk takes over. Reopen from Settings > **Setup guide**.
**C. "About this screen" panel on every screen:** a collapsible paper strip under the page header, open on first visit, collapsed afterwards, reopened with the **How this works** link beside the title and from the help menu. Three parts: *What this is*, *What you can do* (≤ 3), *What happens next* (copy in 30.6).
**D. Empty states that teach:** each empty scene has a primary action, a **Learn how** link, and a **greyed example** (clearly marked "Example. Not real data.") showing what a real row or card will look like, so people see what they are building towards.
**E. Next best step strip:** one slim paper strip under the page header at most, context-aware ("No alerts yet. Checks run every hour. Add policies so there is something to check." + **Add a policy**). Dismissible per item; never used for errors.
**F. First-use coach marks:** shown once per feature: first case opened (hotspots on "Why this was flagged", Policy, File report), first policy upload, first deadline. Settings > "Show tips" turns them off.
**G. Tour variants:** "Starting from scratch" tour begins with the Setup guide; the demo tour stays as §27.5.
**H. Always-available help:** a **?** button at the bottom of the sidebar opens a help panel: *About this screen · Words explained · Take the tour · Setup guide · Keyboard shortcuts*. Technical terms (AML, SAR, SOC 2) get a dotted underline and a one-sentence tooltip on first use per page.
**I. Lifecycle explainer** (shown on empty Overview and empty Alerts): a 4-step illustration "Spotted → Explained → You decide → Saved to the record", with **Run a demo scenario** in demo mode and **Add policies** otherwise.

### 30.6 "About this screen" copy
| Screen | What this is | What you can do | What happens next |
|---|---|---|---|
| Overview | Your desk: what needs you now. | Open an alert · Check what is due next · Follow setup steps. | Your decisions are saved to the audit record. |
| Alerts | Everything the checks flagged. | Open a case · Filter and sort · Change the order. | Open a case to read why and decide. |
| Case | One flagged item, explained. | Read why it was flagged · Check the policy · File, escalate or dismiss. | Your decision is saved and can't be edited. |
| Deadlines | Dates that must not be missed. | See what is due · Mark one completed with proof · Add a deadline. | Completed items close their alerts. |
| Evidence | Proof saved at the moment something was flagged. | Open an item · Add a document · Check it is verified. | Evidence appears in your audit pack. |
| Audit record | A permanent log of every decision. | Run a tamper check · Open any entry. | Auditors can verify it themselves. |
| Reports | Reports an auditor can check. | Generate an audit pack · Open a drafted report. | Each pack records its own proof. |
| Policy coverage | Which policy rules are checked automatically. | Upload a policy · Connect gaps to a check. | Checked rules raise alerts when broken. |
| Policies | The documents the checks are based on. | Read a policy · See which checks use it. | Obligations found here feed Policy coverage. |
| People | Who is qualified for their role, today. | Add or import people · Attach a renewal. | Expiring certificates raise alerts. |
| Vendors | Whether each vendor has the paperwork we require. | Add a vendor · Attach a document · Request a renewal. | Missing documents raise alerts. |
| Rules | What the system checks, in plain words. | Read a rule · Try it on a sample. | Rules run automatically every hour. |
| Sources | What feeds the system. | See what is reporting · Check delays. | Activity from sources is checked by the rules. |
| Responses | What happens automatically when something is flagged. | Choose Off, Suggest only or Automatic. | Every action is saved and can be undone. |
| Settings | Your preferences and demo options. | Change text size · Turn tips on or off · Reset the demo. | Changes apply straight away. |
| Demo scenarios | A fast way to see the system work. | Run a scenario · Move the date forward. | The app shows what changed and why. |

### 30.7 Acceptance additions (§11)
- [ ] Contrast script passes; Text size Large and Extra large and High contrast render without clipping.
- [ ] `<Due />` is the only way dates and countdowns appear; all four levels exist in the styleguide; the due-now banner and sign-in note work.
- [ ] No list over 25 rows without pagination or grouping; Policy coverage matches 30.3.
- [ ] **Empty-data run:** with no seed data, screenshot every screen; each shows guidance (About panel, empty scene with example, next best step) and a primary action; the Setup guide reaches "You're set up" with real imports.
- [ ] Usability study (§18) includes at least 2 participants aged 55+. Task: "Find what is due soonest" in under 10 seconds with no help.




