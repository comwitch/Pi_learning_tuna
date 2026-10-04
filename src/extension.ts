import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { isLearningMode, renderMap, selectQuest } from "./core.ts";
import { exportNote, initializePlan, planPath, readPlan } from "./storage.ts";

const help = [
  "/learn init <bottom-up|top-down> — create an editable example plan",
  "/learn today [bottom-up|top-down] — suggest one question (does not grade or record completion)",
  "/learn map — show the dependency graph",
  "/learn export — create a new Obsidian-compatible Markdown snapshot",
  "Edit learning/plan.json to change the goal, prerequisites, and statuses.",
].join("\n");

export default function learningExtension(pi: ExtensionAPI) {
  pi.registerCommand("learn", {
    description: "Learning plans, dependency maps, and small daily quests",
    handler: async (args, ctx) => {
      const [command, mode, ...extra] = args.trim().split(/\s+/);
      const show = (content: string) => pi.sendMessage({
        customType: "learning-tuna",
        content,
        display: true,
      });

      try {
        if (!command || command === "help") {
          show(help);
          return;
        }
        if (!["init", "today", "map", "export"].includes(command)) {
          throw new Error(`Unknown command.\n${help}`);
        }
        if (extra.length || ((command === "map" || command === "export") && mode)) {
          throw new Error(`Unexpected arguments.\n${help}`);
        }
        if (command === "init") {
          if (!isLearningMode(mode)) throw new Error("Choose bottom-up or top-down.");
          const example = await readPlan(fileURLToPath(new URL("../examples/plan.json", import.meta.url)));
          const path = await initializePlan(ctx.cwd, { ...example, mode });
          show(`Created an EXAMPLE plan: ${path}\nReplace it with your own topic before learning.\n${help}`);
          return;
        }
        if (mode !== undefined && !isLearningMode(mode)) {
          throw new Error("Choose bottom-up or top-down.");
        }
        const plan = await readPlan(planPath(ctx.cwd));
        if (command === "map") {
          show(renderMap(plan));
        } else if (command === "export") {
          show(`Created Markdown snapshot: ${await exportNote(ctx.cwd, plan)}`);
        } else {
          const quest = selectQuest(plan, mode ?? plan.mode);
          show(quest
            ? `## Suggested quest (${quest.approach}, ${quest.minutes} min)\n\n${quest.title} [${quest.conceptId}]\n\n${quest.question}\n\nUse /skill:learn to discuss your attempt. Progress is not recorded automatically.`
            : "The target is marked as understood. No new quest suggested.");
        }
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });
}
