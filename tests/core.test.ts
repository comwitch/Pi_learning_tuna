import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parsePlan, renderMap, renderNote, selectQuest } from "../src/core.ts";

const example = JSON.parse(await readFile(new URL("../examples/plan.json", import.meta.url), "utf8"));
const fresh = () => parsePlan(structuredClone(example));

test("bottom-up starts at a foundation", () => {
  assert.equal(selectQuest(fresh())?.conceptId, "mean");
});

test("bottom-up advances after a foundation is understood", () => {
  const plan = fresh();
  plan.concepts[0].status = "understood";
  assert.equal(selectQuest(plan)?.conceptId, "weights");
});

test("top-down starts at the target despite unknown prerequisites", () => {
  assert.equal(selectQuest(fresh(), "top-down")?.conceptId, "weighted-mean");
});

test("top-down descends through diagnosed blockers", () => {
  const plan = fresh();
  plan.concepts[2].status = "blocked";
  assert.equal(selectQuest(plan, "top-down")?.conceptId, "weights");
  plan.concepts[1].status = "blocked";
  assert.equal(selectQuest(plan, "top-down")?.conceptId, "mean");
});

test("top-down returns to the target after its prerequisite is understood", () => {
  const plan = fresh();
  plan.concepts[2].status = "blocked";
  plan.concepts[1].status = "understood";
  assert.equal(selectQuest(plan, "top-down")?.conceptId, "weighted-mean");
});

test("understood target has no quest in either mode", () => {
  const plan = fresh();
  plan.concepts[2].status = "understood";
  assert.equal(selectQuest(plan), null);
  assert.equal(selectQuest(plan, "top-down"), null);
});

test("unrelated foundations are excluded from quest selection", () => {
  const plan = fresh();
  plan.concepts.unshift({ id: "unrelated", title: "Other", prerequisites: [], status: "unknown", question: "Other?" });
  assert.equal(selectQuest(plan)?.conceptId, "mean");
});

test("rejects malformed plans, duplicate IDs, missing prerequisites, and cycles", () => {
  assert.throws(() => parsePlan(null));
  const invalidStatus = structuredClone(example);
  invalidStatus.concepts[0].status = ["unknown"];
  assert.throws(() => parsePlan(invalidStatus), /Invalid concept/);
  const duplicate = fresh();
  duplicate.concepts.push(duplicate.concepts[0]);
  assert.throws(() => parsePlan(duplicate), /Duplicate/);
  const missing = fresh();
  missing.concepts[0].prerequisites = ["absent"];
  assert.throws(() => parsePlan(missing), /Missing prerequisite/);
  const cycle = fresh();
  cycle.concepts[0].prerequisites = [cycle.targetId];
  assert.throws(() => parsePlan(cycle), /cycle/);
  assert.throws(() => parsePlan({ ...fresh(), dailyMinutes: 0 }));
  assert.throws(() => parsePlan({ ...fresh(), mode: "invalid" }));
  assert.throws(() => parsePlan({ ...fresh(), targetId: "absent" }));
});

test("exports dependency direction, status, and safely escaped labels", () => {
  const plan = fresh();
  plan.concepts[0].title = 'A "quoted" <label>';
  const diagram = renderMap(plan);
  assert.match(diagram, /n0 --> n1/);
  assert.match(diagram, /#34;quoted#34; #60;label#62;/);
  assert.match(diagram, /unknown/);
  assert.match(renderNote(plan), /## Reflection/);
});
