export type SourceKind = "book" | "paper" | "youtube" | "other";

export interface StudySchedule {
  schemaVersion: 1;
  goal: string;
  source: { kind: SourceKind; title: string; reference: string; scope: string };
  durationDays: number;
  durationConfirmed: true;
  dailyMinutes: number;
  approach: "foundations" | "goal";
  sourceAssessment: string;
  currentUnderstanding: string;
  rationale: string;
  nextAction: string;
  keywords: { term: string; description: string }[];
  periods: { fromDay: number; toDay: number; focus: string; keywords: string[] }[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function parseSchedule(value: unknown): StudySchedule {
  if (!object(value) || value.schemaVersion !== 1 || !text(value.goal)
    || !positiveInteger(value.durationDays) || value.durationConfirmed !== true
    || !positiveInteger(value.dailyMinutes) || !["foundations", "goal"].includes(String(value.approach))
    || typeof value.approach !== "string"
    || !object(value.source) || typeof value.source.kind !== "string"
    || !["book", "paper", "youtube", "other"].includes(value.source.kind)
    || ![value.source.title, value.source.reference, value.source.scope,
      value.sourceAssessment, value.currentUnderstanding, value.rationale, value.nextAction].every(text)
    || !Array.isArray(value.keywords) || value.keywords.length === 0
    || !Array.isArray(value.periods) || value.periods.length === 0) {
    throw new Error("Invalid schedule. Confirm duration, source, scope, and handoff details first.");
  }
  const terms = new Set<string>();
  for (const keyword of value.keywords) {
    if (!object(keyword) || !text(keyword.term) || !text(keyword.description) || terms.has(keyword.term)) {
      throw new Error("Invalid or duplicate syllabus keyword.");
    }
    terms.add(keyword.term);
  }
  let nextDay = 1;
  for (const period of value.periods) {
    if (!object(period) || !positiveInteger(period.fromDay) || !positiveInteger(period.toDay)
      || period.fromDay !== nextDay || period.toDay < period.fromDay || period.toDay > value.durationDays
      || !text(period.focus) || !Array.isArray(period.keywords) || period.keywords.length === 0
      || !period.keywords.every((term) => typeof term === "string" && terms.has(term))) {
      throw new Error("Periods must cover consecutive study days and reference known keywords.");
    }
    nextDay = period.toDay + 1;
  }
  if (nextDay !== value.durationDays + 1) throw new Error("Periods must cover the full duration.");
  return value as unknown as StudySchedule;
}

export function isLongTerm(schedule: StudySchedule): boolean {
  return schedule.durationDays >= 7;
}

export function approachLabel(approach: StudySchedule["approach"]): string {
  return approach === "foundations" ? "기초부터" : "목표부터";
}

export function renderSyllabus(schedule: StudySchedule): string {
  parseSchedule(schedule);
  return ["# 실라버스", "", schedule.goal, "",
    ...schedule.keywords.map((keyword) => `- **${keyword.term}**: ${keyword.description}`), ""].join("\n");
}

export function renderPlanner(schedule: StudySchedule): string {
  parseSchedule(schedule);
  const lines = [isLongTerm(schedule) ? "# 장기 학습 플래너" : "# 단기 학습 계획", "",
    `목표: ${schedule.goal}`, `자료: ${schedule.source.title} (${schedule.source.kind})`,
    `범위: ${schedule.source.scope}`, `기간: ${schedule.durationDays}일 (사용자 확인)`,
    `하루: ${schedule.dailyMinutes}분`, `진행: ${approachLabel(schedule.approach)}`, ""];
  if (isLongTerm(schedule)) {
    for (let start = 1; start <= schedule.durationDays; start += 7) {
      const end = Math.min(start + 6, schedule.durationDays);
      lines.push(`## ${Math.ceil(start / 7)}주차 (${start}–${end}일)`, "");
      for (const period of schedule.periods.filter((item) => item.fromDay <= end && item.toDay >= start)) {
        lines.push(`- ${Math.max(start, period.fromDay)}–${Math.min(end, period.toDay)}일: ${period.focus} — ${period.keywords.join(", ")}`);
      }
      lines.push("");
    }
  } else {
    for (const period of schedule.periods) {
      lines.push(`- ${period.fromDay}–${period.toDay}일: ${period.focus} — ${period.keywords.join(", ")}`);
    }
  }
  return [...lines, "", "이 문서는 학습 계획이며 자동 실행·알림을 예약하지 않습니다.", ""].join("\n");
}

export function renderHandoff(schedule: StudySchedule): string {
  parseSchedule(schedule);
  return ["# Agent handoff", "", "## Agreed goal and constraints", "",
    schedule.goal, `Duration: ${schedule.durationDays} calendar days from the agreed start, explicitly confirmed by the learner.`,
    `Daily budget: ${schedule.dailyMinutes} minutes. Approach: ${schedule.approach}.`, "",
    "## Source and verified scope", "", `Kind: ${schedule.source.kind}`,
    `Title: ${schedule.source.title}`, `Reference: ${schedule.source.reference}`,
    `Scope: ${schedule.source.scope}`, schedule.sourceAssessment, "",
    "## Learner baseline", "", schedule.currentUnderstanding, "",
    "## Planning decisions and rationale", "", schedule.rationale, "",
    "## Progress evidence", "", "No lesson has been completed by creating this schedule. Do not infer mastery.", "",
    "## Next session", "", schedule.nextAction, "",
    "Read the current schedule and the latest session notes before teaching. Reconcile any contradictions with the learner.",
    "Use the current learning/sessions/YYYYMMDD_N/ folder for the recall, lesson, quiz, application, and reflection loop. Update its handoff.md with detailed context; preserve all previous session folders.",
    "Record the attempted question, learner reasoning, feedback, explained concepts and assumptions, unresolved gaps, plan changes, and a concrete next action.", ""].join("\n");
}
