import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parsePlan, renderNote } from "./core.ts";
import type { LearningPlan } from "./core.ts";

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

export async function exportNote(cwd: string, plan: LearningPlan): Promise<string> {
  const content = renderNote(plan);
  const directory = join(cwd, "learning", "exports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `map-${randomUUID()}.md`);
  await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  return path;
}
