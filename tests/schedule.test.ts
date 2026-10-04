import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import learningExtension from "../src/extension.ts";
import { isLongTerm, parseSchedule, renderHandoff, renderPlanner, renderSyllabus } from "../src/schedule.ts";
import { saveScheduleDocuments } from "../src/storage.ts";

function schedule(days = 7) {
  return parseSchedule({
    schemaVersion: 1,
    goal: "Understand the chosen source",
    source: { kind: "paper", title: "Example paper", reference: "User-provided citation", scope: "Section 2" },
    durationDays: days, durationConfirmed: true, dailyMinutes: 10, approach: "goal",
    sourceAssessment: "Only the abstract was supplied. Full text unverified.",
    currentUnderstanding: "No diagnostic evidence yet.",
    rationale: "The learner confirmed scope and duration. Start with the target question and investigate gaps.",
    nextAction: "Ask the learner to explain the target claim before giving feedback.",
    keywords: [{ term: "관측", description: "A short keyword explanation." }],
    periods: [{ fromDay: 1, toDay: days, focus: "Target and necessary prerequisites", keywords: ["관측"] }],
  });
}

test("six days is short-term, exactly seven days is long-term", () => {
  assert.equal(isLongTerm(schedule(6)), false);
  assert.equal(isLongTerm(schedule(7)), true);
  assert.match(renderPlanner(schedule(6)), /단기 학습 계획/);
  assert.match(renderPlanner(schedule(7)), /장기 학습 플래너/);
  const planner = renderPlanner(schedule(15));
  assert.match(planner, /1주차 \(1–7일\)/);
  assert.match(planner, /2주차 \(8–14일\)/);
  assert.match(planner, /3주차 \(15–15일\)/);
  assert.match(planner, /목표부터/);
});

test("rejects unconfirmed durations, source errors, unknown keywords, and incomplete periods", () => {
  assert.throws(() => parseSchedule({ ...schedule(), durationConfirmed: false }));
  assert.throws(() => parseSchedule({ ...schedule(), durationDays: 0 }));
  assert.throws(() => parseSchedule({ ...schedule(), dailyMinutes: 1.5 }));
  assert.throws(() => parseSchedule({ ...schedule(), source: { ...schedule().source, kind: "invalid" } }));
  assert.throws(() => parseSchedule({ ...schedule(), periods: [{ fromDay: 2, toDay: 7, focus: "Gap", keywords: ["관측"] }] }));
  assert.throws(() => parseSchedule({ ...schedule(), periods: [{ fromDay: 1, toDay: 6, focus: "Incomplete", keywords: ["관측"] }] }));
  assert.throws(() => parseSchedule({ ...schedule(), periods: [{ fromDay: 1, toDay: 7, focus: "Unknown", keywords: ["absent"] }] }));
});

test("syllabus stays keyword-focused while handoff preserves planning context and uncertainty", () => {
  const plan = schedule();
  const syllabus = renderSyllabus(plan);
  assert.match(syllabus, /A short keyword explanation/);
  assert.doesNotMatch(syllabus, /No diagnostic evidence/);
  const handoff = renderHandoff(plan);
  assert.match(handoff, /Full text unverified/);
  assert.match(handoff, /No diagnostic evidence/);
  assert.match(handoff, /learner confirmed scope/);
  assert.match(handoff, /before giving feedback/);
  assert.match(handoff, /No lesson has been completed/);
});

test("schedule snapshots preserve earlier files and resume asks the agent to read durable context", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "learning-tuna-schedule-test-"));
  const first = await saveScheduleDocuments(cwd, schedule());
  const before = await readFile(join(first, "handoff.md"), "utf8");
  const second = await saveScheduleDocuments(cwd, schedule());
  assert.notEqual(first, second);
  assert.equal(await readFile(join(first, "handoff.md"), "utf8"), before);
  assert.match(await readFile(join(second, "READY"), "utf8"), /Complete/);
  await writeFile(join(cwd, "learning", "schedule.json"), JSON.stringify(schedule()));

  const requests: string[] = [];
  const messages: string[] = [];
  let handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
  learningExtension({
    registerCommand(_name: string, command: { handler: typeof handler }) { handler = command.handler; },
    sendUserMessage(message: string) { requests.push(message); },
    sendMessage(message: { content: string }) { messages.push(message.content); },
  } as unknown as ExtensionAPI);
  const errors: string[] = [];
  const ctx = { cwd, isIdle: () => true, ui: { notify(message: string) { errors.push(message); } } } as unknown as ExtensionCommandContext;
  await handler!("schedule", ctx);
  assert.match(messages[0], /학습 계획 문서 저장/);
  await handler!("today", ctx);
  assert.match(requests[0], /latest READY schedule snapshot/);
  assert.match(requests[0], /learning\/sessions\//);
  assert.match(requests[0], /review\.md, lesson\.md, quiz\.md, practice\.md, reflection\.md, and handoff\.md/);
  const folders = await readdir(join(cwd, "learning", "sessions"));
  assert.equal(folders.length, 1);
  await handler!("home", ctx);
  assert.match(messages.at(-1)!, /학습 메인 페이지/);
  assert.equal((await readdir(join(cwd, "learning", "sessions"))).length, 1);
  assert.deepEqual(errors, []);
  await handler!("today", { ...ctx, isIdle: () => false } as ExtensionCommandContext);
  assert.equal(requests.length, 1);
  assert.equal((await readdir(join(cwd, "learning", "sessions"))).length, 1);
  assert.equal(errors.length, 1);

  await writeFile(join(cwd, "learning", "schedule.json"), "{}");
  await handler!("today", ctx);
  assert.equal(errors.length, 2);
  assert.equal(requests.length, 1);
  const busy = { ...ctx, isIdle: () => false } as ExtensionCommandContext;
  await handler!("init", busy);
  assert.equal(requests.length, 1);
});

test("local materializer creates documents from the current workspace and rejects invalid schedules", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "learning-tuna-cli-test-"));
  await mkdir(join(cwd, "learning"));
  const active = join(cwd, "learning", "schedule.json");
  await writeFile(active, JSON.stringify(schedule()));
  const script = fileURLToPath(new URL("../src/save-schedule.ts", import.meta.url));
  const execute = promisify(execFile);
  const result = await execute(process.execPath, ["--experimental-strip-types", script], { cwd });
  const directory = result.stdout.trim();
  assert.equal(await readFile(active, "utf8"), JSON.stringify(schedule()));
  assert.match(await readFile(join(directory, "planner.md"), "utf8"), /장기 학습 플래너/);
  assert.match(await readFile(join(directory, "handoff.md"), "utf8"), /Agent handoff/);
  assert.match(await readFile(join(directory, "READY"), "utf8"), /Complete/);
  await writeFile(active, "{}");
  await assert.rejects(execute(process.execPath, ["--experimental-strip-types", script], { cwd }));
  assert.equal((await readdir(join(cwd, "learning", "schedules"))).length, 1);
});
