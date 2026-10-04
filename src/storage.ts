import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parsePlan, renderNote } from "./core.ts";
import type { LearningPlan } from "./core.ts";
import { parseSchedule, renderHandoff, renderPlanner, renderSyllabus } from "./schedule.ts";
import type { StudySchedule } from "./schedule.ts";
import { updateHome } from "./sessions.ts";

export function planPath(cwd: string): string {
  return join(cwd, "learning", "plan.json");
}

export async function readPlan(path: string): Promise<LearningPlan> {
  return parsePlan(JSON.parse(await readFile(path, "utf8")));
}

export async function initializePlan(cwd: string, plan: LearningPlan): Promise<string> {
  parsePlan(plan);
  await mkdir(join(cwd, "learning"), { recursive: true });
  const path = planPath(cwd);
  // Never overwrite an existing learner's plan.
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return path;
}

export async function readSchedule(cwd: string): Promise<StudySchedule> {
  return parseSchedule(JSON.parse(await readFile(join(cwd, "learning", "schedule.json"), "utf8")));
}

export async function saveScheduleDocuments(cwd: string, schedule: StudySchedule): Promise<string> {
  // Validate and render before creating any files; each save is an immutable snapshot.
  const documents = {
    "schedule.json": `${JSON.stringify(parseSchedule(schedule), null, 2)}\n`,
    "planner.md": renderPlanner(schedule),
    "syllabus.md": renderSyllabus(schedule),
    "handoff.md": renderHandoff(schedule),
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = join(cwd, "learning", "schedules", `${stamp}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  for (const [name, content] of Object.entries(documents)) {
    await writeFile(join(directory, name), content, { encoding: "utf8", flag: "wx" });
  }
  // Written last: readers must ignore incomplete snapshots without this marker.
  await writeFile(join(directory, "READY"), "Complete schedule snapshot.\n", { flag: "wx" });
  await updateHome(cwd);
  return directory;
}

export async function exportNote(cwd: string, plan: LearningPlan): Promise<string> {
  const content = renderNote(plan);
  const directory = join(cwd, "learning", "exports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `map-${randomUUID()}.md`);
  await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  return path;
}
