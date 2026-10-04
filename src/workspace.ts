import { resolve } from "node:path";

const mutations = new Map<string, Promise<unknown>>();

// Serialize workspace mutations within one Pi process; not a cross-device lock.
export async function withWorkspaceQueue<T>(cwd: string, operation: () => Promise<T>): Promise<T> {
  const key = resolve(cwd);
  const previous = mutations.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  mutations.set(key, current);
  try {
    return await current;
  } finally {
    if (mutations.get(key) === current) mutations.delete(key);
  }
}
