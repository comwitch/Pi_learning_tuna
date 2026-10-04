import { readSchedule, saveScheduleDocuments } from "./storage.ts";

// Run from the learning workspace root after the learner approves schedule.json.
try {
  const cwd = process.cwd();
  console.log(await saveScheduleDocuments(cwd, await readSchedule(cwd)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
