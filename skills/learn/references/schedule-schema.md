# Schedule schema (version 1)

Write `learning/schedule.json` only after intake and explicit approval. The following is a STRUCTURAL EXAMPLE, not a recommended seven-day duration for every subject. Replace every content field with the learner's actual agreement.

```json
{
  "schemaVersion": 1,
  "goal": "Explain how weighted observations combine.",
  "source": {
    "kind": "book",
    "title": "The learner's chosen textbook",
    "reference": "User-provided bibliographic reference or local path",
    "scope": "The agreed chapter and page range"
  },
  "durationDays": 7,
  "durationConfirmed": true,
  "dailyMinutes": 10,
  "approach": "foundations",
  "sourceAssessment": "Only the learner's chapter summary was available; the full text has not been verified.",
  "currentUnderstanding": "The learner reports familiarity with arithmetic means. No diagnostic question has been attempted yet.",
  "rationale": "The learner confirmed a seven-calendar-day plan with ten minutes available on learning days. Begin by checking the arithmetic mean, then connect repeated observations to weights. Reserve time for a target problem and reflection. The proposed scope excludes uncertainty estimation and assumes positive weights.",
  "nextAction": "Confirm the learner's available time, ask for the mean of two observations and their reasoning, and record the actual attempt before choosing the next question.",
  "keywords": [
    { "term": "산술평균", "description": "관측값을 같은 비중으로 결합하는 대표값." },
    { "term": "가중평균", "description": "관측값의 상대적 비중을 반영하는 대표값." }
  ],
  "periods": [
    { "fromDay": 1, "toDay": 2, "focus": "평균의 의미 확인", "keywords": ["산술평균"] },
    { "fromDay": 3, "toDay": 7, "focus": "가중치와 목표 문제", "keywords": ["가중평균"] }
  ]
}
```

## Field rules

- `source.kind`: `book`, `paper`, `youtube`, or `other`. For a question without a source, use `other` and explicitly say that no external source was provided; never invent a reference.
- `source.reference`: a user-provided title/citation, local file reference, or URL. Storing a URL does not mean its content was verified.
- `source.scope`: the specific agreed content, not just a source type.
- `durationDays`: a positive integer of calendar days from the agreed start; **7 or more is long-term**. Preserve learning-day availability in the rationale instead of assuming daily attendance.
- `durationConfirmed`: must be the boolean `true`, only after the learner confirms.
- `dailyMinutes`: a positive integer; a budget, not a guarantee of task duration.
- `approach`: `foundations` is displayed as 기초부터, `goal` as 목표부터.
- `keywords`: unique terms with brief explanations, usually in Korean. These are not lectures.
- `periods`: ordered, consecutive, inclusive ranges from day 1 through `durationDays`, with no gaps or overlaps. Each references known keyword terms. Long-term output splits these ranges into weekly focuses automatically.
- `sourceAssessment`, `currentUnderstanding`, `rationale`, `nextAction`: substantive handoff details, not generic placeholders. English is acceptable. Preserve verification limits and unknown learner knowledge.

## Materialization

`/learn schedule` validates the active JSON, then writes a new immutable directory:

```text
learning/schedules/<UTC-timestamp>-<unique-id>/
├── schedule.json
├── planner.md
├── syllabus.md
├── handoff.md
└── READY
```

`READY` is created last. Ignore a snapshot without it. Re-running the command creates a new snapshot instead of overwriting previous notes. This is not a cron job or notification schedule.

`/learn today` allocates a new `learning/sessions/YYYYMMDD_N/` folder using the device-local date and a per-day numeric sequence, or reuses the assigned unfinished folder when tracking is active. Fill its recall, lesson, quiz, application, reflection, and handoff pages as the learner progresses; templates are not progress evidence. Future sessions read prior substantive records alongside the initial handoff. `learning/index.md` links the loop pages and flexible progress view; `/learn home` refreshes the home page without allocating a session. `/learn track` asks for the start date, total lesson count, and available weekdays separately from this schema. `/learn finish <folder-id>` adds confirmed participation records; only completed lessons advance the content, while dates reflow without doubling the next day's workload.
