export type LearningMode = "bottom-up" | "top-down";
export type ConceptStatus = "unknown" | "blocked" | "understood";

export interface Concept {
  id: string;
  title: string;
  prerequisites: string[];
  status: ConceptStatus;
  question: string;
}

export interface LearningPlan {
  schemaVersion: 1;
  mode: LearningMode;
  goal: string;
  targetId: string;
  dailyMinutes: number;
  concepts: Concept[];
}

export interface Quest {
  conceptId: string;
  title: string;
  question: string;
  minutes: number;
  approach: LearningMode;
}

export function isLearningMode(value: unknown): value is LearningMode {
  return value === "bottom-up" || value === "top-down";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Plans are untrusted JSON; validate shape and graph before selecting a quest.
export function parsePlan(value: unknown): LearningPlan {
  if (!isObject(value) || value.schemaVersion !== 1 || !isLearningMode(value.mode)
    || !isText(value.goal) || !isText(value.targetId)
    || !Number.isSafeInteger(value.dailyMinutes) || Number(value.dailyMinutes) < 1
    || !Array.isArray(value.concepts) || value.concepts.length === 0) {
    throw new Error("Invalid learning plan header.");
  }

  const ids = new Set<string>();
  for (const node of value.concepts) {
    if (!isObject(node) || !isText(node.id) || !/^[a-zA-Z0-9_-]+$/.test(node.id)
      || !isText(node.title) || !isText(node.question)
      || !Array.isArray(node.prerequisites) || !node.prerequisites.every(isText)
      || new Set(node.prerequisites).size !== node.prerequisites.length
      || typeof node.status !== "string"
      || !["unknown", "blocked", "understood"].includes(node.status)) {
      throw new Error("Invalid concept.");
    }
    if (ids.has(node.id)) throw new Error(`Duplicate concept: ${node.id}`);
    ids.add(node.id);
  }
  if (!ids.has(value.targetId)) throw new Error("Missing target concept.");

  const plan = value as unknown as LearningPlan;
  const nodes = new Map(plan.concepts.map((node) => [node.id, node]));
  const active = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    if (active.has(id)) throw new Error(`Prerequisite cycle: ${id}`);
    if (visited.has(id)) return;
    const node = nodes.get(id);
    if (!node) throw new Error(`Missing prerequisite: ${id}`);
    active.add(id);
    for (const prerequisite of node.prerequisites) visit(prerequisite);
    active.delete(id);
    visited.add(id);
  }
  for (const node of plan.concepts) visit(node.id);
  return plan;
}

export function selectQuest(plan: LearningPlan, mode = plan.mode): Quest | null {
  parsePlan(plan);
  if (!isLearningMode(mode)) throw new Error("Invalid learning mode.");
  const nodes = new Map(plan.concepts.map((node) => [node.id, node]));

  function select(id: string): Concept | null {
    const node = nodes.get(id)!;
    if (node.status === "understood") return null;

    // Top-down starts with the target problem, descending only after a blocker.
    if (mode === "top-down" && node.status !== "blocked") return node;
    for (const prerequisite of node.prerequisites) {
      const candidate = select(prerequisite);
      if (candidate) return candidate;
    }
    return node;
  }

  const node = select(plan.targetId);
  return node ? {
    conceptId: node.id,
    title: node.title,
    question: node.question,
    minutes: plan.dailyMinutes,
    approach: mode,
  } : null;
}

function diagramText(value: string): string {
  // Escape text so titles cannot inject Mermaid syntax or HTML.
  return value.replace(/&/g, "#38;").replace(/"/g, "#34;")
    .replace(/</g, "#60;").replace(/>/g, "#62;").replace(/[\r\n]/g, " ");
}

export function renderMap(plan: LearningPlan): string {
  parsePlan(plan);
  const ids = new Map(plan.concepts.map((node, index) => [node.id, `n${index}`]));
  const lines = ["```mermaid", "flowchart TD"];
  for (const node of plan.concepts) {
    lines.push(`  ${ids.get(node.id)}["${diagramText(node.title)} (${node.status})"]`);
    for (const prerequisite of node.prerequisites) {
      lines.push(`  ${ids.get(prerequisite)} --> ${ids.get(node.id)}`);
    }
  }
  return [...lines, "```"].join("\n");
}

export function renderNote(plan: LearningPlan): string {
  const quest = selectQuest(plan);
  return [
    "# Learning map", "", plan.goal, "",
    `Mode: ${plan.mode}`, `Daily budget: ${plan.dailyMinutes} minutes`, "",
    renderMap(plan), "", "## Suggested quest", "",
    quest ? `**${quest.title}**\n\n${quest.question}` : "Target marked as understood.", "",
    "## Reflection", "", "- My attempt:", "- What blocked me:", "- What I can explain now:", "",
  ].join("\n");
}
