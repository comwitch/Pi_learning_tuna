import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createStudySession, localDateKey, updateHome } from "../src/sessions.ts";
import { parseSchedule } from "../src/schedule.ts";

const schedule = () => parseSchedule({
  schemaVersion: 1, goal: "Practice a mathematical idea", durationDays: 7,
  durationConfirmed: true, dailyMinutes: 20, approach: "foundations",
  source: { kind: "book", title: "Book", reference: "User citation", scope: "Chapter 1" },
  sourceAssessment: "Scope supplied by learner; full text unverified.",
  currentUnderstanding: "Not assessed", rationale: "Confirmed by learner", nextAction: "Try a recall question",
  keywords: [{ term: "평균", description: "A representative value" }],
  periods: [{ fromDay: 1, toDay: 7, focus: "Mean", keywords: ["평균"] }],
});
const workspace = () => mkdtemp(join(tmpdir(), "learning-tuna-session-test-"));

test("session dates use the device local date rather than UTC", async () => {
  assert.equal(localDateKey(new Date(2026, 6, 9, 23, 59)), "20260709");
  assert.throws(() => localDateKey(new Date("invalid")));
  const moduleUrl = new URL("../src/sessions.ts", import.meta.url).href;
  const result = await promisify(execFile)(process.execPath, [
    "--experimental-strip-types", "--input-type=module", "-e",
    `import { localDateKey } from ${JSON.stringify(moduleUrl)}; console.log(localDateKey(new Date('2026-01-01T12:30:00Z')));`,
  ], { env: { ...process.env, TZ: "Pacific/Kiritimati" } });
  assert.equal(result.stdout.trim(), "20260102");
});

test("creates one linked folder per session and restarts numbering on the next day", async () => {
  const cwd = await workspace();
  const day = new Date(2026, 6, 9, 12);
  const first = await createStudySession(cwd, schedule(), day);
  await writeFile(join(first.directory, "lesson.md"), "Personal lesson content");
  const second = await createStudySession(cwd, schedule(), day);
  const tomorrow = await createStudySession(cwd, schedule(), new Date(2026, 6, 10, 12));
  assert.equal(first.id, "20260709_1");
  assert.equal(second.id, "20260709_2");
  assert.equal(tomorrow.id, "20260710_1");
  assert.equal(await readFile(join(first.directory, "lesson.md"), "utf8"), "Personal lesson content");
  const index = await readFile(join(second.directory, "index.md"), "utf8");
  for (const file of ["review.md", "lesson.md", "quiz.md", "practice.md", "reflection.md", "handoff.md"]) {
    assert.match(index, new RegExp(file.replace(".", "\\.")));
    assert.ok((await readFile(join(second.directory, file), "utf8")).length > 0);
  }
  assert.match(await readFile(join(second.directory, "handoff.md"), "utf8"), /no learning evidence/);
  const home = await readFile(first.homePath, "utf8");
  assert.match(home, /오늘의 학습 \(20260710\)/);
  assert.match(home, /sessions\/20260710_1\/index.md/);
  assert.match(home, /sessions\/20260709_2\/index.md/);
  // All generated Markdown links point to files, not unsupported folder targets.
  for (const match of home.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok((await readFile(resolve(dirname(first.homePath), match[1]), "utf8")).length > 0);
  }
});

test("serializes session allocation and orders double-digit session numbers numerically", async () => {
  const cwd = await workspace();
  const day = new Date(2026, 6, 9, 12);
  const sessions = await Promise.all(Array.from({ length: 12 }, () => createStudySession(cwd, schedule(), day)));
  assert.equal(new Set(sessions.map((session) => session.id)).size, 12);
  const home = await readFile(sessions[0].homePath, "utf8");
  assert.ok(home.indexOf("20260709_12") < home.indexOf("20260709_2"));
});

test("home refresh preserves personal content and does not create another session", async () => {
  const cwd = await workspace();
  const day = new Date(2026, 6, 9, 12);
  const session = await createStudySession(cwd, schedule(), day);
  const content = await readFile(session.homePath, "utf8");
  await writeFile(session.homePath, `Personal introduction\n${content}\nPersonal footer`);
  await updateHome(cwd, new Date(2026, 6, 10, 12));
  const updated = await readFile(session.homePath, "utf8");
  assert.ok(updated.startsWith("Personal introduction"));
  assert.ok(updated.endsWith("Personal footer"));
  assert.match(updated, /오늘의 학습 폴더가 없습니다/);
  assert.equal((await readdir(join(cwd, "learning", "sessions"))).length, 1);
});

test("does not overwrite an unrelated home page or expose incomplete sessions", async () => {
  const cwd = await workspace();
  await mkdir(join(cwd, "learning"));
  const page = join(cwd, "learning", "index.md");
  await writeFile(page, "Existing private note");
  await assert.rejects(createStudySession(cwd, schedule()), /no unique generated section/);
  assert.equal(await readFile(page, "utf8"), "Existing private note");
  await assert.rejects(readdir(join(cwd, "learning", "sessions")), { code: "ENOENT" });

  const other = await workspace();
  const day = new Date(2026, 6, 9, 12);
  await mkdir(join(other, "learning", "sessions", "20260709_9"), { recursive: true });
  const session = await createStudySession(other, schedule(), day);
  assert.equal(session.id, "20260709_10");
  const home = await readFile(session.homePath, "utf8");
  assert.doesNotMatch(home, /sessions\/20260709_9\//);
});
