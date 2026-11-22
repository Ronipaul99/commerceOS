import { pathToFileURL } from "node:url";

export function validateHosts(names) {
  const hostname =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;
  if (
    names.length < 1 ||
    names.length > 2 ||
    names.some((name) => !hostname.test(name)) ||
    new Set(names).size !== names.length
  )
    throw Error(
      "Supply one or two distinct lowercase DNS hostnames without schemes or ports.",
    );
  return names;
}

export function cloudflareRules(hostnames, stage = "bypass") {
  const [canonical, ...aliases] = validateHosts(hostnames);
  if (!["bypass", "static", "images"].includes(stage))
    throw Error("Choose bypass, static or images.");
  const hostMatch = `http.host in {${hostnames.map((host) => JSON.stringify(host)).join(" ")}}`;
  const rules = [
    {
      description: "TIYAS 01 - Default bypass",
      expression: hostMatch,
      action: "set_cache_settings",
      action_parameters: { cache: false },
    },
  ];
  if (stage !== "bypass") {
    const paths = ['starts_with(http.request.uri.path, "/_next/static/")'];
    if (stage === "images")
      paths.push('starts_with(http.request.uri.path, "/media/public/")');
    rules.push({
      description: "TIYAS 02 - Anonymous versioned assets",
      // Include the provider's internal PURGE method so exact URL purges match the same rule.
      expression: `(http.host eq "${canonical}" and ssl and http.request.method in {"GET" "PURGE"} and http.cookie eq "" and not any(http.request.headers["authorization"][*] ne "") and not any(http.request.headers["range"][*] ne "") and http.request.uri.query eq "" and (${paths.join(" or ")}))`,
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "bypass_by_default" },
        browser_ttl: { mode: "respect_origin" },
        serve_stale: { disable_stale_while_updating: true },
      },
    });
  }
  return { canonical, aliases, rules };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const [stage, ...hosts] = process.argv.slice(2);
  console.log(
    JSON.stringify({ rules: cloudflareRules(hosts, stage).rules }, null, 2),
  );
}
