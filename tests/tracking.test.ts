import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import learningExtension from "../src/extension.ts";
import { availableDates } from "../src/calendar.ts";
import { localDateKey, createStudySession, updateHome } from "../src/sessions.ts";
import { getProgress, initializeTracking, readTracking, recordOutcome } from "../src/tracking.ts";
import { parseSchedule } from "../src/schedule.ts";

const day = (date: number) => new Date(2026, 6, date, 12);
const schedule = () => parseSchedule({
  schemaVersion: 1, goal: "Practice the chosen idea", durationDays: 7, durationConfirmed: true,
  dailyMinutes: 20, approach: "foundations",
  source: { kind: "book", title: "Book", reference: "User citation", scope: "Chapter 1" },
  sourceAssessment: "Unverified full text", currentUnderstanding: "Unknown", rationale: "Agreed scope", nextAction: "Recall first",
  keywords: [{ term: "개념", description: "Short explanation" }],
  periods: [{ fromDay: 1, toDay: 7, focus: "Concept", keywords: ["개념"] }],
});
const workspace = () => mkdtemp(join(tmpdir(), "learning-tuna-tracking-test-"));
async function configure(cwd: string, totalLessons = 3) {
  return initializeTracking(cwd, schedule(), { startDate: "20260706", totalLessons, weekdays: [1, 2, 3, 4, 5], userConfirmed: true });
}

async function report(cwd: string, id: string, status: "completed" | "partial" | "not-studied", date: number) {
  await recordOutcome(cwd, id, { status, summary: "Learner-confirmed attempt and remaining work", studiedOn: localDateKey(day(date)), userConfirmed: true }, day(date));
}

test("missing one day keeps the same next lesson and moves the end date, never doubles the workload", async () => {
  const cwd = await workspace();
  await configure(cwd);
  const first = await createStudySession(cwd, schedule(), day(6));
  assert.equal((await getProgress(cwd, day(6)))?.completedCount, 0);
  await report(cwd, first.id, "completed", 6);
  // July 7 is missed entirely: no command, folder, or outcome is created.
  const view = (await getProgress(cwd, day(8)))!;
  assert.equal(view.nextLesson, 2);
  assert.equal(view.completedCount, 1);
  assert.equal(view.originalEnd, "20260708");
  assert.equal(view.projectedEnd, "20260709");
  assert.deepEqual(view.remainingDates, [{ lessonNumber: 2, date: "20260708" }, { lessonNumber: 3, date: "20260709" }]);
  assert.deepEqual(view.missedCandidates, [{ lessonNumber: 2, date: "20260707", status: "unconfirmed" }]);
  const second = await createStudySession(cwd, schedule(), day(8));
  assert.equal(second.lessonNumber, 2);
  assert.equal((await readdir(join(cwd, "learning", "sessions"))).length, 2);
});

test("partial and not-studied outcomes do not advance; resume preserves the existing folder and work", async () => {
  const cwd = await workspace();
  await configure(cwd);
  const session = await createStudySession(cwd, schedule(), day(6));
  await writeFile(join(session.directory, "lesson.md"), "Actual partial reasoning");
  await report(cwd, session.id, "partial", 6);
  const resumed = await createStudySession(cwd, schedule(), day(8));
  assert.equal(resumed.id, session.id);
  assert.equal(resumed.resumed, true);
  assert.equal(await readFile(join(resumed.directory, "lesson.md"), "utf8"), "Actual partial reasoning");
  assert.equal((await getProgress(cwd, day(8)))?.nextLesson, 1);
  await report(cwd, session.id, "not-studied", 8);
  assert.equal((await getProgress(cwd, day(8)))?.completedCount, 0);
  await report(cwd, session.id, "completed", 9);
  assert.equal((await getProgress(cwd, day(9)))?.nextLesson, 2);
  assert.equal((await readdir(join(session.directory, "outcomes"))).length, 3);
  await updateHome(cwd, day(9));
  assert.match(await readFile(join(cwd, "learning", "index.md"), "utf8"), /완료 확인: 1\/3회차/);
});

test("late confirmation of offline study resolves a missing-date candidate without inventing completion", async () => {
  const cwd = await workspace();
  await configure(cwd);
  const first = await createStudySession(cwd, schedule(), day(6));
  await report(cwd, first.id, "completed", 6);
  const second = await createStudySession(cwd, schedule(), day(8));
  assert.equal((await getProgress(cwd, day(8)))?.missedCandidates.length, 1);
  await recordOutcome(cwd, second.id, { status: "completed", summary: "Studied this lesson offline on July 7; recording it later", studiedOn: "20260707", userConfirmed: true }, day(8));
  const view = (await getProgress(cwd, day(8)))!;
  assert.equal(view.completedCount, 2);
  assert.equal(view.nextLesson, 3);
  assert.deepEqual(view.missedCandidates, []);
  assert.deepEqual(view.remainingDates, [{ lessonNumber: 3, date: "20260708" }]);
});

test("normal one-lesson workload requires opt-in for an extra lesson or an off-day", async () => {
  const cwd = await workspace();
  await configure(cwd);
  const session = await createStudySession(cwd, schedule(), day(6));
  await report(cwd, session.id, "completed", 6);
  await assert.rejects(createStudySession(cwd, schedule(), day(6)), /Additional work requires/);
  const extra = await createStudySession(cwd, schedule(), day(6), { allowExtra: true });
  assert.equal(extra.lessonNumber, 2);
  await assert.rejects(createStudySession(cwd, schedule(), day(11)), /not a configured learning day/);
  const optional = await createStudySession(cwd, schedule(), day(11), { allowOffDay: true });
  assert.equal(optional.id, extra.id);
});

test("confirmation, valid dates, course identity, and single completion are enforced", async () => {
  const cwd = await workspace();
  await assert.rejects(initializeTracking(cwd, schedule(), { startDate: "20260706", totalLessons: 3, weekdays: [1], userConfirmed: false }));
  await configure(cwd);
  await assert.rejects(configure(cwd), { code: "EEXIST" });
  const session = await createStudySession(cwd, schedule(), day(6));
  await assert.rejects(recordOutcome(cwd, session.id, { status: "completed", summary: "Attempt", studiedOn: "20260706", userConfirmed: false }, day(6)));
  await assert.rejects(recordOutcome(cwd, session.id, { status: "completed", summary: "Attempt", studiedOn: "20260707", userConfirmed: true }, day(6)), /future/);
  await assert.rejects(createStudySession(cwd, { ...schedule(), goal: "Different goal" }, day(6)), /different goal/);
  await report(cwd, session.id, "completed", 6);
  await assert.rejects(report(cwd, session.id, "completed", 6), /counted twice/);
  assert.equal((await getProgress(cwd, day(6)))?.completedCount, 1);
  assert.deepEqual(availableDates("20261030", [1, 3, 5], 3), ["20261030", "20261102", "20261104"]);
  assert.throws(() => availableDates("20260230", [1], 2));
});

test("long breaks and legacy folders do not imply learning, and completed courses create no new lesson", async () => {
  const cwd = await workspace();
  await mkdir(join(cwd, "learning", "sessions", "20260701_1"), { recursive: true });
  await writeFile(join(cwd, "learning", "sessions", "20260701_1", "READY"), "Legacy template");
  await configure(cwd, 1);
  assert.equal((await getProgress(cwd, day(20)))?.completedCount, 0);
  assert.equal((await getProgress(cwd, day(20)))?.nextLesson, 1);
  const session = await createStudySession(cwd, schedule(), day(20));
  await report(cwd, session.id, "completed", 20);
  assert.equal((await getProgress(cwd, day(20)))?.nextLesson, null);
  await assert.rejects(createStudySession(cwd, schedule(), day(21)), /All tracked lessons/);
});

test("UI cancellation never confirms learning; explicit finish advances exactly one lesson", async () => {
  const cwd = await workspace();
  await mkdir(join(cwd, "learning"));
  await writeFile(join(cwd, "learning", "schedule.json"), JSON.stringify(schedule()));
  const today = localDateKey(new Date());
  const responses = [today, "2", "0,1,2,3,4,5,6"];
  let approve = false;
  const messages: string[] = [];
  const errors: string[] = [];
  let handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
  learningExtension({ registerCommand(_name: string, command: { handler: typeof handler }) { handler = command.handler; },
    sendMessage(message: { content: string }) { messages.push(message.content); }, sendUserMessage() {},
  } as unknown as ExtensionAPI);
  const ctx = { cwd, hasUI: true, isIdle: () => true, ui: {
    input: async () => responses.shift(), select: async () => "완료", confirm: async () => approve,
    notify(message: string) { errors.push(message); },
  } } as unknown as ExtensionCommandContext;
  await handler!("track", ctx);
  assert.equal(await readTracking(cwd), undefined);
  approve = true;
  responses.push(today, "2", "0,1,2,3,4,5,6");
  await handler!("track", ctx);
  await handler!("today", ctx);
  const session = (await getProgress(cwd))!.pendingSession!;
  approve = false;
  responses.push("Solved a question and reflected; uncertainties recorded", today);
  await handler!(`finish ${session.id}`, ctx);
  assert.equal((await getProgress(cwd))?.completedCount, 0);
  approve = true;
  responses.push("Solved a question and reflected; uncertainties recorded", today);
  await handler!(`finish ${session.id}`, ctx);
  assert.equal((await getProgress(cwd))?.completedCount, 1);
  assert.match(messages.at(-1)!, /학습 상태를 기록/);
  assert.deepEqual(errors, []);
});
