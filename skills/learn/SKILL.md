---
name: learn
description: Guide a learner through a learning-tuna plan using bottom-up foundations or top-down target problems. Use when the learner requests a lesson or discusses a suggested quest.
---

# Learning Tuna

## Start

- Ask what question the learner wants to answer and how deeply: intuition, derivation, or implementation.
- Read `learning/plan.json` relative to the learner's project working directory when it exists. The bundled plan is an example, not their actual goal.
- Confirm the proposed scope and dependency map before teaching. Do not assume that a prerequisite graph is uniquely correct.
- Confirm the preferred approach and available time. Do not insist on exhaustive diagnostics before a short daily lesson.

## Bottom-up

Start with an unfinished foundation relevant to the target. Motivate it, explain it, ask the learner to attempt one small question, and explicitly connect it to the next concept. Do not expand into unrelated foundations.

## Top-down

Start with the target question or a concrete application. Let the learner attempt it. Identify the particular gap that blocks the attempt, descend into that prerequisite, then return to the original question. Do not reveal the entire solution before the learner tries.

## Daily loop

1. Briefly recall prior learning if available; never invent past performance.
2. Offer one question within the time budget.
3. Give feedback on the attempt and ask for a short explanation of the relevant connection.
4. Summarize what remains unclear and suggest the next small action.

## Progress and safety

- `unknown`: understanding has not been established.
- `blocked`: an attempted problem exposed a gap; in top-down mode this enables prerequisite descent.
- `understood`: explicitly confirmed by the learner with supporting evidence; a single correct answer is insufficient.
- The scaffold has no automatic grading, evidence log, spaced repetition, or completion tracking. Explain this limitation.
- Suggest plan changes for approval; do not silently change progress or overwrite personal notes.
- Distinguish definitions, assumptions, and empirical claims. State uncertainty and verify doubtful claims using available, authorized sources.
- Use Mermaid text for dependency maps and LaTeX for math. Do not upload learner images or private notes to external services without appropriate permission.
