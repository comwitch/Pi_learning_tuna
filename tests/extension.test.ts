import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import learningExtension from "../src/extension.ts";
import { readPlan, planPath } from "../src/storage.ts";

test("command scaffold initializes, selects both paths, exports, and preserves existing data", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "learning-tuna-test-"));
  const messages: string[] = [];
  const requests: string[] = [];
  const errors: string[] = [];
  let handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
  const api = {
    registerCommand(name: string, command: { handler: typeof handler }) {
      assert.equal(name, "learn");
      handler = command.handler;
    },
    sendMessage(message: { content: string }) { messages.push(message.content); },
    sendUserMessage(message: string) { requests.push(message); },
  } as unknown as ExtensionAPI;
  const context = {
    cwd,
    isIdle: () => true,
    ui: { notify(message: string) { errors.push(message); } },
  } as unknown as ExtensionCommandContext;

  learningExtension(api);
  await handler!("init", context);
  assert.match(requests[0], /initial schedule intake/);
  await assert.rejects(readPlan(planPath(cwd)), { code: "ENOENT" });
  await handler!("demo 기초부터", context);
  assert.equal((await readPlan(planPath(cwd))).mode, "bottom-up");
  await handler!("today", context);
  assert.match(messages.at(-1)!, /\[mean\]/);
  await handler!("today 목표부터", context);
  assert.match(messages.at(-1)!, /\[weighted-mean\]/);
  assert.equal((await readPlan(planPath(cwd))).mode, "bottom-up");
  await handler!("map", context);
  assert.match(messages.at(-1)!, /```mermaid/);
  await handler!("export", context);
  await handler!("export", context);
  const files = await readdir(join(cwd, "learning", "exports"));
  assert.equal(files.length, 2);
  assert.match(await readFile(join(cwd, "learning", "exports", files[0]), "utf8"), /## Suggested quest/);
  assert.deepEqual(errors, []);

  const before = await readFile(planPath(cwd), "utf8");
  await handler!("demo 목표부터", context);
  assert.equal(errors.length, 1);
  assert.equal(await readFile(planPath(cwd), "utf8"), before);
  await handler!("today sideways", context);
  await handler!("map unexpected", context);
  assert.equal(errors.length, 3);
});
