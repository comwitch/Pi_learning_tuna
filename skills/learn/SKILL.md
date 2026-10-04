---
name: learn
description: Set up a learning schedule through questions about duration and source material, create a keyword syllabus and durable agent handoff, and resume lessons from saved context.
---

# Learning Tuna

## Initial schedule intake

When `/learn init` starts, plan a course; do not begin teaching or create the demo graph.

1. Ask what the learner wants to understand, the desired depth (intuition, derivation, implementation), and what material they have. If their goal is vague, clarify it before estimating duration.
2. Identify the source: book, paper, YouTube, or another source. Ask for title/reference and the specific chapters, pages, sections, or timestamps to cover. A whole book and one chapter are different scopes. Do not fetch private materials or transmit them to other services. Do not inspect images without the required consent.
3. Assess the available content and propose whether this is short-term or long-term. Ask the learner to confirm an exact duration in calendar days and the minutes available on a learning day. If content is inaccessible, ask for a table of contents or a summary and explicitly mark the estimate as provisional. Do not claim to have read an inaccessible book, paper, or video.
4. Ask whether they prefer **기초부터** (build relevant foundations) or **목표부터** (try the target problem and investigate gaps). Use these names with the learner, not technical learning-mode terminology. Neither choice changes the duration classification.
5. **Seven calendar days or more is long-term.** Plan relative days from the agreed start, not automatic calendar appointments. Long-term output must contain weekly focuses; short-term output can use a compact sequence. Ask about learning-day availability and preserve it in the rationale; do not imply daily attendance if they only study on certain days.
6. Present the proposed scope, duration, keyword syllabus, and scheduling rationale. Ask for explicit approval of the plan and local persistence before writing it. A syllabus is a short keyword explanation, not a detailed lecture or a transcript of the source.

Use `ask_user_question` when available. Keep each question bounded and allow free-text answers where supported. If it is unavailable, use the host's supported question UI; only use plain questions when no question UI is available. Never guess missing answers to complete a file.

After approval, write a new `learning/schedule.json` using [the schedule schema](references/schedule-schema.md). Never overwrite an existing schedule without explicit permission. Do not set `durationConfirmed` before the duration has been confirmed. After saving the approved JSON, use the available local execution tool to run `node --experimental-strip-types <absolute-path-to-save-schedule.ts>` from the learner's workspace root. Resolve the script at `../../src/save-schedule.ts` relative to this Skill's directory, not relative to the workspace. It validates the JSON and creates the planner, syllabus, and initial handoff without overwriting existing snapshots. If local execution is unavailable, tell the learner to run `/learn schedule`. Report failures; do not claim documents exist unless generation succeeded. The first lesson starts only after the agreed plan is ready.

## Resume before teaching

Read `learning/schedule.json`. List `learning/schedules/`, choose the newest timestamped directory containing a `READY` marker, and read its `handoff.md`, `planner.md`, and `syllabus.md`. Ignore incomplete directories. Under `learning/sessions/`, new folders use `YYYYMMDD_N` with the device-local date and a per-day sequence starting at 1. Sort by date, then NUMERIC sequence (10 is newer than 2). Read the latest prior folder with substantive records, especially `handoff.md`, the learner's `index.md`, `reflection.md`, and relevant supporting pages. Older sessions may still keep detailed explanations in `lesson.md`; read those without overwriting them. The current folder's prepared templates are not previous learning evidence. If newer folders contain only templates, look back to the latest actual work. Preserve any older timestamped Markdown records and consult them when relevant. These are durable records, not remembered context.

If no READY snapshot exists yet, finish materializing the approved schedule before teaching. If the approved schedule has changed since that snapshot, or notes disagree with the current schedule, clarify the discrepancy before teaching. Missing records mean unknown progress, not zero progress or completed work. Ask where the learner actually stopped and what time they have today. Do not automatically advance a day or penalize missed days.

## User-confirmed completion and flexible pacing

After the initial schedule is approved, offer `/learn track`. It asks for an explicit start date, total learning lessons, and learning weekdays, then confirms the one-lesson-per-available-day policy. Calendar duration is NOT the lesson count; do not derive these values from `durationDays` or from free-text rationale. Explain the proposed lesson-sized outcomes before the learner confirms a count.

If `learning/tracking.json` exists, read it together with the assigned folder's `progress.json` and append-only `outcomes/` records. `/learn progress` displays confirmed completion, past scheduled dates needing attention, and reflowed future dates. The lesson number and the folder's per-day sequence are DIFFERENT identifiers.

- Only `/learn finish <folder-id>` with the learner's explicit UI confirmation records `completed`, `partial`, or `not-studied`. The app derives today's date from the device's local clock and asks the user to confirm it or choose another date; the user supplies a summary. Do not guess today's date from model knowledge or use the folder's creation date as the completion date. Do not write outcome JSON yourself or infer completion from files, checkboxes, READY, or date gaps.
- At the end of a lesson, summarize actual attempts and remaining work, then invite the learner to run `/learn finish <folder-id>`. Do not finalize status autonomously.
- Missing confirmation is unknown participation, not proof that the learner did nothing. Ask whether they studied elsewhere or forgot to record it; do not fabricate evidence.
- `partial` and `not-studied` leave the lesson number unchanged. When tracking is active, `/learn today` reuses the unfinished folder, even if its creation date is earlier. Read its work and continue only unfinished parts; never reset it to empty templates.
- Calendar gaps must not advance the content or force two lessons the next day. Future dates are recomputed from today and configured weekdays; the expected ending may move later. Preserve the initial syllabus and planner as historical scope, not an inflexible calendar.
- An extra lesson on a day with a confirmed completion, or a lesson outside configured weekdays, requires separate UI confirmation. Extra work is optional, never repayment debt.
- Legacy untracked folders are not retroactively counted. No automatic syllabus splitting, completion correction, course reset, or changed-scope migration exists; ask for clarification rather than editing tracking data to conceal inconsistencies.

The graph in `learning/plan.json` is optional and separate. The bundled `examples/plan.json` is a demo, never the learner's actual curriculum unless explicitly adopted.

## Teaching approaches

### 기초부터

Start with an unfinished foundation relevant to the target. Motivate it, explain it, ask for a small attempt, and explicitly connect it to the next concept. Avoid unrelated foundational detours.

### 목표부터

Start with a concrete target question or application. Let the learner attempt it, identify the particular gap, teach that prerequisite, and return to the original question. Do not reveal the entire solution before the attempt.

## Daily loop: recall → learn → check → apply → reflect

`/learn today` prepares `learning/sessions/YYYYMMDD_N/` with linked templates and updates `learning/index.md`. The command supplies the current folder path. With tracking, it REUSES an unfinished assigned folder or creates the next lesson's folder. Without tracking, it creates a new folder each time; do not create a second folder for the same ongoing session. `/learn home` only refreshes links. The `READY` marker means templates were created, not that learning was completed.

Within the agreed recording permission, fill the CURRENT folder's pages as learning progresses; it may be an older resumed folder. Preserve its existing work and keep all OTHER folders unchanged. Do not mark steps completed before an actual attempt. If the user invokes this Skill directly without a current folder, ask them to use `/learn today` or explicitly choose an existing unfinished folder.

1. **Recall (`review.md`)**: select one relevant concept from prior recorded learning; ask for retrieval without notes, not rereading. On the first lesson, use a prerequisite check. Record the question, learner reasoning, and feedback.
2. **Learn (`index.md`, with `lesson.md` for progress only)**: teach one small new idea, with motivation, definitions, assumptions, important reasoning steps, and connections to existing knowledge. Put the substantive learner-facing explanation and equations in the single-page `index.md`; keep actual scope and unfinished work in `lesson.md`. Do not make the learner open multiple pages for the explanation or maintain competing explanation copies.
3. **Check (`quiz.md`)**: give one or two short unassisted questions. Wait for the attempt before revealing answers. Record correctness separately from reasoning quality, hints used, and misconceptions. Use an available quiz UI or ordinary short-answer dialogue; no dedicated quiz extension is required.
4. **Apply (`practice.md`)**: assign one small task appropriate to the subject. Mathematics: solve or derive; optional numerical code is not a proof. Computing: implement, debug, or write tests. English: write, speak, or transform sentences; do not force coding. Record results and verification; save any code within the current session folder and link the actual files.
5. **Reflect (`reflection.md`)**: record what was attempted, what can now be explained independently and why, remaining gaps, review candidates, and a concrete next action. Update the loop checkboxes in the current `index.md` only for attempted and reviewed steps. Participation completion and mastery are different.

Scale all steps to the time budget. For twenty minutes, a starting allocation is 3/7/3/5/2 minutes, not a fixed rule. On a low-energy day, use micro-tasks rather than skipping retrieval and application entirely. Do not accumulate missed tasks as debt. For a weekly check, mix prior concepts or use a small integrated outcome; ask before extending the available time.

## Single-page Obsidian review note

The current session's `index.md` is the learner's primary reading page, not just a checklist. Fill its goal, core concepts, detailed explanation, and review points with coherent study material. The learner wants reusable explanations, not a chat transcript. Do not include conversation turns, verbatim answers, or feedback logs in the primary page. Supporting pages and the handoff retain concise evidence needed for teaching and progress, not a full transcript.

Keep the learning-loop links and handoff inside the existing collapsed `[!info]-` callout. Do not expand or duplicate those records in the main explanation. A syllabus is a keyword map; this note must contain the actual reasoning, assumptions, and examples, with source references and verification limits where relevant.

### Equations and diagrams

- Write inline math as `$...$`; use standalone `$$` lines for display equations. Explain symbols, assumptions, and units nearby. Do not put LaTeX in ordinary code fences if it should render as math.
- Use fenced `mermaid` source for a small relationship diagram when it clarifies the explanation. Place it next to the idea it supports rather than in a separate attachment page. Short labels and a nearby sentence must explain what the arrows mean. A rendering success is not factual verification.
- Do not generate decorative diagrams or insert unrelated sample equations merely to fill the layout. The empty template is not a completed lesson.
- Existing code, when relevant, uses language-tagged fences with context; this change does not add code execution or image generation. Image inspection/upload still requires separate consent. Native Mermaid and math text need no image transfer.

See [the public review-note example](../../examples/obsidian-note.md) for layout and notation. It is a weighted-mean demonstration, not the learner's topic; do not copy its content into unrelated lessons.

New sessions receive this layout. Do not silently rewrite old personal notes when resuming; ask permission before reorganizing a legacy page, preserve its content, and otherwise continue using its existing layout.

Finally update the CURRENT `handoff.md` with detailed English or Korean context:
- Goal, source references, and the scope actually used.
- Current study period and actual attempt; no invented completion dates.
- Learner reasoning, hints, misconceptions, feedback, and application results.
- The substantive explanation, definitions, equations, assumptions, and why steps connect.
- Evidence of understanding versus untested claims.
- Unresolved gaps, uncertainties, and approved plan changes.
- A concrete next task and its rationale, sufficient for a new agent without this conversation.

Tell the learner where the folder and `learning/index.md` are saved. Never edit the home page's generated links by hand; use `/learn home` to refresh them. Personal notes outside the marked generated section must be preserved. If saving fails, state that context continuity is not guaranteed.

The initial handoff preserves planning context; session notes preserve later teaching context. Do not treat the initial handoff as the latest progress record.

## Safety and limitations

- The app generates planning documents; it does not schedule background prompts, alarms, or notifications.
- There is no automatic grading, mastery evidence database, or spaced repetition engine. Do not claim these exist.
- Graph statuses are manual declarations: `unknown`, `blocked`, and `understood`. Propose changes for approval; do not silently promote mastery after one answer.
- Distinguish definitions, assumptions, and empirical claims. State uncertainty and verify doubtful claims using available, authorized sources.
- Use Mermaid text for dependency maps and LaTeX for math. Do not upload learner images or private notes to external services without appropriate permission.
