

# GLOBAL CONSTANTS & HARD CONTRACTS

These rules apply to ALL scenarios. Wire them once, reuse everywhere. Mismatched implementations across scenarios are a bug.

## Working-Day Mode Contract

Define ONE shared utility used by every date computation:

```
addDevelopmentDays(start, n, mode)
```

**Mode 定義:**

| Mode | 工作日 | 排除 |
|------|--------|------|
| `'normal'` | Mon–Fri | Sat, Sun, holidays |
| `'build'`  | Mon–Sat | Sun, holidays (Sat 算工作日) |

**Mode 對應任務:**

| Mode | 適用任務 |
|------|---------|
| `'build'`  | SMT Build, Pre-Build, Main Build, SW PVR, MV-R1, MV-R1 Issue Verification, MV-R 2 (anchor) |
| `'normal'` | MB CKD, MB Bring-up, System Testing, Factory OOBA, G.O., PLD, CFZ, RTM, PR, FOD, FCS, all Planning checkpoints |

## Holiday-Aware ME/Prep Span Contract

The Ground-up ME / material-preparation tasks — **T0 Trail Shoot, T1 ME Sample Preparation, ME parts preparation for SI build, ME parts preparation for PV build, ME Parts for PVR** — are **holiday-aware spans**, NOT raw calendar-day spans. (Older revisions modelled them as raw `start + N cal days`; that let the span sit on top of national holidays such as China National Day 10/1–10/9 and was a recurring defect.)

Rules (single source of truth — all five tasks + the connectors between them follow this):

| Aspect | Rule |
|--------|------|
| Saturday | **算工作日** (counts) |
| Sunday | hard off — never a start/end, never consumes span |
| National / user holidays | skipped; they **extend** the span (end pushes later) — work never lands on a holiday |
| Start | `nextWorkingDay(prev end + 1 cal day, holidaySet, includeSat=true)` — never lands on Sun/holiday |
| End | `addWorkingCalendarDays(start, durDays, holidaySet, includeSat=true)` where `durDays` = Nth **working** day inclusive of start |

`durDays` per task (chosen so a Sun/holiday-free window reproduces the legacy calendar offset exactly — i.e. spans only stretch when they actually cross a Sun/holiday):

| Task | `durDays` | Notes |
|------|-----------|---------------|
| T0 Trail Shoot | 5 | fixed (legacy start + 4 cal days) |
| T1 ME Sample Preparation | 7 | fixed (legacy start + 6 cal days) |
| ME parts preparation for SI build | `mePrepDays + 1` | **shared editable N** |
| ME parts preparation for PV build | `mePrepDays + 1` | **shared editable N** |
| ME Parts for PVR | `mePrepDays + 1` | **shared editable N** |
| *ME parts for MV build* (= MV Pre-Build `Tooling Lock down + N` floor; no rendered task) | `mePrepDays` | **shared editable N**, but as **CALENDAR days** (raw `addDays`), NOT working days — see note |

**Shared ME 備料 duration `mePrepDays`** (default **11**, user-editable inline on any ME-parts task): one value drives all four ME-parts preparations — SI build, PV build, PVR (holiday-aware **working-day** spans), and the MV Pre-Build floor. **Unit caveat:** the MV floor uses `mePrepDays` as **calendar days** (`Tooling Lock down + N` cal days, raw), *not* working days — this is deliberate so the Scenario-1 golden stays at kickoff 2025/4/8 → FCS 2026/1/2 (a holiday-aware MV floor pushed it a week to 1/9). Tooling Lock down is already snapped, so the floor is stable. Editing N re-flows the whole schedule. Separately, the **Tooling Release → T0 Trail Shoot** gap `toolingT0` (calendar days, default **38**) is user-editable inline on T0 Trail Shoot.

**Enforced**: `validation/run-validation.js` carries a HARD (gating) rule — no Ground-up range task may **start or end on a Sunday or holiday** (Saturday allowed). Any regression to raw `addDays` spans that lands an endpoint on a holiday fails the gate.

> **Tooling Lock down** = `nextWorkingDay(ME PVR end + 1 cal day)` and **Tooling Release** = `nextWorkingDay(DB Mockup Testing end + 3 cal days)` are both snapped so neither milestone lands on a Sun/holiday. (Tooling Lock down feeds the MV Pre-Build `+11` 備料 floor, so an unsnapped Sunday value had destabilised the whole MV chain.)

## Weekday-Snap Contract

| Milestone / Checkpoint | Snap 到 | 備註 |
|------------------------|---------|------|
| PLD, FOD, FCS, DB Exit, SI Exit | **Friday**       | G.O. is **not** Friday-snapped — see note below. PV Exit = CFZ so it inherits CFZ's exception. |
| **CFZ** and **System RTM** | **Friday — but if that Friday is a national holiday, move BACK to the prior working day (normally Thursday), NOT forward a week** | **Same rule for both.** Exception case rendered **amber + bold** (opportunity, not error). Applies to ALL functions EXCEPT Planning. See [CFZ / RTM holiday exception](#system-rtm-holiday-exception). |
| PR                                                       | **Thu or Fri**   | 取最早 ≥ source 的那一天 |
| RFQ Award                                                | **Monday**       | — |
| Planning checkpoints: CA, MRR, PCO, CO, RFQ Pkg, PAA     | **Thursday**     | — |

> **G.O. is NOT Friday-snapped (any engine).** A G.O. lands on whatever working day its work-week / calendar anchor produces — Ground-up & NPI G.O. routinely land on Mon–Thu; Production DB/PV/MV G.O. likewise (DB G.O. = Kick-off + 4 work weeks → next working day, *not* the next Friday). The only weekday rule on a G.O. is "never Sun/Sat/holiday" (`skipNonWorking('normal')`) plus the [G.O. Holiday Pull-In Contract](#go-holiday-pull-in-contract-hard-rule). There is no requirement — and no business meaning — for a G.O. to fall on a Friday.

### System RTM holiday exception

> **Task labels.** On the timeline (Ground-up / NPI / Production) the two PV-signal milestones are displayed as **`CFZ`** (renamed from `CFZ [BIOS&Driver&Image]`) and **`RTM`** (renamed from `System RTM`). The longer names below are the same milestones. (Generate Schedule's Excel template keeps its own names.)

**CFZ and RTM share ONE holiday rule** (`fridayOrPrevWorkday`): a milestone nominally on a Friday that, **if that Friday is a national holiday, moves BACK to the prior working day** (normally the **Thursday** before; for a long block like Lunar New Year / China Golden Week it lands on the last working day before the block) — it does **NOT** slip forward to the next clean Friday (which would defer the gate a week or more past the shutdown). Exception cases set `warn:true` **+ `warnKind:'opportunity'`** + `warnText` on the task so the timeline shows it **amber bold** (a benign holiday auto-shift, **not** an error — see [Timeline Colour Semantics](#timeline-colour-semantics)).

- **`CFZ = PLD + 7 calendar days`** (PLD is a valid Friday → nominal CFZ is a Friday). Holiday-Friday ⇒ moved back via `cfzFromPld`. Downstream **SW PVR** (`CFZ + 1`) and **PV Phase Exit** (`= CFZ`) follow the moved-back CFZ.
- **`System RTM = CFZ-nominal-Friday + 7 calendar days`** (= `PLD + 14`). **RTM is anchored on CFZ's NOMINAL Friday, not the moved-back CFZ date**, so a CFZ holiday-shift does not drift the weekly RTM cadence; RTM then independently applies the same back-to-prior-workday exception via `rtmFromCfz`.

**Applies to every function that has CFZ/RTM (Ground-up, NPI, Production, Generate) — NOT Planning.**

## Identical-Formula Rule

There MUST be exactly ONE function that converts a date delta to weeks. The metric is **working weeks** — weekends and national holidays are excluded so the number reflects true operational buffer, not calendar time:

```
function workingDaysBetween(d1, d2) {
  // Count working days in (d1, d2] honouring isHoliday().
  // Skips Sun, Sat, and any date in sharedHolidaysByYear.
}

function workWeeksBetween(fromDate, toDate) {
  return (workingDaysBetween(fromDate, toDate) / 5).toFixed(1);
}
```

DB→SI, SI→PV, PV→MV duration validations MUST all call this function with the SAME signature. Inline arithmetic for week-conversion is forbidden.

**Why working weeks (not calendar weeks):** the older `cal_days / 7` formula silently counted holiday blocks (e.g. CN National Day 10/1–10/9) as working time, so a 5.3 ww reading really meant ~3 ww of actual working time. The current `working_days / 5` formula makes "ww" mean "work weeks of operational buffer" — a 9-day holiday block inside a 28-day calendar span no longer inflates the number.

## Date-Column Width

Timeline date column is a **fixed width** so task names align across all rows. It is **114px** (widened from the legacy 78px to fit the full `YYYY/MM/DD` format at the enlarged 13px date font). The value may be retuned, but it MUST stay a single fixed width shared by every row — uniform width is what preserves task-name alignment.

Task name / date fonts are enlarged (name 14px, date 13px) while row padding (`.task-item` `3px 0`) is unchanged so vertical spacing stays the same.

## Floor (Testing → G.O.) label position

Each Testing→G.O. work-week label/pill in the floor row (`.ww-label`) starts ~1/3 into its phase (`margin-left ~34%` in a `flex-start` cell) so it visually links phase N's System Testing to phase N+1's G.O. across the chevron seam. **All three labels sit at the same height (no vertical stagger).** The label box is **~70% of a phase width** (about 3/4 of the earlier design) with the connector dashes flex-growing to fill; the font is **14px bold** — small enough that the full text (`Xx System Testing — N ww → Yy G.O.`) stays on one line inside the narrower box. The editable `N` (`.ww-week-input`) is auto-synced to **whole weeks** so it stays single-digit.

## Floor ETD Lever (Ground-up + NPI)

**Purpose.** Make the gap between a phase **G.O.** and its silicon **ETD** (Mobile→CPU, Desktop→PCH) visible on the timeline, so a planner sees how far the ETD sits past the gate and how much pulling it in recovers. The SMT floor is `MAX(G.O. + 14 cal d, ETD + leadDays)`; when the ETD wins it pushes SMT — and the whole downstream chain — later.

**Scope.** **PV G.O.** and **MV G.O.** only (the silicon-gated mid/late phases), in **Ground-up and NPI**. Production has no editable ETD UI here and is excluded. (DB/SI G.O. are not shown — not requested.)

**When it renders (minimalist gate).** A phase's rail appears **only when that phase's silicon ETD is set AND it actually pushes SMT later** (`hasSlip`). With no ETD — or an ETD that lands within the natural `G.O. + 14d` floor — **no rail at all**. So the default empty-ETD timeline (and the Scenario-1 golden) is visually unchanged.

**Anatomy** (a slim rail on a parallel row directly under the ww floor pill, aligned to the same `margin-left:34%; width:70%` so it sits beneath its G.O. label):

```
<Phase> G.O.  ──[ gap ww ]──  ◆ <CPU|PCH> ETD · <date>   SMT +<slip> ww   ⓘ
```

- **`<Phase> G.O.`** — blue (`#2952d4`); the gate the rail extends from.
- **`gap ww`** — teal `--opportunity #0d9488` (the pull-in **lever**) = `workWeeksBetween(G.O., ETD)`.
- **`◆ <CPU|PCH> ETD · <date>`** — violet (`#7b4dff`); **click to edit** (see below).
- **`SMT +<slip> ww`** — red (`#d6455f`) = `workWeeksBetween(naturalSmt, actualSmt)`, where `naturalSmt = nextWorkingDay(G.O. + 14d holiday-extended)` (see [G.O.→SMT Holiday-Aware Gap Contract](#gosmt-holiday-aware-gap-contract)) and `actualSmt` = the gated SMT. (Working-week slip — holidays inside the window are not counted; the popover shows the actual calendar dates.)
- **`ⓘ`** — opens the "why" popover.

**Edit (◆ ETD → date picker).** Clicking ◆ opens a flatpickr; picking a date sets that engine's `etas[field]` (`cpu_`/`pch_` + phase by platform), syncs the matching dark-UI input (`data-eta` for Ground-up, `data-npi-eta` for NPI), and **live-reflows** (`generateGroundupSchedule` / `generateNpiSchedule`) — same "edit on the timeline" feel as the ww-pill. The `gap`/`slip` are read-outs (you edit the ETD **date**, the work-weeks recompute).

**ⓘ popover (the "why the slip").** A floating card showing the rule `SMT = MAX(natural floor, silicon floor)` as two bars — **natural** (`G.O. + 14d`) vs **silicon** (`ETD + leadDays`) — the later one wins, with the resulting SMT date and slip. Hint: pull the ETD earlier to shrink the silicon bar; once `ETD + leadDays ≤ G.O. + 14d` the slip disappears. The popover is `position:fixed` (viewport coords) and high `z-index` so it is never clipped by the fit-scaled white card.

**Engine data.** `buildGroundupSchedule` / `buildNpiSchedule` return `etdRail: { PV, MV }`; each entry is `null` unless that phase's ETD is set (`{ field, vendor, leadDays, etd, goDate, naturalSmt, actualSmt, siliconFloor, gapWW, slipWW, hasSlip }`).

**Rendering note.** The rail is a parallel `.etd-rail-row` under the ww floor row, mirroring its flex cells (so each rail aligns under its G.O. label). It carries **`position:relative; z-index:60`** so its ◆/ⓘ controls sit above the `z-index:30` floor labels and the phase bars and actually receive clicks (otherwise they render but clicks are intercepted). The row is created only when at least one of PV/MV has a slip.

## Timeline width & fit

`.timeline-inner` has a wide design `min-width` (~1880px) and the card is **always fit-scaled** (`applyFit` sets `--fit-scale = cardWidth / innerWidth`, capped at 1) so the whole graphic scales down to the slide/card width — never enlarged beyond design size. Widening the design width is fine because the fit transform keeps it within the export card.

## FCS Formula

```
FCS = nextFriday(PR + 7 calendar days)
```

Applies to NPI, Production/OOC, and any scenario producing FCS.

## MV-R Round Count Contract (Ground-up + NPI)

**Purpose — FCS pull-in simulation.** Ground-up and NPI run **two** rounds of MV-R by default (`MV-R 1` → `MV-R 1 IV` → `MV-R 2` → `MV-R 2 IV` → `PR`). The user can drop to **one** round to simulate how much earlier PR — and therefore FCS — can land. This is the same single-round shape Production already uses (see [Production MV Phase](#mv-phase), where dropping the 2nd round moves PR ~5 working days earlier).

- A per-engine knob **`mvrRounds`** (Ground-up: `groundupState.mvrRounds`; NPI: `npiState.mvrRounds`) holds `2` (default) or `1`. **Default MUST stay `2`** so the Scenario-1 golden dates (empty-ETD Ground-up schedule) never change — the pull-in only happens on an explicit user action.
- **Delete action (the user-facing trigger):** the **`MV-R 2`** task row carries an **always-visible inline chip** labelled **`✕ MV-R 2`** (CSS `.mvr-del`, an **amber/opportunity-tinted** pill — it is a pull-in OPPORTUNITY, not an error; see [Timeline Colour Semantics](#timeline-colour-semantics) — matching the geometry of the existing `.dur-chip` / `.ww-pill` inline controls — `border-radius:100px`, JetBrains Mono 12px; not hidden by `presentation-mode`; not behind any edit mode). Clicking it does NOT do a transient view-delete — it sets `mvrRounds = 1` and **regenerates** the engine (after a confirm). Because the chain is recomputed, `MV-R 2 Issue Verification` is **implicitly dropped too** (the chain simply stops at `MV-R 1 IV`) — no dependency-graph bookkeeping needed. `MV-R 2 IV` has no independent delete; it always follows `MV-R 2`.
- **Re-anchor when `mvrRounds === 1`:** `MV-R 2` and `MV-R 2 IV` are not generated, and `PR = nextThuOrFri(MV-R 1 Issue Verification end)` (identical to the Production formula). PR + FOD + L10 China FCS + Region FCS all pull in automatically because they derive from PR.
- **Persistence:** the knob is an **engine** value, so unlike transient manual drags it **survives Generate** — the simulation stays put while the user tweaks other inputs and re-Generates to compare FCS landing dates.
- **Restore (reversible — NOT a destructive delete):** when `mvrRounds === 1`, the `MV-R 1 IV` row shows an always-visible **`↩ MV-R 2`** chip (CSS `.mvr-restore`, accent-tinted, same pill geometry) that sets `mvrRounds = 2` and regenerates, bringing both `MV-R 2` and `MV-R 2 IV` and the original PR/FCS back.
- **Reset parity:** both engines expose a **`Reset`** button in their Generate action row that restores **all** knobs — including `mvrRounds → 2` — to defaults (Silicon ETDs cleared, buffers/durations reset, Kick-off kept). Ground-up's `#gu-reset` already existed; **`#npi-reset` was added** to NPI for parity (NPI previously had no Reset). NPI also resets `mvrRounds` when the Kick-off is cleared.
- **PR-slip warning parity:** with `mvrRounds === 1`, PR is anchored on `MV-R 1 IV` end, so the Production-style PR-slip check applies — if `MV-R 1 IV` end lands on **Friday/Saturday**, `nextThuOrFri` pushes PR to next week's Thursday (~5 wd cost); mark `warn:true` on the `MV-R 1 IV` + `PR` rows (red name + dot), same as [Production §PR slip warning](#mv-phase).
- **Production** already has exactly one round structurally and is unaffected — it has no `MV-R 2` row and no `mvrRounds` knob. **Planning** is unaffected.

## PV ME Texture Optional Contract (Ground-up)

**Purpose — chassis without texture.** Some chassis designs have **no ME texture step**, so the team should not wait on `ME Texture for PV`. The user can delete that task; when it is gone, `ME parts preparation for PV build` **takes over its start date** and the PV chain pulls in.

- A Ground-up knob **`meTexture`** (`groundupState.meTexture`) holds `true` (default — texture present) or `false` (no texture). **Default MUST stay `true`** so the Scenario-1 golden dates (empty-ETD Ground-up schedule) never change — the pull-in only happens on an explicit user action. (Same golden-preservation rule as [`mvrRounds`](#mv-r-round-count-contract-ground-up--npi).)
- **Two paths for `ME parts preparation for PV build` start:**
  - **`meTexture === true` (default, unchanged):** start = `ME Texture for PV` **last day** (overlaps by 1 day; already a working day). Identical to today's behaviour.
  - **`meTexture === false` (texture deleted):** `ME Texture for PV` is **not generated**, and `ME parts preparation for PV build` **takes over the texture's start anchor** — it starts on the **18th working day inclusive from SI System Testing start** (= the date `ME Texture for PV` *would* have begun), then runs its normal `mePrepDays`+1 holiday-aware span. This pulls `ME parts preparation for PV build` ~7 working days earlier; everything downstream (PV System Pre-Build and beyond) recomputes from the earlier end. PV System Pre-Build's `MAX(PV SMT Build end, ME parts prep end, …)` absorbs the change automatically — when prep pulls in, PV SMT Build may become the gating dependency.
- **Delete action (the user-facing trigger):** the **`ME Texture for PV`** task row carries an **always-visible inline chip** labelled **`✕ ME Texture`** (CSS `.tex-del`, an **amber/opportunity-tinted** pill — a pull-in OPPORTUNITY, not an error; see [Timeline Colour Semantics](#timeline-colour-semantics) — matching the `.mvr-del` / `.dur-chip` geometry — `border-radius:100px`, JetBrains Mono 12px; not hidden by `presentation-mode`; not behind any edit mode). Clicking it (after a confirm) sets `meTexture = false` and **regenerates** the engine — not a transient view-delete.
- **Restore (reversible — NOT a destructive delete):** when `meTexture === false`, the **`ME parts preparation for PV build`** row (the task that took over the start date) shows an always-visible **`↩ ME Texture`** chip (CSS `.tex-restore`, accent-tinted, same pill geometry) that sets `meTexture = true` and regenerates, bringing `ME Texture for PV` back and restoring the original (later) prep start.
- **Persistence:** the knob is an **engine** value, so it **survives Generate** — the no-texture simulation stays put while the user tweaks other inputs and re-Generates to compare FCS landing dates.
- **Reset parity:** Ground-up's **`Reset`** (`#gu-reset`) restores `meTexture → true` along with all other knobs.
- **Scope:** Ground-up only. NPI / Production / Planning have no `ME Texture for PV` task and are unaffected.

## Holiday-Aware Milestones (HARD RULE)

**No milestone date — anywhere in any engine — may land on a Sunday or a national holiday** (and most should also avoid Saturday). When a milestone formula uses pure calendar-day arithmetic (`addDays`, `+N`, `−N`), the result MUST be wrapped in one of these shared helpers so it pushes past non-working days before being returned:

| Helper                          | Behaviour                                                                |
|---------------------------------|--------------------------------------------------------------------------|
| `nextValidFriday(date)`         | Walk forward to next Friday that is not a holiday                        |
| `prevValidFriday(date)`         | Walk backward to last Friday that is not a holiday                       |
| `nextValidThuOrFri(after)`      | First Thu/Fri strictly after `after`, skipping any holiday Thu/Fri      |
| `skipNonWorking(date, 'normal')`| Push forward past Sat/Sun/holidays — for non-snapped milestones          |
| `skipNonWorking(date, 'build')` | Push forward past Sun/holidays only (Sat OK) — for build-mode SMT starts |
| `nextWorkingDay(d, set, sat)`   | Ground-up / NPI engine version with explicit `holidaySet` parameter      |

All three engines (Ground-up, NPI, Production) wrap PLD / FCS with `prevValidFriday` or `nextValidFriday`; **CFZ with `cfzFromPld` and RTM with `rtmFromCfz`** (both = `fridayOrPrevWorkday`: a Friday that moves BACK to the prior working day on a holiday, never forward a week — see [CFZ / RTM holiday exception](#system-rtm-holiday-exception)); PR with `nextValidThuOrFri`; G.O. / Phase-Exit milestones with `nextWorkingDay(..., 'normal')` or `skipNonWorking(..., 'normal')`; SMT starts with `nextWorkingDay(..., 'build')` or `skipNonWorking(..., 'build')`. Region FCS dates (L10 China FCS + region.leadDays) are wrapped in `skipNonWorking(..., 'normal')` so a region milestone never lands on 1/1 (New Year) or other holiday.

Historical bug fixed by this rule: with Kick-off 2026-06-01, the Production CFZ chain used to land on 1/1/2027 (New Year) because PLD walked back to Christmas Day (Fri 12/25), CFZ = +7 = 1/1, PV Exit = CFZ = 1/1 — a holiday milestone in the rendered schedule.

## G.O. Holiday Pull-In Contract (HARD RULE)

**Purpose — a gate review can't be held during a shutdown, and must not be deferred past it.** Every G.O. milestone is placed by holiday-aware work-week math, so holidays inside the buffer window push it **later** — it lands on the first working day *after* the holidays. That puts the gate right after a multi-day shutdown, the worst possible slot. This rule instead pulls the G.O. to the working day **before** the shutdown. **A G.O. may only move earlier, never later.**

**Scope.** Applies to **every G.O. milestone in every engine that has one** — DB / SI / PV / MV G.O. across **Ground-up, NPI, and Production**. (Planning has no G.O.)

**Algorithm** (run *after* the existing per-engine anchor is computed):

1. `goNatural` = the G.O. date from the normal anchor (work-week buffer, holiday-aware; Production's DB G.O. natural anchor also Friday-snaps, but that does not change the pull-in below). Always a valid working G.O. day.
2. Walk **backward** from `goNatural` over the contiguous run of **non-working days** (holidays **and** weekends) immediately preceding it.
3. If that run contains **≥ 1 holiday** (`sawHoliday`), the G.O. is stranded behind a shutdown:
   - `goDate` = the **last working day strictly before the run** — identical for **all three engines** (Ground-up, NPI, Production). A G.O. is *not* required to be a Friday: in Production only the DB G.O. *natural* anchor happens to Friday-snap, while PV/MV G.O. already land on arbitrary weekdays, so the pulled date is never force-snapped to Friday (that would diverge from the natural anchor's weekday).
   - Mark the milestone **amber / opportunity** (`warn:true` **+ `warnKind:'opportunity'`**, tag e.g. `pulled before holiday`) — see [Timeline Colour Semantics](#timeline-colour-semantics). This is a schedule **opportunity** (it pulls the plan in), NOT an error, so it is amber, not red.
4. If the run is **weekends-only** (no holiday) or there is no preceding non-working run, keep `goDate = goNatural` (black, unchanged).

`goDate ≤ goNatural` always — the rule can only pull earlier.

**Worked example (the reported case).** SI System Testing `2023/9/4 → 2023/10/11`; holidays `9/29` (Mid-Autumn) + `10/1–10/10` (National Day). Natural PV G.O. = `2023/10/11` (first working day after the block). Walking back: `10/10…10/1` holidays, `9/30` Sat, `9/29` holiday → `9/28` (Thu, working). The run contains holidays ⇒ **PV G.O. = `2023/9/28`, red.**

**Downstream cascades (product decision).** The pulled-in G.O. is the new anchor for everything below it (`SMT = G.O. + 14 cal days`, … → FCS) — **the whole chain pulls in.** No task keeps the post-shutdown timing; the engine already derives all downstream tasks from the G.O. date, so no extra bookkeeping is needed. The configured *Testing → next-G.O.* work-week buffer is therefore a **target, not a hard floor**: when honouring it would strand G.O. after a shutdown, the pull-in wins and the effective buffer is shorter — an earlier gate beats a post-holiday gate.

**Override note.** This is an explicit **exception to** the existing "*holidays inside the window EXTEND the calendar gap so the working-time buffer stays intact*" behaviour (MV G.O.; Production PV/MV G.O.). That extension still applies whenever the extended G.O. lands on a clean working day; it is overridden **only** when the extension would place G.O. immediately after a holiday cluster.

**Trigger threshold (product decision).** Any holiday cluster of **≥ 1 holiday** adjacent to G.O. triggers the pull-in — a single 1-day holiday (e.g. Mid-Autumn) counts. Weekends alone never trigger it.

**Golden-data caveat (implementation gate).** Because the pull-in moves G.O. and cascades, it **can shift the Scenario-1 golden Ground-up dates** if any golden-schedule G.O. currently lands right after a holiday cluster. Before shipping, diff the golden empty-ETD schedule (kickoff `2025/4/8` → FCS `2026/1/2`) **with and without** the rule; if any golden date moves, surface it for explicit sign-off rather than silently changing the golden.

**Implementation hint.** Add one shared helper, e.g. `pullBeforeHolidayCluster(goNatural, isHol)`, called by all G.O. computations immediately after the existing anchor + forward-snap, returning `{date, pulled}` so the renderer can set the red `warn` tag. `isHol` is the engine's holiday test (`holidaySet.has(isoDate(d))` for Ground-up/NPI; global `isHoliday(d)` for Production). The pulled date is always the last working day before the cluster — no per-engine Friday branch. This keeps the logic in one place across all engines.

## G.O.→SMT Holiday-Aware Gap Contract

**Purpose — a multi-day shutdown must not silently eat the SMT prep buffer.** Every Phase SMT start sits a **`G.O. + 14 days`** natural floor after its gate (DB/SI/PV/MV, all engines). Previously this was **14 raw calendar days**, so when a holiday cluster fell inside the window (e.g. China National Day `10/1–10/9` + TW National Day `10/10`), the real working buffer collapsed to a couple of days. This rule makes the 14-day gap **holiday-aware**.

**Rule.** Walk forward from G.O.; a day counts toward the 14 **only if it is not a national/user holiday**. **Weekends still count** (the intent is "two calendar weeks, minus shutdowns" — not 14 working days). Net effect: the SMT start = `G.O. + 14 + (number of holidays in the window)` calendar days. The result is then still snapped to the next working day (build mode: Sat on, Sun + holiday off) and floored by the silicon ETD (`smtEta + etdLeadDays`) exactly as before.

**Scope.** All four SMT gates in **Ground-up, NPI, and Production** (Generate renders uploaded dates and has no SMT formula). The ETD-rail "natural floor" (`naturalSmt`) uses the same holiday-extended gap so the slip math stays consistent.

**Implementation.** One shared helper `addDaysSkipHolidays(start, days, isHol)` (counts forward, skipping only holiday days). Ground-up/NPI pass `x => holidaySet.has(isoDate(x))`; Production passes global `isHoliday`. It replaces the bare `addDays(go, 14)` inside each `nextWorkingDay(gateMax(…))` / `skipNonWorking(…)` SMT expression.

**Worked example (the reported case).** NPI, Kick-off `2026/7/10`, Mobile, no ETDs. SI G.O. = `2026/9/30`. Old SI SMT = `9/30 + 14 cal` = `10/14` (the 9-day Golden Week + TW National Day ate the buffer). New SI SMT = holiday-extended → **`2026/10/24`** (14 non-holiday days past `9/30`, landing after the cluster).

**Golden-data caveat (verified).** Changing the SMT floor cascades and can move the Scenario-1 golden. Diffed the golden empty-ETD Ground-up schedule (kickoff `2025/4/8`): **FCS stays `2026/1/2` and zero task dates move** — the golden's four G.O.→SMT windows contain no holiday clusters, so the extension never triggers there. Safe to ship without golden sign-off; re-diff if golden inputs or the holiday table change.

# STYLE

## Timeline Colour Semantics

Colour carries meaning on the timeline — keep these three buckets distinct so a hint never reads as an error:

| Bucket | Colour (token) | Meaning | Where |
|--------|----------------|---------|-------|
| **Error / hard problem** | **Red** `--danger #ff6b8a` | Something is wrong or a real risk / constraint hit | Hard-constraint banners (RTM ≤ MV Pre-Build), FCS-slip / bottleneck banners, **PVR Assembly lands on Saturday** (`⚠ Sat`), **PR-slip risk** (`MV-R 1 IV` + `PR` when single-round pushes PR ~5 wd later), holiday delete buttons |
| **Opportunity / pull-in hint** | **Amber** `--warn #ffb84d` | A chance to pull the schedule IN, or a benign auto-shift — **not** an error | **`✕ ME Texture`** / **`✕ MV-R 2`** simulation chips, **G.O. holiday pull-in** tag, **CFZ / System RTM holiday-exception** shift (moved back to Thu). Driven by `warn:true` **+ `warnKind:'opportunity'`** → renderer adds the `.opp` class (`.task-item.warn.opp` overrides the red `.warn`). |
| **Reversible action** | **Blue** `--tl-accent #2952d4` | Undo / restore the simulation | **`↩ ME Texture`** / **`↩ MV-R 2`** restore chips |

Rule: a `warn:true` task is **red by default**; add **`warnKind:'opportunity'`** to make it amber. Never recolour the red error cases to amber.

## Global Visual Style

Create a premium futuristic enterprise dark-mode dashboard.

Visual style requirements:

- Enterprise PM tool quality
- PowerPoint executive roadmap aesthetics
- Clean neon-glow dark UI
- White export-ready timeline card
- Premium spacing and typography
- High readability
- Minimalistic but high-density information layout

Use:
- Dark navy background
- Gradient highlights
- Neon cyan/blue glow
- Glassmorphism-like cards
- Rounded corners
- Thin borders
- Soft shadow depth
- Monospace timeline labels

Typography:
- Space Grotesk
- JetBrains Mono

## Timeline Visual Style

Timeline card MUST:
- use white background
- be export-ready
- resemble executive PowerPoint roadmap

Timeline phases:
- DB
- SI
- PV
- MV
- FCS

Phase bars MUST:
- use connected chevron arrows implemented with CSS `clip-path` (NOT SVG)
- use gradient blue tones for DB / SI / PV / MV
- FCS must use green gradient
- connected flow visualization (chevrons interlock)

Timeline rows MUST:
- align vertically
- prevent overlap
- support editable labels
- support editable dates

## Navigation Style

Top navigation MUST contain 5 buttons:

1. Planning
2. Ground-up Product
3. NPI Silicon / TTM
4. Production Silicon / OOC
5. Generate Schedule

Requirements:
- no page refresh
- switch views dynamically
- active tab highlight
- premium hover animation

# PLANNING

## Planning Simulation Engine

Create a planning simulation engine.

Support two modes:

### Scenario 1

73 Weeks Simulation

Fixed schedule duration simulation.

### Scenario 2

TBD Simulation

Allow user-defined work-week durations.

## Planning Inputs

Required fields:

- Project Name
- FCS Date
- RFQ ODM Candidate

FCS rules:
- FCS must land on a Friday. If the user picks another weekday, the input snaps to the **nearest** Friday (never a full forward week) and that corrected date is written back into the field.
- The (snapped) FCS date is the **exact terminal anchor** of the backward chain — the schedule table's FCS equals the input verbatim, with no further forward/holiday shifting. Every milestone is derived by working backward from this fixed endpoint.

## Planning Calculation Chain

Backward dependency chain:

CA
→ MRR
→ PCO
→ CO
→ RFQ Package Release
→ PAA
→ RFQ Award
→ FCS

Rules:

### Checkpoint Rules

| Checkpoint           | Snap Weekday |
|----------------------|--------------|
| CA                   | Thursday     |
| MRR                  | Thursday     |
| PCO                  | Thursday     |
| CO                   | Thursday     |
| RFQ Package Release  | Thursday     |
| PAA                  | Thursday     |
| RFQ Award            | **Monday**   |
| FCS                  | **Friday**   |

## TBD Duration Rules

| 區段                              | 可調?            | 預設 / 固定值 |
|-----------------------------------|------------------|--------------|
| CA → MRR                          | ✅ User custom   | —            |
| MRR → PCO                         | ✅ User custom   | —            |
| PCO → CO                          | ✅ User custom   | —            |
| **CO → RFQ Package Release**      | ❌ Fixed         | **1 day**    |
| RFQ Package Release → PAA         | ✅ User custom   | —            |
| **PAA → RFQ Award**               | ❌ Fixed         | **3 days**   |
| RFQ Award → FCS                   | ✅ User custom   | 預設 38       |

## Holiday Handling (Planning)

Planning skips exactly **one** holiday from its work-week math: **Chinese (Lunar) New Year**. All work-week segments (`subtractWorkingDays`) and checkpoint snapping exclude only the 7-day CNY block; every other holiday (CN National Day, Qingming, Labor Day, etc.) counts as normal working time and is **not** skipped. CNY dates come from the shared holiday store, so user edits to the CNY range apply. (This differs from Ground-up / NPI / Production, which exclude all TW+CN holidays.)

When a CNY block falls inside the CA → FCS window, the result card surfaces a statement **`Chinese New Year yyyy/mm/dd ~ yyyy/mm/dd`** — one entry per CNY block in range, so every Lunar New Year the plan spans is listed. (The ODM Candidate is shown in the result table column, not in this meta line.)

## Planning Result Table

Generate executive-level planning table.

Columns:

- Project Name
- CA
- MRR
- PCO
- CO
- RFQ Package Release
- PAA
- RFQ Award
- RFQ ODM Candidate
- FCS

# GROUND-UP PRODUCT

## Ground-up Product Engine (Rewritten implementer spec)

Purpose

- Single forward/backward schedule engine for Ground-up Product (Kick-off ⇄ FCS).
- Forward: given a Kick-off date compute a complete task graph from Kick-off through FCS.
- Reverse: given a target FCS date compute the required Kick-off and ETDs while preserving schedule shape.

Design principles

- Use a pure schedule engine in `ENTRY.html` and a shared renderer `renderTimeline(rootSelector, scheduleData, rerender)`.
- Keep business logic separate from DOM reads/writes.
- A single function must convert calendar delta to weeks and all duration validation uses it.

Required engine functions

- `buildGroundupSchedule(kickoff: Date|null, etas: Record[str,Date|null], opts?: object) => scheduleData`
  - Forward mode if `kickoff` is provided.
  - Reverse mode if `kickoff` is null and `opts.targetFcs` is provided.
  - Return shape: `{ inputs, phases, meta }`.
- `generateGroundupSchedule()` — reads DOM inputs, calls `buildGroundupSchedule`, stores `groundupState.scheduleData`, calls `renderTimeline('#gu-timeline-inner', scheduleData)`, and unhides `#gu-timeline-area`.

Shared utilities

- `toDate(value)` handles Date, ISO strings, Excel serials, and returns `null` for invalid values.

- `addDevelopmentDays(start, n, mode)` with exactly two modes:

  - `'normal'`: Mon–Fri only, skip Sat/Sun/holidays.
  - `'build'`: Mon–Sat, skip Sun/holidays.

- `nextFriday(date)` returns the next Friday on or after `date`.

- `nextThuOrFri(date)` returns the next Thursday or Friday on or after `date`, preferring Thursday when both are in the same week.

- `snapToWeekday(date, dow)` snaps forward to the given weekday.

- `workWeeksBetween(fromDate, toDate)` is the single shared week conversion function. Returns **working weeks** = working-days-between / 5, honouring weekends and holidays:

  ```js
  function workWeeksBetween(fromDate, toDate) {
    return (workingDaysBetween(fromDate, toDate) / 5).toFixed(1);
  }
  ```

  See "Identical-Formula Rule" in GLOBAL CONSTANTS for the full rationale.

Forward simulation contract

- Input model must include:
  - Kick-off date **OR** Target FCS date — exactly one is provided by the user. **No default Kick-off is shipped**; the page loads with both inputs empty.
  - Platform selector: `mobile` (default) or `desktop`. Drives which silicon ETD gates which step (see "Silicon ETD gating" below).
  - ETDs: `cpu_db`, `cpu_si`, `cpu_pv`, `cpu_mv_prod` (always available); `pch_db`, `pch_si`, `pch_pv`, `pch_mv_prod` (Desktop mode only). All optional.
  - Knobs: `etdLeadDays` (UI, default 10, clamped 0–120), `toolingT0` (Tooling Release → T0 gap, default **38** cal days, **user-editable inline on T0 Trail Shoot**), `mePrepDays` (shared ME 備料 duration, default **11** working days, **user-editable inline on any ME-parts task**).
- Input UI contract — Section 1 (Project Setup) **segmented Mode toggle**:
  - Two buttons: `[Drive by Kick-off]` and `[Drive by Target FCS]`. Active one is highlighted with `.is-active`. Only the active mode's input row is rendered; the other is `hidden`.
  - **Target FCS is standard-scenario ONLY (no silicon ETD gating).** Reverse-planning back-derives Kick-off = FCS − offset assuming FCS moves linearly with Kick-off; absolute ETD dates break that linearity. So the two are **mutually exclusive**: the `[Drive by Target FCS]` button is **disabled whenever any CPU/PCH ETD is set**, and entering Target-FCS mode **clears all ETDs and hides the Silicon ETD card**. Use **Drive by Kick-off** for any Mobile/Desktop ETD scenario.
  - Switching mode CLEARS the previous mode's value (state + DOM), resets `scheduleData`, and hides the rendered timeline. No `disabled` styling — the input you see is always editable.
  - In reverse mode, the derived Kick-off is **not** written into the Kick-off input field — it appears only in the generated schedule's info text (`#gu-info`).
  - On first load (no input), the action row, Silicon ETD card, Holiday card, and Timeline are all hidden.
- Input UI contract — Section 2 (Silicon ETDs) **Mobile / Desktop toggle**:
  - Two buttons: `[Mobile]` (default active) and `[Desktop]`. Mobile shows only CPU ETDs; Desktop additionally reveals the PCH ETDs section.
  - Switching to Mobile CLEARS the four PCH values (state + DOM + flatpickr instance) because PCH has no meaning on Mobile platforms.
  - Both directions trigger a regenerate when a Kick-off is already set, because the gating rules differ between platforms.
- Section 2 also exposes the **ETD → SMT lead time** numeric input (default 10, range 0–120). Editing this re-runs the chain immediately. The card's sub-text echoes the current value: "Each phase's SMT build will start at least **N** days after the corresponding silicon ETD".
- All ETD inputs use **flatpickr** (CDN-loaded, EN locale, display format `M j, Y` e.g. "May 22, 2026") so the calendar picker is locale-independent. The hidden underlying value stays in `YYYY-MM-DD` so the change handler is unchanged. If flatpickr fails to load (offline), inputs fall back to native `<input type="date">`.
- **Silicon ETD gating rules** (Phase SMT start + System Build start):
  - **Mobile**: CPU ETD gates each SMT build (DB / SI / PV / MV). System Build (MB bring up / Pre-Build) has no ETD gate — the SoC is already on the board after SMT.
  - **Desktop**: PCH ETD gates each SMT build (PCH is on the motherboard). CPU ETD gates the first System Build step of each phase (DB MB bring up; SI / PV / MV Pre-Build), because the CPU is socketed and only needed when the system powers up.
  - Lead time: `+etdLeadDays` (default 10) is added to the relevant ETD when computing the gate.
  - Any unset ETD is treated as "no gate".
- Phase SMT start formulas (after platform-aware ETD selection). The **`G.O. + 14 days`** natural floor is **holiday-aware**: holidays inside the window do not count toward the 14, so a shutdown (e.g. China Golden Week) cannot eat the buffer — see [G.O.→SMT Holiday-Aware Gap Contract](#gosmt-holiday-aware-gap-contract). Weekends still count.
  - DB SMT = MAX(DB G.O. + 14 days [holiday-extended], smtEta('db') + `etdLeadDays`).
  - SI SMT = MAX(SI G.O. + 14 days [holiday-extended], smtEta('si') + `etdLeadDays`).
  - PV SMT = MAX(PV G.O. + 14 days [holiday-extended], smtEta('pv') + `etdLeadDays`).
  - MV SMT = MAX(MV G.O. + 14 days [holiday-extended], smtEta('mv_prod') + `etdLeadDays`). The ETD only pushes MV SMT **later**; **MV G.O. is NOT recomputed** — it stays on the PV Test + `pvMvWeeks` anchor, exactly like DB/SI/PV. (Reducing `etdLeadDays` is the knob that pulls SMT back toward the G.O. + 14 floor.)
  - Where `smtEta(phase) = isDesktop ? pch_<phase> : cpu_<phase>`.
- System Build / Pre-Build start formulas — the **ME 備料 / RTM / Tooling floors apply on all platforms**; only the `cpu_<phase>` term is **Desktop-only** (Mobile has no ETD gate on System Build, because the silicon is already on the board after SMT):
  - DB MB bring up = MAX(DB MB CKD end + 1 cal day, cpu_db + `etdLeadDays` [Desktop only]), next working day.
  - SI System Pre-Build = MAX(SI SMT end + 1 cal day, ME parts preparation for SI build start + 10 cal days, cpu_si + `etdLeadDays` [Desktop only]), next working day (build mode).
  - PV System Pre-Build = next working day AFTER MAX(PV SMT end, ME parts preparation for PV build **end**), MAXed with cpu_pv + `etdLeadDays` [Desktop only] (build mode).
  - MV Pre-Build = MAX(MV SMT end + 1 cal day, System RTM + 1 cal day, **Tooling Lock down + `mePrepDays` calendar days** [備料, all platforms — the "ME parts for MV build" prep; shares the editable N with SI/PV/PVR but uses **calendar days** to preserve the Scenario-1 golden], cpu_mv_prod + `etdLeadDays` [Desktop only]), next working day (build mode). The 備料 floor (`minMvPreTooling`) is platform-independent — only the `cpu_mv_prod` term is Desktop-gated.
- G.O. rules (Ground-up Product — different anchors per phase):
  - DB G.O. = Kick-off + 4 work weeks (20 working days, normal mode).
  - SI G.O. = DB PCA & System Testing start + `dbSiWeeks` work weeks (default 4 = 20 working days, normal mode; **lands on the last day of the 20-wd testing window = DB Testing end, same day** — no +1). User-editable inline on the timeline ww-pill.
  - PV G.O. = SI System Testing start + `siPvWeeks` work weeks (default 4 = 20 working days, normal mode; equals the 21st working day inclusive). User-editable inline on the timeline ww-pill.
  - MV G.O. = PV System Testing start + `pvMvWeeks` work weeks (default 3 = 15 working days, normal mode; holidays extend the calendar gap). User-adjustable (e.g. up to 4 weeks). **Always follows this duration anchor — never recomputed by silicon ETD** (the ETD only pushes MV SMT later; see PV → MV Bottleneck).
  - No phase snaps G.O. to Friday in Ground-up Product.
  - **Holiday pull-in:** any of these G.O. dates that would land on the first working day *after* a holiday cluster is pulled back to the last working day *before* it and shown **amber (opportunity, not red)** (only earlier, never later; downstream cascades). See [G.O. Holiday Pull-In Contract](#go-holiday-pull-in-contract-hard-rule).
- Build chain rules:
  - Pre-Build start = SMT end + 1 day.
  - Main Build start = Pre-Build end + 1 day.
  - MV Main Build start = MV Pre-Build end + 1 day (next working day — immediately follows Pre-Build, skipping Sun/holidays).
- Tooling / ME chain rules (**holiday-aware spans** — see [Holiday-Aware ME/Prep Span Contract](#holiday-aware-meprep-span-contract); Sat counts, Sun + holidays skipped and EXTEND the span; every start snaps to the next working day):
  - Tooling Start = DB IUR end + 1 day.
  - T0 Trail Shoot start = nextWorkingDay(Tooling Start + `toolingT0`); T0 end = 5th working day inclusive of start (legacy "start + 4 cal days" when window is Sun/holiday-free).
  - T1 ME sample start = nextWorkingDay(T0 end + 1 cal day); T1 end = 7th working day inclusive of start (legacy "start + 6 cal days").
  - ME parts preparation for SI build start = nextWorkingDay(T1 end + 1 cal day); end = 12th working day inclusive of start (legacy "start + 11 cal days").
- SI Pre-Build gating:
  - SI Pre-Build start = MAX(SI SMT end + 1 day, ME parts preparation for SI build start + 10 days), next working day (build mode).
- MV → PR → FCS chain:
  - Factory OOBA = MV Main Build start + 3 calendar days (snap forward past Sun/holiday); ends together with MV Main Build end.
  - MV-R 1 = MV Main Build end + 1 dev day (build mode); duration 3 dev days.
  - MV-R 1 Issue Verification = MV-R 1 end + 1 dev day; duration 2 dev days.
  - MV-R 2 = MV-R 1 Issue Verification end + 1 dev day; duration 3 dev days.
  - MV-R 2 Issue Verification = MV-R 2 end + 1 dev day; duration 2 dev days.
  - PR = nextThuOrFri(MV-R 2 Issue Verification end), strictly after.
  - FOD = PR + 1 dev day (normal mode).
  - FCS = nextFriday(PR + 7 calendar days).

Reverse planning contract

- Reverse mode must preserve schedule shape.
- Given `targetFcs`, compute current forward schedule from default inputs, then shift Kick-off and all silicon ETDs by `delta = targetFcs - currentFcs`.
- Return the shifted Kick-off and ETAs in `scheduleData.inputs` so the UI can populate inputs back.

Shared silicon special case

- Ground-up Product does not branch on shared/separate silicon. SI G.O. always follows DB PCA & System Testing:
  - SI G.O. = DB PCA & System Testing end (**same day** — DB Testing is 20 wd, so `dbSiWeeks`×5 lands on its last day; no +1).
  - SI SMT base = SI G.O. + 14 days (**holiday-extended** — holidays inside the window don't count; see [G.O.→SMT Holiday-Aware Gap Contract](#gosmt-holiday-aware-gap-contract)), **then floored by `smtEta('si') + etdLeadDays`** (Mobile: cpu_si; Desktop: pch_si). When both fields are blank the floor is inactive and SI SMT = SI G.O. + 14 (holiday-extended).
  - Downstream SI tasks compute from this SI SMT using the standard SI rules.
- `cpu_si` / `pch_si` are now active gates (previously informational). If the silicon arrives later than SI G.O. + 14, the SMT slips accordingly.

Validation output

- The engine must calculate and expose duration validation rows for:
  - DB Testing Start → SI G.O.
  - SI Testing Start → PV G.O.
  - PV Testing Start → MV G.O.
- Each row must use the shared `workWeeksBetween` function.
- Result colors:
  - `>= 4.0` weeks = green.
  - `>= 3.0` weeks = amber.
  - `< 3.0` weeks = red.

UI behavior requirements

- Ground-up must show the Generate action row when a valid Kick-off (user-entered) OR Target FCS is present.
- `#gu-generate` must exist and be enabled as soon as Kick-off (Kick-off mode) or Target FCS (Target-FCS mode) is set in state.
- Clicking Generate must compute and render the full DB/SI/PV/MV/FCS schedule.
- **Target FCS is Generate-gated too (NOT auto-render).** Selecting `Drive by Target FCS` or entering a Target FCS date does **NOT** immediately compute/render — it only stores the target (plus a provisional Kick-off that drives the holiday-card year and enables Generate) and drops any shown schedule. The reverse back-schedule (2-pass: rough Kick-off = FCS − offset, then snap-delta correction) runs **only when the user clicks Generate**. The derived Kick-off is NOT written into `#gu-kickoff`. The 2-pass is **idempotent** — pass 1 always re-derives Kick-off from the target, so repeated Generate never ratchets.
- The Kick-off and Target FCS inputs are presented as a **segmented Mode toggle**, not as two simultaneously visible (mutually disabled) inputs. Only the active mode's input is rendered; switching mode clears the previous value.
- The Silicon ETD card uses the same segmented pattern for **Mobile / Desktop platform** — switching to Mobile clears all PCH ETD values.
- The Schedule Template upload section (formerly Section 4) has been **removed**. The engine always uses the built-in `buildGroundupSchedule()` chain.
- All Ground-up timeline cards default to **Fit to Width** (no toggle button). The `.timeline-card` element gets `.fit` class on load and `applyFit()` runs on resize / re-render via MutationObserver. The previous "Fit to Width" / "Actual Size" toggle button is removed.
- Displayed total weeks uses one decimal place (e.g. "38.4 weeks"). This makes Friday-snap slack at FCS visible without flipping integer week counts at the Math.round boundary.
- `renderTimeline()` must be shared with other scenarios.

### Δ vs GOLDEN STANDARD CASE (toolbar info, line 2)

The Ground-up timeline toolbar `#gu-info` shows **two rows**. **All UI text is English.**
1. `Generated · Kick-off … → L10 China FCS … · NN.N weeks` (existing).
2. **`#gu-delta-info`** — compares THIS run's total duration against the **golden standard case** and explains the delta by the holidays inside this run's chain.

- **Golden reference** = Kick-off **2025/4/8 → FCS 2026/1/2 (≈38.4 weeks)**, built once and cached (`guGoldenReference`) with the **DEFAULT knobs** (buffers 4/4/3, `toolingT0` 38, `mePrepDays` 11, Pre-Build 4/4, `mvrRounds` 2) and the **canonical built-in holidays** — so it stays fixed regardless of the user's current knob / holiday edits. The knob override is wrapped in `try/finally` to restore live state. `deltaDays = (curFCS − curKickoff) − refTotalDays`.
- **Headline:** a colored pill badge — `▲ +X.X wk (+Nd)` amber when longer, `▼ −X.X wk` green when shorter, `= ±0` neutral — plus the reference label `vs standard case (2025/4/8 → 2026/1/2 · 38.4 wk)`.
- **Attribution (holiday → concrete task):** take the biggest holiday blocks (by working-day cost) inside this run's chain `[kickoff, FCS]` (`guHolidayOccurrences`), and for each name the **concrete tasks it hits** (`guTasksHitByHoliday`) — a task is "hit" if the holiday **overlaps** its span OR the task/milestone **starts within ≤4 calendar days after** the holiday ends (i.e. pushed later by it). This deliberately includes the **ME / Tooling side-branch tasks** (Tooling Release, T0 Trail Shoot, ME parts, PVR…), so e.g. the Oct CN National Day block reads **`CN National Day 9d → DB MB CKD, Tooling Release`** rather than an abstract backbone milestone. Top 2 holidays, up to 3 tasks each. Phrasing: **`Longer — holidays in chain: {Holiday} {N}d → {Task…}`** (or `Shorter vs standard` / `Same total as standard case`).
- Rationale: a precise per-task signed decomposition is misleading (two runs ~10 months apart hit holidays in different calendar positions, so cumulative per-task deltas swing ±large while netting small). The holiday→task mapping answers the real question — *which concrete tasks does each holiday delay* — and the net is the headline badge.
- Visual: line 2 is indented under line 1, JetBrains Mono 11px, muted; holiday name highlighted (`.hl`), task names bold. Empty (`:empty` hidden) until a schedule is generated.

National Holiday block — "Holidays in this build" summary (Ground-up / NPI / Production / Generate Schedule)

**STORE (unchanged — drives computation):** Holiday data lives in the **single cross-engine** top-level store `sharedHolidaysByYear = { 2025: [{start,end,name}, ...], 2026: [...] }`. It holds **ALL** holidays for the seeded years (kick-off year + next, via `ensureHolidayYear` / `ensureGuYearsInitialized` / `ensureNpiYearsInit`; Production seeds on demand through `getHolidaySet`). `buildHolidaySet()` / `getHolidaySet(year)` expand the ranges via `expandHolidayRangesInto(set, entries)` into a per-day `Set<YYYY-MM-DD>` for `isWorkingDay` / `isHoliday`. Every working-day helper skips Sundays, Saturdays (when `!includeSat`), AND holidays. **The store is NEVER filtered — the engine needs every holiday.**

**DISPLAY (new — `renderHolidaySummary`):** the previous editable per-year card in the *input* section (year tabs + date-input rows, dark) was **replaced** by a **compact WHITE "National Holidays in this build" summary placed in the timeline export area** (after the timeline card, inside `#{gu|npi|prod}-timeline-area` as `#…-holiday-summary`), so a single screenshot of the export region captures schedule + the holidays it hits.

- **Only the holidays inside the development window `[Kick-off, FCS]` are SHOWN** (`holidaysInBuildWindow(ko, fcs)`): a block is shown iff its range overlaps `[ko, fcs]`. Nothing before Kick-off or after FCS is listed.
- **Special clause:** when **FCS lands in January or February**, the FCS-year **Lunar New Year** block is ALSO shown (tagged `LNY · FCS in Jan/Feb`) even if it falls just AFTER FCS — because a build ending in Jan/Feb runs right into the CNY shutdown.
- **Renders only after Generate** (the window needs the computed FCS). Read-only **view mode** by default: rows like `2026/10/01 – 10/9 · CN National Day · 8d`, **16px**, short line spacing, white card — like the task list, export-ready. Header shows the window `Kick-off → FCS`.
- **`✎ Edit` toggle** (Ground-up / NPI only — they own editing): switches the panel to editable date rows for every year spanning the window (grouped by year), `+ Add holiday` per year, delete per row — writing the shared store. **`✓ Done`** re-generates to apply (consistent with the Generate-gated model). Production shows the summary **read-only** (no `regen` passed); the shared store is edited from Ground-up / NPI and affects Production on its next Generate. `state.holidayEditMode` tracks the toggle per engine.
- **Generate Schedule (Button 5) shares the SAME summary** (`renderGenHolidaySummary` → `renderHolidaySummary`). Its window comes from the **uploaded Excel** schedule: Kick-off = earliest task start, FCS = the FCS phase's `fcsDate` (fallback: latest task end) — via `genScheduleWindow(scheduleData)`. Window years are seeded with `ensureHolidayYear` before rendering. **Read-only** (the Excel dates are fixed — the schedule is not recomputed from holidays — so the panel is informational). Rendered in `showTimeline()` after the timeline, in `#gen-holiday-summary`.
- Migration: `ensureHolidayYear(year)` still auto-detects the legacy per-day `{date, name}` format and re-seeds with `buildSimpleHolidaySet(year)`.

Implementation notes

- Keep `buildGroundupSchedule` free of DOM side effects.
- Use `generateGroundupSchedule()` as the adapter between UI and engine.
- Schedule data should include `meta.totalWeeks`, `inputs`, `phases`, and optional `phase.exit` / `fcsDate` fields.

Acceptance criteria

- Given a Kick-off date, the UI can generate a complete task schedule from Kick-off through L10 China FCS, with editable Region FCS rows below the green chevron.
- Given a Target FCS date, the UI reverse-computes the required Kick-off and renders the schedule **when the user clicks Generate** (not on entry — see the Generate-gated contract above).
- No Ground-up functionality may depend on unavailable silicon selection UI.
- The user must not see an empty control area after entering Kick-off; the Generate button and schedule output must be available.
- **System schedule duration is variable** (kick-off → L10 China FCS) depending on which holidays fall inside the chain window. With the default holiday set, most kick-offs land in the **38.0 – 39.0 weeks** range; large holiday blocks (CN National Day, Lunar New Year) inside the window can push the total higher.

Holiday-aware chain (replaces the earlier "38-week duration lock")

- The Ground-up chain math is **holiday-aware**: `isWorkingDay(d, holidaySet, includeSat)` returns false for Sundays, Saturdays (when `!includeSat`), AND any date in `holidaySet`. Every downstream task pushes past holidays.
- `addDevelopmentDays(start, days, mode='normal', skipHolidays=true)` defaults to skipping holidays. Ground-up has its own local helper `addGuDevDays(start, days, mode)` inside `buildGroundupSchedule` because the global helper reads holidays from its own scope; the local helper consults the `holidaySet` parameter directly. Both behave identically for holiday handling.
- The displayed week count uses `((fcsDate - kickoff) / 86400000 / 7).toFixed(1)` (one decimal place, e.g. "38.4 weeks"). This makes Friday-snap slack at FCS visible without flipping integer week counts at a Math.round boundary, and reflects that the duration is now variable across kick-off dates.
- History: an earlier iteration of the engine was holiday-blind specifically to keep the duration locked at 38 weeks. That lock was **reversed** at the user's explicit request — they prefer the schedule to honestly reflect non-working blocks rather than hide them for a stable target.

Holiday handling

- The holiday list combines Taiwan + China as a single per-year list. Each entry is a **date range** `{start, end, name}` (start === end for single-day holidays) — this replaces the previous one-row-per-day layout so a 9-day block displays as a single line like `2026-10-01 ~ 2026-10-09 · CN National Day`.
- Default seeded ranges per year:
  - `01-01 ~ 01-01` New Year's Day
  - `<LNY date> ~ <LNY date + 6 days>` Lunar New Year (7 days, year-dependent)
  - `02-28 ~ 02-28` **228 Peace Memorial Day** (TW 和平紀念日, 1 day)
  - `04-04 ~ 04-06` Qingming Festival (3 days)
  - `05-01 ~ 05-05` CN Labor Day (5 days)
  - `<Dragon Boat date>` **Dragon Boat Festival** (端午節, 1 day, year-dependent lunar — `dragonBoatMap` 2025–2030)
  - `<Mid-Autumn date>` Mid-Autumn Festival (1 day, year-dependent; auto-merges into National Day for 2025)
  - `10-01 ~ 10-09` CN National Day (9 days — extended block, per current spec)
  - `10-10 ~ 10-10` **TW National Day** (Double Ten Day, 雙十節 — 1 day). Distinct from the CN National Day block immediately before it; **must be skipped even in build mode** (Sat counts) so build-mode tasks (Tooling Release, SMT, Pre-Build, MV-R…) never land on 10/10. (Bug fix: 10/10 was previously missing, so e.g. Kick-off 2026-08-13 placed Tooling Release on the 10/10 Saturday.)
- The user can edit any range (start/end/name), add, or delete via the **`✎ Edit`** toggle on the "Holidays in this build" summary (Ground-up / NPI); `✓ Done` re-generates to apply. The store is shared across all three engines.
- **Holidays push the chain forward.** A holiday block landing inside a task window extends that task's end date by the number of working days the block consumes; downstream tasks shift correspondingly. Example: with kick-off 2026-07-28, the DB PCA & System Testing window 9/24 → 11/2 spans 40 calendar days (vs. the 28-day no-holiday baseline) because Mid-Autumn (9/25) plus the 9-day CN National Day block (10/1 – 10/9) consume 8 working days that have to be made up.

L10 China FCS + Region FCS list

- The terminal milestone is **L10 China FCS** = `nextFriday(PR + 7 calendar days)`. Always Friday.
- **Region FCS** (formerly "Thailand FCS") is now a **user-editable list** stored on the FCS phase as `phase.regionFcs = [{name, leadDays}, ...]`. Each region's date is derived as `fcsPhase.fcsDate + leadDays` (calendar days), so users can add ship-to regions with their own lead times.
- Default seed (all four scenarios + Excel upload): one entry `{name:'Region FCS', leadDays:14}`. This matches the historical Thailand FCS = L10 China + 2 work weeks behaviour.
- The green FCS chevron shows **ONLY L10 China FCS + date**. Region FCS entries render below the chevron in the FCS task column as minimalist editable rows: `[region name] [date] ×`. Both name and date are inline-editable; if the name is left blank the placeholder `Region FCS` shows in grey. `leadDays` is internal state — when the user edits the date, the engine back-derives `leadDays = (typed date − fcsDate)` so the chain-regenerate auto-shift behaviour is preserved. The `+ Add region` button appends a new blank row.
- Region dates are **holiday-aware** — `fcsDate + leadDays` is wrapped in `skipNonWorking(date, 'normal')` so a region milestone never lands on Sat/Sun/holiday (it pushes forward).
- Legacy data (Excel uploads, old saved state) without `regionFcs` is auto-seeded by the renderer on first render so the UI always shows at least one row.

---

## DB Phase Flow (Ground-up)

Render order (top-to-bottom under DB phase):
HP ID fix → Color lock-down for DB mockup → NC1 drawing release → TS color lock-down → DB G.O. → DB SMT Build → DB MB CKD → MB bring up → Mockup Assembly → DB Mockup Testing → DB PCA & System Testing → DB IUR / Tooling Release → Sheet Metal / Plastic Tooling → Color lock-down for SI → **DB Phase Exit**

| #    | Task                                  | Type      | Anchor / Dependency                                   | Duration (default)        | Mode / Notes        |
| ---- | ------------------------------------- | --------- | ----------------------------------------------------- | ------------------------- | ------------------- |
| 1    | HP ID fix [For DB mockup sample]      | Milestone | Kick-off (**snapped** — see Kick-off snap note)        | —                         | single date         |
| 2    | Color lock-down for DB mockup         | Range     | HP ID fix + 1 working day                             | 7 working days ⚠️          | Sat off             |
| 3    | NC1 drawing release                   | Milestone | nextWorkingDay(Kick-off + 14 calendar days) — holiday-snapped, never Sun/Sat/holiday | —                         | single date         |
| 4    | TS color lock-down (for pre-TS trail) | Milestone | nextWorkingDay(Kick-off + 16 calendar days) — holiday-snapped, never Sun/Sat/holiday | —                         | single date         |
| 5    | DB G.O.                               | Milestone | Kick-off + 4 work weeks                               | —                         | single date         |
| 6    | DB SMT Build                          | Range     | MAX(DB G.O. + 14 cal days, **smtEta('db')** + `etdLeadDays`) — Mobile: cpu_db; Desktop: pch_db | 3 working days            | Sat on (build mode) |
| 7    | DB MB CKD                             | Range     | DB SMT end + 1 cal day (next working day)             | **3 working days incl (default; editable inline `dbCkdDays`)** | Sat off             |
| 8    | MB bring up                           | Range     | MAX(DB MB CKD end + 1 cal day, **cpu_db + `etdLeadDays`** [Desktop only]), next working day | **5 working days incl (default; editable inline `mbBringUpDays`)** | Sat off · **Desktop System Build gate** |
| 9    | Mockup Assembly                       | Range     | MAX(NC1 drawing + 14 cal days)                        | 1 working day             | Sat off             |
| 10   | DB Mockup Testing                     | Range     | Mockup Assembly end + 3 cal days (next working day)   | 11 working days ⚠️         | Sat off             |
| 11   | DB PCA & System Testing               | Range     | MB bring up end + 1 working day                       | 20 working days (= 4 work weeks) | Sat off      |
| 12   | Tooling Release                       | Milestone | nextWorkingDay(DB Mockup Testing end + 3 cal days) — snapped, never Sun/holiday | toolingT0 = 38 cal days (editable) | single date         |
| 13   | **DB Phase Exit**                     | Milestone | (DB PCA & System Testing end) + 3 weeks               | —                         | single date         |

⚠️ = assumed default; adjust freely.

> **Kick-off snap (HARD RULE, all engines).** The Kick-off anchor is itself wrapped in `nextWorkingDay(kickoff, holidaySet, false)` at the top of `buildGroundupSchedule` / `buildNpiSchedule` (and `skipNonWorking(kickoff, 'build')` in `buildProductionSchedule`). If a user picks a Saturday / Sunday / national holiday as Kick-off, it is pushed to the next working day so the rendered Kick-off milestone (Ground-up **HP ID fix** = Kick-off; NPI **Kick-off**) never lands on a non-working day, and the whole DB→FCS cascade shifts with it. The golden Kick-off 2025/4/8 (Tue) is unaffected.

---

## SI Phase Flow (Ground-up)

The first three rows are ME-side tasks computed from the DB tooling chain but displayed under SI because they are ME inputs to the SI System Build.

Render order:
T0 Trail Shoot → T1 ME Sample Preparation → ME parts preparation for SI build → SI G.O. → SI SMT Build → SI System Pre-Build → SI System Main Build → SI System Testing → **SI Phase Exit**

| #    | Task                                      | Type      | Anchor / Dependency                                          | Duration (default)               | Mode / Notes        |
| ---- | ----------------------------------------- | --------- | ------------------------------------------------------------ | -------------------------------- | ------------------- |
| 1    | T0 Trail Shoot                            | Range     | nextWorkingDay(Tooling Release + `toolingT0` [default 38 cal days, **editable inline**]) | 5 working days incl (Sat on, Sun+holiday skip & extend) | holiday-aware span ([contract](#holiday-aware-meprep-span-contract)) |
| 2    | T1 ME Sample Preparation                  | Range     | nextWorkingDay(T0 Trail Shoot end + 1 cal day)               | 7 working days incl (Sat on, Sun+holiday skip & extend) | holiday-aware span |
| 3    | ME parts preparation for SI build         | Range     | nextWorkingDay(T1 ME Sample Preparation end + 1 cal day)     | `mePrepDays`+1 wd incl (default 12; shared editable N; Sat on, Sun+holiday skip & extend) | holiday-aware span |
| 4    | SI G.O.                                   | Milestone | DB PCA & System Testing start + `dbSiWeeks` work weeks (default 4 = 20 wd; **= DB Testing end, same day** — no +1) — editable inline | — | single date         |
| 5    | SI SMT Build                              | Range     | MAX(SI G.O. + 14 calendar days, **smtEta('si')** + `etdLeadDays`) — Mobile: cpu_si; Desktop: pch_si | 3 working days                   | Sat on (build mode) |
| 6    | SI System Pre-Build                       | Range     | MAX(SI SMT end + 1 cal day, ME parts preparation for SI build start + 10 cal days, **cpu_si + `etdLeadDays`** [Desktop only]), next working day | **4 working days incl (default; editable inline `siPreBuildDays`)** | Sat on (build mode) · **Desktop System Build gate** |
| 7    | SI System Main Build                      | Range     | SI Pre-Build end + 1 cal day                                 | 4 working days                   | Sat on (build mode) |
| 8    | SI System Testing                         | Range     | SI Main Build end + 1 cal day (next working day)             | 21 working days inclusive (= 4 work weeks + 1 day; end lands on same weekday as start) | Sat off             |
| 9    | **SI Phase Exit**                         | Milestone | SI System Testing end + 3 calendar days                      | —                                | single date         |

---

## Shared CPU Special Case (Ground-up)

Ground-up Product does not branch on shared/separate silicon. The SI chain always flows from the DB PCA & System Testing → SI G.O. anchor, regardless of whether `ES1 == ES2`.

SI SMT is now actively gated by `smtEta('si') + etdLeadDays` (Mobile: cpu_si; Desktop: pch_si). If the field is blank, the gate is inactive and SI SMT = SI G.O. + 14 calendar days. Filling it in will push SI SMT later when the silicon arrives after the natural anchor.

Downstream SI tasks (Pre-Build / Main Build / Testing / Exit) compute from this gated SI SMT using the standard SI rules in the table above. In Desktop mode, SI System Pre-Build additionally floors on `cpu_si + etdLeadDays`.

---

## PV Phase Flow (Ground-up)

Render order (default `meTexture = true`):
PV G.O. → PV SMT Build → ME Texture for PV → ME parts preparation for PV build → PV System Pre-Build → PV System Main Build → PV System Testing → ME Parts for PVR → PVR Assembly → ME PVR → Tooling Lock down → PLD → CFZ → SW PVR → RTM → **PV Phase Exit**

When `meTexture = false` (chassis has no texture — see [PV ME Texture Optional Contract](#pv-me-texture-optional-contract-ground-up)), `ME Texture for PV` is dropped and the chain is: … → PV SMT Build → ME parts preparation for PV build → PV System Pre-Build → … (`ME parts preparation for PV build` takes over the texture's start anchor and pulls in ~7 wd).

| #    | Task                                  | Type      | Anchor / Dependency                                                                                       | Duration (default)                                                       | Mode / Notes                                                  |
| ---- | ------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1    | PV G.O.                               | Milestone | SI System Testing start + `siPvWeeks` work weeks (default 4 = 20 wd; = 21st working day inclusive) — editable inline | —                                                                        | single date · Sat off                                         |
| 2    | PV SMT Build                          | Range     | MAX(PV G.O. + 14 cal days, **smtEta('pv')** + `etdLeadDays`) — Mobile: cpu_pv; Desktop: pch_pv | 3 working days                                                           | Sat on (build mode)                                           |
| 3    | ME Texture for PV                     | Range     | 18th working day inclusive from SI System Testing start (= 23 cal days after SI Test start)               | 8 working days inclusive                                                 | Sat off · **deletable** (`meTexture`; `✕ ME Texture` chip — chassis with no texture) — see [contract](#pv-me-texture-optional-contract-ground-up) |
| 4    | ME parts preparation for PV build     | Range     | **`meTexture===true`:** starts on ME Texture for PV **last day** (overlaps by 1 day). **`meTexture===false`:** takes over the texture's anchor — starts on the **18th working day incl from SI System Testing start** (~7 wd earlier) — see [contract](#pv-me-texture-optional-contract-ground-up) | `mePrepDays`+1 wd incl (default 12; shared editable N; Sat on, Sun+holiday skip & extend)                 | holiday-aware span ([contract](#holiday-aware-meprep-span-contract)) |
| 5    | PV System Pre-Build                   | Range     | next working day AFTER MAX(PV SMT Build end, ME parts preparation for PV build end, **cpu_pv + `etdLeadDays`** [Desktop only]) | **4 working days incl (default; editable inline `pvPreBuildDays`)**       | Sat on (build mode) · **Desktop System Build gate**           |
| 6    | PV System Main Build                  | Range     | PV Pre-Build end + 1 cal day (next working day)                                                           | 4 working days                                                           | Sat on (build mode)                                           |
| 7    | PV System Testing                     | Range     | PV Main Build end + 1 cal day (next working day)                                                          | 20 working days (= 4 work weeks)                                         | Sat off                                                       |
| 8    | ME Parts for PVR                      | Range     | next working day AFTER (PV System Testing **start** + 3 work weeks [= 15 wd, normal/Mon–Fri]) — overlaps the tail of the 20-wd Testing window | `mePrepDays`+1 wd incl (default 12; shared editable N; Sat on, Sun+holiday skip & extend)                 | holiday-aware span ([contract](#holiday-aware-meprep-span-contract)) |
| 9    | PVR Assembly                          | Range     | nextWorkingDay(ME Parts for PVR end + 1 cal day)                                                          | **2 working days** (Mon–Sat; Sun never scheduled)                        | Sat on (build mode) · **⚠️ red warning when window touches Sat** |
| 10   | ME PVR                                | Range     | nextWorkingDay(PVR Assembly end + 1 cal day)                                                              | 3 working days                                                           | Sat on (build mode)                                           |
| 11   | Tooling Lock down                     | Milestone | nextWorkingDay(ME PVR end + 1 cal day) — snapped, never Sun/holiday                                        | —                                                                        | single date                                                   |
| 12   | PLD                                   | Milestone | **nearest Friday on or BEFORE PV System Testing end** (never pushed forward to next Friday)               | —                                                                        | snap backward to Friday                                       |
| 13   | CFZ                                   | Milestone | PLD + 7 calendar days (Friday). **Holiday exception (same rule as RTM):** if that Friday is a national holiday, move BACK to the prior working day (Thu), shown **amber bold** — NOT forward a week — see [contract](#system-rtm-holiday-exception) | —                                                                        | Friday (holiday → Thu, amber bold)                            |
| 14   | SW PVR                                | Range     | CFZ + 1 dev day                                                                                           | 5 dev days (inclusive span)                                              | Sat on (build mode)                                           |
| 15   | RTM                                   | Milestone | CFZ + 7 calendar days (Friday). **Holiday exception:** if that Friday is a national holiday, move BACK to the prior working day (Thu), shown **amber bold** — see [contract](#system-rtm-holiday-exception) | —                                                                        | Friday (holiday → Thu, amber bold)                              |
| 16   | **PV Phase Exit**                     | Milestone | = CFZ                                                                                                     | —                                                                        |                                                               |

Notes:
- **PV G.O. is no longer anchored on PV SMT.** In Ground-up Product the PV chain is anchored on the SI System Testing start; PV SMT now derives from PV G.O. (PV G.O. + 14 cal days), still floored by `smtEta('pv') + etdLeadDays`.
- **PV System Pre-Build** has up to three gating dependencies: PV SMT Build, ME parts preparation for PV build, and (Desktop only) cpu_pv + lead time. The latest one wins.
- **ME Parts for PVR** is anchored on **PV System Testing start + 3 work weeks** (15 wd, normal mode), then the next working day — so it overlaps the tail of PV Testing instead of waiting for it to end. The downstream **PVR Assembly → ME PVR → Tooling Lock down** connectors each use "nextWorkingDay(previous_end + 1 cal day)" so no start lands on a Sun/holiday. The ME Parts for PVR duration is a **holiday-aware span** (12 working days incl, Sat on, Sun+holiday skip & extend), matching ME parts preparation for PV/SI build — see [Holiday-Aware ME/Prep Span Contract](#holiday-aware-meprep-span-contract).
- **PLD** is the nearest Friday on or BEFORE PV Testing end — never pushed forward to the next Friday. CFZ and RTM are nominally PLD + 7 / PLD + 14 (both Fridays), **but each independently moves BACK to the prior working day when its Friday is a national holiday** (the [CFZ / RTM holiday exception](#system-rtm-holiday-exception) — never deferred a week forward; RTM stays anchored on CFZ's nominal Friday so a CFZ shift doesn't drift it). The previous `nextFriday(sw_driver)` path was removed and `sw_driver` ETA was deleted from the UI.
- **PVR Assembly** is allowed on Saturday but flagged with a red row when either of its 2 days lands on a Saturday — Sunday is never scheduled.
- **ME Texture for PV is optional** (`meTexture`, default `true`). Chassis with no texture can delete it via the `✕ ME Texture` chip; `ME parts preparation for PV build` then takes over the texture's start anchor (18th wd incl from SI Test start, ~7 wd earlier) and the chain pulls in. Reversible via `↩ ME Texture` on the prep row; Reset restores it. See [PV ME Texture Optional Contract](#pv-me-texture-optional-contract-ground-up).

Hard constraint (red banner if violated):
`System RTM <= MV Pre-Build start − 1 calendar day`

The engine enforces this via `minMvPre = addDays(rtm, 1)` when computing MV Pre-Build anchor, so violations are rare. The `#gu-rtm-warning` banner is defensive — fires if enforcement ever slips through. Same formula as NPI / Production for cross-engine parity.

---

## MV Phase Flow (Ground-up)

Render order (default `mvrRounds = 2`):
MV G.O. → MV SMT Build → MV Pre-Build → MV Main Build → Factory OOBA → MV-R 1 → MV-R 1 Issue Verification → MV-R 2 → MV-R 2 Issue Verification → PR → FOD

When `mvrRounds = 1` (user deleted MV-R 2 — see [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi)), rows 8–9 are dropped and the chain is: … → MV-R 1 Issue Verification → PR → FOD.

| #    | Task                        | Type      | Anchor / Dependency                                                                                  | Duration (default)              | Mode / Notes                       |
| ---- | --------------------------- | --------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| 1    | MV G.O.                     | Milestone | PV System Testing start + `pvMvWeeks` work weeks (default 3 = 15 wd, normal; holidays extend) — always this anchor; **never recomputed by ETD** | — | single date              |
| 2    | MV SMT Build                | Range     | MAX(MV G.O. + 14 cal days, **smtEta('mv_prod')** + `etdLeadDays`) — Mobile: cpu_mv_prod; Desktop: pch_mv_prod | 3 working days                  | Sat on (build mode)                |
| 3    | MV Pre-Build                | Range     | MAX(MV SMT end + 1 cal day, System RTM + 1 cal day, **Tooling Lock down + `mePrepDays` cal days** [備料; cal days to preserve Scenario-1 golden], **cpu_mv_prod + `etdLeadDays`** [Desktop only]), next working day (build mode) | 4 working days                  | Sat on (build mode) · **Desktop System Build gate** |
| 4    | MV Main Build               | Range     | MV Pre-Build end + 1 cal day (next working day)                                                      | 4 working days                  | Sat on (build mode)                |
| 5    | Factory OOBA                | Range     | start = **MV Main Build start + 3 calendar days** (snap forward past Sun/holiday); end = **MV Main Build end** | overlaps MV Main Build; 1–2 days typically | normal feel; built-mode snap   |
| 6    | MV-R 1                      | Range     | MV Main Build end + 1 dev day (= day after)                                                          | 3 dev days (inclusive span)     | Sat on (build mode); Sun excluded  |
| 7    | MV-R 1 Issue Verification   | Range     | MV-R 1 end + 1 dev day                                                                               | 2 dev days (inclusive span)     | Sat on (build mode); Sun excluded  |
| 8    | MV-R 2                      | Range     | MV-R 1 Issue Verification end + 1 dev day — **only if `mvrRounds === 2`**; row carries the **Delete** trigger that sets `mvrRounds = 1` | 3 dev days (inclusive span)     | Sat on (build mode); Sun excluded  |
| 9    | MV-R 2 Issue Verification   | Range     | MV-R 2 end + 1 dev day — **only if `mvrRounds === 2`** (no independent Delete; follows MV-R 2)        | 2 dev days (inclusive span)     | Sat on (build mode); Sun excluded  |
| 10   | PR                          | Milestone | nextThuOrFri(**last MV-R IV** end), strictly after — `mvrRounds === 2` ⇒ MV-R 2 IV end; `mvrRounds === 1` ⇒ MV-R 1 IV end | —                               | snap to Thu/Fri, single date       |
| 11   | FOD [First Order Drop]      | Milestone | PR + 1 dev day                                                                                       | —                               | normal mode, single date           |

Notes:
- **MV Pre-Build 備料 floor (`minMvPreTooling`):** MV Pre-Build cannot start until material preparation completes after the PV-phase **Tooling Lock down** (chassis tooling). The floor is `Tooling Lock down + 11 calendar days`, MAXed into the MV Pre-Build anchor alongside the MV SMT, System RTM, and (Desktop) `cpu_mv_prod` gates. 11 days is a **calendar-day span**, matching the 備料 convention used by ME parts preparation for PV/SI build. The latest of all gates wins; the result snaps to the next working day (build mode).

---

## PV → MV Buffer & ETD Bottleneck (Ground-up)

MV G.O. is anchored **directly on PV System Testing start** — not on Kick-off:

```
MV G.O. = addDevelopmentDays(PV Test start, pvMvWeeks × 5, 'normal')   // default 3 ww = 15 working days
MV SMT  = MV G.O. + 14 cal days, snap to next working day (build mode)
```

Because the anchor is relative to the PV chain, the PV Test → MV G.O. buffer is **structurally fixed** at the configured `pvMvWeeks` regardless of kickoff / holiday placement — it can no longer be silently squeezed. `pvMvWeeks` defaults to 3 work weeks and is user-adjustable (e.g. up to 4). Holidays inside the window EXTEND the calendar gap so the working-time buffer stays intact (e.g. CN National Day 10/1–10/9 absorbs ~7 working days, pushing MV G.O. ~1 week later in calendar terms). **Exception:** if that extension would land MV G.O. on the first working day *after* a holiday cluster, the [G.O. Holiday Pull-In Contract](#go-holiday-pull-in-contract-hard-rule) pulls it back to before the cluster (red, downstream cascades) — only earlier, never later.

### ETD bottleneck — pushes MV SMT only, NOT MV G.O.

If the Production-silicon ETD gate — `smtEta('mv_prod') + etdLeadDays` (`pch_mv_prod` on Desktop, `cpu_mv_prod` on Mobile) — lands later than the planned MV SMT, **only MV SMT moves later. MV G.O. stays on its PV Test + `pvMvWeeks` anchor** (same rule as DB/SI/PV):

```
plannedMvSmt = nextWorkingDay(MV G.O. + 14)
MV SMT = nextWorkingDay(MAX(MV G.O. + 14, smtEta('mv_prod') + leadDays))   // MV G.O. NOT touched
```

The configured PV Test → MV G.O. buffer is unchanged; the silicon delay flows into MV SMT and all downstream MV / FCS tasks (Pre-Build, Main Build, OOBA, MV-R 1/2, PR, FOD, L10 China FCS). Region FCS dates auto-update. Reducing `etdLeadDays` pulls MV SMT back toward `MV G.O. + 14`.

Additional floors apply further down the chain on MV Pre-Build: **≥ System RTM + 1 cal day** (`minMvPre`, so RTM can never land on or after MV Pre-Build start) and **≥ Tooling Lock down + `mePrepDays` calendar days** (`minMvPreTooling`, the chassis 備料 / "ME parts for MV build"; uses the shared editable N as **calendar days** — not working days — to keep the Scenario-1 golden). MV Pre-Build start is the MAX of all gates (MV SMT, RTM, Tooling Lock down + N, and Desktop `cpu_mv_prod`), snapped to the next working day.

### Banner

Red banner `#gu-bottleneck-warning` surfaces above the timeline only when the ETD push is active:

> Production CPU ETD pushes MV SMT 9 cal day(s) past planned (MV G.O. + 14). MV G.O. stays on the configured 3-week PV Test buffer; the silicon delay flows into MV SMT and all downstream tasks — FCS slips by ~9 day(s).

The label is **Production PCH** on Desktop, **Production CPU** on Mobile (matching which ETD drove SMT gating).

### Cross-engine parity

NPI Silicon/TTM uses the identical `pvMvWeeks` anchor and the identical ETD-push banner. Production uses the same PV Test + 4-work-week anchor but does not ride the ETD bottleneck (it decouples MV from Production-silicon ETD).

---

## FCS (Ground-up)

| Task            | Type      | Anchor / Dependency                       | Notes                              |
| --------------- | --------- | ----------------------------------------- | ---------------------------------- |
| L10 China FCS   | Milestone | nextFriday(PR + 7 calendar days)          | snap to Friday; primary FCS anchor; shown inside green chevron |
| Region FCS list | Milestone(s) | each region: fcsDate + region.leadDays cal days | shown below chevron in FCS task column; user-editable; default seed `[{name:'Region FCS', leadDays:14}]` |

---

## Duration Defaults Summary (⚠️ adjustable)

These are the values most likely to need tuning. To change any of them, update the corresponding cell in the phase tables above AND the matching constant / `addWorkingCalendarDays(..., N, ...)` call in `buildGroundupSchedule` inside `ENTRY.html`.

| Constant / Task                    | Current default   | Where used                                 |
| ---------------------------------- | ----------------- | ------------------------------------------ |
| `toolingT0`                        | 38 calendar days (editable inline on T0) | Tooling Release → T0 Trail Shoot start |
| `mePrepDays`                       | 11 working days (editable inline; shared) | ME 備料 for SI/PV/PVR build + MV Pre-Build floor |
| `dbSiWeeks` (DB Test → SI G.O. buffer) | 4 work weeks (= 20 wd; editable inline) | SI G.O. anchor (Ground-up / NPI) |
| `siPvWeeks` (SI Test → PV G.O. buffer) | **Ground-up + NPI: 4 ww (= 20 wd)** — editable inline | PV G.O. anchor |
| `pvMvWeeks` (PV Test → MV G.O. buffer) | **Ground-up + NPI: 3 ww (= 15 wd)** — editable inline | MV G.O. anchor |
| DB Mockup Testing                  | 11 working days   | DB phase (Mockup chain)                    |
| DB PCA & System Testing            | 20 working days (= 4 work weeks) | DB phase (PCA chain → SI G.O.) |
| T0 Trail Shoot                     | 5 working days incl (Sat on, Sun+holiday skip) — [holiday-aware span](#holiday-aware-meprep-span-contract)  | SI phase                  |
| T1 ME Sample Preparation           | 7 working days incl (Sat on, Sun+holiday skip)  | SI phase                  |
| ME parts preparation for SI build  | `mePrepDays`+1 wd incl (default 12; shared editable N; Sat on, Sun+holiday skip) | SI phase                  |
| SI System Testing                  | 21 working days inclusive (= 4 work weeks + 1 day) | SI phase                  |
| ME Texture for PV                  | 8 working days inclusive          | PV phase (anchored on SI Test start) |
| ME parts preparation for PV build  | `mePrepDays`+1 wd incl (default 12; shared editable N; Sat on, Sun+holiday skip) — [holiday-aware span](#holiday-aware-meprep-span-contract) | PV phase                                |
| PV System Testing                  | 20 working days (= 4 work weeks) | PV phase                                    |
| PVR Assembly                       | **2 working days** (Sat allowed, flagged red; Sun never) | PV phase                  |
| ME PVR                             | 3 working days    | PV phase                                   |
| SW PVR                             | 5 dev days (build mode, Sat on)  | PV phase                                  |
| MV-R 1                             | 3 dev days (build mode, Sat on)  | MV phase                                  |
| MV-R 1 Issue Verification          | 2 dev days (build mode, Sat on)  | MV phase                                  |
| MV-R 2                             | 3 dev days (build mode, Sat on)  | MV phase                                  |
| MV-R 2 Issue Verification          | 2 dev days (build mode, Sat on)  | MV phase                                  |

---

## 5. 可調 Inputs (Ground-up Product UI)

UI 控制面板開放給 user 調整的 input,任何變動都會即時 recompute 整個 task graph:

| #  | Input                                       | Default                  | 影響範圍                                                                              |
| -- | ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| 1  | **Mode toggle** (Section 1)                 | Drive by Kick-off        | 切換決定 Section 1 顯示哪個 input。切到對面會清空舊值並 reset schedule。                |
| 2  | **Kick-off Date** *(forward plan)*          | 無預設,user 必填          | 整個 timeline 平移                                                                    |
| 3  | **Target FCS Date** *(reverse plan)*        | 無預設,user 必填          | 由 FCS 回推 Kick-off,再 forward simulate                                              |
| 4  | **Platform toggle** (Section 2)             | Mobile                   | Mobile 只看 CPU ETD;Desktop 額外顯示 PCH ETD 並改變 gating 規則(見 Silicon ETD gating) |
| 5  | **ETD → SMT lead time** (Section 2)         | 10 days (clamp 0–120)    | 影響所有 SMT 與 System Build gate 使用的 +N 天 offset                                  |
| 6  | CPU ETD · DB SMT                            | 無預設 (optional)         | Mobile: gates DB SMT。Desktop: gates DB MB bring up (System Build)。                  |
| 7  | CPU ETD · SI SMT                            | 無預設 (optional)         | Mobile: gates SI SMT。Desktop: gates SI System Pre-Build。                            |
| 8  | CPU ETD · PV SMT                            | 無預設 (optional)         | Mobile: gates PV SMT。Desktop: gates PV System Pre-Build。                            |
| 9  | Production CPU ETD · MV SMT                 | 無預設 (optional)         | Mobile: gates MV SMT。Desktop: gates MV Pre-Build。                                   |
| 10 | PCH ETD · DB SMT (Desktop only)             | 無預設 (optional)         | Desktop: gates DB SMT。Mobile mode 切換時自動清空。                                    |
| 11 | PCH ETD · SI SMT (Desktop only)             | 無預設 (optional)         | Desktop: gates SI SMT。                                                                |
| 12 | PCH ETD · PV SMT (Desktop only)             | 無預設 (optional)         | Desktop: gates PV SMT。                                                                |
| 13 | PCH ETD · MV SMT (Desktop only)             | 無預設 (optional)         | Desktop: gates MV SMT。                                                                |
| 14 | National Holidays (shared store)            | 預設值 from `buildSimpleHolidaySet(year)` | 驅動排程的 store 仍是完整的 `sharedHolidaysByYear`(與 NPI / Production 共用)。**顯示**改為匯出區的白底「Holidays in this build」精簡面板,只列 [Kick-off, FCS] 內的假日(FCS 落 1/2 月時加列農曆年);`✎ Edit` 可改。 |
| 15 | `toolingT0`                                 | 38 calendar days         | Tooling Release → T0 Trail Shoot gap — inline 可編輯 (T0 task chip)                    |
| 16 | `mePrepDays`                                | 11 working days          | 共用 ME 備料 (SI/PV/PVR build + MV Pre-Build floor) — inline 可編輯 (任一 ME-parts task chip) |
| 17 | `siPreBuildDays`                            | 4 working days           | SI System Pre-Build duration (build mode: Sat 算、Sun+假日跳過) — inline 可編輯 (SI System Pre-Build task chip);下游連動。**獨立於** `pvPreBuildDays`。 |
| 18 | `pvPreBuildDays`                            | 4 working days           | PV System Pre-Build duration (build mode) — inline 可編輯 (PV System Pre-Build task chip);下游連動。**獨立於** `siPreBuildDays`。 |
| 19 | `mvrRounds` (MV-R 輪數)                       | 2                        | 2 = MV-R 1+IV+MV-R 2+IV;1 = 只跑 MV-R 1+IV,PR 改錨在 MV-R 1 IV、FCS 往前 pull in。由 **MV-R 2 列永遠可見的內聯 chip `✕ MV-R 2`**(`.mvr-del`)設為 1、**MV-R 1 IV 列的 `↩ MV-R 2` chip**(`.mvr-restore`)設回 2、**Reset** 鈕也會回 2。見 [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi)。 |
| 20 | `meTexture` (PV ME Texture 有無)              | true                     | true = 有 texture,`ME Texture for PV` 照常,`ME parts preparation for PV build` 接在其 end day(現狀不變);false = 此 chassis 無 texture,刪掉 `ME Texture for PV`,`ME parts preparation for PV build` **接管其 start 錨點**(SI Test start 起算第 18 個工作日,提前 ~7 wd)。由 **`ME Texture for PV` 列永遠可見的 `✕ ME Texture` chip**(`.tex-del`)設為 false、**`ME parts preparation for PV build` 列的 `↩ ME Texture` chip**(`.tex-restore`)設回 true、**Reset** 鈕也會回 true。見 [PV ME Texture Optional Contract](#pv-me-texture-optional-contract-ground-up)。 |
| 21 | `dbCkdDays` (DB MB CKD 工期)                  | 3 working days           | DB MB CKD duration (working days, normal — Sun+假日跳過) — inline 可編輯 (DB MB CKD task chip);下游連動 pull in/push out。**三引擎統一**(Ground-up / NPI / Production)。 |
| 22 | `mbBringUpDays` (MB bring up 工期)            | 5 working days           | MB bring up duration (working days, normal) — inline 可編輯 (MB bring up task chip);下游連動 pull in/push out。**三引擎統一**(Ground-up / NPI / Production)。 |

**輸入互斥規則 (UI contract):**
- #1 Mode toggle 決定 #2/#3 哪個可見。切 mode 自動清空對面的值與 schedule。**沒有 disabled 的灰色 input**;看到的 input 一定可編輯。
- #4 Platform toggle 同樣是 segmented;切到 Mobile 自動清空所有 PCH ETD (#10-13)。任何一邊切換在已有 Kick-off 時都會 regenerate (因為 gating 規則變了)。
- Reverse mode 下,由 Target FCS 回推得到的 Kick-off **不會寫回** Kick-off input 欄位 — 只會在 timeline info 文字中顯示。
- 頁面初次載入時 mode = Kick-off / platform = Mobile,Kick-off 欄空白,Timeline / ETD / Holiday 卡片全部隱藏,直到 user 輸入其中一個 anchor。
- 所有 ETD date input 使用 flatpickr (EN locale, 格式 `M j, Y`)。CDN 載入失敗時 fallback 成原生 picker。

# NPI SILICON / TTM

## NPI Engine

NPI Silicon/TTM is the bare PCA development chain — same Kick-off-anchored, ETD-gated PCA core as Ground-up Product, but with ME / Tooling / Mockup tasks intentionally absent. NPI develops silicon-on-PCA; the surrounding ME / Tooling chain is a Ground-up-only concern.

Engine entry points in `ENTRY.html`:

- `buildNpiSchedule(kickoff, etas, holidaySet, platform, leadDays)` — pure function. Takes inputs, returns `{ phases, _anchors }`. No DOM side effects.
- `generateNpiSchedule(opts)` — adapter between UI state (`npiState`) and engine. Validates kickoff, builds the holiday set, calls `buildNpiSchedule`, applies the RTM + bottleneck banners, renders timeline. `opts.fromButton` controls auto-scroll.

## NPI Input Fields

**Section 1 — NPI Kick-off** (always visible):
- **Kick-off Date** — required. No default; user must enter. Drives the whole G.O./SMT cascade. Clearing it resets the schedule and hides Sections 2–4.

**Section 2 — Silicon ETDs** (revealed once Kick-off is set):
- **Platform toggle** (Mobile / Desktop) — default Mobile. Determines which silicon gates SMT vs System Build.
- **ETD → SMT lead time** — numeric input, default 10, range 0–120 calendar days.
- **CPU ETD · DB SMT / SI SMT / PV SMT / Production CPU ETD · MV SMT** — all optional. Available on both platforms.
- **PCH ETD · DB / SI / PV / MV SMT** — Desktop only; section hidden on Mobile. Switching to Mobile clears all four PCH values (state + DOM + flatpickr instance).

All date inputs use **flatpickr** (EN locale, `M j, Y` display format). Falls back to native `<input type="date">` if the CDN fails to load.

**National Holidays**: no longer an input Section — the editable card was removed. The shared store (`sharedHolidaysByYear`, with Ground-up / Production) still drives computation; the **display** is the compact white "Holidays in this build" summary in the export area (after Generate), showing only `[Kick-off, FCS]` holidays (+ LNY when FCS in Jan/Feb), with an `✎ Edit` toggle. See the [Holidays-in-this-build contract](#national-holiday-block--holidays-in-this-build-summary-ground-up--npi--production).

> **No Section 4 / Duration Validation card.** NPI has **no** standalone "Duration Validation" card — it was removed for UI parity with Ground-up (which never had one). The three Testing → next-G.O. buffers are shown only as the inline editable **ww-pills** on the timeline floor row, and the ETD-push case is surfaced by `#npi-bottleneck-warning`. There are exactly three input sections (1 Kick-off, 2 Silicon ETDs, 3 Holidays).

**MV-R rounds (`npiState.mvrRounds`, default 2):** togglable on the timeline — the `MV-R 2` row's always-visible `✕ MV-R 2` chip sets it to 1 (PR re-anchors on MV-R 1 IV, FCS pulls in), `MV-R 1 IV`'s `↩ MV-R 2` chip sets it back to 2, and the **`Reset`** button (newly added `#npi-reset`) restores it to 2 along with the other knobs. See [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi).

## SMT Build Logic

Same gating model as Ground-up Product:

| Phase             | SMT Anchor (Kick-off cascade)    | SMT Gate (ETD-driven)             |
|-------------------|----------------------------------|-----------------------------------|
| **DB SMT Build**  | DB G.O. + 14 calendar days       | `smtEta('db') + leadDays`         |
| **SI SMT Build**  | SI G.O. + 14 calendar days       | `smtEta('si') + leadDays`         |
| **PV SMT Build**  | PV G.O. + 14 calendar days       | `smtEta('pv') + leadDays`         |
| **MV SMT Build**  | MV G.O. + 14 calendar days       | `smtEta('mv_prod') + leadDays`    |

`SMT = MAX(anchor, gate)`. If the relevant ETD is blank, the gate is inactive and the anchor wins. All SMT Builds are 3 working days, build mode.

`smtEta(phase)` resolves to `cpu_<phase>` on Mobile, `pch_<phase>` on Desktop.

## System Build Gating (Desktop only)

On Desktop, the first System Build step of each phase is additionally floored by `cpu_<phase> + leadDays` (CPU is socketed and only required when the system powers up):

| Phase | Step gated by CPU ETD |
|---|---|
| DB | MB bring up           |
| SI | SI System Pre-Build   |
| PV | PV System Pre-Build   |
| MV | MV Pre-Build          |

Mobile mode bypasses these gates entirely (the SoC sits on the board after SMT, so no extra gate beyond SMT itself).

## G.O. Logic

| Phase    | G.O. Formula                                                                          |
|----------|---------------------------------------------------------------------------------------|
| DB G.O.  | Kick-off + 4 work weeks (= 20 working days, normal mode)                              |
| SI G.O.  | DB PCA & System Testing start + `dbSiWeeks` work weeks (default 4 = 20 wd; **= DB Testing end, same day** — no +1) — editable inline on the timeline pill |
| PV G.O.  | SI System Testing start + `siPvWeeks` work weeks (default 4 = 20 wd; = 21st working day inclusive, identical to Ground-up) — editable inline on the timeline pill |
| MV G.O.  | PV System Testing start + `pvMvWeeks` work weeks (default 3 = 15 wd, normal; holidays extend, identical to Ground-up) — **NOT recomputed by the ETD gate**; the Production-silicon ETD only pushes MV SMT later, MV G.O. stays put |

> **Holiday pull-in (all four G.O.):** when the holiday-aware anchor would drop a G.O. on the first working day *after* a holiday cluster, it is pulled back to the last working day *before* the cluster and rendered **amber (opportunity, not red)** — only earlier, never later, and the whole downstream chain pulls in. See [G.O. Holiday Pull-In Contract](#go-holiday-pull-in-contract-hard-rule).

> **Inline-editable buffers (Ground-up + NPI):** all three Testing → next-G.O. buffers — `dbSiWeeks` (4), `siPvWeeks` (4), `pvMvWeeks` (3), now identical to Ground-up — are editable directly on the timeline ww-pills (no separate input). Editing one re-flows downstream live. Defaults reproduce the legacy fixed dates exactly. **NPI difference vs Ground-up:** NPI is a pure PCB(PCA)/Motherboard schedule with **no ME / Chassis tasks and no ME gating** — System Pre-Build follows SMT directly. So unlike Ground-up (where ME / Tooling prep gates Pre-Build and can mask a buffer shrink), in NPI shrinking **any** of the three buffers pulls the schedule (and FCS) in.

## PV → MV Buffer & ETD Bottleneck

Identical to Ground-up. MV G.O. is anchored directly on PV System Testing start:

```
MV G.O. = addDevelopmentDays(PV Test start, pvMvWeeks × 5, 'normal')   // default 3 ww = 15 working days
MV SMT  = MV G.O. + 14 cal days, snap to next working day
```

The PV Test → MV G.O. buffer is **structurally fixed** at the configured `pvMvWeeks` (default 3, user-adjustable to 4) — it cannot be squeezed by the PV chain. When the Production-silicon ETD gate (`smtEta('mv_prod') + leadDays`) pushes MV SMT past the planned `MV G.O. + 14`, **only MV SMT moves later — MV G.O. stays put** on the configured buffer (identical to Ground-up). A red banner (`#npi-bottleneck-warning`) reports the slip — offending silicon (Production CPU on Mobile, Production PCH on Desktop), the configured buffer weeks, and FCS slip days. A second floor enforces **MV Pre-Build ≥ System RTM + 1 cal day** (`minMvPre`). All downstream MV / FCS tasks recompute from the new MV SMT. **(NPI has no Tooling/備料 floor on MV Pre-Build — that is a Ground-up-only ME gate.)**

The configured PV Test → MV G.O. buffer (default 3 ww) is shown on the inline ww-pill; an ETD-driven widening is surfaced by `#npi-bottleneck-warning`.

## DB Phase Flow

Render order: Kick-off → DB G.O. → DB SMT Build → DB MB CKD → MB bring up → DB PCA & System Testing → **DB Phase Exit**

| # | Task                          | Anchor / Dependency                                                                 | Duration                          | Mode / Notes                                     |
|---|-------------------------------|-------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------------|
| 1 | Kick-off                      | user input, **snapped** to next working day if Sat/Sun/holiday (see Kick-off snap)   | —                                 | single date                                      |
| 2 | DB G.O.                       | Kick-off + 4 work weeks                                                             | —                                 | single date                                      |
| 3 | DB SMT Build                  | MAX(DB G.O. + 14 cal days, **smtEta('db')** + leadDays)                             | 3 working days                    | Sat on (build mode)                              |
| 4 | DB MB CKD                     | DB SMT end + 1 cal day (next working day)                                           | **3 working days incl (default; editable inline `dbCkdDays`)** | Sat off                                          |
| 5 | MB bring up                   | MAX(DB MB CKD end + 1 cal day, **cpu_db + leadDays** [Desktop only]), next wd       | **5 working days incl (default; editable inline `mbBringUpDays`)** | Sat off · **Desktop System Build gate**          |
| 6 | DB PCA & System Testing       | MB bring up end + 1 working day                                                     | 20 working days (= 4 work weeks)  | Sat off                                          |
| 7 | **DB Phase Exit**             | DB PCA & System Testing end + 21 calendar days                                      | —                                 | single date                                      |

## SI Phase Flow

Render order: SI G.O. → SI SMT Build → SI System Pre-Build → SI System Main Build → SI System Testing → **SI Phase Exit**

| # | Task                   | Anchor / Dependency                                                                            | Duration                                                        | Mode / Notes                                      |
|---|------------------------|------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|---------------------------------------------------|
| 1 | SI G.O.                | DB PCA & System Testing start + `dbSiWeeks` work weeks (default 4 = 20 wd) — editable inline                  | —                                                               | single date                                       |
| 2 | SI SMT Build           | MAX(SI G.O. + 14 cal days, **smtEta('si')** + leadDays)                                        | 3 working days                                                  | Sat on (build mode)                               |
| 3 | SI System Pre-Build    | MAX(SI SMT end + 1 cal day, **cpu_si + leadDays** [Desktop only]), next wd                     | **4 working days incl (default; editable inline `siPreBuildDays`)** | Sat on (build mode) · **Desktop System Build gate**|
| 4 | SI System Main Build   | SI Pre-Build end + 1 cal day (next wd)                                                         | 4 working days                                                  | Sat on (build mode)                               |
| 5 | SI System Testing      | SI Main Build end + 1 cal day (next wd)                                                        | 21 working days inclusive (= 4 work weeks + 1 day)              | Sat off                                           |
| 6 | **SI Phase Exit**      | SI Testing end + 3 calendar days                                                               | —                                                               | single date                                       |

**No shared-CPU branch in NPI.** The Ground-up PCA core anchors SI G.O. on DB PCA & System Testing unconditionally; there is no `ES == ES/PC → SI G.O. = DB Test start + 21d` override.

## PV Phase Flow

Render order: PV G.O. → PV SMT Build → PV System Pre-Build → PV System Main Build → PV System Testing → PLD → CFZ → SW PVR → RTM → **PV Phase Exit**

| #  | Task                            | Anchor / Dependency                                                                       | Duration                          | Mode / Notes                                                 |
|----|---------------------------------|-------------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------------------------|
| 1  | PV G.O.                         | SI System Testing start + `siPvWeeks` work weeks (default 4 = 20 wd; = 21st wd inclusive, identical to Ground-up) — editable inline | —                                 | single date                                                  |
| 2  | PV SMT Build                    | MAX(PV G.O. + 14 cal days, **smtEta('pv')** + leadDays)                                   | 3 working days                    | Sat on (build mode)                                          |
| 3  | PV System Pre-Build             | MAX(PV SMT end + 1 cal day, **cpu_pv + leadDays** [Desktop only]), next wd                | **4 working days incl (default; editable inline `pvPreBuildDays`)** | Sat on (build mode) · **Desktop System Build gate**          |
| 4  | PV System Main Build            | PV Pre-Build end + 1 cal day (next wd)                                                    | 4 working days                    | Sat on (build mode)                                          |
| 5  | PV System Testing               | PV Main Build end + 1 cal day (next wd)                                                   | 20 working days (= 4 work weeks)  | Sat off                                                      |
| 6  | PLD                             | **Nearest Friday on or BEFORE PV System Testing end** (`prevValidFriday`, never pushed forward) — identical to Ground-up | —                                 | snap backward to Friday                                      |
| 7  | CFZ                             | PLD + 7 calendar days (Friday). **Holiday exception:** holiday Friday → back to prior working day (Thu), **amber bold** — same rule as RTM, see [contract](#system-rtm-holiday-exception) | —                                 | Friday (holiday → Thu, amber bold)                          |
| 8  | SW PVR                          | CFZ + 1 dev day                                                                           | 5 dev days (inclusive)            | Sat on (build mode)                                          |
| 9  | RTM                             | CFZ + 7 calendar days (Friday). **Holiday exception:** holiday Friday → back to prior working day (Thu), **amber bold** — see [contract](#system-rtm-holiday-exception) | —                                 | Friday (holiday → Thu, amber bold)                             |
| 10 | **PV Phase Exit**               | = CFZ                                                                                     | —                                 | —                                                            |

**Hard constraint (red banner if violated):** `System RTM ≤ MV Pre-Build start − 1 calendar day`. Engine enforces via `minMvPre = addDays(rtm, 1)`; banner is defensive (same as Ground-up / Production).

## MV Phase Flow

Render order (default `mvrRounds = 2`): MV G.O. → MV SMT Build → MV Pre-Build → MV Main Build → Factory OOBA → MV-R 1 → MV-R 1 Issue Verification → MV-R 2 → MV-R 2 Issue Verification → PR → FOD

When `npiState.mvrRounds = 1` (user deleted MV-R 2 — see [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi)), rows 8–9 are dropped and PR anchors on MV-R 1 IV end.

| #  | Task                            | Anchor / Dependency                                                                                                          | Duration                          | Mode / Notes                                          |
|----|---------------------------------|------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|-------------------------------------------------------|
| 1  | MV G.O.                         | PV System Testing start + `pvMvWeeks` work weeks (default 3 = 15 wd, normal; holidays extend, identical to Ground-up) — **NOT recomputed by ETD**; ETD only pushes MV SMT later | — | single date                       |
| 2  | MV SMT Build                    | MAX(MV G.O. + 14 cal days, **smtEta('mv_prod')** + leadDays) — Mobile: cpu_mv_prod; Desktop: pch_mv_prod | 3 working days                    | Sat on (build mode)                                   |
| 3  | MV Pre-Build                    | MAX(MV SMT end + 1 cal day, System RTM + 1 cal day, **cpu_mv_prod + leadDays** [Desktop only]), next wd                      | 4 working days                    | Sat on (build mode) · **Desktop System Build gate**   |
| 4  | MV Main Build                   | MV Pre-Build end + 1 cal day (next wd)                                                                                       | 4 working days                    | Sat on (build mode)                                   |
| 5  | Factory OOBA                    | start = **MV Main Build start + 3 calendar days** (snap forward past Sun/holiday); end = **MV Main Build end**               | overlaps Main Build               | build snap                                            |
| 6  | MV-R 1                          | MV Main Build end + 1 dev day                                                                                                | 3 dev days (inclusive)            | Sat on (build mode); Sun excluded                     |
| 7  | MV-R 1 Issue Verification       | MV-R 1 end + 1 dev day                                                                                                       | 2 dev days (inclusive)            | Sat on (build mode); Sun excluded                     |
| 8  | MV-R 2                          | MV-R 1 IV end + 1 dev day — **only if `mvrRounds === 2`**; row carries the **Delete** trigger that sets `mvrRounds = 1`       | 3 dev days (inclusive)            | Sat on (build mode); Sun excluded                     |
| 9  | MV-R 2 Issue Verification       | MV-R 2 end + 1 dev day — **only if `mvrRounds === 2`** (no independent Delete; follows MV-R 2)                                | 2 dev days (inclusive)            | Sat on (build mode); Sun excluded                     |
| 10 | PR                              | nextThuOrFri(**last MV-R IV** end), strictly after — `mvrRounds === 2` ⇒ MV-R 2 IV end; `mvrRounds === 1` ⇒ MV-R 1 IV end     | —                                 | snap Thu/Fri                                          |
| 11 | FOD [First Order Drop]          | PR + 1 dev day                                                                                                               | —                                 | normal mode                                           |

## FCS

| Task           | Anchor                            | Notes                       |
|----------------|-----------------------------------|-----------------------------|
| L10 China FCS  | nextFriday(PR + 7 calendar days)  | snap to Friday; shown inside green chevron |

**Region FCS list** (same model as Ground-up): NPI's FCS phase carries `regionFcs:[{name, leadDays}, ...]` with default seed `[{name:'Region FCS', leadDays:14}]`. Rendered below the chevron as minimalist editable rows `[name] [date] [×]` — `leadDays` is internal state, user edits the DATE directly and `leadDays` is back-derived as `(typed date − fcsDate)`. Click `+ Add region` for additional ship-to destinations.

## UI Behaviour Contract

**Generate-gated input model — IDENTICAL to Ground-up.** NPI no longer auto-regenerates on every input. Editing any input only **stores** the value and drops the shown schedule; **only the `Generate NPI Schedule` button computes & renders**. This makes the schedule deterministic and stable under repeated edits (a half-filled ETD set never renders a partial schedule). Implemented by `npiRequireRegen()` (mirrors `guRequireRegen()`) + `updateNpiActions()` (enables/disables Generate, validation text), exactly paralleling Ground-up.

- **Page load**: only Section 1 (Kick-off) visible. Section 2 (Silicon ETDs) and the timeline are hidden. **Generate is disabled** until a Kick-off is set (`updateNpiActions`). (There is no holiday input Section — holidays show as the export-area summary after Generate.)
- **Entering Kick-off** reveals Section 2 and **enables Generate** — it does **NOT** auto-render (`npiRequireRegen`). The timeline + "Holidays in this build" summary appear only after the user clicks Generate.
- **Editing platform / lead-time / individual CPU/PCH ETD** (and clearing PCH on Mobile) just stores the value and **drops the shown schedule + hides the timeline** (`npiRequireRegen`); the user fills all inputs, then clicks Generate.
- **Reset** clears all silicon ETDs, restores the buffer/duration knobs (incl. `mvrRounds`, `siPreBuildDays`, `pvPreBuildDays`) to defaults, keeps Kick-off + platform, and drops the shown schedule — then waits for Generate (does **not** auto-render). Same as Ground-up's Reset.
- **Clicking the Generate button** is the only path that computes, renders, and scrolls to the timeline (`opts.fromButton: true` → `scrollIntoView`).
- **On-timeline inline editors** (Testing→G.O. ww-pills, `siPreBuildDays` / `pvPreBuildDays` dur-chips, MV-R 2 ✕/↩) still re-flow **immediately** — same as Ground-up.
- **Clearing Kick-off** resets `npiState`, hides Section 2 / timeline (+ holiday summary), disables Generate.
- The Holiday card uses the **shared** range-based store with NPI / Ground-up / Production; edits in any engine's UI are visible to all three.

## Removed from Previous Spec (Migration Notes)

The following were retired when NPI was rebuilt on the Ground-up PCA core (kept here so old test plans / docs can be cross-checked):

- **5 sample-named ETDs** (`ES`, `ES/PC`, `QS/PR`, `Production/IP`, `PV SW`) — replaced by CPU / PCH ETDs with platform toggle.
- **Auto-derive Kick-off = DB G.O. − 28 cal days** — Kick-off is now a **required** input. The `Kick-off ≤ DB G.O. − 28` gate is removed.
- **Shared-CPU special case** (`ES == ES/PC → SI G.O. = DB Test start + 21d`) — Ground-up PCA core anchors SI G.O. on DB PCA & System Testing end unconditionally.
- **CFZ = nextFriday(PV SW ETD)** and the PV SW ETD input field — CFZ now derives from PLD + 7 (Ground-up signal chain).
- **PLD = nextFriday(PV Testing end + 20 wd)** — PLD now snaps to the **nearest Friday on or BEFORE PV Testing end** (`prevValidFriday`, never pushed forward), identical to Ground-up. (An interim revision used "nearest Friday in either direction"; that was realigned to the Ground-up PCB rule when NPI was made a pure PCB schedule.)
- **MV Pre-Build = MV SMT + 4 cal days** — now follows the Ground-up rule `MV SMT end + 1 working day` (additionally floored by System RTM + 1 day and, on Desktop, by `cpu_mv_prod + leadDays`).
- **Single round of MV-R** — NPI now has two rounds by default (MV-R 1 + IV + MV-R 2 + IV) matching Ground-up. The user can still drop to a single round on demand via the `MV-R 2` Delete toggle (`mvrRounds = 1`) for FCS pull-in simulation — see [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi).

## Duration Label Rendering

Floating, inline-editable ww-pill labels for the three Testing → next-G.O. buffer segments (this is the only place the buffers are shown — there is no separate Duration Validation card):

- DB → SI
- SI → PV
- PV → MV

Visual requirements: dark translucent background, backdrop blur, alternating vertical offset so adjacent labels do not overlap.

# PRODUCTION SILICON / OOC

## Production Silicon Engine

Create production silicon/OOC schedule engine. Production skips the SI phase entirely (no SI in this scenario).

Input:
- Kick-off Date

Generate phases:
- DB
- PV
- MV
- FCS

## Production Schedule Formulas

All dates derive forward from Kick-off using the shared working-day engine.

### DB Phase

| Task                  | Anchor             | Offset                              | Duration                | Mode    | 備註                       |
|-----------------------|--------------------|-------------------------------------|-------------------------|---------|----------------------------|
| **DB G.O.**           | Kick-off           | **+ 4 work weeks (= 20 working days, normal)** — unified with Ground-up/NPI | —                     | normal  | skip non-working (NOT Friday-snapped) |
| **DB SMT**            | DB G.O.            | + 14 calendar days                  | **3 working days** — unified with GU/NPI | build   | skip non-working           |
| **DB MB CKD**         | DB SMT end         | + 1 working day                     | **3 days incl (= 1 + 2 wd); default, editable inline `dbCkdDays`** | normal  | —                          |
| **MB Bring-up**       | DB MB CKD end      | + 1 working day                     | **5 days incl (= 1 + 4 wd); default, editable inline `mbBringUpDays`** | normal  | —                          |
| **DB Testing**        | MB Bring-up end    | + 1 working day                     | **20 working days (= 4 work weeks)** — unified with Ground-up/NPI | normal  | —                          |
| **DB Phase Exit**     | DB Testing end     | nextFriday                          | —                       | normal  | snap Fri                   |

### PV Phase

| Task                  | Anchor                              | Offset                | Duration                  | Mode    | 備註                |
|-----------------------|-------------------------------------|-----------------------|---------------------------|---------|---------------------|
| **PV G.O.**           | DB System Testing **start**         | + 4 work weeks (= **20 working days**, normal mode — Mon–Fri, holidays excluded) | — | normal  | holidays inside the window EXTEND the calendar gap so working-time buffer stays intact |
| **PV SMT**            | PV G.O.                             | + 14 calendar days    | **3 working days** — unified with GU/NPI   | build   | skip non-working    |
| **PV Pre-Build**      | PV SMT end                          | + 1 working day       | **4 working days incl; default, editable inline `pvPreBuildDays`** — unified with GU/NPI | build   | —                   |
| **PV Main Build**     | PV Pre-Build end                    | + 1 working day       | **4 working days** — unified with GU/NPI   | build   | —                   |
| **PV Testing**        | PV Main Build end                   | + 1 working day       | **20 working days (= 4 work weeks)** — unified with Ground-up/NPI | normal  | —                   |

PV signal chain (Production):

| Milestone        | Formula                                                                                              | 備註                          |
|------------------|------------------------------------------------------------------------------------------------------|-------------------------------|
| **PLD**          | **nearest Friday on or BEFORE PV Testing end** (snap backward — never pushed forward to next Friday) | snap Fri; matches Ground-up   |
| **CFZ**          | PLD + 7 calendar days (Friday); **holiday Friday → back to prior working day (Thu), amber bold** — same rule as RTM, see [contract](#system-rtm-holiday-exception) | Friday (holiday → Thu)    |
| **SW PVR**       | start = CFZ + 1 dev day ; duration = 5 dev days inclusive                                            | build mode (Sat on, Sun off)  |
| **RTM**          | CFZ + 7 calendar days (Friday); **holiday Friday → back to prior working day (Thu), amber bold** — see [contract](#system-rtm-holiday-exception) | Friday (holiday → Thu)    |
| **PV Phase Exit**| = CFZ                                                                                                | —                             |

### MV Phase

MV G.O. is anchored on **PV System Testing start + 4 work weeks** = 20 working days in normal mode (Mon–Fri, holidays excluded). Holidays inside the window — e.g. CN National Day 10/1–10/9 — extend the calendar gap so the working-time buffer stays intact instead of being silently consumed by no-work days. This replaces the older CFZ−14 anchor (which used to land MV G.O. inside the PV testing window). From MV G.O. onward the chain follows Ground-up MV Phase Flow **except** the MV-R loop: **Production silicon is mature, so only ONE round of MV-R is needed** (no MV-R 2 / MV-R 2 IV). Dropping the second round lets PR move ~5 working days earlier than in Ground-up / NPI. There is also no ETD gating in Production (no CPU/PCH ETD inputs in this scenario).

| #  | Task                            | Anchor                                                                                              | Duration                          | Mode / Notes                            |
|----|---------------------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------|-----------------------------------------|
| 1  | MV G.O.                         | **PV System Testing start + 4 work weeks** (= 20 working days, normal mode — holidays excluded so the buffer stays intact) | —     | single date                             |
| 2  | MV SMT Build                    | MV G.O. + 14 cal days → next working day                                                            | 3 working days inclusive          | Sat on (build mode)                     |
| 3  | MV Pre-Build                    | MV SMT end + 1 cal day → next working day                                                           | 4 working days inclusive          | Sat on (build mode)                     |
| 4  | MV Main Build                   | MV Pre-Build end + 1 cal day → next working day                                                     | 4 working days inclusive          | Sat on (build mode)                     |
| 5  | Factory OOBA                    | start = **MV Main Build start + 3 cal days** (snap forward past Sun/holiday); end = MV Main Build end | overlaps Main Build             | range; build snap                       |
| 6  | MV-R 1                          | MV Main Build end + 1 dev day                                                                       | 3 dev days inclusive              | Sat on (build mode); Sun excluded       |
| 7  | MV-R 1 Issue Verification       | MV-R 1 end + 1 dev day                                                                              | 2 dev days inclusive              | Sat on (build mode); Sun excluded       |
| 8  | PR                              | nextThuOrFri(**MV-R 1 Issue Verification end**), strictly after                                     | —                                 | snap Thu/Fri                            |
| 9  | FOD [First Order Drop]          | PR + 1 dev day                                                                                      | —                                 | normal mode                             |
| 10 | L10 China FCS                   | nextFriday(PR + 7 cal days)                                                                         | —                                 | snap Fri; shown inside green chevron    |

**Region FCS list** (same model as Ground-up / NPI): Production's FCS phase carries `regionFcs:[{name, leadDays}, ...]` with default seed `[{name:'Region FCS', leadDays:14}]`. Rendered below the green chevron in the FCS task column as editable rows.

**RTM constraint (banner-only, not enforced):** `System RTM ≤ MV Pre-Build start − 1 calendar day`. The new PV Test + 4-week anchor decouples MV from RTM, so violations are surfaced via the red `#prod-rtm-warning` banner instead of silently shifting MV. Banner text quotes the actual RTM date, the deadline date (MV Pre-Build − 1), and how many days over. Same formula as Ground-up / NPI for cross-engine parity.

**PR slip warning (Production-specific):** If `MV-R 1 Issue Verification` end lands on **Friday or Saturday**, `nextThuOrFri` pushes PR to the **next week's Thursday**, costing ~5 working days. The red `#prod-pr-warning` banner fires, and both the MV-R 1 IV row and the PR row are marked with `warn:true` (red task name + red indicator dot) so the team can discuss mitigation — typically: start MV-R 1 IV earlier, or shorten its window to land Wed/Thu, so PR can run the same week instead of slipping.

## Production Timeline Rendering

Requirements:

- use the SAME `renderTimeline()` function as NPI / Generate Schedule
- same phase visualization (chevron arrows, blue gradient + green FCS)
- same edit capability (inline-editable task names + dates)
- same white export card
- exclude Sundays, TW holidays, CN holidays from all calculations

**Input invalidation + warning hygiene.** Changing the Kick-off date calls `prodRequireRegen()` — it nulls `prodState.scheduleData` and **hides `#prod-timeline-area`** (which contains the RTM-constraint and PR-slip `risk-banner`s), so a stale warning can never linger; the user re-clicks **Generate OOC Schedule** for a fresh compute. On Generate, both banners are recomputed: shown with fresh text when the condition holds, or **hidden AND text-cleared** otherwise (the `else` branch clears `textContent`, not just the `hidden` attribute). **No separate Reset button** — Production has only the Kick-off + the inline duration chips, so re-Generate already covers recompute; a Reset would duplicate that and confuse (unlike Ground-up / NPI, which clear many silicon-ETD / MV-R / buffer knobs).

# GENERATE SCHEDULE

## Excel Upload Engine

Allow upload:
- .xlsx
- .xls
- .xlsm

Required columns (case-insensitive):

- PHASE
- TASK
- START_DATE
- END_DATE (optional for milestone-only rows)

## Excel Parsing Logic

Requirements:

- Use SheetJS (`XLSX.read` with `cellDates:true`).
- Read the first sheet by default.
- Auto-detect the header row by scanning every row for a cell whose trimmed uppercase value equals `PHASE`. The row containing it is the header. Data starts on the next row.
- If header not found → throw a user-visible error: "Could not find PHASE header row. Required columns: PHASE / TASK / START_DATE / END_DATE".
- Convert every START_DATE / END_DATE cell using a single `toDate(value)` helper that handles:
  - native `Date` objects (cellDates output)
  - Excel serial numbers (`(serial − 25569) × 86400 × 1000`)
  - ISO date strings
  - returns `null` for empty/invalid
- Group rows by PHASE preserving Excel order.
- Wrap parsing in `try/catch`; surface errors via `alert()` and `console.error`.

## Auto-FCS Phase

After parsing, if no phase named `FCS` exists:
- Append `{ name: 'FCS', tasks: [], exit: null, fcsDate: lastDateInPhases() }`
- `lastDateInPhases()` returns the latest END_DATE (or START_DATE if no END_DATE) across all phases.

## Phase Exit Naming

If a phase contains a task whose name matches `/exit/i`, treat it as the phase's exit milestone (rendered separately from the chevron sequence). Rename to `"<Phase> Phase Exit"` for display if it doesn't already include `Phase`.

## Sample Data

Provide a `Load Sample` button that injects a built-in sample `scheduleData` object (DB / SI / PV / MV / FCS phases with realistic dates) so the user can see the renderer without uploading a file.

## Upload UI

- Drag-and-drop zone + click-to-browse fallback (single `<input type="file">`).
- After successful parse, hide upload zone and reveal `#timeline-area`.
- Show info text: `Loaded · {filename} · {N} phases`.

## Inline Editing

After render, every task row supports:

- Click task name → becomes editable text input → blur to save.
- Click date → becomes `<input type="date">` → blur to save → re-render.

Inline name/date editing is **always on** in every engine (no mode switch). The generic per-row `×` delete and the `+ Add task` button exist in markup but are **hidden** by the permanent `presentation-mode` class (see [Editing UI Model](#editing-ui-model-no-edit-mode)) — they are not a user-facing affordance. The one exception is the always-visible **MV-R 2 ✕** simulation control (see [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi)).

All edits mutate the in-memory `scheduleData` only — NO persistence to storage.

## Toolbar

- `Reset` button (clears `scheduleData`, returns to upload zone).
- `Reload Sample` button.

## Shared Renderer Contract

All 3 timeline-rendering scenarios (Generate / Ground-up / NPI / Production) MUST call the SAME `renderTimeline(rootSelector, data, rerender)` function. Do not fork the renderer per scenario.

# TIMELINE EDITING (Cross-Scenario)

## Editable Timeline Engine

Each task row MUST support:

- editable task name (inline, always on)
- editable start date (inline, always on)
- editable end date (inline, always on)
- hover effect

The generic per-row `×` delete and the phase-level `+ Add task` button remain in the DOM but are **hidden in every engine** (permanent `presentation-mode` class — see [Editing UI Model](#editing-ui-model-no-edit-mode)). The only always-visible delete control is the **MV-R 2 ✕** (Ground-up / NPI), which is an engine toggle, not a row splice.

### Inline editable DURATION chips (`.dur-chip`)

Certain tasks carry an inline numeric **`.dur-chip`** that edits an engine knob and **re-flows the whole downstream chain** (persistent — survives Generate, unlike transient date drags). `durChipFor(name, state)` maps a task name → `{key, value, unit}`; the change handler writes `state[key]` and calls the engine's regen. The mapping:

| Task name | Knob | Default | Engines |
|-----------|------|---------|---------|
| `T0 Trail Shoot` | `toolingT0` (cal days) | 38 | Ground-up |
| `ME parts preparation for SI/PV build`, `ME Parts for PVR` | `mePrepDays` (shared wd) | 11 | Ground-up |
| **`SI System Pre-Build`** | **`siPreBuildDays` (wd)** | **4** | **Ground-up, NPI** |
| **`PV System Pre-Build`** / **`System Pre-Build`** (Production) | **`pvPreBuildDays` (wd)** | **4** | **Ground-up, NPI, Production** (unified) |
| **`DB MB CKD`** | **`dbCkdDays` (wd, normal)** | **3** | **Ground-up, NPI, Production** (unified) |
| **`MB bring up`** | **`mbBringUpDays` (wd, normal)** | **5** | **Ground-up, NPI, Production** (unified) |

**`dbCkdDays` (3) / `mbBringUpDays` (5)** are editable inline on the **DB MB CKD** / **MB bring up** task chips in all three engines (normal mode — Mon–Fri, skip Sun + holidays). Editing re-flows the whole DB → … → FCS chain (downstream pulls in / pushes out). Defaults were **unified to 3 / 5** (previously Ground-up/NPI ran 7 / 3 and Production 3 / 7 — the inconsistent split was removed).

`siPreBuildDays` and `pvPreBuildDays` are **independent** (editing one does not change the other). Both default to **4** working days inclusive across **all engines** (Ground-up, NPI, Production — Production was unified from its former 3). All are build mode (Sat counts, Sun + holidays skip). Editing pushes that Pre-Build's end and every downstream task (Main Build → Testing → next-phase G.O. → … → FCS).

The chips are wired via **`durEditCfgFor(rootSelector)`** which returns `{state, regen}` for **Ground-up, NPI, AND Production** — distinct from `weekEditCfgFor` (ww-pills, Ground-up / NPI only). This makes Production's `System Pre-Build` duration editable **without** enabling Production's ww-pills (whose DB-PV-MV phase order would mis-key the work-week parameters). `.dur-chip` is not hidden by `presentation-mode`.

### Editable date → downstream shift (delta-shift)

Editing a task date (or a phase Exit date) shifts **every task / milestone / Exit / FCS that comes after it in render order**, then snaps each result off Sun/holiday (**Saturday allowed** — `skipNonWorking(d, 'build')`). Tasks before the edited one are untouched. The shift **delta follows the edited task's END for range tasks** (e.g. extending *System Testing*'s end pushes the next phase's G.O. and beyond) and the **START for milestones**. Region FCS dates derive from `fcsDate` so they follow automatically. Implemented render-side by `shiftScheduleDownstream(data, anchor, deltaDays)` where `anchor = {pi, ti}` (task) or `{pi, exit:true}` (exit).

**Special case — `✕ MV-R 2` chip is an engine toggle, not a transient view-delete.** In Ground-up / NPI the `MV-R 2` row carries an **always-visible inline chip** `✕ MV-R 2` (CSS `.mvr-del`, a danger-tinted pill matching `.dur-chip` / `.ww-pill`; NOT hidden by `presentation-mode`, NOT gated behind any edit mode). Clicking it sets the engine knob `mvrRounds = 1` and regenerates (cascading away `MV-R 2 Issue Verification` and pulling PR/FCS in). When single-round, the `MV-R 1 IV` row shows an always-visible **`↩ MV-R 2`** chip (CSS `.mvr-restore`) that sets it back to `2`; the **`Reset`** button does the same. This is **persistent across Generate** by design — see [MV-R Round Count Contract](#mv-r-round-count-contract-ground-up--npi). All OTHER edits (inline name/date) remain transient per the rule below.

**Manual date drags are TRANSIENT** — a view-only adjustment held in `scheduleData` (no localStorage). They do **NOT** mutate the engine knobs (buffer pills / `toolingT0` / `mePrepDays`); the next **Generate** rebuilds from scratch and discards them. (An earlier version back-mutated the buffer pills on every drag, which ratcheted the buffers and corrupted repeated calculations — removed.) To change a buffer/duration permanently, edit the pill/chip directly. The pills always display the current **engine** value.

## Task Date Rendering Rules

All dates render as **`YYYY/MM/DD`** (zero-padded; `fmtDateY` / `fmtRangeY`). The editable date field accepts `YYYY/MM/DD` (and legacy `M/D` / `M/D/Y`) via `parseRange`.

Testing-related tasks:

Display:
START_DATE ~ END_DATE

Non-testing tasks:

Display:
START_DATE only

## FCS presentation (checkpoint, not a phase)

FCS is a **checkpoint**, so its chevron column is narrow (`flex:0 0 170px`, vs ~280px for a phase) and the green chevron just reads `FCS`. The **China L10 FCS** date is surfaced **at the top of the FCS task column** (below the chevron, above the Region FCS rows) as a prominent highlighted block `.l10-fcs` — bold caption **`CHINA L10 FCS`** + the date in a bright green "success-in-sight" style; the date is editable there. (An earlier top-banner version was removed.) Region FCS rows render below it as before.

## Editing UI Model (No Edit Mode)

There is **NO Edit Mode / Presentation Mode toggle** in any engine. The earlier per-engine `Edit Mode` + `Presentation Mode` buttons (NPI / Production / Generate) were **removed** so all four timeline UIs behave identically to Ground-up, which never had them. (Ground-up is the reference UX: the user edits each task's wording / date / duration inline, directly on the rendered card.)

Concretely:

- Every timeline card keeps the `presentation-mode` CSS class **permanently** (it is no longer toggled). That class hides the generic per-row `×` delete and the `+ Add task` button via `display:none` — so those generic editing controls are never shown, keeping the card export-clean for PowerPoint screenshots.
- **Inline editing stays fully available without any mode**: task name, start date, end date, the work-week buffer pills, the duration chips (`toolingT0` / `mePrepDays` / `siPreBuildDays` / `pvPreBuildDays`), the L10 China FCS date, and the Region FCS rows are all edited in place. Production also gets the `pvPreBuildDays` chip (its only inline duration control).
- The **`✕ MV-R 2`** chip (`.mvr-del`) and its **`↩ MV-R 2`** restore chip (`.mvr-restore`) are deliberately **exempt** from the `presentation-mode` hide rule — they are simulation controls, always visible in Ground-up / NPI, styled as inline pills consistent with the other inline controls.
- **Export view (📷 toggle) — for a clean screenshot WITHOUT losing the edited state:** each timeline toolbar (Ground-up / NPI / Production / Generate) carries a **`📷 Export view`** button (CSS `.export-toggle`, `data-card` → its `#…-card`). Clicking it toggles an **`.exporting`** class on the timeline card that hides the remaining inline simulation/edit chips — `.mvr-del`, `.mvr-restore`, `.tex-del`, `.tex-restore`, and the editable duration chips `.dur-chip` — and neutralises the editable cursors, leaving a presentation-clean render. **It does NOT change the simulation state:** `mvrRounds`, deleted tasks, and all edited durations/dates stay exactly as set, so the user keeps their modified schedule in the screenshot. The button label flips to **`✎ Back to edit`** (with an `.active` accent style) and toggling back restores the chips for further editing. The class sits on the card container (not the re-rendered `.timeline-inner`), so it survives regeneration. The button lives in the toolbar **outside** the export region, so it never appears in the capture. This **supersedes** the older "run the simulation, then restore before exporting" guidance, which discarded the edits. See [Export View Contract](#export-view-contract).
- Export visuals remain clean: white card, no dark background inside the export region, no stray edit chrome — and with **Export view** on, no inline simulation chips either.

# GLOBAL FUNCTIONAL REQUIREMENTS

## Timeline Export Card

Timeline card MUST:
- remain white
- PowerPoint friendly
- export screenshot friendly
- avoid dark background inside export region

### Export View Contract

All four engines (Ground-up, NPI, Production, Generate) expose a **`📷 Export view`** toggle in their timeline toolbar for capturing a presentation-clean screenshot **after** the user has edited the schedule (changed a duration, deleted a task, dropped MV-R 2, etc.) — so the edited state is preserved in the image, not reverted.

| Aspect | Behaviour |
|---|---|
| Button | `.export-toggle` in the `.toolbar` (outside the export region), `data-card="{gu\|npi\|prod\|gen}-card"`. One shared click handler wires all four. |
| Toggle | Flips `.exporting` on the target `#…-card`. Label flips `📷 Export view` ⇄ `✎ Back to edit`; `.active` accent style while on. |
| Hidden while on | `.mvr-del` (`✕ MV-R 2`), `.mvr-restore` (`↩ MV-R 2`), `.tex-del` (`✕ ME Texture`), `.tex-restore` (`↩ ME Texture`), and the inline editable **duration chips** `.dur-chip` (`toolingT0` / `mePrepDays` / `siPreBuildDays` / `pvPreBuildDays` / `dbCkdDays` / `mbBringUpDays`) → `display:none`. Editable cursors on `.task-name` / `.ww-pill-edit` neutralised to `default`. The work-week buffer pills (`.ww-pill`) **stay** — they carry schedule info, not edit chrome. |
| State | **Unchanged** — `mvrRounds`, deleted tasks, all edited durations/dates stay as set. Export view is a pure visual mask, never a data revert. |
| Persistence | Class lives on the card container, not the re-rendered `.timeline-inner`, so it survives regeneration. |
| Capture | The toolbar (and its button) sits outside the export region, so it never appears in the screenshot. |

This **supersedes** the earlier "run the simulation, then restore before exporting" guidance under [Editing UI Model](#editing-ui-model-no-edit-mode). It is **not** a return of the removed Edit/Presentation mode toggle — it touches no engine state and only masks inline chrome for the duration of a capture.

## Timeline Layout Rules

Must prevent:
- overlapping labels
- overlapping bars
- broken alignment
- broken task rows
- disconnected phase arrows

## Timeline Rendering Rules

Requirements:

- responsive layout
- minimum width support
- horizontal scrolling support
- stable phase alignment
- stable task column alignment

## Dependency Visualization

Must support:
- linked phase flow
- connected chevron arrows
- duration indicators
- milestone alignment

# BUG FIX REQUIREMENTS

## Must Prevent

- duplicated CSS
- duplicated JS functions
- undefined variables
- broken rendering
- timeline overlap
- missing phases
- missing tasks
- invalid date rendering
- malformed dependency calculation

# MANDATORY VERIFICATION PROTOCOL

After generating the HTML, you MUST run the following verification protocol in your head BEFORE returning the final file. If ANY check fails, FIX the code and re-run the failed check. Do NOT return the file until all checks pass.

You MUST emit a **Verification Report** at the END of your response (after the HTML code block) summarizing pass/fail for every check below. Use this exact format per check:

```
[PASS] V1.1 — single <html> root present
[FAIL] V3.4 — DB SMT formula off by 1 day → fixed
```

If a check is N/A for the current scope, mark `[N/A]` with reason.

---

## STAGE 1 — STATIC FILE INTEGRITY

Run these BEFORE any logic checks. They are blocking.

### V1.1 Single-file constraint
- Exactly one `<!DOCTYPE html>`.
- Exactly one `<html>`, one `<head>`, one `<body>`.
- All CSS inside `<style>` (no external `.css` link except Google Fonts).
- All JS inside `<script>` (no external `.js` except SheetJS CDN).

### V1.2 Forbidden tokens (grep the entire file)
The following strings MUST NOT appear ANYWHERE in the output:
- `TODO`
- `FIXME`
- `XXX`
- `placeholder pseudo-code`
- `// ...`
- `/* ... */` (ellipsis-only comment)
- `lorem ipsum`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- `require(`
- `import ` (ES module import statement at top level)
- `<script src="http` other than the two allowed CDNs (SheetJS + Google Fonts)
- `React`, `ReactDOM`, `Vue`, `angular`

### V1.3 Allowed CDN whitelist
ONLY these external URLs may appear:
- `https://fonts.googleapis.com/...`
- `https://fonts.gstatic.com/...`
- `https://cdn.jsdelivr.net/npm/xlsx/...` OR `https://cdnjs.cloudflare.com/.../xlsx...`
- `https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/...` (date-picker library used by Ground-up Section 2 ETD inputs for English-locale display)

### V1.4 No duplicate definitions
- Each CSS class defined once.
- Each JS function name defined once (search `function NAME(`).
- Each `id="..."` value unique across the document.
- No duplicate `<style>` blocks with overlapping selectors.

### V1.5 Bracket / quote balance
- `{` count == `}` count in JS.
- `(` count == `)` count in JS.
- `[` count == `]` count in JS.
- All template literals (`` ` ``) balanced.
- No stray `</script>` or `</style>` inside string literals.

---

## STAGE 2 — SYNTAX & RUNTIME SAFETY

### V2.1 Parse-equivalent check
Mentally parse the JS as if running in a fresh browser console. Each function MUST:
- declare its parameters,
- have a body,
- close with `}`,
- not reference undefined identifiers.

### V2.2 Event-listener wiring
Every `addEventListener` MUST target an element that exists in the rendered DOM (search the `id` / selector exists in the HTML body).

### V2.3 No top-level `await`, no async without `try/catch` for FileReader
File upload code paths MUST wrap parse logic in `try/catch` and surface errors via `alert()` or a visible UI message.

### V2.4 No silent failures
Every numeric calculation that could produce `NaN` or `Invalid Date` MUST be guarded. If a date is invalid, render `'—'`, never `Invalid Date` or `NaN`.

---

## STAGE 3 — DATE MATH & SCHEDULING LOGIC (CRITICAL)

Run these test vectors mentally. If any fails, fix the formula.

### V3.1 Working-day mode contract
Define exactly two modes; verify every call site uses the correct one:
- `'normal'` = Mon–Fri only (skip Sat, Sun, holidays).
- `'build'` = Mon–Sat (Saturday counts; skip Sun + holidays).

SMT Build / MB CKD / Pre-Build / Main Build / Factory OOBA → `'build'`.
Testing windows / G.O. / PLD / CFZ / RTM / PR / FOD / FCS → `'normal'`.

### V3.2 Weekday-snap contract
- PLD, FOD, FCS → snap to **Friday**. **CFZ and RTM** are nominally Friday but move BACK to the prior working day (Thu) when their Friday is a holiday — see [CFZ / RTM holiday exception](#system-rtm-holiday-exception). (**G.O. is NOT Friday-snapped** — it lands on whatever working day its anchor produces; see the note under [Weekday-Snap Contract](#weekday-snap-contract).)
- PR → snap to **Thursday or Friday** (whichever comes first ≥ source).
- RFQ Award → snap to **Monday**.
- All other Planning checkpoints (CA, MRR, PCO, CO, RFQ Pkg, PAA) → snap to **Thursday**.

### V3.3 Identical-formula rule (HARD REQUIREMENT)
The 3 duration validations MUST call ONE shared function — **working weeks**, honouring weekends and holidays:

```
workWeeksBetween(fromDate, toDate)
  = (workingDaysBetween(fromDate, toDate) / 5).toFixed(1)
```

`workingDaysBetween` counts working days in (d1, d2] via `isHoliday()` so the ww reading reflects actual operational buffer, not calendar days (which would silently count holiday blocks like CN National Day as if they were working time).

Verify by code-reading: `applyDurationCheck` (or equivalent) is called 3× with identical signature for DB→SI, SI→PV, PV→MV. NO inline arithmetic anywhere else.

### V3.4 NPI test vector (Kick-off anchored)

NPI is now Kick-off-anchored with ETD gating, mirroring the Ground-up PCA core. The test is structured as **three sub-vectors** exercising the three behaviours that distinguish the new engine.

**Sub-vector A — baseline cascade (no ETDs)**
- Kick-off Date = 2026-05-22 (Friday)
- Platform = Mobile
- ETD → SMT lead time = 10 days
- All CPU ETDs blank → no gating active

Expected behaviour:
- DB G.O. = Kick-off + 20 working days (normal mode, holidays skipped)
- DB SMT = DB G.O. + 14 cal days
- SI G.O. = DB PCA & System Testing end (same day — no +1)
- PV G.O. = 16th working day inclusive from SI Test start
- MV G.O. = PV System Testing start + 4 work weeks (20 wd, normal); MV SMT = MV G.O. + 14 cal days (blank gate = no ETD push)
- L10 China FCS lands ~38–40 weeks after Kick-off (depends on which holidays fall inside the window)
- No bottleneck banner, no RTM banner

**Sub-vector B — ETD gating active (Mobile)**
- Same Kick-off as above
- CPU ETD · PV SMT = 2027-01-15 (far later than natural PV SMT)

Expected: PV SMT slips to MAX(natural PV SMT, 2027-01-15 + 10) = 2027-01-25. All downstream PV / MV / FCS tasks shift accordingly. PV → MV gap may activate the bottleneck floor (see Sub-vector C).

**Sub-vector C — PV → MV ETD bottleneck (ETD pushes MV later)**
- Set Production CPU ETD (· MV SMT) late enough that `Production CPU ETD + leadDays` lands AFTER the planned MV SMT (= MV G.O. + 14).

Expected:
- `#npi-bottleneck-warning` banner appears identifying **Production CPU** (Mobile) / **Production PCH** (Desktop), the effective PV Test → MV G.O. gap in working weeks vs configured 4 ww, and how many days FCS slipped.
- MV SMT pushed to `nextWorkingDay(Production CPU ETD + leadDays)`; `MV G.O. = MV SMT − 14 cal days`.
- The PV Test → MV G.O. gap GROWS beyond 4 weeks — it never shrinks below the configured `pvMvWeeks`.
- All MV / FCS tasks shift forward by the same delta.
- `MV Pre-Build ≥ RTM + 1` is enforced via `minMvPre`; the `#npi-rtm-warning` banner is defensive and stays hidden unless enforcement is bypassed.

**Desktop variant**: switch Platform to Desktop, fill PCH ETDs as well — the SMT gate now reads PCH ETDs and the first System Build step of each phase floors on the corresponding CPU ETD + leadDays. Switching back to Mobile clears all PCH values automatically.

### V3.5 (Reserved)
**Previously**: Shared-CPU branch (`ES Sample ETD == ES/PC Sample ETD` → SI G.O. = DB Test start + 21d).

**Removed**: NPI no longer carries a shared-CPU branch. The new engine inherits the Ground-up PCA core which anchors SI G.O. on `DB PCA & System Testing end` (same day) unconditionally. Slot retained as a numbering anchor; no test runs here.

### V3.6 RTM constraint
`System RTM` MUST be ≤ `MV Pre-Build start − 1 calendar day`. Applies to **all three scenarios** (Ground-up, NPI, Production). If violated:
- Show a RED warning banner above timeline (`#gu-rtm-warning` / `#npi-rtm-warning` / `#prod-rtm-warning`).
- Banner text MUST include actual RTM date, the deadline date (MV Pre-Build − 1), and how many days over.
- Ground-up and NPI engines enforce this via `minMvPre = addDays(rtm, 1)`, so the banner is defensive — fires only if enforcement is bypassed. Production does NOT enforce (PV Test + 4-week anchor decouples MV from RTM), so the banner is informational and the user must adjust manually.

### V3.7 Planning backward-chain (73w scenario)
With FCS = 2027-12-31 (will snap to Fri 2028-01-07 if not already Fri; 2027-12-31 IS Fri).
Chain backward, each segment uses Thursday-snap (RFQ Award uses Monday-snap).
Verify the final CA date lands ~73 working weeks before FCS (±1 week tolerance).

### V3.8 Holiday exclusion (cross-engine, holiday-aware)
Pick any task whose computed date naively falls on:
- a Sunday → MUST be pushed to the next working day.
- a TW or CN national holiday from the editable list → MUST be skipped (chain extends past it).
- a Saturday in `'normal'` mode → MUST be pushed to Monday.

All three engines (Ground-up, NPI, Production) read the single shared store `sharedHolidaysByYear`. Holidays are stored as `{start, end, name}` ranges; expansion to per-day ISO strings happens via `expandHolidayRangesInto(set, entries)`.

Ground-up chain math is now **holiday-aware** (the previous "holiday-blind / lock to 38 weeks" iteration has been reversed). When a holiday range lands inside a task window, the task end date extends by the number of working days the block consumes; downstream tasks shift correspondingly.

Test vector: kick-off 2026-07-28 makes DB PCA & System Testing span 9/24/2026 → 11/2/2026 (40 calendar days, 20 working days) because Mid-Autumn (9/25) + CN National Day (10/1 – 10/9) consume 8 working days inside the window.

### V3.9 FCS formula
`FCS = nextFriday(PR + 7 calendar days)`. Both PR and FCS land on Thursday/Friday and Friday respectively.

### V3.10 Ground-up SMT minimum gap
Every SMT Build start MUST be ≥ `smtEta(phase) + etdLeadDays` (default lead 10 days, user-adjustable 0–120). Verify all 4 SMT phases (DB/SI/PV/MV). In Mobile mode `smtEta` resolves to `cpu_<phase>`; in Desktop mode to `pch_<phase>`. Desktop mode additionally requires the first System Build step (MB bring up / Pre-Build) to be ≥ `cpu_<phase> + etdLeadDays`.

---

## STAGE 4 — UI / VISUAL CONTRACT

### V4.1 Five buttons exactly
Top nav contains EXACTLY these 5 buttons in this order:
1. Planning
2. Ground-up Product
3. NPI Silicon / TTM
4. Production Silicon / OOC
5. Generate Schedule

No additional buttons. No missing buttons.

### V4.2 White export card
The timeline render area MUST have white background (`#ffffff` or near-white). Dark-mode shell surrounds it. Verify CSS rule exists and is not overridden.

### V4.3 Chevron implementation
Phase bars use CSS `clip-path` for chevron arrows. Search the CSS for `clip-path:`. SVG `<polygon>` for chevrons is FORBIDDEN.

### V4.4 Fixed date column width
Date column in timeline MUST be a single fixed width shared by all rows (uniform width = task-name alignment). Now **114px** to fit `YYYY/MM/DD` at the 13px date font (was 78px). Verify CSS.

### V4.5 Phase bar gradients
- DB / SI / PV / MV → blue gradient.
- FCS → green gradient.

### V4.6 Typography
- Body text uses `Space Grotesk`.
- Dates / monospace data use `JetBrains Mono`.
Both loaded via Google Fonts CDN.

### V4.7 Duration label rendering
Floating pill labels for DB→SI, SI→PV, PV→MV with:
- dark translucent background
- backdrop blur
- alternating vertical offset (so adjacent labels don't overlap)

### V4.8 (Reserved — Duration Validation card removed)
The standalone color-coded "Duration Validation" card (formerly NPI Section 4, with `dur-ok`/`dur-warn`/`dur-bad` rows) has been **removed** for UI parity with Ground-up. The three Testing → next-G.O. buffers are shown only as inline editable ww-pills (V4.7). No check runs here.

### V4.9 (Reserved)
Print / PDF feature removed. Users export by taking a screenshot of the timeline card (white background is preserved for that purpose). Slot retained as a numbering anchor; no check runs here.

### V4.10 No layout overflow
At 1280px viewport: no horizontal scrollbar on body. Timeline rows do not overlap. Phase labels do not collide.

---

## STAGE 5 — FUNCTIONAL ACCEPTANCE

For EACH of the 5 scenario views, walk through the user flow mentally:

### V5.1 Planning view
- Pick scenario (73w or TBD). Active tab highlights.
- Enter Project Name, FCS Date, RFQ ODM. Click Generate.
- Result table renders with all 9 columns.
- FCS cell highlighted cyan, RFQ Award cell purple, alternating row colors.
- Switching to TBD reveals duration inputs; defaults are sane.

### V5.2 Ground-up view
- Section 1: pick Mode (Drive by Kick-off / Drive by Target FCS) — segmented toggle. Only the active mode's input is visible. Switching mode clears the previous value.
- Enter Kick-off Date (or Target FCS Date for reverse plan). **Target FCS does NOT auto-render** — entering it only stores the target + enables Generate; the reverse 2-pass runs on Generate (idempotent over repeated clicks).
- Section 2: pick Platform (Mobile / Desktop) — Mobile shows CPU ETDs only; Desktop additionally reveals PCH ETDs. Switching to Mobile clears all PCH values. Optional ETDs use English flatpickr.
- Section 2: adjust "ETD → SMT lead time" (default 10 days). It only stores the value — press Generate to apply.
- **ONLY the Generate button computes & renders.** Editing any INPUT — Kick-off / Platform / lead-time / individual CPU/PCH ETD / holidays — just stores the value and **drops the currently shown schedule + hides the timeline** (`guRequireRegen`). So with Silicon ETDs you fill all of them first, then click **Generate** to render — a half-filled ETD set never produces a partial schedule, and every run starts clean (fixes the 2nd/3rd-use corruption). On-timeline inline editors (Testing→G.O. buffer pills, `toolingT0` / `mePrepDays` chips) still re-flow immediately. **Manual date drags are transient** (discarded on the next Generate; they no longer mutate the buffer knobs).
- **Reset** button: clears all silicon ETDs, restores knobs to defaults (buffers 4/4/3, `toolingT0` 38, `mePrepDays` 11, lead 10), drops manual edits + the shown schedule, **keeps Kick-off** → one-click clean return to the standard (no-ETD) scenario, then press Generate.
- Timeline renders DB / SI / PV / MV / FCS with all tasks. Total weeks displayed to one decimal (e.g. "38.4 weeks"). The card is permanently fit-to-width — no toggle button.
- After Generate, the white "Holidays in this build" summary appears below the timeline (export area) listing only `[Kick-off, FCS]` holidays (+ LNY when FCS in Jan/Feb), 16px, read-only with an `✎ Edit` toggle. The store is **shared with NPI / Production**; `✓ Done` after an edit re-generates.
- Switching Mode or Platform drops the shown schedule and requires a fresh Generate (the gating rules change).
- **PV → MV bottleneck banner** (`#gu-bottleneck-warning`) appears ONLY when the Production-silicon ETD pushes MV SMT past the planned `MV G.O. + 14`. Banner identifies the offending silicon (Production CPU on Mobile, Production PCH on Desktop), the effective PV Test → MV G.O. gap (wd / ww) vs configured `pvMvWeeks`, and FCS slip days. The buffer only grows — it can never shrink below `pvMvWeeks`. Same behaviour as NPI.

### V5.3 NPI view
- Section 1: enter Kick-off Date (required). Section 2 (Silicon ETDs) reveals; Generate enables. (Holidays show as the export-area summary after Generate, not as an input section.)
- Section 2: pick Platform (Mobile / Desktop). Mobile shows only CPU ETDs; Desktop additionally reveals PCH ETDs and clears them on switch back to Mobile. Adjust **ETD → SMT lead time** (default 10 days, 0–120). CPU / PCH ETDs are optional; blanks mean "no gate".
- **Generate-gated (identical to Ground-up):** entering Kick-off only enables Generate (does NOT auto-render). Editing platform / lead-time / CPU/PCH ETDs just stores the value and drops the shown schedule. **Only `Generate NPI Schedule` computes, renders, and scrolls.** Generate is disabled until a Kick-off is set. On-timeline inline editors (ww-pills, Pre-Build dur-chips, MV-R 2 ✕/↩) still re-flow immediately.
- No separate Duration Validation panel (removed for parity with Ground-up); the three Testing→G.O. buffers show only as inline ww-pills.
- **RTM constraint banner** appears ONLY when `System RTM > MV Pre-Build start − 1 cal day` (engine enforces via `minMvPre`, so banner is defensive).
- **PV → MV bottleneck banner** appears ONLY when the Production-silicon ETD pushes MV SMT past the planned `MV G.O. + 14`. MV G.O. stays on the configured `pvMvWeeks` buffer; banner identifies the offending silicon (Production CPU on Mobile, Production PCH on Desktop) and FCS slip days.
- Holiday store shared with Ground-up / Production via `sharedHolidaysByYear`; the in-window "Holidays in this build" summary shows after Generate (with `✎ Edit`).
- Stability: repeated input edits + Generate (100×) must produce a deterministic schedule each time (every Generate rebuilds from `npiState`; nothing accumulates).

### V5.4 Production / OOC view
- Enter Kick-off Date.
- Click Generate.
- Timeline renders DB / PV / MV / FCS using SAME renderer as NPI.
- Tasks editable inline.

### V5.5 Generate Schedule (Excel upload)
- Drop / select an `.xlsx` file with PHASE / TASK / START_DATE / END_DATE columns.
- Header row is auto-detected (PHASE keyword).
- Timeline renders; FCS phase auto-appended if missing.
- "Load Sample" button loads built-in sample data.
- Each task date is inline-editable.

### V5.6 Cross-view persistence (NEGATIVE check)
Switching between views MUST NOT persist anything to `localStorage`. State lives in JS variables only. Refresh page → state resets.

---

## STAGE 6 — REGRESSION GUARDS

### V6.1 No empty placeholder views
Every scenario view MUST render real, working UI. No "Coming soon", no empty `<div>`, no inert button.

### V6.2 No mismatched duration formulas
Re-grep: there MUST be exactly ONE function that converts a date delta to weeks. All 3 validation calls MUST route through it.

### V6.3 Idempotent re-generation
Clicking "Generate" twice in a row with same inputs MUST produce identical output (no accumulating state, no DOM duplication).

### V6.4 Holiday edit propagation
Editing a holiday in the UI MUST invalidate cached schedule. Next "Generate" click recomputes using new holiday set.

### V6.5 Edge dates
Test with FCS / Kick-off near year boundary (e.g., kickoff = 2026-12-29) — schedule MUST cross into next year without breaking.

---

## STAGE 7 — SELF-REPORT

Append this block to your response AFTER the HTML, BEFORE any closing remarks:

```
=== VERIFICATION REPORT ===
Stage 1 (Static Integrity):    [n/n PASS]
Stage 2 (Syntax & Runtime):    [n/n PASS]
Stage 3 (Date Math):           [n/n PASS]
Stage 4 (UI Contract):         [n/n PASS]
Stage 5 (Functional):          [n/n PASS]
Stage 6 (Regression):          [n/n PASS]

Test vector V3.4 actual outputs (Kick-off anchored, Kick-off = 2026-05-22):
  Sub-vector A (no ETDs, baseline cascade):
    DB G.O.            = YYYY-MM-DD
    DB SMT             = YYYY-MM-DD
    SI G.O.            = YYYY-MM-DD
    PV G.O.            = YYYY-MM-DD
    MV SMT             = YYYY-MM-DD  (= MV G.O. + 14 cal days; MV G.O. = PV Test start + 4 ww)
    L10 China FCS      = YYYY-MM-DD
    Total weeks        = XX.X
  Sub-vector C (Production CPU ETD late enough to push MV SMT past planned):
    Bottleneck banner  = SHOWN / HIDDEN  (expected SHOWN)
    PV → MV row        = > 4.0 weeks (grows beyond configured pvMvWeeks; never shrinks below it)
    Pushed MV G.O.     = YYYY-MM-DD  (= MV SMT − 14, after ETD push; SMT = Production ETD + lead)
    RTM banner         = SHOWN / HIDDEN

Failures fixed during verification:
  - <list each FAIL → FIX action, or "none">

File size: ~XXX KB
Total lines: XXXX
External CDNs used: <list URLs>
```

If ANY stage has a failure that you could not fix, STOP and explain why instead of returning broken HTML.
