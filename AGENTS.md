# Learning Tuna App

## Purpose

This repository is a standalone Pi-based learning workspace and a reusable Pi package. For standalone use, start Pi from the repository root. `.pi/settings.json` loads the package using a relative path; do not add a duplicate installation.

## Learning requests

- For schedule setup or a lesson, read `skills/learn/SKILL.md` and its schedule-schema reference.
- Initial setup is a question-driven intake: confirm source type and scope, duration, goal, daily budget, and recording permission before writing an approved schedule.
- Seven calendar days or more requires a long-term weekly planner. Keep the syllabus keyword-focused, but teaching and handoff records detailed.
- Display learning approaches as 기초부터 and 목표부터. Internal legacy graph values are compatibility details, not user-facing terminology.
- Before resuming, read the active schedule, the latest READY snapshot, and the latest substantive prior session records. Never assume yesterday's context or treat prepared templates as progress.
- Every lesson follows recall, new learning, a short unassisted check, subject-appropriate application, and reflection. Coding is appropriate for computing and optional mathematical experiments, not mandatory for English.
- Session folders use the device-local creation date and a per-day numeric sequence: `learning/sessions/YYYYMMDD_N/`. This sequence is not the course lesson number. Fill the current folder's pages and detailed `handoff.md`; an unfinished folder may be resumed on later dates. Preserve other folders and the current folder's prior work. Participation completion is separate from mastery.
- `/learn track` explicitly confirms the start date, total lessons, and weekdays; never infer these from calendar duration. `/learn finish` records user-confirmed completed, partial, or not-studied outcomes. Do not edit outcome records directly or infer completion from templates.
- Missing dates are confirmation candidates, not proof of absence. Only confirmed completion advances a lesson. Default reflow is one lesson per available day, with unfinished work resumed and the projected ending allowed to slip; never force doubled catch-up. Extra or off-day lessons require explicit UI confirmation.
- `learning/index.md` links today's folders and past records. Only its marked app-owned section is regenerated; preserve personal notes outside it. `/learn home` refreshes links without starting a session.
- Keep a learner's actual goal distinct from `examples/plan.json`, which is only a weighted-mean demo.
- Personal plans and exports belong in `learning/` relative to the working directory. Do not modify extension source code merely to teach a new topic.
- The scaffold supports one active schedule and an optional concept graph. It creates planning documents, not background jobs or alarms. AI-written session notes are not an automatic mastery database. Do not claim multiple goals, automatic grading, or spaced repetition.
- Propose changes to the learning graph and progress for approval. Never overwrite existing plans or personal notes without permission.

## Development requests

- Do not start a lesson when the user is asking to develop or debug the app.
- Keep teaching policy in `skills/learn/`, pure graph logic in `src/core.ts`, schedule validation and rendering in `src/schedule.ts`, schedule file operations in `src/storage.ts`, session folders and home-page links in `src/sessions.ts`, participation/reflow in `src/tracking.ts`, civil dates in `src/calendar.ts`, shared mutation serialization in `src/workspace.ts`, and Pi integration in `src/extension.ts`.
- Use Node.js cross-platform APIs. Avoid shell-specific dependencies, tmux requirements, and hard-coded device paths.
- Write code and comments in English; explain user-facing work in Korean.
- Run the smallest relevant test after behavior changes. `npm test` runs the scaffold's test files without installing dependencies.

## Personal data

`learning/` is excluded from Git, not encrypted or automatically backed up. Never send personal notes or images to external services without appropriate permission. Never modify `.env` files or run `git push`.
