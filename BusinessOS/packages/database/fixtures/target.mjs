import { URL } from "node:url";

function parse(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A disposable M01.04 PostgreSQL URL is required.");
  }
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1"
      || !url.port || !url.username || !url.password || url.search || url.hash) {
    throw new Error("Use an explicit IPv4 loopback fixture database and dedicated credentials.");
  }
  return url;
}

export function adminUrl(value) {
  const url = parse(value);
  if (url.username !== "m0104_admin" || url.pathname !== "/m0104_admin") {
    throw new Error("The disposable fixture cluster requires the m0104_admin database and role.");
  }
  return url;
}

export function fixtureUrl(value, role) {
  const url = parse(value);
  const database = /^\/m0104_test_([a-f0-9]{12})$/.exec(url.pathname);
  if (!database || !["migrator", "runtime"].includes(role) || !new RegExp(
    "^m0104_" + role + "_[a-f0-9]{12}$",
  ).test(url.username)) {
    throw new Error("The connection does not use an M01.04 fixture database and role.");
  }
  return url.href;
}
