# Learning Tuna — English Guide

[Home / 메인](README.md) · [한국어](README.ko.md) · **English**

A **Pi-based learning app** you clone into your personal projects directory. It starts by asking about your goal, source material, and available time, then teaches from an approved plan.
Inspired by the learning workflow in [amosblomqvist/learn](https://github.com/amosblomqvist/learn), without copying its extensions or requiring tmux.

> This is an English guide, not an English UI implementation. Some command arguments, dialogs, and generated page headings currently use Korean. Commands below match the actual supported syntax. You can ask the teaching agent to explain lessons in English.

## Installation

### 1. Prerequisites

Prepare these tools on Windows or macOS. Skip tools you already have.

- [Git](https://git-scm.com/downloads) to clone the repository.
- [Node.js](https://nodejs.org/) **22.19 or newer**; npm is included.
- [Pi](https://pi.dev), the agent that runs this app.

If Pi is not installed, run this in your **terminal**:

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Open a new terminal and verify:

```sh
git --version
node --version
pi --version
```

### 2. Clone into your personal projects directory

In your terminal, navigate to your preferred parent directory, then run:

```sh
git clone <repository-url> learning-tuna
cd learning-tuna
```

Replace `<repository-url>` with this repository's actual Git URL. Do not enter the placeholder or angle brackets literally.

Do **not** name the checkout `.pi`. The app's own `.pi/settings.json` loads it as a local Pi package. Standalone use requires neither a separate `pi install` nor a project-level `npm install`.

## Getting started

### 1. Run the app and connect an AI provider

From the app root, run in your **terminal**:

```sh
cd learning-tuna
pi
```

If you are already in the app root, run only `pi`. Review the project code and approve project trust when prompted.
If no AI provider is connected, use `/login` **inside Pi**, then `/model` to choose a model.

If Pi is already running in this directory, use `/reload` **inside Pi** to load updates. Avoid duplicate installations that register the same `/learn` command or Skill name.
Always start Pi from the app root. Personal data is stored in `learning/` relative to Pi's working directory.

### 2. Create your first learning plan

Run **inside Pi**, not in bash or PowerShell:

```text
/learn init
```

Answer the agent's questions about your material, goal, and duration. Review the proposed plan and approve saving it. For example: “I want to study chapters 1–3 of this book over two weeks, with 15 minutes on each learning day.”

Once the planner, syllabus, and handoff documents are ready, configure flexible tracking and start:

```text
/learn track
/learn today
```

`track` asks for the start date, total lesson count, and available weekdays, then requests confirmation. **Two calendar weeks and eight lessons are different quantities**; the app does not assume they are equal.
Weekday input uses `0` for Sunday through `6` for Saturday, separated by commas, such as `1,3,5` for Monday, Wednesday, and Friday. Date input uses `YYYYMMDD`.

### 3. Return the next day

Start `pi` from the same app directory and run `/learn today` inside Pi. A new conversation can continue from saved records.
**Do not run `/learn init` every day.** If your goal or duration changes, first tell the agent that you want to revise the existing plan.

### Command reference

| Command inside Pi | Purpose |
|---|---|
| `/learn init` | Create an initial plan through questions |
| `/learn schedule` | Generate or regenerate documents from approved schedule JSON |
| `/learn track` | Confirm the start date, total lessons, and learning weekdays |
| `/learn progress` | View confirmed completion, dates needing attention, and reflowed future dates |
| `/learn finish YYYYMMDD_N` | Confirm completed, partial, or not-studied participation |
| `/learn today` | Resume unfinished work or start one next lesson |
| `/learn home` | Refresh home-page links without creating a session |
| `/learn today 기초부터` | Use the foundations-first approach for this lesson |
| `/learn today 목표부터` | Use the goal-first approach for this lesson |
| `/learn help` | Show app commands |

The Korean arguments `기초부터` and `목표부터` are the currently supported command spellings; do not replace them with English translations.
Use `/learn schedule` if the agent cannot execute the local materializer, or if you want another document snapshot. An approved `learning/schedule.json` must already exist.
If `/learn` is unavailable, check that Pi was started from the app root, approve project trust, and run `/reload`.

## How initial planning works

```text
/learn init
```

This starts a planning conversation rather than generating the demo. The agent asks about:

1. What you want to learn and the depth of understanding you need.
2. Whether the source is a book, paper, YouTube video, or something else; its title/reference and exact scope.
3. Its estimated duration, the **calendar-day duration you confirm**, and time available on a learning day.
4. Whether to start with foundations or with the target problem.

**Seven calendar days or more is long-term.** Calendar duration and learning-day frequency are confirmed separately. If the material cannot be accessed, the agent should request a table of contents or summary and record the uncertainty. It must not claim to have read unavailable sources.

The agent explains the scope and plan, then asks for permission to save. The Skill instructs it to write `learning/schedule.json` and run the local document materializer. If local execution is unavailable, run:

```text
/learn schedule
```

The app validates the JSON and creates a new snapshot containing:

| File | Purpose |
|---|---|
| `planner.md` | A short plan or long-term weekly planner |
| `syllabus.md` | Keywords with brief explanations; Korean is supported |
| `handoff.md` | Detailed goal, source verification limits, learner baseline, rationale, and next action; English is supported |
| `schedule.json` | The schedule at the time of generation |
| `READY` | Indicates that all planning documents were generated |

Repeated generation creates another snapshot without overwriting earlier documents. Incomplete snapshots without `READY` are ignored when resuming.
This is a learning plan, **not a background task or notification schedule**. Weeks are relative days 1–7, 8–14, and so on from the agreed start, rather than Monday-based calendar weeks. The plan must not assume daily attendance; availability belongs in the planning rationale.

## Continuing from saved context

```text
/learn today
```

With an approved schedule, the app prepares the learning folder and updates `learning/index.md`. New folders are named `learning/sessions/YYYYMMDD_N/`: the date is the **device-local creation date**, and `N` counts folders created on that date.

With tracking enabled, `/learn today` **reuses an unfinished folder**, so it may not create a new one. Actual study and completion dates are stored in separate outcome records. A folder's daily sequence is not its course lesson number.
Without tracking, each invocation creates a new folder. Use `/learn home` to refresh links only.

The agent is instructed to read:

- The active `learning/schedule.json`.
- The latest complete planner, syllabus, and initial handoff snapshot.
- The latest substantive session records, not the current folder's empty templates.

The syllabus stays concise, but **explanations and feedback should be detailed**. The Skill asks the agent to preserve questions, reasoning, assumptions, misconceptions, evidence, unresolved gaps, and next actions. Continuation should not depend on remembering the previous chat.

Duration estimation, source interpretation, draft writing, and lesson recording are **agent-guided steps**, not deterministic guarantees. Real-source teaching accuracy and record completeness have not been validated end to end. Saving failures must be disclosed; dates and mastery must not advance automatically.

## Flexible progress without catch-up debt

### Confirm participation

After recording the lesson, run inside Pi, replacing the example with your actual folder name:

```text
/learn finish 20260709_1
```

Select a status in the UI, enter the actual date and what you did or what remains, then confirm:

- **완료** — completed: advance to the next lesson.
- **부분학습** — partial: continue the remaining work in this lesson.
- **안함** — not studied: keep the lesson for the next available day.
- **No outcome record** — unconfirmed, not proof of absence. You may have studied offline or forgotten to record it.

You can backdate confirmation of the current unfinished lesson if you recorded it late or studied offline. Future dates and dates before the confirmed course start are rejected.
Completion confirms participation, not automatic mastery. Folders, checkboxes, and `READY` do not prove completion.

### Reflow after a missed day

The default is **one lesson per available day**, without added catch-up debt:

```text
Monday:    complete lesson 1
Tuesday:   take a break
Wednesday: do lesson 2 only
Thursday:  do lesson 3
```

`/learn progress` and the home page show past dates needing attention, the next lesson, remaining dates, and the projected ending. Passing dates never advances progress. Future dates are recomputed from the current date and confirmed completion; the ending may move later.

An **extra lesson requires separate confirmation** after a lesson has already been completed that day. Studying outside configured weekdays is also optional. The app does not force two lessons, and unselected days are excluded from default reflow.

The original `schedule.json`, syllabus, and planner are preserved. Dynamic lesson dates appear in the progress view and home page. The agent uses actual handoff records to guide content order; automatic per-lesson syllabus splitting and rewriting of the original planner are not implemented.

Legacy folders created before tracking are not automatically counted or assigned to current lessons. Tracking is configured once. Dedicated features for correcting outcomes, changing weekdays, or moving progress to another goal are not yet implemented. Changed goals or source scopes must be reconciled rather than silently inheriting old progress.

## The learning loop and home page

| Step | File | Content |
|---|---|---|
| Recall | `review.md` | Retrieve a prior concept without notes; check prerequisites in the first lesson |
| Learn | `lesson.md` | Concepts, assumptions, reasoning, and connections |
| Check | `quiz.md` | One or two unassisted questions, attempts, and feedback |
| Apply | `practice.md` | Math problems/derivations, computing implementations/tests, or English writing/speaking |
| Reflect | `reflection.md` | Understanding evidence, unresolved questions, and review candidates |
| Handoff | `handoff.md` | Detailed context for an agent without the previous conversation |

The app creates files and links; the agent fills the actual questions, explanations, and feedback. Folder creation or `READY` **does not mean the lesson is complete**. Participation and understanding remain separate. Coding is not mandatory for every subject.

Example:

```text
learning/
├── index.md                 # Home page
└── sessions/
    ├── 20260709_1/
    │   ├── index.md         # Learning-loop links and checkboxes
    │   ├── review.md
    │   ├── lesson.md
    │   ├── quiz.md
    │   ├── practice.md
    │   ├── reflection.md
    │   ├── handoff.md
    │   └── READY            # Templates ready, not completion
    └── 20260709_2/
```

Open `learning/index.md` as your home page in Obsidian. Follow **today's learning → the session's index → individual steps**. The home page also links planning documents and earlier sessions. Relative Markdown links survive moving the entire folder together.

Personal notes outside the marked generated section are preserved. An existing unrelated `index.md` without those markers is not overwritten; the app reports an error instead. Date-dependent links refresh with `/learn today` or `/learn home`, not automatically at midnight.

## Learning approaches and the optional concept graph

- **Foundations-first (`기초부터`)**: connect the foundations needed for your target.
- **Goal-first (`목표부터`)**: attempt the target problem, investigate a blocking prerequisite, and return to the target.

`/learn today 기초부터` or `/learn today 목표부터` changes the approach for this session only, not the default schedule.
The concept graph is separate from the initial schedule and requires `learning/plan.json`. To try the demo:

```text
/learn demo 기초부터
/learn map
/learn export
```

`demo` creates only a weighted-mean example graph and does not overwrite an existing graph. When `schedule.json` exists, `today` prioritizes the actual schedule. Without it, the graph suggests a single question.
Legacy internal graph mode values remain for compatibility, while learner-facing names use simpler terms. Missing prerequisites, duplicate IDs, and cycles are rejected.

## Project layout

```text
.pi/settings.json                 # Relative local package discovery
AGENTS.md                         # Assistant guidance
src/core.ts                       # Concept graph and question selection
src/schedule.ts                   # Schedule validation and rendering
src/storage.ts                    # Schedule file operations
src/save-schedule.ts              # Agent-accessible local materializer
src/sessions.ts                   # Session folders and home-page links
src/calendar.ts                   # Local dates and weekday arithmetic
src/tracking.ts                   # Confirmed outcomes and lesson reflow
src/workspace.ts                  # In-process mutation queue
src/extension.ts                  # /learn commands
skills/learn/SKILL.md              # Intake, teaching, and durable context
skills/learn/references/           # Schedule schema reference
examples/plan.json                # Optional concept-map demo
tests/                            # Core and mocked integration tests
learning/                         # Personal data, excluded from Git
  schedule.json                   # Active approved schedule
  tracking.json                   # Confirmed start, lesson count, and weekdays
  schedules/                      # Immutable planning snapshots
  index.md                        # Home page
  sessions/YYYYMMDD_N/            # Loop pages and handoff
    progress.json                 # Immutable lesson assignment
    outcomes/                     # Append-only confirmed participation
```

Current scope: one active schedule per app. User-confirmed participation and date reflow are available. Multiple goals, automatic grading, spaced repetition, unconfirmed completion inference, and automatic plan merging are not implemented.

## Obsidian, Windows, and macOS

Place or copy generated Markdown into a Vault. Concept-map exports use Mermaid. Editing notes does not automatically update JSON.
The app avoids platform-specific shells, Chrome paths, and tmux. Actual macOS execution is still unverified.

Clone the code on each device and separately sync/back up `learning/`. It is excluded from Git, so cloning again does not restore personal records. Concurrent editing on two devices is not supported. Git exclusion is not encryption or an external-transfer security boundary.

Only if you want to install this app as an extension in another project, run from that project's root:

```sh
pi install --local <path-to-learning-tuna>
```

Avoid duplicate user-level and project-level registrations.

## Tests

```sh
npm test
```

Tests cover the six/seven-day boundary, date/source validation, session folders and links, personal-note preservation, missed-day reflow, partial-session resume, optional extra work, duplicate completion prevention, UI cancellation, and the existing concept graph. Mocked tests do not guarantee real agent questioning, source interpretation, or complete lesson records.
