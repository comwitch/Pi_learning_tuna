import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { availableDates, localDateKey, nextDate, validateDate } from "./calendar.ts";
import { withWorkspaceQueue } from "./workspace.ts";
import type { StudySchedule } from "./schedule.ts";

export type OutcomeStatus = "completed" | "partial" | "not-studied";
export interface TrackingPlan {
  schemaVersion: 1;
  id: string;
  courseKey: string;
  startDate: string;
  totalLessons: number;
  weekdays: number[];
  userConfirmed: true;
}
export interface SessionAssignment {
  schemaVersion: 1;
  trackingId: string;
  lessonNumber: number;
  startedOn: string;
}
export interface SessionOutcome {
  schemaVersion: 1;
  status: OutcomeStatus;
  summary: string;
  studiedOn: string;
  recordedAt: string;
  userConfirmed: true;
}
export interface TrackedSession {
  id: string;
  assignment: SessionAssignment;
  outcomes: SessionOutcome[];
  status: OutcomeStatus | "prepared";
}
export interface ProgressView {
  tracking: TrackingPlan;
  sessions: TrackedSession[];
  completedCount: number;
  nextLesson: number | null;
  pendingSession?: TrackedSession;
  completedToday: boolean;
  missedCandidates: { lessonNumber: number; date: string; status: string }[];
  remainingDates: { lessonNumber: number; date: string }[];
  originalEnd: string;
  projectedEnd: string | null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
export function courseKey(schedule: StudySchedule): string {
  // Duration changes do not invalidate progress; goal or source-scope changes do.
  return createHash("sha256").update(JSON.stringify({ goal: schedule.goal, source: schedule.source })).digest("hex");
}
export function parseTracking(value: unknown): TrackingPlan {
  if (!object(value) || value.schemaVersion !== 1 || !text(value.id) || !text(value.courseKey)
    || !text(value.startDate) || typeof value.totalLessons !== "number"
    || !Number.isSafeInteger(value.totalLessons) || value.totalLessons < 1 || value.totalLessons > 1000
    || !Array.isArray(value.weekdays) || !value.weekdays.length
    || value.weekdays.some((day) => typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6)
    || new Set(value.weekdays).size !== value.weekdays.length || value.userConfirmed !== true) {
    throw new Error("Invalid tracking plan. Confirm start date, total lessons, and weekdays.");
  }
  validateDate(value.startDate);
  return value as unknown as TrackingPlan;
}
export async function readTracking(cwd: string): Promise<TrackingPlan | undefined> {
  try {
    return parseTracking(JSON.parse(await readFile(join(cwd, "learning", "tracking.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
export async function initializeTracking(cwd: string, schedule: StudySchedule,
  options: { startDate: string; totalLessons: number; weekdays: number[]; userConfirmed: boolean }): Promise<TrackingPlan> {
  const tracking = parseTracking({ schemaVersion: 1, id: randomUUID(), courseKey: courseKey(schedule), ...options });
  return withWorkspaceQueue(cwd, async () => {
    await mkdir(join(cwd, "learning"), { recursive: true });
    await writeFile(join(cwd, "learning", "tracking.json"), `${JSON.stringify(tracking, null, 2)}\n`, { flag: "wx" });
    return tracking;
  });
}

async function names(path: string): Promise<string[]> {
  try { return await readdir(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
function parseAssignment(value: unknown, tracking: TrackingPlan): SessionAssignment {
  if (!object(value) || value.schemaVersion !== 1 || value.trackingId !== tracking.id
    || typeof value.lessonNumber !== "number" || !Number.isSafeInteger(value.lessonNumber)
    || value.lessonNumber < 1 || value.lessonNumber > tracking.totalLessons || !text(value.startedOn)) {
    throw new Error("Invalid tracked session assignment.");
  }
  validateDate(value.startedOn);
  return value as unknown as SessionAssignment;
}
function parseOutcome(value: unknown): SessionOutcome {
  if (!object(value) || value.schemaVersion !== 1 || typeof value.status !== "string"
    || !["completed", "partial", "not-studied"].includes(value.status)
    || !text(value.summary) || !text(value.studiedOn) || !text(value.recordedAt)
    || !Number.isFinite(Date.parse(value.recordedAt)) || value.userConfirmed !== true) {
    throw new Error("Invalid outcome record. Completion must be explicitly confirmed.");
  }
  validateDate(value.studiedOn);
  return value as unknown as SessionOutcome;
}
async function trackedSessions(cwd: string, tracking: TrackingPlan): Promise<TrackedSession[]> {
  const root = join(cwd, "learning", "sessions");
  const sessions: TrackedSession[] = [];
  for (const id of (await names(root)).filter((name) => /^\d{8}_[1-9]\d*$/.test(name))) {
    let raw: unknown;
    try {
      await readFile(join(root, id, "READY"));
      raw = JSON.parse(await readFile(join(root, id, "progress.json"), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    const assignment = parseAssignment(raw, tracking);
    const outcomes: SessionOutcome[] = [];
    for (const file of (await names(join(root, id, "outcomes"))).filter((name) => /^\d{6}\.json$/.test(name)).sort()) {
      outcomes.push(parseOutcome(JSON.parse(await readFile(join(root, id, "outcomes", file), "utf8"))));
    }
    sessions.push({ id, assignment, outcomes, status: outcomes.at(-1)?.status ?? "prepared" });
  }
  return sessions;
}

export async function getProgress(cwd: string, now = new Date()): Promise<ProgressView | undefined> {
  const tracking = await readTracking(cwd);
  if (!tracking) return undefined;
  const today = localDateKey(now);
  const sessions = await trackedSessions(cwd, tracking);
  const completed = new Set(sessions.filter((session) => session.status === "completed").map((session) => session.assignment.lessonNumber));
  let next = 1;
  while (completed.has(next)) next += 1;
  // Refuse inconsistent imported state rather than silently skipping unconfirmed lessons.
  if ([...completed].some((number) => number >= next)) throw new Error("Progress contains an unconfirmed lesson gap.");
  const pending = sessions.filter((session) => session.assignment.lessonNumber === next && session.status !== "completed");
  if (pending.length > 1) throw new Error("Multiple unfinished folders claim the same lesson.");
  const original = availableDates(tracking.startDate, tracking.weekdays, tracking.totalLessons);
  const completedToday = sessions.some((session) => session.outcomes.some((outcome) => outcome.status === "completed" && outcome.studiedOn === today));
  const missedCandidates: ProgressView["missedCandidates"] = [];
  original.forEach((date, index) => {
    if (date >= today) return;
    const session = sessions.find((item) => item.assignment.lessonNumber === index + 1);
    const attended = session?.outcomes.some((outcome) => outcome.status !== "not-studied" && outcome.studiedOn <= date);
    if (!attended) missedCandidates.push({ lessonNumber: index + 1, date, status: session?.status ?? "unconfirmed" });
  });
  const remaining = tracking.totalLessons - completed.size;
  const anchor = today < tracking.startDate ? tracking.startDate : today;
  // Default workload is one lesson per available day; no automatic doubled catch-up.
  const projected = availableDates(completedToday ? nextDate(anchor) : anchor, tracking.weekdays, remaining);
  return {
    tracking, sessions, completedCount: completed.size,
    nextLesson: next > tracking.totalLessons ? null : next,
    pendingSession: pending[0], completedToday, missedCandidates,
    remainingDates: projected.map((date, index) => ({ lessonNumber: next + index, date })),
    originalEnd: original.at(-1)!, projectedEnd: projected.at(-1) ?? null,
  };
}

export async function recordOutcome(cwd: string, sessionId: string,
  input: { status: OutcomeStatus; summary: string; studiedOn: string; userConfirmed: boolean }, now = new Date()): Promise<void> {
  if (!/^\d{8}_[1-9]\d*$/.test(sessionId)) throw new Error("Invalid session ID.");
  const outcome = parseOutcome({ schemaVersion: 1, ...input, recordedAt: now.toISOString() });
  if (outcome.studiedOn > localDateKey(now)) throw new Error("Cannot confirm future learning.");
  return withWorkspaceQueue(cwd, async () => {
    const progress = await getProgress(cwd, now);
    const session = progress?.sessions.find((item) => item.id === sessionId);
    if (!session || session.assignment.lessonNumber !== progress?.nextLesson || session.status === "completed") {
      throw new Error("Confirm only the current unfinished tracked lesson; prior completion cannot be counted twice.");
    }
    // Explicit self-reports may be backdated for offline study before folder creation.
    if (outcome.studiedOn < progress!.tracking.startDate) throw new Error("Study date precedes the confirmed course start.");
    const directory = join(cwd, "learning", "sessions", sessionId, "outcomes");
    await mkdir(directory, { recursive: true });
    const file = `${String(session.outcomes.length + 1).padStart(6, "0")}.json`;
    await writeFile(join(directory, file), `${JSON.stringify(outcome, null, 2)}\n`, { flag: "wx" });
  });
}

export function renderProgress(progress: ProgressView): string {
  const labels: Record<string, string> = { prepared: "미확인", completed: "완료 확인", partial: "부분 학습", "not-studied": "안 함 확인", unconfirmed: "기록 없음" };
  const lines = ["## 유연한 학습 진도", "", `완료 확인: ${progress.completedCount}/${progress.tracking.totalLessons}회차`,
    `다음: ${progress.nextLesson === null ? "모든 회차 완료" : `${progress.nextLesson}회차 하나`}`,
    `당초 예상 종료: ${progress.originalEnd}`, `재배치 예상 종료: ${progress.projectedEnd ?? "완료"}`, "",
    "날짜는 완료 증거가 아닙니다. 기록 없는 지난 날짜는 미학습 후보이며, 외부에서 공부했다면 확인이 필요합니다.", ""];
  if (progress.pendingSession) lines.push(`이어할 폴더: [${progress.pendingSession.id}](sessions/${progress.pendingSession.id}/index.md) (${labels[progress.pendingSession.status]})`, "");
  if (progress.missedCandidates.length) {
    lines.push("### 지난 예정일의 미확인·지연 기록", "");
    for (const item of progress.missedCandidates) lines.push(`- ${item.date}: ${item.lessonNumber}회차 (${labels[item.status] ?? item.status})`);
  }
  lines.push("", "### 남은 회차의 유동적 날짜", "");
  for (const item of progress.remainingDates) lines.push(`- ${item.date}: ${item.lessonNumber}회차`);
  lines.push("", "기본은 가능한 요일에 한 회차씩입니다. 부분 학습은 이어가고, 추가 회차는 별도 확인합니다. 이 날짜 목록은 제안이며 자동 알림이나 강제 마감이 아닙니다.", "");
  return lines.join("\n");
}
