export function createAdminActivityStore() {
  const jobs = new Map<symbol, string>(),
    listeners = new Set<() => void>();
  let snapshot = "";
  function notify() {
    snapshot = [...jobs.values()].at(-1) ?? "";
    for (const listener of listeners) listener();
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    start(label: string) {
      const id = Symbol();
      jobs.set(id, label);
      notify();
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        jobs.delete(id);
        notify();
      };
    },
  };
}
// Only client event handlers start jobs; server rendering always reads an empty snapshot.
export const adminActivity = createAdminActivityStore();
export function adminRequestLabel(path: string, method: string) {
  if (path === "/images") return "Uploading and optimizing image…";
  if (path === "/login") return "Signing in…";
  if (path === "/logout") return "Signing out…";
  if (path.startsWith("/access")) return "Processing email verification…";
  if (path.startsWith("/content"))
    return method === "GET" ? "Loading content…" : "Updating content…";
  if (path.startsWith("/users")) return "Updating admin access…";
  if (path.includes("/complete")) return "Completing order…";
  return method === "GET"
    ? "Loading store information…"
    : method === "DELETE"
      ? "Removing item…"
      : "Saving changes…";
}
